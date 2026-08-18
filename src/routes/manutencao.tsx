import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Search, Wrench, ShieldCheck, AlertTriangle, Clock, Droplets } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { useI18n } from "@/lib/i18n";
import {
  useStore,
  notifyStoreChanged,
  fmtMoney,
  listVehicleOilAlerts,
  DEFAULT_OIL_CHANGE_INTERVAL_KM,
  type Currency,
} from "@/lib/data-store";
import { useLogger } from "@/lib/current-user";
import {
  createMaintenanceFn,
  registerOilChangeFn,
} from "@/server/functions/store.functions";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

type Tab = "all" | "preventiva" | "corretiva" | "troca_oleo";
type CurrencyFilter = Currency | "all";

const CURRENCIES: Currency[] = ["SRD", "USD", "EUR"];

export const Route = createFileRoute("/manutencao")({
  head: () => ({
    meta: [
      { title: "Manutenção — Locadora Admin" },
      {
        name: "description",
        content: "Cockpit de manutenção da frota: custos, preventivas, corretivas e veículos em atenção.",
      },
      { property: "og:title", content: "Manutenção — Locadora Admin" },
      {
        property: "og:description",
        content: "Gestão de manutenção preventiva e corretiva por veículo.",
      },
    ],
  }),
  component: MaintenancePage,
});

function daysBetween(a: Date, b: Date) {
  return Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

function MaintenancePage() {
  const { t, lang } = useI18n();
  const s = useStore();
  const log = useLogger();
  const [open, setOpen] = useState(false);
  const [oilOpen, setOilOpen] = useState(false);
  const [oilSaving, setOilSaving] = useState(false);
  const [tab, setTab] = useState<Tab>("all");
  const [q, setQ] = useState("");
  const [currency, setCurrency] = useState<CurrencyFilter>("all");

  const [f, setF] = useState({
    veiculoId: "",
    tipo: "preventiva" as "preventiva" | "corretiva",
    pecas: "",
    custo: 0,
    moeda: "SRD" as Currency,
    data: new Date().toISOString().slice(0, 10),
    obs: "",
  });

  const [oilForm, setOilForm] = useState({
    veiculoId: "",
    kmTroca: "" as number | "",
    custo: 0,
    moeda: "SRD" as Currency,
    data: new Date().toISOString().slice(0, 10),
    obs: "",
  });

  const totalsByCurrency = useMemo(() => {
    const map: Record<Currency, number> = { SRD: 0, USD: 0, EUR: 0 };
    for (const m of s.maintenance) map[m.moeda] += m.custo;
    return map;
  }, [s.maintenance]);

  const dominantCurrency: Currency = useMemo(
    () =>
      (CURRENCIES.map((m) => ({ m, v: totalsByCurrency[m] })).sort(
        (a, b) => b.v - a.v
      )[0]?.m ?? "SRD"),
    [totalsByCurrency]
  );

  const counts = useMemo(() => {
    const preventive = s.maintenance.filter((m) => m.tipo === "preventiva").length;
    const corrective = s.maintenance.filter((m) => m.tipo === "corretiva").length;
    const oil = s.maintenance.filter((m) => m.tipo === "troca_oleo").length;
    return { preventive, corrective, oil, total: s.maintenance.length };
  }, [s.maintenance]);

  const oilDueAlerts = useMemo(
    () =>
      listVehicleOilAlerts(s.vehicles.filter((v) => !v.oculto)).filter(
        (a) => a.kind === "due_soon" || a.kind === "overdue",
      ),
    [s.vehicles],
  );

  const oilVehicle = useMemo(
    () => s.vehicles.find((v) => v.id === oilForm.veiculoId),
    [s.vehicles, oilForm.veiculoId],
  );

  const oilKmProxima = useMemo(() => {
    if (oilForm.kmTroca === "") return null;
    const intervalo = oilVehicle?.intervaloTrocaOleoKm ?? DEFAULT_OIL_CHANGE_INTERVAL_KM;
    return Number(oilForm.kmTroca) + intervalo;
  }, [oilForm.kmTroca, oilVehicle?.intervaloTrocaOleoKm]);

  const preventivePct = counts.total
    ? Math.round(((counts.preventive + counts.oil) / counts.total) * 100)
    : 0;

  const topVehicles = useMemo(() => {
    const rows = s.vehicles.map((v) => {
      const items = s.maintenance.filter((m) => m.veiculoId === v.id);
      const byCurr: Record<Currency, number> = { SRD: 0, USD: 0, EUR: 0 };
      for (const m of items) byCurr[m.moeda] += m.custo;
      const dominant = (Object.entries(byCurr).sort(
        (a, b) => b[1] - a[1]
      )[0] ?? ["SRD", 0]) as [Currency, number];
      const last = items
        .map((m) => m.data)
        .sort()
        .slice(-1)[0];
      return {
        v,
        moeda: dominant[0],
        total: dominant[1],
        count: items.length,
        last,
      };
    });
    return rows.filter((r) => r.count > 0).sort((a, b) => b.total - a.total);
  }, [s.vehicles, s.maintenance]);

  const maxCost = Math.max(1, ...topVehicles.map((r) => r.total));

  const attention = useMemo(() => {
    const now = new Date();
    // Vehicles rented AND never serviced or last service > 90 days ago
    const stale: { v: (typeof s.vehicles)[number]; days: number | null }[] = [];
    for (const v of s.vehicles) {
      const items = s.maintenance.filter((m) => m.veiculoId === v.id);
      if (items.length === 0) {
        stale.push({ v, days: null });
        continue;
      }
      const last = items.map((m) => new Date(m.data)).sort((a, b) => b.getTime() - a.getTime())[0];
      const d = daysBetween(now, last);
      if (d >= 90) stale.push({ v, days: d });
    }
    // Corrective concentration: >=2 corrective in last 90 days
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    const repeated = s.vehicles
      .map((v) => ({
        v,
        n: s.maintenance.filter(
          (m) => m.veiculoId === v.id && m.tipo === "corretiva" && new Date(m.data) >= cutoff
        ).length,
      }))
      .filter((r) => r.n >= 2);
    return { stale, repeated };
  }, [s.vehicles, s.maintenance]);

  const filtered = useMemo(() => {
    return s.maintenance
      .filter((m) => {
        if (tab !== "all" && m.tipo !== tab) return false;
        if (currency !== "all" && m.moeda !== currency) return false;
        if (q) {
          const veh = s.vehicles.find((v) => v.id === m.veiculoId);
          const hay = `${m.pecas} ${veh?.modelo ?? ""} ${veh?.placa ?? ""}`.toLowerCase();
          if (!hay.includes(q.toLowerCase())) return false;
        }
        return true;
      })
      .sort((a, b) => (a.data < b.data ? 1 : -1));
  }, [s.maintenance, s.vehicles, tab, currency, q]);

  const save = async () => {
    if (!f.veiculoId || !f.pecas) {
      log("Tentou salvar manutenção com campos obrigatórios vazios", {
        categoria: "manutencao",
        detalhes: { veiculoId: f.veiculoId, pecas: f.pecas },
      });
      return;
    }
    const veh = s.vehicles.find((v) => v.id === f.veiculoId);
    try {
      await createMaintenanceFn({
        data: {
          veiculoId: f.veiculoId,
          tipo: f.tipo,
          pecas: f.pecas,
          custo: f.custo,
          moeda: f.moeda,
          data: f.data,
          obs: f.obs || undefined,
        },
      });
      notifyStoreChanged();
      toast.success(t("saved"));
      setOpen(false);
      setF({ ...f, pecas: "", custo: 0, obs: "" });
    } catch {
      toast.error(
        `Não foi possível registrar a manutenção de ${veh?.modelo ?? "veículo"}`,
      );
    }
  };

  const openOilDialog = (veiculoId?: string) => {
    const v = veiculoId ? s.vehicles.find((x) => x.id === veiculoId) : undefined;
    setOilForm({
      veiculoId: veiculoId ?? "",
      kmTroca: v?.kmAtual ?? "",
      custo: 0,
      moeda: "SRD",
      data: new Date().toISOString().slice(0, 10),
      obs: "",
    });
    setOilOpen(true);
    log("Abriu formulário de troca de óleo", {
      categoria: "manutencao",
      detalhes: { veiculoId: veiculoId ?? null },
    });
  };

  const saveOilChange = async () => {
    if (!oilForm.veiculoId) {
      toast.error(lang === "pt" ? "Selecione o veículo." : "Selecteer het voertuig.");
      return;
    }
    if (oilForm.kmTroca === "" || Number(oilForm.kmTroca) < 0) {
      toast.error(lang === "pt" ? "Informe o km da troca." : "Voer de km van de wissel in.");
      return;
    }
    setOilSaving(true);
    try {
      await registerOilChangeFn({
        data: {
          veiculoId: oilForm.veiculoId,
          kmTroca: Number(oilForm.kmTroca),
          custo: oilForm.custo,
          moeda: oilForm.moeda,
          data: oilForm.data,
          obs: oilForm.obs || undefined,
        },
      });
      notifyStoreChanged();
      toast.success(
        lang === "pt" ? "Troca de óleo registrada." : "Olieverversing geregistreerd.",
      );
      setOilOpen(false);
      setTab("troca_oleo");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : lang === "pt"
            ? "Não foi possível registrar a troca de óleo"
            : "Olieverversing kon niet worden geregistreerd",
      );
    } finally {
      setOilSaving(false);
    }
  };

  const changeTab = (next: Tab) => {
    if (next === tab) return;
    setTab(next);
    log(`Alterou filtro de tipo para "${next}"`, {
      categoria: "manutencao",
      detalhes: { filtro: "tipo", de: tab, para: next },
    });
  };

  const changeCurrency = (next: CurrencyFilter) => {
    if (next === currency) return;
    setCurrency(next);
    log(`Alterou filtro de moeda para "${next}"`, {
      categoria: "manutencao",
      detalhes: { filtro: "moeda", de: currency, para: next },
    });
  };

  const openDialog = (v: boolean) => {
    setOpen(v);
    log(v ? "Abriu formulário de nova manutenção" : "Fechou formulário de manutenção", {
      categoria: "manutencao",
    });
  };


  const tabLabel: Record<Tab, string> = {
    all: t("all") as string,
    preventiva: t("preventive") as string,
    corretiva: t("corrective") as string,
    troca_oleo: lang === "pt" ? "Troca de óleo" : "Olieverversing",
  };
  const tabCount: Record<Tab, number> = {
    all: counts.total,
    preventiva: counts.preventive,
    corretiva: counts.corrective,
    troca_oleo: counts.oil,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("maintenance") as string}
        description={
          lang === "pt"
            ? "Controle de custos e saúde mecânica da frota"
            : "Kostenbeheer en mechanische gezondheid van de vloot"
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => openOilDialog()}>
              <Droplets className="h-4 w-4 mr-1" />
              {lang === "pt" ? "Troca de óleo" : "Olieverversing"}
            </Button>
          <Dialog open={open} onOpenChange={openDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" /> {t("new")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {t("new")} {(t("maintenance") as string).toLowerCase()}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>{lang === "pt" ? "Veículo" : "Voertuig"}</Label>
                  <Select
                    value={f.veiculoId}
                    onValueChange={(v) => setF({ ...f, veiculoId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={lang === "pt" ? "Selecionar" : "Selecteren"} />
                    </SelectTrigger>
                    <SelectContent>
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
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>{t("maintenanceType")}</Label>
                    <Select
                      value={f.tipo}
                      onValueChange={(v) =>
                        setF({ ...f, tipo: v as "preventiva" | "corretiva" })
                      }
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="preventiva">{t("preventive")}</SelectItem>
                        <SelectItem value="corretiva">{t("corrective")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("date")}</Label>
                    <Input
                      type="date"
                      value={f.data}
                      onChange={(e) => setF({ ...f, data: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>{t("parts")}</Label>
                  <Textarea
                    rows={2}
                    value={f.pecas}
                    onChange={(e) => setF({ ...f, pecas: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>{t("cost")}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={f.custo}
                      onChange={(e) => setF({ ...f, custo: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("currency")}</Label>
                    <Select
                      value={f.moeda}
                      onValueChange={(v) => setF({ ...f, moeda: v as Currency })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((m) => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
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
                <Button onClick={save}>{t("save")}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        }
      />

      <Dialog
        open={oilOpen}
        onOpenChange={(v) => {
          setOilOpen(v);
          if (!v) {
            log("Fechou formulário de troca de óleo", { categoria: "manutencao" });
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {lang === "pt" ? "Registrar troca de óleo" : "Olieverversing registreren"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>{lang === "pt" ? "Veículo" : "Voertuig"}</Label>
              <Select
                value={oilForm.veiculoId}
                onValueChange={(id) => {
                  const v = s.vehicles.find((x) => x.id === id);
                  setOilForm({
                    ...oilForm,
                    veiculoId: id,
                    kmTroca: v?.kmAtual ?? oilForm.kmTroca,
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={lang === "pt" ? "Selecionar" : "Selecteren"} />
                </SelectTrigger>
                <SelectContent>
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{lang === "pt" ? "Troca feita com (km)" : "Wissel gedaan bij (km)"}</Label>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={oilForm.kmTroca}
                  onChange={(e) =>
                    setOilForm({
                      ...oilForm,
                      kmTroca: e.target.value === "" ? "" : Number(e.target.value),
                    })
                  }
                />
                {oilVehicle?.kmAtual != null && (
                  <p className="text-[11px] text-muted-foreground">
                    {lang === "pt" ? "Km atual" : "Huidige km"}:{" "}
                    {oilVehicle.kmAtual.toLocaleString("pt-BR")}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>{lang === "pt" ? "Próxima troca com (km)" : "Volgende wissel bij (km)"}</Label>
                <Input
                  type="text"
                  readOnly
                  value={
                    oilKmProxima != null ? oilKmProxima.toLocaleString("pt-BR") : "—"
                  }
                  className="bg-muted"
                />
                <p className="text-[11px] text-muted-foreground">
                  +
                  {(
                    oilVehicle?.intervaloTrocaOleoKm ?? DEFAULT_OIL_CHANGE_INTERVAL_KM
                  ).toLocaleString("pt-BR")}{" "}
                  km
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("date")}</Label>
                <Input
                  type="date"
                  value={oilForm.data}
                  onChange={(e) => setOilForm({ ...oilForm, data: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("cost")}</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={oilForm.custo}
                  onChange={(e) => setOilForm({ ...oilForm, custo: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t("currency")}</Label>
              <Select
                value={oilForm.moeda}
                onValueChange={(v) => setOilForm({ ...oilForm, moeda: v as Currency })}
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
            </div>
            <div className="space-y-1.5">
              <Label>{lang === "pt" ? "Observação" : "Opmerking"}</Label>
              <Textarea
                rows={2}
                value={oilForm.obs}
                onChange={(e) => setOilForm({ ...oilForm, obs: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOilOpen(false)} disabled={oilSaving}>
              {t("cancel")}
            </Button>
            <Button onClick={saveOilChange} disabled={oilSaving}>
              {oilSaving
                ? lang === "pt"
                  ? "Salvando..."
                  : "Opslaan..."
                : t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        {/* Total custo (dominant) */}
        <Card className="rounded-2xl p-6 bg-foreground text-background border-transparent">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold tracking-widest uppercase text-background/60">
              {lang === "pt" ? "Custo total" : "Totale kosten"}
            </span>
            <Wrench className="h-4 w-4 text-background/60" />
          </div>
          <div className="mt-4 text-3xl font-extrabold tracking-tight tabular-nums">
            {fmtMoney(totalsByCurrency[dominantCurrency], dominantCurrency)}
          </div>
          <div className="mt-3 text-[11px] text-background/60 uppercase tracking-wide">
            {CURRENCIES.filter((m) => m !== dominantCurrency && totalsByCurrency[m] > 0)
              .map((m) => `${m} ${totalsByCurrency[m].toFixed(0)}`)
              .join(" · ") || (lang === "pt" ? "Moeda dominante" : "Dominante valuta")}
          </div>
        </Card>

        {/* Registros */}
        <Card className="rounded-2xl p-6">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground">
              {lang === "pt" ? "Registros" : "Registraties"}
            </span>
            <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
          </div>
          <div className="mt-4 text-3xl font-extrabold tabular-nums">{counts.total}</div>
          <div className="mt-3 text-[11px] uppercase tracking-wide text-muted-foreground">
            {counts.preventive} {t("preventive")} · {counts.corrective} {t("corrective")} ·{" "}
            {counts.oil} {lang === "pt" ? "óleo" : "olie"}
          </div>
        </Card>

        {/* Mix preventiva */}
        <Card className="rounded-2xl p-6">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground">
              {lang === "pt" ? "Mix preventivo" : "Preventieve mix"}
            </span>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tabular-nums">{preventivePct}%</span>
            <span className="text-xs text-muted-foreground">
              {lang === "pt" ? "do total" : "van totaal"}
            </span>
          </div>
          <div className="mt-4 h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-1.5 bg-foreground rounded-full transition-all"
              style={{ width: `${preventivePct}%` }}
            />
          </div>
        </Card>

        {/* Atenção */}
        <Card className="rounded-2xl p-6">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground">
              {lang === "pt" ? "Atenção" : "Aandacht"}
            </span>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-3xl font-extrabold tabular-nums">
              {attention.stale.length + attention.repeated.length}
            </span>
            <span className="text-xs text-muted-foreground">
              {lang === "pt" ? "veículos" : "voertuigen"}
            </span>
          </div>
          <div className="mt-3 text-[11px] uppercase tracking-wide text-muted-foreground">
            {attention.stale.length} {lang === "pt" ? "sem revisão" : "geen revisie"} ·{" "}
            {attention.repeated.length} {lang === "pt" ? "reincidentes" : "herhaald"}
          </div>
        </Card>
      </div>

      {oilDueAlerts.length > 0 && (
        <Card className="rounded-2xl overflow-hidden border-foreground/20">
          <div className="p-5 border-b border-border bg-muted/40 flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <Droplets className="h-5 w-5 mt-0.5 shrink-0" />
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider">
                  {lang === "pt"
                    ? "Troca de óleo — na hora de trocar"
                    : "Olieverversing — tijd om te wisselen"}
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {lang === "pt"
                    ? "Carros com óleo vencido ou a ≤ 300 km da troca. Registre a troca aqui para atualizar o km em Veículos."
                    : "Auto's met verlopen olie of ≤ 300 km tot de wissel."}
                </p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => openOilDialog()}>
              <Plus className="h-4 w-4 mr-1" />
              {lang === "pt" ? "Registrar troca" : "Wissel registreren"}
            </Button>
          </div>
          <div className="divide-y divide-border">
            {oilDueAlerts.map((alert) => (
              <div
                key={alert.vehicleId}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
              >
                <div className="min-w-0">
                  <div className="font-medium text-sm">
                    {alert.modelo}{" "}
                    <span className="font-mono text-xs text-muted-foreground">{alert.placa}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {alert.kind === "overdue"
                      ? lang === "pt"
                        ? "Troca de óleo vencida"
                        : "Olieverversing verlopen"
                      : lang === "pt"
                        ? `Faltam ${alert.remainingKm?.toLocaleString("pt-BR")} km`
                        : `Nog ${alert.remainingKm?.toLocaleString("nl-NL")} km`}
                    {alert.nextChangeKm != null && (
                      <>
                        {" · "}
                        {lang === "pt" ? "próxima em" : "volgende bij"}{" "}
                        {alert.nextChangeKm.toLocaleString("pt-BR")} km
                      </>
                    )}
                    {alert.kmAtual != null && (
                      <>
                        {" · "}
                        {lang === "pt" ? "atual" : "huidig"} {alert.kmAtual.toLocaleString("pt-BR")}{" "}
                        km
                      </>
                    )}
                  </div>
                </div>
                <Button size="sm" onClick={() => openOilDialog(alert.vehicleId)}>
                  {lang === "pt" ? "Registrar troca" : "Registreren"}
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Top vehicles + Attention list */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider">
              {lang === "pt" ? "Top veículos" : "Top voertuigen"}{" "}
              <span className="text-muted-foreground font-normal">
                / {lang === "pt" ? "custo de manutenção" : "onderhoudskosten"}
              </span>
            </h2>
            <span className="text-[10px] bg-muted px-2 py-1 rounded font-bold text-muted-foreground uppercase tracking-wider">
              {lang === "pt" ? "Acumulado" : "Cumulatief"}
            </span>
          </div>
          <div className="p-6 space-y-5">
            {topVehicles.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">{t("noRecords")}</p>
            )}
            {topVehicles.slice(0, 6).map((r, i) => {
              const pct = Math.max(4, Math.round((r.total / maxCost) * 100));
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
                        {fmtMoney(r.total, r.moeda)}
                      </span>
                    </div>
                    <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-1.5 bg-foreground rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="mt-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {r.count} {lang === "pt" ? "serviços" : "services"}
                      {r.last ? ` · ${lang === "pt" ? "último" : "laatste"} ${r.last}` : ""}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="rounded-2xl p-6 bg-foreground text-background border-transparent">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-background/60 mb-5">
            {lang === "pt" ? "Atenção" : "Aandacht"}{" "}
            <span className="text-background">/ {lang === "pt" ? "frota" : "vloot"}</span>
          </h2>
          <div className="space-y-3">
            <div className="flex gap-3 p-3 rounded-xl bg-background/5 border border-background/10">
              <div className="p-2 bg-background rounded-lg self-start">
                <Clock className="w-4 h-4 text-foreground" />
              </div>
              <div>
                <p className="text-xs font-bold">
                  {lang === "pt" ? "Sem revisão há 90+ dias" : "Geen revisie 90+ dagen"} (
                  {attention.stale.length})
                </p>
                <p className="text-[10px] text-background/60 mt-0.5 uppercase tracking-wide">
                  {lang === "pt" ? "Agendar preventiva" : "Preventief plannen"}
                </p>
              </div>
            </div>
            <div className="flex gap-3 p-3 rounded-xl bg-background/5 border border-background/10">
              <div className="p-2 bg-background/20 rounded-lg self-start">
                <AlertTriangle className="w-4 h-4 text-background" />
              </div>
              <div>
                <p className="text-xs font-bold">
                  {lang === "pt" ? "Corretivas repetidas (90d)" : "Herhaalde reparaties (90d)"} (
                  {attention.repeated.length})
                </p>
                <p className="text-[10px] text-background/60 mt-0.5 uppercase tracking-wide">
                  {lang === "pt" ? "Investigar causa raiz" : "Grondoorzaak onderzoeken"}
                </p>
              </div>
            </div>
          </div>
          {(attention.stale.length > 0 || attention.repeated.length > 0) && (
            <ul className="mt-4 space-y-1.5 text-[11px] text-background/70 max-h-32 overflow-auto pr-1">
              {attention.stale.slice(0, 3).map(({ v, days }) => (
                <li key={`s-${v.id}`} className="flex justify-between gap-2">
                  <span className="truncate">{v.modelo} · {v.placa}</span>
                  <span className="font-mono">
                    {days === null ? (lang === "pt" ? "nunca" : "nooit") : `${days}d`}
                  </span>
                </li>
              ))}
              {attention.repeated.slice(0, 3).map(({ v, n }) => (
                <li key={`r-${v.id}`} className="flex justify-between gap-2">
                  <span className="truncate">{v.modelo} · {v.placa}</span>
                  <span className="font-mono">{n}x</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Table */}
      <Card className="rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="inline-flex rounded-lg bg-muted p-1 self-start">
            {(["all", "preventiva", "corretiva", "troca_oleo"] as Tab[]).map((tk) => (
              <button
                key={tk}
                onClick={() => changeTab(tk)}
                className={[
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-colors inline-flex items-center gap-1.5",
                  tab === tk
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                {tabLabel[tk]}
                <span
                  className={[
                    "text-[10px] font-bold px-1.5 rounded tabular-nums",
                    tab === tk ? "bg-muted text-foreground" : "bg-background/50 text-muted-foreground",
                  ].join(" ")}
                >
                  {tabCount[tk]}
                </span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onBlur={() =>
                  q &&
                  log(`Buscou por "${q}" em manutenção`, {
                    categoria: "manutencao",
                    detalhes: { termo: q },
                  })
                }
                placeholder={t("search")}
                className="h-9 pl-8 w-56"
              />

            </div>
            <Select value={currency} onValueChange={(v) => changeCurrency(v as CurrencyFilter)}>
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
                  {lang === "pt" ? "Veículo" : "Voertuig"}
                </TableHead>
                <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  {t("maintenanceType")}
                </TableHead>
                <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  {t("parts")}
                </TableHead>
                <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  {lang === "pt" ? "Km óleo" : "Km olie"}
                </TableHead>
                <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-right">
                  {t("cost")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                    {t("noRecords")}
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((m) => {
                const veh = s.vehicles.find((v) => v.id === m.veiculoId);
                const isPrev = m.tipo === "preventiva";
                const isOil = m.tipo === "troca_oleo";
                return (
                  <TableRow key={m.id} className="hover:bg-muted/30">
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {m.data}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-semibold">{veh?.modelo ?? "—"}</div>
                      <div className="text-[11px] font-mono text-muted-foreground">
                        {veh?.placa ?? ""}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={[
                          "inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                          isOil
                            ? "bg-foreground text-background"
                            : isPrev
                              ? "bg-muted text-foreground"
                              : "bg-foreground/80 text-background",
                        ].join(" ")}
                      >
                        {isOil ? (
                          <Droplets className="h-3 w-3" />
                        ) : isPrev ? (
                          <ShieldCheck className="h-3 w-3" />
                        ) : (
                          <Wrench className="h-3 w-3" />
                        )}
                        {isOil
                          ? lang === "pt"
                            ? "Óleo"
                            : "Olie"
                          : isPrev
                            ? t("preventive")
                            : t("corrective")}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm max-w-[280px] truncate" title={m.pecas}>
                      {m.pecas}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground tabular-nums">
                      {isOil && m.kmTroca != null ? (
                        <span>
                          {m.kmTroca.toLocaleString("pt-BR")}
                          {m.kmProxima != null && (
                            <>
                              {" → "}
                              {m.kmProxima.toLocaleString("pt-BR")}
                            </>
                          )}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs tabular-nums font-semibold">
                      {fmtMoney(m.custo, m.moeda)}
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
