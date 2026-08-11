import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Search, Car, ShieldAlert, ShieldCheck, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { useI18n } from "@/lib/i18n";
import { useStore, calcVehiclePayback, fmtMoney, type Category } from "@/lib/data-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/veiculos/")({
  head: () => ({
    meta: [
      { title: "Veículos — Locadora Admin" },
      { name: "description", content: "Frota completa: disponíveis, alugados e por categoria." },
      { property: "og:title", content: "Veículos — Locadora Admin" },
      { property: "og:description", content: "Gestão da frota de veículos." },
    ],
  }),
  component: VehiclesList,
});

type StatusFilter = "all" | "available" | "rented";

function VehiclesList() {
  const { t, lang } = useI18n();
  const s = useStore();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<Category | "TODOS">("TODOS");
  const [tab, setTab] = useState<StatusFilter>("all");

  const visibleVehicles = useMemo(
    () => s.vehicles.filter((v) => !v.oculto),
    [s.vehicles],
  );

  const categoryOptions = useMemo(() => {
    const fromStore = s.vehicleCategories
      .filter((c) => c.ativo)
      .map((c) => c.nome)
      .sort((a, b) => a.localeCompare(b));
    const extras = visibleVehicles
      .map((v) => v.categoria)
      .filter((nome) => nome && !fromStore.includes(nome));
    return ["TODOS" as const, ...fromStore, ...Array.from(new Set(extras))];
  }, [s.vehicleCategories, visibleVehicles]);

  const stats = useMemo(() => {
    const total = visibleVehicles.length;
    const available = visibleVehicles.filter((v) => v.disponivel).length;
    const rented = total - available;
    const now = new Date();
    const in30 = new Date();
    in30.setDate(now.getDate() + 30);
    const expired = visibleVehicles.filter((v) => v.seguroValidade && new Date(v.seguroValidade) < now).length;
    const upcoming = visibleVehicles.filter((v) => {
      if (!v.seguroValidade) return false;
      const d = new Date(v.seguroValidade);
      return d >= now && d <= in30;
    }).length;
    const occupancy = total > 0 ? Math.round((rented / total) * 100) : 0;
    return { total, available, rented, expired, upcoming, occupancy };
  }, [visibleVehicles]);

  const categoryBreakdown = useMemo(() => {
    const map = new Map<Category, { cat: Category; total: number; rented: number }>();
    for (const c of s.vehicleCategories.filter((x) => x.ativo)) {
      map.set(c.nome, { cat: c.nome, total: 0, rented: 0 });
    }
    for (const v of visibleVehicles) {
      let r = map.get(v.categoria);
      if (!r) {
        r = { cat: v.categoria, total: 0, rented: 0 };
        map.set(v.categoria, r);
      }
      r.total += 1;
      if (!v.disponivel) r.rented += 1;
    }
    return Array.from(map.values()).sort((a, b) => a.cat.localeCompare(b.cat));
  }, [s.vehicleCategories, visibleVehicles]);

  const maxCat = Math.max(1, ...categoryBreakdown.map((r) => r.total));

  const filtered = visibleVehicles.filter((v) => {
    if (cat !== "TODOS" && v.categoria !== cat) return false;
    if (tab === "available" && !v.disponivel) return false;
    if (tab === "rented" && v.disponivel) return false;
    if (q && !`${v.modelo} ${v.placa}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const tabs: Array<{ id: StatusFilter; label: string; count: number }> = [
    { id: "all", label: t("all"), count: stats.total },
    { id: "available", label: t("available"), count: stats.available },
    { id: "rented", label: t("rented"), count: stats.rented },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("vehicles")}
        description={lang === "pt" ? "Cockpit da frota, ocupação e cobertura de seguros" : "Vlootcockpit, bezetting en verzekeringsdekking"}
        actions={
          <Button asChild size="sm">
            <Link to="/veiculos/novo">
              <Plus className="h-4 w-4 mr-1" />
              {t("new")}
            </Link>
          </Button>
        }
      />

      {/* KPI cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="relative overflow-hidden rounded-2xl p-6 bg-foreground text-background border-transparent">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold tracking-widest uppercase text-background/60">
              {lang === "pt" ? "Ocupação" : "Bezetting"}
            </span>
            <TrendingUp className="h-4 w-4 text-background/60" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight tabular-nums">{stats.occupancy}%</span>
            <span className="text-sm font-medium text-background/60">{stats.rented}/{stats.total}</span>
          </div>
          <div className="mt-4 h-1.5 w-full bg-background/10 rounded-full overflow-hidden">
            <div className="h-1.5 bg-background rounded-full transition-all" style={{ width: `${stats.occupancy}%` }} />
          </div>
        </Card>

        <Card className="rounded-2xl p-6">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground">
              {t("available")}
            </span>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight tabular-nums">{stats.available}</span>
            <span className="text-sm font-medium text-muted-foreground">{lang === "pt" ? "prontos" : "gereed"}</span>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            {stats.rented} {lang === "pt" ? "em operação agora" : "nu in bedrijf"}
          </p>
        </Card>

        <Card className="rounded-2xl p-6">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground">
              {lang === "pt" ? "Seguros" : "Verzekeringen"}
            </span>
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-4 flex items-baseline gap-4">
            <div>
              <div className="text-3xl font-extrabold tracking-tight tabular-nums">{stats.expired}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">
                {lang === "pt" ? "vencidos" : "verlopen"}
              </div>
            </div>
            <div className="border-l border-border h-10" />
            <div>
              <div className="text-3xl font-extrabold tracking-tight tabular-nums">{stats.upcoming}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">
                {lang === "pt" ? "em 30 dias" : "binnen 30d"}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Category breakdown */}
      <Card className="rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider">
            {lang === "pt" ? "Frota por categoria" : "Vloot per categorie"}
          </h2>
          <span className="text-[10px] bg-muted px-2 py-1 rounded font-bold text-muted-foreground uppercase tracking-wider">
            {stats.total} {lang === "pt" ? "veículos" : "voertuigen"}
          </span>
        </div>
        <div className="p-6 grid gap-5 sm:grid-cols-2">
          {categoryBreakdown.map((r) => {
            const pct = Math.max(4, Math.round((r.total / maxCat) * 100));
            const busy = r.total > 0 ? Math.round((r.rented / r.total) * 100) : 0;
            return (
              <div key={r.cat}>
                <div className="flex justify-between items-baseline mb-1.5">
                  <span className="text-sm font-semibold">{r.cat}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {r.rented}/{r.total} · {busy}%
                  </span>
                </div>
                <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                  <div className="h-1.5 bg-foreground rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Fleet table */}
      <Card className="rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap gap-1 bg-muted p-1 rounded-lg">
            {tabs.map((t2) => (
              <button
                key={t2.id}
                onClick={() => setTab(t2.id)}
                className={[
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-colors inline-flex items-center gap-2",
                  tab === t2.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                {t2.label}
                <span className={[
                  "text-[10px] px-1.5 py-0.5 rounded font-bold tabular-nums",
                  tab === t2.id ? "bg-muted text-foreground" : "bg-background/50 text-muted-foreground",
                ].join(" ")}>{t2.count}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder={t("search")}
                className="h-9 pl-8 w-56"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <Select value={cat} onValueChange={(v) => setCat(v as Category | "TODOS")}>
              <SelectTrigger className="h-9 w-40 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c === "TODOS" ? t("all") : c}
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
                <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t("model")}</TableHead>
                <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t("plate")}</TableHead>
                <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t("category")}</TableHead>
                <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t("status")}</TableHead>
                <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{lang === "pt" ? "Seguro" : "Verzekering"}</TableHead>
                <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t("payback")}</TableHead>
                <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-right">{t("view")}</TableHead>
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
              {filtered.map((v) => {
                const now = new Date();
                const validity = v.seguroValidade ? new Date(v.seguroValidade) : null;
                const expired = validity ? validity < now : false;
                const payback = calcVehiclePayback(v, s.finance);
                return (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">
                      <span className="flex items-center gap-2">
                        <span className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                          <Car className="h-4 w-4 text-muted-foreground" />
                        </span>
                        {v.modelo}
                        {v.ano && <span className="text-muted-foreground text-xs font-normal">{v.ano}</span>}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{v.placa}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{v.categoria}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className={[
                        "inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-1 rounded-md",
                        v.disponivel ? "bg-muted text-foreground" : "bg-foreground text-background",
                      ].join(" ")}>
                        <span className={[
                          "h-1.5 w-1.5 rounded-full",
                          v.disponivel ? "bg-foreground" : "bg-background",
                        ].join(" ")} />
                        {v.disponivel ? t("available") : t("rented")}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">
                      {validity ? (
                        <span className={expired ? "text-foreground font-semibold" : "text-muted-foreground"}>
                          {v.seguroValidade}
                          {expired && <span className="ml-1 text-[10px] uppercase tracking-wider">· {lang === "pt" ? "vencido" : "verlopen"}</span>}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs min-w-[140px]">
                      {payback ? (
                        <div className="space-y-1.5">
                          <div className="flex justify-between gap-2 font-semibold tabular-nums">
                            <span>{Math.min(999, payback.pct).toFixed(0)}%</span>
                            <span className="text-muted-foreground font-normal">
                              {payback.achieved
                                ? t("paybackAchieved")
                                : fmtMoney(payback.remaining, payback.currency)}
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-1.5 bg-foreground rounded-full"
                              style={{ width: `${Math.min(100, payback.pct)}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link to="/veiculos/$id" params={{ id: v.id }}>
                          {t("details")}
                        </Link>
                      </Button>
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
