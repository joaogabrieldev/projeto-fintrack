import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { defineConfig } from "drizzle-kit";

// Carrega .env da raiz mesmo que o comando seja rodado de outro cwd (evita pull falhar sem mensagem clara).
loadEnv({ path: resolve(process.cwd(), ".env"), quiet: true });
loadEnv({ path: resolve(process.cwd(), ".env.local"), override: true, quiet: true });

function env(name: string): string | undefined {
  const t = process.env[name]?.trim();
  return t || undefined;
}

const databaseUrl = env("DATABASE_URL");
if (!databaseUrl) {
  throw new Error(
    "[drizzle] DATABASE_URL não definida. Crie um .env na raiz do projeto (veja .env.example) ou defina a variável no terminal."
  );
}

const authToken = env("DATABASE_AUTH_TOKEN");
const isRemote = databaseUrl.startsWith("libsql://") || databaseUrl.startsWith("https://");

if (isRemote && !authToken) {
  throw new Error(
    "[drizzle] DATABASE_AUTH_TOKEN é obrigatório para Turso remoto (libsql://). Crie um token no painel do Turso e coloque no .env."
  );
}

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: {
    url: databaseUrl,
    ...(authToken ? { authToken } : {}),
  },
});
