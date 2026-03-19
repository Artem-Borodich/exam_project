import { z } from "zod";

/**
 * Схема обязательных переменных окружения.
 * Google-интеграции допускают отсутствие env на старте (эндпоинты вернут ошибку при вызове),
 * но критичные значения для работы auth/DB должны быть заданы.
 */
const EnvSchema = z.object({
  DB_URL: z.string().min(1, "DB_URL is required"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET should be at least 16 chars"),

  FRONTEND_URL: z.string().optional(),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().optional(),

  GOOGLE_CALENDAR_ID: z.string().optional(),
  GOOGLE_SHEETS_ID: z.string().optional(),
  GOOGLE_SHEETS_RANGE: z.string().optional(),

  // Нужен для Docs (опционально). Если не задан, просто создаём doc в "My Drive".
  GOOGLE_DOCS_FOLDER_ID: z.string().optional(),
});

export type AppEnv = z.infer<typeof EnvSchema>;

export function getEnv(raw: NodeJS.ProcessEnv): AppEnv {
  const parsed = EnvSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join("; ");
    throw new Error(`Invalid environment variables: ${msg}`);
  }

  return {
    ...parsed.data,
    FRONTEND_URL: raw.FRONTEND_URL ?? "http://localhost:5173",
    GOOGLE_SHEETS_RANGE: raw.GOOGLE_SHEETS_RANGE ?? "Observations!A:C",
  };
}

export function requireGoogleEnv(env: AppEnv) {
  const missing: string[] = [];
  if (!env.GOOGLE_CLIENT_ID) missing.push("GOOGLE_CLIENT_ID");
  if (!env.GOOGLE_CLIENT_SECRET) missing.push("GOOGLE_CLIENT_SECRET");
  if (!env.GOOGLE_REDIRECT_URI) missing.push("GOOGLE_REDIRECT_URI");

  if (missing.length > 0) {
    throw new Error(`Missing Google OAuth env vars: ${missing.join(", ")}`);
  }

  return {
    clientId: env.GOOGLE_CLIENT_ID!,
    clientSecret: env.GOOGLE_CLIENT_SECRET!,
    redirectUri: env.GOOGLE_REDIRECT_URI!,
  };
}

