import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { ArrowLeft, ArrowRight, Copy, Download } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { useStore, type ActivityLog } from "@/lib/data-store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/logs/$id")({
  head: () => ({
    meta: [
      { title: "Detalhe do evento — Locadora Admin" },
      {
        name: "description",
        content:
          "Auditoria completa de um evento: usuário, página, categoria, payload capturado e comparação antes/depois.",
      },
      { property: "og:title", content: "Detalhe do evento — Locadora Admin" },
      {
        property: "og:description",
        content: "Dados capturados de uma ação registrada no painel.",
      },
    ],
  }),
  component: LogDetail,
});

type Diff = { campo: string; antes: unknown; depois: unknown };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function fmt(v: unknown) {
  if (v === undefined) return "—";
  if (v === null) return "null";
  if (typeof v === "string") return v.length ? v : '""';
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function buildDiff(detalhes?: Record<string, unknown>): Diff[] {
  if (!detalhes) return [];
  const antes = detalhes.antes ?? detalhes.before ?? detalhes.de;
  const depois = detalhes.depois ?? detalhes.after ?? detalhes.para;
  if (!isRecord(antes) && !isRecord(depois)) {
    if (antes === undefined && depois === undefined) return [];
    return [{ campo: "valor", antes, depois }];
  }
  const a = isRecord(antes) ? antes : {};
  const b = isRecord(depois) ? depois : {};
  const keys = Array.from(new Set([...Object.keys(a), ...Object.keys(b)]));
  return keys.map((k) => ({ campo: k, antes: a[k], depois: b[k] }));
}

function flatten(detalhes: Record<string, unknown>, skip: string[]) {
  return Object.entries(detalhes).filter(([k]) => !skip.includes(k));
}

function LogDetail() {
  const { id } = Route.useParams();
  const s = useStore();
  const navigate = useNavigate();

  const index = s.logs.findIndex((l) => l.id === id);
  const log: ActivityLog | undefined = index >= 0 ? s.logs[index] : undefined;
  const newer = index > 0 ? s.logs[index - 1] : undefined;
  const older = index >= 0 && index < s.logs.length - 1 ? s.logs[index + 1] : undefined;

  const diff = useMemo(() => buildDiff(log?.detalhes), [log]);
  const rest = useMemo(
    () =>
      log?.detalhes
        ? flatten(log.detalhes, ["antes", "depois", "before", "after", "de", "para"])
        : [],
    [log]
  );

  if (!log) {
    return (
      <div className="space-y-6">
        <PageHeader title="Evento não encontrado" description={`ID ${id}`} />
        <Card className="rounded-2xl p-8 text-sm text-muted-foreground">
          Este evento não existe mais no histórico local.{" "}
          <Link to="/logs" className="underline font-semibold">
            Voltar para atividades
          </Link>
        </Card>
      </div>
    );
  }

  const copyJson = async () => {
    await navigator.clipboard.writeText(JSON.stringify(log, null, 2));
    toast.success("JSON do evento copiado");
  };

  const exportJson = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(log, null, 2)], { type: "application/json" })
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `evento-${log.id.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Detalhe do evento"
        description={`${log.quando} · ${log.usuario}`}
        actions={
          <>
            <Button size="sm" variant="outline" onClick={() => navigate({ to: "/logs" })} data-log="logs:detail-back">
              <ArrowLeft className="h-4 w-4 mr-1" /> Atividades
            </Button>
            <Button size="sm" variant="outline" onClick={copyJson} data-log="logs:detail-copy-json">
              <Copy className="h-4 w-4 mr-1" /> JSON
            </Button>
            <Button size="sm" variant="outline" onClick={exportJson} data-log="logs:detail-export-json">
              <Download className="h-4 w-4 mr-1" /> Exportar
            </Button>
          </>
        }
      />

      {/* Hero de contraste */}
      <Card className="rounded-2xl overflow-hidden border-0">
        <div className="bg-foreground text-background p-6">
          <div className="text-[11px] font-bold uppercase tracking-widest opacity-60">
            {log.categoria ?? "evento"}
          </div>
          <h2 className="mt-2 text-xl font-extrabold leading-snug">{log.acao}</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-4">
            {[
              ["Usuário", log.usuario],
              ["Quando", log.quando],
              ["Página", log.pagina ?? "—"],
              ["ID", log.id.slice(0, 8)],
            ].map(([k, v]) => (
              <div key={k}>
                <div className="text-[10px] font-bold uppercase tracking-widest opacity-50">{k}</div>
                <div className="text-sm font-mono mt-1 break-all">{v}</div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Antes / depois */}
      <Card className="rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Antes / Depois
          </div>
        </div>
        {diff.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">
            Esta ação não gerou alteração comparável de valores (evento de navegação, clique ou
            criação).
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Campo</TableHead>
                  <TableHead>Antes</TableHead>
                  <TableHead>Depois</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {diff.map((d) => {
                  const changed = fmt(d.antes) !== fmt(d.depois);
                  return (
                    <TableRow key={d.campo}>
                      <TableCell className="text-xs font-semibold">{d.campo}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground line-through decoration-muted-foreground/40">
                        {fmt(d.antes)}
                      </TableCell>
                      <TableCell
                        className={`text-xs font-mono ${changed ? "font-bold text-foreground" : "text-muted-foreground"}`}
                      >
                        {fmt(d.depois)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Dados capturados */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Dados capturados
            </div>
          </div>
          {rest.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">Sem metadados adicionais.</div>
          ) : (
            <div className="divide-y divide-border">
              {rest.map(([k, v]) => (
                <div key={k} className="flex gap-4 px-5 py-3">
                  <div className="w-32 shrink-0 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    {k}
                  </div>
                  <div className="text-xs font-mono break-all">{fmt(v)}</div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Payload bruto
            </div>
          </div>
          <pre className="p-5 text-[11px] font-mono leading-relaxed overflow-x-auto text-muted-foreground">
            {JSON.stringify(log, null, 2)}
          </pre>
        </Card>
      </div>

      {/* Navegação entre eventos */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="outline"
          size="sm"
          disabled={!newer}
          onClick={() => newer && navigate({ to: "/logs/$id", params: { id: newer.id } })}
          data-log="logs:detail-newer"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Evento mais recente
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!older}
          onClick={() => older && navigate({ to: "/logs/$id", params: { id: older.id } })}
          data-log="logs:detail-older"
        >
          Evento anterior <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
