export const MEDAL_ICON_URL = "/images/medalreward.png";

export type LevelDefinition = {
  min: number;
  max: number;
  title: string;
};

export const LEVELS: LevelDefinition[] = [
  { min: 1, max: 5, title: "Latte Learner" },
  { min: 6, max: 20, title: "Desk Devotee" },
  { min: 21, max: 50, title: "Earphone Explorer" },
  { min: 51, max: 100, title: "Backpack Nomad" },
  { min: 101, max: Infinity, title: "Ocean Pathfinder" },
];

export const LEVEL_ICONS = [
  "/images/latte.png",
  "/images/standing-desk.png",
  "/images/earphones.png",
  "/images/backpack.png",
  "/images/ocean.png",
];

export const VISITED_LEVELS: LevelDefinition[] = [
  { min: 1, max: 5, title: "Latte Explorer" },
  { min: 6, max: 20, title: "Urban Voyager" },
  { min: 21, max: 50, title: "Skyline Navigator" },
  { min: 51, max: 100, title: "Orbit Runner" },
  { min: 101, max: Infinity, title: "Cosmic Pathfinder" },
];

export const VISITED_LEVEL_ICONS = [
  "/images/barista.png",
  "/images/scooter.png",
  "/images/skyline.png",
  "/images/globe.png",
  "/images/astronaut.png"
];

export function getLevel(count: number) {
  const level = LEVELS.find((l) => count >= l.min && count <= l.max) ?? LEVELS[0];
  const currentIndex = LEVELS.indexOf(level);
  const nextThreshold = LEVELS[currentIndex + 1]?.min ?? level.min;
  const lower = level.min;
  const range = Math.max((nextThreshold - lower), 1);
  const rawProgress = isFinite(level.max)
    ? ((count - lower) / range) * 100
    : 100;
  const progress = Math.min(100, Math.max(0, Math.round(rawProgress)));

  return {
    title: level.title,
    levelNumber: currentIndex + 1,
    progress,
    nextThreshold,
    isMax: !isFinite(level.max),
  };
}

export function getVisitedLevel(count: number) {
  const level = VISITED_LEVELS.find((l) => count >= l.min && count <= l.max) ?? VISITED_LEVELS[0];
  const currentIndex = VISITED_LEVELS.indexOf(level);
  const nextThreshold = VISITED_LEVELS[currentIndex + 1]?.min ?? level.min;
  const lower = level.min;
  const range = Math.max(nextThreshold - lower, 1);
  const rawProgress = isFinite(level.max) ? ((count - lower) / range) * 100 : 100;
  const progress = Math.min(100, Math.max(0, Math.round(rawProgress)));

  return {
    title: level.title,
    levelNumber: currentIndex + 1,
    progress,
    nextThreshold,
    isMax: !isFinite(level.max),
  };
}
