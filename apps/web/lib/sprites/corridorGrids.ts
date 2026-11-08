// Hand-authored 16x16 pixel-art grids for corridor tiles, see #110's
// research for the authoring/baking pattern. One tile shape reused
// along every corridor tile regardless of bend, a severed variant for
// edges that can't carry anything (#52's rule, still applies).

import type { SpriteGrid } from "@/lib/sprites/nodeGrids";

export const PIPE_GRID: SpriteGrid = [
  "................",
  ".FFFFFFFFFFFFFF.",
  ".FPPPPPPPPPPPPF.",
  ".FPPPPPPPPPPPPF.",
  ".FDDDDDDDDDDDDF.",
  ".FLLLLLLLLLLLLF.",
  ".FLLLLLLLLLLLLF.",
  ".FLLLLLLLLLLLLF.",
  ".FLLLLLLLLLLLLF.",
  ".FLLLLLLLLLLLLF.",
  ".FDDDDDDDDDDDDF.",
  ".FPPPPPPPPPPPPF.",
  ".FPPPPPPPPPPPPF.",
  ".FFFFFFFFFFFFFF.",
  "................",
  "................",
];

export const PIPE_SEVERED_GRID: SpriteGrid = [
  "................",
  ".FFFFFFFFFFFFFF.",
  ".FPPPPPPPPPPPPF.",
  ".FPPPPPPPPPPPPF.",
  ".FDDDDDDDDDDDDF.",
  ".FDDDDD..DDDDDF.",
  ".FDDDD....DDDDF.",
  ".FDDDD....DDDDF.",
  ".FDDDDD..DDDDDF.",
  ".FDDDDDDDDDDDDF.",
  ".FDDDDDDDDDDDDF.",
  ".FPPPPPPPPPPPPF.",
  ".FPPPPPPPPPPPPF.",
  ".FFFFFFFFFFFFFF.",
  "................",
  "................",
];
