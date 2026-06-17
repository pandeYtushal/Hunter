import React from "react";

export const TypingIndicator: React.FC = () => {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3 border-l-2 border-[#ff6b35] bg-[#111111]/30 rounded-r-xl max-w-max">
      <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider select-none mr-1">
        Hunter is thinking
      </span>
      <div className="flex gap-1 items-center h-2">
        <span className="bounce-dot bg-zinc-400" />
        <span className="bounce-dot bg-zinc-450" />
        <span className="bounce-dot bg-zinc-500" />
      </div>
    </div>
  );
};
