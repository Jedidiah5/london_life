"use client";

import { useState } from "react";
import { broadcastChat } from "@/lib/net/realtime";
import { useGame } from "@/lib/store/useGame";
import { usePresence } from "@/lib/store/usePresence";

export function Messages() {
  const chat = usePresence((state) => state.chat);
  const [text, setText] = useState("");
  return (
    <div className="space-y-2 text-xs">
      <div className="max-h-40 space-y-1 overflow-y-auto">
        {chat.length === 0 ? <p className="text-[#5c6b7a]">No messages yet. Say something in a venue.</p> : null}
        {chat.map((line) => (
          <p key={line.id}>
            <span className="font-semibold">{line.from}: </span>
            {line.text}
          </p>
        ))}
      </div>
      <form
        className="flex gap-1"
        onSubmit={(event) => {
          event.preventDefault();
          broadcastChat(text);
          useGame.getState().bumpSocial(4);
          setText("");
        }}
      >
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={140}
          placeholder="Mind the gap"
          className="min-w-0 flex-1 rounded-full bg-white px-3 py-1"
        />
        <button type="submit" className="rounded-full bg-[#1b2838] px-3 py-1 text-[#f4efe6]">
          Send
        </button>
      </form>
    </div>
  );
}
