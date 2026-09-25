// WebSocket endpoint on Vercel (Fluid compute). Locally, server.ts serves /api/ws before Next sees it.
// Connections close when the function reaches maxDuration (300 s on Hobby); clients reconnect and refetch.
import { experimental_upgradeWebSocket } from "@vercel/functions";
import { getSessionUser } from "@/lib/auth";
import { addConnection } from "@/lib/realtime/hub";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET() {
  if (!process.env.VERCEL) return new Response("WebSockets are served by server.ts locally", { status: 426 });
  const user = await getSessionUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  return experimental_upgradeWebSocket(
    (ws) => addConnection(ws, { id: user.id, role: user.role, firstName: user.firstName }),
    { maxPayload: 64 * 1024 },
  );
}
