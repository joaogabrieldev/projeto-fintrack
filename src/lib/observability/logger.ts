import { logs, SeverityNumber, type AnyValueMap } from "@opentelemetry/api-logs";
import { observabilityEnv, type LOG_LEVELS } from "./observability-env";
import { getActiveTraceContext } from "./tracing";

export type LogLevel = Exclude<(typeof LOG_LEVELS)[number], "silent">;
export type LogFields = Record<string, unknown>;

const LOG_LEVEL_PRIORITY: Record<(typeof LOG_LEVELS)[number], number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: Number.POSITIVE_INFINITY,
};

const SEVERITY_NUMBERS: Record<LogLevel, SeverityNumber> = {
  debug: SeverityNumber.DEBUG,
  info: SeverityNumber.INFO,
  warn: SeverityNumber.WARN,
  error: SeverityNumber.ERROR,
};

// Nunca registrar senhas, tokens, chaves Pix ou dados pessoais desnecessários:
// a chave é mascarada em qualquer nível do objeto, mesmo que alguém a passe por engano.
const SENSITIVE_KEY_PATTERN =
  /password|passwd|secret|token|authorization|cookie|credential|api[-_]?key|cpf|pix|email/i;
const REDACTED_VALUE = "[REDACTED]";
const MAX_DEPTH = 5;
// As primeiras linhas localizam o erro; o resto são frames internos do Next (~3 KB por log).
const MAX_STACK_LINES = 8;

const SERVICE_NAME = observabilityEnv.OTEL_SERVICE_NAME;
const MINIMUM_PRIORITY = LOG_LEVEL_PRIORITY[observabilityEnv.LOG_LEVEL];

// Proxy do api-logs: só exporta via OTLP depois que a instrumentação registra o provider.
const otelLogger = logs.getLogger("fintrack");

function serializeError(error: Error): Record<string, unknown> {
  return {
    name: error.name,
    message: error.message,
    // a stack fica só no log do servidor; respostas HTTP nunca recebem esse campo
    stack: error.stack?.split("\n").slice(0, MAX_STACK_LINES).join("\n"),
  };
}

function sanitizeValue(value: unknown, depth: number, seen: WeakSet<object>): unknown {
  // undefined some do JSON, como em qualquer JSON.stringify
  if (value === null || value === undefined) return value;
  if (typeof value === "bigint") return value.toString();
  if (typeof value !== "object") return typeof value === "function" ? undefined : value;
  if (value instanceof Date) return value.toISOString();
  if (seen.has(value)) return "[Circular]";
  if (depth >= MAX_DEPTH) return "[Truncated]";

  seen.add(value);

  if (value instanceof Error) {
    return sanitizeValue(serializeError(value), depth + 1, seen);
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, depth + 1, seen));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    sanitized[key] = SENSITIVE_KEY_PATTERN.test(key)
      ? REDACTED_VALUE
      : sanitizeValue(nestedValue, depth + 1, seen);
  }
  return sanitized;
}

export function redactLogFields(fields: LogFields): Record<string, unknown> {
  return sanitizeValue(fields, 0, new WeakSet()) as Record<string, unknown>;
}

function writeLog(level: LogLevel, event: string, fields: LogFields = {}) {
  if (LOG_LEVEL_PRIORITY[level] < MINIMUM_PRIORITY) return;

  const traceContext = getActiveTraceContext();
  const safeFields = redactLogFields(fields);

  const record = {
    timestamp: new Date().toISOString(),
    level: level.toUpperCase(),
    service: SERVICE_NAME,
    event,
    ...(traceContext && { trace_id: traceContext.traceId, span_id: traceContext.spanId }),
    ...safeFields,
  };

  const line = JSON.stringify(record);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);

  // trace_id e span_id do registro OTLP vêm do contexto ativo, preenchidos pelo SDK.
  otelLogger.emit({
    severityNumber: SEVERITY_NUMBERS[level],
    severityText: record.level,
    body: event,
    attributes: { event, ...safeFields } as AnyValueMap,
  });
}

export const logger = {
  debug: (event: string, fields?: LogFields) => writeLog("debug", event, fields),
  info: (event: string, fields?: LogFields) => writeLog("info", event, fields),
  warn: (event: string, fields?: LogFields) => writeLog("warn", event, fields),
  error: (event: string, fields?: LogFields) => writeLog("error", event, fields),
};
