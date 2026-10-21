/** Normalize API list payloads that may be an array, `{ items }`, `{ Items }`, or null. */
export function normalizeList<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) {
    return raw as T[];
  }
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    for (const key of ['items', 'Items', 'data', 'Data', 'results', 'Results']) {
      const value = obj[key];
      if (Array.isArray(value)) {
        return value as T[];
      }
    }
  }
  return [];
}

/** Merge matching inbox `{ items, myJobs }` into one deduped list (myJobs first). */
export function normalizeMatchingInbox(raw: unknown): {
  items: import('../core/models').ServiceRequestSummary[];
  myJobs: import('../core/models').ServiceRequestSummary[];
  all: import('../core/models').ServiceRequestSummary[];
} {
  type Row = import('../core/models').ServiceRequestSummary;
  if (Array.isArray(raw)) {
    const all = raw as Row[];
    return { items: all, myJobs: [], all };
  }
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    const items = normalizeList<Row>(obj['items'] ?? obj['Items'] ?? []);
    const myJobs = normalizeList<Row>(obj['myJobs'] ?? obj['MyJobs'] ?? []);
    const byId = new Map<string, Row>();
    for (const row of [...myJobs, ...items]) {
      if (row?.id) {
        byId.set(row.id, row);
      }
    }
    return { items, myJobs, all: [...byId.values()] };
  }
  return { items: [], myJobs: [], all: [] };
}
