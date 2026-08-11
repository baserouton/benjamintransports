import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type ComplianceFormValue = {
  seguroFeito: boolean;
  seguroValidade: string;
  vistoriaFeita: boolean;
  vistoriaValidade: string;
};

type Props = {
  value: ComplianceFormValue;
  onChange: (next: ComplianceFormValue) => void;
};

export function VehicleComplianceFields({ value, onChange }: Props) {
  return (
    <div className="sm:col-span-2 space-y-4 rounded-lg border border-border p-4">
      <div>
        <p className="text-sm font-semibold">Documentação do veículo</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Informe se o seguro e a vistoria foram feitos e as datas de vencimento.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Seguro</Label>
          <Select
            value={value.seguroFeito ? "sim" : "nao"}
            onValueChange={(v) =>
              onChange({
                ...value,
                seguroFeito: v === "sim",
                seguroValidade: v === "sim" ? value.seguroValidade : "",
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sim">Foi feito</SelectItem>
              <SelectItem value="nao">Não foi feito</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Vencimento do seguro</Label>
          <Input
            type="date"
            disabled={!value.seguroFeito}
            required={value.seguroFeito}
            value={value.seguroValidade}
            onChange={(e) => onChange({ ...value, seguroValidade: e.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Vistoria</Label>
          <Select
            value={value.vistoriaFeita ? "sim" : "nao"}
            onValueChange={(v) =>
              onChange({
                ...value,
                vistoriaFeita: v === "sim",
                vistoriaValidade: v === "sim" ? value.vistoriaValidade : "",
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sim">Foi feita</SelectItem>
              <SelectItem value="nao">Não foi feita</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Vencimento da vistoria</Label>
          <Input
            type="date"
            disabled={!value.vistoriaFeita}
            required={value.vistoriaFeita}
            value={value.vistoriaValidade}
            onChange={(e) => onChange({ ...value, vistoriaValidade: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}

export function validateCompliance(value: ComplianceFormValue): string | null {
  if (value.seguroFeito && !value.seguroValidade) {
    return "Informe o vencimento do seguro.";
  }
  if (value.vistoriaFeita && !value.vistoriaValidade) {
    return "Informe o vencimento da vistoria.";
  }
  return null;
}
