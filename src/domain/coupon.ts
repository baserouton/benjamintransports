import { TRANSFER_SERVICE_TYPE_LABELS, rentalBillableDays } from "./models";
import type {
  Client,
  CouponKind,
  CouponLine,
  CouponPayload,
  Currency,
  InspectionIn,
  InspectionOut,
  Rental,
  RentalRenewal,
  TransferService,
  Vehicle,
} from "./models";

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function snapshotClient(client?: Client | null): CouponPayload["cliente"] | undefined {
  if (!client) return undefined;
  return {
    nome: client.nome,
    rg: client.rg,
    cpf: client.cpf,
    endereco: client.endereco,
    whatsapp: client.whatsapp,
    email: client.email || undefined,
    suriname: client.suriname,
  };
}

function snapshotVehicle(vehicle?: Vehicle | null): CouponPayload["veiculo"] | undefined {
  if (!vehicle) return undefined;
  return {
    modelo: vehicle.modelo,
    placa: vehicle.placa,
    ano: vehicle.ano,
    categoria: vehicle.categoria,
  };
}

function snapshotInspection(
  inspection?: InspectionOut | InspectionIn | null,
  kmVolta?: number,
): CouponPayload["vistoria"] | undefined {
  if (!inspection) return undefined;
  const km = inspection.km;
  const rodados = km != null && kmVolta != null ? Math.max(0, kmVolta - km) : undefined;
  return {
    tanque: inspection.tanque,
    limpo: inspection.limpo,
    semAvarias: inspection.semAvarias,
    obs: inspection.obs,
    km,
    kmVolta,
    kmRodados: rodados,
  };
}

export function buildCouponDraft(input: {
  tipo: CouponKind;
  moeda: Currency;
  itens: CouponLine[];
  rental?: Rental;
  client?: Client | null;
  vehicle?: Vehicle | null;
  periodo?: CouponPayload["periodo"];
  vistoria?: CouponPayload["vistoria"];
  caucao?: CouponPayload["caucao"];
  observacao?: string;
  translato?: CouponPayload["translato"];
}): { tipo: CouponKind; moeda: Currency; total: number; payload: CouponPayload } {
  const total = round2(input.itens.reduce((sum, item) => sum + item.total, 0));
  return {
    tipo: input.tipo,
    moeda: input.moeda,
    total,
    payload: {
      tipo: input.tipo,
      cliente: snapshotClient(input.client),
      veiculo: snapshotVehicle(input.vehicle),
      periodo: input.periodo,
      vistoria: input.vistoria,
      itens: input.itens,
      caucao: input.caucao,
      observacao: input.observacao,
      contratoAssinadoEm: input.rental?.contratoAssinadoEm,
      locacaoRef: input.rental?.id,
      translato: input.translato,
    },
  };
}

export function buildDeliveryCouponDraft(
  rental: Rental,
  client: Client | null,
  vehicle: Vehicle | null,
  inspection: InspectionOut,
) {
  const indeterminado = Boolean(rental.prazoIndeterminado);
  const dias = rentalBillableDays(rental.dataRetirada, rental.dataSaida);
  const diaria = dias > 0 ? round2(rental.valorAluguel / dias) : rental.valorAluguel;
  const itens: CouponLine[] = [
    {
      descricao: indeterminado
        ? `Aluguel ${vehicle?.modelo ?? ""} · ${vehicle?.placa ?? ""} (prazo indeterminado)`
        : `Aluguel ${vehicle?.modelo ?? ""} · ${vehicle?.placa ?? ""} · ${dias} dia(s)`,
      descricaoNl: indeterminado
        ? `Huur ${vehicle?.modelo ?? ""} · ${vehicle?.placa ?? ""} (onbepaalde termijn)`
        : `Huur ${vehicle?.modelo ?? ""} · ${vehicle?.placa ?? ""} · ${dias} dag(en)`,
      quantidade: indeterminado ? 1 : dias,
      unitario: indeterminado ? rental.valorAluguel : diaria,
      total: rental.valorAluguel,
    },
  ];
  if (rental.seguroValor && rental.seguroValor > 0) {
    const obs = rental.seguroObs ? ` (${rental.seguroObs})` : "";
    itens.push({
      descricao: `Seguro adicional${obs}`,
      descricaoNl: `Aanvullende verzekering${obs}`,
      quantidade: 1,
      unitario: rental.seguroValor,
      total: rental.seguroValor,
    });
  }
  return buildCouponDraft({
    tipo: "entrega",
    moeda: rental.moeda,
    itens,
    rental,
    client,
    vehicle,
    periodo: {
      retirada: rental.dataRetirada,
      saida: rental.dataSaida,
      indeterminado,
      dias,
    },
    vistoria: snapshotInspection(inspection),
    caucao:
      rental.caucaoValor && rental.caucaoValor > 0
        ? { valor: rental.caucaoValor, status: rental.caucaoStatus ?? "retido" }
        : undefined,
  });
}

export function buildRenewalCouponDraft(
  rental: Rental,
  client: Client | null,
  vehicle: Vehicle | null,
  renewal: RentalRenewal,
) {
  if (renewal.valor == null || renewal.valor <= 0) return null;
  const saida = renewal.dataSaidaNova ?? rental.dataSaida;
  const dias = renewal.prazoIndeterminado
    ? 1
    : rentalBillableDays(renewal.dataSaidaAnterior, saida);
  return buildCouponDraft({
    tipo: "renovacao",
    moeda: renewal.moeda ?? rental.moeda,
    itens: [
      {
        descricao: renewal.prazoIndeterminado
          ? `Renovação de aluguel (prazo indeterminado)`
          : `Renovação de aluguel · ${renewal.dataSaidaAnterior} → ${saida}`,
        descricaoNl: renewal.prazoIndeterminado
          ? `Huurverlenging (onbepaalde termijn)`
          : `Huurverlenging · ${renewal.dataSaidaAnterior} → ${saida}`,
        quantidade: dias,
        unitario: round2(renewal.valor / Math.max(1, dias)),
        total: renewal.valor,
      },
    ],
    rental,
    client,
    vehicle,
    periodo: {
      retirada: renewal.dataSaidaAnterior,
      saida,
      indeterminado: renewal.prazoIndeterminado,
      dias,
    },
  });
}

export function buildReturnFeeCouponDraft(
  rental: Rental,
  client: Client | null,
  vehicle: Vehicle | null,
  inspection: InspectionIn,
) {
  if (!(inspection.taxa > 0)) return null;
  const kmSaida = rental.vistoriaRetirada?.km;
  return buildCouponDraft({
    tipo: "devolucao",
    moeda: rental.moeda,
    itens: [
      {
        descricao: "Taxa de não conformidade na devolução",
        descricaoNl: "Boete non-conformiteit bij retour",
        quantidade: 1,
        unitario: inspection.taxa,
        total: inspection.taxa,
      },
    ],
    rental,
    client,
    vehicle,
    periodo: {
      retirada: rental.dataRetirada,
      saida: rental.dataSaida,
      indeterminado: Boolean(rental.prazoIndeterminado),
      dias: rentalBillableDays(rental.dataRetirada, rental.dataSaida),
    },
    vistoria: snapshotInspection(
      {
        ...inspection,
        km: kmSaida,
      },
      inspection.km,
    ),
    observacao: inspection.obs || undefined,
    caucao:
      rental.caucaoValor && rental.caucaoValor > 0
        ? {
            valor: rental.caucaoValor,
            status: inspection.semAvarias ? "devolvido" : (rental.caucaoStatus ?? "retido"),
          }
        : undefined,
  });
}

export function buildTranslatoCouponDraft(
  service: TransferService,
  vehicle: Vehicle | null,
) {
  const tipoLabel = TRANSFER_SERVICE_TYPE_LABELS[service.tipoServico] ?? service.tipoServico;
  return buildCouponDraft({
    tipo: "translato",
    moeda: service.moeda,
    itens: [
      {
        descricao: `Serviço avulso — ${tipoLabel} → ${service.destino}`,
        descricaoNl: `Losse dienst — ${tipoLabel} → ${service.destino}`,
        quantidade: 1,
        unitario: service.valor,
        total: service.valor,
      },
    ],
    vehicle,
    observacao: service.obs,
    translato: {
      tipoServico: tipoLabel,
      destino: service.destino,
      data: service.data,
    },
    client: service.clienteNome
      ? {
          id: "",
          nome: service.clienteNome,
          rg: "",
          cpf: "",
          endereco: "",
          whatsapp: "",
        }
      : null,
  });
}
