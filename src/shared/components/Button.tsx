import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
  variant?: ButtonVariant;
}

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--text-primary)] text-[var(--bg-primary)] hover:opacity-90 focus-visible:ring-1 focus-visible:ring-[var(--border-hover)] disabled:opacity-50",
  secondary:
    "border border-[var(--border-color)] bg-transparent text-[var(--text-secondary)] hover:border-[var(--border-hover)] hover:text-[var(--text-primary)] hover:bg-[var(--border-color)]/30",
  ghost:
    "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-color)]/45 focus-visible:ring-1 focus-visible:ring-[var(--border-hover)]/30"
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
