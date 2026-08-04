import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { useI18n } from "@/lib/i18n";
import { notifyStoreChanged, type Category } from "@/lib/data-store";
import { createVehicleFn } from "@/server/functions/store.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/veiculos/novo")({
  head: () => ({
    meta: [
      { title: "Novo veículo — Locadora Admin" },
      { name: "description", content: "Cadastrar novo veículo na frota." },
      { property: "og:title", content: "Novo veículo — Locadora Admin" },
      { property: "og:description", content: "Cadastro de veículo." },
    ],
  }),
  component: NewVehicle,
});

function NewVehicle() {
  const { t } = useI18n();
  const nav = useNavigate();
  const [modelo, setModelo] = useState("");
  const [placa, setPlaca] = useState("");
  const [categoria, setCategoria] = useState<Category>("CARROS");
  const [ano, setAno] = useState<number | "">("");
  const [fotos, setFotos] = useState<string[]>([]);

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    const urls = Array.from(files).map((f) => URL.createObjectURL(f));
    setFotos((prev) => [...prev, ...urls]);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modelo || !placa) return;
    try {
      await createVehicleFn({
        data: {
        modelo,
        placa,
        categoria,
          fotos: [],
        ano: typeof ano === "number" ? ano : undefined,
        disponivel: true,
        },
      });
      notifyStoreChanged();
      toast.success(t("saved"));
      nav({ to: "/veiculos" });
    } catch {
      toast.error("Não foi possível salvar o veículo");
    }
  };

  return (
    <div>
      <PageHeader
        title={`${t("new")} ${t("vehicles").slice(0, -1).toLowerCase()}`}
        actions={
          <Button variant="outline" size="sm" onClick={() => nav({ to: "/veiculos" })}>
            <ArrowLeft className="h-4 w-4 mr-1" /> {t("back")}
          </Button>
        }
      />
      <Card className="max-w-2xl">
        <CardContent className="pt-6">
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t("model")}</Label>
                <Input value={modelo} onChange={(e) => setModelo(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>{t("plate")}</Label>
                <Input
                  value={placa}
                  onChange={(e) => setPlaca(e.target.value.toUpperCase())}
                  required
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("category")}</Label>
                <Select value={categoria} onValueChange={(v) => setCategoria(v as Category)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VANS">VANS</SelectItem>
                    <SelectItem value="CARROS">CARROS</SelectItem>
                    <SelectItem value="PARTICULAR">PARTICULAR</SelectItem>
                    <SelectItem value="PICAPE">PICAPE PARA GARIMPO</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Ano</Label>
                <Input
                  type="number"
                  value={ano}
                  onChange={(e) => setAno(e.target.value ? Number(e.target.value) : "")}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{t("photos")}</Label>
              <label className="flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-border p-6 cursor-pointer hover:bg-muted/40">
                <Upload className="h-5 w-5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {t("attachPhotos")} · PNG, JPG
                </span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onFiles(e.target.files)}
                />
              </label>
              {fotos.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {fotos.map((f, i) => (
                    <img
                      key={i}
                      src={f}
                      alt=""
                      className="aspect-square object-cover rounded-md border border-border"
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-border">
              <Button type="button" variant="outline" onClick={() => nav({ to: "/veiculos" })}>
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
