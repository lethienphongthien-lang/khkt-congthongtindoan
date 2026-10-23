import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { canUseTeamChat, channelMembers, recentMessages } from "@/lib/services/team-chat";
import { realtimePublic } from "@/lib/realtime";
import { ChatRoom } from "@/components/team-chat/chat-room";

export const metadata = { title: "Kênh chat Ban chấp hành & Bí thư" };
export const dynamic = "force-dynamic";

const CHAT_PAGE_SIZE = 20;

export default async function TeamChatPage() {
  const user = await requireUser();
  if (!canUseTeamChat(user)) notFound();
  const [initial, members] = await Promise.all([
    recentMessages(CHAT_PAGE_SIZE),
    channelMembers(),
  ]);
  return <ChatRoom me={{ id: user.id, role: user.role as "ADMIN" | "SECRETARY" }} initial={initial} members={members} pageSize={CHAT_PAGE_SIZE} realtime={realtimePublic()} />;
}
