import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
  variant?: ButtonVariant;
}

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-[#ff6b35] text-[#09090b] font-bold hover:bg-[#ff8255] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(255,107,53,0.25)] focus-visible:ring-[#ff6b35] disabled:opacity-50",
  secondary:
    "border border-[var(--border-color)] bg-transparent text-[var(--text-secondary)] hover:border-[#ff6b35]/45 hover:text-[#ff6b35]",
  ghost:
    "text-[var(--text-secondary)] hover:text-[#ff6b35] hover:bg-[var(--bg-tertiary)] focus-visible:ring-[var(--border-color)]"
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
