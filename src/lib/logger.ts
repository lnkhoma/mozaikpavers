type Level = "debug" | "info" | "warn" | "error";

const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const threshold = ORDER[(process.env.LOG_LEVEL as Level) ?? "info"] ?? ORDER.info;

/** Keys whose values must never reach the logs. */
const REDACT = /pass(word)?|token|secret|authorization|cookie|api[-_]?key/i;

function serialise(value: unknown, depth = 0): unknown {
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack?.split("\n").slice(0, 6).join("\n") };
  }
  if (value && typeof value === "object" && depth < 4) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = REDACT.test(k) ? "[redacted]" : serialise(v, depth + 1);
    }
    return out;
  }
  return value;
}

function write(level: Level, event: string, context?: Record<string, unknown>) {
  if (ORDER[level] < threshold) return;
  const entry = JSON.stringify({
    time: new Date().toISOString(),
    level,
    event,
    ...(context ? (serialise(context) as object) : {}),
  });
  if (level === "error") console.error(entry);
  else if (level === "warn") console.warn(entry);
  else console.log(entry);
}

/** Minimal structured JSON logger (stdout), friendly to any log collector. */
export const logger = {
  debug: (event: string, context?: Record<string, unknown>) => write("debug", event, context),
  info: (event: string, context?: Record<string, unknown>) => write("info", event, context),
  warn: (event: string, context?: Record<string, unknown>) => write("warn", event, context),
  error: (event: string, context?: Record<string, unknown>) => write("error", event, context),
};
