export function visibleUntil<T extends { date: string }>(
  items: T[],
  date: string,
): T[] {
  return items.filter((item) => item.date <= date);
}
