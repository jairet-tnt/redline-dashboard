"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Header from "../components/Header";

/* ── Types ── */

interface CompassAd {
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
  criadoEm: string;
  thumbnailUrl: string;
  body: string;
  title: string;
  hookRate: number;
  thruplayRate: number;
  conversionRate: number;
}

interface ScoredAd extends CompassAd {
  clickScore: number;
  hookScore: number;
  watchScore: number;
  convertScore: number;
  achievement: "Winning" | "Scaled" | "High Potential" | null;
}

interface Condition {
  metric: string;
  operator: string;
  value: number;
}

interface CustomGroup {
  name: string;
  conditions: Condition[];
}

interface Settings {
  scaledSpend: number;
  winnerMetric: string;
  winnerOperator: string;
  winnerValue: number;
  customGroups: CustomGroup[];
}

interface TableSettings {
  colorMode: "off" | "green-red" | "gradient";
  perPage: number;
  showActiveStatus: boolean;
  showTags: boolean;
  showLaunchDate: boolean;
  columns: string[];
}

type Tab = "launched" | "scaled" | "winner" | "high-potential" | "custom";

/* ── Constants ── */

const ALL_METRIC_COLS: { id: string; label: string }[] = [
  { id: "clickScore", label: "Click score" },
  { id: "hookScore", label: "Hook score" },
  { id: "watchScore", label: "Watch score" },
  { id: "convertScore", label: "Convert score" },
  { id: "investimento", label: "Spend" },
  { id: "roas", label: "ROAS" },
  { id: "ctr", label: "CTR" },
  { id: "cpm", label: "CPM" },
  { id: "impressoes", label: "Impressions" },
  { id: "cliques", label: "Clicks" },
  { id: "compras", label: "Purchases" },
  { id: "receita", label: "Revenue" },
  { id: "frequencia", label: "Frequency" },
  { id: "alcance", label: "Reach" },
];

const COLUMN_PRESETS: Record<string, { label: string; columns: string[] }> = {
  ecommerce: {
    label: "eCommerce SaaS",
    columns: ["clickScore", "convertScore", "investimento", "roas"],
  },
  video: {
    label: "Video Engagement",
    columns: ["clickScore", "hookScore", "watchScore", "convertScore", "investimento", "roas"],
  },
};

const FILTER_METRICS = [
  { id: "investimento", label: "Spend" },
  { id: "roas", label: "ROAS" },
  { id: "ctr", label: "CTR" },
  { id: "cpm", label: "CPM" },
  { id: "impressoes", label: "Impressions" },
  { id: "cliques", label: "Clicks" },
  { id: "compras", label: "Purchases" },
  { id: "receita", label: "Revenue" },
  { id: "frequencia", label: "Frequency" },
  { id: "alcance", label: "Reach" },
];

const OPERATORS = [
  { id: ">", label: ">" },
  { id: "<", label: "<" },
  { id: ">=", label: ">=" },
  { id: "<=", label: "<=" },
  { id: "=", label: "=" },
];

const DEFAULT_SETTINGS: Settings = {
  scaledSpend: 250,
  winnerMetric: "roas",
  winnerOperator: ">",
  winnerValue: 1,
  customGroups: [],
};

const DEFAULT_TABLE_SETTINGS: TableSettings = {
  colorMode: "green-red",
  perPage: 20,
  showActiveStatus: false,
  showTags: false,
  showLaunchDate: false,
  columns: ["clickScore", "hookScore", "watchScore", "convertScore", "investimento", "roas"],
};

const LS_SETTINGS_KEY = "redline-compass-settings";
const LS_TABLE_KEY = "redline-compass-table";

function loadSettings(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(LS_SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(s: Settings) {
  localStorage.setItem(LS_SETTINGS_KEY, JSON.stringify(s));
}

function loadTableSettings(): TableSettings {
  if (typeof window === "undefined") return DEFAULT_TABLE_SETTINGS;
  try {
    const raw = localStorage.getItem(LS_TABLE_KEY);
    if (!raw) return DEFAULT_TABLE_SETTINGS;
    return { ...DEFAULT_TABLE_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_TABLE_SETTINGS;
  }
}

function saveTableSettings(s: TableSettings) {
  localStorage.setItem(LS_TABLE_KEY, JSON.stringify(s));
}

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

function fmtMetric(id: string, val: number): string {
  if (id === "investimento" || id === "receita" || id === "cpm") return fmtBRL(val);
  if (id === "roas") return `${fmtNum(val)}x`;
  if (id === "ctr") return fmtPct(val);
  if (id.endsWith("Score")) return val > 0 ? String(Math.round(val)) : "–";
  return fmtInt(val);
}

/* ── Scoring ── */

function percentileRank(values: number[], val: number): number {
  if (values.length === 0) return 0;
  const below = values.filter((v) => v < val).length;
  return Math.round((below / values.length) * 100);
}

function computeScores(ads: CompassAd[], settings: Settings): ScoredAd[] {
  // Collect valid values for each metric
  const ctrs = ads.map((a) => a.ctr).filter((v) => v > 0);
  const hooks = ads.map((a) => a.hookRate).filter((v) => v > 0);
  const watches = ads.map((a) => a.thruplayRate).filter((v) => v > 0);
  const converts = ads.map((a) => a.conversionRate).filter((v) => v > 0);

  const isScaled = (a: CompassAd) => a.investimento > settings.scaledSpend;
  const isWinner = (a: CompassAd) => {
    if (!isScaled(a)) return false;
    return evalCondition(a, {
      metric: settings.winnerMetric,
      operator: settings.winnerOperator,
      value: settings.winnerValue,
    });
  };
  const isHighPotential = (a: CompassAd) => {
    if (!isScaled(a)) return false;
    if (isWinner(a)) return false;
    const targetRoas = settings.winnerValue;
    const closeToTarget = a.roas >= targetRoas * 0.9 && a.roas < targetRoas;
    const highCtrLowConv = a.ctr > 1.0 && a.cliques > 0 && a.compras / a.cliques < 0.02;
    return closeToTarget || highCtrLowConv;
  };

  return ads.map((ad) => ({
    ...ad,
    clickScore: ad.ctr > 0 ? percentileRank(ctrs, ad.ctr) : 0,
    hookScore: ad.hookRate > 0 ? percentileRank(hooks, ad.hookRate) : 0,
    watchScore: ad.thruplayRate > 0 ? percentileRank(watches, ad.thruplayRate) : 0,
    convertScore: ad.conversionRate > 0 ? percentileRank(converts, ad.conversionRate) : 0,
    achievement: isWinner(ad) ? "Winning" : isHighPotential(ad) ? "High Potential" : isScaled(ad) ? "Scaled" : null,
  }));
}

/* ── Evaluation helpers ── */

function evalCondition(ad: CompassAd, c: Condition): boolean {
  const v = (ad as unknown as Record<string, number>)[c.metric] ?? 0;
  switch (c.operator) {
    case ">":  return v > c.value;
    case "<":  return v < c.value;
    case ">=": return v >= c.value;
    case "<=": return v <= c.value;
    case "=":  return v === c.value;
    default:   return false;
  }
}

function evalGroup(ad: CompassAd, group: CustomGroup): boolean {
  return group.conditions.some((c) => evalCondition(ad, c));
}

/* ── Date helpers ── */

type DatePreset =
  | "today" | "yesterday" | "this_week" | "this_month"
  | "last_week" | "last_month"
  | "last_7d" | "last_14d" | "last_30d" | "last_90d" | "last_365d"
  | "custom";

const DATE_PRESETS: { id: DatePreset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "this_week", label: "This week" },
  { id: "this_month", label: "This month" },
  { id: "last_week", label: "Last week" },
  { id: "last_month", label: "Last month" },
  { id: "last_7d", label: "Last 7 days" },
  { id: "last_14d", label: "Last 14 days" },
  { id: "last_30d", label: "Last 30 days" },
  { id: "last_90d", label: "Last 90 days" },
  { id: "last_365d", label: "Last 365 days" },
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
    case "today": return { since: until, until };
    case "yesterday": { const y = new Date(today); y.setDate(y.getDate() - 1); return { since: toYMD(y), until: toYMD(y) }; }
    case "this_week": { const s = new Date(today); s.setDate(s.getDate() - s.getDay()); return { since: toYMD(s), until }; }
    case "this_month": return { since: toYMD(new Date(today.getFullYear(), today.getMonth(), 1)), until };
    case "last_week": { const e = new Date(today); e.setDate(e.getDate() - e.getDay() - 1); const s = new Date(e); s.setDate(s.getDate() - 6); return { since: toYMD(s), until: toYMD(e) }; }
    case "last_month": { const e = new Date(today.getFullYear(), today.getMonth(), 0); return { since: toYMD(new Date(e.getFullYear(), e.getMonth(), 1)), until: toYMD(e) }; }
    case "last_7d": { const s = new Date(today); s.setDate(s.getDate() - 7); return { since: toYMD(s), until }; }
    case "last_14d": { const s = new Date(today); s.setDate(s.getDate() - 14); return { since: toYMD(s), until }; }
    case "last_30d": { const s = new Date(today); s.setDate(s.getDate() - 30); return { since: toYMD(s), until }; }
    case "last_90d": { const s = new Date(today); s.setDate(s.getDate() - 90); return { since: toYMD(s), until }; }
    case "last_365d": { const s = new Date(today); s.setDate(s.getDate() - 365); return { since: toYMD(s), until }; }
    default: return { since: until, until };
  }
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

/* ── Score bar component ── */

function ScoreBar({ value, colorMode }: { value: number; colorMode: string }) {
  if (value <= 0) return <span className="text-xs text-gray-300">–</span>;

  let barColor = "bg-gray-300";
  let dotColor = "bg-gray-400";
  if (colorMode !== "off") {
    if (value >= 75) { barColor = "bg-emerald-400"; dotColor = "bg-emerald-500"; }
    else if (value >= 50) { barColor = "bg-emerald-300"; dotColor = "bg-emerald-400"; }
    else if (value >= 25) { barColor = "bg-amber-400"; dotColor = "bg-amber-500"; }
    else { barColor = "bg-red-400"; dotColor = "bg-red-500"; }
  }

  return (
    <div className="flex items-center gap-2 min-w-[70px]">
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} />
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs tabular-nums text-gray-700 w-6 text-right font-medium">
        {Math.round(value)}
      </span>
    </div>
  );
}

/* ── ROAS heatmap cell ── */

function RoasCell({ value, colorMode }: { value: number; colorMode: string }) {
  let bg = "";
  if (colorMode !== "off" && value > 0) {
    if (value >= 10) bg = "bg-emerald-100";
    else if (value >= 5) bg = "bg-emerald-50";
    else if (value >= 2) bg = "bg-emerald-50/50";
  }
  return (
    <td className={`px-4 py-3 text-sm text-right font-semibold tabular-nums ${bg} transition-colors`}>
      {value > 0 ? `${fmtNum(value)}x` : "0"}
    </td>
  );
}

/* ── Achievement badge ── */

function AchievementBadge({ achievement }: { achievement: ScoredAd["achievement"] }) {
  if (!achievement) return <td className="px-4 py-3" />;
  const styles: Record<string, string> = {
    Winning: "bg-green-badge-bg text-green-badge-text",
    Scaled: "bg-amber-badge-bg text-amber-badge-text",
    "High Potential": "bg-blue-100 text-blue-700",
  };
  const icons: Record<string, string> = {
    Winning: "🏆",
    Scaled: "💰",
    "High Potential": "💡",
  };
  return (
    <td className="px-4 py-3">
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${styles[achievement]}`}>
        <span>{icons[achievement]}</span> {achievement}
      </span>
    </td>
  );
}

/* ── Page ── */

export default function CompassPage() {
  const [ads, setAds] = useState<CompassAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("launched");
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [draftSettings, setDraftSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [mounted, setMounted] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(0);
  const [tableSettings, setTableSettings] = useState<TableSettings>(DEFAULT_TABLE_SETTINGS);
  const [page, setPage] = useState(0);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [tableSettingsOpen, setTableSettingsOpen] = useState(false);

  // Date range
  const [datePreset, setDatePreset] = useState<DatePreset>("last_14d");
  const [customSince, setCustomSince] = useState("");
  const [customUntil, setCustomUntil] = useState("");
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const dateRange =
    datePreset === "custom" && customSince && customUntil
      ? { since: customSince, until: customUntil }
      : resolvePreset(datePreset);

  useEffect(() => {
    setSettings(loadSettings());
    setDraftSettings(loadSettings());
    setTableSettings(loadTableSettings());
    setMounted(true);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/compass?since=${dateRange.since}&until=${dateRange.until}`);
      if (!res.ok) throw new Error("Erro ao buscar dados");
      const json = await res.json();
      setAds(json.ads || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, [dateRange.since, dateRange.until]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Score all ads
  const scoredAds = useMemo(() => computeScores(ads, settings), [ads, settings]);

  /* ── Filters ── */

  const launchedAds = scoredAds.filter((a) => {
    if (!a.criadoEm) return true;
    const created = new Date(a.criadoEm);
    return created >= new Date(dateRange.since) && created <= new Date(dateRange.until + "T23:59:59");
  });

  const scaledAds = scoredAds.filter((a) => a.investimento > settings.scaledSpend);

  const winnerAds = scaledAds.filter((a) => a.achievement === "Winning");

  const highPotentialAds = scaledAds.filter((a) => a.achievement === "High Potential");

  const customGroupAds =
    settings.customGroups.length > 0 && selectedGroup < settings.customGroups.length
      ? scoredAds.filter((a) => evalGroup(a, settings.customGroups[selectedGroup]))
      : [];

  const filteredAds =
    tab === "launched" ? launchedAds
      : tab === "scaled" ? scaledAds
        : tab === "winner" ? winnerAds
          : tab === "high-potential" ? highPotentialAds
            : customGroupAds;

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredAds.length / tableSettings.perPage));
  const pagedAds = filteredAds.slice(page * tableSettings.perPage, (page + 1) * tableSettings.perPage);

  useEffect(() => { setPage(0); }, [tab, dateRange.since, dateRange.until]);

  /* ── Table settings handlers ── */

  function updateTableSettings(patch: Partial<TableSettings>) {
    const next = { ...tableSettings, ...patch };
    setTableSettings(next);
    saveTableSettings(next);
  }

  function removeColumn(colId: string) {
    updateTableSettings({ columns: tableSettings.columns.filter((c) => c !== colId) });
  }

  function addColumn(colId: string) {
    if (tableSettings.columns.includes(colId)) return;
    updateTableSettings({ columns: [...tableSettings.columns, colId] });
  }

  /* ── Settings drawer handlers ── */

  function applySettings() {
    setSettings(draftSettings);
    saveSettings(draftSettings);
    setDrawerOpen(false);
  }

  function addGroup() {
    setDraftSettings({
      ...draftSettings,
      customGroups: [...draftSettings.customGroups, { name: "New Group", conditions: [{ metric: "roas", operator: ">", value: 1 }] }],
    });
  }

  function removeGroup(idx: number) {
    setDraftSettings({ ...draftSettings, customGroups: draftSettings.customGroups.filter((_, i) => i !== idx) });
  }

  function updateGroupName(idx: number, name: string) {
    const groups = [...draftSettings.customGroups];
    groups[idx] = { ...groups[idx], name };
    setDraftSettings({ ...draftSettings, customGroups: groups });
  }

  function addCondition(groupIdx: number) {
    const groups = [...draftSettings.customGroups];
    groups[groupIdx] = { ...groups[groupIdx], conditions: [...groups[groupIdx].conditions, { metric: "roas", operator: ">", value: 1 }] };
    setDraftSettings({ ...draftSettings, customGroups: groups });
  }

  function removeCondition(groupIdx: number, condIdx: number) {
    const groups = [...draftSettings.customGroups];
    groups[groupIdx] = { ...groups[groupIdx], conditions: groups[groupIdx].conditions.filter((_, i) => i !== condIdx) };
    setDraftSettings({ ...draftSettings, customGroups: groups });
  }

  function updateCondition(groupIdx: number, condIdx: number, patch: Partial<Condition>) {
    const groups = [...draftSettings.customGroups];
    const conds = [...groups[groupIdx].conditions];
    conds[condIdx] = { ...conds[condIdx], ...patch };
    groups[groupIdx] = { ...groups[groupIdx], conditions: conds };
    setDraftSettings({ ...draftSettings, customGroups: groups });
  }

  /* ── Tab config ── */

  const tabConfig: { id: Tab; label: string; count: number; sub: string; icon: string }[] = [
    { id: "launched", label: "Launched", count: launchedAds.length, sub: `Since ${dateRange.since}`, icon: "🚀" },
    { id: "scaled", label: "Scaled", count: scaledAds.length, sub: `Spend > ${fmtBRL(settings.scaledSpend)}`, icon: "💰" },
    { id: "winner", label: "Winner", count: winnerAds.length, sub: `Scaled and ${settings.winnerMetric.toUpperCase()} ${settings.winnerOperator} ${settings.winnerValue}`, icon: "🏆" },
    { id: "high-potential", label: "High Potential", count: highPotentialAds.length, sub: "Iteration Candidates", icon: "💡" },
    { id: "custom", label: "Custom Groups", count: customGroupAds.length, sub: `${settings.customGroups.length} Custom Group${settings.customGroups.length !== 1 ? "s" : ""}`, icon: "⚙️" },
  ];

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

  const isScoreCol = (id: string) => id.endsWith("Score");
  const colLabel = (id: string) => ALL_METRIC_COLS.find((m) => m.id === id)?.label ?? id;

  return (
    <div className="min-h-screen bg-stone">
      <Header />
      <main className="max-w-[90rem] mx-auto px-4 sm:px-6 pb-12">
        {/* Page header */}
        <div className="flex items-center justify-between py-6">
          <div>
            <h2 className="text-lg font-bold text-black">Compass</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Evaluate creative performance to uncover winning, scaled creatives and opportunities.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Date picker */}
            <div className="relative">
              <button
                onClick={() => setDatePickerOpen(!datePickerOpen)}
                className="flex items-center gap-2 text-xs border border-gray-200 rounded-md px-3 py-1.5 bg-white hover:bg-gray-50 transition-colors"
              >
                <span className="text-gray-400">📅</span>
                <span className="font-semibold text-black">
                  {DATE_PRESETS.find((d) => d.id === datePreset)?.label ?? "Custom"}
                </span>
                <span className="text-gray-400">{dateRange.since} – {dateRange.until}</span>
                <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {datePickerOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setDatePickerOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 z-40 bg-white rounded-xl border border-gray-200 shadow-xl flex overflow-hidden">
                    <div className="w-44 border-r border-gray-100 py-2">
                      {DATE_PRESETS.map((p) => (
                        <button key={p.id} onClick={() => { setDatePreset(p.id); if (p.id !== "custom") setDatePickerOpen(false); }}
                          className={`w-full text-left px-4 py-2 text-xs transition-colors ${datePreset === p.id ? "bg-red/5 text-red font-semibold" : "text-gray-600 hover:bg-gray-50"}`}>
                          {p.label}{datePreset === p.id && <span className="ml-1">✓</span>}
                        </button>
                      ))}
                    </div>
                    <div className="p-4 w-72">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">Custom Range</p>
                      <div className="space-y-2">
                        <div>
                          <label className="text-[10px] text-gray-400 block mb-1">From</label>
                          <input type="date" value={datePreset === "custom" ? customSince : dateRange.since}
                            onChange={(e) => { setDatePreset("custom"); setCustomSince(e.target.value); }}
                            className="w-full text-xs border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-red" />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-400 block mb-1">To</label>
                          <input type="date" value={datePreset === "custom" ? customUntil : dateRange.until}
                            onChange={(e) => { setDatePreset("custom"); setCustomUntil(e.target.value); }}
                            className="w-full text-xs border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-red" />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 mt-4">
                        <button onClick={() => setDatePickerOpen(false)} className="px-3 py-1.5 text-xs text-gray-500 hover:text-black transition-colors">Cancel</button>
                        <button onClick={() => setDatePickerOpen(false)} className="px-4 py-1.5 text-xs font-semibold rounded-md bg-red text-white hover:opacity-90 transition-colors">Apply</button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
            <button onClick={() => { setDraftSettings(settings); setDrawerOpen(true); }}
              className="px-3 py-1.5 text-xs font-semibold rounded-md border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-gray-600">
              Report Settings
            </button>
          </div>
        </div>

        {/* Tab cards */}
        <div className="grid grid-cols-5 gap-3 mb-6">
          {tabConfig.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`text-left rounded-xl border px-4 py-3 transition-all ${tab === t.id ? "bg-white border-red/30 ring-1 ring-red/20 shadow-sm" : "bg-white border-gray-100 hover:border-gray-200"}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-2xl font-bold text-black">{t.count}</span>
                <span className="text-lg">{t.icon}</span>
              </div>
              <p className="text-sm font-semibold text-black">{t.label}</p>
              <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                {t.sub}
                {(t.id === "winner" || t.id === "custom") && (
                  <span onClick={(e) => { e.stopPropagation(); setDraftSettings(settings); setDrawerOpen(true); }}
                    className="ml-1 cursor-pointer text-gray-300 hover:text-gray-500">✏️</span>
                )}
              </p>
            </button>
          ))}
        </div>

        {/* Custom group sub-tabs */}
        {tab === "custom" && settings.customGroups.length > 0 && (
          <div className="flex gap-1 mb-4 bg-white rounded-lg p-1 border border-gray-100 w-fit">
            {settings.customGroups.map((g, i) => (
              <button key={i} onClick={() => setSelectedGroup(i)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${selectedGroup === i ? "bg-black text-white" : "text-gray-500 hover:text-black"}`}>
                {g.name}
              </button>
            ))}
          </div>
        )}

        {/* Perf bar: date + custom columns + table settings + view toggle */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <p className="text-xs text-gray-400">
              Perf. {dateRange.since} – {dateRange.until}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Custom columns dropdown */}
            <div className="relative">
              <button onClick={() => { setColumnsOpen(!columnsOpen); setTableSettingsOpen(false); }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 rounded-md bg-white hover:bg-gray-50 transition-colors text-gray-600">
                <span>⊞</span> Custom columns
                <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {columnsOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setColumnsOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 z-40 bg-white rounded-xl border border-gray-200 shadow-lg py-2 w-56">
                    {Object.entries(COLUMN_PRESETS).map(([key, preset]) => (
                      <button key={key}
                        onClick={() => { updateTableSettings({ columns: preset.columns }); setColumnsOpen(false); }}
                        className="w-full text-left px-4 py-2 text-xs text-gray-600 hover:bg-gray-50 transition-colors">
                        {preset.label}
                      </button>
                    ))}
                    <div className="border-t border-gray-100 my-1" />
                    <button
                      onClick={() => { setColumnsOpen(false); setTableSettingsOpen(true); }}
                      className="w-full text-left px-4 py-2 text-xs text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-1.5">
                      <span>⚙️</span> Customize columns
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Table settings dropdown */}
            <div className="relative">
              <button onClick={() => { setTableSettingsOpen(!tableSettingsOpen); setColumnsOpen(false); }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 rounded-md bg-white hover:bg-gray-50 transition-colors text-gray-600">
                <span>⚙️</span> Table settings
                <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {tableSettingsOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setTableSettingsOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 z-40 bg-white rounded-xl border border-gray-200 shadow-lg py-3 w-64">
                    {/* Color formatting */}
                    <div className="px-4 pb-3 flex items-center justify-between">
                      <span className="text-xs text-gray-600">Color formatting</span>
                      <div className="flex gap-1">
                        {(["off", "green-red", "gradient"] as const).map((mode) => (
                          <button key={mode}
                            onClick={() => updateTableSettings({ colorMode: mode })}
                            className={`w-7 h-7 rounded border flex items-center justify-center text-[10px] transition-colors ${tableSettings.colorMode === mode ? "border-red bg-red/5" : "border-gray-200 hover:border-gray-300"}`}>
                            {mode === "off" ? "✏️" : mode === "green-red" ? "🟢" : "🔴"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Results per page */}
                    <div className="px-4 pb-3 flex items-center justify-between">
                      <span className="text-xs text-gray-600">Results per page</span>
                      <input type="number" min={5} max={100} value={tableSettings.perPage}
                        onChange={(e) => { updateTableSettings({ perPage: Math.max(5, Number(e.target.value)) }); setPage(0); }}
                        className="w-14 text-xs border border-gray-200 rounded-md px-2 py-1 text-center focus:outline-none focus:ring-1 focus:ring-red" />
                    </div>

                    {/* Toggles */}
                    {[
                      { key: "showLaunchDate" as const, label: "Show launch date" },
                    ].map(({ key, label }) => (
                      <div key={key} className="px-4 pb-3 flex items-center justify-between">
                        <span className="text-xs text-gray-600">{label}</span>
                        <button onClick={() => updateTableSettings({ [key]: !tableSettings[key] })}
                          className={`w-9 h-5 rounded-full transition-colors ${tableSettings[key] ? "bg-red" : "bg-gray-200"}`}>
                          <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${tableSettings[key] ? "translate-x-[18px]" : "translate-x-0.5"}`} />
                        </button>
                      </div>
                    ))}

                    <div className="border-t border-gray-100 my-2" />

                    {/* Column list */}
                    <div className="px-4 space-y-1">
                      {tableSettings.columns.map((colId) => (
                        <div key={colId} className="flex items-center justify-between py-1">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-300 cursor-grab text-xs">⠿</span>
                            <span className="text-xs text-gray-600">{colLabel(colId)}</span>
                          </div>
                          <button onClick={() => removeColumn(colId)} className="text-gray-300 hover:text-red text-xs">✕</button>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-gray-100 my-2" />

                    {/* Add metric */}
                    <div className="px-4">
                      <select
                        value=""
                        onChange={(e) => { if (e.target.value) addColumn(e.target.value); }}
                        className="w-full text-xs border border-gray-200 rounded-md px-2 py-1.5 bg-white text-gray-400 focus:outline-none focus:ring-1 focus:ring-red"
                      >
                        <option value="">+ Add metric</option>
                        {ALL_METRIC_COLS.filter((m) => !tableSettings.columns.includes(m.id)).map((m) => (
                          <option key={m.id} value={m.id}>{m.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* View toggle */}
            <div className="flex gap-1 bg-white rounded-lg p-1 border border-gray-100">
              <button onClick={() => setViewMode("table")}
                className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${viewMode === "table" ? "bg-black text-white" : "text-gray-400 hover:text-black"}`}>
                ☰
              </button>
              <button onClick={() => setViewMode("grid")}
                className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${viewMode === "grid" ? "bg-black text-white" : "text-gray-400 hover:text-black"}`}>
                ⊞
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-sm text-gray-400">Carregando dados do Meta...</p>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-sm text-red">{error}</p>
          </div>
        ) : filteredAds.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <span className="text-3xl mb-2">⚠️</span>
            <p className="text-sm">No ads found for this criteria</p>
          </div>
        ) : viewMode === "table" ? (
          <>
            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider min-w-[300px]">Creative</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Achievement</th>
                    {tableSettings.columns.map((colId) => (
                      <th key={colId} className={`px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider ${isScoreCol(colId) ? "text-left" : "text-right"}`}>
                        {colLabel(colId)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagedAds.map((ad) => (
                    <tr key={ad.id} className="border-b border-gray-50 hover:bg-stone/50 transition-colors">
                      {/* Creative */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {ad.thumbnailUrl ? (
                            <img src={ad.thumbnailUrl} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-gray-100" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex-shrink-0" />
                          )}
                          <div className="min-w-0">
                            <a
                              href={`https://www.facebook.com/ads/archive/render_ad/?id=${ad.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-sm font-semibold text-black truncate max-w-[240px] block hover:text-red transition-colors underline decoration-gray-300 hover:decoration-red"
                            >{ad.nome}</a>
                            {tableSettings.showLaunchDate && ad.criadoEm && (
                              <p className="text-[10px] text-gray-400 mt-0.5">{formatDate(ad.criadoEm)}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      {/* Achievement */}
                      <AchievementBadge achievement={ad.achievement} />
                      {/* Dynamic columns */}
                      {tableSettings.columns.map((colId) => {
                        const val = (ad as unknown as Record<string, number>)[colId] ?? 0;
                        if (isScoreCol(colId)) {
                          return (
                            <td key={colId} className="px-4 py-3">
                              <ScoreBar value={val} colorMode={tableSettings.colorMode} />
                            </td>
                          );
                        }
                        if (colId === "roas") {
                          return <RoasCell key={colId} value={val} colorMode={tableSettings.colorMode} />;
                        }
                        return (
                          <td key={colId} className="px-4 py-3 text-sm text-right tabular-nums">
                            {fmtMetric(colId, val)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-xs text-gray-400">
                  {page * tableSettings.perPage + 1}–{Math.min((page + 1) * tableSettings.perPage, filteredAds.length)} of {filteredAds.length}
                </p>
                <div className="flex gap-1">
                  <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
                    className="px-3 py-1 text-xs rounded-md border border-gray-200 bg-white disabled:opacity-30 hover:bg-gray-50 transition-colors">←</button>
                  <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}
                    className="px-3 py-1 text-xs rounded-md border border-gray-200 bg-white disabled:opacity-30 hover:bg-gray-50 transition-colors">→</button>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Grid View */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {pagedAds.map((ad) => (
              <div key={ad.id} className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3 mb-3">
                  {ad.thumbnailUrl ? (
                    <img src={ad.thumbnailUrl} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0 bg-gray-100" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-gray-100 flex-shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <a
                      href={`https://www.facebook.com/ads/archive/render_ad/?id=${ad.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-black truncate block hover:text-red transition-colors underline decoration-gray-300 hover:decoration-red"
                    >{ad.nome}</a>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        ad.formato === "Video" ? "bg-purple-100 text-purple-700" : ad.formato === "Carrossel" ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"
                      }`}>{ad.formato}</span>
                      {ad.achievement && (
                        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                          ad.achievement === "Winning" ? "bg-green-badge-bg text-green-badge-text" : ad.achievement === "High Potential" ? "bg-blue-100 text-blue-700" : "bg-amber-badge-bg text-amber-badge-text"
                        }`}>{ad.achievement}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Scores */}
                <div className="space-y-1.5 mb-3">
                  {[
                    { label: "Click", val: ad.clickScore },
                    { label: "Hook", val: ad.hookScore },
                    { label: "Watch", val: ad.watchScore },
                    { label: "Convert", val: ad.convertScore },
                  ].filter(s => s.val > 0).map(s => (
                    <div key={s.label} className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-400 w-14">{s.label}</span>
                      <ScoreBar value={s.val} colorMode={tableSettings.colorMode} />
                    </div>
                  ))}
                </div>

                {/* Key metrics */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-50">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">Spend</p>
                    <p className="text-sm font-semibold tabular-nums">{fmtBRL(ad.investimento)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">ROAS</p>
                    <p className="text-sm font-semibold tabular-nums">{fmtNum(ad.roas)}x</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">CTR</p>
                    <p className="text-sm font-semibold tabular-nums">{fmtPct(ad.ctr)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ── Report Settings Drawer ── */}
      {drawerOpen && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setDrawerOpen(false)} />
          <div className="fixed right-0 top-0 h-full w-[460px] bg-white z-50 shadow-xl overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h3 className="text-lg font-bold text-black">Report Settings</h3>
              <div className="flex items-center gap-2">
                <button onClick={applySettings} className="px-4 py-1.5 rounded-md text-xs font-semibold bg-red text-white hover:opacity-90 transition-colors">Apply</button>
                <button onClick={() => setDrawerOpen(false)} className="text-gray-400 hover:text-black text-lg">✕</button>
              </div>
            </div>
            <div className="px-6 py-5 space-y-6">
              {/* Scaled */}
              <section className="border border-gray-100 rounded-xl p-4">
                <h4 className="text-sm font-bold text-black mb-1">💰 Scaled <span className="text-gray-400 font-normal ml-1">(Spend &gt; R${draftSettings.scaledSpend})</span></h4>
                <p className="text-[10px] text-gray-400 mb-3">Set the minimum spend threshold to qualify as scaled</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5">spend</span>
                  <span className="text-xs text-gray-400">&gt;</span>
                  <input type="number" value={draftSettings.scaledSpend}
                    onChange={(e) => setDraftSettings({ ...draftSettings, scaledSpend: Number(e.target.value) })}
                    className="w-24 text-xs border border-gray-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-red" />
                  <span className="text-xs text-gray-400">BRL</span>
                </div>
              </section>

              {/* Winner */}
              <section className="border border-gray-100 rounded-xl p-4">
                <h4 className="text-sm font-bold text-black mb-1">🏆 Winner <span className="text-gray-400 font-normal ml-1">({draftSettings.winnerMetric.toUpperCase()} {draftSettings.winnerOperator} {draftSettings.winnerValue})</span></h4>
                <p className="text-[10px] text-gray-400 mb-3">Set the goal metric threshold to qualify as winner</p>
                <div className="flex items-center gap-2">
                  <select value={draftSettings.winnerMetric} onChange={(e) => setDraftSettings({ ...draftSettings, winnerMetric: e.target.value })}
                    className="text-xs border border-gray-200 rounded-md px-3 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-red">
                    {FILTER_METRICS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </select>
                  <select value={draftSettings.winnerOperator} onChange={(e) => setDraftSettings({ ...draftSettings, winnerOperator: e.target.value })}
                    className="text-xs border border-gray-200 rounded-md px-3 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-red">
                    {OPERATORS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                  </select>
                  <input type="number" step="0.1" value={draftSettings.winnerValue}
                    onChange={(e) => setDraftSettings({ ...draftSettings, winnerValue: Number(e.target.value) })}
                    className="w-24 text-xs border border-gray-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-red" />
                </div>
              </section>

              {/* Custom Groups */}
              <section className="border border-gray-100 rounded-xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-bold text-black">⚙️ Custom Groups <span className="text-gray-400 font-normal ml-1">({draftSettings.customGroups.length})</span></h4>
                  <button onClick={addGroup} className="px-3 py-1 text-xs font-semibold rounded-md bg-red text-white hover:opacity-90 transition-colors">+ New group</button>
                </div>
                <p className="text-[10px] text-gray-400 mb-4">Set criteria for identifying opportunities in ads</p>
                <div className="space-y-4">
                  {draftSettings.customGroups.map((group, gi) => (
                    <div key={gi} className="border border-gray-100 rounded-lg p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <input type="text" value={group.name} onChange={(e) => updateGroupName(gi, e.target.value)}
                          className="flex-1 text-sm font-semibold border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-red" />
                        <button onClick={() => removeGroup(gi)} className="ml-2 text-gray-300 hover:text-red text-sm">🗑</button>
                      </div>
                      {group.conditions.map((cond, ci) => (
                        <div key={ci} className="flex items-center gap-2">
                          <select value={cond.metric} onChange={(e) => updateCondition(gi, ci, { metric: e.target.value })}
                            className="text-xs border border-gray-200 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-red">
                            {FILTER_METRICS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                          </select>
                          <select value={cond.operator} onChange={(e) => updateCondition(gi, ci, { operator: e.target.value })}
                            className="text-xs border border-gray-200 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-red">
                            {OPERATORS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                          </select>
                          <input type="number" step="0.1" value={cond.value} onChange={(e) => updateCondition(gi, ci, { value: Number(e.target.value) })}
                            className="w-20 text-xs border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-red" />
                          {group.conditions.length > 1 && (
                            <button onClick={() => removeCondition(gi, ci)} className="text-gray-300 hover:text-red text-xs">✕</button>
                          )}
                        </div>
                      ))}
                      <button onClick={() => addCondition(gi)} className="text-xs text-gray-400 hover:text-black transition-colors">+ Add OR Condition</button>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
