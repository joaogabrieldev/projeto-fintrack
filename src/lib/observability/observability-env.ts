import { z } from "zod";

export const LOG_LEVELS = ["debug", "info", "warn", "error", "silent"] as const;

// `VAR=` vazio no .env chega como "" e quebraria z.url(); tratamos como ausente.
function emptyToUndefined(value: unknown) {
  return value === "" ? undefined : value;
}

const observabilityEnvSchema = z.object({
  LOG_LEVEL: z.preprocess(
    (value) => (typeof value === "string" ? value.toLowerCase() : emptyToUndefined(value)),
    z.enum(LOG_LEVELS).default("info")
  ),
  OTEL_SERVICE_NAME: z.preprocess(emptyToUndefined, z.string().min(1).default("fintrack")),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.preprocess(emptyToUndefined, z.url().optional()),
  // Mínimo de 16 caracteres para não aceitar um token fácil de adivinhar.
  METRICS_TOKEN: z.preprocess(emptyToUndefined, z.string().min(16).optional()),
  DB_SLOW_QUERY_MS: z.preprocess(emptyToUndefined, z.coerce.number().int().positive().default(500)),
});

export type ObservabilityEnv = z.infer<typeof observabilityEnvSchema>;

function parseObservabilityEnv(): ObservabilityEnv {
  const result = observabilityEnvSchema.safeParse(process.env);

  if (!result.success) {
    // Falha na inicialização, não no primeiro log: configuração errada aparece no deploy.
    throw new Error(
      `[observabilidade] Variáveis de ambiente inválidas:\n${z.prettifyError(result.error)}`
    );
  }

  return result.data;
}

export const observabilityEnv = parseObservabilityEnv();
