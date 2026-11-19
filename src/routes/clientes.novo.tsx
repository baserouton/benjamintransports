import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { DocumentPhoto, fileToUploadDataUrl } from "@/components/document-photo";
import { useI18n } from "@/lib/i18n";
import { notifyStoreChanged } from "@/lib/data-store";
import { createClientFn, uploadVehiclePhotosFn } from "@/server/functions/store.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/clientes/novo")({
  head: () => ({
    meta: [
      { title: "Novo cliente — Locadora Admin" },
      { name: "description", content: "Cadastrar novo cliente com documentos." },
      { property: "og:title", content: "Novo cliente — Locadora Admin" },
      { property: "og:description", content: "Cadastro de cliente." },
    ],
  }),
  component: NewClient,
});

type DocFile = { file: File; preview: string };

function NewClient() {
  const { t } = useI18n();
  const nav = useNavigate();
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({
    nome: "",
    rg: "",
    cpf: "",
    endereco: "",
    whatsapp: "",
    email: "",
    suriname: false,
  });
  const [cnh, setCnh] = useState<DocFile | null>(null);
  const [passaporte, setPassaporte] = useState<DocFile | null>(null);
  const [identiteit, setIdentiteit] = useState<DocFile | null>(null);

  const setDoc = (
    current: DocFile | null,
    setter: (next: DocFile | null) => void,
    file: File | null,
  ) => {
    if (current) URL.revokeObjectURL(current.preview);
    setter(file ? { file, preview: URL.createObjectURL(file) } : null);
  };

  const uploadDoc = async (doc: DocFile | null) => {
    if (!doc) return undefined;
    const image = await fileToUploadDataUrl(doc.file);
    const uploaded = await uploadVehiclePhotosFn({ data: { images: [image] } });
    return uploaded.urls[0];
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.nome.trim()) {
      toast.error("Informe o nome do cliente.");
      return;
    }
    setSaving(true);
    try {
      const [cnhUrl, passaporteUrl, identiteitskaartUrl] = await Promise.all([
        uploadDoc(cnh),
        f.suriname ? uploadDoc(passaporte) : Promise.resolve(undefined),
        f.suriname ? uploadDoc(identiteit) : Promise.resolve(undefined),
      ]);
      await createClientFn({
        data: {
          nome: f.nome,
          rg: f.rg,
          cpf: f.cpf,
          endereco: f.endereco,
          whatsapp: f.whatsapp,
          email: f.email || undefined,
          suriname: f.suriname,
          cnhUrl,
          passaporteUrl,
          identiteitskaartUrl,
        },
      });
      notifyStoreChanged();
      toast.success(t("saved"));
      nav({ to: "/clientes" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar o cliente");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={`${t("new")} ${t("clients").slice(0, -1).toLowerCase()}`}
        actions={
          <Button variant="outline" size="sm" onClick={() => nav({ to: "/clientes" })}>
            <ArrowLeft className="h-4 w-4 mr-1" /> {t("back")}
          </Button>
        }
      />
      <Card className="max-w-3xl">
        <CardContent className="pt-6">
          <form onSubmit={(e) => void submit(e)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>{t("name")}</Label>
                <Input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>{t("rg")}</Label>
                <Input value={f.rg} onChange={(e) => setF({ ...f, rg: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("cpf")}</Label>
                <Input value={f.cpf} onChange={(e) => setF({ ...f, cpf: e.target.value })} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>{t("address")}</Label>
                <Textarea
                  rows={2}
                  value={f.endereco}
                  onChange={(e) => setF({ ...f, endereco: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("whatsapp")}</Label>
                <Input value={f.whatsapp} onChange={(e) => setF({ ...f, whatsapp: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>
                  {t("email")} <span className="text-muted-foreground">(opcional)</span>
                </Label>
                <Input
                  type="email"
                  value={f.email}
                  onChange={(e) => setF({ ...f, email: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 border-t border-border pt-4">
              <Checkbox
                id="sur"
                checked={f.suriname}
                onCheckedChange={(v) => setF({ ...f, suriname: Boolean(v) })}
              />
              <Label htmlFor="sur">{t("suriname")}</Label>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <DocumentPhoto
                label={t("cnh")}
                url={cnh?.preview}
                hint={t("addDocumentPhoto")}
                onFile={(file) => setDoc(cnh, setCnh, file)}
                onRemove={cnh ? () => setDoc(cnh, setCnh, null) : undefined}
              />
              {f.suriname && (
                <>
                  <DocumentPhoto
                    label={t("passport")}
                    url={passaporte?.preview}
                    hint={t("addDocumentPhoto")}
                    onFile={(file) => setDoc(passaporte, setPassaporte, file)}
                    onRemove={passaporte ? () => setDoc(passaporte, setPassaporte, null) : undefined}
                  />
                  <DocumentPhoto
                    label={t("identiteitskaart")}
                    url={identiteit?.preview}
                    hint={t("addDocumentPhoto")}
                    onFile={(file) => setDoc(identiteit, setIdentiteit, file)}
                    onRemove={identiteit ? () => setDoc(identiteit, setIdentiteit, null) : undefined}
                  />
                </>
              )}
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-border">
              <Button type="button" variant="outline" onClick={() => nav({ to: "/clientes" })}>
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Salvando…" : t("save")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
