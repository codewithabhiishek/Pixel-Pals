/* Emberfox world data. Levels are authored on a tile grid with a tiny builder DSL.
   Tile chars:
   #  solid block        B  brick            ?  coin block       Q  power (fruit) block
   =  one-way plank      ^  spikes (deadly)  ~  lava (deadly)    o  coin
   P  player start       C  checkpoint flag  G  goal flag        H  heart (extra life)
   V  ceiling stalactite S  spring pad
   w  walker   f  flyer  s  spiker (no stomp) b  bouncer  c  pipe chomper  z  boss
*/

export const TILE = 40;
export const ROWS = 14;

export type MusicTheme = "menu" | "meadow" | "cave" | "dunes" | "frost" | "forge" | "sky" | "cosmic" | "boss" | null;

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
  skyline: "hills" | "cave" | "dunes" | "peaks" | "forge" | "clouds" | "cosmos";
  sun: { color: string; y: number; size: number } | null;
  icy?: boolean;
  windUpdraft?: boolean;
  lowGravity?: boolean;
  hasEruptions?: boolean;
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
    ambient: "ember", skyline: "forge", sun: null, icy: false, hasEruptions: true, music: "forge",
  },
  sky: {
    sky: ["#254b77", "#6b9bd1"], far: "#356499", farAlt: "#4c7eb8",
    tile: "#57606f", tileDark: "#2f3542", rim: "#70a1ff",
    brick: "#747d8c", brickDark: "#57606f", accent: "#eccc68", plat: "#7bed9f",
    pipe: "#2ed573", pipeDark: "#1e90ff", glow: "#70a1ff",
    ambient: "cloud", skyline: "clouds", sun: { color: "#ffffff", y: 65, size: 55 },
    icy: false, windUpdraft: true, music: "sky",
  },
  cosmic: {
    sky: ["#070814", "#161938"], far: "#1a1c3d", farAlt: "#2e2354",
    tile: "#453c67", tileDark: "#2b2347", rim: "#e83a78",
    brick: "#584b7a", brickDark: "#372b53", accent: "#00fff5", plat: "#7e62a3",
    pipe: "#9b5de5", pipeDark: "#5c2b99", glow: "#00fff5",
    ambient: "dust", skyline: "cosmos", sun: { color: "#e83a78", y: 85, size: 70 },
    icy: false, lowGravity: true, music: "cosmic",
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
  // Ceiling stalactites that punish careless high jumps throughout the cavern
  [10, 21, 35, 36, 44, 45, 62, 70, 77, 92, 93, 105, 114, 130].forEach((c) => g.put(c, 2, "V"));
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
    time: 250, speed: 1.05, cols: 150, rows: g.done(),
    movers: [{ c: 123, r: 9, axis: "x", dist: 3, speed: 1.1, w: 3 }],
  };
}

/* ------------------------------------------------ World 3 ------------------------------------------------ */
function world3(): LevelDef {
  const g = new Grid(164);
  // Undulating sand dunes rising and falling into quicksand valleys
  // Dune 1: rolling sand crest
  g.ground(0, 7, 11);
  g.ground(8, 13, 9);
  g.ground(14, 17, 8);
  g.ground(18, 20, 10);
  g.lava(21, 24); // Quicksand trench 1
  g.put(20, 9, "S"); // Launch over quicksand onto high Mesa 1

  // Mesa 1: elevated sandstone plateau (row 7)
  g.ground(25, 36, 7);
  g.ground(37, 40, 9);
  g.ground(41, 44, 10);
  g.lava(45, 48); // Quicksand trench 2
  g.put(44, 9, "S"); // Launch to Mesa 2
  g.row(45, 48, 6, "o"); // Arc of guide coins

  // Mesa 2: elevated desert ridge with Checkpoint 1 (ends at 66 to leave clean gap for mover)
  g.ground(49, 66, 7);

  // Sandstone canyon with moving ferry
  g.ground(74, 86, 9);
  g.lava(87, 92); // Great Quicksand Chasm
  g.put(86, 8, "S"); // Launch to High Ridge
  g.row(87, 91, 5, "o"); // Arc of guide coins

  // Mesa 3: High canyon ridge with Checkpoint 2
  g.ground(93, 116, 7);

  // Stepped dunes to final oasis
  g.ground(122, 138, 8);
  g.lava(139, 143);
  g.put(138, 7, "S"); // Launch to final victory terrace
  g.row(139, 142, 5, "o"); // Arc of guide coins
  g.ground(144, 163, 7);

  // Player start & items
  g.put(3, 10, "P");
  g.row(6, 9, 9, "o");
  g.row(21, 24, 6, "o"); // Guide coins over quicksand 1
  g.put(11, 7, "?"); g.put(12, 7, "Q"); g.put(13, 7, "?");
  g.put(15, 7, "b");
  g.put(27, 6, "w");
  g.put(31, 6, "b");
  g.put(34, 5, "c");
  g.put(38, 8, "^");

  // Checkpoint 1
  g.put(50, 6, "C");
  g.put(54, 6, "s");
  g.row(56, 58, 5, "o");
  g.put(61, 4, "f");
  g.put(64, 6, "b");

  // Canyon stepping & secret heart
  g.put(77, 8, "w");
  g.row(79, 82, 5, "="); g.put(80, 4, "o"); g.put(81, 4, "H");

  // Checkpoint 2
  g.put(95, 6, "C");
  g.put(99, 6, "s");
  g.put(102, 4, "?"); g.put(103, 4, "Q");
  g.put(106, 6, "b");
  g.put(109, 6, "^"); g.put(110, 6, "^");
  g.put(113, 6, "w");

  // Pre-oasis dunes
  g.put(126, 7, "w");
  g.put(130, 7, "s");
  g.put(133, 4, "f");
  g.put(135, 7, "b");

  // Goal plateau
  g.row(148, 152, 6, "o");
  g.put(155, 6, "w");
  g.put(159, 6, "G");

  return {
    name: "Ember Dunes", sub: "Sunset sands over molten seams", theme: "dunes",
    time: 260, speed: 1.18, cols: 164, rows: g.done(),
    movers: [
      { c: 69, r: 8, axis: "x", dist: 2, speed: 1.2, w: 3 },
      { c: 118, r: 8, axis: "y", dist: 1.5, speed: 1.1, w: 3 },
    ],
  };
}

/* ------------------------------------------------ World 4 ------------------------------------------------ */
function world4(): LevelDef {
  const g = new Grid(176);
  // Mountain Ascent & Glacier Slide
  // Foot of mountain
  g.ground(0, 15, 11);

  // Ascent Terrace 1
  g.ground(19, 32, 9);

  // Ascent Terrace 2
  g.ground(37, 50, 7);

  // Mountain Summit Peak (High glacier at row 5!)
  g.ground(55, 74, 5);

  // The Glacier Slide (Sinuous stepped descent down the summit)
  g.ground(80, 95, 7);
  g.ground(99, 116, 8);
  g.ground(122, 140, 9);
  g.ground(146, 175, 10);

  // Player start at mountain base
  g.put(3, 10, "P");
  g.row(6, 8, 9, "o");
  g.put(10, 8, "?"); g.put(11, 8, "Q"); g.put(12, 8, "?");
  g.put(13, 10, "w");

  // Ascent step 1
  g.put(22, 8, "w");
  g.put(25, 6, "f");
  g.put(28, 8, "^");

  // Ascent step 2
  g.put(39, 6, "s");
  g.put(42, 4, "?"); g.put(43, 4, "Q");
  g.put(46, 6, "b");

  // Mountain Summit Peak with Checkpoint 1
  g.put(57, 4, "C");
  g.put(60, 4, "s");
  g.put(63, 2, "f");
  g.put(66, 4, "b");
  g.put(69, 4, "^"); g.put(70, 4, "^");
  g.put(72, 4, "w");

  // Downhill Glacier Slide with braking platforms
  g.row(82, 85, 6, "="); g.put(83, 5, "o"); g.put(84, 5, "o");
  g.put(88, 6, "w");
  g.put(91, 6, "^");

  // Checkpoint 2 on mid-slide terrace
  g.put(101, 7, "C");
  g.put(104, 7, "b");
  g.row(107, 110, 5, "="); g.put(108, 4, "H"); // Secret Heart at high braking plank
  g.put(113, 7, "s");

  // Lower slide shelf
  g.put(125, 8, "w");
  g.put(129, 5, "f");
  g.put(133, 8, "s");
  g.put(137, 8, "^");

  // Goal valley terrace
  g.put(150, 9, "b");
  g.row(155, 158, 8, "o");
  g.put(162, 9, "w");
  g.put(172, 9, "G");

  return {
    name: "Frostbite Peaks", sub: "Every step is a slide", theme: "frost",
    time: 270, speed: 1.28, cols: 176, rows: g.done(),
    movers: [
      { c: 16, r: 10, axis: "x", dist: 1.5, speed: 1.2, w: 3 },
      { c: 34, r: 8, axis: "x", dist: 1.5, speed: 1.25, w: 3 },
      { c: 76, r: 6, axis: "x", dist: 1.5, speed: 1.3, w: 3 },
      { c: 118, r: 8, axis: "y", dist: 1.5, speed: 1.2, w: 3 },
      { c: 142, r: 9, axis: "x", dist: 1.5, speed: 1.35, w: 3 },
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
    time: 320, speed: 1.38, cols: 190, rows: g.done(), hasBoss: true,
    movers: [
      { c: 31, r: 9, axis: "x", dist: 3, speed: 1.3, w: 3 },
      { c: 53, r: 9, axis: "x", dist: 4, speed: 1.4, w: 3 },
      { c: 101, r: 9, axis: "y", dist: 1.5, speed: 1.2, w: 3 },
      { c: 125, r: 9, axis: "x", dist: 3, speed: 1.5, w: 3 },
    ],
  };
}

/* ------------------------------------------------ World 6 ------------------------------------------------ */
function world6(): LevelDef {
  const g = new Grid(180);
  // Pure aerial cloud islands - no ground floor at 11-13 (fall into open sky!)
  // Island 1: entrance cloud (row 9-10)
  g.fill(0, 18, 9, 10, "#");
  g.put(3, 8, "P");
  g.row(6, 9, 7, "o");
  g.put(11, 6, "?"); g.put(12, 6, "Q"); g.put(13, 6, "?");
  g.put(16, 8, "w");

  // Sky leap 1 over open sky to Cloud Tower 1 (elevated at row 7-8)
  g.row(19, 22, 6, "o"); // Aerial coin arc guiding the moving cloud ferry
  g.fill(24, 34, 7, 8, "#");
  g.put(27, 6, "b"); // Cloud Bouncer
  g.put(31, 6, "w");
  g.put(34, 6, "S"); // Cloud Spring Pad launching up to High Citadel!
  g.row(35, 38, 3, "o"); // Spring arc guide coins

  // High Cloud Citadel at row 4-5!
  g.fill(39, 56, 4, 5, "#");
  g.put(41, 3, "C"); // Checkpoint 1
  g.put(45, 3, "s");
  g.row(48, 50, 2, "?"); g.put(49, 2, "Q");
  g.put(53, 3, "w");
  g.put(54, 1, "f");

  // Aerial descent via elevator mover down to Mid-Air Cloud Stepping Stones
  g.row(62, 64, 7, "="); g.put(63, 6, "o"); // Stepping cloud between elevator and Island 4
  g.fill(66, 76, 8, 9, "#");
  g.put(70, 7, "s");
  g.put(74, 7, "w");
  // Secret High Roost at row 3 with extra Heart!
  g.row(68, 72, 3, "="); g.put(70, 2, "H"); g.put(69, 2, "o"); g.put(71, 2, "o");

  // Floating Sky Sanctuary at row 6-7
  g.fill(90, 108, 6, 7, "#");
  g.put(93, 5, "C"); // Checkpoint 2
  g.put(96, 5, "b");
  g.put(99, 3, "f");
  g.put(101, 5, "^"); g.put(102, 5, "^");
  g.put(105, 5, "w");
  g.put(108, 5, "S"); // Cloud Spring Pad launching across the Grand Aerial Rift!
  g.row(109, 113, 3, "o"); // Spring arc guide coins

  // Grand Sky Sanctum (rising cloud steps)
  g.row(114, 117, 6, "="); g.row(114, 117, 4, "o");
  g.row(124, 126, 6, "="); g.put(125, 5, "o"); // Stepping cloud between elevator and Sanctum
  g.fill(128, 142, 6, 7, "#");
  g.put(131, 5, "s");
  g.put(134, 3, "f");
  g.put(136, 5, "b");
  g.put(139, 5, "w");

  // Ascending Celestial Cloud Stairs to the Grand Sky Portal
  g.fill(146, 152, 7, 8, "#"); g.put(148, 6, "o"); g.put(149, 6, "o");
  g.fill(154, 160, 6, 7, "#"); g.put(156, 5, "o"); g.put(157, 5, "o");
  g.fill(162, 168, 5, 6, "#"); g.put(164, 4, "o"); g.put(165, 4, "o");
  g.fill(170, 179, 4, 5, "#");
  g.put(172, 3, "o"); g.put(173, 3, "o");
  g.put(175, 3, "G");

  return {
    name: "Aether Skyway", sub: "Cloudbound ruins above the storm", theme: "sky",
    time: 280, speed: 1.48, cols: 180, rows: g.done(),
    movers: [
      { c: 20, r: 8, axis: "x", dist: 2.5, speed: 1.25, w: 3 },
      { c: 58, r: 5, axis: "y", dist: 2.0, speed: 1.2, w: 3 },
      { c: 82, r: 7, axis: "x", dist: 4.5, speed: 1.35, w: 3 },
      { c: 120, r: 6, axis: "y", dist: 2.0, speed: 1.3, w: 3 },
    ],
  };
}

/* ------------------------------------------------ World 7 ------------------------------------------------ */
function world7(): LevelDef {
  const g = new Grid(200);
  // Zero-G Cosmic Asteroid Belt - shattered space platforms over plasma seams (rows 12-13)
  g.lava(16, 20);
  g.lava(34, 38);
  g.lava(54, 58);
  g.lava(76, 80);
  g.lava(98, 102);
  g.lava(120, 124);
  g.lava(144, 148);
  g.lava(160, 164);

  // Asteroid Alpha (row 9)
  g.fill(0, 15, 9, 10, "#");
  g.put(3, 8, "P");
  g.row(6, 8, 7, "o");
  g.put(10, 6, "?"); g.put(11, 6, "Q"); g.put(12, 6, "?");
  g.put(14, 8, "w");

  // Asteroid Beta (floats at row 6)
  g.fill(21, 33, 6, 7, "#");
  g.put(24, 5, "b"); // Cosmic Bouncer
  g.put(28, 5, "s");
  g.put(31, 5, "w");

  // Asteroid Gamma (High Space Orbit at row 4)
  g.fill(39, 53, 4, 5, "#");
  g.put(41, 3, "C"); // Checkpoint 1
  g.put(45, 3, "^"); g.put(46, 3, "^");
  g.put(49, 3, "s");
  g.put(51, 1, "f");
  g.put(52, 2, "Q");

  // Asteroid Delta (floating at row 7)
  g.fill(59, 75, 7, 8, "#");
  g.put(62, 6, "w");
  g.put(66, 6, "b");
  g.put(70, 6, "s");
  g.put(73, 6, "^"); g.put(74, 6, "^");
  // Hovering space beam with secret Heart
  g.row(65, 69, 3, "="); g.put(67, 2, "H");

  // Asteroid Epsilon (floating at row 5)
  g.fill(81, 97, 5, 6, "#");
  g.put(84, 4, "s");
  g.put(88, 4, "b");
  g.put(91, 2, "f");
  g.put(94, 4, "w");

  // Asteroid Zeta (floating at row 8)
  g.fill(103, 119, 8, 9, "#");
  g.put(105, 7, "C"); // Checkpoint 2
  g.put(109, 7, "b");
  g.put(112, 7, "^"); g.put(113, 7, "^");
  g.put(116, 7, "s");

  // Asteroid Eta (floating at row 5)
  g.fill(125, 143, 5, 6, "#");
  g.put(128, 3, "f");
  g.put(131, 4, "s");
  g.put(135, 4, "b");
  g.put(139, 4, "w");
  g.put(142, 4, "Q");

  // Cosmic Stepping Bridge connecting Asteroid Eta to Spring Launcher
  g.row(145, 147, 6, "="); g.put(146, 5, "o");

  // Cosmic Spring Launcher Asteroid (row 7)
  g.fill(149, 159, 7, 8, "#");
  g.put(152, 6, "s");
  g.put(158, 6, "S"); // Cosmic Spring Launch Pad!
  g.row(160, 163, 4, "o"); // Soaring cosmic coin arc

  // Celestial Steps leading up to the Grand Space Apex
  g.fill(165, 171, 8, 9, "#"); g.put(167, 7, "o"); g.put(168, 7, "o");
  g.fill(173, 179, 7, 8, "#"); g.put(175, 6, "o"); g.put(176, 6, "o");
  g.fill(181, 187, 6, 7, "#"); g.put(183, 5, "o"); g.put(184, 5, "o");
  g.fill(189, 199, 5, 6, "#");
  g.put(191, 4, "o"); g.put(192, 4, "o");
  g.put(195, 4, "G"); // Grand Cosmic Goal Shrine

  return {
    name: "Starfall Void", sub: "Cosmic gauntlet at the edge of space", theme: "cosmic",
    time: 260, speed: 1.58, cols: 200, rows: g.done(),
    movers: [
      { c: 17, r: 7, axis: "x", dist: 2.5, speed: 1.35, w: 3 },
      { c: 35, r: 5, axis: "y", dist: 2.0, speed: 1.25, w: 3 },
      { c: 55, r: 6, axis: "x", dist: 2.5, speed: 1.4, w: 3 },
      { c: 77, r: 5, axis: "y", dist: 2.0, speed: 1.3, w: 3 },
      { c: 99, r: 7, axis: "x", dist: 2.5, speed: 1.45, w: 3 },
      { c: 121, r: 5, axis: "y", dist: 2.0, speed: 1.35, w: 3 },
    ],
  };
}

export const LEVELS: LevelDef[] = [
  world1(),
  world2(),
  world3(),
  world4(),
  world5(),
  world6(),
  world7(),
];
