"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { DashboardShell } from "@/components/dashboard/shell";
import {
  ensureAuthenticatedUser,
  InventoryScoutAuthError,
} from "@/lib/inventoryscout-api";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const pathname = usePathname();
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    async function checkSession() {
      try {
        await ensureAuthenticatedUser();
      } catch (error) {
        if (error instanceof InventoryScoutAuthError) {
          router.replace(`/login?next=${encodeURIComponent(pathname)}`);
          return;
        }
      } finally {
        setIsCheckingSession(false);
      }
    }

    void checkSession();
  }, [pathname, router]);

  if (isCheckingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,_#f6f1e4_0%,_#edf2fa_100%)] px-6">
        <div className="rounded-[1.5rem] border border-white/70 bg-white/85 px-8 py-6 text-sm text-slate-600 shadow-[0_28px_80px_rgba(15,23,42,0.08)]">
          Checking your session...
        </div>
      </div>
    );
  }

  return <DashboardShell>{children}</DashboardShell>;
}
