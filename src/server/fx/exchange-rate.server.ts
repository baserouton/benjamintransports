import { eq, isNull } from "drizzle-orm";
import type { Currency } from "@/domain/models";
import { db } from "@/server/db/client.server";
import { exchangeRateCache, financeEntries } from "@/server/db/schema";

const FX_URL = "https://open.er-api.com/v6/latest/USD";
const CACHE_ID = "usd";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const FETCH_MS = 8000;

export type CotacaoFonte = "exchangerate-api" | "cache" | "usd";

export interface UsdSnapshot {
  valorUsd: number;
  taxaUsd: number;
  cotacaoEm: Date;
  cotacaoFonte: CotacaoFonte;
}

interface FxRates {
  SRD: number;
  EUR: number;
  fetchedAt: Date;
  source: Exclude<CotacaoFonte, "usd">;
}

let memory: { rates: FxRates; until: number } | null = null;

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function applyUsdRates(valor: number, moeda: Currency, rates: FxRates): UsdSnapshot {
  if (moeda === "USD") {
    return {
      valorUsd: roundMoney(valor),
      taxaUsd: 1,
      cotacaoEm: rates.fetchedAt,
      cotacaoFonte: "usd",
    };
  }
  const taxaUsd = moeda === "EUR" ? rates.EUR : rates.SRD;
  if (!Number.isFinite(taxaUsd) || taxaUsd <= 0) {
    throw new Error("Cotação inválida para conversão em dólar");
  }
  return {
    valorUsd: roundMoney(valor / taxaUsd),
    taxaUsd,
    cotacaoEm: rates.fetchedAt,
    cotacaoFonte: rates.source,
  };
}

async function readDbCache(): Promise<FxRates | null> {
  const [row] = await db
    .select()
    .from(exchangeRateCache)
    .where(eq(exchangeRateCache.id, CACHE_ID))
    .limit(1);
  if (!row) return null;
  return {
    SRD: row.srdPerUsd,
    EUR: row.eurPerUsd,
    fetchedAt: row.fetchedAt instanceof Date ? row.fetchedAt : new Date(row.fetchedAt),
    source: "cache",
  };
}

async function writeDbCache(rates: FxRates) {
  await db
    .insert(exchangeRateCache)
    .values({
      id: CACHE_ID,
      srdPerUsd: rates.SRD,
      eurPerUsd: rates.EUR,
      fetchedAt: rates.fetchedAt,
      source: rates.source,
    })
    .onDuplicateKeyUpdate({
      set: {
        srdPerUsd: rates.SRD,
        eurPerUsd: rates.EUR,
        fetchedAt: rates.fetchedAt,
        source: rates.source,
      },
    });
}

async function fetchLiveRates(): Promise<FxRates> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_MS);
  try {
    const res = await fetch(FX_URL, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`FX HTTP ${res.status}`);
    const data = (await res.json()) as {
      result?: string;
      rates?: Record<string, number>;
    };
    const srd = data.rates?.SRD;
    const eur = data.rates?.EUR;
    if (data.result !== "success" || !srd || !eur) {
      throw new Error("Cotação incompleta");
    }
    return {
      SRD: srd,
      EUR: eur,
      fetchedAt: new Date(),
      source: "exchangerate-api",
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function getUsdRates(): Promise<FxRates> {
  const now = Date.now();
  if (memory && memory.until > now) return memory.rates;

  const cached = await readDbCache();
  if (cached && now - cached.fetchedAt.getTime() < CACHE_TTL_MS) {
    const fresh: FxRates = { ...cached, source: "cache" };
    memory = { rates: fresh, until: cached.fetchedAt.getTime() + CACHE_TTL_MS };
    return fresh;
  }

  try {
    const live = await fetchLiveRates();
    await writeDbCache(live);
    memory = { rates: live, until: now + CACHE_TTL_MS };
    return live;
  } catch (error) {
    if (cached) {
      const fallback: FxRates = { ...cached, source: "cache" };
      memory = { rates: fallback, until: now + 15 * 60 * 1000 };
      return fallback;
    }
    throw new Error(
      error instanceof Error
        ? `Não foi possível obter a cotação do dólar. ${error.message}`
        : "Não foi possível obter a cotação do dólar. Tente novamente.",
    );
  }
}

export async function snapshotUsd(valor: number, moeda: Currency): Promise<UsdSnapshot> {
  const rates = await getUsdRates();
  return applyUsdRates(valor, moeda, rates);
}

export async function backfillMissingFinanceUsd() {
  const [pending] = await db
    .select({ id: financeEntries.id })
    .from(financeEntries)
    .where(isNull(financeEntries.valorUsd))
    .limit(1);
  if (!pending) return;

  const rates = await getUsdRates();
  const missing = await db
    .select({
      id: financeEntries.id,
      valor: financeEntries.valor,
      moeda: financeEntries.moeda,
    })
    .from(financeEntries)
    .where(isNull(financeEntries.valorUsd));

  for (const row of missing) {
    const snap = applyUsdRates(row.valor, row.moeda, rates);
    await db
      .update(financeEntries)
      .set({
        valorUsd: snap.valorUsd,
        taxaUsd: snap.taxaUsd,
        cotacaoEm: snap.cotacaoEm,
        cotacaoFonte: snap.cotacaoFonte,
      })
      .where(eq(financeEntries.id, row.id));
  }
}
