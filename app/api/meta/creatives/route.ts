import { NextRequest, NextResponse } from "next/server";

const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const AD_ACCOUNT_IDS = process.env.META_AD_ACCOUNT_IDS?.split(",") || [];
const GRAPH_API = "https://graph.facebook.com/v21.0";

// ── Types ──

interface Creative {
  id: string;
  adId: string;
  nome: string;
  body: string;
  title: string;
  thumbnailUrl: string;
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
  hookRate: number;
  thruplayRate: number;
  videoViews3s: number;
  videoThruplay: number;
  status: "Saudável" | "Atenção" | "Pausar";
  conta: string;
  destinationUrl: string;
}

interface CopyAgg {
  texto: string;
  numAnuncios: number;
  impressoes: number;
  ctrMedio: number;
  compras: number;
  roasMedio: number;
  adNames: string[];
}

interface HeadlineAgg {
  titulo: string;
  numAnuncios: number;
  impressoes: number;
  ctrMedio: number;
  roasMedio: number;
}

interface LandingPageAgg {
  url: string;
  numAnuncios: number;
  investimentoTotal: number;
  compras: number;
  taxaConversao: number;
  roasMedio: number;
}

// ── Helpers ──

function computeStatus(row: { frequencia: number; ctr: number; roas: number }): "Saudável" | "Atenção" | "Pausar" {
  const { frequencia, ctr, roas } = row;
  if (frequencia > 4.5 || (ctr < 0.5 && frequencia > 3) || roas < 1) return "Pausar";
  if ((frequencia >= 3 && frequencia <= 4.5) || (ctr >= 0.5 && ctr <= 1.0) || (roas >= 1 && roas < 2)) return "Atenção";
  if (frequencia < 3 && ctr > 1.0 && roas >= 2) return "Saudável";
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

function getVideoActionValue(
  actions: Array<{ action_type: string; value: string }> | undefined
): number {
  if (!actions) return 0;
  const action = actions.find((a) => a.action_type === "video_view");
  return action ? parseFloat(action.value) || 0 : 0;
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

function detectFormat(adName: string): string {
  const lower = adName.toLowerCase();
  if (lower.includes("video") || lower.includes("reels") || lower.includes("ugc")) return "Video";
  if (lower.includes("carousel") || lower.includes("carrossel")) return "Carrossel";
  if (lower.includes("image") || lower.includes("imagem") || lower.includes("static")) return "Imagem";
  return "Imagem";
}

function extractUrl(spec: Record<string, unknown> | undefined): string {
  if (!spec) return "";
  try {
    const linkData = spec.link_data as Record<string, unknown> | undefined;
    if (linkData?.link) return linkData.link as string;
    const videoData = spec.video_data as Record<string, unknown> | undefined;
    if (videoData) {
      const cta = videoData.call_to_action as Record<string, unknown> | undefined;
      const ctaValue = cta?.value as Record<string, unknown> | undefined;
      if (ctaValue?.link) return ctaValue.link as string;
    }
  } catch { /* ignore */ }
  return "";
}

// ── Fetch ──

interface MetaAd {
  id: string;
  name: string;
  creative?: {
    thumbnail_url?: string;
    body?: string;
    title?: string;
    effective_object_story_spec?: Record<string, unknown>;
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
  video_thruplay_watched_actions?: Array<{ action_type: string; value: string }>;
}

async function fetchCreativeData(accountId: string, dateParams: string): Promise<Creative[]> {
  // Fetch ads with creative details
  const adsUrl = `${GRAPH_API}/${accountId}/ads?fields=id,name,creative%7Bthumbnail_url,body,title,effective_object_story_spec%7D&limit=500&access_token=${ACCESS_TOKEN}`;
  const ads = await fetchAllPages<MetaAd>(adsUrl);
  const adMap = new Map<string, MetaAd>();
  for (const ad of ads) adMap.set(ad.id, ad);

  // Fetch insights
  const insightsFields = "ad_id,ad_name,spend,impressions,reach,clicks,ctr,cpm,frequency,actions,action_values,video_thruplay_watched_actions";
  const insightsUrl = `${GRAPH_API}/${accountId}/insights?fields=${insightsFields}&level=ad&${dateParams}&limit=500&access_token=${ACCESS_TOKEN}`;
  const insights = await fetchAllPages<MetaInsight>(insightsUrl);

  const accountLabel = accountId === "act_1531634697565694" ? "RDLN_BR1"
    : accountId === "act_1508748923121137" ? "RDLN_BR2" : accountId;

  return insights.map((row) => {
    const ad = adMap.get(row.ad_id);
    const spend = parseFloat(row.spend) || 0;
    const impressions = parseInt(row.impressions) || 0;
    const purchases = getActionValue(row.actions, "purchase", "omni_purchase", "lead", "offsite_conversion.fb_pixel_lead");
    const revenue = getActionValue(row.action_values, "purchase", "omni_purchase", "offsite_conversion.fb_pixel_purchase");
    const roas = spend > 0 ? revenue / spend : 0;
    const thruplay = getVideoActionValue(row.video_thruplay_watched_actions);
    // Estimate 3s views as ~thruplay * 1.5 (Meta doesn't expose 3s separately in all cases)
    const views3s = thruplay > 0 ? Math.round(thruplay * 1.5) : 0;
    const hookRate = impressions > 0 && views3s > 0 ? (views3s / impressions) * 100 : 0;
    const thruplayRate = impressions > 0 && thruplay > 0 ? (thruplay / impressions) * 100 : 0;

    const base = {
      id: row.ad_id,
      adId: row.ad_id,
      nome: row.ad_name,
      body: ad?.creative?.body || "",
      title: ad?.creative?.title || "",
      thumbnailUrl: ad?.creative?.thumbnail_url || "",
      formato: detectFormat(row.ad_name),
      investimento: spend,
      impressoes: impressions,
      alcance: parseInt(row.reach) || 0,
      cliques: parseInt(row.clicks) || 0,
      ctr: parseFloat(row.ctr) || 0,
      cpm: parseFloat(row.cpm) || 0,
      compras: purchases,
      receita: revenue,
      roas,
      frequencia: parseFloat(row.frequency) || 0,
      hookRate: Math.round(hookRate * 100) / 100,
      thruplayRate: Math.round(thruplayRate * 100) / 100,
      videoViews3s: views3s,
      videoThruplay: thruplay,
      conta: accountLabel,
      destinationUrl: extractUrl(ad?.creative?.effective_object_story_spec),
    };

    return { ...base, status: computeStatus(base) };
  });
}

// ── Aggregation ──

function aggregateCopy(creatives: Creative[]): CopyAgg[] {
  const map = new Map<string, { items: Creative[] }>();
  for (const c of creatives) {
    if (!c.body) continue;
    const key = c.body.trim();
    if (!map.has(key)) map.set(key, { items: [] });
    map.get(key)!.items.push(c);
  }
  return Array.from(map.entries()).map(([texto, { items }]) => ({
    texto,
    numAnuncios: items.length,
    impressoes: items.reduce((s, i) => s + i.impressoes, 0),
    ctrMedio: items.length > 0 ? items.reduce((s, i) => s + i.ctr, 0) / items.length : 0,
    compras: items.reduce((s, i) => s + i.compras, 0),
    roasMedio: items.length > 0 ? items.reduce((s, i) => s + i.roas, 0) / items.length : 0,
    adNames: items.map((i) => i.nome),
  }));
}

function aggregateHeadlines(creatives: Creative[]): HeadlineAgg[] {
  const map = new Map<string, Creative[]>();
  for (const c of creatives) {
    if (!c.title) continue;
    const key = c.title.trim();
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(c);
  }
  return Array.from(map.entries()).map(([titulo, items]) => ({
    titulo,
    numAnuncios: items.length,
    impressoes: items.reduce((s, i) => s + i.impressoes, 0),
    ctrMedio: items.length > 0 ? items.reduce((s, i) => s + i.ctr, 0) / items.length : 0,
    roasMedio: items.length > 0 ? items.reduce((s, i) => s + i.roas, 0) / items.length : 0,
  }));
}

function aggregateLandingPages(creatives: Creative[]): LandingPageAgg[] {
  const map = new Map<string, Creative[]>();
  for (const c of creatives) {
    if (!c.destinationUrl) continue;
    const key = c.destinationUrl.trim();
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(c);
  }
  return Array.from(map.entries()).map(([url, items]) => {
    const totalSpend = items.reduce((s, i) => s + i.investimento, 0);
    const totalPurchases = items.reduce((s, i) => s + i.compras, 0);
    const totalClicks = items.reduce((s, i) => s + i.cliques, 0);
    return {
      url,
      numAnuncios: items.length,
      investimentoTotal: totalSpend,
      compras: totalPurchases,
      taxaConversao: totalClicks > 0 ? (totalPurchases / totalClicks) * 100 : 0,
      roasMedio: items.length > 0 ? items.reduce((s, i) => s + i.roas, 0) / items.length : 0,
    };
  });
}

// ── Handler ──

export async function GET(request: NextRequest) {
  if (!ACCESS_TOKEN || AD_ACCOUNT_IDS.length === 0) {
    return NextResponse.json({ error: "Missing META_ACCESS_TOKEN or META_AD_ACCOUNT_IDS" }, { status: 500 });
  }

  const datePreset = request.nextUrl.searchParams.get("date_preset") || "maximum";
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
      AD_ACCOUNT_IDS.map((id) => fetchCreativeData(id.trim(), dateParams))
    );
    const creatives = results.flat();

    return NextResponse.json(
      {
        creatives,
        copy: aggregateCopy(creatives),
        headlines: aggregateHeadlines(creatives),
        landingPages: aggregateLandingPages(creatives),
        fetchedAt: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=60" } }
    );
  } catch (err) {
    console.error("Meta Creative API error:", err);
    return NextResponse.json({ error: "Erro ao carregar dados do Meta. Verifique o token de acesso." }, { status: 500 });
  }
}
