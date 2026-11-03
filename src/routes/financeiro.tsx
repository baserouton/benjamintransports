import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { useI18n } from "@/lib/i18n";
import {
  useStore,
  notifyStoreChanged,
  amountUsd,
  canViewFinance,
  fmtMoney,
  calcVehiclePayback,
  FINANCE_CATEGORIES,
  FINANCE_CATEGORY_LABELS,
  type Currency,
  type FinanceCategory,
} from "@/lib/data-store";
import {
  createFinanceEntryFn,
  deleteFinanceEntryFn,
  getCurrentUserFn,
} from "@/server/functions/store.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  Clock,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Trash2,
  Car,
} from "lucide-react";

const OPERATIONAL_CATEGORIES = FINANCE_CATEGORIES.filter((c) => c !== "aquisicao");

type Period = "today" | "week" | "month" | "all";
type CurrencyFilter = Currency | "all";
type TypeFilter = "all" | "entrada" | "despesa";
type CategoryFilter = FinanceCategory | "all";

export const Route = createFileRoute("/financeiro")({
  beforeLoad: async () => {
    const user = await getCurrentUserFn();
    if (!canViewFinance(user?.login)) {
      throw redirect({ to: "/" });
    }
  },
  head: () => ({
    meta: [
      { title: "Financeiro — Locadora Admin" },
      {
        name: "description",
        content: "Financeiro da empresa: lucro, despesas, entradas e lançamentos.",
      },
      { property: "og:title", content: "Financeiro — Locadora Admin" },
      { property: "og:description", content: "Gestão financeira em dólar da locadora." },
    ],
  }),
  component: Finance,
});

const CURRENCIES: Currency[] = ["SRD", "USD", "EUR"];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function inPeriod(dateStr: string, period: Period) {
  if (period === "all") return true;
  const d = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  const today = todayIso();
  if (period === "today") return dateStr === today;
  if (period === "week") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 6);
    return d >= start;
  }
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function Finance() {
  const { t, lang } = useI18n();
  const s = useStore();
  const [period, setPeriod] = useState<Period>("month");
  const [currency, setCurrency] = useState<CurrencyFilter>("all");
  const [type, setType] = useState<TypeFilter>("all");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [fleetDetailsOpen, setFleetDetailsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    data: todayIso(),
    descricao: "",
    valor: "" as number | "",
    moeda: "USD" as Currency,
    tipo: "despesa" as "entrada" | "despesa",
    categoria: "operacional" as FinanceCategory,
    veiculoId: "",
  });

  const periodEntries = useMemo(
    () => s.finance.filter((f) => inPeriod(f.data, period)),
    [s.finance, period],
  );

  /** Operacional: exclui aquisição de veículos dos cards/lucro. */
  const operationalEntries = useMemo(
    () => periodEntries.filter((f) => f.categoria !== "aquisicao"),
    [periodEntries],
  );

  const fleetPayback = useMemo(() => {
    return s.vehicles
      .filter((v) => !v.oculto && v.custoAquisicao != null && v.custoAquisicao > 0)
      .map((v) => {
        const payback = calcVehiclePayback(v, s.finance);
        return payback ? { v, payback } : null;
      })
      .filter((row): row is NonNullable<typeof row> => row != null)
      .sort((a, b) => b.payback.remaining - a.payback.remaining);
  }, [s.vehicles, s.finance]);

  const fleetSummary = useMemo(() => {
    const summary = { cost: 0, rented: 0, remaining: 0, count: 0 };
    for (const row of fleetPayback) {
      summary.cost += row.payback.cost;
      summary.rented += row.payback.rented;
      summary.remaining += row.payback.remaining;
      summary.count += 1;
    }
    return summary;
  }, [fleetPayback]);

  const totals = useMemo(() => {
    let ent = 0;
    let des = 0;
    for (const f of operationalEntries) {
      if (currency !== "all" && f.moeda !== currency) continue;
      if (f.tipo === "entrada") ent += amountUsd(f);
      else des += amountUsd(f);
    }
    return { ent, des, lucro: ent - des };
  }, [operationalEntries, currency]);

  const categoryBreakdown = useMemo(() => {
    const map = new Map<FinanceCategory, { ent: number; des: number }>();
    for (const cat of OPERATIONAL_CATEGORIES) map.set(cat, { ent: 0, des: 0 });
    for (const f of operationalEntries) {
      if (currency !== "all" && f.moeda !== currency) continue;
      const row = map.get(f.categoria) ?? { ent: 0, des: 0 };
      if (f.tipo === "entrada") row.ent += amountUsd(f);
      else row.des += amountUsd(f);
      map.set(f.categoria, row);
    }
    return OPERATIONAL_CATEGORIES.map((cat) => ({
      cat,
      ...map.get(cat)!,
      liquido: (map.get(cat)?.ent ?? 0) - (map.get(cat)?.des ?? 0),
    })).filter((r) => r.ent > 0 || r.des > 0);
  }, [operationalEntries, currency]);

  const topVehicles = useMemo(() => {
    const rows = s.vehicles.map((v) => {
      let liquido = 0;
      for (const e of operationalEntries) {
        if (e.veiculoId !== v.id) continue;
        if (currency !== "all" && e.moeda !== currency) continue;
        liquido += e.tipo === "entrada" ? amountUsd(e) : -amountUsd(e);
      }
      return { v, moeda: "USD" as Currency, liquido };
    });
    return rows
      .filter((r) => r.liquido !== 0)
      .sort((a, b) => b.liquido - a.liquido)
      .slice(0, 5);
  }, [s.vehicles, operationalEntries, currency]);

  const maxNet = Math.max(1, ...topVehicles.map((r) => Math.abs(r.liquido)));

  const insurance = useMemo(() => {
    const now = new Date();
    const in30 = new Date();
    in30.setDate(now.getDate() + 30);
    const fleet = s.vehicles.filter((v) => !v.oculto);
    const expired = fleet.filter(
      (v) => v.seguroValidade && new Date(v.seguroValidade) < now,
    );
    const upcoming = fleet.filter((v) => {
      if (!v.seguroValidade) return false;
      const d = new Date(v.seguroValidade);
      return d >= now && d <= in30;
    });
    return { expired, upcoming };
  }, [s.vehicles]);

  const filtered = useMemo(() => {
    return operationalEntries
      .filter((f) => {
        if (currency !== "all" && f.moeda !== currency) return false;
        if (type !== "all" && f.tipo !== type) return false;
        if (category !== "all" && f.categoria !== category) return false;
        if (q) {
          const veh = s.vehicles.find((v) => v.id === f.veiculoId);
          const hay =
            `${f.descricao} ${FINANCE_CATEGORY_LABELS[f.categoria]} ${veh?.placa ?? ""} ${veh?.modelo ?? ""}`.toLowerCase();
          if (!hay.includes(q.toLowerCase())) return false;
        }
        return true;
      })
      .sort((a, b) => b.data.localeCompare(a.data));
  }, [operationalEntries, s.vehicles, currency, type, category, q]);

  const health = useMemo(() => {
    if (totals.ent <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round((totals.lucro / totals.ent) * 100)));
  }, [totals]);

  const perLabel: Record<Period, string> = {
    today: lang === "pt" ? "Hoje" : "Vandaag",
    week: lang === "pt" ? "Semana" : "Week",
    month: lang === "pt" ? "Mês" : "Maand",
    all: lang === "pt" ? "Tudo" : "Alles",
  };

  const resetForm = () => {
    setForm({
      data: todayIso(),
      descricao: "",
      valor: "",
      moeda: "USD",
      tipo: "despesa",
      categoria: "operacional",
      veiculoId: "",
    });
  };

  const saveEntry = async () => {
    if (!form.descricao.trim()) {
      toast.error("Informe a descrição.");
      return;
    }
    if (form.valor === "" || Number(form.valor) <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }
    setSaving(true);
    try {
      const saved = await createFinanceEntryFn({
        data: {
          data: form.data,
          descricao: form.descricao.trim(),
          valor: Number(form.valor),
          moeda: form.moeda,
          tipo: form.tipo,
          categoria: form.categoria,
          veiculoId: form.veiculoId || undefined,
        },
      });
      notifyStoreChanged();
      const valorUsd = saved && typeof saved.valorUsd === "number" ? saved.valorUsd : null;
      const taxaUsd = saved && typeof saved.taxaUsd === "number" ? saved.taxaUsd : null;
      toast.success(
        form.moeda !== "USD" && valorUsd != null && taxaUsd != null
          ? `Lançamento salvo em ${fmtMoney(valorUsd, "USD")} (1 USD = ${taxaUsd.toLocaleString("pt-BR", { maximumFractionDigits: 4 })} ${form.moeda}).`
          : "Lançamento salvo.",
      );
      setOpen(false);
      resetForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar");
    } finally {
      setSaving(false);
    }
  };

  const removeEntry = async (id: string) => {
    try {
      await deleteFinanceEntryFn({ data: { id } });
      notifyStoreChanged();
      toast.success("Lançamento excluído.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível excluir");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("finance") as string}
        description={
          lang === "pt"
            ? "Financeiro em dólar. SRD e EUR são convertidos na hora do lançamento e a cotação fica gravada."
            : "Financiën in dollar. SRD en EUR worden bij boeking omgerekend; de koers wordt bewaard."
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg bg-muted p-1">
              {(["today", "week", "month", "all"] as Period[]).map((p) => (
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
            <Dialog
              open={open}
              onOpenChange={(v) => {
                setOpen(v);
                if (!v) resetForm();
              }}
            >
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  {lang === "pt" ? "Novo lançamento" : "Nieuwe boeking"}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {lang === "pt" ? "Novo lançamento" : "Nieuwe boeking"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>{t("date")}</Label>
                      <Input
                        type="date"
                        value={form.data}
                        onChange={(e) => setForm({ ...form, data: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t("status")}</Label>
                      <Select
                        value={form.tipo}
                        onValueChange={(v) =>
                          setForm({ ...form, tipo: v as "entrada" | "despesa" })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="entrada">{t("entries")}</SelectItem>
                          <SelectItem value="despesa">{t("expenses")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>{lang === "pt" ? "Descrição" : "Omschrijving"}</Label>
                    <Input
                      value={form.descricao}
                      onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                      placeholder={lang === "pt" ? "Ex.: Combustível frota" : "Bijv. Brandstof"}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>{t("price")}</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={form.valor}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            valor: e.target.value === "" ? "" : Number(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t("currency")}</Label>
                      <Select
                        value={form.moeda}
                        onValueChange={(v) => setForm({ ...form, moeda: v as Currency })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CURRENCIES.map((m) => (
                            <SelectItem key={m} value={m}>
                              {m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-[11px] text-muted-foreground">
                        {lang === "pt"
                          ? "SRD e EUR viram USD na hora, com a cotação gravada."
                          : "SRD en EUR worden meteen naar USD omgerekend; de koers wordt bewaard."}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>{t("category")}</Label>
                      <Select
                        value={form.categoria}
                        onValueChange={(v) =>
                          setForm({ ...form, categoria: v as FinanceCategory })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {OPERATIONAL_CATEGORIES.map((c) => (
                            <SelectItem key={c} value={c}>
                              {FINANCE_CATEGORY_LABELS[c]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>{lang === "pt" ? "Veículo (opcional)" : "Voertuig (optioneel)"}</Label>
                      <Select
                        value={form.veiculoId || "none"}
                        onValueChange={(v) =>
                          setForm({ ...form, veiculoId: v === "none" ? "" : v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">—</SelectItem>
                          {s.vehicles
                            .filter((v) => !v.oculto)
                            .map((v) => (
                              <SelectItem key={v.id} value={v.id}>
                                {v.modelo} — {v.placa}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    {t("cancel")}
                  </Button>
                  <Button onClick={() => void saveEntry()} disabled={saving}>
                    {saving ? "Salvando…" : t("save")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        {(
          [
            {
              key: "lucro",
              label: lang === "pt" ? "Lucro (USD)" : "Winst (USD)",
              value: totals.lucro,
              highlight: true,
            },
            {
              key: "ent",
              label: lang === "pt" ? "Entradas (USD)" : "Inkomsten (USD)",
              value: totals.ent,
              highlight: false,
            },
            {
              key: "des",
              label: lang === "pt" ? "Despesas (USD)" : "Uitgaven (USD)",
              value: totals.des,
              highlight: false,
            },
          ] as const
        ).map((card) => {
          const positive = card.value >= 0;
          const delta = totals.ent > 0 ? ((totals.lucro / totals.ent) * 100).toFixed(1) : "0.0";
          return (
            <Card
              key={card.key}
              className={[
                "relative overflow-hidden rounded-2xl p-6 transition-colors",
                card.highlight
                  ? "bg-foreground text-background border-transparent"
                  : "bg-card hover:border-muted-foreground/40",
              ].join(" ")}
            >
              <div className="flex items-start justify-between">
                <span
                  className={[
                    "text-[11px] font-bold tracking-widest uppercase",
                    card.highlight ? "text-background/60" : "text-muted-foreground",
                  ].join(" ")}
                >
                  {card.label}
                </span>
                <span
                  className={[
                    "h-2 w-2 rounded-full",
                    card.highlight ? "bg-background/60" : "bg-muted-foreground/40",
                  ].join(" ")}
                />
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold tracking-tight tabular-nums">
                  {card.value.toLocaleString(lang === "pt" ? "pt-BR" : "nl-NL", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
                <span
                  className={[
                    "text-sm font-medium",
                    card.highlight ? "text-background/60" : "text-muted-foreground",
                  ].join(" ")}
                >
                  $
                </span>
              </div>
              {card.key === "lucro" && (
                <div className="mt-4 flex items-center gap-3 text-xs">
                  <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 font-bold text-[10px] bg-background/10 text-background">
                    {positive ? (
                      <ArrowUpRight className="h-3 w-3" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3" />
                    )}
                    {positive ? "+" : ""}
                    {delta}%
                  </span>
                  <span className="text-background/60">
                    {t("entries")} {fmtMoney(totals.ent, "USD")} · {t("expenses")}{" "}
                    {fmtMoney(totals.des, "USD")}
                  </span>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Card exclusivo: aquisição / payback da frota (fora do lucro operacional) */}
      <Card className="rounded-2xl overflow-hidden">
        <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-muted grid place-items-center shrink-0">
              <Car className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider">
                {lang === "pt" ? "Frota — aquisição dos carros" : "Vloot — aankoop voertuigen"}
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                {lang === "pt"
                  ? "Não entra no lucro operacional acima. Aqui acompanham custo, faturamento e saldo de cada veículo."
                  : "Telt niet mee in de operationele winst hierboven. Hier zie je kost, omzet en saldo per voertuig."}
              </p>
            </div>
          </div>
          <Dialog open={fleetDetailsOpen} onOpenChange={setFleetDetailsOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                {lang === "pt" ? "Detalhes" : "Details"}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {lang === "pt"
                    ? "Detalhes da frota — aquisição × faturamento"
                    : "Vlootdetails — aankoop × omzet"}
                </DialogTitle>
              </DialogHeader>
              {fleetPayback.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">{t("noRecords")}</p>
              ) : (
                <div className="space-y-3">
                  {fleetPayback.map(({ v, payback }) => {
                    const saldo = payback.remaining;
                    const positivo = saldo <= 0;
                    return (
                      <div
                        key={v.id}
                        className="rounded-xl border border-border p-4 space-y-3"
                      >
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <div>
                            <div className="font-semibold text-sm">{v.modelo}</div>
                            <div className="font-mono text-xs text-muted-foreground">{v.placa}</div>
                          </div>
                          <span
                            className={[
                              "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded",
                              positivo
                                ? "bg-foreground text-background"
                                : "bg-muted text-muted-foreground",
                            ].join(" ")}
                          >
                            {positivo
                              ? lang === "pt"
                                ? "Positivo / recuperado"
                                : "Positief / terugverdiend"
                              : lang === "pt"
                                ? "Ainda a recuperar"
                                : "Nog terug te verdienen"}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-xs">
                          <div>
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                              {lang === "pt" ? "Aquisição" : "Aankoop"}
                            </div>
                            <div className="font-bold tabular-nums mt-1">
                              {fmtMoney(payback.cost, payback.currency)}
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                              {lang === "pt" ? "Já faturou" : "Al omgezet"}
                            </div>
                            <div className="font-bold tabular-nums mt-1">
                              {fmtMoney(payback.rented, payback.currency)}
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                              {lang === "pt" ? "Saldo" : "Saldo"}
                            </div>
                            <div
                              className={[
                                "font-bold tabular-nums mt-1",
                                positivo ? "text-foreground" : "text-muted-foreground",
                              ].join(" ")}
                            >
                              {saldo > 0 ? "− " : saldo < 0 ? "+ " : ""}
                              {fmtMoney(Math.abs(saldo), payback.currency)}
                              <span className="block text-[10px] font-normal text-muted-foreground mt-0.5">
                                {saldo > 0
                                  ? lang === "pt"
                                    ? "falta recuperar"
                                    : "nog te verdienen"
                                  : saldo < 0
                                    ? lang === "pt"
                                      ? "lucro acima do custo"
                                      : "winst boven kost"
                                    : lang === "pt"
                                      ? "empatado"
                                      : "break-even"}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-1.5 bg-foreground rounded-full"
                            style={{ width: `${Math.min(100, Math.max(0, payback.pct))}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setFleetDetailsOpen(false)}>
                  {lang === "pt" ? "Fechar" : "Sluiten"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <div className="p-6 grid gap-4 sm:grid-cols-3">
          {fleetSummary.count > 0 && (
            <div className="rounded-xl bg-muted/40 p-4 sm:col-span-3">
              <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                USD · {fleetSummary.count} {lang === "pt" ? "carros" : "auto's"}
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-3 text-xs">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">
                    {lang === "pt" ? "Aquisição" : "Aankoop"}
                  </span>
                  <span className="font-semibold tabular-nums">
                    {fmtMoney(fleetSummary.cost, "USD")}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">
                    {lang === "pt" ? "Faturado" : "Omzet"}
                  </span>
                  <span className="font-semibold tabular-nums">
                    {fmtMoney(fleetSummary.rented, "USD")}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">
                    {lang === "pt" ? "Saldo" : "Saldo"}
                  </span>
                  <span className="font-bold tabular-nums">
                    {fleetSummary.remaining > 0 ? "− " : fleetSummary.remaining < 0 ? "+ " : ""}
                    {fmtMoney(Math.abs(fleetSummary.remaining), "USD")}
                  </span>
                </div>
              </div>
            </div>
          )}
          {fleetPayback.length === 0 && (
            <p className="text-sm text-muted-foreground sm:col-span-3 text-center py-4">
              {lang === "pt"
                ? "Nenhum veículo com custo de aquisição cadastrado."
                : "Geen voertuigen met aankoopkosten."}
            </p>
          )}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider">
              {lang === "pt" ? "Por categoria" : "Per categorie"}{" "}
              <span className="text-muted-foreground font-normal">
                / {perLabel[period]}
              </span>
            </h2>
          </div>
          <div className="p-6 space-y-4">
            {categoryBreakdown.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">{t("noRecords")}</p>
            )}
            {categoryBreakdown.map((r) => (
              <div key={r.cat} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-semibold">{FINANCE_CATEGORY_LABELS[r.cat]}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  +{fmtMoney(r.ent, "USD")}
                  {" · "}
                  −{fmtMoney(r.des, "USD")}
                  {" · "}
                  <span className="font-semibold text-foreground">
                    {r.liquido >= 0 ? "+" : "−"}
                    {fmtMoney(Math.abs(r.liquido), "USD")}
                  </span>
                </span>
              </div>
            ))}
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
                    {lang === "pt" ? "Seguros vencidos" : "Verlopen verzekeringen"} (
                    {insurance.expired.length})
                  </p>
                </div>
              </div>
              <div className="flex gap-3 p-3 rounded-xl bg-background/5 border border-background/10">
                <div className="p-2 bg-background/20 rounded-lg self-start">
                  <Clock className="w-4 h-4 text-background" />
                </div>
                <div>
                  <p className="text-xs font-bold">
                    {lang === "pt" ? "A vencer em 30 dias" : "Verloopt binnen 30 dagen"} (
                    {insurance.upcoming.length})
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="rounded-2xl p-6">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
              {lang === "pt" ? "Margem no período" : "Marge in periode"}
            </p>
            <div className="flex items-center gap-4">
              <div className="text-4xl font-extrabold tabular-nums">{health}%</div>
              <div className="text-[10px] text-muted-foreground uppercase leading-tight">
                {lang === "pt" ? "Lucro sobre entradas" : "Winst op inkomsten"}
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

      {topVehicles.length > 0 && (
        <Card className="rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-border">
            <h2 className="text-sm font-bold uppercase tracking-wider">
              {lang === "pt" ? "Top veículos" : "Top voertuigen"}{" "}
              <span className="text-muted-foreground font-normal">
                / {lang === "pt" ? "líquido no período" : "netto in periode"}
              </span>
            </h2>
          </div>
          <div className="p-6 space-y-5">
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
                      <span className="text-sm font-bold tabular-nums whitespace-nowrap">
                        {positive ? "+" : "−"} {fmtMoney(Math.abs(r.liquido), r.moeda)}
                      </span>
                    </div>
                    <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-1.5 rounded-full bg-foreground transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

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
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
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
            <Select value={category} onValueChange={(v) => setCategory(v as CategoryFilter)}>
              <SelectTrigger className="h-9 w-44 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {lang === "pt" ? "Todas categorias" : "Alle categorieën"}
                </SelectItem>
                {OPERATIONAL_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {FINANCE_CATEGORY_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  {t("date")}
                </TableHead>
                <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  {lang === "pt" ? "Descrição" : "Omschrijving"}
                </TableHead>
                <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  {t("category")}
                </TableHead>
                <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  {lang === "pt" ? "Veículo" : "Voertuig"}
                </TableHead>
                <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-right">
                  {t("price")}
                </TableHead>
                <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-center">
                  {t("status")}
                </TableHead>
                <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-right">
                  {" "}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                    {t("noRecords")}
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((f) => {
                const veh = s.vehicles.find((v) => v.id === f.veiculoId);
                const isIn = f.tipo === "entrada";
                return (
                  <TableRow key={f.id} className="hover:bg-muted/40">
                    <TableCell className="text-xs font-medium text-muted-foreground tabular-nums">
                      {f.data}
                    </TableCell>
                    <TableCell className="text-xs font-semibold">
                      {f.descricao}
                      {f.manual && (
                        <span className="ml-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                          manual
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {FINANCE_CATEGORY_LABELS[f.categoria]}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {veh ? `${veh.modelo} · ${veh.placa}` : "—"}
                    </TableCell>
                    <TableCell className="text-right text-xs font-bold tabular-nums">
                      <div>
                        {isIn ? "+ " : "− "}
                        {fmtMoney(amountUsd(f), "USD")}
                      </div>
                      {f.moeda !== "USD" && (
                        <div className="text-[10px] font-normal text-muted-foreground">
                          {fmtMoney(f.valor, f.moeda)}
                          {f.taxaUsd > 0
                            ? ` · 1 USD = ${f.taxaUsd.toLocaleString(lang === "pt" ? "pt-BR" : "nl-NL", { maximumFractionDigits: 4 })} ${f.moeda}`
                            : ""}
                        </div>
                      )}
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
                    <TableCell className="text-right">
                      {f.manual ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => void removeEntry(f.id)}
                          aria-label="Excluir"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
