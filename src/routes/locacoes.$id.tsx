import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { useI18n } from "@/lib/i18n";
import { useStore, notifyStoreChanged, fmtMoney, logAction } from "@/lib/data-store";
import {
  deliverRentalFn,
  returnRentalFn,
} from "@/server/functions/store.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  CheckCircle2,
  FileDown,
  Car,
  User,
  Calendar,
  AlertTriangle,
  Clock,
  Wrench,
  ShieldCheck,
  Wallet,
  ArrowRight,
} from "lucide-react";
import { generateContractPDF } from "@/lib/pdf";

export const Route = createFileRoute("/locacoes/$id")({
  head: () => ({
    meta: [
      { title: "Detalhes da locação — Locadora Admin" },
      { name: "description", content: "Ciclo completo da locação: histórico, status, valores e próximos passos." },
      { property: "og:title", content: "Detalhes da locação — Locadora Admin" },
      { property: "og:description", content: "Detalhes da locação." },
    ],
  }),
  component: RentalDetail,
});

function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function RentalDetail() {
  const { t, lang } = useI18n();
  const { id } = Route.useParams();
  const nav = useNavigate();
  const s = useStore();
  const r = s.rentals.find((x) => x.id === id);
  const [insp, setInsp] = useState({ tanque: false, limpo: false, semAvarias: false, obs: "", taxa: 0 });

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  if (!r)
    return (
      <div className="p-8 text-center text-muted-foreground">
        {lang === "pt" ? "Locação não encontrada." : "Verhuur niet gevonden."}
        <div className="mt-4">
          <Button asChild variant="outline">
            <Link to="/locacoes">{t("back")}</Link>
          </Button>
        </div>
      </div>
    );

  const v = s.vehicles.find((x) => x.id === r.veiculoId);
  const c = s.clients.find((x) => x.id === r.clienteId);

  const saida = new Date(r.dataSaida);
  const retirada = new Date(r.dataRetirada);
  const diasRestantes = daysBetween(today, saida);
  const duracao = Math.max(1, daysBetween(retirada, saida));
  const atrasado = r.status === "entregue" && diasRestantes < 0;
  const proximo = r.status === "entregue" && diasRestantes >= 0 && diasRestantes <= 3;

  // Progresso do período (0-100)
  const totalMs = saida.getTime() - retirada.getTime();
  const passadoMs = today.getTime() - retirada.getTime();
  const progresso = Math.max(0, Math.min(100, totalMs > 0 ? (passadoMs / totalMs) * 100 : 0));

  // Histórico
  const clientLogs = s.logs.filter((l) => l.acao.includes(r.id.slice(0, 6))).slice(0, 20);
  const vehicleMaint = s.maintenance
    .filter((m) => m.veiculoId === r.veiculoId)
    .sort((a, b) => (a.data < b.data ? 1 : -1))
    .slice(0, 5);
  const otherRentals = s.rentals.filter((x) => x.veiculoId === r.veiculoId && x.id !== r.id).length;

  // Financeiro relacionado
  const relatedFinance = s.finance.filter(
    (f) => f.veiculoId === r.veiculoId && f.data >= r.dataRetirada,
  );
  const totalCliente = r.valorAluguel + (r.seguroValor ?? 0) + (r.caucaoValor ?? 0);

  const markDelivered = async () => {
    try {
      await deliverRentalFn({ data: { id: r.id } });
      notifyStoreChanged();
      toast.success(t("delivered"));
    } catch {
      toast.error("Não foi possível atualizar a locação");
    }
  };

  const closeRental = async () => {
    try {
      await returnRentalFn({ data: { id: r.id, inspection: insp } });
      notifyStoreChanged();
      toast.success(t("returned"));
    } catch {
      toast.error("Não foi possível fechar a locação");
    }
  };

  const statusLabel = r.status === "pendente" ? t("pending") : r.status === "entregue" ? t("delivered") : t("returned");

  const nextSteps: { icon: typeof CheckCircle2; text: string; tone: "primary" | "warn" | "muted"; action?: () => void; cta?: string }[] = [];
  if (r.status === "pendente") {
    nextSteps.push({
      icon: CheckCircle2,
      text: lang === "pt" ? "Realizar vistoria de retirada e entregar o veículo" : "Voer uitgifte-inspectie uit en lever het voertuig",
      tone: "primary",
      action: markDelivered,
      cta: lang === "pt" ? "Marcar como entregue" : "Markeer als geleverd",
    });
    nextSteps.push({
      icon: FileDown,
      text: lang === "pt" ? "Gerar e assinar o contrato de locação" : "Genereer en onderteken het huurcontract",
      tone: "muted",
    });
  }
  if (r.status === "entregue") {
    if (atrasado) {
      nextSteps.push({
        icon: AlertTriangle,
        text: lang === "pt"
          ? `Contatar cliente — devolução atrasada em ${Math.abs(diasRestantes)}d`
          : `Contact klant — retour ${Math.abs(diasRestantes)}d te laat`,
        tone: "warn",
      });
    } else if (proximo) {
      nextSteps.push({
        icon: Clock,
        text: lang === "pt"
          ? `Preparar devolução em ${diasRestantes}d`
          : `Retour voorbereiden over ${diasRestantes}d`,
        tone: "primary",
      });
    }
    nextSteps.push({
      icon: ShieldCheck,
      text: lang === "pt" ? "Fazer vistoria de devolução ao receber o veículo" : "Voer retour-inspectie uit bij ontvangst",
      tone: "muted",
    });
    if (r.caucaoValor) {
      nextSteps.push({
        icon: Wallet,
        text: lang === "pt"
          ? `Avaliar liberação da caução (${fmtMoney(r.caucaoValor, r.moeda)})`
          : `Beoordeel vrijgave borg (${fmtMoney(r.caucaoValor, r.moeda)})`,
        tone: "muted",
      });
    }
  }
  if (r.status === "devolvido") {
    nextSteps.push({
      icon: CheckCircle2,
      text: lang === "pt" ? "Locação encerrada — nenhum próximo passo pendente" : "Verhuur afgesloten — geen openstaande stappen",
      tone: "muted",
    });
  }

  return (
    <div>
      <PageHeader
        title={`${v?.modelo ?? "—"}`}
        description={`${v?.placa ?? "—"} · ${c?.nome ?? "—"} · #${r.id.slice(0, 6)}`}
        actions={
          <Button variant="outline" size="sm" onClick={() => nav({ to: "/locacoes" })}>
            <ArrowLeft className="h-4 w-4 mr-1" /> {t("back")}
          </Button>
        }
      />

      {/* Status hero + progresso */}
      <Card
        className={`p-5 mb-4 ${
          atrasado
            ? "bg-foreground text-background border-foreground"
            : r.status === "entregue"
              ? "bg-primary text-primary-foreground border-primary"
              : ""
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className={`text-[11px] uppercase tracking-widest ${atrasado || r.status === "entregue" ? "opacity-70" : "text-muted-foreground"}`}>
              {t("status")}
            </div>
            <div className="text-3xl font-semibold tracking-tight mt-1">{statusLabel}</div>
            <div className={`text-xs mt-1 ${atrasado || r.status === "entregue" ? "opacity-70" : "text-muted-foreground"}`}>
              {r.status === "pendente" && (lang === "pt" ? "Aguardando retirada do veículo" : "Wachten op afhaling")}
              {r.status === "entregue" && (atrasado
                ? lang === "pt" ? `Devolução atrasada em ${Math.abs(diasRestantes)} dias` : `Retour ${Math.abs(diasRestantes)}d te laat`
                : diasRestantes === 0
                  ? lang === "pt" ? "Devolução hoje" : "Retour vandaag"
                  : lang === "pt" ? `${diasRestantes} dias restantes` : `${diasRestantes}d resterend`)}
              {r.status === "devolvido" && (lang === "pt" ? "Ciclo concluído" : "Cyclus voltooid")}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 md:gap-8">
            <Metric label={lang === "pt" ? "Retirada" : "Ophalen"} value={r.dataRetirada} muted={atrasado || r.status === "entregue"} />
            <Metric label={lang === "pt" ? "Devolução" : "Retour"} value={r.dataSaida} muted={atrasado || r.status === "entregue"} />
            <Metric label={lang === "pt" ? "Duração" : "Duur"} value={`${duracao}d`} muted={atrasado || r.status === "entregue"} />
          </div>
        </div>

        {/* Barra de progresso do período */}
        {r.status !== "pendente" && (
          <div className="mt-5">
            <div className={`h-1.5 rounded-full overflow-hidden ${atrasado || r.status === "entregue" ? "bg-background/15" : "bg-muted"}`}>
              <div
                className={`h-full ${atrasado ? "bg-destructive" : "bg-background"}`}
                style={{ width: `${progresso}%` }}
              />
            </div>
            <div className={`mt-2 flex justify-between text-[10px] uppercase tracking-wider ${atrasado || r.status === "entregue" ? "opacity-60" : "text-muted-foreground"}`}>
              <span>{r.dataRetirada}</span>
              <span>{progresso.toFixed(0)}%</span>
              <span>{r.dataSaida}</span>
            </div>
          </div>
        )}
      </Card>

      {/* Grid principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
        {/* Valores */}
        <Card className="p-5 lg:col-span-2">
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-4">
            {lang === "pt" ? "Valores" : "Bedragen"}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ValueBlock label={t("price")} value={fmtMoney(r.valorAluguel, r.moeda)} highlight />
            <ValueBlock
              label={t("insurance")}
              value={r.seguroValor ? fmtMoney(r.seguroValor, r.moeda) : "—"}
            />
            <ValueBlock
              label={t("deposit")}
              value={r.caucaoValor ? fmtMoney(r.caucaoValor, r.moeda) : "—"}
              sub={r.caucaoStatus === "devolvido" ? (lang === "pt" ? "devolvida" : "vrijgegeven") : r.caucaoValor ? (lang === "pt" ? "retida" : "aangehouden") : undefined}
            />
            <ValueBlock
              label={lang === "pt" ? "Total cliente" : "Totaal klant"}
              value={fmtMoney(totalCliente, r.moeda)}
              sub={lang === "pt" ? `${duracao} dias · ${r.moeda}` : `${duracao}d · ${r.moeda}`}
            />
          </div>

          {relatedFinance.length > 0 && (
            <div className="mt-6">
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2">
                {lang === "pt" ? "Movimentos financeiros" : "Financiële mutaties"}
              </div>
              <ul className="divide-y divide-border rounded-md border border-border">
                {relatedFinance.slice(0, 6).map((f) => (
                  <li key={f.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <div className="truncate">{f.descricao}</div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{f.data}</div>
                    </div>
                    <span className={`font-mono tabular-nums text-sm ${f.tipo === "entrada" ? "text-foreground" : "text-muted-foreground"}`}>
                      {f.tipo === "entrada" ? "+" : "−"} {fmtMoney(f.valor, f.moeda)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        {/* Próximos passos */}
        <Card className="p-5">
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-4">
            {lang === "pt" ? "Próximos passos" : "Volgende stappen"}
          </div>
          <ul className="space-y-3">
            {nextSteps.map((step, i) => {
              const Icon = step.icon;
              return (
                <li key={i} className="flex gap-3">
                  <div
                    className={`h-8 w-8 rounded-md grid place-items-center shrink-0 ${
                      step.tone === "warn"
                        ? "bg-foreground text-background"
                        : step.tone === "primary"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm">{step.text}</div>
                    {step.action && step.cta && (
                      <Button size="sm" className="mt-2" onClick={step.action}>
                        {step.cta} <ArrowRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="mt-5 pt-4 border-t border-border space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => {
                generateContractPDF(r, v, c, lang);
                logAction("admin1", `Gerou contrato PDF ${r.id.slice(0, 6)}`);
                toast.success("PDF");
              }}
            >
              <FileDown className="h-4 w-4 mr-2" /> {t("contract")} (PDF)
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start" asChild>
              <Link to="/veiculos/$id" params={{ id: r.veiculoId }}>
                <Car className="h-4 w-4 mr-2" /> {lang === "pt" ? "Ver veículo" : "Voertuig"}
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start" asChild>
              <Link to="/clientes/$id" params={{ id: r.clienteId }}>
                <User className="h-4 w-4 mr-2" /> {lang === "pt" ? "Ver cliente" : "Klant"}
              </Link>
            </Button>
          </div>
        </Card>
      </div>

      {/* Histórico + partes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
        <Card className="p-5 lg:col-span-2">
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-4">
            {lang === "pt" ? "Histórico" : "Geschiedenis"}
          </div>
          <ol className="relative border-l border-border ml-2">
            <TimelineItem
              icon={Calendar}
              title={lang === "pt" ? "Locação criada" : "Verhuur aangemaakt"}
              date={r.dataRetirada}
              detail={`${v?.modelo} · ${c?.nome}`}
            />
            {r.vistoriaRetirada && (
              <TimelineItem
                icon={ShieldCheck}
                title={t("inspectionOut")}
                date={r.dataRetirada}
                detail={[
                  r.vistoriaRetirada.tanque && t("checklistTank"),
                  r.vistoriaRetirada.limpo && t("checklistClean"),
                  r.vistoriaRetirada.semAvarias && t("checklistDamage"),
                ].filter(Boolean).join(" · ")}
              />
            )}
            {r.status !== "pendente" && (
              <TimelineItem icon={CheckCircle2} title={t("delivered")} date={r.dataRetirada} tone="primary" />
            )}
            {clientLogs.map((l) => (
              <TimelineItem key={l.id} icon={Clock} title={l.acao} date={l.quando} muted />
            ))}
            {r.vistoriaDevolucao && (
              <TimelineItem
                icon={ShieldCheck}
                title={t("inspectionIn")}
                date={r.dataSaida}
                detail={r.vistoriaDevolucao.obs || (lang === "pt" ? "Sem observações" : "Geen opmerkingen")}
              />
            )}
            {r.status === "devolvido" && (
              <TimelineItem icon={CheckCircle2} title={t("returned")} date={r.dataSaida} tone="primary" />
            )}
          </ol>

          {vehicleMaint.length > 0 && (
            <div className="mt-6">
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2">
                {lang === "pt" ? "Manutenções recentes do veículo" : "Recent onderhoud voertuig"}
              </div>
              <ul className="divide-y divide-border rounded-md border border-border">
                {vehicleMaint.map((m) => (
                  <li key={m.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                    <Wrench className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="truncate">{m.pecas}</div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {m.data} · {m.tipo === "preventiva" ? t("preventive") : t("corrective")}
                      </div>
                    </div>
                    <span className="font-mono tabular-nums text-xs">{fmtMoney(m.custo, m.moeda)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        {/* Partes */}
        <Card className="p-5">
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-4">
            {lang === "pt" ? "Partes" : "Partijen"}
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="h-7 w-7 rounded-md bg-muted grid place-items-center">
                  <Car className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{t("vehicles")}</div>
              </div>
              <div className="text-sm font-medium">{v?.modelo}</div>
              <div className="text-xs text-muted-foreground font-mono">{v?.placa}</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge variant="outline" className="rounded-sm text-[10px]">{v?.categoria}</Badge>
                {v?.ano && <Badge variant="outline" className="rounded-sm text-[10px]">{v.ano}</Badge>}
                <Badge variant="outline" className="rounded-sm text-[10px]">
                  {otherRentals} {lang === "pt" ? "outras locações" : "andere huren"}
                </Badge>
              </div>
            </div>
            <div className="border-t border-border pt-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-7 w-7 rounded-md bg-muted grid place-items-center">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{t("clients")}</div>
              </div>
              <div className="text-sm font-medium">{c?.nome}</div>
              <div className="text-xs text-muted-foreground">{c?.whatsapp}</div>
              {c?.email && <div className="text-xs text-muted-foreground truncate">{c.email}</div>}
              {c?.suriname && (
                <Badge variant="outline" className="rounded-sm text-[10px] mt-2">
                  {t("suriname")}
                </Badge>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Vistoria de devolução */}
      {r.status !== "devolvido" && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{t("inspectionIn")}</div>
              <div className="text-sm text-muted-foreground mt-0.5">
                {lang === "pt"
                  ? "Complete a checklist para fechar o ciclo da locação"
                  : "Vul de checklist in om de cyclus af te sluiten"}
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <ChecklistItem label={t("checklistTank")} checked={insp.tanque} onChange={(v) => setInsp({ ...insp, tanque: v })} />
              <ChecklistItem label={t("checklistClean")} checked={insp.limpo} onChange={(v) => setInsp({ ...insp, limpo: v })} />
              <ChecklistItem label={t("checklistDamage")} checked={insp.semAvarias} onChange={(v) => setInsp({ ...insp, semAvarias: v })} />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>{t("nonComplianceFee")}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={insp.taxa}
                  onChange={(e) => setInsp({ ...insp, taxa: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>{t("observation")}</Label>
                <Textarea rows={2} value={insp.obs} onChange={(e) => setInsp({ ...insp, obs: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={closeRental}>
                {lang === "pt" ? "Fechar locação" : "Verhuur afsluiten"}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function Metric({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div>
      <div className={`text-[10px] uppercase tracking-widest ${muted ? "opacity-60" : "text-muted-foreground"}`}>{label}</div>
      <div className="text-sm font-medium tabular-nums mt-1">{value}</div>
    </div>
  );
}

function ValueBlock({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-md p-3 border ${highlight ? "bg-primary text-primary-foreground border-primary" : "bg-muted/40 border-border"}`}>
      <div className={`text-[10px] uppercase tracking-widest ${highlight ? "opacity-70" : "text-muted-foreground"}`}>{label}</div>
      <div className="text-lg font-semibold tracking-tight mt-1 tabular-nums">{value}</div>
      {sub && <div className={`text-[10px] mt-1 ${highlight ? "opacity-70" : "text-muted-foreground"}`}>{sub}</div>}
    </div>
  );
}

function ChecklistItem({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label
      className={`flex items-center gap-2 text-sm border rounded-md px-3 py-2 cursor-pointer transition ${
        checked ? "border-foreground bg-foreground/5" : "border-border"
      }`}
    >
      <Checkbox checked={checked} onCheckedChange={(v) => onChange(Boolean(v))} />
      {label}
    </label>
  );
}

function TimelineItem({
  icon: Icon,
  title,
  date,
  detail,
  tone,
  muted,
}: {
  icon: typeof Calendar;
  title: string;
  date: string;
  detail?: string;
  tone?: "primary";
  muted?: boolean;
}) {
  return (
    <li className="mb-4 ml-4 last:mb-0">
      <span
        className={`absolute -left-[9px] flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-background ${
          tone === "primary" ? "bg-primary" : muted ? "bg-muted-foreground/40" : "bg-foreground"
        }`}
      >
        <Icon className="h-2.5 w-2.5 text-background" />
      </span>
      <div className="text-sm">{title}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{date}</div>
      {detail && <div className="text-xs text-muted-foreground mt-1">{detail}</div>}
    </li>
  );
}
