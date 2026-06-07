import type { ReactNode } from "react";

interface BadgeProps {
  children: ReactNode;
  tone?: "blue" | "green" | "slate";
}

const tones = {
  blue: "bg-zinc-100 text-zinc-900 ring-zinc-200 dark:bg-zinc-900 dark:text-zinc-100 dark:ring-zinc-800",
  green:
    "bg-zinc-100 text-zinc-900 ring-zinc-200 dark:bg-zinc-900 dark:text-zinc-100 dark:ring-zinc-800",
  slate:
    "bg-zinc-100 text-zinc-700 ring-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-zinc-800"
};

export const Badge = ({ children, tone = "slate" }: BadgeProps) => (
  <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ${tones[tone]}`}>
    {children}
  </span>
);
