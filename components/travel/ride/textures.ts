import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";

type Draw = (ctx: CanvasRenderingContext2D, width: number, height: number) => void;

export function paint(width: number, height: number, draw: Draw, repeat = false): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (ctx) draw(ctx, width, height);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  if (repeat) {
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
  }
  return texture;
}

export function seeded(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashOf(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function shade(hex: string, amount: number): string {
  const value = Number.parseInt(hex.replace("#", ""), 16);
  const channel = (shift: number) => {
    const raw = (value >> shift) & 255;
    const next = amount < 0 ? raw * (1 + amount) : raw + (255 - raw) * amount;
    return Math.max(0, Math.min(255, Math.round(next)));
  };
  return `rgb(${channel(16)}, ${channel(8)}, ${channel(0)})`;
}

function fitText(ctx: CanvasRenderingContext2D, text: string, weight: string, size: number, maxWidth: number): void {
  let current = size;
  ctx.font = `${weight} ${current}px Arial, Helvetica, sans-serif`;
  while (current > 8 && ctx.measureText(text).width > maxWidth) {
    current -= 1;
    ctx.font = `${weight} ${current}px Arial, Helvetica, sans-serif`;
  }
}

function glass(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  light = false,
): void {
  const gradient = ctx.createLinearGradient(x, y, x + width * 0.4, y + height);
  gradient.addColorStop(0, light ? "#5d7486" : "#2c3b4a");
  gradient.addColorStop(0.55, light ? "#9fb4c3" : "#566e82");
  gradient.addColorStop(1, light ? "#6c8395" : "#34465a");
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, width, height);
}

function ledDots(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  for (let y = 0; y < height; y += 4) ctx.fillRect(0, y, width, 1);
  for (let x = 0; x < width; x += 4) ctx.fillRect(x, 0, 1, height);
}

export const STOREY_PX = 128;

const CURTAINS = ["rgba(196, 72, 60, 0.55)", "rgba(240, 228, 200, 0.7)", "rgba(70, 110, 160, 0.5)"];

export interface FacadeSpec {
  wall: string;
  stucco: boolean;
  storeys: number;
  bays: number;
  shop: { name: string; colour: string } | null;
  door: string;
  seed: number;
}

/** A London terrace front: brick or stucco, sash windows, and a shop or front door at street level. */
export function facadeTexture(spec: FacadeSpec): CanvasTexture {
  return paint(256, spec.storeys * STOREY_PX, (ctx, width, height) => {
    const rand = seeded(spec.seed);
    ctx.fillStyle = spec.wall;
    ctx.fillRect(0, 0, width, height);
    if (spec.stucco) {
      ctx.fillStyle = shade(spec.wall, -0.1);
      for (let y = height - STOREY_PX; y < height; y += 14) ctx.fillRect(0, y, width, 2);
    } else {
      for (let row = 0; row * 8 < height; row += 1) {
        const offset = row % 2 === 0 ? 0 : 10;
        for (let x = -offset; x < width; x += 20) {
          ctx.fillStyle = shade(spec.wall, (rand() - 0.5) * 0.22);
          ctx.fillRect(x + 1, row * 8 + 1, 18, 6);
        }
      }
    }

    ctx.fillStyle = "#ebe6da";
    ctx.fillRect(0, 0, width, 12);
    ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
    ctx.fillRect(0, 12, width, 3);

    const windowWidth = spec.bays === 3 ? 44 : 58;
    for (let floor = 0; floor < spec.storeys - 1; floor += 1) {
      const top = floor * STOREY_PX + (floor === 0 ? 30 : 22);
      const windowHeight = floor === 0 ? 68 : 84;
      for (let bay = 0; bay < spec.bays; bay += 1) {
        const left = ((bay + 0.5) * width) / spec.bays - windowWidth / 2;
        ctx.fillStyle = spec.stucco ? shade(spec.wall, -0.12) : "#e4ddcc";
        ctx.fillRect(left - 5, top - 9, windowWidth + 10, 8);
        ctx.fillRect(left - 4, top + windowHeight, windowWidth + 8, 6);
        ctx.fillStyle = "#f3f0e8";
        ctx.fillRect(left, top, windowWidth, windowHeight);
        glass(ctx, left + 5, top + 5, windowWidth - 10, windowHeight - 10);
        if (rand() < 0.35) {
          ctx.fillStyle = CURTAINS[Math.floor(rand() * CURTAINS.length)] ?? "#f0e4c8";
          ctx.fillRect(left + 5, top + 5, (windowWidth - 10) * 0.35, windowHeight - 10);
        }
        ctx.fillStyle = "#f3f0e8";
        ctx.fillRect(left, top + windowHeight / 2 - 2, windowWidth, 4);
        ctx.fillRect(left + windowWidth / 2 - 1, top, 2, windowHeight);
      }
    }

    const ground = height - STOREY_PX;
    if (spec.shop) {
      ctx.fillStyle = "#3a3f45";
      ctx.fillRect(0, ground + 4, width, STOREY_PX - 4);
      ctx.fillStyle = spec.shop.colour;
      ctx.fillRect(4, ground + 8, width - 8, 30);
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      fitText(ctx, spec.shop.name, "bold", 19, width - 24);
      ctx.fillText(spec.shop.name, width / 2, ground + 24);
      glass(ctx, 14, ground + 44, width - 90, 70, true);
      ctx.fillStyle = "#2a2f35";
      ctx.fillRect(14 + (width - 90) / 2 - 1, ground + 44, 3, 70);
      ctx.fillRect(14, ground + 112, width - 90, 12);
      ctx.fillStyle = "#23282e";
      ctx.fillRect(width - 66, ground + 44, 50, 80);
      glass(ctx, width - 60, ground + 50, 38, 44, true);
    } else {
      const doorLeft = spec.bays === 3 ? 18 : 30;
      ctx.fillStyle = "#e9e4d8";
      ctx.fillRect(doorLeft - 6, ground + 20, 58, 108);
      ctx.fillStyle = spec.door;
      ctx.fillRect(doorLeft, ground + 44, 46, 84);
      glass(ctx, doorLeft + 4, ground + 26, 38, 14);
      ctx.fillStyle = "#d9b44a";
      ctx.fillRect(doorLeft + 36, ground + 86, 4, 4);
      for (let bay = 1; bay < spec.bays; bay += 1) {
        const left = ((bay + 0.5) * width) / spec.bays - windowWidth / 2;
        ctx.fillStyle = "#f3f0e8";
        ctx.fillRect(left, ground + 26, windowWidth, 78);
        glass(ctx, left + 5, ground + 31, windowWidth - 10, 68);
        ctx.fillStyle = "#f3f0e8";
        ctx.fillRect(left, ground + 63, windowWidth, 4);
      }
      ctx.fillStyle = "#1d2125";
      for (let x = 0; x < width; x += 9) ctx.fillRect(x, ground + 104, 2, 24);
      ctx.fillRect(0, ground + 104, width, 3);
    }
    const grime = ctx.createLinearGradient(0, height - 30, 0, height);
    grime.addColorStop(0, "rgba(0, 0, 0, 0)");
    grime.addColorStop(1, "rgba(0, 0, 0, 0.25)");
    ctx.fillStyle = grime;
    ctx.fillRect(0, height - 30, width, 30);
  });
}

/** Seat fabric: a busy repeating pattern that hides crumbs. */
export function moquetteTexture(base: string, colours: [string, string, string], seed: number): CanvasTexture {
  const texture = paint(
    128,
    128,
    (ctx, width, height) => {
      const rand = seeded(seed);
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, width, height);
      for (let i = 0; i < 4; i += 1) {
        for (let j = 0; j < 4; j += 1) {
          const x = i * 32;
          const y = j * 32;
          const kind = (i + j * 2) % 3;
          ctx.fillStyle = colours[kind] ?? base;
          if (kind === 0) {
            ctx.fillRect(x + 6, y + 6, 20, 4);
            ctx.fillRect(x + 6, y + 22, 20, 4);
            ctx.fillRect(x + 6, y + 6, 4, 20);
          } else if (kind === 1) {
            ctx.beginPath();
            ctx.moveTo(x + 16, y + 4);
            ctx.lineTo(x + 28, y + 16);
            ctx.lineTo(x + 16, y + 28);
            ctx.lineTo(x + 4, y + 16);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = base;
            ctx.fillRect(x + 13, y + 13, 6, 6);
          } else {
            ctx.fillRect(x + 4, y + 14, 24, 4);
            ctx.fillRect(x + 14, y + 4, 4, 24);
          }
        }
      }
      for (let k = 0; k < 220; k += 1) {
        ctx.fillStyle = rand() < 0.5 ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.18)";
        ctx.fillRect(rand() * width, rand() * height, 2, 2);
      }
    },
    true,
  );
  texture.repeat.set(1.5, 1.5);
  return texture;
}

/** The orange dot-matrix destination blind on the front of a bus. */
export function blindTexture(route: string, destination: string): CanvasTexture {
  return paint(512, 96, (ctx, width, height) => {
    ctx.fillStyle = "#050505";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#ffb21a";
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.font = "bold 66px Arial, Helvetica, sans-serif";
    ctx.fillText(route, 18, height / 2 + 2);
    const routeWidth = ctx.measureText(route).width;
    fitText(ctx, destination, "bold", 40, width - routeWidth - 60);
    ctx.fillText(destination, routeWidth + 44, height / 2 + 2);
    ledDots(ctx, width, height);
  });
}

/** A scrolling orange LED strip. Repeats horizontally so its offset can scroll. */
export function ledTexture(text: string): CanvasTexture {
  const texture = paint(
    1024,
    64,
    (ctx, width, height) => {
      ctx.fillStyle = "#060606";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#ff9a1f";
      ctx.textBaseline = "middle";
      ctx.font = "bold 36px 'Courier New', monospace";
      ctx.fillText(text, 24, height / 2 + 2);
      ledDots(ctx, width, height);
    },
    true,
  );
  texture.repeat.set(0.5, 1);
  return texture;
}

export interface Advert {
  background: string;
  ink: string;
  headline: string;
  small: string;
}

export const ADVERTS: Advert[] = [
  {
    background: "#ffd400",
    ink: "#111111",
    headline: "RENT: ONLY YOUR WHOLE SALARY",
    small: "Zone 2. Box room. Damp is a feature.",
  },
  {
    background: "#1b2838",
    ink: "#ffffff",
    headline: "LEARN TO CODE IN 6 WEEKS",
    small: "Terms, conditions and crying apply.",
  },
  {
    background: "#f2e6d0",
    ink: "#3b2a1a",
    headline: "OAT MILK. FOR SOME REASON.",
    small: "Now in a smaller carton for the same price.",
  },
  {
    background: "#2f6fed",
    ink: "#ffffff",
    headline: "MEAL DEAL MONTHLY",
    small: "Sandwich, snack, drink, regret. £3.99.",
  },
  {
    background: "#c8102e",
    ink: "#ffffff",
    headline: "IT'S NOT RAIN, IT'S SPITTING",
    small: "Umbrellas from £4. Inside out by Tuesday.",
  },
  {
    background: "#0f7a4a",
    ink: "#ffffff",
    headline: "SURPRISE! IT'S ENGINEERING WORKS",
    small: "Every weekend until further notice.",
  },
];

export function advertFor(key: string | number): Advert {
  const index = typeof key === "number" ? key : hashOf(key);
  return ADVERTS[index % ADVERTS.length] ?? FALLBACK_ADVERT;
}

const FALLBACK_ADVERT: Advert = { background: "#ffffff", ink: "#1b2838", headline: "LONDON", small: "" };

export function advertTexture(advert: Advert, width = 512, height = 128): CanvasTexture {
  return paint(width, height, (ctx, w, h) => {
    ctx.fillStyle = advert.background;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = advert.ink;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    fitText(ctx, advert.headline, "900", Math.round(h * 0.34), w - 32);
    ctx.fillText(advert.headline, 16, h * 0.38);
    fitText(ctx, advert.small, "600", Math.round(h * 0.16), w - 32);
    ctx.fillText(advert.small, 16, h * 0.74);
    ctx.strokeStyle = "rgba(0, 0, 0, 0.35)";
    ctx.lineWidth = 6;
    ctx.strokeRect(0, 0, w, h);
  });
}

/** A line diagram strip, as above the doors on the Underground. */
export function lineMapTexture(colour: string, stations: string[]): CanvasTexture {
  return paint(1024, 96, (ctx, width) => {
    ctx.fillStyle = "#fbfbf8";
    ctx.fillRect(0, 0, width, 96);
    ctx.fillStyle = colour;
    ctx.fillRect(30, 44, width - 60, 10);
    const step = (width - 80) / Math.max(stations.length - 1, 1);
    ctx.textAlign = "center";
    stations.forEach((name, index) => {
      const x = 40 + index * step;
      const last = index === stations.length - 1;
      if (last) {
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(x, 49, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 5;
        ctx.strokeStyle = "#1b2838";
        ctx.stroke();
      } else {
        ctx.fillStyle = colour;
        ctx.fillRect(x - 3, 30, 6, 16);
      }
      ctx.fillStyle = "#1b2838";
      fitText(ctx, name, last ? "bold" : "600", 15, step - 6);
      ctx.fillText(name, x, index % 2 === 0 ? 20 : 78);
    });
  });
}

export function pavingTexture(): CanvasTexture {
  const texture = paint(
    128,
    128,
    (ctx, width, height) => {
      const rand = seeded(7);
      ctx.fillStyle = "#b9b6ae";
      ctx.fillRect(0, 0, width, height);
      for (let k = 0; k < 500; k += 1) {
        ctx.fillStyle = rand() < 0.5 ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.1)";
        ctx.fillRect(rand() * width, rand() * height, 2, 2);
      }
      ctx.fillStyle = "#8f8c85";
      ctx.fillRect(0, 0, width, 2);
      ctx.fillRect(0, 64, width, 2);
      ctx.fillRect(0, 0, 2, height);
      ctx.fillRect(64, 0, 2, height);
    },
    true,
  );
  return texture;
}

export function wordTexture(
  text: string,
  ink: string,
  background: string | null,
  width = 256,
  height = 64,
): CanvasTexture {
  return paint(width, height, (ctx, w, h) => {
    if (background) {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.fillStyle = ink;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    fitText(ctx, text, "900", Math.round(h * 0.7), w - 12);
    ctx.fillText(text, w / 2, h / 2 + 2);
  });
}

export function stopSignTexture(routes: string): CanvasTexture {
  return paint(128, 160, (ctx, width) => {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, 160);
    ctx.strokeStyle = "#c8102e";
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(64, 56, 40, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#1b2838";
    ctx.fillRect(10, 46, 108, 22);
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 15px Arial, Helvetica, sans-serif";
    ctx.fillText("BUS STOP", 64, 58);
    ctx.fillStyle = "#1b2838";
    ctx.fillRect(0, 108, width, 52);
    ctx.fillStyle = "#ffffff";
    fitText(ctx, routes, "bold", 26, width - 12);
    ctx.fillText(routes, 64, 135);
  });
}
