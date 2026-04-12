import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;

if (!url) {
  throw new Error(
    "[DB] DATABASE_URL não está definida. Verifique o arquivo .env na raiz do projeto."
  );
}

const isRemote = url.startsWith("libsql://") || url.startsWith("https://");

const client = createClient({
  url,
  // authToken só é necessário para bancos remotos
  authToken: isRemote ? process.env.DATABASE_AUTH_TOKEN : undefined,
});

export const db = drizzle(client, { schema });
