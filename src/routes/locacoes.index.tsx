import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Search, Calendar, AlertTriangle, TrendingUp, Clock } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { useI18n } from "@/lib/i18n";
import { useStore, fmtMoney, type RentalStatus } from "@/lib/data-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/locacoes/")({
  head: () => ({
    meta: [
      { title: "Locações — Locadora Admin" },
      { name: "description", content: "Cockpit executivo de locações — status, prazos e receita." },
      { property: "og:title", content: "Locações — Locadora Admin" },
      { property: "og:description", content: "Ciclo de vida das locações em blocos de contraste." },
    ],
  }),
  component: RentalsList,
});

function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function RentalsList() {
  const { t, lang } = useI18n();
  const s = useStore();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"all" | RentalStatus>("all");

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const enriched = useMemo(() => {
    return s.rentals.map((r) => {
      const v = s.vehicles.find((x) => x.id === r.veiculoId);
      const c = s.clients.find((x) => x.id === r.clienteId);
      const saida = new Date(r.dataSaida);
      const diasRestantes = daysBetween(today, saida);
      const atrasado = r.status === "entregue" && diasRestantes < 0;
      const proximo = r.status === "entregue" && diasRestantes >= 0 && diasRestantes <= 3;
      return { r, v, c, diasRestantes, atrasado, proximo };
    });
  }, [s.rentals, s.vehicles, s.clients, today]);

  const counts = {
    all: enriched.length,
    pendente: enriched.filter((x) => x.r.status === "pendente").length,
    entregue: enriched.filter((x) => x.r.status === "entregue").length,
    devolvido: enriched.filter((x) => x.r.status === "devolvido").length,
  };

  const ativos = enriched.filter((x) => x.r.status === "entregue");
  const atrasados = enriched.filter((x) => x.atrasado);
  const proximos = enriched.filter((x) => x.proximo);

  // Receita por moeda (locações entregues + devolvidas contam como faturamento realizado/em curso)
  const receita = enriched.reduce(
    (acc, { r }) => {
      if (r.status === "pendente") return acc;
      acc[r.moeda] = (acc[r.moeda] ?? 0) + r.valorAluguel;
      return acc;
    },
    {} as Record<string, number>,
  );
  const moedaDom = (Object.entries(receita).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "SRD") as "SRD" | "USD" | "EUR";

  const ticketMedio = enriched.length ? enriched.reduce((a, { r }) => a + r.valorAluguel, 0) / enriched.length : 0;

  const rows = enriched.filter(({ r, v, c }) => {
    const matchTab = tab === "all" || r.status === tab;
    const matchQ = `${v?.placa} ${v?.modelo} ${c?.nome}`.toLowerCase().includes(q.toLowerCase());
    return matchTab && matchQ;
  });

  const statusLabel = (st: RentalStatus) =>
    st === "pendente" ? t("pending") : st === "entregue" ? t("delivered") : t("returned");

  const nf = new Intl.DateTimeFormat(lang === "pt" ? "pt-BR" : "nl-NL", {
    day: "2-digit",
    month: "short",
  });

  return (
    <div>
      <PageHeader
        title={t("rentals")}
        description={`${s.rentals.length} ${t("rentals").toLowerCase()} • ${counts.entregue} ${t("delivered").toLowerCase()}`}
        actions={
          <Button asChild size="sm">
            <Link to="/locacoes/novo">
              <Plus className="h-4 w-4 mr-1" /> {t("new")}
            </Link>
          </Button>
        }
      />

      {/* KPI grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
        {/* Ativas — card preto dominante */}
        <Card className="p-5 bg-primary text-primary-foreground border-primary">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-widest opacity-70">
                {lang === "pt" ? "Em curso" : "Lopend"}
              </div>
              <div className="text-4xl font-semibold tracking-tight mt-2 tabular-nums">{ativos.length}</div>
              <div className="text-xs opacity-70 mt-1">
                {lang === "pt" ? "de" : "van"} {counts.all} {t("rentals").toLowerCase()}
              </div>
            </div>
            <div className="h-10 w-10 rounded-md bg-primary-foreground/10 grid place-items-center">
              <Calendar className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 h-1.5 bg-primary-foreground/15 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-foreground"
              style={{ width: `${counts.all ? (ativos.length / counts.all) * 100 : 0}%` }}
            />
          </div>
        </Card>

        {/* Pendentes de entrega */}
        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
                {t("pending")}
              </div>
              <div className="text-4xl font-semibold tracking-tight mt-2 tabular-nums">{counts.pendente}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {lang === "pt" ? "aguardando retirada" : "wachten op afhaling"}
              </div>
            </div>
            <div className="h-10 w-10 rounded-md bg-muted grid place-items-center">
              <Clock className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="rounded-sm">{counts.devolvido} {t("returned").toLowerCase()}</Badge>
          </div>
        </Card>

        {/* Alerta — atrasos e próximos vencimentos */}
        <Card
          className={`p-5 ${atrasados.length ? "border-foreground bg-foreground text-background" : ""}`}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className={`text-[11px] uppercase tracking-widest ${atrasados.length ? "opacity-70" : "text-muted-foreground"}`}>
                {lang === "pt" ? "Atenção" : "Aandacht"}
              </div>
              <div className="text-4xl font-semibold tracking-tight mt-2 tabular-nums">{atrasados.length}</div>
              <div className={`text-xs mt-1 ${atrasados.length ? "opacity-70" : "text-muted-foreground"}`}>
                {lang === "pt" ? "atrasadas" : "te laat"} • {proximos.length} {lang === "pt" ? "vencem em 3d" : "binnen 3d"}
              </div>
            </div>
            <div className={`h-10 w-10 rounded-md grid place-items-center ${atrasados.length ? "bg-background/10" : "bg-muted"}`}>
              <AlertTriangle className={`h-5 w-5 ${atrasados.length ? "" : "text-muted-foreground"}`} />
            </div>
          </div>
        </Card>

        {/* Receita realizada (moeda dominante) + ticket médio */}
        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
                {lang === "pt" ? "Receita ativa" : "Actieve omzet"}
              </div>
              <div className="text-3xl font-semibold tracking-tight mt-2 tabular-nums">
                {fmtMoney(receita[moedaDom] ?? 0, moedaDom)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {lang === "pt" ? "Ticket médio" : "Gem. ticket"}: {fmtMoney(ticketMedio, moedaDom)}
              </div>
            </div>
            <div className="h-10 w-10 rounded-md bg-muted grid place-items-center">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {(["SRD", "USD", "EUR"] as const).map((m) => (
              <Badge key={m} variant={m === moedaDom ? "default" : "outline"} className="rounded-sm font-mono text-[10px]">
                {fmtMoney(receita[m] ?? 0, m)}
              </Badge>
            ))}
          </div>
        </Card>
      </div>

      {/* Painel: próximas devoluções */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
                {lang === "pt" ? "Próximas devoluções" : "Volgende retouren"}
              </div>
              <div className="text-sm text-muted-foreground mt-0.5">
                {lang === "pt" ? "Locações em curso ordenadas por prazo" : "Lopende verhuur op vervaldatum"}
              </div>
            </div>
            <Badge variant="outline" className="rounded-sm">{ativos.length}</Badge>
          </div>
          {ativos.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">{t("noRecords")}</div>
          ) : (
            <ul className="divide-y divide-border">
              {[...ativos]
                .sort((a, b) => a.diasRestantes - b.diasRestantes)
                .slice(0, 5)
                .map(({ r, v, c, diasRestantes, atrasado }) => (
                  <li key={r.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{v?.modelo} <span className="text-muted-foreground font-mono text-xs">· {v?.placa}</span></div>
                      <div className="text-xs text-muted-foreground truncate">{c?.nome}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">{nf.format(new Date(r.dataSaida))}</div>
                      <div className={`text-xs font-medium ${atrasado ? "text-destructive" : diasRestantes <= 3 ? "text-foreground" : "text-muted-foreground"}`}>
                        {atrasado
                          ? `${Math.abs(diasRestantes)}${lang === "pt" ? "d atrasado" : "d te laat"}`
                          : diasRestantes === 0
                            ? lang === "pt" ? "hoje" : "vandaag"
                            : `${diasRestantes}${lang === "pt" ? "d restantes" : "d resterend"}`}
                      </div>
                    </div>
                    <Button asChild variant="ghost" size="sm">
                      <Link to="/locacoes/$id" params={{ id: r.id }}>{t("view")}</Link>
                    </Button>
                  </li>
                ))}
            </ul>
          )}
        </Card>

        {/* Distribuição por status */}
        <Card className="p-5">
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-4">
            {lang === "pt" ? "Distribuição" : "Verdeling"}
          </div>
          <div className="space-y-4">
            {(
              [
                { key: "entregue", label: t("delivered"), value: counts.entregue, tone: "bg-foreground" },
                { key: "pendente", label: t("pending"), value: counts.pendente, tone: "bg-muted-foreground" },
                { key: "devolvido", label: t("returned"), value: counts.devolvido, tone: "bg-silver" },
              ] as const
            ).map((row) => {
              const pct = counts.all ? (row.value / counts.all) * 100 : 0;
              return (
                <div key={row.key}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-mono tabular-nums">{row.value} · {pct.toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full ${row.tone}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Tabela com tabs */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="w-full sm:w-auto">
            <TabsList>
              <TabsTrigger value="all">{t("all")} <span className="ml-1.5 text-muted-foreground">{counts.all}</span></TabsTrigger>
              <TabsTrigger value="entregue">{t("delivered")} <span className="ml-1.5 text-muted-foreground">{counts.entregue}</span></TabsTrigger>
              <TabsTrigger value="pendente">{t("pending")} <span className="ml-1.5 text-muted-foreground">{counts.pendente}</span></TabsTrigger>
              <TabsTrigger value="devolvido">{t("returned")} <span className="ml-1.5 text-muted-foreground">{counts.devolvido}</span></TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("search")}
              className="pl-8"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        <div className="rounded-md border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("vehicles")}</TableHead>
                <TableHead>{t("clients")}</TableHead>
                <TableHead>{t("withdrawDate")}</TableHead>
                <TableHead>{t("returnDate")}</TableHead>
                <TableHead>{t("price")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead className="text-right">{t("view")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    {t("noRecords")}
                  </TableCell>
                </TableRow>
              )}
              {rows.map(({ r, v, c, diasRestantes, atrasado }) => (
                <TableRow
                  key={r.id}
                  onClick={() => nav({ to: "/locacoes/$id", params: { id: r.id } })}
                  className={`cursor-pointer hover:bg-muted/50 ${atrasado ? "bg-destructive/5" : ""}`}
                >
                  <TableCell>
                    <div className="font-medium">{v?.modelo}</div>
                    <div className="text-xs text-muted-foreground font-mono">{v?.placa}</div>
                  </TableCell>
                  <TableCell>{c?.nome}</TableCell>
                  <TableCell className="text-xs tabular-nums">{r.dataRetirada}</TableCell>
                  <TableCell>
                    <div className="text-xs tabular-nums">{r.dataSaida}</div>
                    {r.status === "entregue" && (
                      <div className={`text-[10px] ${atrasado ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                        {atrasado
                          ? `${Math.abs(diasRestantes)}${lang === "pt" ? "d atrasado" : "d te laat"}`
                          : `${diasRestantes}${lang === "pt" ? "d" : "d"}`}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs tabular-nums">{fmtMoney(r.valorAluguel, r.moeda)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={r.status === "pendente" ? "outline" : r.status === "devolvido" ? "secondary" : "default"}
                      className="rounded-sm"
                    >
                      {statusLabel(r.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="sm">
                      <Link to="/locacoes/$id" params={{ id: r.id }}>
                        {t("details")}
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
