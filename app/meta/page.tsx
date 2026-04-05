"use client";

import { useState, useEffect, useCallback } from "react";
import Header from "../components/Header";

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

// ── Formatters ──

function fmtBRL(val: number): string {
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtNum(val: number, d = 1): string {
  return val.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
}
function fmtPct(val: number): string { return `${fmtNum(val)}%`; }
function fmtRoas(val: number): string { return `${fmtNum(val)}x`; }
function fmtInt(val: number): string { return val.toLocaleString("pt-BR", { maximumFractionDigits: 0 }); }

// ── Sub-views ──

type MetaView = "criativos" | "copy" | "landing" | "headlines" | "hooks";
type StatusFilter = "all" | "Saudável" | "Atenção" | "Pausar";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Saudável: "bg-green-badge-bg text-green-badge-text",
    Atenção: "bg-amber-badge-bg text-amber-badge-text",
    Pausar: "bg-red-badge-bg text-red-badge-text",
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${styles[status] || ""}`}>
      {status}
    </span>
  );
}

function HookBadge({ rate }: { rate: number }) {
  let color = "text-red-badge-text bg-red-badge-bg";
  let label = "Fraco";
  if (rate >= 30) { color = "text-green-badge-text bg-green-badge-bg"; label = "Excelente"; }
  else if (rate >= 20) { color = "text-amber-badge-text bg-amber-badge-bg"; label = "Bom"; }
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>
      {label}
    </span>
  );
}

function Thumbnail({ src, alt }: { src: string; alt: string }) {
  const [error, setError] = useState(false);
  if (!src || error) {
    return (
      <div className="w-full aspect-square bg-stone rounded-lg flex items-center justify-center text-gray-300 text-xs">
        Sem imagem
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className="w-full aspect-square object-cover rounded-lg"
      onError={() => setError(true)}
    />
  );
}

export default function MetaPage() {
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [copy, setCopy] = useState<CopyAgg[]>([]);
  const [headlines, setHeadlines] = useState<HeadlineAgg[]>([]);
  const [landingPages, setLandingPages] = useState<LandingPageAgg[]>([]);
  const [fetchedAt, setFetchedAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [view, setView] = useState<MetaView>("criativos");
  const [datePreset, setDatePreset] = useState("maximum");
  const [customSince, setCustomSince] = useState("");
  const [customUntil, setCustomUntil] = useState("");

  // Criativos state
  const [sortBy, setSortBy] = useState("roas");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  // Copy state
  const [expandedCopy, setExpandedCopy] = useState<number | null>(null);

  // Hooks state
  const [hookSort, setHookSort] = useState("hookRate");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `/api/meta/creatives?date_preset=${datePreset}`;
      if (datePreset === "custom" && customSince && customUntil) {
        url = `/api/meta/creatives?since=${customSince}&until=${customUntil}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error("Erro ao carregar dados do Meta. Verifique o token de acesso.");
      const data = await res.json();
      setCreatives(data.creatives || []);
      setCopy(data.copy || []);
      setHeadlines(data.headlines || []);
      setLandingPages(data.landingPages || []);
      setFetchedAt(data.fetchedAt || "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, [datePreset, customSince, customUntil]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Sorted/filtered data ──

  const filteredCreatives = statusFilter === "all"
    ? creatives
    : creatives.filter((c) => c.status === statusFilter);

  const sortedCreatives = [...filteredCreatives].sort((a, b) => {
    const key = sortBy as keyof Creative;
    return ((b[key] as number) || 0) - ((a[key] as number) || 0);
  });

  const sortedCopy = [...copy].sort((a, b) => b.ctrMedio - a.ctrMedio);
  const sortedHeadlines = [...headlines].sort((a, b) => b.ctrMedio - a.ctrMedio);
  const sortedLanding = [...landingPages].sort((a, b) => b.compras - a.compras);

  const videoCreatives = creatives.filter((c) => c.videoThruplay > 0);
  const sortedHooks = [...videoCreatives].sort((a, b) => {
    const key = hookSort as keyof Creative;
    return ((b[key] as number) || 0) - ((a[key] as number) || 0);
  });

  const thClass = "px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider";
  const tdClass = "px-4 py-3 text-sm";

  const views: { key: MetaView; label: string }[] = [
    { key: "criativos", label: "Criativos" },
    { key: "copy", label: "Copy" },
    { key: "landing", label: "Landing Pages" },
    { key: "headlines", label: "Headlines" },
    { key: "hooks", label: "Video Hooks" },
  ];

  return (
    <div className="min-h-screen bg-stone">
      <Header />

      {/* Controls */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div className="flex gap-1 bg-white rounded-lg p-1">
            {views.map((v) => (
              <button
                key={v.key}
                onClick={() => setView(v.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  view === v.key ? "bg-black text-white" : "text-gray-500 hover:text-black"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-black focus:outline-none focus:ring-1 focus:ring-red"
            >
              <option value="maximum">Todo o Período</option>
              <option value="last_7d">Últimos 7 dias</option>
              <option value="last_14d">Últimos 14 dias</option>
              <option value="last_30d">Últimos 30 dias</option>
              <option value="this_month">Este Mês</option>
              <option value="custom">Personalizado</option>
            </select>
            {datePreset === "custom" && (
              <div className="flex items-center gap-1.5">
                <input type="date" value={customSince} onChange={(e) => setCustomSince(e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-black focus:outline-none focus:ring-1 focus:ring-red" />
                <span className="text-xs text-gray-400">até</span>
                <input type="date" value={customUntil} onChange={(e) => setCustomUntil(e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-black focus:outline-none focus:ring-1 focus:ring-red" />
              </div>
            )}
            {fetchedAt && (
              <p className="text-xs text-gray-400 hidden sm:block">
                {new Date(fetchedAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
            <button onClick={fetchData} disabled={loading}
              className="px-3 py-1.5 text-sm font-medium bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50">
              {loading ? "..." : "Atualizar"}
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pb-12">
        {error && (
          <div className="mb-4 p-4 bg-red-badge-bg text-red-badge-text rounded-lg text-sm">{error}</div>
        )}

        {/* ── VIEW 1: CRIATIVOS ── */}
        {view === "criativos" && (
          <>
            <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
              <div className="flex gap-1 bg-white rounded-lg p-0.5">
                {(["all", "Saudável", "Atenção", "Pausar"] as StatusFilter[]).map((s) => (
                  <button key={s} onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                      statusFilter === s ? "bg-black text-white" : "text-gray-500 hover:text-black"
                    }`}>
                    {s === "all" ? "Todos" : s}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-400">Ordenar:</span>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-black focus:outline-none">
                  <option value="roas">ROAS</option>
                  <option value="investimento">Investimento</option>
                  <option value="ctr">CTR</option>
                  <option value="compras">Compras</option>
                </select>
              </div>
            </div>

            {loading && creatives.length === 0 ? (
              <p className="text-center text-gray-400 py-12">Carregando...</p>
            ) : sortedCreatives.length === 0 ? (
              <p className="text-center text-gray-400 py-12">Nenhum dado encontrado para o período selecionado.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {sortedCreatives.map((c) => (
                  <div key={c.adId}
                    className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setExpandedCard(expandedCard === c.adId ? null : c.adId)}>
                    <Thumbnail src={c.thumbnailUrl} alt={c.nome} />
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-stone text-gray-500">{c.formato}</span>
                        <StatusBadge status={c.status} />
                      </div>
                      <p className="text-sm font-semibold text-black truncate mb-3">{c.nome}</p>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase">Invest.</p>
                          <p className="text-xs font-semibold">{fmtBRL(c.investimento)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase">ROAS</p>
                          <p className="text-xs font-semibold text-red">{fmtRoas(c.roas)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase">CTR</p>
                          <p className="text-xs font-semibold">{fmtPct(c.ctr)}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center mt-2">
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase">CPM</p>
                          <p className="text-xs font-semibold">{fmtBRL(c.cpm)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase">Freq.</p>
                          <p className="text-xs font-semibold">{fmtNum(c.frequencia)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase">Compras</p>
                          <p className="text-xs font-semibold">{fmtInt(c.compras)}</p>
                        </div>
                      </div>
                      {expandedCard === c.adId && (
                        <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div><span className="text-gray-400">Impressões:</span> {fmtInt(c.impressoes)}</div>
                            <div><span className="text-gray-400">Alcance:</span> {fmtInt(c.alcance)}</div>
                            <div><span className="text-gray-400">Cliques:</span> {fmtInt(c.cliques)}</div>
                            <div><span className="text-gray-400">Receita:</span> {fmtBRL(c.receita)}</div>
                            {c.hookRate > 0 && <div><span className="text-gray-400">Hook Rate:</span> {fmtPct(c.hookRate)}</div>}
                            {c.thruplayRate > 0 && <div><span className="text-gray-400">ThruPlay:</span> {fmtPct(c.thruplayRate)}</div>}
                          </div>
                          {c.body && (
                            <div>
                              <p className="text-[10px] text-gray-400 uppercase mb-1">Copy</p>
                              <p className="text-xs text-gray-600 whitespace-pre-line">{c.body}</p>
                            </div>
                          )}
                          <p className="text-[10px] text-gray-400">{c.conta}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── VIEW 2: COPY ── */}
        {view === "copy" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className={thClass}>Texto do Anúncio</th>
                  <th className={thClass}>Nº Anúncios</th>
                  <th className={thClass}>Impressões</th>
                  <th className={thClass}>CTR Médio</th>
                  <th className={thClass}>Compras</th>
                  <th className={thClass}>ROAS Médio</th>
                </tr>
              </thead>
              <tbody>
                {loading && copy.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">Carregando...</td></tr>
                ) : sortedCopy.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">Nenhum dado encontrado para o período selecionado.</td></tr>
                ) : (
                  sortedCopy.map((row, i) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => setExpandedCopy(expandedCopy === i ? null : i)}>
                      <td className={`${tdClass} max-w-[300px]`}>
                        <p className={expandedCopy === i ? "whitespace-pre-line text-xs" : "truncate text-xs"}>
                          {expandedCopy === i ? row.texto : row.texto.substring(0, 80) + (row.texto.length > 80 ? "..." : "")}
                        </p>
                        {expandedCopy === i && (
                          <div className="mt-2 pt-2 border-t border-gray-100">
                            <p className="text-[10px] text-gray-400 mb-1">Criativos que usam esse copy:</p>
                            {row.adNames.map((n, j) => (
                              <p key={j} className="text-[10px] text-gray-500">• {n}</p>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className={`${tdClass} text-center`}>{row.numAnuncios}</td>
                      <td className={tdClass}>{fmtInt(row.impressoes)}</td>
                      <td className={`${tdClass} font-semibold`}>{fmtPct(row.ctrMedio)}</td>
                      <td className={tdClass}>{fmtInt(row.compras)}</td>
                      <td className={`${tdClass} font-semibold`}>{fmtRoas(row.roasMedio)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── VIEW 3: LANDING PAGES ── */}
        {view === "landing" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className={thClass}>URL</th>
                  <th className={thClass}>Nº Anúncios</th>
                  <th className={thClass}>Investimento Total</th>
                  <th className={thClass}>Compras</th>
                  <th className={thClass}>Taxa Conversão</th>
                  <th className={thClass}>ROAS Médio</th>
                </tr>
              </thead>
              <tbody>
                {loading && landingPages.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">Carregando...</td></tr>
                ) : sortedLanding.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">Nenhum dado encontrado para o período selecionado.</td></tr>
                ) : (
                  sortedLanding.map((row, i) => {
                    let shortUrl = row.url;
                    try { const u = new URL(row.url); shortUrl = u.hostname + u.pathname; } catch { /* keep full */ }
                    return (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors" title={row.url}>
                        <td className={`${tdClass} max-w-[250px] truncate text-xs`}>
                          <a href={row.url} target="_blank" rel="noopener noreferrer"
                            className="hover:text-red underline decoration-gray-300 hover:decoration-red">
                            {shortUrl}
                          </a>
                        </td>
                        <td className={`${tdClass} text-center`}>{row.numAnuncios}</td>
                        <td className={tdClass}>{fmtBRL(row.investimentoTotal)}</td>
                        <td className={tdClass}>{fmtInt(row.compras)}</td>
                        <td className={`${tdClass} font-semibold`}>{fmtPct(row.taxaConversao)}</td>
                        <td className={`${tdClass} font-semibold`}>{fmtRoas(row.roasMedio)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── VIEW 4: HEADLINES ── */}
        {view === "headlines" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className={thClass}>Título</th>
                  <th className={thClass}>Nº Anúncios</th>
                  <th className={thClass}>Impressões</th>
                  <th className={thClass}>CTR Médio</th>
                  <th className={thClass}>ROAS Médio</th>
                </tr>
              </thead>
              <tbody>
                {loading && headlines.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">Carregando...</td></tr>
                ) : sortedHeadlines.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">Nenhum título encontrado para o período selecionado.</td></tr>
                ) : (
                  sortedHeadlines.map((row, i) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className={`${tdClass} font-medium text-black`}>{row.titulo}</td>
                      <td className={`${tdClass} text-center`}>{row.numAnuncios}</td>
                      <td className={tdClass}>{fmtInt(row.impressoes)}</td>
                      <td className={`${tdClass} font-semibold`}>{fmtPct(row.ctrMedio)}</td>
                      <td className={`${tdClass} font-semibold`}>{fmtRoas(row.roasMedio)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── VIEW 5: VIDEO HOOKS ── */}
        {view === "hooks" && (
          <>
            <div className="flex items-center gap-1.5 mb-4">
              <span className="text-xs text-gray-400">Ordenar:</span>
              <select value={hookSort} onChange={(e) => setHookSort(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-black focus:outline-none">
                <option value="hookRate">Hook Rate</option>
                <option value="thruplayRate">ThruPlay Rate</option>
                <option value="impressoes">Impressões</option>
              </select>
            </div>

            {loading && videoCreatives.length === 0 ? (
              <p className="text-center text-gray-400 py-12">Carregando...</p>
            ) : sortedHooks.length === 0 ? (
              <p className="text-center text-gray-400 py-12">Nenhum anúncio em vídeo encontrado neste período.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {sortedHooks.map((c) => (
                  <div key={c.adId} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <Thumbnail src={c.thumbnailUrl} alt={c.nome} />
                    <div className="p-4">
                      <p className="text-sm font-semibold text-black truncate mb-3">{c.nome}</p>
                      <div className="flex items-center gap-2 mb-3">
                        <p className="text-2xl font-bold text-black">{fmtPct(c.hookRate)}</p>
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase">Hook Rate</p>
                          <HookBadge rate={c.hookRate} />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase">ThruPlay</p>
                          <p className="text-xs font-semibold">{fmtPct(c.thruplayRate)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase">Impressões</p>
                          <p className="text-xs font-semibold">{fmtInt(c.impressoes)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase">Invest.</p>
                          <p className="text-xs font-semibold">{fmtBRL(c.investimento)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
