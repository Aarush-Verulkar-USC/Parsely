type Indexable = Record<string, unknown> | unknown[];

function isIndexable(v: unknown): v is Indexable {
  return typeof v === "object" && v !== null;
}

export function getByPath(obj: unknown, path: string): unknown {
  let cur: unknown = obj;
  for (const seg of path.split(".")) {
    if (!isIndexable(cur)) return undefined;
    cur = (cur as Record<string, unknown>)[seg];
  }
  return cur;
}

export function setByPath(obj: unknown, path: string, value: unknown): void {
  const segs = path.split(".");
  const last = segs.pop()!;
  let cur: unknown = obj;
  for (const seg of segs) {
    if (!isIndexable(cur)) return;
    cur = (cur as Record<string, unknown>)[seg];
  }
  if (isIndexable(cur)) {
    (cur as Record<string, unknown>)[last] = value;
  }
}
