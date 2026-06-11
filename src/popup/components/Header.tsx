import { Sun, Moon } from "lucide-react";

interface HeaderProps {
  theme: "dark" | "light" | "system";
  onThemeChange: (theme: "dark" | "light" | "system") => void;
}

export const Header = ({ theme, onThemeChange }: HeaderProps) => {
  return (
    <header className="flex items-center justify-between border-b border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3">
      <div className="flex items-center gap-2">
        <h1 className="font-sans text-xs font-bold tracking-tight text-[var(--text-primary)]">
          HUNTERR
        </h1>
        <span className="font-mono text-[8px] tracking-wide text-[var(--text-secondary)] bg-[var(--bg-secondary)] px-1 py-0.5 rounded border border-[var(--border-color)]">
          v0.1.0
        </span>
      </div>

      <button
        onClick={() => onThemeChange(theme === "dark" ? "light" : "dark")}
        className="flex items-center justify-center p-1.5 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition cursor-pointer"
        title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>
        {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
      </button>
    </header>
  );
};
