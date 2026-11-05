import type { CSSProperties } from "react";

// Средняя ширина буквы Oswald 600 капсом в долях кегля (с запасом на широкие Ш, Ж, М).
const LETTER_WIDTH = 0.58;

/**
 * Размер крупного заголовка, при котором самое длинное слово целиком помещается в ширину
 * контейнера. Родитель должен быть контейнером (класс `@container`, см. globals.css),
 * тогда 1cqi — один процент его ширины.
 */
export function fitDisplay(text: string, maxRem: number): CSSProperties {
  const longest = Math.max(...text.split(/\s+/).map((word) => word.length), 1);
  const cqi = 100 / (longest * LETTER_WIDTH);
  return { fontSize: `min(${maxRem}rem, ${cqi.toFixed(2)}cqi)` };
}
