import { NextRequest, NextResponse } from "next/server";

const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const AD_ACCOUNT_IDS = process.env.META_AD_ACCOUNT_IDS?.split(",") || [];
const GRAPH_API = "https://graph.facebook.com/v21.0";

/* ── Types ── */

interface TimePoint {
  adId: string;
  adName: string;
  dateStart: string;
  spend: number;
  revenue: number;
  roas: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpm: number;
  purchases: number;
}

interface MetaInsightRow {
  ad_id?: string;
  ad_name?: string;
  date_start?: string;
  date_stop?: string;
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

/* ── Fetch monthly time-series per ad ── */

async function fetchTimeSeries(
  accountId: string,
  dateParams: string,
  increment: string,
): Promise<TimePoint[]> {
  const fields =
    "ad_id,ad_name,spend,impressions,clicks,ctr,cpm,actions,action_values";
  const url = `${GRAPH_API}/${accountId}/insights?fields=${fields}&level=ad&${dateParams}&time_increment=${increment}&limit=500&access_token=${ACCESS_TOKEN}`;
  const data = await fetchAllPages<MetaInsightRow>(url);

  return data.map((row) => {
    const spend = parseFloat(row.spend || "0") || 0;
    const purchases = getActionValue(
      row.actions,
      "purchase", "omni_purchase", "lead", "offsite_conversion.fb_pixel_lead",
    );
    const revenue = getActionValue(
      row.action_values,
      "purchase", "omni_purchase", "offsite_conversion.fb_pixel_purchase",
    );
    return {
      adId: row.ad_id || "",
      adName: row.ad_name || "",
      dateStart: row.date_start || "",
      spend,
      revenue,
      roas: spend > 0 ? revenue / spend : 0,
      impressions: parseInt(row.impressions || "0") || 0,
      clicks: parseInt(row.clicks || "0") || 0,
      ctr: parseFloat(row.ctr || "0") || 0,
      cpm: parseFloat(row.cpm || "0") || 0,
      purchases,
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

  const since = request.nextUrl.searchParams.get("since");
  const until = request.nextUrl.searchParams.get("until");
  const datePreset = request.nextUrl.searchParams.get("date_preset") || "last_365d";
  const increment = request.nextUrl.searchParams.get("increment") || "monthly";

  let dateParams: string;
  if (since && until) {
    dateParams = `time_range=${encodeURIComponent(JSON.stringify({ since, until }))}`;
  } else {
    dateParams = `date_preset=${datePreset}`;
  }

  try {
    const results = await Promise.all(
      AD_ACCOUNT_IDS.map((id) => fetchTimeSeries(id.trim(), dateParams, increment)),
    );

    return NextResponse.json(
      { timeseries: results.flat(), fetchedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=60" } },
    );
  } catch (err) {
    console.error("Anuncios API error:", err);
    return NextResponse.json({ error: "Erro ao carregar dados." }, { status: 500 });
  }
}
