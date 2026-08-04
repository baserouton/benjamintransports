import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { useI18n } from "@/lib/i18n";
import { notifyStoreChanged } from "@/lib/data-store";
import { createClientFn } from "@/server/functions/store.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Upload } from "lucide-react";

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

function NewClient() {
  const { t } = useI18n();
  const nav = useNavigate();
  const [f, setF] = useState({
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createClientFn({
        data: {
          nome: f.nome,
          rg: f.rg,
          cpf: f.cpf,
          endereco: f.endereco,
          whatsapp: f.whatsapp,
          email: f.email || undefined,
          suriname: f.suriname,
        },
      });
      notifyStoreChanged();
      toast.success(t("saved"));
      nav({ to: "/clientes" });
    } catch {
      toast.error("Não foi possível salvar o cliente");
    }
  };

  const fileToUrl = (files: FileList | null) =>
    files && files[0] ? URL.createObjectURL(files[0]) : "";

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
          <form onSubmit={submit} className="space-y-4">
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
              <FileField
                label={t("cnh")}
                onFile={(files) => setF({ ...f, cnhUrl: fileToUrl(files) })}
                preview={f.cnhUrl}
              />
              {f.suriname && (
                <>
                  <FileField
                    label={t("passport")}
                    onFile={(files) => setF({ ...f, passaporteUrl: fileToUrl(files) })}
                    preview={f.passaporteUrl}
                  />
                  <FileField
                    label={t("identiteitskaart")}
                    onFile={(files) => setF({ ...f, identiteitskaartUrl: fileToUrl(files) })}
                    preview={f.identiteitskaartUrl}
                  />
                </>
              )}
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-border">
              <Button type="button" variant="outline" onClick={() => nav({ to: "/clientes" })}>
                {t("cancel")}
              </Button>
              <Button type="submit">{t("save")}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function FileField({
  label,
  onFile,
  preview,
}: {
  label: string;
  onFile: (files: FileList | null) => void;
  preview?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <label className="flex flex-col items-center gap-1 rounded-md border-2 border-dashed border-border p-3 cursor-pointer hover:bg-muted/40 text-xs">
        {preview ? (
          <img src={preview} alt="" className="h-16 object-contain" />
        ) : (
          <>
            <Upload className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Enviar</span>
          </>
        )}
        <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => onFile(e.target.files)} />
      </label>
    </div>
  );
}
