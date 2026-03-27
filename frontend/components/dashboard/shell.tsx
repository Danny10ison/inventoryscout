import { ReactNode } from "react";

import { DashboardSidebar } from "./sidebar";

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(247,212,125,0.45),_transparent_24%),linear-gradient(180deg,_#f6f1e4_0%,_#edf2fa_100%)] px-3 py-3 text-slate-900 sm:px-4 lg:px-6">
      <div className="mx-auto grid max-w-[1600px] gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="rounded-[1.5rem] border border-white/70 bg-white/82 p-4 shadow-[0_28px_80px_rgba(15,23,42,0.08)] backdrop-blur sm:p-5 lg:p-6">
          {children}
        </div>
        <DashboardSidebar />
      </div>
    </div>
  );
}
