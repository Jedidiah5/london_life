import {
  BUS_PENCE,
  RIDE_BASE_PENCE,
  RIDE_PER_ZONE_PENCE,
  TUBE_MIN_PENCE,
  TUBE_PER_ZONE_PENCE,
} from "./constants";
import type { TravelMode } from "./types";

export interface TravelQuote {
  pence: number;
  minutes: number;
  energy: number;
  label: string;
  paysWith: "oyster" | "balance" | "free";
}

export function travelQuote(fromZone: number, toZone: number, mode: TravelMode): TravelQuote {
  const gap = Math.max(Math.abs(fromZone - toZone), 1);
  if (mode === "walk") {
    return { pence: 0, minutes: 12 + gap * 8, energy: 6 + gap * 2, label: "Walk", paysWith: "free" };
  }
  if (mode === "bus") {
    return { pence: BUS_PENCE, minutes: 8 + gap * 4, energy: 2, label: "Bus", paysWith: "balance" };
  }
  if (mode === "ride") {
    return {
      pence: RIDE_BASE_PENCE + Math.abs(fromZone - toZone) * RIDE_PER_ZONE_PENCE,
      minutes: 3 + gap,
      energy: 1,
      label: "Ride",
      paysWith: "balance",
    };
  }
  return {
    pence: Math.max(TUBE_MIN_PENCE, TUBE_PER_ZONE_PENCE * gap),
    minutes: 2 + gap,
    energy: 2,
    label: "Tube",
    paysWith: "oyster",
  };
}
