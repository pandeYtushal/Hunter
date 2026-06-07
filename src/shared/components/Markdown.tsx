import React from "react";

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
        <strong key={index} className="font-extrabold text-zinc-950 dark:text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={index}
          className="bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 px-1.5 py-0.5 rounded font-mono text-[11px] border border-zinc-200/50 dark:border-zinc-700/50"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return (
        <em key={index} className="italic text-zinc-800 dark:text-zinc-300">
          {part.slice(1, -1)}
        </em>
      );
    }
    return part;
  });
};

interface MarkdownProps {
  content: string;
  className?: string;
}

export const Markdown = ({ content, className = "" }: MarkdownProps) => {
  if (!content) return null;

  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  
  let currentListItems: React.ReactNode[] = [];
  let listKey = 0;

  const flushList = () => {
    if (currentListItems.length > 0) {
      elements.push(
        <ul
          key={`list-${listKey++}`}
          className="list-disc list-inside pl-1.5 my-2 space-y-1 text-zinc-800 dark:text-zinc-200 text-[12.5px]"
        >
          {currentListItems}
        </ul>
      );
      currentListItems = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Check for headings
    if (trimmed.startsWith("### ")) {
      flushList();
      elements.push(
        <h4
          key={`h3-${i}`}
          className="text-[11px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mt-4 mb-2 leading-tight"
        >
          {parseInlineMarkdown(trimmed.slice(4))}
        </h4>
      );
    } else if (trimmed.startsWith("## ") || trimmed.startsWith("# ")) {
      flushList();
      const cleanHeader = trimmed.startsWith("## ") ? trimmed.slice(3) : trimmed.slice(2);
      elements.push(
        <h3
          key={`h2-${i}`}
          className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white mt-5 mb-2.5 leading-tight"
        >
          {parseInlineMarkdown(cleanHeader)}
        </h3>
      );
    }
    // 2. Check for bullet list items
    else if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
      const cleanItem = trimmed.slice(2);
      currentListItems.push(
        <li key={`li-${i}-${currentListItems.length}`} className="marker:text-[#f97316] leading-relaxed pl-0.5">
          {parseInlineMarkdown(cleanItem)}
        </li>
      );
    }
    // 3. Normal paragraph lines
    else {
      if (trimmed === "") {
        flushList();
      } else {
        flushList();
        elements.push(
          <p
            key={`p-${i}`}
            className="text-[12.5px] leading-relaxed text-zinc-800 dark:text-zinc-200 mb-2.5 last:mb-0"
          >
            {parseInlineMarkdown(trimmed)}
          </p>
        );
      }
    }
  }

  // Flush any remaining list items
  flushList();

  return <div className={`markdown-body font-sans space-y-1.5 ${className}`}>{elements}</div>;
};

export default Markdown;
