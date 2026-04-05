import { NextResponse } from "next/server";

const SHEETS_API_KEY = process.env.GOOGLE_SHEETS_API_KEY;
const SHEET_ID = process.env.GOOGLE_SHEET_ID;

interface PaidRow {
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
  status: "Saudável" | "Atenção" | "Pausar";
}

interface OrganicRow {
  nome: string;
  formato: string;
  data: string;
  alcance: number;
  impressoes: number;
  curtidas: number;
  comentarios: number;
  salvamentos: number;
  compartilhamentos: number;
  taxaEngajamento: number;
}

function parseNum(val: string | undefined): number {
  if (!val) return 0;
  // Handle Brazilian number format: 1.234,56 → 1234.56
  const cleaned = val
    .replace(/R\$\s?/g, "")
    .replace(/%/g, "")
    .replace(/x/gi, "")
    .trim();
  // If it has both . and , assume Brazilian format
  if (cleaned.includes(",")) {
    return parseFloat(cleaned.replace(/\./g, "").replace(",", ".")) || 0;
  }
  return parseFloat(cleaned) || 0;
}

function computeStatus(row: { frequencia: number; ctr: number; roas: number }): "Saudável" | "Atenção" | "Pausar" {
  const { frequencia, ctr, roas } = row;

  // KILL (most severe)
  if (frequencia > 4.5 || (ctr < 0.5 && frequencia > 3) || roas < 1) {
    return "Pausar";
  }

  // WATCH
  if (
    (frequencia >= 3 && frequencia <= 4.5) ||
    (ctr >= 0.5 && ctr <= 1.0) ||
    (roas >= 1 && roas < 2)
  ) {
    return "Atenção";
  }

  // HEALTHY
  if (frequencia < 3 && ctr > 1.0 && roas >= 2) {
    return "Saudável";
  }

  // Default to watch if no clear category
  return "Atenção";
}

async function fetchSheet(range: string): Promise<string[][]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}?key=${SHEETS_API_KEY}`;
  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) {
    throw new Error(`Sheets API error: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return data.values || [];
}

export async function GET() {
  if (!SHEETS_API_KEY || !SHEET_ID) {
    return NextResponse.json(
      { error: "Missing GOOGLE_SHEETS_API_KEY or GOOGLE_SHEET_ID environment variables" },
      { status: 500 }
    );
  }

  try {
    const [paidRows, organicRows] = await Promise.all([
      fetchSheet("Pago!A:L"),
      fetchSheet("Orgânico!A:J"),
    ]);

    // Parse paid data (skip header row)
    const paid: PaidRow[] = paidRows
      .slice(1)
      .filter((row) => row[0] && row[0].trim() !== "")
      .map((row) => {
        const base = {
          nome: row[0] || "",
          formato: row[1] || "",
          investimento: parseNum(row[2]),
          impressoes: parseNum(row[3]),
          alcance: parseNum(row[4]),
          cliques: parseNum(row[5]),
          ctr: parseNum(row[6]),
          cpm: parseNum(row[7]),
          compras: parseNum(row[8]),
          receita: parseNum(row[9]),
          roas: parseNum(row[10]),
          frequencia: parseNum(row[11]),
        };
        return {
          ...base,
          status: computeStatus(base),
        };
      });

    // Parse organic data (skip header row)
    const organic: OrganicRow[] = organicRows
      .slice(1)
      .filter((row) => row[0] && row[0].trim() !== "")
      .map((row) => ({
        nome: row[0] || "",
        formato: row[1] || "",
        data: row[2] || "",
        alcance: parseNum(row[3]),
        impressoes: parseNum(row[4]),
        curtidas: parseNum(row[5]),
        comentarios: parseNum(row[6]),
        salvamentos: parseNum(row[7]),
        compartilhamentos: parseNum(row[8]),
        taxaEngajamento: parseNum(row[9]),
      }));

    return NextResponse.json(
      { paid, organic, fetchedAt: new Date().toISOString() },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
        },
      }
    );
  } catch (err) {
    console.error("Sheets API error:", err);
    return NextResponse.json(
      { error: "Erro ao buscar dados da planilha" },
      { status: 500 }
    );
  }
}
