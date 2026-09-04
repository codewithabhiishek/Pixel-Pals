/* Playable hero roster — each has distinct physics stats and look. */

export interface CharacterDef {
  id: string;
  name: string;
  species: string;
  tagline: string;
  body: string;
  bodyDark: string;
  belly: string;
  scarf: string;
  earTip: string;
  ears: "fox" | "bear" | "frog" | "bunny";
  tail: "bush" | "stub" | "puff" | "none";
  walk: number;
  run: number;
  accel: number;
  airAccel: number;
  jump: number;
  friction: number;
  lives: number;
  stats: { speed: number; jump: number; power: number };
}

export const CHARACTERS: CharacterDef[] = [
  {
    id: "ember",
    name: "Ember",
    species: "Fox",
    tagline: "The balanced trailblazer. No weaknesses, all heart.",
    body: "#ff8c3b",
    bodyDark: "#e0702a",
    belly: "#fdf3e3",
    scarf: "#ff5a5f",
    earTip: "#5c2c10",
    ears: "fox",
    tail: "bush",
    walk: 258,
    run: 372,
    accel: 2500,
    airAccel: 1750,
    jump: 585,
    friction: 2900,
    lives: 3,
    stats: { speed: 3, jump: 3, power: 3 },
  },
  {
    id: "bramble",
    name: "Bramble",
    species: "Bear",
    tagline: "A rolling boulder of fur. Starts with an extra heart.",
    body: "#a9744f",
    bodyDark: "#8a5a3a",
    belly: "#ecd9bd",
    scarf: "#5cc257",
    earTip: "#5c3a22",
    ears: "bear",
    tail: "stub",
    walk: 268,
    run: 388,
    accel: 2150,
    airAccel: 1500,
    jump: 580,
    friction: 3300,
    lives: 4,
    stats: { speed: 3, jump: 2, power: 5 },
  },
  {
    id: "pip",
    name: "Pip",
    species: "Frog",
    tagline: "Springs for legs. Clears gaps nobody else dares.",
    body: "#5cc257",
    bodyDark: "#43a047",
    belly: "#eaf7d8",
    scarf: "#ffc94d",
    earTip: "#2e7d32",
    ears: "frog",
    tail: "none",
    walk: 250,
    run: 348,
    accel: 2600,
    airAccel: 2350,
    jump: 640,
    friction: 2900,
    lives: 3,
    stats: { speed: 2, jump: 5, power: 2 },
  },
  {
    id: "zip",
    name: "Zip",
    species: "Hare",
    tagline: "Blistering top speed — if you can handle the brakes.",
    body: "#cfd8dc",
    bodyDark: "#a7b6bd",
    belly: "#fdf3e3",
    scarf: "#2f8fb8",
    earTip: "#f48fb1",
    ears: "bunny",
    tail: "puff",
    walk: 292,
    run: 418,
    accel: 2800,
    airAccel: 1950,
    jump: 580,
    friction: 2150,
    lives: 3,
    stats: { speed: 5, jump: 3, power: 2 },
  },
];

export const getCharacter = (id: string): CharacterDef =>
  CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
