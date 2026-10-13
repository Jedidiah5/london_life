"use client";

import { useState } from "react";
import { broadcastChat } from "@/lib/net/realtime";
import { useGame } from "@/lib/store/useGame";
import { usePresence } from "@/lib/store/usePresence";

export function Messages() {
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
