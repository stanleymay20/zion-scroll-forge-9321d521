import { config } from './config.js';

type Level = 'debug' | 'info' | 'warn' | 'error';
const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function emit(level: Level, msg: string, fields?: Record<string, unknown>) {
  if (ORDER[level] < ORDER[config.LOG_LEVEL]) return;
  const line = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...(fields ?? {}),
  };
  // Structured single-line JSON for log aggregators.
  const out = JSON.stringify(line);
  if (level === 'error') process.stderr.write(out + '\n');
  else process.stdout.write(out + '\n');
}

export const log = {
  debug: (msg: string, f?: Record<string, unknown>) => emit('debug', msg, f),
  info: (msg: string, f?: Record<string, unknown>) => emit('info', msg, f),
  warn: (msg: string, f?: Record<string, unknown>) => emit('warn', msg, f),
  error: (msg: string, f?: Record<string, unknown>) => emit('error', msg, f),
  child: (base: Record<string, unknown>) => ({
    debug: (m: string, f?: Record<string, unknown>) => emit('debug', m, { ...base, ...f }),
    info: (m: string, f?: Record<string, unknown>) => emit('info', m, { ...base, ...f }),
    warn: (m: string, f?: Record<string, unknown>) => emit('warn', m, { ...base, ...f }),
    error: (m: string, f?: Record<string, unknown>) => emit('error', m, { ...base, ...f }),
  }),
};

export type Logger = ReturnType<typeof log.child> | typeof log;
