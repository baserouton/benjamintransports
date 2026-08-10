import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, AlertCircle, FileDown } from "lucide-react";
import { useStore, logAction } from "@/lib/data-store";
import { generateContractPDF } from "@/lib/pdf";

export const Route = createFileRoute("/documentos")({
  head: () => ({
    meta: [
      { title: "Documentos — Locadora Admin" },
      { name: "description", content: "Documentos pendentes, contratos e mídias do sistema." },
      { property: "og:title", content: "Documentos — Locadora Admin" },
      { property: "og:description", content: "Contratos em PDF e documentos pendentes." },
    ],
  }),
  component: Docs,
});

function Docs() {
  const { t, lang } = useI18n();
  const s = useStore();
  const pendingClients = s.clients.filter(
    (c) => !c.cnhUrl || (c.suriname && (!c.passaporteUrl || !c.identiteitskaartUrl)),
  );

  return (
    <div className="space-y-4">
      <PageHeader title={t("documents")} description={t("pendingDocs")} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" /> {t("contract")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {s.rentals.length === 0 && (
            <p className="text-sm text-muted-foreground">{t("noRecords")}</p>
          )}
          {s.rentals.map((r) => {
            const v = s.vehicles.find((x) => x.id === r.veiculoId);
            const c = s.clients.find((x) => x.id === r.clienteId);
            return (
              <div key={r.id} className="flex items-center justify-between rounded-md border border-border p-3">
                <div className="text-sm">
                  <div className="font-medium">{v?.modelo} · {v?.placa}</div>
                  <div className="text-xs text-muted-foreground">{c?.nome} · {r.dataRetirada} → {r.dataSaida}</div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    generateContractPDF(r, v, c, lang);
                    logAction("admin1", `Gerou contrato PDF ${r.id.slice(0, 6)}`);
                    toast.success("PDF gerado");
                  }}
                >
                  <FileDown className="h-4 w-4 mr-1" /> PDF
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> {t("pendingDocs")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {pendingClients.length === 0 && (
            <p className="text-sm text-muted-foreground">{t("noRecords")}</p>
          )}
          {pendingClients.map((c) => {
            const missing = [
              !c.cnhUrl ? t("cnh") : null,
              c.suriname && !c.passaporteUrl ? t("passport") : null,
              c.suriname && !c.identiteitskaartUrl ? t("identiteitskaart") : null,
            ].filter(Boolean);
            return (
              <div key={c.id} className="flex items-center justify-between rounded-md border border-border p-3">
                <div className="text-sm">
                  <div className="font-medium">{c.nome}</div>
                  <div className="text-xs text-muted-foreground">
                    {lang === "pt" ? "Falta" : "Ontbreekt"}: {missing.join(", ")}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">pendente</Badge>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/clientes/$id" params={{ id: c.id }}>
                      {t("details")}
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
