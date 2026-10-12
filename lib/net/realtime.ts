import type { RealtimeChannel } from "@supabase/supabase-js";
import { defaultAppearance, normaliseAppearance } from "@/lib/sim/appearance";
import { SHARD_SIZE } from "@/lib/sim/constants";
import type { Appearance, Tile } from "@/lib/sim/types";
import { usePresence, type RemotePlayer } from "@/lib/store/usePresence";
import { useGame } from "@/lib/store/useGame";
import { getSupabase } from "./supabase";

let venueChannel: RealtimeChannel | null = null;
let onlineChannel: RealtimeChannel | null = null;
let venueShard = 1;
let joinedLocation = "";

interface TrackPayload {
  simId: string;
  name: string;
  appearance: Appearance;
  x: number;
  y: number;
}

function asTrack(value: unknown): TrackPayload | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const appearance = row.appearance;
  if (typeof row.simId !== "string" || typeof row.name !== "string")
    return null;
  if (!appearance || typeof appearance !== "object") return null;
  const look = normaliseAppearance(appearance);
  return {
    simId: row.simId,
    name: row.name,
    appearance: look,
    x: typeof row.x === "number" ? row.x : 2,
    y: typeof row.y === "number" ? row.y : 2,
  };
}

function readHere(channel: RealtimeChannel, selfId: string): RemotePlayer[] {
  const state = channel.presenceState<TrackPayload>();
  const players: RemotePlayer[] = [];
  for (const entries of Object.values(state)) {
    const first = entries[0];
    const track = asTrack(first);
    if (!track || track.simId === selfId) continue;
    players.push({ ...track, emote: null, emoteUntil: 0 });
  }
  return players;
}

export async function leaveWorld(): Promise<void> {
  const supabase = getSupabase();
  if (venueChannel) {
    await supabase?.removeChannel(venueChannel);
    venueChannel = null;
  }
  if (onlineChannel) {
    await supabase?.removeChannel(onlineChannel);
    onlineChannel = null;
  }
  joinedLocation = "";
  usePresence.getState().clear();
}

async function joinShard(
  location: string,
  shard: number,
  self: TrackPayload,
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  if (venueChannel) await supabase.removeChannel(venueChannel);
  const channel = supabase.channel(`venue:${location}:${shard}`, {
    config: { presence: { key: self.simId } },
  });
  venueChannel = channel;
  venueShard = shard;

  channel.on("presence", { event: "sync" }, () => {
    const here = readHere(channel, self.simId);
    if (here.length >= SHARD_SIZE && shard === 1) {
      void joinShard(location, 2, self);
      return;
    }
    usePresence.getState().setHere(here);
  });

  channel.on("broadcast", { event: "pos" }, ({ payload }) => {
    const track = asTrack(payload);
    if (!track || track.simId === self.simId) return;
    const existing = usePresence
      .getState()
      .here.find((player) => player.simId === track.simId);
    usePresence.getState().upsert({
      ...track,
      emote: existing?.emote ?? null,
      emoteUntil: existing?.emoteUntil ?? 0,
    });
  });

  channel.on("broadcast", { event: "chat" }, ({ payload }) => {
    if (!payload || typeof payload !== "object") return;
    const row = payload as Record<string, unknown>;
    if (
      typeof row.text !== "string" ||
      typeof row.name !== "string" ||
      typeof row.simId !== "string"
    )
      return;
    if (row.simId === self.simId) return;
    const text = row.text.slice(0, 140);
    usePresence.getState().pushChat({
      id: `${row.simId}-${Date.now()}`,
      from: row.name,
      simId: row.simId,
      text,
      at: Date.now(),
    });
    const existing = usePresence
      .getState()
      .here.find((player) => player.simId === row.simId);
    usePresence.getState().upsert({
      simId: row.simId,
      name: row.name,
      appearance: existing?.appearance ?? self.appearance,
      x: existing?.x ?? 2,
      y: existing?.y ?? 2,
      emote: text.slice(0, 42),
      emoteUntil: Date.now() + 4000,
    });
  });

  channel.on("broadcast", { event: "emote" }, ({ payload }) => {
    if (!payload || typeof payload !== "object") return;
    const row = payload as Record<string, unknown>;
    if (
      typeof row.simId !== "string" ||
      typeof row.kind !== "string" ||
      typeof row.name !== "string"
    )
      return;
    if (row.kind === "invite" && typeof row.homeSimId === "string") {
      usePresence
        .getState()
        .setInvite({ simId: row.homeSimId, name: row.name });
    }
    usePresence.getState().upsert({
      simId: row.simId,
      name: row.name,
      appearance: self.appearance,
      x: 2,
      y: 2,
      emote:
        row.kind === "wave"
          ? "waves"
          : row.kind === "compliment"
            ? "nice coat"
            : "come over",
      emoteUntil: Date.now() + 2500,
    });
  });

  channel.subscribe(async (status) => {
    if (status === "SUBSCRIBED") await channel.track(self);
  });
}

export async function joinWorld(
  self: TrackPayload,
  location: string,
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  if (joinedLocation === location && venueChannel && onlineChannel) {
    await venueChannel.track(self);
    return;
  }
  joinedLocation = location;
  if (onlineChannel) await supabase.removeChannel(onlineChannel);
  onlineChannel = supabase.channel("city:online", {
    config: { presence: { key: self.simId } },
  });
  onlineChannel.on("presence", { event: "sync" }, () => {
    const count = Object.keys(onlineChannel?.presenceState() ?? {}).length;
    usePresence.getState().setOnline(Math.max(1, count));
  });
  onlineChannel.subscribe(async (status) => {
    if (status === "SUBSCRIBED")
      await onlineChannel?.track({ simId: self.simId });
  });
  await joinShard(location, 1, self);
}

export function broadcastPosition(tile: Tile): void {
  const state = usePresence.getState();
  void venueChannel?.send({
    type: "broadcast",
    event: "pos",
    payload: {
      ...currentTrack(tile),
      shard: venueShard,
      here: state.here.length,
    },
  });
}

let trackCache: TrackPayload | null = null;

export function rememberTrack(track: TrackPayload): void {
  trackCache = track;
}

function currentTrack(tile: Tile): TrackPayload {
  return {
    simId: trackCache?.simId ?? "",
    name: trackCache?.name ?? "",
    appearance: trackCache?.appearance ?? defaultAppearance(),
    x: tile.x,
    y: tile.y,
  };
}

export function broadcastChat(text: string): void {
  const game = useGame.getState();
  const clean = text.trim().slice(0, 140);
  if (!clean || !game.name) return;
  const simId = trackCache?.simId || game.simId || "local";
  const speaker = trackCache?.name || game.name;
  void venueChannel?.send({
    type: "broadcast",
    event: "chat",
    payload: { text: clean, name: speaker, simId },
  });
  usePresence.getState().pushChat({
    id: `me-${Date.now()}`,
    from: speaker,
    simId,
    text: clean,
    at: Date.now(),
  });
}

export function broadcastEmote(
  kind: "wave" | "compliment" | "invite",
  homeSimId?: string,
): void {
  const game = useGame.getState();
  const simId = trackCache?.simId || game.simId || "local";
  const speaker = trackCache?.name || game.name;
  if (!speaker) return;
  void venueChannel?.send({
    type: "broadcast",
    event: "emote",
    payload: { kind, name: speaker, simId, homeSimId },
  });
}
