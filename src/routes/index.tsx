import { createFileRoute, Link } from "@tanstack/react-router";
import { Car, Users, ClipboardList, Wallet, AlertCircle, TrendingUp } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useStore, fmtMoney } from "@/lib/data-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Painel — Locadora Admin" },
      { name: "description", content: "Visão geral da frota, locações e financeiro." },
      { property: "og:title", content: "Painel — Locadora Admin" },
      { property: "og:description", content: "Visão geral da frota e operação." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { t } = useI18n();
  const s = useStore();
  const totalVehicles = s.vehicles.filter((v) => !v.oculto).length;
  const activeRentals = s.rentals.filter((r) => r.status !== "devolvido").length;
  const monthEntries = s.finance
    .filter((f) => f.tipo === "entrada")
    .reduce((sum, f) => sum + f.valor, 0);
  const pendingDocs = s.clients.filter(
    (c) => !c.cnhUrl || (c.suriname && (!c.passaporteUrl || !c.identiteitskaartUrl)),
  ).length;

  const revenueByVehicle = s.vehicles.map((v) => ({
    name: v.placa,
    valor: s.finance
      .filter((f) => f.veiculoId === v.id && f.tipo === "entrada")
      .reduce((sum, f) => sum + f.valor, 0),
  }));

  const stats = [
    { label: t("totalVehicles"), value: totalVehicles, icon: Car },
    { label: t("activeRentals"), value: activeRentals, icon: ClipboardList },
    { label: t("monthlyRevenue"), value: fmtMoney(monthEntries, "SRD"), icon: TrendingUp },
    { label: t("pendingDocs"), value: pendingDocs, icon: AlertCircle },
  ];

  return (
    <div>
      <PageHeader title={t("dashboard")} description={t("overview")} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        {stats.map((s) => (
          <Card key={s.label} className="border-border">
            <CardContent className="pt-6 flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-semibold mt-1">{s.value}</p>
              </div>
              <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center">
                <s.icon className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{t("revenueByVehicle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueByVehicle}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" fontSize={11} stroke="var(--muted-foreground)" />
                  <YAxis fontSize={11} stroke="var(--muted-foreground)" />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="valor" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" /> {t("recentActivity")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {s.logs.slice(0, 5).map((l) => (
              <div key={l.id} className="text-xs border-l-2 border-border pl-3">
                <p className="text-foreground">{l.acao}</p>
                <p className="text-muted-foreground mt-0.5">
                  {l.usuario} · {l.quando}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="h-4 w-4" /> {t("quickActions")}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Link
              to="/veiculos/novo"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              + {t("vehicles")}
            </Link>
            <Link
              to="/clientes/novo"
              className="inline-flex items-center gap-2 rounded-md bg-secondary px-3 py-2 text-xs font-medium text-secondary-foreground hover:bg-accent"
            >
              + {t("clients")}
            </Link>
            <Link
              to="/locacoes/novo"
              className="inline-flex items-center gap-2 rounded-md bg-secondary px-3 py-2 text-xs font-medium text-secondary-foreground hover:bg-accent"
            >
              + {t("rentals")}
            </Link>
            <Badge variant="outline" className="ml-auto self-center">
              {s.vehicles.filter((v) => !v.oculto && v.disponivel).length} {t("available")} ·{" "}
              {s.vehicles.filter((v) => !v.oculto && !v.disponivel).length} {t("rented")}
            </Badge>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
