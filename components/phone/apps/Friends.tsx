"use client";

import { useState } from "react";
import { addFriend, loadHome, sendGift } from "@/lib/net/rpc";
import { broadcastEmote } from "@/lib/net/realtime";
import { supabaseConfigured } from "@/lib/net/supabase";
import { useGame } from "@/lib/store/useGame";
import { usePresence } from "@/lib/store/usePresence";
import { useUi } from "@/lib/store/useUi";

export function Friends() {
  const friends = useGame((state) => state.friends);
  const simId = useGame((state) => state.simId);
  const invite = usePresence((state) => state.invite);
  const [username, setUsername] = useState("");
  const online = supabaseConfigured();

  if (!online) {
    return (
      <div className="space-y-2 rounded-2xl bg-white p-3 text-[12px] shadow-sm">
        <p className="font-bold">👥 Friends live in the online city</p>
        <p className="text-[#5c6b7a]">
          You&apos;re playing offline, so the people you meet are London locals. Wave at them at venues. Add Supabase
          keys to meet real players, send gifts and visit flats.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 text-xs">
      <form
        className="flex gap-1"
        onSubmit={(event) => {
          event.preventDefault();
          void addFriend(username.trim()).then((error) => {
            useUi.getState().pushToast(error ?? `Added ${username.trim()}`, error ? "bad" : "good");
            if (!error) setUsername("");
          });
        }}
      >
        <input
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="username"
          className="min-w-0 flex-1 rounded-full bg-white px-3 py-2 shadow-sm"
        />
        <button type="submit" className="rounded-full bg-[#1b2838] px-3 py-1 font-bold text-white">
          Add
        </button>
      </form>
      <button
        type="button"
        className="w-full rounded-full bg-white px-2 py-2 font-semibold shadow-sm"
        onClick={() => {
          if (simId) broadcastEmote("invite", simId);
          useUi.getState().pushToast("Invite sent to everyone here");
        }}
      >
        🏠 Invite people here to your flat
      </button>
      {invite ? (
        <button
          type="button"
          className="w-full rounded-2xl bg-[#c8102e] px-2 py-2 font-bold text-white"
          onClick={() => {
            void loadHome(invite.simId).then((error) => {
              if (error) useUi.getState().pushToast(error, "bad");
            });
          }}
        >
          Visit {invite.name}&apos;s flat
        </button>
      ) : null}
      {friends.map((friend) => (
        <div key={friend.simId} className="flex items-center gap-2 rounded-2xl bg-white p-2 shadow-sm">
          <div className="flex-1">
            <div className="font-bold">{friend.name}</div>
            <div className="text-[11px] text-[#5c6b7a]">@{friend.username}</div>
          </div>
          <button
            type="button"
            className="rounded-full bg-[#1b2838] px-2 py-1 text-white"
            onClick={() => {
              void loadHome(friend.simId).then((error) => {
                if (error) useUi.getState().pushToast(error, "bad");
              });
            }}
          >
            Visit
          </button>
          <button
            type="button"
            className="rounded-full bg-[#3ccf6e] px-2 py-1 text-white"
            onClick={() => {
              void sendGift(friend.simId, 500).then((error) => {
                useUi.getState().pushToast(error ?? "Sent £5", error ? "bad" : "good");
              });
            }}
          >
            🎁 £5
          </button>
        </div>
      ))}
    </div>
  );
}
