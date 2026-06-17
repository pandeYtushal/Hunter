import React, { useRef } from "react";
import { ChevronLeft, ChevronRight, Search, Building2, Target, FileText, FileSearch, Zap } from "lucide-react";

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
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollRecommendations = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;

    el.scrollBy({
      left: direction === "left" ? -220 : 220,
      behavior: "smooth"
    });
  };

  return (
    <div className="suggestion-chip-wrapper select-none">
      <button
        type="button"
        onClick={() => scrollRecommendations("left")}
        className="suggestion-scroll-btn left-2"
        title="Previous recommendations"
        aria-label="Previous recommendations"
      >
        <ChevronLeft size={13} />
      </button>

      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto py-2.5 px-9 hide-scrollbar select-none premium-scrollbar scroll-smooth"
      >
        {suggestions.map((s, idx) => {
          const Icon = s.icon;
          return (
            <button
              key={idx}
              onClick={() => onSelect(s.prompt)}
              className="suggestion-chip flex h-7 items-center gap-1.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 text-[10.5px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition shrink-0 cursor-pointer"
            >
              <Icon size={11} className="text-[#ff6b35] shrink-0" />
              <span>{s.label}</span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => scrollRecommendations("right")}
        className="suggestion-scroll-btn right-2"
        title="Next recommendations"
        aria-label="Next recommendations"
      >
        <ChevronRight size={13} />
      </button>
    </div>
  );
};
