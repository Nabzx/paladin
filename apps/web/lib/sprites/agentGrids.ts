// Hand-authored 16x16 pixel-art grids for each agent, see #110's
// research for the authoring/baking pattern. One shared humanoid
// shell (helmet, visor, torso, legs), a distinct chest-badge glyph
// per agent so each reads as a different character even before the
// accent colour (the primary identity signal, per #119's DoD) is applied.

import type { SpriteGrid } from "@/lib/sprites/nodeGrids";

export const ORION_GRID: SpriteGrid = [
  "................",
  "......FFFF......",
  ".....FHHHHF.....",
  ".....FVVVVF.....",
  ".....FHHHHF.....",
  "....FSSSSSSF....",
  "....FSVVVVSF....",
  "....FSVSSVSF....",
  "....FSVVVVSF....",
  "....FFFFFFFF....",
  "....FSS..SSF....",
  ".....FS..SF.....",
  ".....FS..SF.....",
  ".....FS..SF.....",
  ".....FL..LF.....",
  "................",
];

export const VULCAN_GRID: SpriteGrid = [
  "................",
  "......FFFF......",
  ".....FHHHHF.....",
  ".....FVVVVF.....",
  ".....FHHHHF.....",
  "....FSSSSSSF....",
  "....FSVVVVSF....",
  "....FSSVVSSF....",
  "....FSSVVSSF....",
  "....FFFFFFFF....",
  "....FSS..SSF....",
  ".....FS..SF.....",
  ".....FS..SF.....",
  ".....FS..SF.....",
  ".....FL..LF.....",
  "................",
];

export const TESLA_GRID: SpriteGrid = [
  "................",
  "......FFFF......",
  ".....FHHHHF.....",
  ".....FVVVVF.....",
  ".....FHHHHF.....",
  "....FSSSSSSF....",
  "....FSSVVSSF....",
  "....FSSVSSSF....",
  "....FSSSVVSF....",
  "....FFFFFFFF....",
  "....FSS..SSF....",
  ".....FS..SF.....",
  ".....FS..SF.....",
  ".....FS..SF.....",
  ".....FL..LF.....",
  "................",
];

export const MERCURY_GRID: SpriteGrid = [
  "................",
  "......FFFF......",
  ".....FHHHHF.....",
  ".....FVVVVF.....",
  ".....FHHHHF.....",
  "....FSSSSSSF....",
  "....FSVSVSSF....",
  "....FSSSSSSF....",
  "....FSVSVSSF....",
  "....FFFFFFFF....",
  "....FSS..SSF....",
  ".....FS..SF.....",
  ".....FS..SF.....",
  ".....FS..SF.....",
  ".....FL..LF.....",
  "................",
];

export const ATHENA_GRID: SpriteGrid = [
  "................",
  "......FFFF......",
  ".....FHHHHF.....",
  ".....FVVVVF.....",
  ".....FHHHHF.....",
  "....FSSSSSSF....",
  "....FSSSSVSF....",
  "....FSSSVSSF....",
  "....FSVVSSSF....",
  "....FFFFFFFF....",
  "....FSS..SSF....",
  ".....FS..SF.....",
  ".....FS..SF.....",
  ".....FS..SF.....",
  ".....FL..LF.....",
  "................",
];
