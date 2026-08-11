import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { VehicleCategoryField } from "@/components/vehicle-category-field";
import { useI18n } from "@/lib/i18n";
import { notifyStoreChanged, useStore, type Category, type Currency } from "@/lib/data-store";
import { createVehicleFn, uploadVehiclePhotosFn } from "@/server/functions/store.functions";
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
import { Upload, ArrowLeft, X } from "lucide-react";

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

type PhotoItem = { file: File; preview: string };

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Falha ao ler a imagem"));
    reader.readAsDataURL(file);
  });
}

function NewVehicle() {
  const { t } = useI18n();
  const nav = useNavigate();
  const s = useStore();
  const [modelo, setModelo] = useState("");
  const [placa, setPlaca] = useState("");
  const [categoria, setCategoria] = useState<Category>("");
  const [ano, setAno] = useState<number | "">("");
  const [custoAquisicao, setCustoAquisicao] = useState<number | "">("");
  const [moedaAquisicao, setMoedaAquisicao] = useState<Currency>("SRD");
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (categoria) return;
    const first = s.vehicleCategories.find((c) => c.ativo)?.nome;
    if (first) setCategoria(first);
  }, [categoria, s.vehicleCategories]);

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    const next = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, Math.max(0, 10 - photos.length))
      .map((file) => ({ file, preview: URL.createObjectURL(file) }));
    if (next.length === 0) {
      toast.error("Selecione imagens PNG, JPG ou WEBP (máx. 10).");
      return;
    }
    setPhotos((prev) => [...prev, ...next].slice(0, 10));
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => {
      const copy = [...prev];
      const [removed] = copy.splice(index, 1);
      if (removed) URL.revokeObjectURL(removed.preview);
      return copy;
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modelo || !placa) return;
    if (!categoria) {
      toast.error("Selecione ou cadastre uma categoria.");
      return;
    }
    if (custoAquisicao === "" || Number(custoAquisicao) <= 0) {
      toast.error("Informe o custo de aquisição do veículo.");
      return;
    }
    setSaving(true);
    try {
      let fotoUrls: string[] = [];
      if (photos.length > 0) {
        const images = await Promise.all(photos.map((p) => fileToDataUrl(p.file)));
        const uploaded = await uploadVehiclePhotosFn({ data: { images } });
        fotoUrls = uploaded.urls;
      }

      await createVehicleFn({
        data: {
          modelo,
          placa,
          categoria,
          fotos: fotoUrls,
          ano: typeof ano === "number" ? ano : undefined,
          disponivel: true,
          custoAquisicao: Number(custoAquisicao),
          moedaAquisicao,
        },
      });
      notifyStoreChanged();
      toast.success(t("saved"));
      nav({ to: "/veiculos" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível salvar o veículo";
      toast.error(message);
    } finally {
      setSaving(false);
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
              <div className="sm:col-span-2">
                <VehicleCategoryField
                  label={t("category")}
                  value={categoria}
                  onChange={setCategoria}
                  categories={s.vehicleCategories}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Ano</Label>
                <Input
                  type="number"
                  value={ano}
                  onChange={(e) => setAno(e.target.value ? Number(e.target.value) : "")}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("purchaseCost")}</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={custoAquisicao}
                  onChange={(e) =>
                    setCustoAquisicao(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  placeholder="Ex.: 85000"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Valor pago na compra. Serve para acompanhar o payback com os aluguéis.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>{t("currency")}</Label>
                <Select
                  value={moedaAquisicao}
                  onValueChange={(v) => setMoedaAquisicao(v as Currency)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SRD">SRD</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{t("photos")}</Label>
              <label className="flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-border p-6 cursor-pointer hover:bg-muted/40">
                <Upload className="h-5 w-5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {t("attachPhotos")} · PNG, JPG, WEBP · máx. 5 MB cada · até 10 fotos
                </span>
                <input
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    onFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
              {photos.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {photos.map((p, i) => (
                    <div key={p.preview} className="relative group">
                      <img
                        src={p.preview}
                        alt=""
                        className="aspect-square object-cover rounded-md border border-border w-full"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        className="absolute top-1 right-1 h-6 w-6 rounded-full bg-foreground text-background grid place-items-center opacity-90 hover:opacity-100"
                        aria-label="Remover foto"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-border">
              <Button type="button" variant="outline" onClick={() => nav({ to: "/veiculos" })}>
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Salvando..." : t("save")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
