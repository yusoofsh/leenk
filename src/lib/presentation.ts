const STAR_FIELD_SIZE = 4000;
const STAR_FIELD_OFFSET = STAR_FIELD_SIZE / 2;

const createSeededRandom = (seed: number) => {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
};

export const createStarShadows = (count: number, seed: number) => {
  const random = createSeededRandom(seed);
  const shadows: string[] = [];

  for (let index = 0; index < count; index += 1) {
    const x = Math.floor(random() * STAR_FIELD_SIZE) - STAR_FIELD_OFFSET;
    const y = Math.floor(random() * STAR_FIELD_SIZE) - STAR_FIELD_OFFSET;
    shadows.push(`${x}px ${y}px`);
  }

  return shadows.join(", ");
};

export const shouldTrackPointer = (
  pointerType: string,
  hasFinePointer: boolean,
  shouldReduceMotion: boolean,
) => pointerType === "mouse" && hasFinePointer && !shouldReduceMotion;
