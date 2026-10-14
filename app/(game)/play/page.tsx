import type { Metadata, Viewport } from "next";
import { PlayClient } from "@/components/play/PlayClient";

export const metadata: Metadata = {
  title: "Play — London Life",
  description: "Live a week in London from a box room in Zone 4.",
};

/** The game handles pinch itself (map and room zoom), so the page must not zoom. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#1b2838",
};

export default function PlayPage() {
  return <PlayClient />;
}
