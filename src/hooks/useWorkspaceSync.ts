import { useSyncExternalStore } from "react";
import { getWorkspaceSyncEventName } from "../data/supabaseSyncEngine";

let revision = 0;
let initialized = false;
const subscribers = new Set<() => void>();

function ensureEventBridge() {
  if (initialized || typeof window === "undefined") return;

  window.addEventListener(getWorkspaceSyncEventName(), () => {
    revision += 1;

    for (const subscriber of subscribers) {
      subscriber();
    }
  });

  initialized = true;
}

function subscribe(callback: () => void) {
  ensureEventBridge();
  subscribers.add(callback);

  return () => {
    subscribers.delete(callback);
  };
}

function getSnapshot() {
  ensureEventBridge();
  return revision;
}

export function useWorkspaceSyncVersion() {
  return useSyncExternalStore(subscribe, getSnapshot, () => 0);
}
