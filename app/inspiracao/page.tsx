"use client";

import { useState, useEffect, useCallback } from "react";
import Header from "../components/Header";

/* ── Types ── */

interface AdResult {
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

interface Brand {
  pageId: string;
  name: string;
  addedAt: string;
}

interface BrandData {
  brand: Brand;
  ads: AdResult[];
  active: number;
  total: number;
  loading: boolean;
  error: string | null;
}

/* ── Storage ── */

const LS_KEY = "redline-inspiracao-brands";

function loadBrands(): Brand[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveBrands(brands: Brand[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(brands));
}

/* ── Helpers ── */

function extractPageId(input: string): string | null {
  // Try to extract view_all_page_id from Ad Library URL
  const match = input.match(/view_all_page_id=(\d+)/);
  if (match) return match[1];
  // Try advertiser_id
  const match2 = input.match(/advertiser_id=(\d+)/);
  if (match2) return match2[1];
  // Try page_id param
  const match3 = input.match(/page_id=(\d+)/);
  if (match3) return match3[1];
  // If it's just a number, use it directly
  if (/^\d+$/.test(input.trim())) return input.trim();
  return null;
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function daysSince(iso: string): number {
  if (!iso) return 0;
  const diff = Date.now() - new Date(iso).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/* ── Page ── */

export default function InspiracaoPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [brandData, setBrandData] = useState<Map<string, BrandData>>(new Map());
  const [mounted, setMounted] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalInput, setModalInput] = useState("");
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");
  const [expandedBrand, setExpandedBrand] = useState<string | null>(null);

  useEffect(() => {
    setBrands(loadBrands());
    setMounted(true);
  }, []);

  // Fetch ads for all brands
  const fetchBrandAds = useCallback(
    async (brand: Brand) => {
      setBrandData((prev) => {
        const next = new Map(prev);
        next.set(brand.pageId, {
          brand,
          ads: prev.get(brand.pageId)?.ads || [],
          active: 0,
          total: 0,
          loading: true,
          error: null,
        });
        return next;
      });

      try {
        const res = await fetch(`/api/inspiracao?page_id=${brand.pageId}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();

        setBrandData((prev) => {
          const next = new Map(prev);
          next.set(brand.pageId, {
            brand: { ...brand, name: data.pageName || brand.name },
            ads: data.ads || [],
            active: data.active || 0,
            total: data.total || 0,
            loading: false,
            error: null,
          });
          return next;
        });

        // Update brand name if we got it from API
        if (data.pageName && data.pageName !== brand.name) {
          setBrands((prev) => {
            const updated = prev.map((b) =>
              b.pageId === brand.pageId ? { ...b, name: data.pageName } : b,
            );
            saveBrands(updated);
            return updated;
          });
        }
      } catch {
        setBrandData((prev) => {
          const next = new Map(prev);
          next.set(brand.pageId, {
            brand,
            ads: [],
            active: 0,
            total: 0,
            loading: false,
            error: "Failed to load ads",
          });
          return next;
        });
      }
    },
    [],
  );

  useEffect(() => {
    for (const brand of brands) {
      if (!brandData.has(brand.pageId)) {
        fetchBrandAds(brand);
      }
    }
  }, [brands, brandData, fetchBrandAds]);

  /* ── Add brand ── */

  async function handleAddBrand() {
    setModalError("");
    const pageId = extractPageId(modalInput);
    if (!pageId) {
      setModalError("Could not extract Page ID. Paste an Ad Library URL or enter a Page ID directly.");
      return;
    }

    if (brands.some((b) => b.pageId === pageId)) {
      setModalError("This brand is already in your list.");
      return;
    }

    setModalLoading(true);
    try {
      const res = await fetch(`/api/inspiracao?page_id=${pageId}`);
      if (!res.ok) throw new Error("API error");
      const data = await res.json();

      if (!data.ads || data.ads.length === 0) {
        setModalError("No ads found for this Page ID. Check the URL and try again.");
        setModalLoading(false);
        return;
      }

      const newBrand: Brand = {
        pageId,
        name: data.pageName || `Page ${pageId}`,
        addedAt: new Date().toISOString(),
      };

      const updated = [...brands, newBrand];
      setBrands(updated);
      saveBrands(updated);

      setBrandData((prev) => {
        const next = new Map(prev);
        next.set(pageId, {
          brand: newBrand,
          ads: data.ads,
          active: data.active,
          total: data.total,
          loading: false,
          error: null,
        });
        return next;
      });

      setModalInput("");
      setModalOpen(false);
    } catch {
      setModalError("Failed to fetch ads. Check your token permissions and try again.");
    } finally {
      setModalLoading(false);
    }
  }

  function removeBrand(pageId: string) {
    const updated = brands.filter((b) => b.pageId !== pageId);
    setBrands(updated);
    saveBrands(updated);
    setBrandData((prev) => {
      const next = new Map(prev);
      next.delete(pageId);
      return next;
    });
    if (expandedBrand === pageId) setExpandedBrand(null);
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-stone">
        <Header />
        <main className="max-w-[90rem] mx-auto px-4 sm:px-6 pb-12 pt-8">
          <p className="text-sm text-gray-400">Carregando...</p>
        </main>
      </div>
    );
  }

  // Expanded brand view
  if (expandedBrand) {
    const bd = brandData.get(expandedBrand);
    if (!bd) return null;

    const activeAds = bd.ads.filter((a) => a.isActive);
    const inactiveAds = bd.ads.filter((a) => !a.isActive);

    return (
      <div className="min-h-screen bg-stone">
        <Header />
        <main className="max-w-[90rem] mx-auto px-4 sm:px-6 pb-12">
          {/* Back + brand header */}
          <div className="flex items-center gap-3 py-6">
            <button
              onClick={() => setExpandedBrand(null)}
              className="px-3 py-1.5 text-xs font-semibold rounded-md border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
            >
              ← Back
            </button>
            <div>
              <h2 className="text-lg font-bold text-black">{bd.brand.name}</h2>
              <p className="text-xs text-gray-400">
                {bd.active} active ads · {bd.total} total
              </p>
            </div>
          </div>

          {/* Active ads */}
          {activeAds.length > 0 && (
            <>
              <h3 className="text-sm font-bold text-black mb-3">
                Active ({activeAds.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
                {activeAds.map((ad) => (
                  <AdCard key={ad.id} ad={ad} />
                ))}
              </div>
            </>
          )}

          {/* Inactive ads */}
          {inactiveAds.length > 0 && (
            <>
              <h3 className="text-sm font-bold text-gray-400 mb-3">
                Inactive ({inactiveAds.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {inactiveAds.map((ad) => (
                  <AdCard key={ad.id} ad={ad} />
                ))}
              </div>
            </>
          )}
        </main>
      </div>
    );
  }

  // Brand list view
  return (
    <div className="min-h-screen bg-stone">
      <Header />
      <main className="max-w-[90rem] mx-auto px-4 sm:px-6 pb-12">
        {/* Header */}
        <div className="flex items-center justify-between py-6">
          <div>
            <h2 className="text-lg font-bold text-black">Ads Inspiration</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Monitor competitor ads from the Meta Ad Library.
            </p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-2 text-xs font-semibold rounded-md bg-red text-white hover:opacity-90 transition-colors"
          >
            + Add Brand
          </button>
        </div>

        {/* Brands grid */}
        {brands.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <span className="text-4xl mb-3">🔍</span>
            <p className="text-sm mb-4">No brands added yet</p>
            <button
              onClick={() => setModalOpen(true)}
              className="px-4 py-2 text-xs font-semibold rounded-md bg-red text-white hover:opacity-90 transition-colors"
            >
              + Add your first brand
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {brands.map((brand) => {
              const bd = brandData.get(brand.pageId);
              const isLoading = bd?.loading ?? true;
              const ads = bd?.ads || [];
              const activeCount = bd?.active || 0;

              // Count formats from snapshot URLs (heuristic based on body content)
              const videoCount = ads.filter((a) => a.isActive && a.body.toLowerCase().includes("video")).length;
              const totalActive = ads.filter((a) => a.isActive).length;
              const staticCount = Math.max(0, totalActive - videoCount);

              return (
                <div
                  key={brand.pageId}
                  className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow cursor-pointer relative group"
                  onClick={() => setExpandedBrand(brand.pageId)}
                >
                  {/* Remove button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeBrand(brand.pageId);
                    }}
                    className="absolute top-3 right-3 text-gray-300 hover:text-red text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ✕
                  </button>

                  {/* Brand name */}
                  <h3 className="text-sm font-bold text-black mb-1 pr-6">
                    {brand.name}
                  </h3>
                  <p className="text-[10px] text-gray-400 mb-4">
                    Page ID: {brand.pageId}
                  </p>

                  {isLoading ? (
                    <p className="text-xs text-gray-400">Loading...</p>
                  ) : bd?.error ? (
                    <p className="text-xs text-red">{bd.error}</p>
                  ) : (
                    <>
                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider">Active Ads</p>
                          <p className="text-2xl font-bold text-black">{activeCount}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider">Total</p>
                          <p className="text-2xl font-bold text-gray-400">{bd?.total || 0}</p>
                        </div>
                      </div>

                      {/* Format breakdown */}
                      <div className="flex gap-2">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                          {staticCount} static
                        </span>
                        {videoCount > 0 && (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">
                            {videoCount} video
                          </span>
                        )}
                      </div>

                      {/* Preview: first 3 ad bodies */}
                      {ads.filter((a) => a.isActive).slice(0, 2).map((ad) => (
                        <p key={ad.id} className="text-[10px] text-gray-500 mt-2 truncate">
                          {ad.body.slice(0, 80)}{ad.body.length > 80 ? "..." : ""}
                        </p>
                      ))}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ── Add Brand Modal ── */}
      {modalOpen && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setModalOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-black">Add Brand</h3>
                <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-black text-lg">✕</button>
              </div>

              <p className="text-xs text-gray-500 mb-4">
                Paste a Meta Ad Library URL or enter a Facebook Page ID directly.
              </p>

              <div className="space-y-3">
                <input
                  type="text"
                  value={modalInput}
                  onChange={(e) => setModalInput(e.target.value)}
                  placeholder="https://www.facebook.com/ads/library/?view_all_page_id=123456789"
                  className="w-full text-sm border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red/30 focus:border-red"
                  onKeyDown={(e) => e.key === "Enter" && handleAddBrand()}
                />

                {modalError && (
                  <p className="text-xs text-red">{modalError}</p>
                )}

                <button
                  onClick={handleAddBrand}
                  disabled={!modalInput.trim() || modalLoading}
                  className="w-full px-4 py-3 text-sm font-semibold rounded-lg bg-red text-white hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {modalLoading ? "Analyzing..." : "Analyze"}
                </button>
              </div>

              <p className="text-[10px] text-gray-400 mt-4">
                Tip: Go to facebook.com/ads/library, search for a brand, and copy the URL from your browser.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Ad Card ── */

function AdCard({ ad }: { ad: AdResult }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Snapshot iframe */}
      {ad.snapshotUrl && (
        <a
          href={ad.snapshotUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full h-48 bg-gray-50 relative group"
        >
          <div className="absolute inset-0 flex items-center justify-center text-gray-300 group-hover:text-red transition-colors">
            <span className="text-xs font-semibold bg-white/90 px-3 py-1.5 rounded-md shadow-sm">
              View snapshot →
            </span>
          </div>
        </a>
      )}

      <div className="p-4">
        {/* Status + date */}
        <div className="flex items-center gap-2 mb-2">
          <span
            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
              ad.isActive
                ? "bg-green-badge-bg text-green-badge-text"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {ad.isActive ? "Active" : "Inactive"}
          </span>
          <span className="text-[10px] text-gray-400">
            {formatDate(ad.startDate)}
            {ad.isActive && ad.startDate ? ` · ${daysSince(ad.startDate)}d` : ""}
          </span>
        </div>

        {/* Link title */}
        {ad.linkTitle && (
          <p className="text-sm font-semibold text-black mb-1">{ad.linkTitle}</p>
        )}

        {/* Body */}
        {ad.body && (
          <p
            className={`text-xs text-gray-600 leading-relaxed ${
              expanded ? "" : "line-clamp-3"
            }`}
          >
            {ad.body}
          </p>
        )}
        {ad.body && ad.body.length > 120 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-[10px] text-red mt-1 font-semibold"
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        )}

        {/* Link caption */}
        {ad.linkCaption && (
          <p className="text-[10px] text-gray-400 mt-2 truncate">{ad.linkCaption}</p>
        )}

        {/* Platforms */}
        {ad.platforms.length > 0 && (
          <div className="flex gap-1 mt-2">
            {ad.platforms.map((p) => (
              <span
                key={p}
                className="inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold bg-gray-100 text-gray-500 uppercase"
              >
                {p}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
