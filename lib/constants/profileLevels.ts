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
