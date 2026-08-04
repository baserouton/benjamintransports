import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { useI18n } from "@/lib/i18n";
import { useStore } from "@/lib/data-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText } from "lucide-react";

export const Route = createFileRoute("/clientes/$id")({
  head: () => ({
    meta: [
      { title: "Detalhes do cliente — Locadora Admin" },
      { name: "description", content: "Ficha completa do cliente com documentos anexados." },
      { property: "og:title", content: "Detalhes do cliente — Locadora Admin" },
      { property: "og:description", content: "Ficha completa do cliente." },
    ],
  }),
  component: ClientDetail,
});

function ClientDetail() {
  const { t } = useI18n();
  const { id } = Route.useParams();
  const nav = useNavigate();
  const s = useStore();
  const c = s.clients.find((x) => x.id === id);
  if (!c)
    return (
      <div className="p-8 text-center text-muted-foreground">
        Cliente não encontrado.
        <div className="mt-4">
          <Button asChild variant="outline">
            <Link to="/clientes">{t("back")}</Link>
          </Button>
        </div>
      </div>
    );
  const rentals = s.rentals.filter((r) => r.clienteId === c.id);

  return (
    <div>
      <PageHeader
        title={c.nome}
        description={c.cpf}
        actions={
          <Button variant="outline" size="sm" onClick={() => nav({ to: "/clientes" })}>
            <ArrowLeft className="h-4 w-4 mr-1" /> {t("back")}
          </Button>
        }
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{t("details")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row k={t("name")} v={c.nome} />
            <Row k={t("rg")} v={c.rg} />
            <Row k={t("cpf")} v={<span className="font-mono">{c.cpf}</span>} />
            <Row k={t("address")} v={c.endereco} />
            <Row k={t("whatsapp")} v={c.whatsapp} />
            <Row k={t("email")} v={c.email ?? "—"} />
            <Row k="Origem" v={c.suriname ? <Badge variant="outline">Suriname</Badge> : <Badge variant="secondary">BR</Badge>} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Documentos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Doc label={t("cnh")} url={c.cnhUrl} />
            {c.suriname && (
              <>
                <Doc label={t("passport")} url={c.passaporteUrl} />
                <Doc label={t("identiteitskaart")} url={c.identiteitskaartUrl} />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">{t("rentals")}</CardTitle>
        </CardHeader>
        <CardContent>
          {rentals.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem locações.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {rentals.map((r) => (
                <li key={r.id} className="flex justify-between border-b border-border pb-2 last:border-0">
                  <span>
                    {s.vehicles.find((v) => v.id === r.veiculoId)?.modelo} · {r.dataRetirada} → {r.dataSaida}
                  </span>
                  <Badge variant="outline">{r.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 border-b border-border last:border-0">
      <span className="text-muted-foreground text-xs uppercase tracking-wide">{k}</span>
      <span className="text-right">{v}</span>
    </div>
  );
}

function Doc({ label, url }: { label: string; url?: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border p-2">
      <span className="flex items-center gap-2 text-xs">
        <FileText className="h-4 w-4 text-muted-foreground" />
        {label}
      </span>
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" className="text-xs underline">
          abrir
        </a>
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      )}
    </div>
  );
}
