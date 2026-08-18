import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { useI18n } from "@/lib/i18n";
import { notifyStoreChanged, useStore } from "@/lib/data-store";
import { updateClientFn } from "@/server/functions/store.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, FileText, Pencil } from "lucide-react";

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
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    rg: "",
    cpf: "",
    endereco: "",
    whatsapp: "",
    email: "",
    suriname: false,
    cnhUrl: "",
    passaporteUrl: "",
    identiteitskaartUrl: "",
  });

  useEffect(() => {
    if (!c) return;
    setForm({
      nome: c.nome,
      rg: c.rg,
      cpf: c.cpf,
      endereco: c.endereco,
      whatsapp: c.whatsapp,
      email: c.email ?? "",
      suriname: Boolean(c.suriname),
      cnhUrl: c.cnhUrl ?? "",
      passaporteUrl: c.passaporteUrl ?? "",
      identiteitskaartUrl: c.identiteitskaartUrl ?? "",
    });
    setEditing(false);
  }, [
    c?.id,
    c?.nome,
    c?.rg,
    c?.cpf,
    c?.endereco,
    c?.whatsapp,
    c?.email,
    c?.suriname,
    c?.cnhUrl,
    c?.passaporteUrl,
    c?.identiteitskaartUrl,
    c?.updatedAt,
  ]);

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

  const saveEdit = async () => {
    if (!form.nome.trim()) {
      toast.error("Informe o nome do cliente.");
      return;
    }
    setSaving(true);
    try {
      await updateClientFn({
        data: {
          id: c.id,
          nome: form.nome.trim(),
          rg: form.rg.trim(),
          cpf: form.cpf.trim(),
          endereco: form.endereco.trim(),
          whatsapp: form.whatsapp.trim(),
          email: form.email.trim() || undefined,
          suriname: form.suriname,
          cnhUrl: form.cnhUrl.trim() || undefined,
          passaporteUrl: form.passaporteUrl.trim() || undefined,
          identiteitskaartUrl: form.identiteitskaartUrl.trim() || undefined,
        },
      });
      notifyStoreChanged();
      toast.success(t("saved"));
      setEditing(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={c.nome}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <span className="font-mono">{c.cpf || "—"}</span>
            {c.updatedAt && (
              <span className="text-muted-foreground">
                · Última alteração: {c.updatedAt}
              </span>
            )}
          </span>
        }
        actions={
          <div className="flex flex-wrap gap-2">
            {!editing && (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4 mr-1" /> {t("edit")}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => nav({ to: "/clientes" })}>
              <ArrowLeft className="h-4 w-4 mr-1" /> {t("back")}
            </Button>
          </div>
        }
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{editing ? t("edit") : t("details")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {editing ? (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>{t("name")}</Label>
                    <Input
                      value={form.nome}
                      onChange={(e) => setForm({ ...form, nome: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("rg")}</Label>
                    <Input
                      value={form.rg}
                      onChange={(e) => setForm({ ...form, rg: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("cpf")}</Label>
                    <Input
                      className="font-mono"
                      value={form.cpf}
                      onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>{t("address")}</Label>
                    <Textarea
                      rows={2}
                      value={form.endereco}
                      onChange={(e) => setForm({ ...form, endereco: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("whatsapp")}</Label>
                    <Input
                      value={form.whatsapp}
                      onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("email")}</Label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center gap-2 sm:col-span-2 pt-1">
                    <Checkbox
                      id="suriname"
                      checked={form.suriname}
                      onCheckedChange={(v) => setForm({ ...form, suriname: Boolean(v) })}
                    />
                    <Label htmlFor="suriname" className="cursor-pointer">
                      Cliente Suriname
                    </Label>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setEditing(false);
                      setForm({
                        nome: c.nome,
                        rg: c.rg,
                        cpf: c.cpf,
                        endereco: c.endereco,
                        whatsapp: c.whatsapp,
                        email: c.email ?? "",
                        suriname: Boolean(c.suriname),
                        cnhUrl: c.cnhUrl ?? "",
                        passaporteUrl: c.passaporteUrl ?? "",
                        identiteitskaartUrl: c.identiteitskaartUrl ?? "",
                      });
                    }}
                  >
                    {t("cancel")}
                  </Button>
                  <Button
                    type="button"
                    className="flex-1"
                    disabled={saving}
                    onClick={() => void saveEdit()}
                  >
                    {saving ? "Salvando..." : t("save")}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <Row k={t("name")} v={c.nome} />
                <Row k={t("rg")} v={c.rg || "—"} />
                <Row k={t("cpf")} v={<span className="font-mono">{c.cpf || "—"}</span>} />
                <Row k={t("address")} v={c.endereco || "—"} />
                <Row k={t("whatsapp")} v={c.whatsapp || "—"} />
                <Row k={t("email")} v={c.email ?? "—"} />
                <Row
                  k="Origem"
                  v={
                    c.suriname ? (
                      <Badge variant="outline">Suriname</Badge>
                    ) : (
                      <Badge variant="secondary">BR</Badge>
                    )
                  }
                />
                <Row k="Última alteração" v={c.updatedAt ?? "—"} />
              </>
            )}
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
                <li
                  key={r.id}
                  className="flex justify-between border-b border-border pb-2 last:border-0"
                >
                  <span>
                    {s.vehicles.find((v) => v.id === r.veiculoId)?.modelo} · {r.dataRetirada} →{" "}
                    {r.dataSaida}
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
        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
        {label}
      </span>
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" className="text-xs underline">
          Ver
        </a>
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      )}
    </div>
  );
}
