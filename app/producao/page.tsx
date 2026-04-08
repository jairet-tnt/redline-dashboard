"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import Header from "../components/Header";
import { STAGES, SEED_ADS, type AdBrief, type Stage } from "./data";

const LS_KEY = "redline-producao-ads";

function load(): AdBrief[] {
  if (typeof window === "undefined") return SEED_ADS;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return SEED_ADS;
    const saved: AdBrief[] = JSON.parse(raw);
    // Merge: keep saved state but backfill any new seed ads
    const map = new Map(saved.map((a) => [a.id, a]));
    for (const seed of SEED_ADS) {
      if (!map.has(seed.id)) map.set(seed.id, seed);
    }
    return Array.from(map.values()).sort((a, b) => a.number - b.number);
  } catch {
    return SEED_ADS;
  }
}

function save(ads: AdBrief[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(ads));
}

/* ─── tiny helpers ─── */

function typeBadge(type: "image" | "video") {
  return type === "video" ? (
    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-700">
      Video
    </span>
  ) : (
    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700">
      Image
    </span>
  );
}

function angleBadge(code: string) {
  return (
    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gray-200 text-gray-600">
      {code}
    </span>
  );
}

function phaseBadge(phase: number) {
  const colors: Record<number, string> = {
    1: "bg-green-badge-bg text-green-badge-text",
    2: "bg-amber-badge-bg text-amber-badge-text",
    3: "bg-red-badge-bg text-red-badge-text",
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${colors[phase] ?? "bg-gray-100 text-gray-500"}`}
    >
      Phase {phase}
    </span>
  );
}

function progressBar(items: { done: boolean }[]) {
  if (items.length === 0) return null;
  const done = items.filter((i) => i.done).length;
  const pct = Math.round((done / items.length) * 100);
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-red rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] text-gray-400 font-semibold tabular-nums">
        {done}/{items.length}
      </span>
    </div>
  );
}

/* ─── main ─── */

export default function ProducaoPage() {
  const [ads, setAds] = useState<AdBrief[]>([]);
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setAds(load());
    setMounted(true);
  }, []);

  const persist = useCallback(
    (next: AdBrief[]) => {
      setAds(next);
      save(next);
    },
    [],
  );

  const updateAd = useCallback(
    (id: string, patch: Partial<AdBrief>) => {
      persist(ads.map((a) => (a.id === id ? { ...a, ...patch } : a)));
    },
    [ads, persist],
  );

  const moveStage = useCallback(
    (id: string, dir: 1 | -1) => {
      const ad = ads.find((a) => a.id === id);
      if (!ad) return;
      const idx = STAGES.findIndex((s) => s.id === ad.stage);
      const next = idx + dir;
      if (next < 0 || next >= STAGES.length) return;
      updateAd(id, { stage: STAGES[next].id });
    },
    [ads, updateAd],
  );

  const toggleAsset = useCallback(
    (adId: string, assetIdx: number) => {
      const ad = ads.find((a) => a.id === adId);
      if (!ad) return;
      const neededAssets = ad.neededAssets.map((a, i) =>
        i === assetIdx ? { ...a, done: !a.done } : a,
      );
      updateAd(adId, { neededAssets });
    },
    [ads, updateAd],
  );

  const toggleDrive = useCallback(
    (adId: string, fileIdx: number) => {
      const ad = ads.find((a) => a.id === adId);
      if (!ad) return;
      const driveFiles = ad.driveFiles.map((f, i) =>
        i === fileIdx ? { ...f, done: !f.done } : f,
      );
      updateAd(adId, { driveFiles });
    },
    [ads, updateAd],
  );

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

  /* ─── expanded card detail ─── */
  function CardDetail({ ad }: { ad: AdBrief }) {
    return (
      <div className="mt-3 pt-3 border-t border-gray-100 space-y-4 text-sm">
        {/* Concept */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
            Concept
          </p>
          <p className="text-gray-700 leading-relaxed">{ad.concept}</p>
        </div>

        {/* Format */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
            Format
          </p>
          <p className="text-gray-700 leading-relaxed">{ad.format}</p>
        </div>

        {/* PT-BR Copy */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
            Copy (PT-BR)
          </p>
          <pre className="whitespace-pre-wrap text-gray-700 bg-stone rounded-lg p-3 text-xs leading-relaxed font-sans">
            {ad.copyPtBr}
          </pre>
        </div>

        {/* CTA */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
            CTA
          </p>
          <p className="font-semibold text-red">{ad.cta}</p>
        </div>

        {/* Shoot Brief */}
        {ad.shootBrief && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
              Shoot Brief
            </p>
            <p className="text-gray-700 leading-relaxed">{ad.shootBrief}</p>
          </div>
        )}

        {/* Director Notes */}
        {ad.directorNotes && (
          <div className="bg-amber-badge-bg rounded-lg p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-badge-text mb-1">
              Director Notes
            </p>
            <p className="text-amber-badge-text text-xs leading-relaxed">
              {ad.directorNotes}
            </p>
          </div>
        )}

        {/* Duration (video) */}
        {ad.duration && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
              Duration
            </p>
            <p className="text-gray-700">{ad.duration}</p>
          </div>
        )}

        {/* Needed Assets checklist */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
            Needed Assets
          </p>
          <ul className="space-y-1.5">
            {ad.neededAssets.map((a, i) => (
              <li key={i} className="flex items-start gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleAsset(ad.id, i);
                  }}
                  className={`mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                    a.done
                      ? "bg-red border-red text-white"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                >
                  {a.done && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path
                        d="M2 5l2.5 2.5L8 3"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
                <span className={a.done ? "line-through text-gray-400" : "text-gray-700"}>
                  {a.label}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Drive Files checklist */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
            Drive Files
          </p>
          <ul className="space-y-1.5">
            {ad.driveFiles.map((f, i) => (
              <li key={i} className="flex items-start gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleDrive(ad.id, i);
                  }}
                  className={`mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                    f.done
                      ? "bg-red border-red text-white"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                >
                  {f.done && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path
                        d="M2 5l2.5 2.5L8 3"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
                <span className={f.done ? "line-through text-gray-400" : "text-gray-700"}>
                  {f.label}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Responsible + Talent */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
              Responsible
            </p>
            <input
              type="text"
              value={ad.responsible}
              placeholder="Assign..."
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => updateAd(ad.id, { responsible: e.target.value })}
              className="w-full text-xs border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-red bg-white"
            />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
              Talent
            </p>
            <input
              type="text"
              value={ad.talent}
              placeholder="Assign..."
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => updateAd(ad.id, { talent: e.target.value })}
              className="w-full text-xs border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-red bg-white"
            />
          </div>
        </div>

        {/* Stage controls */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <button
            onClick={(e) => {
              e.stopPropagation();
              moveStage(ad.id, -1);
            }}
            disabled={ad.stage === STAGES[0].id}
            className="px-3 py-1 text-xs font-semibold rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed bg-gray-100 hover:bg-gray-200 text-gray-600"
          >
            ← Back
          </button>
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
            {STAGES.find((s) => s.id === ad.stage)?.label}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              moveStage(ad.id, 1);
            }}
            disabled={ad.stage === STAGES[STAGES.length - 1].id}
            className="px-3 py-1 text-xs font-semibold rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed bg-red text-white hover:opacity-90"
          >
            Next →
          </button>
        </div>
      </div>
    );
  }

  /* ─── card (shared between kanban + table expanded) ─── */
  function AdCard({ ad, compact }: { ad: AdBrief; compact?: boolean }) {
    const isExpanded = expanded === ad.id;
    return (
      <div
        onClick={() => setExpanded(isExpanded ? null : ad.id)}
        className={`bg-white rounded-xl border border-gray-100 px-4 py-3 cursor-pointer transition-shadow hover:shadow-md ${
          isExpanded ? "shadow-md ring-1 ring-red/20" : ""
        } ${compact ? "" : "mb-2.5"}`}
      >
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap mb-1">
              <span className="text-[10px] font-bold text-gray-400">
                AD {String(ad.number).padStart(2, "0")}
              </span>
              {typeBadge(ad.type)}
              {angleBadge(ad.angleCode)}
              {phaseBadge(ad.phase)}
              {ad.tags.map((t) => (
                <span
                  key={t}
                  className="inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold bg-red/10 text-red uppercase tracking-wider"
                >
                  {t}
                </span>
              ))}
            </div>
            <p className="text-sm font-semibold text-black leading-snug truncate">
              {ad.title}
            </p>
            {ad.responsible && (
              <p className="text-[10px] text-gray-400 mt-0.5">
                → {ad.responsible}
                {ad.talent ? ` · Talent: ${ad.talent}` : ""}
              </p>
            )}
          </div>
          <svg
            className={`w-4 h-4 text-gray-300 flex-shrink-0 mt-1 transition-transform ${
              isExpanded ? "rotate-180" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Progress bar */}
        {progressBar([...ad.neededAssets, ...ad.driveFiles])}

        {/* Expanded */}
        {isExpanded && <CardDetail ad={ad} />}
      </div>
    );
  }

  /* ─── kanban view ─── */
  function KanbanView() {
    return (
      <div className="grid grid-cols-5 gap-4 min-h-[60vh]">
        {STAGES.map((stage) => {
          const stageAds = ads.filter((a) => a.stage === stage.id);
          return (
            <div key={stage.id} className="flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  {stage.label}
                </h3>
                <span className="text-[10px] font-bold text-gray-300 bg-gray-100 rounded-full w-5 h-5 flex items-center justify-center">
                  {stageAds.length}
                </span>
              </div>
              <div className="flex-1 space-y-0 bg-stone/50 rounded-xl p-2">
                {stageAds.length === 0 && (
                  <p className="text-[10px] text-gray-300 text-center py-8">
                    Nenhum ad
                  </p>
                )}
                {stageAds.map((ad) => (
                  <AdCard key={ad.id} ad={ad} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  /* ─── table view ─── */
  function TableView() {
    const thClass =
      "px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider";
    const tdClass = "px-4 py-3 text-sm";
    return (
      <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className={thClass}>#</th>
              <th className={thClass}>Ad</th>
              <th className={thClass}>Type</th>
              <th className={thClass}>Angle</th>
              <th className={thClass}>Phase</th>
              <th className={thClass}>Stage</th>
              <th className={thClass}>Assets</th>
              <th className={thClass}>Drive</th>
              <th className={thClass}>Responsible</th>
              <th className={thClass}>Talent</th>
            </tr>
          </thead>
          <tbody>
            {ads.map((ad) => {
              const isExpanded = expanded === ad.id;
              const assetsDone = ad.neededAssets.filter((a) => a.done).length;
              const driveDone = ad.driveFiles.filter((f) => f.done).length;
              return (
                <Fragment key={ad.id}>
                  <tr
                    onClick={() => setExpanded(isExpanded ? null : ad.id)}
                    className="border-b border-gray-50 cursor-pointer hover:bg-stone/50 transition-colors"
                  >
                    <td className={`${tdClass} font-bold text-gray-400`}>
                      {String(ad.number).padStart(2, "0")}
                    </td>
                    <td className={`${tdClass} font-semibold max-w-[200px] truncate`}>
                      {ad.title}
                    </td>
                    <td className={tdClass}>{typeBadge(ad.type)}</td>
                    <td className={tdClass}>{angleBadge(ad.angleCode)}</td>
                    <td className={tdClass}>{phaseBadge(ad.phase)}</td>
                    <td className={tdClass}>
                      <span className="text-xs font-semibold text-gray-500">
                        {STAGES.find((s) => s.id === ad.stage)?.label}
                      </span>
                    </td>
                    <td className={tdClass}>
                      <span className="text-xs tabular-nums text-gray-500">
                        {assetsDone}/{ad.neededAssets.length}
                      </span>
                    </td>
                    <td className={tdClass}>
                      <span className="text-xs tabular-nums text-gray-500">
                        {driveDone}/{ad.driveFiles.length}
                      </span>
                    </td>
                    <td className={`${tdClass} text-gray-500`}>
                      {ad.responsible || "—"}
                    </td>
                    <td className={`${tdClass} text-gray-500`}>
                      {ad.talent || "—"}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={10} className="px-4 pb-4 bg-stone/30">
                        <CardDetail ad={ad} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  /* ─── summary stats ─── */
  const stageCounts = STAGES.map((s) => ({
    ...s,
    count: ads.filter((a) => a.stage === s.id).length,
  }));
  const totalAssets = ads.reduce((n, a) => n + a.neededAssets.length, 0);
  const doneAssets = ads.reduce(
    (n, a) => n + a.neededAssets.filter((x) => x.done).length,
    0,
  );

  return (
    <div className="min-h-screen bg-stone">
      <Header />
      <main className="max-w-[90rem] mx-auto px-4 sm:px-6 pb-12">
        {/* Page header */}
        <div className="flex items-center justify-between py-6">
          <div>
            <h2 className="text-lg font-bold text-black">
              Produção — Velocity Speed Rope
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {ads.length} ads · {doneAssets}/{totalAssets} assets done
            </p>
          </div>
          <div className="flex gap-1 bg-white rounded-lg p-1 border border-gray-100">
            <button
              onClick={() => setView("kanban")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                view === "kanban"
                  ? "bg-black text-white"
                  : "text-gray-500 hover:text-black"
              }`}
            >
              Kanban
            </button>
            <button
              onClick={() => setView("table")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                view === "table"
                  ? "bg-black text-white"
                  : "text-gray-500 hover:text-black"
              }`}
            >
              Tabela
            </button>
          </div>
        </div>

        {/* Stage summary pills */}
        <div className="flex gap-2 mb-6">
          {stageCounts.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-gray-100 text-xs"
            >
              <span className="font-semibold text-gray-500">{s.label}</span>
              <span className="font-bold text-black">{s.count}</span>
            </div>
          ))}
        </div>

        {/* View */}
        {view === "kanban" ? <KanbanView /> : <TableView />}
      </main>
    </div>
  );
}

