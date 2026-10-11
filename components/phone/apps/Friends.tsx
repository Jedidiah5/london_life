"use client";

import { useState } from "react";
import { addFriend, loadHome, sendGift } from "@/lib/net/rpc";
import { broadcastEmote } from "@/lib/net/realtime";
import { useGame } from "@/lib/store/useGame";
import { usePresence } from "@/lib/store/usePresence";
import { useUi } from "@/lib/store/useUi";

export function Friends() {
  const friends = useGame((state) => state.friends);
  const cloud = useGame((state) => state.cloud);
  const simId = useGame((state) => state.simId);
  const invite = usePresence((state) => state.invite);
  const [username, setUsername] = useState("");
  const [gift, setGift] = useState("500");

  return (
    <div className="space-y-2 text-xs">
      <form
        className="flex gap-1"
        onSubmit={(event) => {
          event.preventDefault();
          if (!cloud) {
            useUi.getState().pushToast("Connect Supabase to add friends");
            return;
          }
          void addFriend(username.trim()).then((error) => {
            useUi.getState().pushToast(error ?? `Added ${username.trim()}`);
            if (!error) setUsername("");
          });
        }}
      >
        <input
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="username"
          className="min-w-0 flex-1 rounded-full bg-white px-3 py-1"
        />
        <button type="submit" className="rounded-full bg-[#1b2838] px-3 py-1 text-[#f4efe6]">
          Add
        </button>
      </form>
      <div className="flex gap-1">
        <button type="button" className="rounded-full bg-white px-2 py-1" onClick={() => broadcastEmote("wave")}>
          Wave
        </button>
        <button type="button" className="rounded-full bg-white px-2 py-1" onClick={() => broadcastEmote("compliment")}>
          Compliment
        </button>
        <button
          type="button"
          className="rounded-full bg-white px-2 py-1"
          onClick={() => {
            if (simId) broadcastEmote("invite", simId);
          }}
        >
          Invite home
        </button>
      </div>
      {invite ? (
        <button
          type="button"
          className="rounded-xl bg-[#c8102e] px-2 py-1 text-white"
          onClick={() => {
            void loadHome(invite.simId).then((error) => {
              if (error) useUi.getState().pushToast(error);
            });
          }}
        >
          Visit {invite.name}
        </button>
      ) : null}
      {friends.map((friend) => (
        <div key={friend.simId} className="rounded-xl bg-white p-2">
          <div className="font-semibold">{friend.name}</div>
          <div className="text-[11px] text-[#5c6b7a]">@{friend.username}</div>
          <div className="mt-1 flex gap-1">
            <button
              type="button"
              className="rounded-full bg-[#1b2838] px-2 py-1 text-[#f4efe6]"
              onClick={() => {
                void loadHome(friend.simId).then((error) => {
                  if (error) useUi.getState().pushToast(error);
                });
              }}
            >
              Visit
            </button>
            <button
              type="button"
              className="rounded-full bg-[#2f6b4f] px-2 py-1 text-white"
              onClick={() => {
                const pence = Number(gift);
                void sendGift(friend.simId, pence).then((error) => {
                  useUi.getState().pushToast(error ?? "Gift sent");
                });
              }}
            >
              Gift £{(Number(gift) / 100).toFixed(0)}
            </button>
          </div>
        </div>
      ))}
      <label className="block text-[11px] text-[#5c6b7a]">
        Gift pence
        <input value={gift} onChange={(event) => setGift(event.target.value)} className="mt-1 w-full rounded-full bg-white px-3 py-1" />
      </label>
    </div>
  );
}
