import { Graphics } from "pixi.js";
import type { Application as PixiApplication, Texture } from "pixi.js";
import type { SpriteGrid } from "@/lib/sprites/nodeGrids";

// Size of one authored cell before baking. The texture is scaled up
// further at draw time via sprite.scale, confirmed by #110 to stay
// crisp through that additional transform-level scaling.
const CELL_PX = 4;

// scaleMode set after generateTexture() has NO EFFECT (measured: still
// 63 interpolated colours instead of the palette's 6). It must go
// through textureSourceOptions at generation time, see #110.
export function bakeSprite(app: PixiApplication, grid: SpriteGrid, palette: Record<string, number>): Texture {
  const graphics = new Graphics();
  grid.forEach((rowStr, y) => {
    [...rowStr].forEach((cell, x) => {
      const color = palette[cell];
      if (color === undefined) return;
      graphics.rect(x * CELL_PX, y * CELL_PX, CELL_PX, CELL_PX).fill(color);
    });
  });

  const texture = app.renderer.generateTexture({
    target: graphics,
    textureSourceOptions: { scaleMode: "nearest" },
  });
  graphics.destroy();
  return texture;
}
