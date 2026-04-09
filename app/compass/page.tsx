"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
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

type Tab = "launched" | "scaled" | "winner" | "high-potential" | "custom";

/* ── Constants ── */

const METRICS = [
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

const LS_SETTINGS_KEY = "redline-compass-settings";

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
  // OR logic: ad matches if ANY condition in the group is true
  return group.conditions.some((c) => evalCondition(ad, c));
}

/* ── Date helpers ── */

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
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

  // Date range for "Launched" window
  const [launchDays, setLaunchDays] = useState(14);

  useEffect(() => {
    const s = loadSettings();
    setSettings(s);
    setDraftSettings(s);
    setMounted(true);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const since = daysAgo(launchDays);
      const until = new Date().toISOString().slice(0, 10);
      const res = await fetch(
        `/api/compass?since=${since}&until=${until}`,
      );
      if (!res.ok) throw new Error("Erro ao buscar dados");
      const json = await res.json();
      setAds(json.ads || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, [launchDays]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ── Filters ── */

  const launchedAds = ads.filter((a) => {
    if (!a.criadoEm) return true; // no date = include by default
    const created = new Date(a.criadoEm);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - launchDays);
    return created >= cutoff;
  });

  const scaledAds = ads.filter((a) => a.investimento > settings.scaledSpend);

  const winnerAds = scaledAds.filter((a) =>
    evalCondition(a, {
      metric: settings.winnerMetric,
      operator: settings.winnerOperator,
      value: settings.winnerValue,
    }),
  );

  // High Potential: scaled, within 10% of winner ROAS target, high CTR but low conversion
  const highPotentialAds = scaledAds.filter((a) => {
    const targetRoas = settings.winnerValue;
    const isCloseToTarget = a.roas >= targetRoas * 0.9 && a.roas < targetRoas;
    const highCtr = a.ctr > 1.0;
    const lowConversion = a.cliques > 0 && a.compras / a.cliques < 0.02;
    return isCloseToTarget || (highCtr && lowConversion);
  });

  const customGroupAds =
    settings.customGroups.length > 0 && selectedGroup < settings.customGroups.length
      ? ads.filter((a) => evalGroup(a, settings.customGroups[selectedGroup]))
      : [];

  const filteredAds =
    tab === "launched"
      ? launchedAds
      : tab === "scaled"
        ? scaledAds
        : tab === "winner"
          ? winnerAds
          : tab === "high-potential"
            ? highPotentialAds
            : customGroupAds;

  /* ── Settings drawer handlers ── */

  function applySettings() {
    setSettings(draftSettings);
    saveSettings(draftSettings);
    setDrawerOpen(false);
  }

  function addGroup() {
    setDraftSettings({
      ...draftSettings,
      customGroups: [
        ...draftSettings.customGroups,
        { name: "New Group", conditions: [{ metric: "roas", operator: ">", value: 1 }] },
      ],
    });
  }

  function removeGroup(idx: number) {
    setDraftSettings({
      ...draftSettings,
      customGroups: draftSettings.customGroups.filter((_, i) => i !== idx),
    });
  }

  function updateGroupName(idx: number, name: string) {
    const groups = [...draftSettings.customGroups];
    groups[idx] = { ...groups[idx], name };
    setDraftSettings({ ...draftSettings, customGroups: groups });
  }

  function addCondition(groupIdx: number) {
    const groups = [...draftSettings.customGroups];
    groups[groupIdx] = {
      ...groups[groupIdx],
      conditions: [
        ...groups[groupIdx].conditions,
        { metric: "roas", operator: ">", value: 1 },
      ],
    };
    setDraftSettings({ ...draftSettings, customGroups: groups });
  }

  function removeCondition(groupIdx: number, condIdx: number) {
    const groups = [...draftSettings.customGroups];
    groups[groupIdx] = {
      ...groups[groupIdx],
      conditions: groups[groupIdx].conditions.filter((_, i) => i !== condIdx),
    };
    setDraftSettings({ ...draftSettings, customGroups: groups });
  }

  function updateCondition(
    groupIdx: number,
    condIdx: number,
    patch: Partial<Condition>,
  ) {
    const groups = [...draftSettings.customGroups];
    const conds = [...groups[groupIdx].conditions];
    conds[condIdx] = { ...conds[condIdx], ...patch };
    groups[groupIdx] = { ...groups[groupIdx], conditions: conds };
    setDraftSettings({ ...draftSettings, customGroups: groups });
  }

  /* ── Tab config ── */

  const tabs: { id: Tab; label: string; count: number; sub: string; icon: string }[] = [
    {
      id: "launched",
      label: "Launched",
      count: launchedAds.length,
      sub: `Last ${launchDays} days`,
      icon: "🚀",
    },
    {
      id: "scaled",
      label: "Scaled",
      count: scaledAds.length,
      sub: `Spend > ${fmtBRL(settings.scaledSpend)}`,
      icon: "💰",
    },
    {
      id: "winner",
      label: "Winner",
      count: winnerAds.length,
      sub: `Scaled & ${settings.winnerMetric.toUpperCase()} ${settings.winnerOperator} ${settings.winnerValue}`,
      icon: "🏆",
    },
    {
      id: "high-potential",
      label: "High Potential",
      count: highPotentialAds.length,
      sub: "Iteration Candidates",
      icon: "💡",
    },
    {
      id: "custom",
      label: "Custom Groups",
      count: customGroupAds.length,
      sub: `${settings.customGroups.length} Group${settings.customGroups.length !== 1 ? "s" : ""}`,
      icon: "⚙️",
    },
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

  return (
    <div className="min-h-screen bg-stone">
      <Header />
      <main className="max-w-[90rem] mx-auto px-4 sm:px-6 pb-12">
        {/* Page header */}
        <div className="flex items-center justify-between py-6">
          <div>
            <h2 className="text-lg font-bold text-black">Compass</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Evaluate creative performance to uncover winning, scaled creatives
              and opportunities.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Date range selector */}
            <select
              value={launchDays}
              onChange={(e) => setLaunchDays(Number(e.target.value))}
              className="text-xs border border-gray-200 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-red"
            >
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
              <option value={60}>Last 60 days</option>
              <option value={90}>Last 90 days</option>
            </select>
            {/* Report Settings button */}
            <button
              onClick={() => {
                setDraftSettings(settings);
                setDrawerOpen(true);
              }}
              className="px-3 py-1.5 text-xs font-semibold rounded-md border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-gray-600"
            >
              Report Settings
            </button>
          </div>
        </div>

        {/* Tab cards */}
        <div className="grid grid-cols-5 gap-3 mb-6">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`text-left rounded-xl border px-4 py-3 transition-all ${
                tab === t.id
                  ? "bg-white border-red/30 ring-1 ring-red/20 shadow-sm"
                  : "bg-white border-gray-100 hover:border-gray-200"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-2xl font-bold text-black">{t.count}</span>
                <span className="text-lg">{t.icon}</span>
              </div>
              <p className="text-sm font-semibold text-black">{t.label}</p>
              <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                {t.sub}
                {(t.id === "winner" || t.id === "custom") && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setDraftSettings(settings);
                      setDrawerOpen(true);
                    }}
                    className="ml-1 cursor-pointer text-gray-300 hover:text-gray-500"
                  >
                    ✏️
                  </span>
                )}
              </p>
            </button>
          ))}
        </div>

        {/* Custom group sub-tabs */}
        {tab === "custom" && settings.customGroups.length > 0 && (
          <div className="flex gap-1 mb-4 bg-white rounded-lg p-1 border border-gray-100 w-fit">
            {settings.customGroups.map((g, i) => (
              <button
                key={i}
                onClick={() => setSelectedGroup(i)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  selectedGroup === i
                    ? "bg-black text-white"
                    : "text-gray-500 hover:text-black"
                }`}
              >
                {g.name}
              </button>
            ))}
          </div>
        )}

        {/* View toggle + perf date range label */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-gray-400">
            Perf. Last {launchDays} days · {daysAgo(launchDays)} – {new Date().toISOString().slice(0, 10)}
          </p>
          <div className="flex gap-1 bg-white rounded-lg p-1 border border-gray-100">
            <button
              onClick={() => setViewMode("table")}
              className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
                viewMode === "table" ? "bg-black text-white" : "text-gray-400 hover:text-black"
              }`}
            >
              ☰
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
                viewMode === "grid" ? "bg-black text-white" : "text-gray-400 hover:text-black"
              }`}
            >
              ⊞
            </button>
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
          <TableView ads={filteredAds} />
        ) : (
          <GridView ads={filteredAds} />
        )}
      </main>

      {/* ── Report Settings Drawer ── */}
      {drawerOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setDrawerOpen(false)}
          />
          {/* Drawer */}
          <div className="fixed right-0 top-0 h-full w-[460px] bg-white z-50 shadow-xl overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h3 className="text-lg font-bold text-black">Report Settings</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={applySettings}
                  className="px-4 py-1.5 rounded-md text-xs font-semibold bg-red text-white hover:opacity-90 transition-colors"
                >
                  Apply
                </button>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="text-gray-400 hover:text-black text-lg"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="px-6 py-5 space-y-6">
              {/* Scaled threshold */}
              <section className="border border-gray-100 rounded-xl p-4">
                <h4 className="text-sm font-bold text-black mb-1">
                  💰 Scaled
                  <span className="text-gray-400 font-normal ml-1">
                    (Spend &gt; R${draftSettings.scaledSpend})
                  </span>
                </h4>
                <p className="text-[10px] text-gray-400 mb-3">
                  Set the minimum spend threshold to qualify as scaled
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5">
                    spend
                  </span>
                  <span className="text-xs text-gray-400">&gt;</span>
                  <input
                    type="number"
                    value={draftSettings.scaledSpend}
                    onChange={(e) =>
                      setDraftSettings({
                        ...draftSettings,
                        scaledSpend: Number(e.target.value),
                      })
                    }
                    className="w-24 text-xs border border-gray-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-red"
                  />
                  <span className="text-xs text-gray-400">BRL</span>
                </div>
              </section>

              {/* Winner threshold */}
              <section className="border border-gray-100 rounded-xl p-4">
                <h4 className="text-sm font-bold text-black mb-1">
                  🏆 Winner
                  <span className="text-gray-400 font-normal ml-1">
                    ({draftSettings.winnerMetric.toUpperCase()} {draftSettings.winnerOperator}{" "}
                    {draftSettings.winnerValue})
                  </span>
                </h4>
                <p className="text-[10px] text-gray-400 mb-3">
                  Set the goal metric threshold to qualify as winner
                </p>
                <div className="flex items-center gap-2">
                  <select
                    value={draftSettings.winnerMetric}
                    onChange={(e) =>
                      setDraftSettings({ ...draftSettings, winnerMetric: e.target.value })
                    }
                    className="text-xs border border-gray-200 rounded-md px-3 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-red"
                  >
                    {METRICS.map((m) => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </select>
                  <select
                    value={draftSettings.winnerOperator}
                    onChange={(e) =>
                      setDraftSettings({ ...draftSettings, winnerOperator: e.target.value })
                    }
                    className="text-xs border border-gray-200 rounded-md px-3 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-red"
                  >
                    {OPERATORS.map((o) => (
                      <option key={o.id} value={o.id}>{o.label}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="0.1"
                    value={draftSettings.winnerValue}
                    onChange={(e) =>
                      setDraftSettings({
                        ...draftSettings,
                        winnerValue: Number(e.target.value),
                      })
                    }
                    className="w-24 text-xs border border-gray-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-red"
                  />
                </div>
              </section>

              {/* Custom Groups */}
              <section className="border border-gray-100 rounded-xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-bold text-black">
                    ⚙️ Custom Groups
                    <span className="text-gray-400 font-normal ml-1">
                      ({draftSettings.customGroups.length})
                    </span>
                  </h4>
                  <button
                    onClick={addGroup}
                    className="px-3 py-1 text-xs font-semibold rounded-md bg-red text-white hover:opacity-90 transition-colors"
                  >
                    + New group
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 mb-4">
                  Set criteria for identifying opportunities in ads
                </p>

                <div className="space-y-4">
                  {draftSettings.customGroups.map((group, gi) => (
                    <div
                      key={gi}
                      className="border border-gray-100 rounded-lg p-3 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <input
                          type="text"
                          value={group.name}
                          onChange={(e) => updateGroupName(gi, e.target.value)}
                          className="flex-1 text-sm font-semibold border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-red"
                        />
                        <button
                          onClick={() => removeGroup(gi)}
                          className="ml-2 text-gray-300 hover:text-red text-sm"
                        >
                          🗑
                        </button>
                      </div>

                      {group.conditions.map((cond, ci) => (
                        <div key={ci} className="flex items-center gap-2">
                          <select
                            value={cond.metric}
                            onChange={(e) =>
                              updateCondition(gi, ci, { metric: e.target.value })
                            }
                            className="text-xs border border-gray-200 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-red"
                          >
                            {METRICS.map((m) => (
                              <option key={m.id} value={m.id}>{m.label}</option>
                            ))}
                          </select>
                          <select
                            value={cond.operator}
                            onChange={(e) =>
                              updateCondition(gi, ci, { operator: e.target.value })
                            }
                            className="text-xs border border-gray-200 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-red"
                          >
                            {OPERATORS.map((o) => (
                              <option key={o.id} value={o.id}>{o.label}</option>
                            ))}
                          </select>
                          <input
                            type="number"
                            step="0.1"
                            value={cond.value}
                            onChange={(e) =>
                              updateCondition(gi, ci, { value: Number(e.target.value) })
                            }
                            className="w-20 text-xs border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-red"
                          />
                          {group.conditions.length > 1 && (
                            <button
                              onClick={() => removeCondition(gi, ci)}
                              className="text-gray-300 hover:text-red text-xs"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}

                      <button
                        onClick={() => addCondition(gi)}
                        className="text-xs text-gray-400 hover:text-black transition-colors"
                      >
                        + Add OR Condition
                      </button>
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

/* ── Table View ── */

function TableView({ ads }: { ads: CompassAd[] }) {
  const thClass =
    "px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider";
  const tdClass = "px-4 py-3 text-sm";

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100">
            <th className={thClass}>Ad</th>
            <th className={thClass}>Account</th>
            <th className={thClass}>Format</th>
            <th className={thClass}>Launched</th>
            <th className={`${thClass} text-right`}>Spend</th>
            <th className={`${thClass} text-right`}>Impr.</th>
            <th className={`${thClass} text-right`}>Clicks</th>
            <th className={`${thClass} text-right`}>CTR</th>
            <th className={`${thClass} text-right`}>CPM</th>
            <th className={`${thClass} text-right`}>Purchases</th>
            <th className={`${thClass} text-right`}>Revenue</th>
            <th className={`${thClass} text-right`}>ROAS</th>
          </tr>
        </thead>
        <tbody>
          {ads.map((ad) => (
            <tr
              key={ad.id}
              className="border-b border-gray-50 hover:bg-stone/50 transition-colors"
            >
              <td className={`${tdClass} font-semibold max-w-[240px]`}>
                <div className="truncate">{ad.nome}</div>
                {ad.body && (
                  <div className="text-[10px] text-gray-400 truncate max-w-[240px] mt-0.5">
                    {ad.body}
                  </div>
                )}
              </td>
              <td className={`${tdClass} text-gray-500`}>{ad.conta}</td>
              <td className={tdClass}>
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    ad.formato === "Video"
                      ? "bg-purple-100 text-purple-700"
                      : ad.formato === "Carrossel"
                        ? "bg-orange-100 text-orange-700"
                        : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {ad.formato}
                </span>
              </td>
              <td className={`${tdClass} text-gray-500 tabular-nums`}>
                {formatDate(ad.criadoEm)}
              </td>
              <td className={`${tdClass} text-right tabular-nums`}>
                {fmtBRL(ad.investimento)}
              </td>
              <td className={`${tdClass} text-right tabular-nums`}>
                {fmtInt(ad.impressoes)}
              </td>
              <td className={`${tdClass} text-right tabular-nums`}>
                {fmtInt(ad.cliques)}
              </td>
              <td className={`${tdClass} text-right tabular-nums`}>
                {fmtPct(ad.ctr)}
              </td>
              <td className={`${tdClass} text-right tabular-nums`}>
                {fmtBRL(ad.cpm)}
              </td>
              <td className={`${tdClass} text-right tabular-nums`}>
                {fmtInt(ad.compras)}
              </td>
              <td className={`${tdClass} text-right tabular-nums`}>
                {fmtBRL(ad.receita)}
              </td>
              <td className={`${tdClass} text-right font-semibold tabular-nums`}>
                {fmtNum(ad.roas)}x
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Grid View ── */

function GridView({ ads }: { ads: CompassAd[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {ads.map((ad) => (
        <div
          key={ad.id}
          className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-shadow"
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-black truncate">
                {ad.nome}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    ad.formato === "Video"
                      ? "bg-purple-100 text-purple-700"
                      : ad.formato === "Carrossel"
                        ? "bg-orange-100 text-orange-700"
                        : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {ad.formato}
                </span>
                <span className="text-[10px] text-gray-400">{ad.conta}</span>
                <span className="text-[10px] text-gray-400">
                  {formatDate(ad.criadoEm)}
                </span>
              </div>
            </div>
          </div>

          {/* Copy preview */}
          {ad.body && (
            <p className="text-xs text-gray-500 mb-3 line-clamp-2">{ad.body}</p>
          )}

          {/* Metrics grid */}
          <div className="grid grid-cols-3 gap-2">
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
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">Clicks</p>
              <p className="text-sm font-semibold tabular-nums">{fmtInt(ad.cliques)}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">Purchases</p>
              <p className="text-sm font-semibold tabular-nums">{fmtInt(ad.compras)}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">Revenue</p>
              <p className="text-sm font-semibold tabular-nums">{fmtBRL(ad.receita)}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
