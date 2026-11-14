export type GroupEvent =
  | "group.updated"
  | "response.created"
  | "clip.created"
  | "penalty.applied"
  | "location.updated"
  | "poke.sent";

type Listener = (event: GroupEvent) => void;

const globalForEvents = globalThis as unknown as {
  groupSubscribers?: Map<string, Set<Listener>>;
};

const subscribers: Map<string, Set<Listener>> =
  (globalForEvents.groupSubscribers ??= new Map());

export function subscribe(groupId: string, listener: Listener): () => void {
  let listeners = subscribers.get(groupId);
  if (!listeners) {
    listeners = new Set();
    subscribers.set(groupId, listeners);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && subscribers.get(groupId) === listeners) {
      subscribers.delete(groupId);
    }
  };
}

export function publish(groupId: string, event: GroupEvent): void {
  subscribers.get(groupId)?.forEach((listener) => listener(event));
}
