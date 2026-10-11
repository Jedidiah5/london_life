import type { Metadata } from "next";
import { PlayClient } from "@/components/play/PlayClient";

export const metadata: Metadata = {
  title: "Play — London Life",
  description: "Live a week in London from a box room in Zone 4.",
};

export default function PlayPage() {
  return <PlayClient />;
}
