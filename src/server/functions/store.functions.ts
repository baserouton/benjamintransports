import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { JsonValue } from "@/domain/models";

const currencySchema = z.enum(["SRD", "USD", "EUR"]);
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const optionalText = (max: number) => z.string().trim().max(max).optional();
const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ]),
);

export const loginFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      login: z.string().trim().min(1).max(80),
      password: z.string().min(8).max(200),
    }),
  )
  .handler(async ({ data }) => {
    const { loginHandler } = await import("./store.handlers.server");
    return loginHandler(data);
  });

export const logoutFn = createServerFn({ method: "POST" }).handler(async () => {
  const { logoutHandler } = await import("./store.handlers.server");
  return logoutHandler();
});

export const getCurrentUserFn = createServerFn({ method: "GET" }).handler(async () => {
  const { currentUserHandler } = await import("./store.handlers.server");
  return currentUserHandler();
});

export const getStoreFn = createServerFn({ method: "GET" }).handler(async () => {
  const { storeHandler } = await import("./store.handlers.server");
  return storeHandler();
});

export const uploadVehiclePhotosFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      images: z
        .array(z.string().startsWith("data:image/").max(7_500_000))
        .min(1)
        .max(10),
    }),
  )
  .handler(async ({ data }) => {
    const { uploadVehiclePhotosHandler } = await import("./store.handlers.server");
    return uploadVehiclePhotosHandler(data);
  });

export const createVehicleFn = createServerFn({ method: "POST" })
  .validator(
    z
      .object({
        modelo: z.string().trim().min(1).max(160),
        placa: z.string().trim().min(1).max(32),
        categoria: z.string().trim().min(1).max(80),
        fotos: z.array(z.string().max(500)).max(20).default([]),
        ano: z.number().int().min(1900).max(2200).optional(),
        disponivel: z.boolean().default(true),
        oculto: z.boolean().default(false),
        seguroFeito: z.boolean().default(false),
        seguroValidade: dateSchema.optional().or(z.literal("")),
        vistoriaFeita: z.boolean().default(false),
        vistoriaValidade: dateSchema.optional().or(z.literal("")),
        custoAquisicao: z.number().positive(),
        moedaAquisicao: z.enum(["SRD", "USD", "EUR"]),
      })
      .superRefine((data, ctx) => {
        if (data.seguroFeito && !data.seguroValidade) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Informe o vencimento do seguro",
            path: ["seguroValidade"],
          });
        }
        if (data.vistoriaFeita && !data.vistoriaValidade) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Informe o vencimento da vistoria",
            path: ["vistoriaValidade"],
          });
        }
      }),
  )
  .handler(async ({ data }) => {
    const { createVehicleHandler } = await import("./store.handlers.server");
    return createVehicleHandler({
      ...data,
      seguroValidade: data.seguroFeito ? data.seguroValidade || undefined : undefined,
      vistoriaValidade: data.vistoriaFeita ? data.vistoriaValidade || undefined : undefined,
    });
  });

export const updateVehicleFn = createServerFn({ method: "POST" })
  .validator(
    z
      .object({
        id: z.string().min(1).max(36),
        modelo: z.string().trim().min(1).max(160),
        placa: z.string().trim().min(1).max(32),
        categoria: z.string().trim().min(1).max(80),
        ano: z.number().int().min(1900).max(2200).optional(),
        seguroFeito: z.boolean(),
        seguroValidade: dateSchema.optional().or(z.literal("")),
        vistoriaFeita: z.boolean(),
        vistoriaValidade: dateSchema.optional().or(z.literal("")),
        custoAquisicao: z.number().positive().optional(),
        moedaAquisicao: z.enum(["SRD", "USD", "EUR"]).optional(),
        fotos: z.array(z.string().max(500)).max(20).optional(),
      })
      .superRefine((data, ctx) => {
        if (data.seguroFeito && !data.seguroValidade) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Informe o vencimento do seguro",
            path: ["seguroValidade"],
          });
        }
        if (data.vistoriaFeita && !data.vistoriaValidade) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Informe o vencimento da vistoria",
            path: ["vistoriaValidade"],
          });
        }
      }),
  )
  .handler(async ({ data }) => {
    const { updateVehicleHandler } = await import("./store.handlers.server");
    return updateVehicleHandler({
      ...data,
      seguroValidade: data.seguroFeito ? data.seguroValidade || undefined : undefined,
      vistoriaValidade: data.vistoriaFeita ? data.vistoriaValidade || undefined : undefined,
    });
  });

export const createVehicleCategoryFn = createServerFn({ method: "POST" })
  .validator(z.object({ nome: z.string().trim().min(1).max(80) }))
  .handler(async ({ data }) => {
    const { createVehicleCategoryHandler } = await import("./store.handlers.server");
    return createVehicleCategoryHandler(data);
  });

export const updateVehicleCategoryFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().min(1).max(36),
      nome: z.string().trim().min(1).max(80),
    }),
  )
  .handler(async ({ data }) => {
    const { updateVehicleCategoryHandler } = await import("./store.handlers.server");
    return updateVehicleCategoryHandler(data);
  });

export const hideVehicleFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1).max(36) }))
  .handler(async ({ data }) => {
    const { hideVehicleHandler } = await import("./store.handlers.server");
    return hideVehicleHandler(data);
  });

export const restoreVehicleFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1).max(36) }))
  .handler(async ({ data }) => {
    const { restoreVehicleHandler } = await import("./store.handlers.server");
    return restoreVehicleHandler(data);
  });

export const createClientFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      nome: z.string().trim().min(1).max(180),
      rg: z.string().trim().max(40),
      cpf: z.string().trim().max(40),
      endereco: z.string().trim().max(500),
      whatsapp: z.string().trim().max(40),
      email: z.string().trim().email().max(254).optional().or(z.literal("")),
      cnhUrl: optionalText(1000),
      suriname: z.boolean().optional(),
      passaporteUrl: optionalText(1000),
      identiteitskaartUrl: optionalText(1000),
    }),
  )
  .handler(async ({ data }) => {
    const { createClientHandler } = await import("./store.handlers.server");
    return createClientHandler(data);
  });

export const createRentalFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      veiculoId: z.string().min(1).max(36),
      clienteId: z.string().min(1).max(36),
      dataRetirada: dateSchema,
      dataSaida: dateSchema,
      valorAluguel: z.number().nonnegative(),
      moeda: currencySchema,
      seguroValor: z.number().nonnegative().optional(),
      seguroObs: optionalText(1000),
      caucaoValor: z.number().nonnegative().optional(),
      caucaoStatus: z.enum(["retido", "devolvido"]).optional(),
      vistoriaRetirada: z
        .object({
          tanque: z.boolean(),
          limpo: z.boolean(),
          semAvarias: z.boolean(),
          obs: z.string().max(2000),
        })
        .optional(),
      vistoriaDevolucao: z
        .object({
          tanque: z.boolean(),
          limpo: z.boolean(),
          semAvarias: z.boolean(),
          obs: z.string().max(2000),
          taxa: z.number().nonnegative(),
        })
        .optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { createRentalHandler } = await import("./store.handlers.server");
    return createRentalHandler(data);
  });

export const createMaintenanceFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      veiculoId: z.string().min(1).max(36),
      tipo: z.enum(["preventiva", "corretiva"]),
      pecas: z.string().trim().min(1).max(1000),
      custo: z.number().nonnegative(),
      moeda: currencySchema,
      data: dateSchema,
      obs: optionalText(2000),
    }),
  )
  .handler(async ({ data }) => {
    const { createMaintenanceHandler } = await import("./store.handlers.server");
    return createMaintenanceHandler(data);
  });

export const deliverRentalFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1).max(36) }))
  .handler(async ({ data }) => {
    const { deliverRentalHandler } = await import("./store.handlers.server");
    return deliverRentalHandler(data);
  });

export const returnRentalFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().min(1).max(36),
      inspection: z.object({
        tanque: z.boolean(),
        limpo: z.boolean(),
        semAvarias: z.boolean(),
        obs: z.string().max(2000),
        taxa: z.number().nonnegative(),
      }),
    }),
  )
  .handler(async ({ data }) => {
    const { returnRentalHandler } = await import("./store.handlers.server");
    return returnRentalHandler(data);
  });

export const createFinanceEntryFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      data: dateSchema,
      descricao: z.string().trim().min(1).max(500),
      valor: z.number().positive(),
      moeda: currencySchema,
      tipo: z.enum(["entrada", "despesa"]),
      categoria: z.enum([
        "aluguel",
        "taxa",
        "manutencao",
        "aquisicao",
        "seguro",
        "vistoria",
        "operacional",
        "outro",
      ]),
      veiculoId: z.string().min(1).max(36).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { createFinanceEntryHandler } = await import("./store.handlers.server");
    return createFinanceEntryHandler(data);
  });

export const deleteFinanceEntryFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1).max(36) }))
  .handler(async ({ data }) => {
    const { deleteFinanceEntryHandler } = await import("./store.handlers.server");
    return deleteFinanceEntryHandler(data);
  });

export const createActivityLogFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      acao: z.string().trim().min(1).max(1000),
      categoria: optionalText(80),
      pagina: optionalText(500),
      detalhes: z.record(z.string(), jsonValueSchema).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { activityLogHandler } = await import("./store.handlers.server");
    return activityLogHandler(data);
  });
