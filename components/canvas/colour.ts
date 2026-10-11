import { Color } from "three";

export function shadeHex(hex: string, amount: number): string {
  const colour = new Color(hex);
  colour.offsetHSL(0, 0, amount);
  return `#${colour.getHexString()}`;
}
