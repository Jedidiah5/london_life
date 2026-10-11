import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "London Life",
    short_name: "London Life",
    description: "A life sim in London. Rent, rain, and the Tube.",
    start_url: "/play",
    display: "standalone",
    background_color: "#1b2838",
    theme_color: "#1b2838",
    icons: [
      { src: "/icon", sizes: "192x192", type: "image/png" },
    ],
  };
}
