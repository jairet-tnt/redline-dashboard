import { NextRequest, NextResponse } from "next/server";

const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const GRAPH_API = "https://graph.facebook.com/v21.0";

/* ── Types ── */

interface AdLibraryAd {
  id: string;
  ad_creative_bodies?: string[];
  ad_creative_link_captions?: string[];
  ad_creative_link_titles?: string[];
  ad_delivery_start_time?: string;
  ad_delivery_stop_time?: string;
  ad_snapshot_url?: string;
  page_id?: string;
  page_name?: string;
  publisher_platforms?: string[];
  languages?: string[];
  ad_creative_link_descriptions?: string[];
  media_type?: string;
}

export interface AdResult {
  id: string;
  body: string;
  linkTitle: string;
  linkCaption: string;
  linkDescription: string;
  startDate: string;
  endDate: string;
  snapshotUrl: string;
  pageId: string;
  pageName: string;
  platforms: string[];
  languages: string[];
  isActive: boolean;
}

/* ── Helpers ── */

async function fetchAllPages<T>(url: string, maxPages = 5): Promise<T[]> {
  const allData: T[] = [];
  let nextUrl: string | null = url;
  let pages = 0;

  while (nextUrl && pages < maxPages) {
    const res: Response = await fetch(nextUrl);
    if (!res.ok) {
      const errText = await res.text();
      console.error("Ad Library API error:", errText);
      let detail = `Status ${res.status}`;
      try {
        const errJson = JSON.parse(errText);
        detail = errJson.error?.message || errJson.error?.error_user_msg || detail;
      } catch { /* use status */ }
      throw new Error(detail);
    }
    const json = await res.json();
    allData.push(...(json.data || []));
    nextUrl = json.paging?.next || null;
    pages++;
  }

  return allData;
}

/* ── Handler ── */

export async function GET(request: NextRequest) {
  if (!ACCESS_TOKEN) {
    return NextResponse.json(
      { error: "Missing META_ACCESS_TOKEN" },
      { status: 500 },
    );
  }

  const pageId = request.nextUrl.searchParams.get("page_id");
  if (!pageId) {
    return NextResponse.json(
      { error: "Missing page_id parameter" },
      { status: 400 },
    );
  }

  const country = request.nextUrl.searchParams.get("country") || "BR";
  const limit = request.nextUrl.searchParams.get("limit") || "100";

  try {
    const fields = [
      "id",
      "ad_creative_bodies",
      "ad_creative_link_captions",
      "ad_creative_link_titles",
      "ad_creative_link_descriptions",
      "ad_delivery_start_time",
      "ad_delivery_stop_time",
      "ad_snapshot_url",
      "page_id",
      "page_name",
      "publisher_platforms",
      "languages",
    ].join(",");

    const params = new URLSearchParams({
      search_page_ids: JSON.stringify([pageId]),
      ad_type: "ALL",
      ad_reached_countries: JSON.stringify([country]),
      fields,
      limit: limit.toString(),
      access_token: ACCESS_TOKEN!,
    });

    const url = `${GRAPH_API}/ads_archive?${params.toString()}`;

    const data = await fetchAllPages<AdLibraryAd>(url);

    const ads: AdResult[] = data.map((ad) => ({
      id: ad.id,
      body: ad.ad_creative_bodies?.[0] || "",
      linkTitle: ad.ad_creative_link_titles?.[0] || "",
      linkCaption: ad.ad_creative_link_captions?.[0] || "",
      linkDescription: ad.ad_creative_link_descriptions?.[0] || "",
      startDate: ad.ad_delivery_start_time || "",
      endDate: ad.ad_delivery_stop_time || "",
      snapshotUrl: ad.ad_snapshot_url || "",
      pageId: ad.page_id || pageId,
      pageName: ad.page_name || "",
      platforms: ad.publisher_platforms || [],
      languages: ad.languages || [],
      isActive: !ad.ad_delivery_stop_time,
    }));

    // Count by type heuristic (Ad Library doesn't directly expose media_type)
    const activeAds = ads.filter((a) => a.isActive);

    return NextResponse.json(
      {
        ads,
        pageName: ads[0]?.pageName || "",
        total: ads.length,
        active: activeAds.length,
        fetchedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=300",
        },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Ad Library API error:", message);
    return NextResponse.json(
      { error: `Ad Library error: ${message}` },
      { status: 500 },
    );
  }
}
