import { NextRequest, NextResponse } from "next/server";

const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const AD_ACCOUNT_IDS = process.env.META_AD_ACCOUNT_IDS?.split(",") || [];
const GRAPH_API = "https://graph.facebook.com/v21.0";

/* ── Types ── */

export interface CompassAd {
  id: string;
  nome: string;
  formato: string;
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
  conta: string;
  criadoEm: string; // ISO date — ad created_time (launch date)
  thumbnailUrl: string;
  body: string;
  title: string;
}

interface MetaAd {
  id: string;
  name: string;
  created_time: string;
  effective_status: string;
  creative?: {
    thumbnail_url?: string;
    body?: string;
    title?: string;
  };
}

interface MetaInsight {
  ad_id: string;
  ad_name: string;
  spend: string;
  impressions: string;
  reach: string;
  clicks: string;
  ctr: string;
  cpm: string;
  frequency: string;
  actions?: Array<{ action_type: string; value: string }>;
  action_values?: Array<{ action_type: string; value: string }>;
}

/* ── Helpers ── */

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

function detectFormat(adName: string): string {
  const lower = adName.toLowerCase();
  if (lower.includes("video") || lower.includes("reels") || lower.includes("ugc")) return "Video";
  if (lower.includes("carousel") || lower.includes("carrossel")) return "Carrossel";
  return "Imagem";
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

/* ── Fetch ── */

async function fetchCompassData(
  accountId: string,
  dateParams: string,
): Promise<CompassAd[]> {
  // 1. Fetch ads with created_time and creative details
  const adsUrl = `${GRAPH_API}/${accountId}/ads?fields=id,name,created_time,effective_status,creative%7Bthumbnail_url,body,title%7D&limit=500&access_token=${ACCESS_TOKEN}`;
  const ads = await fetchAllPages<MetaAd>(adsUrl);
  const adMap = new Map<string, MetaAd>();
  for (const ad of ads) adMap.set(ad.id, ad);

  // 2. Fetch insights
  const insightsFields =
    "ad_id,ad_name,spend,impressions,reach,clicks,ctr,cpm,frequency,actions,action_values";
  const insightsUrl = `${GRAPH_API}/${accountId}/insights?fields=${insightsFields}&level=ad&${dateParams}&limit=500&access_token=${ACCESS_TOKEN}`;
  const insights = await fetchAllPages<MetaInsight>(insightsUrl);

  const accountLabel =
    accountId === "act_1531634697565694"
      ? "RDLN_BR1"
      : accountId === "act_1508748923121137"
        ? "RDLN_BR2"
        : accountId;

  // 3. Join
  return insights.map((row) => {
    const ad = adMap.get(row.ad_id);
    const spend = parseFloat(row.spend) || 0;
    const purchases = getActionValue(
      row.actions,
      "purchase",
      "omni_purchase",
      "lead",
      "offsite_conversion.fb_pixel_lead",
    );
    const revenue = getActionValue(
      row.action_values,
      "purchase",
      "omni_purchase",
      "offsite_conversion.fb_pixel_purchase",
    );
    const roas = spend > 0 ? revenue / spend : 0;

    return {
      id: row.ad_id,
      nome: row.ad_name,
      formato: detectFormat(row.ad_name),
      investimento: spend,
      impressoes: parseInt(row.impressions) || 0,
      alcance: parseInt(row.reach) || 0,
      cliques: parseInt(row.clicks) || 0,
      ctr: parseFloat(row.ctr) || 0,
      cpm: parseFloat(row.cpm) || 0,
      compras: purchases,
      receita: revenue,
      roas,
      frequencia: parseFloat(row.frequency) || 0,
      conta: accountLabel,
      criadoEm: ad?.created_time || "",
      thumbnailUrl: ad?.creative?.thumbnail_url || "",
      body: ad?.creative?.body || "",
      title: ad?.creative?.title || "",
    };
  });
}

/* ── Handler ── */

export async function GET(request: NextRequest) {
  if (!ACCESS_TOKEN || AD_ACCOUNT_IDS.length === 0) {
    return NextResponse.json(
      { error: "Missing META_ACCESS_TOKEN or META_AD_ACCOUNT_IDS" },
      { status: 500 },
    );
  }

  const datePreset =
    request.nextUrl.searchParams.get("date_preset") || "last_14d";
  const since = request.nextUrl.searchParams.get("since");
  const until = request.nextUrl.searchParams.get("until");

  let dateParams: string;
  if (since && until) {
    dateParams = `time_range=${encodeURIComponent(JSON.stringify({ since, until }))}`;
  } else {
    dateParams = `date_preset=${datePreset}`;
  }

  try {
    const results = await Promise.all(
      AD_ACCOUNT_IDS.map((id) => fetchCompassData(id.trim(), dateParams)),
    );

    return NextResponse.json(
      { ads: results.flat(), fetchedAt: new Date().toISOString() },
      {
        headers: {
          "Cache-Control": "public, s-maxage=900, stale-while-revalidate=60",
        },
      },
    );
  } catch (err) {
    console.error("Compass API error:", err);
    return NextResponse.json(
      { error: "Erro ao carregar dados do Compass." },
      { status: 500 },
    );
  }
}
