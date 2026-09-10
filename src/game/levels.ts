/* Emberfox world data. Levels are authored on a tile grid with a tiny builder DSL.
   Tile chars:
   #  solid block        B  brick            ?  coin block       Q  power (fruit) block
   =  one-way plank      ^  spikes (deadly)  ~  lava (deadly)    o  coin
   P  player start       C  checkpoint flag  G  goal flag        H  heart (extra life)
   w  walker   f  flyer  s  spiker (no stomp) b  bouncer  c  pipe chomper  z  boss
*/

export const TILE = 40;
export const ROWS = 14;

export type MusicTheme = "menu" | "meadow" | "cave" | "dunes" | "frost" | "forge" | "boss" | null;

export interface Theme {
  sky: [string, string];
  far: string;
  farAlt: string;
  tile: string;
  tileDark: string;
  rim: string;
  brick: string;
  brickDark: string;
  accent: string;
  plat: string;
  pipe: string;
  pipeDark: string;
  glow: string;
  ambient: "cloud" | "dust" | "sand" | "snow" | "ember";
  skyline: "hills" | "cave" | "dunes" | "peaks" | "forge";
  sun: { color: string; y: number; size: number } | null;
  icy?: boolean;
  music: Exclude<MusicTheme, null | "menu" | "boss">;
}

export const THEMES: Record<string, Theme> = {
  meadow: {
    sky: ["#4fb0e8", "#cdeeff"], far: "#7cc97f", farAlt: "#5cb56f",
    tile: "#a5683f", tileDark: "#86512f", rim: "#5cc257",
    brick: "#c98850", brickDark: "#9d6739", accent: "#ffd23f", plat: "#d9a05f",
    pipe: "#3fae8c", pipeDark: "#2b7d64", glow: "#fff3b0",
    ambient: "cloud", skyline: "hills", sun: { color: "#ffe06b", y: 92, size: 66 }, icy: false, music: "meadow",
  },
  cave: {
    sky: ["#0a1e2e", "#134156"], far: "#0e2f42", farAlt: "#175066",
    tile: "#31586e", tileDark: "#24455a", rim: "#5fd0c0",
    brick: "#3f6b80", brickDark: "#2e5266", accent: "#7be0c3", plat: "#54919f",
    pipe: "#2f8f86", pipeDark: "#1f665f", glow: "#7be0c3",
    ambient: "dust", skyline: "cave", sun: null, icy: false, music: "cave",
  },
  dunes: {
    sky: ["#f78a4e", "#ffe0b0"], far: "#e06f43", farAlt: "#c25a38",
    tile: "#e0a55e", tileDark: "#bd8547", rim: "#f7d489",
    brick: "#cf8f4f", brickDark: "#a96f3a", accent: "#ffc94d", plat: "#b06a3f",
    pipe: "#b3593a", pipeDark: "#8a3f28", glow: "#fff3c4",
    ambient: "sand", skyline: "dunes", sun: { color: "#fff3c4", y: 150, size: 118 }, icy: false, music: "dunes",
  },
  frost: {
    sky: ["#8fcdec", "#eef9ff"], far: "#c2e2f4", farAlt: "#a5cfe9",
    tile: "#5d7f96", tileDark: "#49677c", rim: "#f2fbff",
    brick: "#7d9db1", brickDark: "#5f8095", accent: "#9fe8ff", plat: "#8fb4c9",
    pipe: "#5d8fa8", pipeDark: "#44708a", glow: "#dff4ff",
    ambient: "snow", skyline: "peaks", sun: { color: "#ffffff", y: 80, size: 44 }, icy: true, music: "frost",
  },
  forge: {
    sky: ["#23080d", "#4b1419"], far: "#390e13", farAlt: "#5a1a1d",
    tile: "#4a2b30", tileDark: "#371f24", rim: "#a8553f",
    brick: "#5d353a", brickDark: "#452629", accent: "#ff8c3b", plat: "#7a4a45",
    pipe: "#7a3b30", pipeDark: "#57291f", glow: "#ff8c3b",
    ambient: "ember", skyline: "forge", sun: null, icy: false, music: "forge",
  },
};

export interface MoverDef { c: number; r: number; axis: "x" | "y"; dist: number; speed: number; w: number }

export interface LevelDef {
  name: string;
  sub: string;
  theme: string;
  time: number;
  speed: number;
  cols: number;
  rows: string[];
  movers: MoverDef[];
  hasBoss?: boolean;
}

class Grid {
  cols: number;
  cells: string[][];
  constructor(cols: number) {
    this.cols = cols;
    this.cells = Array.from({ length: ROWS }, () => Array<string>(cols).fill(" "));
  }
  put(c: number, r: number, ch: string) {
    if (c >= 0 && c < this.cols && r >= 0 && r < ROWS) this.cells[r][c] = ch;
  }
  ground(c0: number, c1: number, top = 11) {
    for (let c = c0; c <= c1; c++) for (let r = top; r < ROWS; r++) this.put(c, r, "#");
  }
  fill(c0: number, c1: number, r0: number, r1: number, ch: string) {
    for (let c = c0; c <= c1; c++) for (let r = r0; r <= r1; r++) this.put(c, r, ch);
  }
  row(c0: number, c1: number, r: number, ch: string) { this.fill(c0, c1, r, r, ch); }
  lava(c0: number, c1: number) { this.fill(c0, c1, 12, 13, "~"); }
  done(): string[] { return this.cells.map((r) => r.join("")); }
}

/* ------------------------------------------------ World 1 ------------------------------------------------ */
function world1(): LevelDef {
  const g = new Grid(132);
  g.ground(0, 30); g.ground(34, 44); g.ground(48, 72); g.ground(75, 86);
  // safety lower ledge across the chasm so misses are recoverable
  g.ground(88, 94, 12);
  g.ground(96, 131);
  g.put(3, 10, "P");
  g.row(6, 9, 9, "o");
  g.put(16, 8, "?"); g.put(17, 8, "Q"); g.put(18, 8, "?");
  g.put(24, 10, "w");
  g.put(36, 8, "B"); g.put(37, 8, "B"); g.put(38, 8, "?"); g.put(39, 8, "B");
  g.put(42, 10, "w");
  g.row(45, 47, 9, "="); g.row(45, 47, 7, "o");
  g.put(55, 8, "c"); g.put(52, 9, "o"); g.put(53, 9, "o");
  g.put(60, 10, "w");
  g.put(63, 10, "C");
  g.put(66, 7, "B"); g.put(67, 7, "?"); g.put(68, 7, "B"); g.put(69, 7, "B");
  g.put(70, 10, "w");
  // staircase up + plateau
  g.put(76, 10, "#"); g.fill(78, 78, 9, 10, "#"); g.fill(80, 83, 8, 10, "#");
  g.put(76, 9, "o"); g.put(78, 8, "o"); g.put(80, 7, "o"); g.put(82, 7, "o");
  g.put(81, 4, "f");
  g.put(85, 10, "w");
  // lower recovery coins and stepping path
  g.row(89, 93, 11, "o");
  g.put(89, 7, "o"); g.put(91, 7, "o");
  g.put(99, 10, "w"); g.put(106, 10, "w");
  g.put(103, 10, "="); g.row(104, 105, 8, "="); g.put(104, 6, "H"); g.put(103, 8, "o"); g.put(105, 6, "o");
  g.put(110, 8, "?");
  g.row(113, 116, 9, "o");
  // final staircase + goal plateau
  g.put(118, 10, "#"); g.fill(120, 120, 9, 10, "#"); g.fill(122, 122, 8, 10, "#"); g.fill(124, 131, 7, 10, "#");
  g.put(118, 9, "o"); g.put(120, 8, "o"); g.put(122, 7, "o");
  g.put(125, 6, "o"); g.put(126, 6, "o");
  g.put(128, 6, "G");
  return {
    name: "Sunmeadow Sprint", sub: "Green hills and first steps", theme: "meadow",
    time: 240, speed: 0.88, cols: 132, rows: g.done(),
    movers: [{ c: 88, r: 9, axis: "x", dist: 5, speed: 1.0, w: 3 }],
  };
}

/* ------------------------------------------------ World 2 ------------------------------------------------ */
function world2(): LevelDef {
  const g = new Grid(150);
  g.fill(0, 149, 0, 1, "#");
  [10, 35, 36, 70, 105, 130].forEach((c) => g.put(c, 2, "#"));
  g.ground(0, 22); g.ground(26, 46); g.ground(51, 70); g.ground(74, 96); g.ground(100, 122);
  // safe crystal stepping ledge in pit at 123-126
  g.ground(123, 126, 12);
  g.ground(127, 149);
  g.put(3, 10, "P");
  g.row(6, 8, 9, "o");
  g.put(12, 8, "?"); g.put(13, 8, "B"); g.put(14, 8, "Q");
  g.put(19, 10, "w"); g.put(21, 10, "^");
  g.put(29, 10, "s"); g.row(31, 33, 9, "o");
  g.row(36, 37, 10, "="); g.row(36, 37, 7, "o");
  g.put(41, 10, "w");
  // warning coins arching over spikes at 44-45
  g.put(43, 8, "o"); g.put(44, 7, "o"); g.put(45, 7, "o"); g.put(46, 8, "o");
  g.put(44, 10, "^"); g.put(45, 10, "^");
  g.put(48, 9, "="); g.put(49, 7, "="); g.put(48, 8, "o"); g.put(49, 6, "o");
  g.put(52, 10, "C");
  g.put(57, 7, "?"); g.put(58, 7, "?");
  g.put(56, 4, "f");
  g.put(62, 8, "c"); g.put(66, 10, "w");
  g.put(68, 8, "B"); g.put(69, 8, "?"); g.put(70, 8, "B");
  g.put(77, 10, "s"); g.row(79, 81, 9, "o");
  g.put(81, 8, "o"); g.put(82, 7, "o"); g.put(83, 8, "o");
  g.put(86, 10, "w"); g.put(88, 10, "w");
  g.put(91, 8, "o"); g.put(92, 7, "o"); g.put(93, 7, "o");
  g.put(92, 10, "^"); g.put(93, 10, "^");
  g.put(95, 7, "Q");
  g.put(101, 10, "C");
  g.put(105, 4, "f"); g.row(106, 107, 10, "="); g.row(106, 107, 7, "o");
  g.put(111, 10, "w"); g.put(114, 10, "s");
  g.put(116, 8, "B"); g.put(117, 8, "B"); g.put(118, 8, "?"); g.put(119, 8, "B");
  g.put(124, 7, "o"); g.put(125, 7, "o"); g.put(125, 11, "o");
  g.put(128, 7, "="); g.put(128, 6, "H");
  g.put(133, 10, "w"); g.put(136, 5, "f");
  g.row(139, 141, 9, "o"); g.put(140, 8, "o");
  g.fill(143, 149, 10, 10, "#");
  g.put(146, 9, "G");
  return {
    name: "Crystal Hollow", sub: "Glow-worm caverns run deep", theme: "cave",
    time: 260, speed: 1.08, cols: 150, rows: g.done(),
    movers: [{ c: 123, r: 9, axis: "x", dist: 3, speed: 1.1, w: 3 }],
  };
}

/* ------------------------------------------------ World 3 ------------------------------------------------ */
function world3(): LevelDef {
  const g = new Grid(164);
  g.ground(0, 18); g.ground(22, 40); g.ground(45, 66); g.ground(71, 92); g.ground(97, 118); g.ground(123, 140); g.ground(146, 163);
  g.lava(19, 21); g.lava(41, 44); g.lava(93, 96); g.lava(141, 145);
  g.put(3, 10, "P");
  g.row(6, 9, 9, "o");
  g.put(11, 8, "?"); g.put(12, 8, "Q"); g.put(13, 8, "?");
  g.put(16, 10, "b");
  g.put(24, 10, "^"); g.put(25, 10, "^");
  g.put(28, 10, "w");
  g.row(31, 32, 10, "="); g.row(31, 32, 7, "o");
  g.put(36, 8, "c");
  g.row(42, 43, 10, "="); g.row(42, 43, 7, "o");
  g.put(46, 10, "C");
  g.put(50, 10, "s"); g.row(52, 54, 9, "o");
  g.put(57, 10, "b");
  g.put(60, 7, "?"); g.put(61, 7, "Q");
  g.put(63, 8, "B"); g.put(64, 8, "?"); g.put(65, 8, "B");
  g.put(68, 4, "f");
  g.put(74, 10, "w"); g.put(76, 10, "w");
  g.put(80, 10, "^"); g.put(81, 10, "^");
  g.put(83, 10, "="); g.row(84, 85, 8, "="); g.row(84, 85, 7, "o"); g.put(85, 6, "H");
  g.put(90, 8, "c");
  g.fill(94, 94, 9, 11, "#"); g.put(94, 8, "o");
  g.put(98, 10, "C");
  g.put(103, 10, "s"); g.put(106, 10, "b");
  g.put(109, 8, "B"); g.put(110, 8, "?"); g.put(111, 8, "Q"); g.put(112, 8, "B");
  g.put(115, 10, "w");
  g.put(120, 7, "o");
  g.put(126, 10, "^"); g.put(127, 10, "^");
  g.put(130, 10, "w");
  g.put(133, 8, "?"); g.put(136, 4, "f");
  g.put(142, 7, "o"); g.put(144, 7, "o");
  g.put(150, 10, "b");
  g.fill(156, 163, 10, 10, "#");
  g.put(157, 9, "o"); g.put(158, 9, "o");
  g.put(159, 9, "G");
  return {
    name: "Ember Dunes", sub: "Sunset sands over molten seams", theme: "dunes",
    time: 280, speed: 1.16, cols: 164, rows: g.done(),
    movers: [
      { c: 67, r: 9, axis: "x", dist: 3, speed: 1.15, w: 3 },
      { c: 119, r: 9, axis: "y", dist: 1.5, speed: 1.0, w: 3 },
      { c: 141, r: 9, axis: "x", dist: 4, speed: 1.3, w: 3 },
    ],
  };
}

/* ------------------------------------------------ World 4 ------------------------------------------------ */
function world4(): LevelDef {
  const g = new Grid(176);
  g.ground(0, 14); g.ground(18, 30); g.ground(35, 50); g.ground(57, 72); g.ground(77, 88);
  g.ground(93, 110); g.ground(115, 126); g.ground(131, 146); g.ground(151, 175);
  g.put(3, 10, "P");
  g.row(6, 8, 9, "o");
  g.put(10, 8, "?"); g.put(11, 8, "Q"); g.put(12, 8, "?");
  g.put(13, 10, "w");
  g.put(16, 9, "="); g.put(16, 8, "o");
  g.put(20, 5, "f"); g.put(23, 10, "^"); g.put(24, 10, "^");
  g.put(27, 10, "w");
  g.put(32, 9, "="); g.put(33, 7, "="); g.put(32, 8, "o"); g.put(33, 6, "o");
  g.put(37, 10, "s");
  g.put(40, 8, "B"); g.put(41, 8, "Q"); g.put(42, 8, "B");
  g.put(45, 10, "b"); g.row(47, 49, 9, "o");
  g.put(52, 7, "o"); g.put(54, 7, "o"); g.put(53, 3, "f");
  g.put(58, 10, "C");
  g.put(62, 10, "s");
  // wooden traction grip platform so players can brake safely on ice
  g.row(63, 64, 9, "="); g.row(64, 65, 7, "="); g.row(64, 65, 6, "o");
  g.put(68, 10, "w");
  g.fill(71, 72, 9, 10, "#"); g.put(70, 7, "o"); g.put(72, 7, "o");
  g.put(80, 10, "s"); g.put(83, 10, "b"); g.row(85, 87, 9, "o");
  g.put(90, 9, "="); g.put(91, 7, "="); g.put(90, 8, "o"); g.put(91, 6, "o");
  g.put(94, 10, "C");
  // balanced spikes on ice bridge
  g.row(97, 102, 9, "="); g.put(98, 8, "o"); g.put(100, 10, "^"); g.put(101, 10, "^");
  g.put(99, 7, "o"); g.put(100, 7, "o");
  g.put(105, 10, "w"); g.put(107, 4, "f");
  g.put(108, 8, "?");
  g.put(118, 10, "s"); g.put(121, 10, "s");
  g.put(121, 9, "="); g.row(122, 124, 7, "="); g.put(122, 6, "o"); g.put(124, 6, "o"); g.put(123, 6, "H");
  g.put(128, 3, "f");
  g.put(134, 10, "^"); g.put(135, 10, "^");
  g.put(138, 10, "b");
  g.put(141, 8, "B"); g.put(142, 8, "?"); g.put(143, 8, "B");
  g.put(145, 10, "w");
  g.put(148, 9, "="); g.put(149, 7, "="); g.put(148, 8, "o"); g.put(149, 6, "o");
  g.put(155, 5, "f"); g.put(158, 10, "s"); g.put(160, 4, "f"); g.put(163, 10, "w");
  g.row(166, 168, 9, "o");
  g.put(170, 8, "?");
  g.fill(171, 175, 10, 10, "#");
  g.put(173, 9, "G");
  return {
    name: "Frostbite Peaks", sub: "Every step is a slide", theme: "frost",
    time: 300, speed: 1.25, cols: 176, rows: g.done(),
    movers: [
      { c: 51, r: 9, axis: "x", dist: 4, speed: 1.2, w: 3 },
      { c: 73, r: 9, axis: "y", dist: 1.5, speed: 1.1, w: 3 },
      { c: 111, r: 9, axis: "x", dist: 3, speed: 1.35, w: 3 },
      { c: 127, r: 9, axis: "y", dist: 1.5, speed: 1.2, w: 3 },
    ],
  };
}

/* ------------------------------------------------ World 5 ------------------------------------------------ */
function world5(): LevelDef {
  const g = new Grid(190);
  g.ground(0, 12); g.ground(16, 30); g.ground(35, 52); g.ground(58, 76); g.ground(81, 100);
  g.ground(106, 124); g.ground(129, 146); g.ground(150, 189);
  g.lava(13, 15); g.lava(31, 34); g.lava(77, 80); g.lava(125, 128); g.lava(147, 149);
  g.fill(189, 189, 0, 10, "#");
  g.put(3, 10, "P");
  g.row(6, 8, 9, "o");
  g.put(10, 8, "?");
  g.put(14, 9, "="); g.put(14, 8, "o");
  g.put(18, 10, "w"); g.put(21, 10, "^"); g.put(22, 10, "^");
  g.put(26, 10, "b"); g.put(28, 8, "?");
  g.put(32, 7, "o"); g.put(33, 7, "o");
  g.put(36, 10, "C");
  g.put(40, 10, "s"); g.put(43, 10, "w");
  g.row(46, 47, 9, "="); g.row(46, 47, 7, "o");
  g.put(50, 8, "Q");
  g.put(55, 4, "f"); g.put(54, 7, "o"); g.put(56, 7, "o");
  g.put(60, 8, "c"); g.put(63, 10, "w");
  g.put(68, 10, "^"); g.put(69, 10, "^");
  g.put(72, 8, "B"); g.put(73, 8, "?"); g.put(74, 8, "B");
  g.row(78, 79, 9, "="); g.row(78, 79, 7, "o");
  g.put(82, 10, "C");
  g.put(86, 10, "b"); g.put(89, 10, "s"); g.put(92, 10, "w");
  g.put(94, 9, "="); g.row(95, 96, 7, "="); g.put(95, 6, "o"); g.put(96, 6, "o"); g.put(98, 6, "H");
  g.put(99, 8, "Q");
  g.put(103, 3, "f"); g.put(103, 6, "o");
  g.put(109, 10, "^"); g.put(110, 10, "^");
  g.put(113, 10, "w");
  g.put(116, 8, "B"); g.put(117, 8, "Q"); g.put(118, 8, "B");
  g.put(121, 4, "f"); g.put(122, 10, "s");
  g.put(126, 7, "o"); g.put(127, 7, "o");
  g.put(130, 10, "C");
  g.put(134, 10, "b"); g.put(137, 10, "w"); g.put(140, 10, "s");
  g.put(143, 8, "?"); g.put(144, 9, "o");
  g.put(148, 9, "="); g.put(148, 8, "o");
  // boss arena with pre-boss supply cache and tactical battle ledges
  g.put(151, 8, "H");
  g.put(153, 8, "Q");
  g.put(156, 9, "o"); g.put(157, 9, "o");
  // left ledge
  g.row(161, 163, 8, "="); g.put(162, 7, "o");
  // high center vantage platform
  g.row(168, 171, 6, "="); g.put(169, 5, "o"); g.put(170, 5, "o");
  // right battle perch
  g.row(176, 178, 8, "="); g.put(177, 7, "o");
  g.put(174, 10, "z");
  return {
    name: "Magmor's Forge", sub: "The Ember King awaits", theme: "forge",
    time: 340, speed: 1.36, cols: 190, rows: g.done(), hasBoss: true,
    movers: [
      { c: 31, r: 9, axis: "x", dist: 3, speed: 1.3, w: 3 },
      { c: 53, r: 9, axis: "x", dist: 4, speed: 1.4, w: 3 },
      { c: 101, r: 9, axis: "y", dist: 1.5, speed: 1.2, w: 3 },
      { c: 125, r: 9, axis: "x", dist: 3, speed: 1.5, w: 3 },
    ],
  };
}

export const LEVELS: LevelDef[] = [world1(), world2(), world3(), world4(), world5()];
