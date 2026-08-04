import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Search, User, Users, Globe2, FileWarning } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { useI18n } from "@/lib/i18n";
import { useStore } from "@/lib/data-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/clientes/")({
  head: () => ({
    meta: [
      { title: "Clientes — Locadora Admin" },
      { name: "description", content: "Cadastro e gestão de clientes, incluindo do Suriname." },
      { property: "og:title", content: "Clientes — Locadora Admin" },
      { property: "og:description", content: "Gestão de clientes." },
    ],
  }),
  component: ClientsList,
});

type OriginFilter = "all" | "sr" | "br";

function ClientsList() {
  const { t, lang } = useI18n();
  const s = useStore();
  const [q, setQ] = useState("");
  const [origin, setOrigin] = useState<OriginFilter>("all");

  const stats = useMemo(() => {
    const total = s.clients.length;
    const suriname = s.clients.filter((c) => c.suriname).length;
    const br = total - suriname;
    const active = new Set(s.rentals.map((r) => r.clienteId)).size;
    const pendingDocs = s.clients.filter((c) => {
      if (!c.cnhUrl) return true;
      if (c.suriname && (!c.passaporteUrl || !c.identiteitskaartUrl)) return true;
      return false;
    }).length;
    return { total, suriname, br, active, pendingDocs };
  }, [s.clients, s.rentals]);

  const topClients = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of s.rentals) map.set(r.clienteId, (map.get(r.clienteId) ?? 0) + 1);
    return s.clients
      .map((c) => ({ c, count: map.get(c.id) ?? 0 }))
      .filter((r) => r.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [s.clients, s.rentals]);

  const maxCount = Math.max(1, ...topClients.map((r) => r.count));

  const filtered = s.clients.filter((c) => {
    if (origin === "sr" && !c.suriname) return false;
    if (origin === "br" && c.suriname) return false;
    if (q && !`${c.nome} ${c.cpf} ${c.whatsapp}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const originTabs: Array<{ id: OriginFilter; label: string; count: number }> = [
    { id: "all", label: t("all"), count: stats.total },
    { id: "sr", label: "Suriname", count: stats.suriname },
    { id: "br", label: "BR", count: stats.br },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("clients")}
        description={lang === "pt" ? "Base de clientes, origem e status documental" : "Klantenbestand, herkomst en documentatiestatus"}
        actions={
          <Button asChild size="sm">
            <Link to="/clientes/novo">
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
              {lang === "pt" ? "Base total" : "Totale basis"}
            </span>
            <Users className="h-4 w-4 text-background/60" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight tabular-nums">{stats.total}</span>
            <span className="text-sm font-medium text-background/60">{t("clients").toLowerCase()}</span>
          </div>
          <p className="mt-4 text-xs text-background/60">
            {stats.active} {lang === "pt" ? "com locação registrada" : "met verhuur geregistreerd"}
          </p>
        </Card>

        <Card className="rounded-2xl p-6">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground">
              {lang === "pt" ? "Origem" : "Herkomst"}
            </span>
            <Globe2 className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-4 flex items-baseline gap-4">
            <div>
              <div className="text-3xl font-extrabold tracking-tight tabular-nums">{stats.suriname}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">Suriname</div>
            </div>
            <div className="border-l border-border h-10" />
            <div>
              <div className="text-3xl font-extrabold tracking-tight tabular-nums">{stats.br}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">Brasil</div>
            </div>
          </div>
          <div className="mt-4 h-1.5 w-full bg-muted rounded-full overflow-hidden flex">
            <div className="h-1.5 bg-foreground" style={{ width: `${stats.total ? (stats.suriname / stats.total) * 100 : 0}%` }} />
            <div className="h-1.5 bg-muted-foreground/40" style={{ width: `${stats.total ? (stats.br / stats.total) * 100 : 0}%` }} />
          </div>
        </Card>

        <Card className="rounded-2xl p-6">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground">
              {t("pendingDocs")}
            </span>
            <FileWarning className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight tabular-nums">{stats.pendingDocs}</span>
            <span className="text-sm font-medium text-muted-foreground">
              {lang === "pt" ? "de" : "van"} {stats.total}
            </span>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            {lang === "pt" ? "CNH, passaporte ou identiteitskaart faltando" : "Rijbewijs, paspoort of ID ontbreekt"}
          </p>
        </Card>
      </div>

      {/* Top clients */}
      <Card className="rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider">
            {lang === "pt" ? "Top clientes" : "Top klanten"}{" "}
            <span className="text-muted-foreground font-normal">/ {lang === "pt" ? "por locações" : "op verhuur"}</span>
          </h2>
          <span className="text-[10px] bg-muted px-2 py-1 rounded font-bold text-muted-foreground uppercase tracking-wider">
            {topClients.length}
          </span>
        </div>
        <div className="p-6 space-y-5">
          {topClients.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">{t("noRecords")}</p>
          )}
          {topClients.map((r, i) => {
            const pct = Math.max(4, Math.round((r.count / maxCount) * 100));
            return (
              <div key={r.c.id} className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-lg bg-muted flex items-center justify-center font-bold text-muted-foreground text-sm tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1.5 gap-3">
                    <span className="text-sm font-semibold truncate">
                      {r.c.nome}{" "}
                      {r.c.suriname && <span className="text-muted-foreground text-xs">· SR</span>}
                    </span>
                    <span className="text-sm font-bold tabular-nums whitespace-nowrap">
                      {r.count} {lang === "pt" ? "loc." : "verh."}
                    </span>
                  </div>
                  <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                    <div className="h-1.5 bg-foreground rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Clients table */}
      <Card className="rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap gap-1 bg-muted p-1 rounded-lg">
            {originTabs.map((tb) => (
              <button
                key={tb.id}
                onClick={() => setOrigin(tb.id)}
                className={[
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-colors inline-flex items-center gap-2",
                  origin === tb.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                {tb.label}
                <span className={[
                  "text-[10px] px-1.5 py-0.5 rounded font-bold tabular-nums",
                  origin === tb.id ? "bg-muted text-foreground" : "bg-background/50 text-muted-foreground",
                ].join(" ")}>{tb.count}</span>
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder={t("search")}
              className="h-9 pl-8 w-64"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t("name")}</TableHead>
                <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t("cpf")}</TableHead>
                <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t("whatsapp")}</TableHead>
                <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{lang === "pt" ? "Origem" : "Herkomst"}</TableHead>
                <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{lang === "pt" ? "Docs" : "Docs"}</TableHead>
                <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-right">{t("view")}</TableHead>
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
              {filtered.map((c) => {
                const missing = !c.cnhUrl || (c.suriname && (!c.passaporteUrl || !c.identiteitskaartUrl));
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      <span className="flex items-center gap-2">
                        <span className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </span>
                        {c.nome}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{c.cpf}</TableCell>
                    <TableCell className="text-xs">{c.whatsapp}</TableCell>
                    <TableCell>
                      {c.suriname ? (
                        <Badge variant="outline">Suriname</Badge>
                      ) : (
                        <Badge variant="secondary">BR</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={[
                        "inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-1 rounded-md",
                        missing ? "bg-foreground text-background" : "bg-muted text-foreground",
                      ].join(" ")}>
                        <span className={[
                          "h-1.5 w-1.5 rounded-full",
                          missing ? "bg-background" : "bg-foreground",
                        ].join(" ")} />
                        {missing ? (lang === "pt" ? "pendente" : "openstaand") : "OK"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link to="/clientes/$id" params={{ id: c.id }}>
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
