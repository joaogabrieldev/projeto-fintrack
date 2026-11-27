import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/observability/logger";
import { metrics } from "@/lib/observability/metrics";
import "./types";

// Usuário inexistente e senha errada contam igual: a métrica não pode servir para descobrir e-mails cadastrados.
function recordFailedLogin() {
  metrics.authLoginAttemptsTotal.inc({ result: "invalid_credentials" });
  logger.warn("auth_login_failed", { reason: "invalid_credentials" });
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET,
  // Necessário atrás do proxy da Vercel (Host / X-Forwarded-*); evita 400 em fluxos de auth.
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          recordFailedLogin();
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        const user = await db.query.users.findFirst({
          where: eq(users.email, email),
        });

        if (!user) {
          recordFailedLogin();
          return null;
        }

        const isValid = await compare(password, user.passwordHash);

        if (!isValid) {
          recordFailedLogin();
          return null;
        }

        metrics.authLoginAttemptsTotal.inc({ result: "success" });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    // Erros de auth vão para /login com ?error= em vez de ficar em /api/auth/error (GET “nuo” lá retorna 400).
    error: "/login",
  },
});
