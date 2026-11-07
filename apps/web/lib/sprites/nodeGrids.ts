// Hand-authored 16x16 pixel-art grids for each node type, see #110's
// research: a single palette-key character per cell, "." transparent.
// Baked to a Texture once via bakeSprite(), never drawn as raw Graphics.

export type SpriteGrid = string[];

export const SERVER_GRID: SpriteGrid = [
  "................",
  "..FFFFFFFFFFFF..",
  ".FPPPPPPPPPPPPF.",
  ".FPLPPPPPPPPPPF.",
  ".FPPPPPPPPPPPPF.",
  ".FDDDDDDDDDDDDF.",
  ".FPLPPPPPPPPPPF.",
  ".FPPPPPPPPPPPPF.",
  ".FDDDDDDDDDDDDF.",
  ".FPLPPPPPPPPPPF.",
  ".FPPPPPPPPPPPPF.",
  ".FVVVVVVVVVVVVF.",
  ".FFFFFFFFFFFFFF.",
  "................",
  "................",
  "................",
];

export const POWER_BUS_GRID: SpriteGrid = [
  "...F..F..F..F...",
  "...F..F..F..F...",
  "..FFFFFFFFFFFF..",
  ".FPPPPPPPPPPPPF.",
  ".FPLLPLLPLLPLLF.",
  ".FPPPPPPPPPPPPF.",
  ".FDDDDDDDDDDDDF.",
  ".FPPPPPPPPPPPPF.",
  ".FPLLPLLPLLPLLF.",
  ".FPPPPPPPPPPPPF.",
  ".FDDDDDDDDDDDDF.",
  ".FPPPPPPPPPPPPF.",
  "..FFFFFFFFFFFF..",
  "................",
  "................",
  "................",
];

export const THERMAL_ZONE_GRID: SpriteGrid = [
  "................",
  ".....FFFFFF.....",
  "...FPPPPPPPPF...",
  "..FPPLPDPLPPF...",
  ".FPPPPDLLDPPPPF.",
  ".FPPPDLLLLDPPPF.",
  "FPPPPLDPPDLPPPPF",
  "FPPPPPPPPPPPPPPF",
  "FPPPPPPPPPPPPPPF",
  "FPPPPLDPPDLPPPPF",
  ".FPPPDLLLLDPPPF.",
  ".FPPPPDLLDPPPPF.",
  "..FPPLPDPLPPF...",
  "...FPPPPPPPPF...",
  ".....FFFFFF.....",
  "................",
];

export const TRANSFORMER_GRID: SpriteGrid = [
  "................",
  "....FFFFFFFF....",
  "...FPPPPPPPPF...",
  "..FPLLLLLLLLPF..",
  "..FPPPPPPPPPPF..",
  "..FDDDDDDDDDDF..",
  ".FPPPPPPPPPPPPF.",
  ".FPLLLLLLLLLLPF.",
  ".FPPPPPPPPPPPPF.",
  ".FDDDDDDDDDDDDF.",
  ".FPPPPPPPPPPPPF.",
  "FPPPPPPPPPPPPPPF",
  "FVVVPPVVVVPPVVVF",
  "FFFFFFFFFFFFFFFF",
  "................",
  "................",
];

export const BATTERY_GRID: SpriteGrid = [
  "................",
  "..F..F..F..F..F.",
  "FFFF..FFFF..FFFF",
  ".FPPF.FPPF.FPPF.",
  ".FLLF.FLLF.FLLF.",
  ".FLLF.FLLF.FLLF.",
  ".FDDF.FDDF.FDDF.",
  ".FPPF.FPPF.FPPF.",
  ".FPPF.FPPF.FPPF.",
  ".FDDF.FDDF.FDDF.",
  ".FFFFFFFFFFFFFF.",
  "................",
  "................",
  "................",
  "................",
  "................",
];

export const RADIATOR_GRID: SpriteGrid = [
  "................",
  ".FFFFFFFFFFFFFF.",
  ".FPDPLPDPLPDPLPF",
  ".FPDPLPDPLPDPLPF",
  ".FPDPLPDPLPDPLPF",
  ".FPDPLPDPLPDPLPF",
  ".FPDPLPDPLPDPLPF",
  ".FPDPLPDPLPDPLPF",
  ".FPDPLPDPLPDPLPF",
  ".FPDPLPDPLPDPLPF",
  ".FFFFFFFFFFFFFF.",
  "...FFFFFFFFFF...",
  "...PPPPPPPPPP...",
  "................",
  "................",
  "................",
];
