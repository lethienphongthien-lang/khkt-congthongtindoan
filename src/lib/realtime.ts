import "server-only";
import Pusher from "pusher";

/** Kênh thời gian thực (WSS) qua Pusher Channels. Chưa cấu hình khóa thì trả null: giao diện tự dùng cách hỏi lại định kỳ. */
export const realtimeConfigured = () => !!(process.env.PUSHER_APP_ID && process.env.PUSHER_KEY && process.env.PUSHER_SECRET && process.env.PUSHER_CLUSTER);

let client: Pusher | null = null;
export function getPusher(): Pusher | null {
  if (!realtimeConfigured()) return null;
  client ??= new Pusher({ appId: process.env.PUSHER_APP_ID!, key: process.env.PUSHER_KEY!, secret: process.env.PUSHER_SECRET!, cluster: process.env.PUSHER_CLUSTER!, useTLS: true });
  return client;
}

/** Thông tin công khai để trình duyệt kết nối (khóa public, không chứa secret). */
export const realtimePublic = () => (realtimeConfigured() ? { key: process.env.PUSHER_KEY!, cluster: process.env.PUSHER_CLUSTER! } : null);

export const TEAM_CHANNEL = "private-team-chat";

export async function publishTeamEvent(event: "message" | "update", payload: unknown) {
  const p = getPusher();
  if (!p) return;
  try { await p.trigger(TEAM_CHANNEL, event, payload); } catch (e) { console.error("[realtime]", e instanceof Error ? e.message : e); }
}
