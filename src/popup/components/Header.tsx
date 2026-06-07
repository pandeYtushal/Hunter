interface HeaderProps {
  theme: "dark" | "light" | "system";
  onThemeChange: (theme: "dark" | "light" | "system") => void;
}

export const Header = ({ theme, onThemeChange }: HeaderProps) => {
  return (
    <header className="flex items-center justify-between border-b border-slate-100 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded bg-slate-900 font-sans text-xs font-bold text-white dark:bg-white dark:text-zinc-950">
          H
        </div>
        <h1 className="font-sans text-xs font-bold tracking-tight text-slate-900 dark:text-white">
          HUNTERR
        </h1>
        <span className="font-mono text-[8px] tracking-wide text-slate-400 bg-slate-50 px-1 py-0.5 rounded border border-slate-100 dark:border-zinc-800 dark:bg-black dark:text-zinc-500">
          v0.1.0
        </span>
      </div>
      
      <button
        onClick={() => onThemeChange(theme === "dark" ? "light" : "dark")}
        className="font-mono text-[9px] uppercase tracking-wider text-slate-400 hover:text-slate-900 transition dark:text-zinc-500 dark:hover:text-white"
      >
        {theme === "dark" ? "light" : "dark"}
      </button>
    </header>
  );
};
