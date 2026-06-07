import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
  variant?: ButtonVariant;
}

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-amber-500 text-zinc-950 font-bold hover:bg-amber-600 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(249,115,22,0.25)] focus-visible:ring-amber-500 disabled:opacity-50 dark:bg-amber-500 dark:text-zinc-950 dark:hover:bg-amber-600",
  secondary:
    "border border-zinc-200/10 bg-transparent text-zinc-750 hover:border-amber-500/45 hover:text-amber-500 dark:border-zinc-800/50 dark:text-zinc-300 dark:hover:border-amber-500/45 dark:hover:text-amber-500",
  ghost:
    "text-zinc-500 hover:text-amber-500 focus-visible:ring-zinc-800 dark:text-zinc-450 dark:hover:text-amber-500"
};

export const Button = ({ children, icon, variant = "primary", className = "", ...props }: ButtonProps) => (
  <button
    className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg px-4 text-xs font-semibold tracking-wide transition-all duration-150 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
    type="button"
    {...props}
  >
    {icon}
    {children}
  </button>
);
