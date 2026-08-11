import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  notifyStoreChanged,
  useStore,
  type Category,
  type VehicleCategory,
} from "@/lib/data-store";
import {
  createVehicleCategoryFn,
  deleteVehicleCategoryFn,
  updateVehicleCategoryFn,
} from "@/server/functions/store.functions";

type Props = {
  label: string;
  value: Category;
  onChange: (value: Category) => void;
  categories: VehicleCategory[];
};

export function VehicleCategoryField({ label, value, onChange, categories }: Props) {
  const s = useStore();
  const active = useMemo(
    () => categories.filter((c) => c.ativo).sort((a, b) => a.nome.localeCompare(b.nome)),
    [categories],
  );
  const selected = active.find((c) => c.nome === value) ?? null;

  const vehiclesInSelected = useMemo(() => {
    if (!selected) return [];
    return s.vehicles.filter((v) => v.categoria === selected.nome);
  }, [s.vehicles, selected]);

  const migrateOptions = useMemo(
    () => active.filter((c) => c.id !== selected?.id),
    [active, selected],
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [migrateToId, setMigrateToId] = useState("");
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setNome("");
    setCreateOpen(true);
  };

  const openEdit = () => {
    if (!selected) {
      toast.error("Selecione uma categoria para editar.");
      return;
    }
    setNome(selected.nome);
    setEditOpen(true);
  };

  const openDelete = () => {
    if (!selected) {
      toast.error("Selecione uma categoria para excluir.");
      return;
    }
    setMigrateToId(migrateOptions[0]?.id ?? "");
    setDeleteOpen(true);
  };

  const saveCreate = async () => {
    const trimmed = nome.trim();
    if (!trimmed) {
      toast.error("Informe o nome da categoria.");
      return;
    }
    setSaving(true);
    try {
      const created = await createVehicleCategoryFn({ data: { nome: trimmed } });
      notifyStoreChanged();
      onChange(created.nome);
      toast.success("Categoria cadastrada.");
      setCreateOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível cadastrar");
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async () => {
    if (!selected) return;
    const trimmed = nome.trim();
    if (!trimmed) {
      toast.error("Informe o nome da categoria.");
      return;
    }
    setSaving(true);
    try {
      const updated = await updateVehicleCategoryFn({
        data: { id: selected.id, nome: trimmed },
      });
      notifyStoreChanged();
      onChange(updated.nome);
      toast.success("Categoria atualizada.");
      setEditOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!selected) return;
    if (vehiclesInSelected.length > 0) {
      if (!migrateToId) {
        toast.error("Escolha a categoria para onde migrar os carros.");
        return;
      }
      if (migrateOptions.length === 0) {
        toast.error("Crie outra categoria antes de excluir esta (há carros vinculados).");
        return;
      }
    }

    setSaving(true);
    try {
      const result = await deleteVehicleCategoryFn({
        data: {
          id: selected.id,
          migrateToCategoryId:
            vehiclesInSelected.length > 0 ? migrateToId : undefined,
        },
      });
      notifyStoreChanged();
      if (result.migratedTo) {
        onChange(result.migratedTo);
        toast.success(
          `Categoria excluída. ${result.vehiclesMoved} carro(s) migrado(s) para ${result.migratedTo}.`,
        );
      } else {
        const next = active.find((c) => c.id !== selected.id)?.nome ?? "";
        onChange(next);
        toast.success("Categoria excluída.");
      }
      setDeleteOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível excluir");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Selecione a categoria" />
        </SelectTrigger>
        <SelectContent>
          {active.map((c) => (
            <SelectItem key={c.id} value={c.nome}>
              {c.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex flex-wrap gap-2 pt-1">
        <Button type="button" variant="outline" size="sm" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Cadastrar nova categoria
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={openEdit}
          disabled={!selected}
        >
          <Pencil className="h-3.5 w-3.5 mr-1" />
          Editar categoria
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={openDelete}
          disabled={!selected}
        >
          <Trash2 className="h-3.5 w-3.5 mr-1" />
          Excluir categoria
        </Button>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cadastrar nova categoria</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: SUV"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void saveCreate();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void saveCreate()} disabled={saving}>
              {saving ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar categoria</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void saveEdit();
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              Ao renomear, os veículos desta categoria também serão atualizados.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void saveEdit()} disabled={saving}>
              {saving ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir categoria</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p>
              Você está excluindo a categoria{" "}
              <span className="font-semibold">{selected?.nome}</span>.
            </p>
            {vehiclesInSelected.length > 0 ? (
              <>
                <p className="text-muted-foreground">
                  Há <span className="font-semibold text-foreground">{vehiclesInSelected.length}</span>{" "}
                  carro(s) nessa categoria. Os carros <span className="font-semibold">não serão
                  apagados</span> — escolha para onde migrá-los:
                </p>
                {migrateOptions.length === 0 ? (
                  <p className="text-xs text-muted-foreground rounded-md border border-border p-3">
                    Não há outra categoria. Cadastre uma nova antes de excluir esta.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    <Label>Migrar carros para</Label>
                    <Select value={migrateToId} onValueChange={setMigrateToId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {migrateOptions.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">
                Não há carros nessa categoria. Confirma a exclusão?
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void confirmDelete()}
              disabled={
                saving ||
                (vehiclesInSelected.length > 0 &&
                  (migrateOptions.length === 0 || !migrateToId))
              }
            >
              {saving ? "Excluindo…" : "Excluir categoria"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
