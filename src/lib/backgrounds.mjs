export const BACKGROUND_OPTIONS = Object.freeze([
  { id: '1g-eclipse-bg', label: '1G Eclipse — Southern' },
  { id: 'crownvic-bg', label: 'Crown Victoria — Original' },
  { id: 'eclipse-challenge-bg', label: 'Eclipse & Challenger — Original' },
  { id: 'vw-bg', label: 'Volkswagen — Original' },
  { id: 'crownvic-southern-bg', label: 'Crown Victoria — Southern' },
  { id: 'eclipse-challenge-southern-bg', label: 'Eclipse & Challenger — Southern' },
  { id: 'vw-southern-bg', label: 'Volkswagen GTI — Southern' },
  { id: 'vw-atlas-southern-bg', label: '2019 Volkswagen Atlas — Southern' },
  { id: 'ram-2500-southern-bg', label: '2015 Ram 2500 — Southern' }
]);

const BACKGROUND_IDS = new Set(BACKGROUND_OPTIONS.map(({ id }) => id));

export function normalizeBackgroundChoice(choice) {
  return BACKGROUND_IDS.has(choice) ? choice : 'random';
}

export function chooseBackgroundId(choice, random = Math.random) {
  const normalized = normalizeBackgroundChoice(choice);
  if (normalized !== 'random') return normalized;
  const index = Math.min(
    BACKGROUND_OPTIONS.length - 1,
    Math.max(0, Math.floor(random() * BACKGROUND_OPTIONS.length))
  );
  return BACKGROUND_OPTIONS[index].id;
}
