import { normaliseAppearance } from "@/lib/sim/appearance";
import { useMessages, type Conversation, type DirectMessage } from "@/lib/store/useMessages";
import { useUi } from "@/lib/store/useUi";
import { num, record, str } from "./parse";
import { getSupabase, supabaseConfigured } from "./supabase";

type Row = Record<string, unknown>;

async function call(fn: string, args: Row = {}): Promise<{ data: unknown; error: string | null }> {
  const supabase = getSupabase();
  if (!supabase || !supabaseConfigured()) return { data: null, error: "Messages need you online" };
  const result = await supabase.rpc(fn, args);
  return { data: result.data, error: result.error?.message ?? null };
}

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.flatMap((entry) => (record(entry) ? [entry as Row] : [])) : [];
}

function conversationOf(row: Row): Conversation {
  return {
    simId: str(row.sim_id),
    name: str(row.name, "Londoner"),
    username: str(row.username),
    appearance: normaliseAppearance(row.appearance),
    metWhere: typeof row.met_where === "string" ? row.met_where : null,
    friend: row.friend === true,
    outNow: row.out_now === true,
    lastBody: typeof row.last_body === "string" ? row.last_body : null,
    lastFromMe: row.last_from_me === true,
    lastAt: typeof row.last_at === "string" ? row.last_at : null,
    unread: num(row.unread),
  };
}

function messageOf(row: Row): DirectMessage {
  return {
    id: num(row.id),
    fromMe: row.from_me === true,
    body: str(row.body),
    createdAt: str(row.created_at, new Date().toISOString()),
  };
}

/** Records that we shared a venue with another player. Returns their name if this is the first time. */
export async function meetPlayer(simId: string): Promise<{ fresh: boolean; name: string } | null> {
  const result = await call("meet", { p_other: simId });
  const row = record(result.data);
  if (result.error || !row) return null;
  return { fresh: row.new === true, name: str(row.name) };
}

export async function refreshInbox(): Promise<void> {
  const result = await call("get_inbox");
  if (result.error) return;
  useMessages.getState().setConversations(rows(result.data).map(conversationOf));
}

export async function loadThread(simId: string): Promise<string | null> {
  const result = await call("get_thread", { p_with: simId });
  if (result.error) return result.error;
  if (useMessages.getState().threadWith !== simId) return null;
  useMessages.getState().setThread(rows(result.data).map(messageOf));
  const conversations = useMessages.getState().conversations;
  if (conversations.some((entry) => entry.simId === simId && entry.unread > 0)) {
    useMessages
      .getState()
      .setConversations(conversations.map((entry) => (entry.simId === simId ? { ...entry, unread: 0 } : entry)));
  }
  return null;
}

/** Opens the phone straight onto a conversation. */
export function openConversation(simId: string): void {
  useMessages.getState().setThreadWith(simId);
  useUi.getState().openPhone("messages");
  void loadThread(simId);
}

export async function sendDirect(simId: string, body: string): Promise<string | null> {
  const result = await call("send_message", { p_to: simId, p_body: body });
  const row = record(result.data);
  if (result.error || !row) return result.error ?? "Message not sent";
  const message = messageOf(row);
  const state = useMessages.getState();
  if (state.threadWith === simId) state.appendToThread(message);
  state.setConversations(
    state.conversations.map((entry) =>
      entry.simId === simId
        ? { ...entry, lastBody: message.body, lastFromMe: true, lastAt: message.createdAt }
        : entry,
    ),
  );
  return null;
}

/** Each subscription needs its own topic: `channel()` hands back an existing channel with the same name, which a stale cleanup may be about to remove. */
let listeners = 0;

/** Pushes new messages to the recipient as they are written. Row-level security limits each player to their own. */
export async function listenForMessages(): Promise<() => void> {
  const supabase = getSupabase();
  if (!supabase || !supabaseConfigured()) return () => {};
  const { data } = await supabase.auth.getSession();
  const owner = data.session?.user.id;
  if (!owner) return () => {};

  listeners += 1;
  const channel = supabase
    .channel(`dm:${owner}:${listeners}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `to_owner=eq.${owner}` },
      ({ new: row }) => {
        const from = str((row as Row).from_sim);
        const body = str((row as Row).body);
        const ui = useUi.getState();
        const state = useMessages.getState();
        const reading = ui.nav === "phone" && ui.phoneApp === "messages" && state.threadWith === from;
        if (reading) {
          state.appendToThread(messageOf({ ...(row as Row), from_me: false }));
          void loadThread(from);
          return;
        }
        void refreshInbox().then(() => {
          const sender = useMessages.getState().conversations.find((entry) => entry.simId === from);
          ui.pushToast(`💬 ${sender?.name ?? "New message"}: ${body.slice(0, 60)}`);
        });
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
