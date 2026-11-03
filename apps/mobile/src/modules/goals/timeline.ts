export function buildTimeline(start: Date, end: Date) {
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  const items: { key: string; label: string; date: Date }[] = [];
  while (cursor <= last && items.length < 18) {
    items.push({
      key: `${cursor.getFullYear()}-${cursor.getMonth()}`,
      label: cursor.toLocaleDateString('es-CO', { month: 'short' }),
      date: new Date(cursor),
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return items;
}
