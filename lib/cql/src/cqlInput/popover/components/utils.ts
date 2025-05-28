export const wrapSelection = (current: number, by: number, length: number) =>
  (current + by + (by < 0 ? length : 0)) % length;
