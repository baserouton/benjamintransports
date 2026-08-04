import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { useI18n } from "@/lib/i18n";
import { useStore, fmtMoney } from "@/lib/data-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Car, Wrench, Wallet } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/veiculos/$id")({
  head: () => ({
    meta: [
      { title: "Detalhes do veículo — Locadora Admin" },
      { name: "description", content: "Ficha completa do veículo com fotos, manutenção e histórico financeiro." },
      { property: "og:title", content: "Detalhes do veículo — Locadora Admin" },
      { property: "og:description", content: "Ficha completa do veículo." },
    ],
  }),
  component: VehicleDetail,
  notFoundComponent: () => <div className="p-8 text-center">Veículo não encontrado.</div>,
});

function VehicleDetail() {
  const { t } = useI18n();
  const { id } = Route.useParams();
  const nav = useNavigate();
  const s = useStore();
  const v = s.vehicles.find((x) => x.id === id);
  if (!v)
    return (
      <div className="p-8 text-center text-muted-foreground">
        Veículo não encontrado.
        <div className="mt-4">
          <Button asChild variant="outline">
            <Link to="/veiculos">{t("back")}</Link>
          </Button>
        </div>
      </div>
    );

  const maint = s.maintenance.filter((m) => m.veiculoId === v.id);
  const fin = s.finance.filter((f) => f.veiculoId === v.id);
  const rentals = s.rentals.filter((r) => r.veiculoId === v.id);

  return (
    <div>
      <PageHeader
        title={v.modelo}
        description={v.placa}
        actions={
          <Button variant="outline" size="sm" onClick={() => nav({ to: "/veiculos" })}>
            <ArrowLeft className="h-4 w-4 mr-1" /> {t("back")}
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3 mb-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{t("photos")}</CardTitle>
          </CardHeader>
          <CardContent>
            {v.fotos.length === 0 ? (
              <div className="flex items-center justify-center h-48 rounded-md border border-dashed border-border text-muted-foreground">
                <Car className="h-8 w-8" />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {v.fotos.map((f, i) => (
                  <img key={i} src={f} alt="" className="aspect-video object-cover rounded-md border border-border" />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("details")}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <Row k={t("model")} v={v.modelo} />
            <Row k={t("plate")} v={<span className="font-mono">{v.placa}</span>} />
            <Row k={t("category")} v={<Badge variant="outline">{v.categoria}</Badge>} />
            <Row k="Ano" v={v.ano ?? "—"} />
            <Row
              k={t("status")}
              v={v.disponivel ? <Badge variant="secondary">{t("available")}</Badge> : <Badge>{t("rented")}</Badge>}
            />
            <Row k="Seguro válido até" v={v.seguroValidade ?? "—"} />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="maint">
        <TabsList>
          <TabsTrigger value="maint">
            <Wrench className="h-3.5 w-3.5 mr-1.5" /> {t("maintenance")}
          </TabsTrigger>
          <TabsTrigger value="fin">
            <Wallet className="h-3.5 w-3.5 mr-1.5" /> {t("finance")}
          </TabsTrigger>
          <TabsTrigger value="rentals">{t("rentals")}</TabsTrigger>
        </TabsList>
        <TabsContent value="maint" className="mt-4">
          <SimpleTable
            cols={[t("date"), t("maintenanceType"), t("parts"), t("cost")]}
            rows={maint.map((m) => [m.data, m.tipo, m.pecas, fmtMoney(m.custo, m.moeda)])}
          />
        </TabsContent>
        <TabsContent value="fin" className="mt-4">
          <SimpleTable
            cols={[t("date"), "Descrição", "Tipo", t("price")]}
            rows={fin.map((f) => [
              f.data,
              f.descricao,
              <Badge key="t" variant={f.tipo === "entrada" ? "secondary" : "outline"}>
                {f.tipo}
              </Badge>,
              fmtMoney(f.valor, f.moeda),
            ])}
          />
        </TabsContent>
        <TabsContent value="rentals" className="mt-4">
          <SimpleTable
            cols={["Cliente", t("withdrawDate"), t("returnDate"), t("status")]}
            rows={rentals.map((r) => [
              s.clients.find((c) => c.id === r.clienteId)?.nome ?? "—",
              r.dataRetirada,
              r.dataSaida,
              <Badge key="s" variant="outline">
                {r.status}
              </Badge>,
            ])}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1 border-b border-border last:border-0">
      <span className="text-muted-foreground text-xs uppercase tracking-wide">{k}</span>
      <span className="text-right">{v}</span>
    </div>
  );
}

function SimpleTable({ cols, rows }: { cols: string[]; rows: React.ReactNode[][] }) {
  return (
    <Card>
      <div className="rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {cols.map((c) => (
                <TableHead key={c}>{c}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={cols.length} className="text-center text-muted-foreground py-6">
                  Sem registros.
                </TableCell>
              </TableRow>
            )}
            {rows.map((r, i) => (
              <TableRow key={i}>
                {r.map((c, j) => (
                  <TableCell key={j}>{c}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
