import { StatKey, TurbineCard } from './gameTypes.ts';

export function computeCompletedQuartets(
  cardIds: string[],
  cardById: Record<string, TurbineCard>
): number[] {
  const counts = new Map<number, number>();
  for (const id of cardIds) {
    const card = cardById[id];
    if (!card) continue;
    counts.set(card.groupId, (counts.get(card.groupId) ?? 0) + 1);
  }
  const completed: number[] = [];
  for (const [groupId, count] of counts.entries()) {
    if (count === 4) completed.push(groupId);
  }
  return completed.sort((a, b) => a - b);
}

export function compareStat(
  statKey: StatKey,
  v1: number,
  v2: number
): 1 | 2 | 0 {
  if (Math.abs(v1 - v2) < 1e-6) return 0;
  if (statKey === 'cutInWindMs') {
    return v1 < v2 ? 1 : 2;
  }
  return v1 > v2 ? 1 : 2;
}
