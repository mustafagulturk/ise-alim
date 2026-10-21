"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Sidebar } from "@/components/Sidebar";
import { ThemeToggle } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { LiveProvider } from "@/lib/live";

export default function PanelLayout({ children }: { children: ReactNode }) {
  const { me, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && !me) router.replace("/giris");
  }, [ready, me, router]);

  if (!ready || !me) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <Loader2 className="size-6 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <LiveProvider>
      <Sidebar />
      <div className="lg:pl-64">
        <div className="pointer-events-none fixed top-4 right-6 z-20 hidden lg:block">
          <ThemeToggle className="pointer-events-auto card" />
        </div>
        <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">{children}</main>
      </div>
    </LiveProvider>
  );
}
