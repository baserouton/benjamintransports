import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Image as ImageIcon, AlertCircle, FileDown } from "lucide-react";
import { useStore, logAction } from "@/lib/data-store";
import { generateContractPDF, generatePendingDocPDF } from "@/lib/pdf";

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
  const pending = [
    { icon: FileText, label: t("contract"), ref: "contrato-modelo" },
    { icon: ImageIcon, label: t("logoPending"), ref: "logo" },
  ];

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
          {pending.map((i) => (
            <div key={i.label} className="flex items-center justify-between rounded-md border border-border p-3">
              <span className="flex items-center gap-2 text-sm">
                <i.icon className="h-4 w-4 text-muted-foreground" />
                {i.label}
              </span>
              <div className="flex items-center gap-2">
                <Badge variant="outline">pendente</Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    generatePendingDocPDF(i.label, i.ref, lang);
                    toast.success("PDF gerado");
                  }}
                >
                  <FileDown className="h-4 w-4 mr-1" /> PDF
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
