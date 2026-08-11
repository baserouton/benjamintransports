import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus } from "lucide-react";
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
  type Category,
  type VehicleCategory,
} from "@/lib/data-store";
import {
  createVehicleCategoryFn,
  updateVehicleCategoryFn,
} from "@/server/functions/store.functions";

type Props = {
  label: string;
  value: Category;
  onChange: (value: Category) => void;
  categories: VehicleCategory[];
};

export function VehicleCategoryField({ label, value, onChange, categories }: Props) {
  const active = useMemo(
    () => categories.filter((c) => c.ativo).sort((a, b) => a.nome.localeCompare(b.nome)),
    [categories],
  );
  const selected = active.find((c) => c.nome === value) ?? null;

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [nome, setNome] = useState("");
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
    </div>
  );
}
