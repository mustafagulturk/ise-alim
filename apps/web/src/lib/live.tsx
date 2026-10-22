"use client";

import { useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { io } from "socket.io-client";
import { toast } from "sonner";
import { tokens } from "./api";
import { useAuth } from "./auth";

interface LiveEvent {
  type: "application.created" | "application.updated" | "application.moved" | "application.scored" | "activity.created" | "interview.booked";
  jobId?: string;
  applicationId?: string;
  actorId?: string;
  data?: Record<string, unknown>;
}

const Ctx = createContext({ connected: false });

/**
 * WebSocket üzerinden gelen olaylarla ilgili sorguları yeniler.
 * Kendi yaptığımız değişiklikler zaten iyimser güncellendiği için bildirim göstermeyiz.
 */
export function LiveProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const { me } = useAuth();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!me) return;
    const socket = io(process.env.NEXT_PUBLIC_LIVE_URL || undefined, {
      path: "/api/live",
      auth: (cb) => cb({ token: tokens.get() }),
      transports: ["websocket", "polling"],
    });
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("event", (e: LiveEvent) => {
      const mine = e.actorId === me.user.id;
      if (e.jobId) qc.invalidateQueries({ queryKey: ["board", e.jobId] });
      if (e.applicationId) qc.invalidateQueries({ queryKey: ["application", e.applicationId] });
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["applications"] });
      qc.invalidateQueries({ queryKey: ["analytics"] });
      if (e.type === "application.created") toast("Yeni başvuru geldi", { description: "CV yapay zekâ ile değerlendiriliyor…" });
      if (e.type === "application.scored") toast.success(`CV değerlendirildi: ${String(e.data?.score ?? "")} puan`);
      if (e.type === "application.moved" && !mine && e.actorId) toast("Bir ekip arkadaşın adayı taşıdı");
      if (e.type === "interview.booked") {
        qc.invalidateQueries({ queryKey: ["interviews"] });
        toast.success(`${String(e.data?.name ?? "Aday")} mülakat saatini seçti`, {
          description: new Date(String(e.data?.startsAt)).toLocaleString("tr-TR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }),
        });
      }
    });
    return () => {
      socket.disconnect();
    };
  }, [me, qc]);

  return <Ctx.Provider value={{ connected }}>{children}</Ctx.Provider>;
}

export const useLive = () => useContext(Ctx);
