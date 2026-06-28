export const sidebarStyles = `
:host {
  display: block !important;
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 0 !important;
  height: 0 !important;
  z-index: 2147483647 !important;
  pointer-events: none !important;

  color-scheme: light dark;
  --agent-bg: rgba(251, 251, 250, 0.72);
  --agent-fg: #171717;
  --agent-muted: #737373;
  --agent-border: rgba(23, 23, 23, 0.08);
  --agent-soft: rgba(37, 99, 235, 0.08);
  --agent-primary: #2563eb;
  --agent-primary-strong: #14b8a6;
  --agent-shadow: 0 18px 56px rgba(15, 23, 42, 0.16);
  --agent-toggle-bg: linear-gradient(135deg, #2563eb 0%, #14b8a6 100%);
  --agent-toggle-shadow: 0 8px 24px rgba(37, 99, 235, 0.25), 0 1px 3px rgba(15, 23, 42, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.22);
  --agent-toggle-hover-shadow: 0 14px 34px rgba(37, 99, 235, 0.32), 0 0 18px rgba(20, 184, 166, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.24);
  --agent-toggle-active-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", ui-sans-serif, system-ui, sans-serif;
}

:host([data-theme="dark"]) {
  --agent-bg: rgba(11, 13, 16, 0.64);
  --agent-fg: #f5f7fa;
  --agent-muted: #747c89;
  --agent-border: rgba(245, 247, 250, 0.1);
  --agent-soft: rgba(96, 165, 250, 0.1);
  --agent-primary: #60a5fa;
  --agent-primary-strong: #2dd4bf;
  --agent-shadow: 0 24px 70px rgba(0, 0, 0, 0.42);
  --agent-toggle-bg: linear-gradient(135deg, #2563eb 0%, #0f766e 100%);
  --agent-toggle-shadow: 0 8px 24px rgba(37, 99, 235, 0.28), 0 1px 3px rgba(0, 0, 0, 0.24), inset 0 1px 0 rgba(255, 255, 255, 0.12);
  --agent-toggle-hover-shadow: 0 14px 34px rgba(37, 99, 235, 0.34), 0 0 20px rgba(45, 212, 191, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.16);
  --agent-toggle-active-shadow: 0 4px 12px rgba(0, 0, 0, 0.28);
}

* {
  box-sizing: border-box;
}

.agent-shell {
  position: fixed;
  top: 86px;
  right: 18px;
  z-index: 2147483647;
  display: grid;
  justify-items: end;
  gap: 10px;
  color: var(--agent-fg);
  pointer-events: none !important;
  transition: top 350ms cubic-bezier(0.16, 1, 0.3, 1), right 350ms cubic-bezier(0.16, 1, 0.3, 1), height 350ms cubic-bezier(0.16, 1, 0.3, 1);
}

.agent-shell.pinned {
  top: 0 !important;
  right: 0 !important;
  height: 100vh !important;
  gap: 0;
  justify-items: stretch;
}

/* ───── Toggle Button ───── */
.agent-toggle {
  position: relative;
  width: 52px;
  height: 52px;
  border: none;
  border-radius: 16px;
  background: var(--agent-toggle-bg);
  color: #ffffff !important;
  box-shadow: var(--agent-toggle-shadow);
  cursor: grab;
  display: grid;
  place-items: center;
  transition: transform 280ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 280ms ease, border-radius 280ms ease, background 280ms ease;
  overflow: visible;
  pointer-events: auto !important;
}

.agent-toggle-icons {
  position: relative;
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
}

.icon-chat-open, .icon-chat-close {
  position: absolute;
  display: grid;
  place-items: center;
  transition: transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 250ms ease;
}

.icon-chat-open {
  opacity: 1;
  transform: scale(1) rotate(0deg);
}

.icon-chat-close {
  opacity: 0;
  transform: scale(0.4) rotate(-90deg);
}

.agent-toggle.panel-open .icon-chat-open {
  opacity: 0;
  transform: scale(0.4) rotate(90deg);
}

.agent-toggle.panel-open .icon-chat-close {
  opacity: 1;
  transform: scale(1) rotate(0deg);
}

.agent-toggle:hover {
  transform: scale(1.08);
  box-shadow: var(--agent-toggle-hover-shadow);
}

.agent-toggle:active, .agent-toggle.dragging {
  cursor: grabbing;
  transform: scale(0.92);
  box-shadow: var(--agent-toggle-active-shadow);
}

/* When panel is open, toggle becomes a close button */
.agent-toggle.panel-open {
  border-radius: 50%;
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  box-shadow:
    0 4px 14px rgba(239, 68, 68, 0.25),
    0 1px 3px rgba(0, 0, 0, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.15);
}

.agent-toggle.panel-open:hover {
  box-shadow:
    0 8px 28px rgba(239, 68, 68, 0.35),
    0 0 20px rgba(239, 68, 68, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.agent-shell.pinned .agent-toggle {
  display: none !important;
}

/* ───── Panel (Sidebar/Companion Window) ───── */
.agent-panel {
  width: 560px;
  height: 450px;
  min-width: min(280px, calc(100vw - 24px)) !important;
  max-width: calc(100vw - 24px) !important;
  min-height: min(280px, calc(100vh - 24px)) !important;
  max-height: calc(100vh - 24px) !important;
  overflow: hidden !important;
  border: none !important;
  border-radius: 16px !important;
  background: transparent !important;
  box-shadow: none !important;
  resize: none !important;
  transform-origin: top right;
  opacity: 0;
  transform: scale(0.05) translate(24px, -24px);
  pointer-events: none;
  visibility: hidden;
  transition:
    opacity 350ms cubic-bezier(0.16, 1, 0.3, 1),
    transform 350ms cubic-bezier(0.16, 1, 0.3, 1),
    visibility 350ms cubic-bezier(0.16, 1, 0.3, 1),
    width 350ms cubic-bezier(0.16, 1, 0.3, 1),
    height 350ms cubic-bezier(0.16, 1, 0.3, 1);
}

.agent-panel.resizing {
  transition: none !important;
}

.agent-panel.expanded {
  width: min(820px, 64vw) !important;
  height: min(720px, 76vh) !important;
}

.agent-panel.pinned {
  border-radius: 0 !important;
  border-top: none !important;
  border-bottom: none !important;
  border-right: none !important;
  box-shadow: none !important;
  width: min(420px, 38vw) !important;
  min-width: 360px !important;
  max-width: min(520px, 48vw) !important;
  height: 100vh !important;
  min-height: 100vh !important;
  max-height: 100vh !important;
  resize: none !important;
}

.agent-panel.pinned.expanded {
  width: min(760px, 55vw) !important;
  min-width: 500px !important;
  max-width: min(960px, 70vw) !important;
}

.agent-panel-visible {
  opacity: 1;
  transform: scale(1) translate(0);
  pointer-events: auto !important;
  visibility: visible;
}

.agent-panel.resizing .agent-frame {
  pointer-events: none !important;
}

.agent-frame {
  width: 100%;
  height: 100%;
  border: 0;
  display: block;
  background: transparent !important;
  border-radius: 20px;
  pointer-events: auto;
}

/* ───── Custom Resize Handles ───── */
.agent-resizer {
  position: absolute;
  background: transparent;
  z-index: 2147483647;
  pointer-events: auto !important;
}

.resizer-l {
  left: 0;
  top: 0;
  width: 8px;
  height: 100%;
  cursor: ew-resize;
}

.resizer-b {
  left: 0;
  bottom: 0;
  width: 100%;
  height: 8px;
  cursor: ns-resize;
}

.resizer-lb {
  left: 0;
  bottom: 0;
  width: 16px;
  height: 16px;
  cursor: nesw-resize;
  z-index: 2147483647;
}

/* Interactive hover line indicators for premium feedback */
.agent-resizer::after {
  content: "";
  position: absolute;
  background: var(--agent-primary);
  opacity: 0;
  transition: opacity 200ms ease;
}

.resizer-l::after {
  left: 3px;
  top: 10%;
  width: 2px;
  height: 80%;
  border-radius: 999px;
}

.resizer-b::after {
  left: 10%;
  bottom: 3px;
  width: 80%;
  height: 2px;
  border-radius: 999px;
}

.agent-resizer:hover::after,
.agent-panel.resizing .agent-resizer::after {
  opacity: 0.55;
}

@media (max-width: 640px) {
  .agent-shell {
    top: 8px !important;
    right: 8px !important;
  }

  .agent-panel {
    width: calc(100vw - 16px) !important;
    height: calc(100vh - 16px) !important;
    min-width: calc(100vw - 16px) !important;
    min-height: calc(100vh - 16px) !important;
    max-width: calc(100vw - 16px) !important;
    max-height: calc(100vh - 16px) !important;
    resize: none !important;
  }
}

.agent-remove-btn {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  background: #ef4444;
  color: white;
  border: 1.5px solid var(--agent-bg);
  box-shadow: 0 2px 8px rgba(0,0,0,0.25);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: Arial, sans-serif;
  font-size: 11px;
  font-weight: bold;
  z-index: 2147483647;
  transition: transform 160ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 160ms ease;
  transform: scale(0);
  opacity: 0;
  pointer-events: none;
}
.agent-remove-btn.visible {
  transform: scale(1);
  opacity: 1;
  pointer-events: auto;
}
.agent-remove-btn:hover {
  background: #dc2626;
  transform: scale(1.1);
}
`;
;
