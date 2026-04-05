import { NextRequest, NextResponse } from "next/server";

const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const AD_ACCOUNT_IDS = process.env.META_AD_ACCOUNT_IDS?.split(",") || [];

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

async function fetchAllPages(url: string): Promise<MetaInsightRow[]> {
  const allData: MetaInsightRow[] = [];
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

async function fetchAdInsights(accountId: string, datePreset: string): Promise<PaidRow[]> {
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

  const url = `${GRAPH_API}/${accountId}/insights?fields=${fields}&level=ad&date_preset=${datePreset}&limit=500&access_token=${ACCESS_TOKEN}`;

  const data = await fetchAllPages(url);

  const accountLabel =
    accountId === "act_1531634697565694"
      ? "RDLN_BR1"
      : accountId === "act_1508748923121137"
        ? "RDLN_BR2"
        : accountId;

  return data.map((row) => {
    const spend = parseFloat(row.spend || "0") || 0;
    // Try purchase first, then lead as conversion metric
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

export async function GET(request: NextRequest) {
  if (!ACCESS_TOKEN || AD_ACCOUNT_IDS.length === 0) {
    return NextResponse.json(
      { error: "Missing META_ACCESS_TOKEN or META_AD_ACCOUNT_IDS environment variables" },
      { status: 500 }
    );
  }

  const datePreset = request.nextUrl.searchParams.get("date_preset") || "maximum";

  try {
    const results = await Promise.all(
      AD_ACCOUNT_IDS.map((id) => fetchAdInsights(id.trim(), datePreset))
    );

    const paid = results.flat();

    return NextResponse.json(
      { paid, organic: [], fetchedAt: new Date().toISOString() },
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
