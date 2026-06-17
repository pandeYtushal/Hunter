import React from "react";
import { Search, Building2, Target, FileText, FileSearch, Zap } from "lucide-react";

interface PromptSuggestionsProps {
  onSelect: (prompt: string) => void;
}

const suggestions = [
  { label: "Analyze this page", prompt: "Analyze this page", icon: Search },
  { label: "Explain this screenshot", prompt: "Explain this screenshot", icon: FileSearch },
  { label: "Help me apply", prompt: "Help me apply to this job", icon: Zap },
  { label: "Review my resume", prompt: "Review my resume against this job posting", icon: Target },
  { label: "Research company", prompt: "Research this company", icon: Building2 },
  { label: "Find Apply button", prompt: "Find the Apply button on this page", icon: FileText }
];

export const PromptSuggestions: React.FC<PromptSuggestionsProps> = ({ onSelect }) => {
  return (
    <div className="flex gap-2 overflow-x-auto py-2.5 px-4 hide-scrollbar select-none premium-scrollbar">
      {suggestions.map((s, idx) => {
        const Icon = s.icon;
        return (
          <button
            key={idx}
            onClick={() => onSelect(s.prompt)}
            className="suggestion-chip flex h-7 items-center gap-1.5 rounded-full border border-zinc-800 bg-[#161618]/60 px-3 text-[10.5px] font-medium text-zinc-400 hover:text-zinc-200 transition shrink-0 cursor-pointer"
          >
            <Icon size={11} className="text-[#ff6b35] shrink-0" />
            <span>{s.label}</span>
          </button>
        );
      })}
    </div>
  );
};
