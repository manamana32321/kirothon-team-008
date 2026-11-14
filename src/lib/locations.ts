export type Position = {
  memberId: string;
  lat: number;
  lng: number;
  accuracyM: number;
  updatedAt: number;
};

const globalForLocations = globalThis as unknown as {
  groupLocations?: Map<string, Map<string, Position>>;
};

const store: Map<string, Map<string, Position>> =
  (globalForLocations.groupLocations ??= new Map());

export function savePosition(groupId: string, pos: Position): void {
  let group = store.get(groupId);
  if (!group) {
    group = new Map();
    store.set(groupId, group);
  }
  group.set(pos.memberId, pos);
}

export function getPosition(groupId: string, memberId: string): Position | undefined {
  return store.get(groupId)?.get(memberId);
}

export function listPositions(groupId: string): Position[] {
  return [...(store.get(groupId)?.values() ?? [])];
}

export function removePosition(groupId: string, memberId: string): boolean {
  const group = store.get(groupId);
  const removed = group?.delete(memberId) ?? false;
  if (group && group.size === 0) store.delete(groupId);
  return removed;
}

export function clearGroup(groupId: string): void {
  store.delete(groupId);
}
