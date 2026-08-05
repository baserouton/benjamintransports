import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { useI18n } from "@/lib/i18n";
import { useStore, fmtMoney, type Currency } from "@/lib/data-store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertTriangle, Clock, Search, ArrowUpRight, ArrowDownRight } from "lucide-react";

type Period = "today" | "week" | "month";
type CurrencyFilter = Currency | "all";
type TypeFilter = "all" | "entrada" | "despesa";

export const Route = createFileRoute("/financeiro")({
  head: () => ({
    meta: [
      { title: "Financeiro — Locadora Admin" },
      { name: "description", content: "Cockpit executivo de liquidez, faturamento por veículo e seguros." },
      { property: "og:title", content: "Financeiro — Locadora Admin" },
      { property: "og:description", content: "Gestão financeira multimoeda da locadora." },
    ],
  }),
  component: Finance,
});

const CURRENCIES: Currency[] = ["SRD", "USD", "EUR"];

function symbol(m: Currency) {
  return m === "USD" ? "$" : m === "EUR" ? "€" : "SRD";
}

function Finance() {
  const { t, lang } = useI18n();
  const s = useStore();
  const [period, setPeriod] = useState<Period>("month");
  const [currency, setCurrency] = useState<CurrencyFilter>("all");
  const [type, setType] = useState<TypeFilter>("all");
  const [q, setQ] = useState("");

  const totals = useMemo(() => {
    const map: Record<Currency, { ent: number; des: number }> = {
      SRD: { ent: 0, des: 0 },
      USD: { ent: 0, des: 0 },
      EUR: { ent: 0, des: 0 },
    };
    for (const f of s.finance) {
      if (f.tipo === "entrada") map[f.moeda].ent += f.valor;
      else map[f.moeda].des += f.valor;
    }
    return map;
  }, [s.finance]);

  const topVehicles = useMemo(() => {
    const rows = s.vehicles.map((v) => {
      const entries = s.finance.filter((f) => f.veiculoId === v.id);
      const byCurr: Record<Currency, number> = { SRD: 0, USD: 0, EUR: 0 };
      for (const e of entries) {
        byCurr[e.moeda] += e.tipo === "entrada" ? e.valor : -e.valor;
      }
      const dominant = (Object.entries(byCurr).sort(
        (a, b) => Math.abs(b[1]) - Math.abs(a[1])
      )[0] ?? ["SRD", 0]) as [Currency, number];
      return { v, moeda: dominant[0], liquido: dominant[1] };
    });
    return rows
      .filter((r) => r.liquido !== 0)
      .sort((a, b) => b.liquido - a.liquido)
      .slice(0, 5);
  }, [s.vehicles, s.finance]);

  const maxNet = Math.max(1, ...topVehicles.map((r) => Math.abs(r.liquido)));

  const insurance = useMemo(() => {
    const now = new Date();
    const in30 = new Date();
    in30.setDate(now.getDate() + 30);
    const fleet = s.vehicles.filter((v) => !v.oculto);
    const expired = fleet.filter(
      (v) => v.seguroValidade && new Date(v.seguroValidade) < now
    );
    const upcoming = fleet.filter(
      (v) => {
        if (!v.seguroValidade) return false;
        const d = new Date(v.seguroValidade);
        return d >= now && d <= in30;
      }
    );
    return { expired, upcoming };
  }, [s.vehicles]);

  const filtered = useMemo(() => {
    return s.finance.filter((f) => {
      if (currency !== "all" && f.moeda !== currency) return false;
      if (type !== "all" && f.tipo !== type) return false;
      if (q) {
        const veh = s.vehicles.find((v) => v.id === f.veiculoId);
        const hay = `${f.descricao} ${veh?.placa ?? ""} ${veh?.modelo ?? ""}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [s.finance, s.vehicles, currency, type, q]);

  const health = useMemo(() => {
    const entTotal = CURRENCIES.reduce((a, m) => a + totals[m].ent, 0);
    const desTotal = CURRENCIES.reduce((a, m) => a + totals[m].des, 0);
    if (entTotal <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round(((entTotal - desTotal) / entTotal) * 100)));
  }, [totals]);

  const perLabel: Record<Period, string> = {
    today: lang === "pt" ? "Hoje" : "Vandaag",
    week: lang === "pt" ? "Semana" : "Week",
    month: lang === "pt" ? "Mês" : "Maand",
  };

  const dominantCurrency: Currency = useMemo(() => {
    return (["SRD", "USD", "EUR"] as Currency[])
      .map((m) => ({ m, v: totals[m].ent + totals[m].des }))
      .sort((a, b) => b.v - a.v)[0].m;
  }, [totals]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("finance") as string}
        description={lang === "pt" ? "Gestão de liquidez e fluxo de caixa multimoeda" : "Beheer van liquiditeit en kasstroom in meerdere valuta"}
        actions={
          <div className="inline-flex rounded-lg bg-muted p-1">
            {(["today", "week", "month"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={[
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                  period === p
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                {perLabel[p]}
              </button>
            ))}
          </div>
        }
      />

      {/* Currency balances */}
      <div className="grid gap-4 md:grid-cols-3">
        {CURRENCIES.map((m) => {
          const b = totals[m];
          const saldo = b.ent - b.des;
          const isDominant = m === dominantCurrency;
          const delta = b.ent > 0 ? ((saldo / b.ent) * 100).toFixed(1) : "0.0";
          const positive = saldo >= 0;
          return (
            <Card
              key={m}
              className={[
                "relative overflow-hidden rounded-2xl p-6 transition-colors",
                isDominant
                  ? "bg-foreground text-background border-transparent"
                  : "bg-card hover:border-muted-foreground/40",
              ].join(" ")}
            >
              <div className="flex items-start justify-between">
                <span
                  className={[
                    "text-[11px] font-bold tracking-widest uppercase",
                    isDominant ? "text-background/60" : "text-muted-foreground",
                  ].join(" ")}
                >
                  {lang === "pt" ? "Saldo" : "Saldo"} {m}
                </span>
                <span
                  className={[
                    "h-2 w-2 rounded-full",
                    isDominant ? "bg-background/60" : "bg-muted-foreground/40",
                  ].join(" ")}
                />
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold tracking-tight tabular-nums">
                  {saldo.toLocaleString(lang === "pt" ? "pt-BR" : "nl-NL", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
                <span
                  className={[
                    "text-sm font-medium",
                    isDominant ? "text-background/60" : "text-muted-foreground",
                  ].join(" ")}
                >
                  {symbol(m)}
                </span>
              </div>
              <div className="mt-4 flex items-center gap-3 text-xs">
                <span
                  className={[
                    "inline-flex items-center gap-1 rounded px-2 py-0.5 font-bold text-[10px]",
                    isDominant
                      ? "bg-background/10 text-background"
                      : positive
                      ? "bg-muted text-foreground"
                      : "bg-muted text-muted-foreground",
                  ].join(" ")}
                >
                  {positive ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {positive ? "+" : ""}
                  {delta}%
                </span>
                <span className={isDominant ? "text-background/60" : "text-muted-foreground"}>
                  {t("entries")} {fmtMoney(b.ent, m)} · {t("expenses")} {fmtMoney(b.des, m)}
                </span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Main grid: Top vehicles + Attention/Health */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider">
              {lang === "pt" ? "Top veículos" : "Top voertuigen"}{" "}
              <span className="text-muted-foreground font-normal">
                / {lang === "pt" ? "faturamento líquido" : "netto omzet"}
              </span>
            </h2>
            <span className="text-[10px] bg-muted px-2 py-1 rounded font-bold text-muted-foreground uppercase tracking-wider">
              {lang === "pt" ? "Líquido" : "Netto"}
            </span>
          </div>
          <div className="p-6 space-y-5">
            {topVehicles.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">{t("noRecords")}</p>
            )}
            {topVehicles.map((r, i) => {
              const pct = Math.max(4, Math.round((Math.abs(r.liquido) / maxNet) * 100));
              const positive = r.liquido >= 0;
              return (
                <div key={r.v.id} className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-lg bg-muted flex items-center justify-center font-bold text-muted-foreground text-sm tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1.5 gap-3">
                      <span className="text-sm font-semibold truncate">
                        {r.v.modelo}{" "}
                        <span className="text-muted-foreground font-mono text-xs">
                          ({r.v.placa})
                        </span>
                      </span>
                      <span
                        className={[
                          "text-sm font-bold tabular-nums whitespace-nowrap",
                          positive ? "text-foreground" : "text-muted-foreground",
                        ].join(" ")}
                      >
                        {positive ? "+" : "−"} {fmtMoney(Math.abs(r.liquido), r.moeda)}
                      </span>
                    </div>
                    <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                      <div
                        className={[
                          "h-1.5 rounded-full transition-all",
                          positive ? "bg-foreground" : "bg-muted-foreground/50",
                        ].join(" ")}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-2xl p-6 bg-foreground text-background border-transparent">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-background/60 mb-5">
              {lang === "pt" ? "Atenção" : "Aandacht"}{" "}
              <span className="text-background">/ {lang === "pt" ? "seguros" : "verzekeringen"}</span>
            </h2>
            <div className="space-y-3">
              <div className="flex gap-3 p-3 rounded-xl bg-background/5 border border-background/10">
                <div className="p-2 bg-background rounded-lg self-start">
                  <AlertTriangle className="w-4 h-4 text-foreground" />
                </div>
                <div>
                  <p className="text-xs font-bold">
                    {lang === "pt" ? "Seguros vencidos" : "Verlopen verzekeringen"} ({insurance.expired.length})
                  </p>
                  <p className="text-[10px] text-background/60 mt-0.5 uppercase tracking-wide">
                    {lang === "pt" ? "Ação imediata" : "Directe actie"}
                  </p>
                </div>
              </div>
              <div className="flex gap-3 p-3 rounded-xl bg-background/5 border border-background/10">
                <div className="p-2 bg-background/20 rounded-lg self-start">
                  <Clock className="w-4 h-4 text-background" />
                </div>
                <div>
                  <p className="text-xs font-bold">
                    {lang === "pt" ? "A vencer em 30 dias" : "Verloopt binnen 30 dagen"} ({insurance.upcoming.length})
                  </p>
                  <p className="text-[10px] text-background/60 mt-0.5 uppercase tracking-wide">
                    {lang === "pt" ? "Renovação sugerida" : "Vernieuwing aanbevolen"}
                  </p>
                </div>
              </div>
            </div>
            {(insurance.expired.length > 0 || insurance.upcoming.length > 0) && (
              <ul className="mt-4 space-y-1.5 text-[11px] text-background/70 max-h-24 overflow-auto pr-1">
                {[...insurance.expired, ...insurance.upcoming].slice(0, 4).map((v) => (
                  <li key={v.id} className="flex justify-between gap-2">
                    <span className="truncate">{v.modelo} · {v.placa}</span>
                    <span className="font-mono">{v.seguroValidade}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="rounded-2xl p-6">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
              {lang === "pt" ? "Saúde financeira" : "Financiële gezondheid"}
            </p>
            <div className="flex items-center gap-4">
              <div className="text-4xl font-extrabold tabular-nums">{health}%</div>
              <div className="text-[10px] text-muted-foreground uppercase leading-tight">
                {lang === "pt" ? "Margem líquida" : "Nettomarge"}<br />
                {lang === "pt" ? "sobre entradas" : "op inkomsten"}
              </div>
            </div>
            <div className="mt-4 h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-1.5 bg-foreground rounded-full transition-all"
                style={{ width: `${health}%` }}
              />
            </div>
          </Card>
        </div>
      </div>

      {/* Transactions */}
      <Card className="rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-sm font-bold uppercase tracking-wider">
            {lang === "pt" ? "Lançamentos" : "Boekingen"}{" "}
            <span className="text-muted-foreground font-normal">/ {filtered.length}</span>
          </h2>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("search")}
                className="h-9 pl-8 w-56"
              />
            </div>
            <Select value={currency} onValueChange={(v) => setCurrency(v as CurrencyFilter)}>
              <SelectTrigger className="h-9 w-36 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{lang === "pt" ? "Todas moedas" : "Alle valuta"}</SelectItem>
                {CURRENCIES.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={type} onValueChange={(v) => setType(v as TypeFilter)}>
              <SelectTrigger className="h-9 w-36 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{lang === "pt" ? "Todos tipos" : "Alle types"}</SelectItem>
                <SelectItem value="entrada">{t("entries")}</SelectItem>
                <SelectItem value="despesa">{t("expenses")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t("date")}</TableHead>
                <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{lang === "pt" ? "Descrição" : "Omschrijving"}</TableHead>
                <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{lang === "pt" ? "Veículo" : "Voertuig"}</TableHead>
                <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-right">{t("price")}</TableHead>
                <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-center">{t("status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                    {t("noRecords")}
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((f) => {
                const veh = s.vehicles.find((v) => v.id === f.veiculoId);
                const isIn = f.tipo === "entrada";
                return (
                  <TableRow key={f.id} className="hover:bg-muted/40">
                    <TableCell className="text-xs font-medium text-muted-foreground tabular-nums">{f.data}</TableCell>
                    <TableCell className="text-xs font-semibold">{f.descricao}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {veh ? `${veh.modelo} · ${veh.placa}` : "—"}
                    </TableCell>
                    <TableCell className="text-right text-xs font-bold tabular-nums">
                      {isIn ? "+ " : "− "}
                      {fmtMoney(f.valor, f.moeda)}
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={[
                          "inline-block px-2 py-0.5 text-[9px] font-bold rounded-full uppercase tracking-wider",
                          isIn
                            ? "bg-foreground text-background"
                            : "bg-muted text-muted-foreground",
                        ].join(" ")}
                      >
                        {isIn ? t("entries") : t("expenses")}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        {filtered.length > 0 && (
          <div className="p-4 border-t border-border flex justify-center">
            <Button variant="ghost" size="sm" className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground">
              {lang === "pt" ? "Ver histórico completo" : "Volledige geschiedenis"}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
