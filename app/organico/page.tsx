"use client";

import { useState, useEffect, useCallback } from "react";
import Header from "../components/Header";

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

function fmtNum(val: number, decimals = 1): string {
  return val.toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtPct(val: number): string {
  return `${fmtNum(val)}%`;
}

function fmtInt(val: number): string {
  return val.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

type SortDir = "asc" | "desc";

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span className="text-gray-300 ml-1">↕</span>;
  return <span className="text-red ml-1">{dir === "asc" ? "↑" : "↓"}</span>;
}

export default function OrganicoPage() {
  const [organic, setOrganic] = useState<OrganicRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sortKey, setSortKey] = useState<keyof OrganicRow>("taxaEngajamento");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sheets?date_preset=maximum");
      if (!res.ok) throw new Error("Erro ao carregar dados");
      const data = await res.json();
      setOrganic(data.organic || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const sorted = [...organic].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    if (typeof aVal === "number" && typeof bVal === "number") {
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    }
    return sortDir === "asc" ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
  });

  const top3 = [...organic].sort((a, b) => b.taxaEngajamento - a.taxaEngajamento).slice(0, 3).map((r) => r.nome);

  const totalPosts = organic.length;
  const avgAlcance = organic.length > 0 ? organic.reduce((s, r) => s + r.alcance, 0) / organic.length : 0;
  const avgEngagement = organic.length > 0 ? organic.reduce((s, r) => s + r.taxaEngajamento, 0) / organic.length : 0;

  function handleSort(key: keyof OrganicRow) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  const thClass = "px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-black transition-colors select-none";
  const tdClass = "px-4 py-3 text-sm";

  return (
    <div className="min-h-screen bg-stone">
      <Header />
      <main className="max-w-[90rem] mx-auto px-4 sm:px-6 pb-12">
        <div className="py-6">
          <h2 className="text-lg font-bold text-black">Orgânico</h2>
          <p className="text-xs text-gray-400 mt-0.5">Instagram organic performance.</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Total de Posts</p>
            <p className="text-2xl font-bold tracking-tight text-black">{fmtInt(totalPosts)}</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Alcance Médio</p>
            <p className="text-2xl font-bold tracking-tight text-black">{fmtInt(avgAlcance)}</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Taxa de Engajamento Média</p>
            <p className="text-2xl font-bold tracking-tight text-red">{fmtPct(avgEngagement)}</p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-gray-100">
                <th className={thClass} onClick={() => handleSort("nome")}>Post <SortIcon active={sortKey === "nome"} dir={sortDir} /></th>
                <th className={thClass} onClick={() => handleSort("formato")}>Formato <SortIcon active={sortKey === "formato"} dir={sortDir} /></th>
                <th className={thClass} onClick={() => handleSort("data")}>Data <SortIcon active={sortKey === "data"} dir={sortDir} /></th>
                <th className={thClass} onClick={() => handleSort("alcance")}>Alcance <SortIcon active={sortKey === "alcance"} dir={sortDir} /></th>
                <th className={thClass} onClick={() => handleSort("curtidas")}>Curtidas <SortIcon active={sortKey === "curtidas"} dir={sortDir} /></th>
                <th className={thClass} onClick={() => handleSort("salvamentos")}>Salvamentos <SortIcon active={sortKey === "salvamentos"} dir={sortDir} /></th>
                <th className={thClass} onClick={() => handleSort("compartilhamentos")}>Compartilh. <SortIcon active={sortKey === "compartilhamentos"} dir={sortDir} /></th>
                <th className={thClass} onClick={() => handleSort("visualizacoes")}>Views <SortIcon active={sortKey === "visualizacoes"} dir={sortDir} /></th>
                <th className={thClass} onClick={() => handleSort("taxaEngajamento")}>Engajamento <SortIcon active={sortKey === "taxaEngajamento"} dir={sortDir} /></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400">Carregando...</td></tr>
              ) : error ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-red">{error}</td></tr>
              ) : sorted.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400">Nenhum dado encontrado</td></tr>
              ) : (
                sorted.map((row, i) => (
                  <tr key={i} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${top3.includes(row.nome) ? "border-l-3 border-l-gold-accent" : ""}`}>
                    <td className={`${tdClass} font-medium text-black max-w-[200px] truncate`}>
                      {row.permalink ? (
                        <a href={row.permalink} target="_blank" rel="noopener noreferrer"
                          className="hover:text-red transition-colors underline decoration-gray-300 hover:decoration-red">
                          {row.nome}
                        </a>
                      ) : row.nome}
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
      </main>
    </div>
  );
}
