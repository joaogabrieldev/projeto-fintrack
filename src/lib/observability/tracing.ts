import {
  isSpanContextValid,
  SpanStatusCode,
  trace,
  type Attributes,
  type Span,
} from "@opentelemetry/api";

// getTracer devolve um proxy: funciona mesmo antes do register() da instrumentação.
const tracer = trace.getTracer("fintrack");

export interface ActiveTraceContext {
  traceId: string;
  spanId: string;
}

// Sem SDK registrado (testes, OTel desligado) o span é "não gravável" e o id é inválido.
export function getActiveTraceContext(): ActiveTraceContext | undefined {
  const spanContext = trace.getActiveSpan()?.spanContext();

  if (!spanContext || !isSpanContextValid(spanContext)) {
    return undefined;
  }

  return { traceId: spanContext.traceId, spanId: spanContext.spanId };
}

export async function runInSpan<T>(
  name: string,
  attributes: Attributes,
  operation: (span: Span) => Promise<T>
): Promise<T> {
  return tracer.startActiveSpan(name, { attributes }, async (span) => {
    try {
      return await operation(span);
    } catch (error) {
      if (error instanceof Error) {
        span.recordException(error);
      }
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw error;
    } finally {
      span.end();
    }
  });
}
