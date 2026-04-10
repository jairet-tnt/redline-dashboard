"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Header from "../components/Header";

/* ── Types ── */

interface PaidRow {
  adId: string;
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

/* ── Constants ── */

const AD_COLORS = [
  "#2563eb", "#16a34a", "#ea580c", "#8b5cf6", "#ec4899",
  "#0891b2", "#ca8a04", "#dc2626", "#4f46e5", "#059669",
  "#d97706", "#7c3aed", "#db2777", "#0d9488", "#b91c1c",
];

const CHART_METRICS: { id: string; label: string; format: (v: number) => string }[] = [
  { id: "spend", label: "Spend", format: fmtBRL },
  { id: "roas", label: "ROAS", format: (v) => `${fmtNum(v)}x` },
  { id: "revenue", label: "Revenue", format: fmtBRL },
  { id: "impressions", label: "Impressions", format: fmtInt },
  { id: "clicks", label: "Clicks", format: fmtInt },
  { id: "ctr", label: "CTR", format: fmtPct },
  { id: "cpm", label: "CPM", format: fmtBRL },
  { id: "purchases", label: "Purchases", format: fmtInt },
];

type ChartType = "line" | "bar" | "area";

/* ── Formatting ── */

function fmtBRL(val: number): string {
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtNum(val: number, d = 1): string {
  return val.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
}

function fmtPct(val: number): string {
  return `${fmtNum(val)}%`;
}

function fmtInt(val: number): string {
  return val.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

/* ── Heat map helper ── */

function heatBg(val: number, allVals: number[], reverse = false): string {
  if (allVals.length < 2 || val === 0) return "";
  const min = Math.min(...allVals.filter((v) => v > 0));
  const max = Math.max(...allVals);
  if (max === min) return "";
  const pct = (val - min) / (max - min);
  const t = reverse ? 1 - pct : pct;
  if (t >= 0.8) return "bg-emerald-100";
  if (t >= 0.6) return "bg-emerald-50";
  if (t <= 0.2) return "bg-red-50";
  return "";
}

/* ── Date helpers ── */

type DatePreset = "last_7d" | "last_14d" | "last_30d" | "last_90d" | "last_365d" | "this_month" | "last_month" | "custom";

const DATE_PRESETS: { id: DatePreset; label: string }[] = [
  { id: "last_7d", label: "Last 7 days" },
  { id: "last_14d", label: "Last 14 days" },
  { id: "last_30d", label: "Last 30 days" },
  { id: "last_90d", label: "Last 90 days" },
  { id: "last_365d", label: "Last 365 days" },
  { id: "this_month", label: "This month" },
  { id: "last_month", label: "Last month" },
  { id: "custom", label: "Custom" },
];

function toYMD(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function resolvePreset(preset: DatePreset): { since: string; until: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const until = toYMD(today);
  switch (preset) {
    case "last_7d": { const s = new Date(today); s.setDate(s.getDate() - 7); return { since: toYMD(s), until }; }
    case "last_14d": { const s = new Date(today); s.setDate(s.getDate() - 14); return { since: toYMD(s), until }; }
    case "last_30d": { const s = new Date(today); s.setDate(s.getDate() - 30); return { since: toYMD(s), until }; }
    case "last_90d": { const s = new Date(today); s.setDate(s.getDate() - 90); return { since: toYMD(s), until }; }
    case "last_365d": { const s = new Date(today); s.setDate(s.getDate() - 365); return { since: toYMD(s), until }; }
    case "this_month": return { since: toYMD(new Date(today.getFullYear(), today.getMonth(), 1)), until };
    case "last_month": { const e = new Date(today.getFullYear(), today.getMonth(), 0); return { since: toYMD(new Date(e.getFullYear(), e.getMonth(), 1)), until: toYMD(e) }; }
    default: return { since: until, until };
  }
}

/* ── SVG Chart ── */

function LineChart({
  timeseries,
  selectedAds,
  metrics,
  chartType,
}: {
  timeseries: TimePoint[];
  selectedAds: Map<string, { color: string; name: string }>;
  metrics: string[];
  chartType: ChartType;
}) {
  if (selectedAds.size === 0 || metrics.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-gray-400">
        Select ads below to see chart
      </div>
    );
  }

  // Group by month then by ad
  const byMonth = new Map<string, Map<string, TimePoint>>();
  for (const tp of timeseries) {
    if (!selectedAds.has(tp.adId)) continue;
    const month = tp.dateStart.slice(0, 7); // YYYY-MM
    if (!byMonth.has(month)) byMonth.set(month, new Map());
    byMonth.get(month)!.set(tp.adId, tp);
  }

  const months = Array.from(byMonth.keys()).sort();
  if (months.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-gray-400">
        No time-series data for selected ads
      </div>
    );
  }

  const metric = metrics[0]; // Primary metric
  const metric2 = metrics.length > 1 ? metrics[1] : null;

  // Compute values per ad per month for primary metric
  const adIds = Array.from(selectedAds.keys());
  const allVals: number[] = [];
  const allVals2: number[] = [];
  const series: { adId: string; points: { month: string; val: number; val2: number }[] }[] = [];

  for (const adId of adIds) {
    const points: { month: string; val: number; val2: number }[] = [];
    for (const month of months) {
      const tp = byMonth.get(month)?.get(adId);
      const v = tp ? (tp as unknown as Record<string, number>)[metric] ?? 0 : 0;
      const v2 = metric2 && tp ? (tp as unknown as Record<string, number>)[metric2] ?? 0 : 0;
      points.push({ month, val: v, val2: v2 });
      allVals.push(v);
      if (metric2) allVals2.push(v2);
    }
    series.push({ adId, points });
  }

  const maxVal = Math.max(...allVals, 1);
  const maxVal2 = metric2 ? Math.max(...allVals2, 1) : 1;

  const W = 900;
  const H = 260;
  const PAD_L = 70;
  const PAD_R = metric2 ? 70 : 20;
  const PAD_T = 20;
  const PAD_B = 30;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;

  function x(i: number): number {
    return PAD_L + (months.length > 1 ? (i / (months.length - 1)) * chartW : chartW / 2);
  }
  function y(val: number, max: number): number {
    return PAD_T + chartH - (val / max) * chartH;
  }

  const metaCfg = CHART_METRICS.find((m) => m.id === metric);
  const metaCfg2 = metric2 ? CHART_METRICS.find((m) => m.id === metric2) : null;

  // Y axis ticks
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    val: t * maxVal,
    y: PAD_T + chartH - t * chartH,
  }));
  const ticks2 = metric2
    ? [0, 0.25, 0.5, 0.75, 1].map((t) => ({
        val: t * maxVal2,
        y: PAD_T + chartH - t * chartH,
      }))
    : [];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      {/* Grid lines */}
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={PAD_L} y1={t.y} x2={W - PAD_R} y2={t.y} stroke="#f0f0f0" strokeWidth={1} />
          <text x={PAD_L - 8} y={t.y + 3} textAnchor="end" className="text-[9px] fill-gray-400">
            {metaCfg?.format(t.val) ?? Math.round(t.val)}
          </text>
        </g>
      ))}
      {/* Right axis ticks */}
      {ticks2.map((t, i) => (
        <text key={`r${i}`} x={W - PAD_R + 8} y={t.y + 3} textAnchor="start" className="text-[9px] fill-gray-400">
          {metaCfg2?.format(t.val) ?? Math.round(t.val)}
        </text>
      ))}
      {/* X axis labels */}
      {months.map((m, i) => (
        <text key={m} x={x(i)} y={H - 5} textAnchor="middle" className="text-[9px] fill-gray-400">
          {new Date(m + "-01").toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })}
        </text>
      ))}
      {/* Axis labels */}
      <text x={8} y={PAD_T - 4} className="text-[10px] fill-gray-500 font-semibold">{metaCfg?.label}</text>
      {metric2 && (
        <text x={W - 8} y={PAD_T - 4} textAnchor="end" className="text-[10px] fill-gray-500 font-semibold">{metaCfg2?.label}</text>
      )}
      {/* Lines */}
      {series.map((s) => {
        const color = selectedAds.get(s.adId)?.color || "#999";
        if (chartType === "bar") {
          const barW = chartW / months.length / adIds.length * 0.7;
          const adIdx = adIds.indexOf(s.adId);
          return s.points.map((p, i) => (
            <rect
              key={`${s.adId}-${i}`}
              x={x(i) - (adIds.length * barW) / 2 + adIdx * barW}
              y={y(p.val, maxVal)}
              width={barW}
              height={Math.max(0, PAD_T + chartH - y(p.val, maxVal))}
              fill={color}
              opacity={0.7}
              rx={2}
            />
          ));
        }
        // Line / Area
        const pathD = s.points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.val, maxVal)}`).join(" ");
        return (
          <g key={s.adId}>
            {chartType === "area" && (
              <path
                d={`${pathD} L ${x(s.points.length - 1)} ${PAD_T + chartH} L ${x(0)} ${PAD_T + chartH} Z`}
                fill={color}
                opacity={0.1}
              />
            )}
            <path d={pathD} fill="none" stroke={color} strokeWidth={2} />
            {s.points.map((p, i) => (
              <circle key={i} cx={x(i)} cy={y(p.val, maxVal)} r={3} fill={color} />
            ))}
            {/* Secondary metric as dashed line */}
            {metric2 && (
              <path
                d={s.points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.val2, maxVal2)}`).join(" ")}
                fill="none"
                stroke={color}
                strokeWidth={1.5}
                strokeDasharray="4 3"
                opacity={0.6}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* ── Page ── */

export default function AnunciosPage() {
  const [paid, setPaid] = useState<PaidRow[]>([]);
  const [timeseries, setTimeseries] = useState<TimePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [tsLoading, setTsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [datePreset, setDatePreset] = useState<DatePreset>("last_365d");
  const [customSince, setCustomSince] = useState("");
  const [customUntil, setCustomUntil] = useState("");
  const [accountFilter, setAccountFilter] = useState("all");

  // Chart state
  const [selectedAds, setSelectedAds] = useState<Set<string>>(new Set());
  const [chartMetrics, setChartMetrics] = useState<string[]>(["spend", "roas"]);
  const [chartType, setChartType] = useState<ChartType>("line");

  // Sort state
  const [sortKey, setSortKey] = useState<string>("investimento");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const dateRange =
    datePreset === "custom" && customSince && customUntil
      ? { since: customSince, until: customUntil }
      : resolvePreset(datePreset);

  // Fetch aggregate data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/sheets?since=${dateRange.since}&until=${dateRange.until}`);
      if (!res.ok) throw new Error("Erro ao carregar dados");
      const data = await res.json();
      setPaid(data.paid || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, [dateRange.since, dateRange.until]);

  // Fetch time-series
  const fetchTimeseries = useCallback(async () => {
    setTsLoading(true);
    try {
      const res = await fetch(
        `/api/anuncios?since=${dateRange.since}&until=${dateRange.until}&increment=monthly`,
      );
      if (!res.ok) return;
      const data = await res.json();
      setTimeseries(data.timeseries || []);
    } catch {
      // silently fail for chart
    } finally {
      setTsLoading(false);
    }
  }, [dateRange.since, dateRange.until]);

  useEffect(() => {
    fetchData();
    fetchTimeseries();
  }, [fetchData, fetchTimeseries]);

  // Filtering + sorting
  const filteredPaid = accountFilter === "all" ? paid : paid.filter((r) => r.conta === accountFilter);

  const sortedPaid = useMemo(() => {
    return [...filteredPaid].sort((a, b) => {
      const aVal = (a as unknown as Record<string, number | string>)[sortKey];
      const bVal = (b as unknown as Record<string, number | string>)[sortKey];
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      return sortDir === "asc" ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
    });
  }, [filteredPaid, sortKey, sortDir]);

  const accounts = [...new Set(paid.map((r) => r.conta))].sort();

  // Ad color map for chart
  const adColorMap = useMemo(() => {
    const map = new Map<string, { color: string; name: string }>();
    let ci = 0;
    for (const ad of sortedPaid) {
      if (selectedAds.has(ad.adId)) {
        map.set(ad.adId, { color: AD_COLORS[ci % AD_COLORS.length], name: ad.nome });
        ci++;
      }
    }
    return map;
  }, [sortedPaid, selectedAds]);

  // Heat map value arrays
  const roasVals = filteredPaid.map((r) => r.roas);
  const ctrVals = filteredPaid.map((r) => r.ctr);
  const cpmVals = filteredPaid.map((r) => r.cpm);

  // Summary
  const totalInvest = filteredPaid.reduce((s, r) => s + r.investimento, 0);
  const totalRevenue = filteredPaid.reduce((s, r) => s + r.receita, 0);
  const totalPurchases = filteredPaid.reduce((s, r) => s + r.compras, 0);
  const weightedRoas = totalInvest > 0 ? totalRevenue / totalInvest : 0;
  const avgCtr = filteredPaid.length > 0 ? filteredPaid.reduce((s, r) => s + r.ctr, 0) / filteredPaid.length : 0;
  const avgCpm = filteredPaid.length > 0 ? filteredPaid.reduce((s, r) => s + r.cpm, 0) / filteredPaid.length : 0;
  const aov = totalPurchases > 0 ? totalRevenue / totalPurchases : 0;

  function handleSort(key: string) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  function toggleAd(adId: string) {
    setSelectedAds((prev) => {
      const next = new Set(prev);
      if (next.has(adId)) next.delete(adId);
      else next.add(adId);
      return next;
    });
  }

  function toggleMetric(id: string) {
    setChartMetrics((prev) => {
      if (prev.includes(id)) return prev.filter((m) => m !== id);
      if (prev.length >= 2) return [prev[1], id]; // max 2
      return [...prev, id];
    });
  }

  const thClass = "px-3 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-black transition-colors select-none";
  const thClassR = `${thClass} text-right`;

  function SortIcon({ k }: { k: string }) {
    if (sortKey !== k) return <span className="text-gray-300 ml-0.5">↕</span>;
    return <span className="text-red ml-0.5">{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  return (
    <div className="min-h-screen bg-stone">
      <Header />
      <main className="max-w-[90rem] mx-auto px-4 sm:px-6 pb-12">
        {/* Header */}
        <div className="flex items-center justify-between py-6">
          <div>
            <h2 className="text-lg font-bold text-black">Anúncios</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Top creatives performance — spend vs. profit analysis.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select value={datePreset} onChange={(e) => setDatePreset(e.target.value as DatePreset)}
              className="text-xs border border-gray-200 rounded-md px-3 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-red">
              {DATE_PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
            {datePreset === "custom" && (
              <>
                <input type="date" value={customSince} onChange={(e) => setCustomSince(e.target.value)}
                  className="text-xs border border-gray-200 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-red" />
                <input type="date" value={customUntil} onChange={(e) => setCustomUntil(e.target.value)}
                  className="text-xs border border-gray-200 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-red" />
              </>
            )}
          </div>
        </div>

        {/* Metric pills */}
        <div className="flex items-center gap-2 mb-4">
          {CHART_METRICS.slice(0, 4).map((m) => (
            <button key={m.id} onClick={() => toggleMetric(m.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${
                chartMetrics.includes(m.id)
                  ? "bg-black text-white border-black"
                  : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
              }`}>
              {chartMetrics.includes(m.id) && "✓ "}{m.label}
            </button>
          ))}
          <div className="relative group">
            <button className="px-3 py-1.5 text-xs font-semibold rounded-full border border-gray-200 bg-white text-gray-500 hover:border-gray-400 transition-colors">
              + Add metrics
            </button>
            <div className="absolute left-0 top-full mt-1 bg-white rounded-lg border border-gray-200 shadow-lg py-1 w-40 hidden group-hover:block z-20">
              {CHART_METRICS.filter((m) => !chartMetrics.includes(m.id)).map((m) => (
                <button key={m.id} onClick={() => toggleMetric(m.id)}
                  className="w-full text-left px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 transition-colors">
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <div className="ml-auto flex gap-1 bg-white rounded-lg p-1 border border-gray-100">
            {(["line", "bar", "area"] as const).map((t) => (
              <button key={t} onClick={() => setChartType(t)}
                className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
                  chartType === t ? "bg-black text-white" : "text-gray-400 hover:text-black"
                }`}>
                {t === "line" ? "📈" : t === "bar" ? "📊" : "〰️"}
              </button>
            ))}
          </div>
        </div>

        {/* Chart */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
          {tsLoading ? (
            <div className="flex items-center justify-center h-64 text-sm text-gray-400">Loading chart...</div>
          ) : (
            <LineChart
              timeseries={timeseries}
              selectedAds={adColorMap}
              metrics={chartMetrics}
              chartType={chartType}
            />
          )}
        </div>

        {/* Selected ad thumbnails */}
        {adColorMap.size > 0 && (
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
            {Array.from(adColorMap.entries()).map(([adId, { color, name }]) => (
              <div key={adId} className="flex-shrink-0 w-16 text-center">
                <div className="w-14 h-14 rounded-lg bg-gray-100 mx-auto border-2" style={{ borderColor: color }} />
                <p className="text-[9px] text-gray-500 mt-1 truncate">{name.slice(0, 15)}</p>
              </div>
            ))}
          </div>
        )}

        {/* Account filter */}
        {accounts.length > 1 && (
          <div className="flex gap-1 mb-4">
            <button onClick={() => setAccountFilter("all")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${accountFilter === "all" ? "bg-black text-white" : "bg-white text-gray-500 border border-gray-200"}`}>
              All
            </button>
            {accounts.map((a) => (
              <button key={a} onClick={() => setAccountFilter(a)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${accountFilter === a ? "bg-black text-white" : "bg-white text-gray-500 border border-gray-200"}`}>
                {a}
              </button>
            ))}
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-sm text-gray-400">Carregando...</div>
        ) : error ? (
          <div className="flex items-center justify-center py-20 text-sm text-red">{error}</div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-3 py-3 w-8">
                    <span className="text-[10px] text-gray-400 font-bold">
                      {selectedAds.size > 0 ? `${selectedAds.size}` : ""}
                    </span>
                  </th>
                  <th className={thClass} onClick={() => handleSort("nome")}>Creative <SortIcon k="nome" /></th>
                  <th className={thClassR} onClick={() => handleSort("investimento")}>Spend <SortIcon k="investimento" /></th>
                  <th className={thClassR} onClick={() => handleSort("receita")}>Purchase value <SortIcon k="receita" /></th>
                  <th className={thClassR} onClick={() => handleSort("roas")}>ROAS <SortIcon k="roas" /></th>
                  <th className={thClassR} onClick={() => handleSort("ctr")}>CTR <SortIcon k="ctr" /></th>
                  <th className={thClassR} onClick={() => handleSort("cpm")}>CPM <SortIcon k="cpm" /></th>
                  <th className={thClassR} onClick={() => handleSort("compras")}>Purchases <SortIcon k="compras" /></th>
                  <th className={thClassR} onClick={() => handleSort("frequencia")}>Freq. <SortIcon k="frequencia" /></th>
                  <th className={thClass}>Status</th>
                </tr>
              </thead>
              <tbody>
                {sortedPaid.map((row, i) => {
                  const isSelected = selectedAds.has(row.adId);
                  const color = adColorMap.get(row.adId)?.color;
                  return (
                    <tr key={row.adId || i} className="border-b border-gray-50 hover:bg-stone/50 transition-colors">
                      <td className="px-3 py-3">
                        <button onClick={() => row.adId && toggleAd(row.adId)}
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                            isSelected ? "border-transparent" : "border-gray-300 hover:border-gray-400"
                          }`}
                          style={isSelected ? { backgroundColor: color, borderColor: color } : undefined}>
                          {isSelected && (
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                              <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </button>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: isSelected ? color : "transparent" }} />
                          <div className="min-w-0">
                            {row.adId ? (
                              <a href={`https://www.facebook.com/ads/archive/render_ad/?id=${row.adId}`}
                                target="_blank" rel="noopener noreferrer"
                                className="text-sm font-semibold text-black truncate block hover:text-red transition-colors underline decoration-gray-300 hover:decoration-red max-w-[280px]">
                                {row.nome}
                              </a>
                            ) : (
                              <p className="text-sm font-semibold text-black truncate max-w-[280px]">{row.nome}</p>
                            )}
                            <p className="text-[10px] text-gray-400">{row.conta}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-sm text-right tabular-nums">{fmtBRL(row.investimento)}</td>
                      <td className="px-3 py-3 text-sm text-right tabular-nums">{fmtBRL(row.receita)}</td>
                      <td className={`px-3 py-3 text-sm text-right tabular-nums font-semibold ${heatBg(row.roas, roasVals)}`}>
                        {fmtNum(row.roas)}x
                      </td>
                      <td className={`px-3 py-3 text-sm text-right tabular-nums ${heatBg(row.ctr, ctrVals)}`}>
                        {fmtPct(row.ctr)}
                      </td>
                      <td className={`px-3 py-3 text-sm text-right tabular-nums ${heatBg(row.cpm, cpmVals, true)}`}>
                        {fmtBRL(row.cpm)}
                      </td>
                      <td className="px-3 py-3 text-sm text-right tabular-nums">{fmtInt(row.compras)}</td>
                      <td className="px-3 py-3 text-sm text-right tabular-nums">{fmtNum(row.frequencia)}</td>
                      <td className="px-3 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          row.status === "Saudável" ? "bg-green-badge-bg text-green-badge-text"
                            : row.status === "Atenção" ? "bg-amber-badge-bg text-amber-badge-text"
                              : "bg-red-badge-bg text-red-badge-text"
                        }`}>{row.status}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Net Results row */}
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50/50">
                  <td className="px-3 py-3" />
                  <td className="px-3 py-3 text-xs font-bold text-gray-500">Net Results</td>
                  <td className="px-3 py-3 text-xs text-right font-bold tabular-nums">{fmtBRL(totalInvest)}</td>
                  <td className="px-3 py-3 text-xs text-right font-bold tabular-nums">{fmtBRL(totalRevenue)}</td>
                  <td className="px-3 py-3 text-xs text-right font-bold tabular-nums">Avg {fmtNum(weightedRoas)}x</td>
                  <td className="px-3 py-3 text-xs text-right font-bold tabular-nums">Avg {fmtPct(avgCtr)}</td>
                  <td className="px-3 py-3 text-xs text-right font-bold tabular-nums">Avg {fmtBRL(avgCpm)}</td>
                  <td className="px-3 py-3 text-xs text-right font-bold tabular-nums">{fmtInt(totalPurchases)}</td>
                  <td className="px-3 py-3" />
                  <td className="px-3 py-3" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
