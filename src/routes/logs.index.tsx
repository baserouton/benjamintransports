import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Download } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { useI18n } from "@/lib/i18n";
import { useStore } from "@/lib/data-store";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/logs/")({
  head: () => ({
    meta: [
      { title: "Atividades — Locadora Admin" },
      {
        name: "description",
        content:
          "Auditoria detalhada de tudo o que cada usuário faz no sistema: login, cliques, navegação e alterações.",
      },
      { property: "og:title", content: "Atividades — Locadora Admin" },
      { property: "og:description", content: "Log de auditoria por usuário." },
    ],
  }),
  component: Logs,
});

const CATEGORIES = ["auth", "navegacao", "clique", "manutencao", "locacao", "veiculo", "cliente", "preferencia"];

function Logs() {
  const { t } = useI18n();
  const s = useStore();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [usuario, setUsuario] = useState<string>("all");
  const [categoria, setCategoria] = useState<string>("all");

  const usuarios = useMemo(
    () => Array.from(new Set(s.logs.map((l) => l.usuario))),
    [s.logs]
  );

  const filtered = useMemo(() => {
    return s.logs.filter((l) => {
      if (usuario !== "all" && l.usuario !== usuario) return false;
      if (categoria !== "all" && (l.categoria ?? "") !== categoria) return false;
      if (q) {
        const hay = `${l.acao} ${l.usuario} ${l.pagina ?? ""} ${JSON.stringify(l.detalhes ?? {})}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [s.logs, q, usuario, categoria]);

  const byUser = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of s.logs) map.set(l.usuario, (map.get(l.usuario) ?? 0) + 1);
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [s.logs]);

  const exportCsv = () => {
    const rows = [
      ["quando", "usuario", "categoria", "pagina", "acao", "detalhes"],
      ...filtered.map((l) => [
        l.quando,
        l.usuario,
        l.categoria ?? "",
        l.pagina ?? "",
        l.acao.replaceAll('"', "'"),
        JSON.stringify(l.detalhes ?? {}).replaceAll('"', "'"),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `atividades-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("logs") as string}
        description={`${filtered.length} de ${s.logs.length} eventos`}
        actions={
          <Button size="sm" variant="outline" onClick={exportCsv} data-log="logs:export-csv">
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
        }
      />

      {/* Resumo por usuário */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {byUser.slice(0, 4).map(([u, n]) => (
          <Card key={u} className="rounded-2xl p-4">
            <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              {u}
            </div>
            <div className="mt-2 text-2xl font-extrabold tabular-nums">{n}</div>
            <div className="text-[11px] text-muted-foreground uppercase tracking-wide">
              eventos registrados
            </div>
          </Card>
        ))}
      </div>

      {/* Filtros */}
      <Card className="rounded-2xl p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar ação, página ou detalhe..."
              className="pl-9"
            />
          </div>
          <Select value={usuario} onValueChange={setUsuario}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Usuário" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os usuários</SelectItem>
              {usuarios.map((u) => (
                <SelectItem key={u} value={u}>
                  {u}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={categoria} onValueChange={setCategoria}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[160px]">{t("when")}</TableHead>
                <TableHead className="w-[100px]">{t("user")}</TableHead>
                <TableHead className="w-[110px]">Categoria</TableHead>
                <TableHead className="w-[140px]">Página</TableHead>
                <TableHead>{t("activity")}</TableHead>
                <TableHead>Detalhes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-10">
                    {t("noRecords")}
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((l) => (
                <TableRow
                  key={l.id}
                  className="cursor-pointer"
                  data-log={`logs:open-event:${l.id}`}
                  onClick={() => navigate({ to: "/logs/$id", params: { id: l.id } })}
                >
                  <TableCell className="text-xs font-mono">{l.quando}</TableCell>
                  <TableCell className="text-xs font-semibold">{l.usuario}</TableCell>
                  <TableCell>
                    {l.categoria ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-muted px-2 py-0.5 rounded">
                        {l.categoria}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">
                    {l.pagina ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm">{l.acao}</TableCell>
                  <TableCell className="text-[11px] font-mono text-muted-foreground max-w-[280px] truncate">
                    {l.detalhes ? JSON.stringify(l.detalhes) : ""}
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
