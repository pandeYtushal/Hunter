import React from "react";
import { Copy, Check } from "lucide-react";

/**
 * A safe, lightweight helper to parse inline markdown features like:
 * - **bold**
 * - `inline code`
 * - *italic*
 */
export const parseInlineMarkdown = (text: string): React.ReactNode[] => {
  if (!text) return [];

  // Tokenize the string using regex to match bold (**), inline code (`), and italic (*)
  const tokenRegex = /(\*\*.*?\*\*|`.*?`|\*.*?\*)/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-bold text-[var(--text-primary)]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={index}
          className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/60 dark:border-white/5 text-zinc-800 dark:text-zinc-300 px-1.5 py-0.5 rounded font-mono text-[12px] font-semibold mx-0.5"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return (
        <em key={index} className="italic text-[var(--text-secondary)]">
          {part.slice(1, -1)}
        </em>
      );
    }
    return part;
  });
};

interface CodeBlockProps {
  language: string;
  code: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ language, code }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy code:", err);
    }
  };

  return (
    <div className="my-3.5 overflow-hidden rounded-xl border border-white/10 shadow-lg bg-zinc-950 font-mono text-[12.5px] text-zinc-100">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-white/5 select-none">
        <span className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase font-sans">
          {language || "code"}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-[10px] font-semibold text-zinc-400 hover:text-white transition cursor-pointer font-sans bg-transparent border-0 p-0"
        >
          {copied ? (
            <>
              <Check size={11} className="text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy size={11} />
              <span>Copy code</span>
            </>
          )}
        </button>
      </div>
      {/* Pre/Code */}
      <pre className="p-4 overflow-x-auto custom-scrollbar select-text leading-relaxed whitespace-pre font-mono text-[12.5px]">
        <code>{code}</code>
      </pre>
    </div>
  );
};

interface MarkdownProps {
  content: string;
  className?: string;
  isStreaming?: boolean;
}

export const Markdown = ({ content, className = "", isStreaming = false }: MarkdownProps) => {
  if (!content) return null;

  // Intercept Profile Match Analysis to render custom premium card
  if (content.includes("Profile Match Analysis") || content.includes("Match Score:")) {
    const scoreMatch = content.match(/\*\*Match Score:\*\*\s*(\d+)%/i) || content.match(/Match Score:\s*(\d+)%/i);
    const matchScore = scoreMatch ? scoreMatch[1] : null;

    if (matchScore) {
      // Extract Matched Skills
      const matchedSection = content.split(/Matched Skills:/i)[1];
      const matchedSkills: string[] = [];
      if (matchedSection) {
        const listPart = matchedSection.split(/Missing Skills:/i)[0].split(/Recommendations:/i)[0];
        const matches = listPart.match(/-\s*([^\n\r]+)/g);
        if (matches) {
          matches.forEach(m => {
            const clean = m.replace(/^-\s*/, "").replace(/\*\*/g, "").trim();
            if (clean && clean !== "None") matchedSkills.push(clean);
          });
        }
      }

      // Extract Missing Skills
      const missingSection = content.split(/Missing Skills:/i)[1];
      const missingSkills: string[] = [];
      if (missingSection) {
        const listPart = missingSection.split(/Recommendations:/i)[0];
        const matches = listPart.match(/-\s*([^\n\r]+)/g);
        if (matches) {
          matches.forEach(m => {
            const clean = m.replace(/^-\s*/, "").replace(/\*\*/g, "").trim();
            if (clean && clean !== "None") missingSkills.push(clean);
          });
        }
      }

      // Extract recommendations/explanation
      const recommendationsSection = content.split(/Recommendations:/i)[1];
      const recommendations = recommendationsSection ? recommendationsSection.trim().replace(/^\*\*:\*\*/, "").trim() : null;

      return (
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-4 shadow-md space-y-4 my-2 text-[13px] w-full max-w-lg font-sans">
          <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
            <span className="font-semibold text-[var(--text-secondary)]">Resume Match Analysis</span>
            <span className="text-2xl font-black text-[var(--accent)]">{matchScore}%</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1.5 text-left">Matched</span>
              <div className="space-y-1">
                {matchedSkills.length === 0 ? (
                  <span className="text-[11px] text-[var(--text-muted)] italic block text-left">None</span>
                ) : (
                  matchedSkills.map(skill => (
                    <div key={skill} className="flex items-center gap-1.5 text-emerald-500 font-medium text-[12px] text-left">
                      <span className="text-emerald-500">✓</span>
                      <span className="text-[var(--text-primary)]">{skill}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div>
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1.5 text-left">Missing</span>
              <div className="space-y-1">
                {missingSkills.length === 0 ? (
                  <span className="text-[11px] text-[var(--text-muted)] italic block text-left">None</span>
                ) : (
                  missingSkills.map(skill => (
                    <div key={skill} className="flex items-center gap-1.5 text-[var(--text-muted)] text-[12px] text-left">
                      <span className="text-rose-500">×</span>
                      <span>{skill}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          {recommendations && (
            <div className="border-t border-[var(--border-color)] pt-3 text-[12px] text-[var(--text-secondary)] leading-relaxed text-left">
              {recommendations}
            </div>
          )}
        </div>
      );
    }
  }

  const elements: React.ReactNode[] = [];
  const lines = content.split("\n");
  
  let i = 0;
  let listKey = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Check for code block start
    if (trimmed.startsWith("```")) {
      const lang = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      // skip the closing ```
      i++;
      const codeText = codeLines.join("\n");
      elements.push(
        <CodeBlock key={`code-${i}`} language={lang} code={codeText} />
      );
      continue;
    }

    // 2. Check for bullet list
    if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
      const listItems: React.ReactNode[] = [];
      while (i < lines.length) {
        const itemLine = lines[i].trim();
        if (itemLine.startsWith("* ") || itemLine.startsWith("- ")) {
          const cleanItem = itemLine.slice(2);
          listItems.push(
            <li key={`li-${i}`} className="marker:text-[var(--text-muted)] pl-1 leading-relaxed">
              {parseInlineMarkdown(cleanItem)}
            </li>
          );
          i++;
        } else {
          break;
        }
      }
      elements.push(
        <ul
          key={`list-${listKey++}`}
          className="list-disc pl-5 my-3 space-y-1 text-[var(--text-primary)] text-sm leading-relaxed"
        >
          {listItems}
        </ul>
      );
      continue;
    }

    // 3. Check for numbered list
    const numListMatch = trimmed.match(/^(\d+)\.\s(.*)/);
    if (numListMatch) {
      const listItems: React.ReactNode[] = [];
      while (i < lines.length) {
        const itemLine = lines[i].trim();
        const itemMatch = itemLine.match(/^(\d+)\.\s(.*)/);
        if (itemMatch) {
          const cleanItem = itemMatch[2];
          listItems.push(
            <li key={`li-${i}`} className="pl-1 leading-relaxed">
              {parseInlineMarkdown(cleanItem)}
            </li>
          );
          i++;
        } else {
          break;
        }
      }
      elements.push(
        <ol
          key={`list-${listKey++}`}
          className="list-decimal pl-5 my-3 space-y-1 text-[var(--text-primary)] text-sm leading-relaxed"
        >
          {listItems}
        </ol>
      );
      continue;
    }

    // 4. Check for headings
    if (trimmed.startsWith("### ")) {
      elements.push(
        <h4 key={`h4-${i}`} className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mt-4.5 mb-2 leading-tight">
          {parseInlineMarkdown(trimmed.slice(4))}
        </h4>
      );
      i++;
      continue;
    }
    if (trimmed.startsWith("## ") || trimmed.startsWith("# ")) {
      const cleanHeader = trimmed.startsWith("## ") ? trimmed.slice(3) : trimmed.slice(2);
      elements.push(
        <h3 key={`h3-${i}`} className="text-sm font-bold text-[var(--text-primary)] mt-5 mb-2.5 leading-tight">
          {parseInlineMarkdown(cleanHeader)}
        </h3>
      );
      i++;
      continue;
    }

    // 5. Horizontal rule
    if (trimmed === "---" || trimmed === "***") {
      elements.push(<hr key={`hr-${i}`} className="my-4 border-t border-[var(--border-color)]" />);
      i++;
      continue;
    }

    // 6. Normal paragraph or blank lines
    if (trimmed === "") {
      i++;
      continue;
    }

    elements.push(
      <p key={`p-${i}`} className="text-sm leading-relaxed text-[var(--text-primary)] mb-3 last:mb-0">
        {parseInlineMarkdown(trimmed)}
      </p>
    );
    i++;
  }

  // Handle streaming cursor animation at the very end
  if (isStreaming && elements.length > 0) {
    const lastIdx = elements.length - 1;
    const lastElement = elements[lastIdx];

    if (React.isValidElement(lastElement) && lastElement.type === "p") {
      elements[lastIdx] = React.cloneElement(
        lastElement,
        lastElement.props,
        ...React.Children.toArray(lastElement.props.children),
        <span key="streaming-cursor" className="inline-block w-1.5 h-3.5 ml-1 bg-[var(--accent)] animate-pulse rounded-sm align-middle" />
      );
    } else {
      elements.push(
        <span key="streaming-cursor" className="inline-block w-1.5 h-3.5 ml-1 bg-[var(--accent)] animate-pulse rounded-sm align-middle" />
      );
    }
  } else if (isStreaming) {
    elements.push(
      <span key="streaming-cursor" className="inline-block w-1.5 h-3.5 ml-1 bg-[var(--accent)] animate-pulse rounded-sm align-middle" />
    );
  }

  return <div className={`markdown-body font-sans space-y-1.5 ${className}`}>{elements}</div>;
};

export default Markdown;
