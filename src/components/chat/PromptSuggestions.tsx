import React, { useRef } from "react";
import { ChevronLeft, ChevronRight, Search, Building2, Target, FileText, Zap, Sparkles, HelpCircle } from "lucide-react";

interface PromptSuggestionsProps {
  currentUrl?: string;
  onSelect: (prompt: string) => void;
}

export const getDynamicSuggestions = (url: string) => {
  const isJobBoard = url && (
    url.includes("linkedin.com/jobs") ||
    url.includes("indeed.com") ||
    url.includes("glassdoor.com") ||
    url.includes("lever.co") ||
    url.includes("greenhouse.io") ||
    url.includes("workday") ||
    url.includes("/job/") ||
    url.includes("/careers/")
  );

  const isRepo = url && (
    url.includes("github.com") ||
    url.includes("gitlab.com")
  );

  if (isJobBoard) {
    return [
      { label: "Apply to this Job", prompt: "Apply to this Job", icon: Zap },
      { label: "Compare with Resume", prompt: "Compare this job page with my resume", icon: Target },
      { label: "Cover letter draft", prompt: "Generate a cover letter for this job", icon: FileText },
      { label: "Research company", prompt: "Research this company", icon: Building2 }
    ];
  } else if (isRepo) {
    return [
      { label: "Explain repository", prompt: "Explain the purpose of this repository and the technologies used", icon: Sparkles },
      { label: "Summarize readme", prompt: "Summarize the key information in the README", icon: FileText },
      { label: "Find setup guides", prompt: "Where are the build or setup instructions in this repository?", icon: Search }
    ];
  } else {
    return [
      { label: "Explain page", prompt: "Explain this page in detail", icon: Sparkles },
      { label: "Summarize page", prompt: "Summarize the key information on this page", icon: FileText },
      { label: "Find contacts", prompt: "Find contacts or key info on this page", icon: Search },
      { label: "Ask a question", prompt: "Help me understand what this website is about", icon: HelpCircle }
    ];
  }
};

export const PromptSuggestions: React.FC<PromptSuggestionsProps> = ({ currentUrl = "", onSelect }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const items = getDynamicSuggestions(currentUrl);

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
        {items.map((s, idx) => {
          const Icon = s.icon;
          return (
            <button
              key={idx}
              onClick={() => onSelect(s.prompt)}
              className="suggestion-chip group flex h-8 items-center gap-1.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition shrink-0 cursor-pointer"
            >
              <Icon size={11} className="text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] shrink-0" />
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

