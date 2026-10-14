"use client";

import { useEffect, useRef, useState } from "react";
import { Flag } from "@/components/Flag";
import { nationalitiesById, venuesById } from "@/lib/content";
import { loadThread, refreshInbox, sendDirect } from "@/lib/net/messages";
import { broadcastChat } from "@/lib/net/realtime";
import { supabaseConfigured } from "@/lib/net/supabase";
import type { Appearance } from "@/lib/sim/types";
import { useGame } from "@/lib/store/useGame";
import { useMessages, type Conversation } from "@/lib/store/useMessages";
import { usePresence } from "@/lib/store/usePresence";
import { useUi } from "@/lib/store/useUi";

function Face({ look, small = false }: { look: Appearance; small?: boolean }) {
  return (
    <span className={`relative shrink-0 ${small ? "h-8 w-8" : "h-10 w-10"}`}>
      <span
        className="block h-full w-full rounded-full border-2 border-white shadow-sm"
        style={{ background: `radial-gradient(circle at 50% 38%, ${look.skin} 0 38%, ${look.top} 39%)` }}
      />
      {nationalitiesById[look.origin] ? (
        <span className="absolute -bottom-1 -right-1 flex rounded-full bg-white p-0.5 shadow">
          <Flag origin={look.origin} />
        </span>
      ) : null}
    </span>
  );
}

function when(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString("en-GB", { weekday: "short" });
}

function metLine(conversation: Conversation): string {
  if (conversation.metWhere) return `Met at ${venuesById[conversation.metWhere]?.name ?? "a venue"}`;
  return conversation.friend ? "Friend" : "";
}

function ChatList() {
  const conversations = useMessages((state) => state.conversations);
  useEffect(() => {
    void refreshInbox();
  }, []);

  if (conversations.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-3 text-[12px] shadow-sm">
        <p className="font-bold">💬 No chats yet</p>
        <p className="mt-1 text-[#5c6b7a]">
          Go to a venue when other players are there. Anyone you share a room with shows up here, so you can message
          them later from anywhere in London.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-black/5 overflow-hidden rounded-2xl bg-white shadow-sm">
      {conversations.map((conversation) => (
        <li key={conversation.simId}>
          <button
            type="button"
            className="flex w-full items-center gap-2.5 px-2.5 py-2 text-left active:bg-black/5"
            onClick={() => {
              useMessages.getState().setThreadWith(conversation.simId);
              void loadThread(conversation.simId);
            }}
          >
            <Face look={conversation.appearance} />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1">
                <span className="truncate text-[13px] font-bold">{conversation.name}</span>
                {conversation.outNow ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#3ccf6e]" /> : null}
                <span className="ml-auto shrink-0 text-[10px] text-[#8a96a3]">{when(conversation.lastAt)}</span>
              </span>
              <span
                className={`block truncate text-[11px] ${conversation.unread > 0 ? "font-semibold text-[#1b2838]" : "text-[#5c6b7a]"}`}
              >
                {conversation.lastBody
                  ? `${conversation.lastFromMe ? "You: " : ""}${conversation.lastBody}`
                  : `${metLine(conversation)} · say hi`}
              </span>
            </span>
            {conversation.unread > 0 ? (
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#007aff] px-1 text-[10px] font-bold text-white">
                {conversation.unread}
              </span>
            ) : null}
          </button>
        </li>
      ))}
    </ul>
  );
}

function Thread({ simId }: { simId: string }) {
  const conversation = useMessages((state) => state.conversations.find((entry) => entry.simId === simId));
  const thread = useMessages((state) => state.thread);
  const loaded = useMessages((state) => state.threadLoaded);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = window.setInterval(() => void loadThread(simId), 8000);
    return () => window.clearInterval(id);
  }, [simId]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [thread.length]);

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    const error = await sendDirect(simId, body);
    setSending(false);
    if (error) {
      useUi.getState().pushToast(error, "bad");
      return;
    }
    setText("");
    useGame.getState().bumpNeeds({ social: 2 });
  };

  return (
    <div className="-m-3 flex h-[calc(100%+1.5rem)] flex-col">
      <div className="flex items-center gap-2 border-b border-black/5 bg-white px-2 py-1.5">
        <button
          type="button"
          aria-label="Back to chats"
          className="px-1 text-lg leading-none text-[#007aff]"
          onClick={() => useMessages.getState().setThreadWith(null)}
        >
          ‹
        </button>
        {conversation ? <Face look={conversation.appearance} small /> : null}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-bold">{conversation?.name ?? "Chat"}</span>
          <span className="block truncate text-[10px] text-[#5c6b7a]">
            {conversation ? `@${conversation.username} · ${metLine(conversation)}` : ""}
          </span>
        </span>
      </div>
      <div className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {thread.length === 0 ? (
          <p className="pt-4 text-center text-[11px] text-[#8a96a3]">
            {loaded ? "No messages yet. Say hello." : "Loading…"}
          </p>
        ) : null}
        {thread.map((message) => (
          <div key={message.id} className={`flex ${message.fromMe ? "justify-end" : "justify-start"}`}>
            <p
              className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3 py-1.5 text-[12px] ${
                message.fromMe ? "bg-[#007aff] text-white" : "bg-white shadow-sm"
              }`}
            >
              {message.body}
            </p>
          </div>
        ))}
        <div ref={bottom} />
      </div>
      <form
        className="flex gap-1 border-t border-black/5 bg-white p-2"
        onSubmit={(event) => {
          event.preventDefault();
          void send();
        }}
      >
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={280}
          placeholder="Message"
          className="min-w-0 flex-1 rounded-full bg-[#f2f2f7] px-3 py-1.5 text-[12px]"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="rounded-full bg-[#007aff] px-3 py-1 text-[12px] font-bold text-white disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  );
}

function HereChat() {
  const chat = usePresence((state) => state.chat);
  const name = useGame((state) => state.name);
  const [text, setText] = useState("");
  return (
    <div className="flex h-full flex-col gap-2 text-xs">
      <div className="flex-1 space-y-1.5 overflow-y-auto">
        {chat.length === 0 ? <p className="text-[#5c6b7a]">No messages yet. Say something at a venue.</p> : null}
        {chat.map((line) => {
          const mine = line.from === name;
          return (
            <div key={line.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <p
                className={`max-w-[80%] rounded-2xl px-3 py-1.5 ${mine ? "bg-[#2459c7] text-white" : "bg-white shadow-sm"}`}
              >
                {mine ? null : <span className="block text-[10px] font-bold text-[#5c6b7a]">{line.from}</span>}
                {line.text}
              </p>
            </div>
          );
        })}
      </div>
      <form
        className="flex gap-1"
        onSubmit={(event) => {
          event.preventDefault();
          broadcastChat(text);
          useGame.getState().bumpNeeds({ social: 2 });
          setText("");
        }}
      >
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={140}
          placeholder="Mind the gap"
          className="min-w-0 flex-1 rounded-full bg-white px-3 py-2 shadow-sm"
        />
        <button type="submit" className="rounded-full bg-[#2459c7] px-3 py-1 font-bold text-white">
          Send
        </button>
      </form>
    </div>
  );
}

export function Messages() {
  const threadWith = useMessages((state) => state.threadWith);
  const [tab, setTab] = useState<"chats" | "here">("chats");
  const online = supabaseConfigured();

  if (threadWith && online) return <Thread simId={threadWith} />;

  return (
    <div className="flex h-full flex-col gap-2 text-xs">
      <div className="grid grid-cols-2 rounded-full bg-[#e4e4ea] p-0.5 text-[11px] font-semibold">
        {(["chats", "here"] as const).map((id) => (
          <button
            key={id}
            type="button"
            className={`rounded-full py-1 ${tab === id ? "bg-white shadow-sm" : "text-[#5c6b7a]"}`}
            onClick={() => setTab(id)}
          >
            {id === "chats" ? "Chats" : "Here now"}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === "here" ? (
          <HereChat />
        ) : online ? (
          <ChatList />
        ) : (
          <p className="rounded-2xl bg-white p-3 text-[12px] text-[#5c6b7a] shadow-sm">
            Chats with other players need you online.
          </p>
        )}
      </div>
    </div>
  );
}
