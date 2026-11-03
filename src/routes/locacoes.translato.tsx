import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Pencil, Plane, Plus, Search, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { useI18n } from "@/lib/i18n";
import { useCurrentUser } from "@/lib/current-user";
import {
  useStore,
  notifyStoreChanged,
  canViewFinance,
  fmtMoney,
  TRANSFER_SERVICE_TYPES,
  TRANSFER_SERVICE_TYPE_LABELS,
  type Currency,
  type TransferService,
  type TransferServiceType,
} from "@/lib/data-store";
import {
  createTransferServiceFn,
  deleteTransferServiceFn,
  updateTransferServiceFn,
} from "@/server/functions/store.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/locacoes/translato")({
  head: () => ({
    meta: [
      { title: "Translato — Locadora Admin" },
      {
        name: "description",
        content: "Serviços avulsos: aeroporto, transfer e ponto a ponto.",
      },
      { property: "og:title", content: "Translato — Locadora Admin" },
      { property: "og:description", content: "Cadastro de serviço avulso Translato." },
    ],
  }),
  component: TranslatoPage,
});

const CURRENCIES: Currency[] = ["SRD", "USD", "EUR"];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

const emptyForm = {
  veiculoId: "",
  tipoServico: "aeroporto_hotel" as TransferServiceType,
  destino: "",
  data: todayIso(),
  valor: "" as number | "",
  moeda: "USD" as Currency,
  clienteNome: "",
  obs: "",
};

function TranslatoPage() {
  const { t, lang } = useI18n();
  const { user } = useCurrentUser();
  const s = useStore();
  const canManage = canViewFinance(user?.login);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");
  const [form, setForm] = useState({
    veiculoId: "",
    tipoServico: "aeroporto_hotel" as TransferServiceType,
    destino: "",
    data: todayIso(),
    valor: "" as number | "",
    moeda: "USD" as Currency,
    clienteNome: "",
    obs: "",
  });

  const availableVehicles = useMemo(
    () => s.vehicles.filter((v) => v.disponivel && !v.oculto),
    [s.vehicles],
  );
  const vehicleOptions = useMemo(() => {
    const current = s.vehicles.find((v) => v.id === form.veiculoId);
    if (current && !availableVehicles.some((v) => v.id === current.id)) {
      return [current, ...availableVehicles];
    }
    return availableVehicles;
  }, [s.vehicles, availableVehicles, form.veiculoId]);

  const filtered = useMemo(() => {
    return s.transferServices
      .filter((row) => {
        if (!q) return true;
        const veh = s.vehicles.find((v) => v.id === row.veiculoId);
        const hay =
          `${TRANSFER_SERVICE_TYPE_LABELS[row.tipoServico]} ${row.destino} ${row.clienteNome ?? ""} ${veh?.modelo ?? ""} ${veh?.placa ?? ""}`.toLowerCase();
        return hay.includes(q.toLowerCase());
      })
      .sort((a, b) => b.data.localeCompare(a.data));
  }, [s.transferServices, s.vehicles, q]);

  const resetForm = () => {
    setEditingId(null);
    setForm({ ...emptyForm, data: todayIso() });
  };

  const openEdit = (row: TransferService) => {
    setEditingId(row.id);
    setForm({
      veiculoId: row.veiculoId,
      tipoServico: row.tipoServico,
      destino: row.destino,
      data: row.data,
      valor: row.valor,
      moeda: row.moeda,
      clienteNome: row.clienteNome ?? "",
      obs: row.obs ?? "",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.veiculoId) {
      toast.error("Selecione um carro disponível.");
      return;
    }
    if (!form.destino.trim()) {
      toast.error("Informe o destino do serviço.");
      return;
    }
    if (form.valor === "" || Number(form.valor) <= 0) {
      toast.error("Informe o valor do serviço.");
      return;
    }
    const data = {
      veiculoId: form.veiculoId,
      tipoServico: form.tipoServico,
      destino: form.destino.trim(),
      data: form.data,
      valor: Number(form.valor),
      moeda: form.moeda,
      clienteNome: form.clienteNome.trim() || undefined,
      obs: form.obs.trim() || undefined,
    };
    setSaving(true);
    try {
      if (editingId) {
        await updateTransferServiceFn({ data: { id: editingId, ...data } });
        toast.success("Serviço avulso atualizado.");
      } else {
        await createTransferServiceFn({ data });
        toast.success("Serviço avulso registrado e lançado no financeiro.");
      }
      notifyStoreChanged();
      setOpen(false);
      resetForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deleteId) return;
    setSaving(true);
    try {
      await deleteTransferServiceFn({ data: { id: deleteId } });
      notifyStoreChanged();
      toast.success("Serviço avulso excluído.");
      setDeleteId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível excluir");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Translato"
        description={
          lang === "pt"
            ? "Serviço avulso (aeroporto, transfer e ponto a ponto). Só carros disponíveis."
            : "Losse dienst (luchthaven, transfer). Alleen beschikbare auto's."
        }
        actions={
          <Dialog
            open={open}
            onOpenChange={(v) => {
              setOpen(v);
              if (!v) resetForm();
            }}
          >
            <Button
              size="sm"
              onClick={() => {
                resetForm();
                setOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              {lang === "pt" ? "Novo serviço" : "Nieuwe dienst"}
            </Button>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingId
                    ? lang === "pt"
                      ? "Editar serviço avulso"
                      : "Losse dienst bewerken"
                    : lang === "pt"
                      ? "Registrar serviço avulso"
                      : "Losse dienst registreren"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>{lang === "pt" ? "Carro (disponível)" : "Auto (beschikbaar)"}</Label>
                  <Select
                    value={form.veiculoId}
                    onValueChange={(v) => setForm({ ...form, veiculoId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          lang === "pt" ? "Selecionar carro livre" : "Selecteer vrije auto"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicleOptions.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.modelo} — {v.placa}
                          {!v.disponivel ? (lang === "pt" ? " (atual)" : " (huidig)") : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {availableVehicles.length === 0
                      ? lang === "pt"
                        ? "Nenhum carro disponível no momento."
                        : "Geen beschikbare auto op dit moment."
                      : lang === "pt"
                        ? "Só aparecem veículos não alugados e não ocultos."
                        : "Alleen niet-verhuurde en zichtbare voertuigen."}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label>{lang === "pt" ? "Tipo de serviço" : "Type dienst"}</Label>
                  <Select
                    value={form.tipoServico}
                    onValueChange={(v) =>
                      setForm({ ...form, tipoServico: v as TransferServiceType })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TRANSFER_SERVICE_TYPES.map((tipo) => (
                        <SelectItem key={tipo} value={tipo}>
                          {TRANSFER_SERVICE_TYPE_LABELS[tipo]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>{lang === "pt" ? "Destino do serviço" : "Bestemming"}</Label>
                  <Input
                    value={form.destino}
                    onChange={(e) => setForm({ ...form, destino: e.target.value })}
                    placeholder={
                      lang === "pt"
                        ? "Ex.: Aeroporto PBM → Hotel Torarica"
                        : "Bijv. Airport PBM → Hotel"
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>{t("date")}</Label>
                    <Input
                      type="date"
                      value={form.data}
                      onChange={(e) => setForm({ ...form, data: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{lang === "pt" ? "Cliente (opcional)" : "Klant (optioneel)"}</Label>
                    <Input
                      value={form.clienteNome}
                      onChange={(e) => setForm({ ...form, clienteNome: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>{t("price")}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={form.valor}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          valor: e.target.value === "" ? "" : Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("currency")}</Label>
                    <Select
                      value={form.moeda}
                      onValueChange={(v) => setForm({ ...form, moeda: v as Currency })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>{lang === "pt" ? "Observações" : "Opmerkingen"}</Label>
                  <Textarea
                    rows={2}
                    value={form.obs}
                    onChange={(e) => setForm({ ...form, obs: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  {t("cancel")}
                </Button>
                <Button onClick={() => void save()} disabled={saving}>
                  {saving ? "Salvando…" : t("save")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <Card className="rounded-2xl p-5 flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-muted grid place-items-center shrink-0">
          <Plane className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="text-sm">
          <p className="font-semibold">
            {lang === "pt" ? "Conectado ao Financeiro" : "Gekoppeld aan Financiën"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {lang === "pt"
              ? "Cada serviço avulso gera uma entrada na categoria “Serviço avulso” no histórico do Financeiro."
              : "Elke losse dienst maakt een inkomstenboeking “Serviço avulso” in Financiën."}
          </p>
        </div>
      </Card>

      <Card className="rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-sm font-bold uppercase tracking-wider">
            {lang === "pt" ? "Histórico Translato" : "Translato geschiedenis"}{" "}
            <span className="text-muted-foreground font-normal">/ {filtered.length}</span>
          </h2>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("search")}
              className="h-9 pl-8 w-56"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  {t("date")}
                </TableHead>
                <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  {lang === "pt" ? "Tipo" : "Type"}
                </TableHead>
                <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  {lang === "pt" ? "Destino" : "Bestemming"}
                </TableHead>
                <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  {lang === "pt" ? "Carro" : "Auto"}
                </TableHead>
                <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-right">
                  {t("price")}
                </TableHead>
                {canManage && (
                  <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-right">
                    {t("edit")}
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={canManage ? 6 : 5} className="text-center text-muted-foreground py-10">
                    {t("noRecords")}
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((row) => {
                const veh = s.vehicles.find((v) => v.id === row.veiculoId);
                return (
                  <TableRow key={row.id}>
                    <TableCell className="text-xs tabular-nums text-muted-foreground">
                      {row.data}
                    </TableCell>
                    <TableCell className="text-xs">
                      <Badge variant="outline">
                        {TRANSFER_SERVICE_TYPE_LABELS[row.tipoServico]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-medium">
                      {row.destino}
                      {row.clienteNome && (
                        <span className="block text-muted-foreground font-normal mt-0.5">
                          {row.clienteNome}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {veh ? `${veh.modelo} · ${veh.placa}` : "—"}
                    </TableCell>
                    <TableCell className="text-right text-xs font-bold tabular-nums">
                      + {fmtMoney(row.valor, row.moeda)}
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEdit(row)}
                            aria-label={t("edit")}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => setDeleteId(row.id)}
                            aria-label={t("delete")}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {lang === "pt" ? "Excluir serviço avulso?" : "Losse dienst verwijderen?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {lang === "pt"
                ? "O registro some do Translato e o lançamento correspondente no financeiro também é removido."
                : "De dienst verdwijnt uit Translato en de gekoppelde financiële boeking wordt ook verwijderd."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void remove()} disabled={saving}>
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
