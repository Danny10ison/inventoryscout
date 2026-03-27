"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { logoutCurrentUser } from "@/lib/inventoryscout-api";
import { dashboardNavSections } from "./navigation";

function isActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      await logoutCurrentUser();
      router.replace("/login");
      router.refresh();
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <aside className="flex rounded-[1.5rem] bg-[#151d34] p-4 text-white shadow-[0_20px_60px_rgba(15,23,42,0.28)]">
      <div className="flex min-h-full w-full flex-col">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
          InventoryScout
        </p>
        <h2 className="mt-2 text-base font-semibold tracking-tight text-white">
          Product Research Workspace
        </h2>
      </div>

      <nav className="mt-4 flex-1 space-y-3">
        {dashboardNavSections.map((section) => (
          <section key={section.title} className="rounded-[1.1rem] bg-white/5 p-3">
            <h2 className="text-sm font-semibold tracking-tight text-white">
              {section.title}
            </h2>
            <div className="mt-2 space-y-1.5">
              {section.items.map((item) => {
                const active = isActive(pathname, item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`block rounded-lg px-2.5 py-1.5 text-xs transition ${
                      active
                        ? "bg-slate-500/70 font-medium text-white"
                        : "text-slate-200 hover:bg-white/8 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </nav>

        <button
          type="button"
          onClick={() => void handleLogout()}
          disabled={isLoggingOut}
          className="mt-3 rounded-lg border border-white/10 px-3 py-2 text-left text-xs font-medium text-slate-200 transition hover:bg-white/8 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoggingOut ? "Logging out..." : "Log Out"}
        </button>
      </div>
    </aside>
  );
}
