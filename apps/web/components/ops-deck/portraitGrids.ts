// Hand-authored 12x12 single-colour pixel grids, one per agent, a
// head-and-badge crop of #119's full character sprite (same badge
// motif per agent) so the Operations Deck card icon reads as "this
// character's portrait", not a disconnected new design. "#" is a
// filled cell, rendered with currentColor by PixelPortrait so it
// still inherits AgentCard's existing lit/dim/pulseOverride logic.

export type PortraitGrid = string[];

export const ORION_PORTRAIT: PortraitGrid = [
  "....####....",
  "...######...",
  "..########..",
  "..########..",
  "..#......#..",
  "..#.####.#..",
  "..#.#..#.#..",
  "..#.####.#..",
  "..#......#..",
  "..########..",
  "...######...",
  "............",
];

export const VULCAN_PORTRAIT: PortraitGrid = [
  "....####....",
  "...######...",
  "..########..",
  "..########..",
  "..#..##..#..",
  "..#..##..#..",
  "..#..##..#..",
  "..#.####.#..",
  "..#.####.#..",
  "..########..",
  "...######...",
  "............",
];

export const TESLA_PORTRAIT: PortraitGrid = [
  "....####....",
  "...######...",
  "..########..",
  "..########..",
  "..#...##.#..",
  "..#..##..#..",
  "..#.##...#..",
  "..#..##..#..",
  "..#...##.#..",
  "..########..",
  "...######...",
  "............",
];

export const MERCURY_PORTRAIT: PortraitGrid = [
  "....####....",
  "...######...",
  "..########..",
  "..########..",
  "..##.#.#.#..",
  "..#......#..",
  "..##.#.#.#..",
  "..#......#..",
  "..##.#.#.#..",
  "..########..",
  "...######...",
  "............",
];

export const ATHENA_PORTRAIT: PortraitGrid = [
  "....####....",
  "...######...",
  "..########..",
  "..########..",
  "..#....#.#..",
  "..#...##.#..",
  "..#..##..#..",
  "..###....#..",
  "..#......#..",
  "..########..",
  "...######...",
  "............",
];
