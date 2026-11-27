import { handlers } from "@/lib/auth";
import { instrumentRouteHandler } from "@/lib/observability/instrument-route-handler";

// Login, logout e sessão também contam no tráfego, na latência e nos erros da API.
export const GET = instrumentRouteHandler("/api/auth/[...nextauth]", handlers.GET);
export const POST = instrumentRouteHandler("/api/auth/[...nextauth]", handlers.POST);
