"use client";

import { useSyncExternalStore } from "react";
import { alias } from "./format";

const KEY = "kadro:kor-mod";
const listeners = new Set<() => void>();

function read() {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Kör değerlendirme: aday adları ve iletişim bilgileri gizlenir, ekip yalnızca yetkinliğe bakar.
 * Tercih tarayıcıda saklanır ve tüm sekmelerde aynı anda değişir.
 */
export function useBlind() {
  const blind = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    () => false,
  );
  const toggle = () => {
    try {
      localStorage.setItem(KEY, blind ? "0" : "1");
    } catch {}
    listeners.forEach((l) => l());
  };
  const name = (c: { id: string; name: string }) => (blind ? alias(c.id) : c.name);
  return { blind, toggle, name };
}
