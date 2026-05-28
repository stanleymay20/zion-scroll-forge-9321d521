import 'dotenv/config';
import { z } from 'zod';

const Env = z.object({
  PORT: z.coerce.number().int().positive().default(8080),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  LECTURER_WORKER_KEY: z.string().min(8, 'LECTURER_WORKER_KEY is required'),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  TTS_PROVIDER: z.enum(['elevenlabs', 'text']).default('elevenlabs'),
  ELEVENLABS_API_KEY: z.string().optional(),
  ELEVENLABS_DEFAULT_VOICE_ID: z.string().default('JBFqnCBsd6RMkjVDRZzb'),
  ELEVENLABS_MODEL_ID: z.string().default('eleven_turbo_v2_5'),
  LOVABLE_API_KEY: z.string().optional(),
  LECTURER_MODEL: z.string().default('google/gemini-3-flash-preview'),
  MAX_SESSION_SECONDS: z.coerce.number().int().positive().default(5400),
});

export const config = Env.parse(process.env);

export type AppConfig = typeof config;
