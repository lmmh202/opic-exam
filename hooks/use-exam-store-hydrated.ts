import { useSyncExternalStore } from "react";
import { useExamStore } from "@/lib/store";

function subscribe(onStoreChange: () => void) {
  return useExamStore.persist.onFinishHydration(onStoreChange);
}

function getClientSnapshot() {
  return useExamStore.persist.hasHydrated();
}

function getServerSnapshot() {
  return false;
}

/** True after zustand persist has finished rehydrating from localStorage. */
export function useExamStoreHydrated() {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}
