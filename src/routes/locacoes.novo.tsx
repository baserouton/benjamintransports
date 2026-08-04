import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { useI18n } from "@/lib/i18n";
import { notifyStoreChanged, useStore, type Currency } from "@/lib/data-store";
import { createRentalFn } from "@/server/functions/store.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/locacoes/novo")({
  head: () => ({
    meta: [
      { title: "Nova locação — Locadora Admin" },
      { name: "description", content: "Registrar nova locação de veículo." },
      { property: "og:title", content: "Nova locação — Locadora Admin" },
      { property: "og:description", content: "Cadastro de locação." },
    ],
  }),
  component: NewRental,
});

function NewRental() {
  const { t } = useI18n();
  const nav = useNavigate();
  const s = useStore();
  const [f, setF] = useState({
    veiculoId: "",
    clienteId: "",
    dataRetirada: new Date().toISOString().slice(0, 10),
    dataSaida: "",
    valorAluguel: "" as number | "",
    moeda: "SRD" as Currency,
    seguroValor: "" as number | "",
    seguroObs: "",
    caucaoValor: "" as number | "",
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.veiculoId || !f.clienteId || f.valorAluguel === "") {
      toast.error("Preencha veículo, cliente e valor do aluguel.");
      return;
    }
    try {
      await createRentalFn({
        data: {
          ...f,
          valorAluguel: f.valorAluguel,
          seguroValor: f.seguroValor === "" ? undefined : f.seguroValor,
          seguroObs: f.seguroObs || undefined,
          caucaoValor: f.caucaoValor === "" ? undefined : f.caucaoValor,
        },
      });
      notifyStoreChanged();
      toast.success(t("saved"));
      nav({ to: "/locacoes" });
    } catch {
      toast.error("Não foi possível registrar a locação");
    }
  };

  return (
    <div>
      <PageHeader
        title={`${t("new")} ${t("rentals").slice(0, -1).toLowerCase()}`}
        actions={
          <Button variant="outline" size="sm" onClick={() => nav({ to: "/locacoes" })}>
            <ArrowLeft className="h-4 w-4 mr-1" /> {t("back")}
          </Button>
        }
      />
      <Card className="max-w-3xl">
        <CardContent className="pt-6">
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Veículo</Label>
                <Select value={f.veiculoId} onValueChange={(v) => setF({ ...f, veiculoId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {s.vehicles.filter((v) => v.disponivel).map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.modelo} — {v.placa}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Cliente</Label>
                <Select value={f.clienteId} onValueChange={(v) => setF({ ...f, clienteId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {s.clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("withdrawDate")}</Label>
                <Input type="date" value={f.dataRetirada} onChange={(e) => setF({ ...f, dataRetirada: e.target.value })} required />
                <p className="text-xs text-muted-foreground">Dia em que o cliente retira o veículo.</p>
              </div>
              <div className="space-y-1.5">
                <Label>{t("returnDate")}</Label>
                <Input
                  type="date"
                  min={f.dataRetirada}
                  value={f.dataSaida}
                  onChange={(e) => setF({ ...f, dataSaida: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground">Data prevista para o carro voltar à locadora.</p>
              </div>
              <div className="space-y-1.5">
                <Label>{t("price")}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={f.valorAluguel}
                  onChange={(e) =>
                    setF({ ...f, valorAluguel: e.target.value === "" ? "" : Number(e.target.value) })
                  }
                  placeholder="Ex.: 250,00"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("currency")}</Label>
                <Select value={f.moeda} onValueChange={(v) => setF({ ...f, moeda: v as Currency })}>
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
              <div className="space-y-1.5">
                <Label>{t("insurance")}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={f.seguroValor}
                  onChange={(e) =>
                    setF({ ...f, seguroValor: e.target.value === "" ? "" : Number(e.target.value) })
                  }
                  placeholder="Opcional"
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("deposit")}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={f.caucaoValor}
                  onChange={(e) =>
                    setF({ ...f, caucaoValor: e.target.value === "" ? "" : Number(e.target.value) })
                  }
                  placeholder="Opcional"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>{t("observation")} — {t("insurance")}</Label>
                <Textarea rows={2} value={f.seguroObs} onChange={(e) => setF({ ...f, seguroObs: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2 border-t border-border">
              <Button type="button" variant="outline" onClick={() => nav({ to: "/locacoes" })}>
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
