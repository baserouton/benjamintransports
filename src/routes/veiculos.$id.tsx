import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { useI18n } from "@/lib/i18n";
import {
  useStore,
  notifyStoreChanged,
  fmtMoney,
  calcVehiclePayback,
  type Category,
  type Currency,
} from "@/lib/data-store";
import {
  hideVehicleFn,
  restoreVehicleFn,
  updateVehicleFn,
  uploadVehiclePhotosFn,
} from "@/server/functions/store.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Car, Wrench, Wallet, Target, Pencil, EyeOff, Eye, Upload, X } from "lucide-react";
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

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Falha ao ler a imagem"));
    reader.readAsDataURL(file);
  });
}

function VehicleDetail() {
  const { t } = useI18n();
  const { id } = Route.useParams();
  const nav = useNavigate();
  const s = useStore();
  const v = s.vehicles.find((x) => x.id === id);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    modelo: "",
    placa: "",
    categoria: "CARROS" as Category,
    ano: "" as number | "",
    seguroValidade: "",
    custoAquisicao: "" as number | "",
    moedaAquisicao: "SRD" as Currency,
  });
  const [fotos, setFotos] = useState<string[]>([]);
  const [newPhotos, setNewPhotos] = useState<Array<{ file: File; preview: string }>>([]);

  useEffect(() => {
    if (!v) return;
    setForm({
      modelo: v.modelo,
      placa: v.placa,
      categoria: v.categoria,
      ano: v.ano ?? "",
      seguroValidade: v.seguroValidade ?? "",
      custoAquisicao: v.custoAquisicao ?? "",
      moedaAquisicao: v.moedaAquisicao ?? "SRD",
    });
    setFotos(v.fotos ?? []);
    setNewPhotos([]);
    setEditing(false);
  }, [
    v?.id,
    v?.modelo,
    v?.placa,
    v?.categoria,
    v?.ano,
    v?.seguroValidade,
    v?.custoAquisicao,
    v?.moedaAquisicao,
    v?.fotos,
    v?.oculto,
  ]);

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
  const payback = calcVehiclePayback(v, s.finance);
  const paybackPct = payback ? Math.min(100, payback.pct) : 0;

  const saveEdit = async () => {
    if (!form.modelo.trim() || !form.placa.trim()) {
      toast.error("Preencha modelo e placa.");
      return;
    }
    setSaving(true);
    try {
      let nextFotos = [...fotos];
      if (newPhotos.length > 0) {
        const images = await Promise.all(newPhotos.map((p) => fileToDataUrl(p.file)));
        const uploaded = await uploadVehiclePhotosFn({ data: { images } });
        nextFotos = [...nextFotos, ...uploaded.urls];
      }
      await updateVehicleFn({
        data: {
          id: v.id,
          modelo: form.modelo.trim(),
          placa: form.placa.trim().toUpperCase(),
          categoria: form.categoria,
          ano: typeof form.ano === "number" ? form.ano : undefined,
          seguroValidade: form.seguroValidade || undefined,
          custoAquisicao:
            form.custoAquisicao === "" ? undefined : Number(form.custoAquisicao),
          moedaAquisicao: form.moedaAquisicao,
          fotos: nextFotos,
        },
      });
      notifyStoreChanged();
      toast.success(t("saved"));
      setEditing(false);
      setNewPhotos([]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar");
    } finally {
      setSaving(false);
    }
  };

  const hideVehicle = async () => {
    try {
      await hideVehicleFn({ data: { id: v.id } });
      notifyStoreChanged();
      toast.success("Veículo ocultado. Histórico preservado nas outras telas.");
      nav({ to: "/veiculos" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível ocultar");
    }
  };

  const restoreVehicle = async () => {
    try {
      await restoreVehicleFn({ data: { id: v.id } });
      notifyStoreChanged();
      toast.success("Veículo restaurado na lista.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível restaurar");
    }
  };

  return (
    <div>
      <PageHeader
        title={v.modelo}
        description={
          <span className="inline-flex items-center gap-2">
            <span className="font-mono">{v.placa}</span>
            {v.oculto && <Badge variant="outline">{t("hiddenVehicle")}</Badge>}
          </span>
        }
        actions={
          <div className="flex flex-wrap gap-2">
            {!editing && (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4 mr-1" /> {t("edit")}
              </Button>
            )}
            {v.oculto ? (
              <Button variant="outline" size="sm" onClick={restoreVehicle}>
                <Eye className="h-4 w-4 mr-1" /> {t("restoreVehicle")}
              </Button>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <EyeOff className="h-4 w-4 mr-1" /> {t("hideVehicle")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Ocultar veículo da lista?</AlertDialogTitle>
                    <AlertDialogDescription>
                      O veículo deixa de aparecer em Veículos e nas listas de seleção, mas o
                      histórico de locações, financeiro e manutenção permanece intacto para a
                      gestão. Isso não apaga dados do banco.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                    <AlertDialogAction onClick={hideVehicle}>{t("hideVehicle")}</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button variant="outline" size="sm" onClick={() => nav({ to: "/veiculos" })}>
              <ArrowLeft className="h-4 w-4 mr-1" /> {t("back")}
            </Button>
          </div>
        }
      />

      {v.oculto && (
        <Card className="p-4 mb-4 border-dashed">
          <p className="text-sm text-muted-foreground">
            Este veículo está oculto na lista de frota. Locações, financeiro e manutenções
            antigas continuam visíveis nas outras telas.
          </p>
        </Card>
      )}

      {payback && (
        <Card className={`p-5 mb-4 ${payback.achieved ? "bg-foreground text-background border-foreground" : ""}`}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div className="flex items-start gap-3">
              <div
                className={`h-10 w-10 rounded-md grid place-items-center shrink-0 ${
                  payback.achieved ? "bg-background text-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                <Target className="h-5 w-5" />
              </div>
              <div>
                <div
                  className={`text-[11px] uppercase tracking-widest ${
                    payback.achieved ? "opacity-70" : "text-muted-foreground"
                  }`}
                >
                  {t("payback")}
                </div>
                <div className="text-2xl font-semibold tracking-tight mt-1">
                  {payback.achieved ? t("paybackAchieved") : `${payback.pct.toFixed(1)}%`}
                </div>
                <div className={`text-xs mt-1 ${payback.achieved ? "opacity-70" : "text-muted-foreground"}`}>
                  {payback.achieved
                    ? `${fmtMoney(payback.rented, payback.currency)} alugados · custo ${fmtMoney(payback.cost, payback.currency)}`
                    : `${t("paybackPending")}: ${fmtMoney(payback.remaining, payback.currency)}`}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 md:gap-8">
              <div>
                <div className={`text-[10px] uppercase tracking-widest ${payback.achieved ? "opacity-60" : "text-muted-foreground"}`}>
                  {t("purchaseCost")}
                </div>
                <div className="text-sm font-medium tabular-nums mt-1">
                  {fmtMoney(payback.cost, payback.currency)}
                </div>
              </div>
              <div>
                <div className={`text-[10px] uppercase tracking-widest ${payback.achieved ? "opacity-60" : "text-muted-foreground"}`}>
                  {t("alreadyRented")}
                </div>
                <div className="text-sm font-medium tabular-nums mt-1">
                  {fmtMoney(payback.rented, payback.currency)}
                </div>
              </div>
              <div>
                <div className={`text-[10px] uppercase tracking-widest ${payback.achieved ? "opacity-60" : "text-muted-foreground"}`}>
                  {t("expenses")}
                </div>
                <div className="text-sm font-medium tabular-nums mt-1">
                  {fmtMoney(payback.expenses, payback.currency)}
                </div>
              </div>
            </div>
          </div>
          <div className={`h-1.5 rounded-full overflow-hidden ${payback.achieved ? "bg-background/15" : "bg-muted"}`}>
            <div
              className={`h-full ${payback.achieved ? "bg-background" : "bg-foreground"}`}
              style={{ width: `${paybackPct}%` }}
            />
          </div>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3 mb-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{t("photos")}</CardTitle>
          </CardHeader>
          <CardContent>
            {editing ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {fotos.map((f, i) => (
                    <div key={f} className="relative">
                      <img src={f} alt="" className="aspect-video object-cover rounded-md border border-border w-full" />
                      <button
                        type="button"
                        className="absolute top-1 right-1 h-6 w-6 rounded-full bg-foreground text-background grid place-items-center"
                        onClick={() => setFotos((prev) => prev.filter((_, idx) => idx !== i))}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  {newPhotos.map((p, i) => (
                    <div key={p.preview} className="relative">
                      <img src={p.preview} alt="" className="aspect-video object-cover rounded-md border border-border w-full" />
                      <button
                        type="button"
                        className="absolute top-1 right-1 h-6 w-6 rounded-full bg-foreground text-background grid place-items-center"
                        onClick={() =>
                          setNewPhotos((prev) => {
                            const copy = [...prev];
                            const [removed] = copy.splice(i, 1);
                            if (removed) URL.revokeObjectURL(removed.preview);
                            return copy;
                          })
                        }
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <label className="flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-border p-4 cursor-pointer hover:bg-muted/40">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Adicionar fotos</span>
                  <input
                    type="file"
                    multiple
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      const files = e.target.files;
                      if (!files) return;
                      const next = Array.from(files)
                        .filter((f) => f.type.startsWith("image/"))
                        .map((file) => ({ file, preview: URL.createObjectURL(file) }));
                      setNewPhotos((prev) => [...prev, ...next].slice(0, 10));
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
            ) : v.fotos.length === 0 ? (
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
            <CardTitle className="text-base">{editing ? t("edit") : t("details")}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            {editing ? (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>{t("model")}</Label>
                  <Input
                    value={form.modelo}
                    onChange={(e) => setForm({ ...form, modelo: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("plate")}</Label>
                  <Input
                    className="font-mono"
                    value={form.placa}
                    onChange={(e) => setForm({ ...form, placa: e.target.value.toUpperCase() })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("category")}</Label>
                  <Select
                    value={form.categoria}
                    onValueChange={(val) => setForm({ ...form, categoria: val as Category })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
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
                    value={form.ano}
                    onChange={(e) =>
                      setForm({ ...form, ano: e.target.value ? Number(e.target.value) : "" })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("purchaseCost")}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.custoAquisicao}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        custoAquisicao: e.target.value === "" ? "" : Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("currency")}</Label>
                  <Select
                    value={form.moedaAquisicao}
                    onValueChange={(val) => setForm({ ...form, moedaAquisicao: val as Currency })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SRD">SRD</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Seguro válido até</Label>
                  <Input
                    type="date"
                    value={form.seguroValidade}
                    onChange={(e) => setForm({ ...form, seguroValidade: e.target.value })}
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setEditing(false);
                      setFotos(v.fotos ?? []);
                      setNewPhotos([]);
                    }}
                  >
                    {t("cancel")}
                  </Button>
                  <Button type="button" className="flex-1" disabled={saving} onClick={saveEdit}>
                    {saving ? "Salvando..." : t("save")}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <Row k={t("model")} v={v.modelo} />
                <Row k={t("plate")} v={<span className="font-mono">{v.placa}</span>} />
                <Row k={t("category")} v={<Badge variant="outline">{v.categoria}</Badge>} />
                <Row k="Ano" v={v.ano ?? "—"} />
                <Row
                  k={t("purchaseCost")}
                  v={
                    v.custoAquisicao != null && v.moedaAquisicao
                      ? fmtMoney(v.custoAquisicao, v.moedaAquisicao)
                      : "—"
                  }
                />
                <Row
                  k={t("status")}
                  v={
                    v.disponivel ? (
                      <Badge variant="secondary">{t("available")}</Badge>
                    ) : (
                      <Badge>{t("rented")}</Badge>
                    )
                  }
                />
                <Row k="Seguro válido até" v={v.seguroValidade ?? "—"} />
              </>
            )}
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
