/** Find the smallest lower depth that satisfies the supplied predicate. */
export function findSmallestValidSection<T extends { width: number; height: number }>(
  current: T,
  depthLadder: readonly number[],
  isValid: (section: T) => boolean,
): T {
  for (const height of depthLadder.filter((value) => value < current.height).sort((a, b) => a - b)) {
    const candidate = { ...current, height };
    if (isValid(candidate)) return candidate;
  }
  return current;
}

/** Find the smallest lower square size that satisfies the supplied predicate. */
export function findSmallestValidSquareSize(
  current: { width: number; height: number },
  sizeLadder: readonly number[],
  isValid: (section: { width: number; height: number }) => boolean,
): { width: number; height: number } {
  for (const size of sizeLadder.filter((value) => value < Math.min(current.width, current.height)).sort((a, b) => a - b)) {
    const candidate = { width: size, height: size };
    if (isValid(candidate)) return candidate;
  }
  return current;
}
