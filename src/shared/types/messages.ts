import type { UserProfile } from "./storage";
export type ThemeMode = "light" | "dark" | "system";

export interface VisualBounds {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
}

export interface PageSnapshot {
  title: string;
  url: string;
  host: string;
  selectedText: string;
  description: string;
  content?: string;
  metadata?: Record<string, string>;
}

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
}

export type SidebarStatus = "open" | "closed";

export type RuntimeMessage =
  | { type: "PING" }
  | { type: "GET_PAGE_SNAPSHOT" }
  | { type: "SEND_CHAT_MESSAGE"; prompt: string; pageContext?: PageSnapshot }
  | { type: "GET_CHAT_HISTORY" }
  | { type: "CLEAR_CHAT_HISTORY" }
  | { type: "TOGGLE_SIDEBAR" }
  | { type: "OPEN_SIDEBAR" }
  | { type: "CLOSE_SIDEBAR" }
  | { type: "SIDEBAR_STATUS_CHANGED"; status: SidebarStatus }
  | { type: "THEME_CHANGED"; theme: ThemeMode }
  | {
      type: "PAGE_CONTENT_UPDATED";
      payload: {
        title: string;
        url: string;
        metadata: Record<string, string>;
        content: string;
      };
    }
  | { type: "PARSE_RESUME"; resumeText: string }
  | { type: "AUTOFILL_FORM" }
  | { type: "ANALYZE_FORM_FIELDS"; formHtmlExcerpt: string }
  | { type: "SCAN_FORM" }
  | { type: "EXECUTE_AUTOFILL"; proposals: Array<{ tempId: string; labelText: string; mappedType: string; fillValue: string; tagName: string }> }
  | { type: "CANCEL_AUTOFILL" }
  | { type: "CLICK_ELEMENT"; selector: string; text?: string }
  | { type: "FILL_INPUT"; selector: string; value: string }
  | { type: "EXTRACT_TEXT" }
  | { type: "NAVIGATE_PAGE"; url: string }
  | { type: "UPLOAD_RESUME" }
  | { type: "GET_ACTIVE_TAB" }
  | { type: "SEND_TO_ACTIVE_TAB"; message: RuntimeMessage }
  | { type: "HIGHLIGHT_DOM_ELEMENT"; selector: string; text?: string }
  | { type: "SCROLL_TO_ELEMENT"; selector: string }
  | { type: "HOVER_ELEMENT"; selector: string }
  | { type: "FOCUS_INPUT"; selector: string }
  | { type: "LOCATE_ELEMENT_BY_BOUNDS"; bounds: VisualBounds }
  | { type: "SHOW_VISUAL_OVERLAY"; elements: any[] }
  | { type: "HIDE_VISUAL_OVERLAY" };

export interface RuntimeResponseMap {
  PING: { ok: true };
  GET_PAGE_SNAPSHOT: { snapshot: PageSnapshot };
  SEND_CHAT_MESSAGE: { message: ChatMessage; history: ChatMessage[] };
  GET_CHAT_HISTORY: { history: ChatMessage[] };
  CLEAR_CHAT_HISTORY: { history: ChatMessage[] };
  TOGGLE_SIDEBAR: { status: SidebarStatus };
  OPEN_SIDEBAR: { status: SidebarStatus };
  CLOSE_SIDEBAR: { status: SidebarStatus };
  SIDEBAR_STATUS_CHANGED: { ok: true };
  THEME_CHANGED: { ok: true };
  PAGE_CONTENT_UPDATED: { ok: true };
  PARSE_RESUME: { ok: true; profile: UserProfile } | { ok: false; error: string };
  AUTOFILL_FORM: { ok: true; filled: string[]; skipped: string[]; highlighted: string[] } | { ok: false; error: string };
  ANALYZE_FORM_FIELDS: { ok: true; mappings: Array<{ fieldId: string; mappedType: string }> } | { ok: false; error: string };
  SCAN_FORM: {
    ok: true;
    proposals: Array<{ tempId: string; labelText: string; mappedType: string; fillValue: string; tagName: string }>;
    highlighted: string[];
    skipped: string[];
  } | { ok: false; error: string };
  EXECUTE_AUTOFILL: { ok: true; filledCount: number } | { ok: false; error: string };
  CANCEL_AUTOFILL: { ok: true } | { ok: false; error: string };
  CLICK_ELEMENT: { ok: true } | { ok: false; error: string };
  FILL_INPUT: { ok: true } | { ok: false; error: string };
  EXTRACT_TEXT: { ok: true; text: string } | { ok: false; error: string };
  NAVIGATE_PAGE: { ok: true } | { ok: false; error: string };
  UPLOAD_RESUME: { ok: true } | { ok: false; error: string };
  GET_ACTIVE_TAB: { tab?: { id?: number; url?: string; title?: string } };
  SEND_TO_ACTIVE_TAB: any;
  HIGHLIGHT_DOM_ELEMENT: { ok: true } | { ok: false; error: string };
  SCROLL_TO_ELEMENT: { ok: true } | { ok: false; error: string };
  HOVER_ELEMENT: { ok: true } | { ok: false; error: string };
  FOCUS_INPUT: { ok: true } | { ok: false; error: string };
  LOCATE_ELEMENT_BY_BOUNDS: { ok: true; selector: string } | { ok: false; error: string };
  SHOW_VISUAL_OVERLAY: { ok: true } | { ok: false; error: string };
  HIDE_VISUAL_OVERLAY: { ok: true } | { ok: false; error: string };
}

export type RuntimeMessageType = RuntimeMessage["type"];

export type RuntimeResponse<T extends RuntimeMessageType> = T extends keyof RuntimeResponseMap
  ? RuntimeResponseMap[T]
  : never;
