import { useSyncExternalStore } from "react";
import { getWorkspaceSyncEventName } from "../data/supabaseSyncEngine";

let revision = 0;
const subscribers = new Set<() => void>();

function handleWorkspaceSynced() {
  revision += 1;

  for (const subscriber of subscribers) {
    subscriber();
  }
}

if (typeof window !== "undefined") {
  window.addEventListener(getWorkspaceSyncEventName(), handleWorkspaceSynced);
}

function subscribe(callback: () => void) {
  subscribers.add(callback);

  return () => {
    subscribers.delete(callback);
  };
}

function getSnapshot() {
  return revision;
}

export function useWorkspaceSyncVersion() {
  return useSyncExternalStore(subscribe, getSnapshot, () => 0);
}
