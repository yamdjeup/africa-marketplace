"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_REGION, REGIONS, type Region } from "@/data/regions";

const KEY = "epomta-region";
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

const read = () => localStorage.getItem(KEY) ?? DEFAULT_REGION;

export function setRegion(code: string) {
  localStorage.setItem(KEY, code);
  listeners.forEach((l) => l());
}

export function useRegion(): Region {
  const code = useSyncExternalStore(subscribe, read, () => DEFAULT_REGION);
  return REGIONS.find((r) => r.code === code) ?? REGIONS[0];
}
