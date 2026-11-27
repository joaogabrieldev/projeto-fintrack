import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { BatchLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { registerOTel } from "@vercel/otel";
import { logger } from "./logger";
import { observabilityEnv } from "./observability-env";

/**
 * Registra o SDK do OpenTelemetry. Sempre registramos o provider de traces para que
 * os logs carreguem trace_id mesmo sem collector; os exporters OTLP só entram quando
 * OTEL_EXPORTER_OTLP_ENDPOINT está definido, para não tentar enviar a um endereço inexistente.
 */
export function startTelemetry() {
  const isOtlpExportEnabled = Boolean(observabilityEnv.OTEL_EXPORTER_OTLP_ENDPOINT);

  registerOTel({
    serviceName: observabilityEnv.OTEL_SERVICE_NAME,
    // O @vercel/otel marca cloud.provider=vercel em qualquer ambiente; fora da Vercel
    // (Docker, pnpm dev) isso engana quem investiga. Atributo undefined é descartado.
    attributes: process.env.VERCEL
      ? undefined
      : { "cloud.provider": undefined, "vercel.runtime": undefined },
    // O exporter de logs lê OTEL_EXPORTER_OTLP_ENDPOINT e acrescenta /v1/logs.
    logRecordProcessors: isOtlpExportEnabled
      ? [new BatchLogRecordProcessor({ exporter: new OTLPLogExporter() })]
      : undefined,
  });

  logger.info("telemetry_started", {
    otlp_export_enabled: isOtlpExportEnabled,
    otlp_endpoint: observabilityEnv.OTEL_EXPORTER_OTLP_ENDPOINT,
  });
}
