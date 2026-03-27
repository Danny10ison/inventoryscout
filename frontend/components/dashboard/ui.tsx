import Link from "next/link";
import { ReactNode } from "react";

type PageHeaderProps = {
  badge: string;
  title: string;
  description: string;
  action?: {
    label: string;
    href: string;
  };
};

export function PageHeader({
  badge,
  title,
  description,
  action,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl">
        <div className="inline-flex rounded-full bg-amber-100 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-700">
          {badge}
        </div>
        <h1 className="mt-3 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-600 sm:text-sm">
          {description}
        </p>
      </div>

      {action ? (
        <Link
          href={action.href}
          className="inline-flex items-center justify-center rounded-full bg-slate-950 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 [color:#fff]"
          style={{ color: "#ffffff" }}
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}

export function Panel({
  title,
  children,
  tone = "light",
}: {
  title: string;
  children: ReactNode;
  tone?: "light" | "dark";
}) {
  const className =
    tone === "dark"
      ? "rounded-[1.2rem] bg-slate-950 p-4 text-white shadow-[0_18px_40px_rgba(15,23,42,0.2)]"
      : "rounded-[1.2rem] border border-slate-200/80 bg-white/85 p-4 shadow-sm";

  return (
    <section className={className}>
      <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function MetricCards({
  items,
}: {
  items: Array<{ label: string; value: string; note?: string }>;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      {items.map((item) => (
        <article
          key={item.label}
          className="rounded-[1.1rem] border border-slate-200/80 bg-white/90 p-3 shadow-sm"
        >
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">
            {item.label}
          </p>
          <p className="mt-1.5 text-lg font-semibold tracking-tight text-slate-950">
            {item.value}
          </p>
          {item.note ? (
            <p className="mt-1.5 text-xs leading-4 text-slate-500">{item.note}</p>
          ) : null}
        </article>
      ))}
    </div>
  );
}

export function DataTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: string[][];
}) {
  return (
    <div className="overflow-hidden rounded-[1.1rem] border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((column) => (
              <th
                key={column}
                className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {rows.map((row, index) => (
            <tr key={`${row[0]}-${index}`}>
              {row.map((cell, cellIndex) => (
                <td key={`${cell}-${cellIndex}`} className="px-4 py-3 text-slate-700">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
