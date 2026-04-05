"use client";

import { useState, useEffect, useCallback } from "react";

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

interface OrganicRow {
  nome: string;
  formato: string;
  data: string;
  alcance: number;
  curtidas: number;
  salvamentos: number;
  compartilhamentos: number;
  visualizacoes: number;
  interacoes: number;
  taxaEngajamento: number;
  permalink: string;
}

function fmtBRL(val: number): string {
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtNum(val: number, decimals = 1): string {
  return val.toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtPct(val: number): string {
  return `${fmtNum(val)}%`;
}

function fmtRoas(val: number): string {
  return `${fmtNum(val)}x`;
}

function fmtInt(val: number): string {
  return val.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

type SortDir = "asc" | "desc";

function StatusBadge({ status }: { status: "Saudável" | "Atenção" | "Pausar" }) {
  const styles = {
    Saudável: "bg-green-badge-bg text-green-badge-text",
    Atenção: "bg-amber-badge-bg text-amber-badge-text",
    Pausar: "bg-red-badge-bg text-red-badge-text",
  };
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${styles[status]}`}>
      {status}
    </span>
  );
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span className="text-gray-300 ml-1">↕</span>;
  return <span className="text-red ml-1">{dir === "asc" ? "↑" : "↓"}</span>;
}

export default function Home() {
  const [paid, setPaid] = useState<PaidRow[]>([]);
  const [organic, setOrganic] = useState<OrganicRow[]>([]);
  const [fetchedAt, setFetchedAt] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"pago" | "organico">("pago");
  const [datePreset, setDatePreset] = useState("maximum");
  const [customSince, setCustomSince] = useState("");
  const [customUntil, setCustomUntil] = useState("");
  const [accountFilter, setAccountFilter] = useState("all");

  // Paid sort
  const [paidSortKey, setPaidSortKey] = useState<keyof PaidRow>("roas");
  const [paidSortDir, setPaidSortDir] = useState<SortDir>("desc");

  // Organic sort
  const [orgSortKey, setOrgSortKey] = useState<keyof OrganicRow>("taxaEngajamento");
  const [orgSortDir, setOrgSortDir] = useState<SortDir>("desc");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `/api/sheets?date_preset=${datePreset}`;
      if (datePreset === "custom" && customSince && customUntil) {
        url = `/api/sheets?since=${customSince}&until=${customUntil}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error("Erro ao carregar dados");
      const data = await res.json();
      setPaid(data.paid || []);
      setOrganic(data.organic || []);
      setFetchedAt(data.fetchedAt || "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, [datePreset, customSince, customUntil]);

  useEffect(() => {
    fetchData();
  }, [fetchData, datePreset]);

  // Account filter
  const filteredPaid = accountFilter === "all"
    ? paid
    : paid.filter((r) => r.conta === accountFilter);

  // Paid sorting
  const sortedPaid = [...filteredPaid].sort((a, b) => {
    const aVal = a[paidSortKey];
    const bVal = b[paidSortKey];
    if (typeof aVal === "number" && typeof bVal === "number") {
      return paidSortDir === "asc" ? aVal - bVal : bVal - aVal;
    }
    return paidSortDir === "asc"
      ? String(aVal).localeCompare(String(bVal))
      : String(bVal).localeCompare(String(aVal));
  });

  // Organic sorting
  const sortedOrganic = [...organic].sort((a, b) => {
    const aVal = a[orgSortKey];
    const bVal = b[orgSortKey];
    if (typeof aVal === "number" && typeof bVal === "number") {
      return orgSortDir === "asc" ? aVal - bVal : bVal - aVal;
    }
    return orgSortDir === "asc"
      ? String(aVal).localeCompare(String(bVal))
      : String(bVal).localeCompare(String(aVal));
  });

  // Top 3 organic by engagement
  const top3Organic = [...organic]
    .sort((a, b) => b.taxaEngajamento - a.taxaEngajamento)
    .slice(0, 3)
    .map((r) => r.nome);

  // Paid summary (uses filtered data)
  const totalInvestimento = filteredPaid.reduce((s, r) => s + r.investimento, 0);
  const weightedRoas =
    totalInvestimento > 0
      ? filteredPaid.reduce((s, r) => s + r.roas * r.investimento, 0) / totalInvestimento
      : 0;
  const avgCtr = filteredPaid.length > 0 ? filteredPaid.reduce((s, r) => s + r.ctr, 0) / filteredPaid.length : 0;
  const avgFreq = filteredPaid.length > 0 ? filteredPaid.reduce((s, r) => s + r.frequencia, 0) / filteredPaid.length : 0;

  const countSaudavel = filteredPaid.filter((r) => r.status === "Saudável").length;
  const countAtencao = filteredPaid.filter((r) => r.status === "Atenção").length;
  const countPausar = filteredPaid.filter((r) => r.status === "Pausar").length;

  // Get unique accounts for filter
  const accounts = [...new Set(paid.map((r) => r.conta))].sort();

  // Organic summary
  const totalPosts = organic.length;
  const avgAlcance = organic.length > 0 ? organic.reduce((s, r) => s + r.alcance, 0) / organic.length : 0;
  const avgEngagement =
    organic.length > 0 ? organic.reduce((s, r) => s + r.taxaEngajamento, 0) / organic.length : 0;

  function handlePaidSort(key: keyof PaidRow) {
    if (paidSortKey === key) {
      setPaidSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setPaidSortKey(key);
      setPaidSortDir("desc");
    }
  }

  function handleOrgSort(key: keyof OrganicRow) {
    if (orgSortKey === key) {
      setOrgSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setOrgSortKey(key);
      setOrgSortDir("desc");
    }
  }

  const thClass =
    "px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-black transition-colors";
  const tdClass = "px-4 py-3 text-sm whitespace-nowrap";

  return (
    <div className="min-h-screen bg-stone">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-1 h-10 bg-red rounded-full" />
            <div>
              <p className="text-xs font-semibold tracking-[0.2em] uppercase text-gray-400">
                Redline
              </p>
              <h1 className="text-xl font-bold text-black tracking-tight">
                Dashboard de Performance
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap justify-end">
            <select
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-black focus:outline-none focus:ring-1 focus:ring-red"
            >
              <option value="maximum">Todo o Período</option>
              <option value="last_7d">Últimos 7 dias</option>
              <option value="last_14d">Últimos 14 dias</option>
              <option value="last_30d">Últimos 30 dias</option>
              <option value="last_90d">Últimos 90 dias</option>
              <option value="this_month">Este Mês</option>
              <option value="last_month">Mês Passado</option>
              <option value="custom">Personalizado</option>
            </select>
            {datePreset === "custom" && (
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={customSince}
                  onChange={(e) => setCustomSince(e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-black focus:outline-none focus:ring-1 focus:ring-red"
                />
                <span className="text-xs text-gray-400">até</span>
                <input
                  type="date"
                  value={customUntil}
                  onChange={(e) => setCustomUntil(e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-black focus:outline-none focus:ring-1 focus:ring-red"
                />
              </div>
            )}
            {fetchedAt && (
              <p className="text-xs text-gray-400 hidden sm:block">
                Atualizado:{" "}
                {new Date(fetchedAt).toLocaleString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}
            <button
              onClick={fetchData}
              disabled={loading}
              className="px-3 py-1.5 text-sm font-medium bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {loading ? "..." : "Atualizar"}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {error && (
          <div className="mb-4 p-4 bg-red-badge-bg text-red-badge-text rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white rounded-lg p-1 w-fit">
          <button
            onClick={() => setTab("pago")}
            className={`px-5 py-2 rounded-md text-sm font-semibold transition-colors ${
              tab === "pago" ? "bg-black text-white" : "text-gray-500 hover:text-black"
            }`}
          >
            Pago
          </button>
          <button
            onClick={() => setTab("organico")}
            className={`px-5 py-2 rounded-md text-sm font-semibold transition-colors ${
              tab === "organico" ? "bg-black text-white" : "text-gray-500 hover:text-black"
            }`}
          >
            Orgânico
          </button>
        </div>

        {/* PAGO TAB */}
        {tab === "pago" && (
          <>
            {/* Account Filter */}
            {accounts.length > 1 && (
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Conta:</span>
                <div className="flex gap-1 bg-white rounded-lg p-0.5">
                  <button
                    onClick={() => setAccountFilter("all")}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                      accountFilter === "all" ? "bg-black text-white" : "text-gray-500 hover:text-black"
                    }`}
                  >
                    Todas ({paid.length})
                  </button>
                  {accounts.map((acc) => (
                    <button
                      key={acc}
                      onClick={() => setAccountFilter(acc)}
                      className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                        accountFilter === acc ? "bg-black text-white" : "text-gray-500 hover:text-black"
                      }`}
                    >
                      {acc} ({paid.filter((r) => r.conta === acc).length})
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <SummaryCard label="Total Investimento" value={fmtBRL(totalInvestimento)} />
              <SummaryCard label="ROAS Médio" value={fmtRoas(weightedRoas)} accent />
              <SummaryCard label="CTR Médio" value={fmtPct(avgCtr)} />
              <SummaryCard label="Frequência Média" value={fmtNum(avgFreq)} />
            </div>

            {/* Status Pills */}
            <div className="flex flex-wrap gap-3 mb-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-badge-bg text-green-badge-text text-sm font-semibold">
                <span className="w-2 h-2 rounded-full bg-green-badge-text" />
                {countSaudavel} Saudável
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-badge-bg text-amber-badge-text text-sm font-semibold">
                <span className="w-2 h-2 rounded-full bg-amber-badge-text" />
                {countAtencao} Atenção
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-badge-bg text-red-badge-text text-sm font-semibold">
                <span className="w-2 h-2 rounded-full bg-red-badge-text" />
                {countPausar} Pausar
              </span>
            </div>

            {/* Paid Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className={thClass} onClick={() => handlePaidSort("conta")}>
                      Conta <SortIcon active={paidSortKey === "conta"} dir={paidSortDir} />
                    </th>
                    <th className={thClass} onClick={() => handlePaidSort("nome")}>
                      Criativo <SortIcon active={paidSortKey === "nome"} dir={paidSortDir} />
                    </th>
                    <th className={thClass} onClick={() => handlePaidSort("investimento")}>
                      Investimento <SortIcon active={paidSortKey === "investimento"} dir={paidSortDir} />
                    </th>
                    <th className={thClass} onClick={() => handlePaidSort("ctr")}>
                      CTR <SortIcon active={paidSortKey === "ctr"} dir={paidSortDir} />
                    </th>
                    <th className={thClass} onClick={() => handlePaidSort("cpm")}>
                      CPM <SortIcon active={paidSortKey === "cpm"} dir={paidSortDir} />
                    </th>
                    <th className={thClass} onClick={() => handlePaidSort("roas")}>
                      ROAS <SortIcon active={paidSortKey === "roas"} dir={paidSortDir} />
                    </th>
                    <th className={thClass} onClick={() => handlePaidSort("frequencia")}>
                      Frequência <SortIcon active={paidSortKey === "frequencia"} dir={paidSortDir} />
                    </th>
                    <th className={thClass} onClick={() => handlePaidSort("compras")}>
                      Compras <SortIcon active={paidSortKey === "compras"} dir={paidSortDir} />
                    </th>
                    <th className={thClass} onClick={() => handlePaidSort("status")}>
                      Status <SortIcon active={paidSortKey === "status"} dir={paidSortDir} />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading && paid.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                        Carregando...
                      </td>
                    </tr>
                  ) : sortedPaid.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                        Nenhum dado encontrado
                      </td>
                    </tr>
                  ) : (
                    sortedPaid.map((row, i) => (
                      <tr
                        key={i}
                        className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                          row.status === "Pausar" ? "bg-red-50/40" : ""
                        }`}
                      >
                        <td className={`${tdClass} text-xs text-gray-500`}>{row.conta}</td>
                        <td className={`${tdClass} font-medium text-black max-w-[200px] truncate`}>
                          {row.nome}
                        </td>
                        <td className={tdClass}>{fmtBRL(row.investimento)}</td>
                        <td className={tdClass}>{fmtPct(row.ctr)}</td>
                        <td className={tdClass}>{fmtBRL(row.cpm)}</td>
                        <td className={`${tdClass} font-semibold`}>{fmtRoas(row.roas)}</td>
                        <td className={tdClass}>{fmtNum(row.frequencia)}</td>
                        <td className={tdClass}>{fmtInt(row.compras)}</td>
                        <td className={tdClass}>
                          <StatusBadge status={row.status} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ORGÂNICO TAB */}
        {tab === "organico" && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <SummaryCard label="Total de Posts" value={fmtInt(totalPosts)} />
              <SummaryCard label="Alcance Médio" value={fmtInt(avgAlcance)} />
              <SummaryCard label="Taxa de Engajamento Média" value={fmtPct(avgEngagement)} accent />
            </div>

            {/* Organic Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className={thClass} onClick={() => handleOrgSort("nome")}>
                      Post <SortIcon active={orgSortKey === "nome"} dir={orgSortDir} />
                    </th>
                    <th className={thClass} onClick={() => handleOrgSort("formato")}>
                      Formato <SortIcon active={orgSortKey === "formato"} dir={orgSortDir} />
                    </th>
                    <th className={thClass} onClick={() => handleOrgSort("data")}>
                      Data <SortIcon active={orgSortKey === "data"} dir={orgSortDir} />
                    </th>
                    <th className={thClass} onClick={() => handleOrgSort("alcance")}>
                      Alcance <SortIcon active={orgSortKey === "alcance"} dir={orgSortDir} />
                    </th>
                    <th className={thClass} onClick={() => handleOrgSort("curtidas")}>
                      Curtidas <SortIcon active={orgSortKey === "curtidas"} dir={orgSortDir} />
                    </th>
                    <th className={thClass} onClick={() => handleOrgSort("salvamentos")}>
                      Salvamentos <SortIcon active={orgSortKey === "salvamentos"} dir={orgSortDir} />
                    </th>
                    <th className={thClass} onClick={() => handleOrgSort("compartilhamentos")}>
                      Compartilh. <SortIcon active={orgSortKey === "compartilhamentos"} dir={orgSortDir} />
                    </th>
                    <th className={thClass} onClick={() => handleOrgSort("visualizacoes")}>
                      Views <SortIcon active={orgSortKey === "visualizacoes"} dir={orgSortDir} />
                    </th>
                    <th className={thClass} onClick={() => handleOrgSort("taxaEngajamento")}>
                      Engajamento <SortIcon active={orgSortKey === "taxaEngajamento"} dir={orgSortDir} />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading && organic.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                        Carregando...
                      </td>
                    </tr>
                  ) : sortedOrganic.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                        Nenhum dado encontrado
                      </td>
                    </tr>
                  ) : (
                    sortedOrganic.map((row, i) => (
                      <tr
                        key={i}
                        className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                          top3Organic.includes(row.nome) ? "border-l-3 border-l-gold-accent" : ""
                        }`}
                      >
                        <td className={`${tdClass} font-medium text-black max-w-[200px] truncate`}>
                          {row.permalink ? (
                            <a
                              href={row.permalink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:text-red transition-colors underline decoration-gray-300 hover:decoration-red"
                            >
                              {row.nome}
                            </a>
                          ) : (
                            row.nome
                          )}
                        </td>
                        <td className={tdClass}>{row.formato}</td>
                        <td className={tdClass}>{row.data}</td>
                        <td className={tdClass}>{fmtInt(row.alcance)}</td>
                        <td className={tdClass}>{fmtInt(row.curtidas)}</td>
                        <td className={tdClass}>{fmtInt(row.salvamentos)}</td>
                        <td className={tdClass}>{fmtInt(row.compartilhamentos)}</td>
                        <td className={tdClass}>{row.visualizacoes > 0 ? fmtInt(row.visualizacoes) : "—"}</td>
                        <td className={`${tdClass} font-semibold`}>{fmtPct(row.taxaEngajamento)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-bold tracking-tight ${accent ? "text-red" : "text-black"}`}>
        {value}
      </p>
    </div>
  );
}
