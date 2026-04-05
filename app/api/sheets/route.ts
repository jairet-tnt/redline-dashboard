import { NextRequest, NextResponse } from "next/server";

const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const AD_ACCOUNT_IDS = process.env.META_AD_ACCOUNT_IDS?.split(",") || [];
const INSTAGRAM_ACCOUNT_ID = process.env.INSTAGRAM_ACCOUNT_ID;

const GRAPH_API = "https://graph.facebook.com/v21.0";

interface PaidRow {
  nome: string;
  investimento: number;
  impressoes: number;
  alcance: number;
  cliques: number;
  ctr: number;
  cpm: number;
  compras: number;
  receita: number;
  roas: number;
  frequencia: number;
  status: "Saudável" | "Atenção" | "Pausar";
  conta: string;
}

interface OrganicRow {
  nome: string;
  formato: string;
  data: string;
  alcance: number;
  curtidas: number;
  salvamentos: number;
  compartilhamentos: number;
  visualizacoes: number;
  interacoes: number;
  taxaEngajamento: number;
  permalink: string;
}

function computeStatus(row: { frequencia: number; ctr: number; roas: number }): "Saudável" | "Atenção" | "Pausar" {
  const { frequencia, ctr, roas } = row;

  if (frequencia > 4.5 || (ctr < 0.5 && frequencia > 3) || roas < 1) {
    return "Pausar";
  }

  if (
    (frequencia >= 3 && frequencia <= 4.5) ||
    (ctr >= 0.5 && ctr <= 1.0) ||
    (roas >= 1 && roas < 2)
  ) {
    return "Atenção";
  }

  if (frequencia < 3 && ctr > 1.0 && roas >= 2) {
    return "Saudável";
  }

  return "Atenção";
}

function getActionValue(
  actions: Array<{ action_type: string; value: string }> | undefined,
  ...types: string[]
): number {
  if (!actions) return 0;
  for (const type of types) {
    const action = actions.find((a) => a.action_type === type);
    if (action) return parseFloat(action.value) || 0;
  }
  return 0;
}

interface MetaInsightRow {
  ad_name?: string;
  spend?: string;
  impressions?: string;
  reach?: string;
  clicks?: string;
  ctr?: string;
  cpm?: string;
  frequency?: string;
  actions?: Array<{ action_type: string; value: string }>;
  action_values?: Array<{ action_type: string; value: string }>;
}

async function fetchAllPages<T>(url: string): Promise<T[]> {
  const allData: T[] = [];
  let nextUrl: string | null = url;

  while (nextUrl) {
    const res: Response = await fetch(nextUrl);
    if (!res.ok) {
      const err = await res.text();
      console.error("Meta API error:", err);
      throw new Error(`Meta API error: ${res.status}`);
    }
    const json = await res.json();
    allData.push(...(json.data || []));
    nextUrl = json.paging?.next || null;
  }

  return allData;
}

// ── Paid (Meta Ads) ──

async function fetchAdInsights(accountId: string, dateParams: string): Promise<PaidRow[]> {
  const fields = [
    "ad_name",
    "spend",
    "impressions",
    "reach",
    "clicks",
    "ctr",
    "cpm",
    "frequency",
    "actions",
    "action_values",
  ].join(",");

  const url = `${GRAPH_API}/${accountId}/insights?fields=${fields}&level=ad&${dateParams}&limit=500&access_token=${ACCESS_TOKEN}`;

  const data = await fetchAllPages<MetaInsightRow>(url);

  const accountLabel =
    accountId === "act_1531634697565694"
      ? "RDLN_BR1"
      : accountId === "act_1508748923121137"
        ? "RDLN_BR2"
        : accountId;

  return data.map((row) => {
    const spend = parseFloat(row.spend || "0") || 0;
    const conversions = getActionValue(row.actions, "purchase", "omni_purchase", "lead", "offsite_conversion.fb_pixel_lead");
    const revenue = getActionValue(row.action_values, "purchase", "omni_purchase", "offsite_conversion.fb_pixel_purchase");
    const roas = spend > 0 ? revenue / spend : 0;

    const base = {
      nome: row.ad_name || "",
      investimento: spend,
      impressoes: parseInt(row.impressions || "0") || 0,
      alcance: parseInt(row.reach || "0") || 0,
      cliques: parseInt(row.clicks || "0") || 0,
      ctr: parseFloat(row.ctr || "0") || 0,
      cpm: parseFloat(row.cpm || "0") || 0,
      compras: conversions,
      receita: revenue,
      roas,
      frequencia: parseFloat(row.frequency || "0") || 0,
      conta: accountLabel,
    };

    return { ...base, status: computeStatus(base) };
  });
}

// ── Organic (Instagram) ──

interface IGMedia {
  id: string;
  caption?: string;
  media_type: string;
  timestamp: string;
  like_count: number;
  comments_count: number;
  permalink?: string;
}

interface IGInsightValue {
  name: string;
  values: Array<{ value: number }>;
}

function getInsightValue(insights: IGInsightValue[], name: string): number {
  const metric = insights.find((i) => i.name === name);
  return metric?.values?.[0]?.value || 0;
}

function formatMediaType(type: string): string {
  switch (type) {
    case "IMAGE": return "Imagem";
    case "VIDEO": return "Reels";
    case "CAROUSEL_ALBUM": return "Carrossel";
    default: return type;
  }
}

function extractPostName(caption: string | undefined): string {
  if (!caption) return "(sem legenda)";
  // First line or first 60 chars
  const firstLine = caption.split("\n")[0];
  if (firstLine.length <= 60) return firstLine;
  return firstLine.substring(0, 57) + "...";
}

async function fetchInstagramOrganic(): Promise<OrganicRow[]> {
  if (!INSTAGRAM_ACCOUNT_ID) return [];

  // Fetch recent media (up to 50 posts)
  const mediaUrl = `${GRAPH_API}/${INSTAGRAM_ACCOUNT_ID}/media?fields=id,caption,media_type,timestamp,like_count,comments_count,permalink&limit=50&access_token=${ACCESS_TOKEN}`;

  const media = await fetchAllPages<IGMedia>(mediaUrl);

  // Fetch insights in parallel batches of 10
  const batchSize = 10;
  const organic: OrganicRow[] = [];

  for (let i = 0; i < media.length; i += batchSize) {
    const batch = media.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (post) => {
        try {
          const isVideo = post.media_type === "VIDEO";
          const metrics = isVideo
            ? "reach,saved,shares,total_interactions,views"
            : "reach,saved,shares,total_interactions";

          const insightsUrl = `${GRAPH_API}/${post.id}/insights?metric=${metrics}&access_token=${ACCESS_TOKEN}`;
          const insightsRes: Response = await fetch(insightsUrl);

          let reach = 0, saved = 0, shares = 0, interactions = 0, views = 0;

          if (insightsRes.ok) {
            const insightsData = await insightsRes.json();
            const insights: IGInsightValue[] = insightsData.data || [];
            reach = getInsightValue(insights, "reach");
            saved = getInsightValue(insights, "saved");
            shares = getInsightValue(insights, "shares");
            interactions = getInsightValue(insights, "total_interactions");
            views = isVideo ? getInsightValue(insights, "views") : 0;
          }

          const engagementRate = reach > 0
            ? ((post.like_count + post.comments_count + saved + shares) / reach) * 100
            : 0;

          return {
            nome: extractPostName(post.caption),
            formato: formatMediaType(post.media_type),
            data: new Date(post.timestamp).toLocaleDateString("pt-BR"),
            alcance: reach,
            curtidas: post.like_count || 0,
            salvamentos: saved,
            compartilhamentos: shares,
            visualizacoes: views,
            interacoes: interactions,
            taxaEngajamento: Math.round(engagementRate * 100) / 100,
            permalink: post.permalink || "",
          };
        } catch (err) {
          console.error(`Error fetching insights for post ${post.id}:`, err);
          return null;
        }
      })
    );
    organic.push(...batchResults.filter((r): r is OrganicRow => r !== null));
  }

  return organic;
}

// ── Handler ──

export async function GET(request: NextRequest) {
  if (!ACCESS_TOKEN || AD_ACCOUNT_IDS.length === 0) {
    return NextResponse.json(
      { error: "Missing META_ACCESS_TOKEN or META_AD_ACCOUNT_IDS environment variables" },
      { status: 500 }
    );
  }

  const datePreset = request.nextUrl.searchParams.get("date_preset") || "maximum";
  const since = request.nextUrl.searchParams.get("since");
  const until = request.nextUrl.searchParams.get("until");

  // Build date params: custom range takes priority over preset
  let dateParams: string;
  if (since && until) {
    dateParams = `time_range=${encodeURIComponent(JSON.stringify({ since, until }))}`;
  } else {
    dateParams = `date_preset=${datePreset}`;
  }

  try {
    const [paidResults, organic] = await Promise.all([
      Promise.all(AD_ACCOUNT_IDS.map((id) => fetchAdInsights(id.trim(), dateParams))),
      fetchInstagramOrganic(),
    ]);

    const paid = paidResults.flat();

    return NextResponse.json(
      { paid, organic, fetchedAt: new Date().toISOString() },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
        },
      }
    );
  } catch (err) {
    console.error("Meta API error:", err);
    return NextResponse.json(
      { error: "Erro ao buscar dados da Meta" },
      { status: 500 }
    );
  }
}
