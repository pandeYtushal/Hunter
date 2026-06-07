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
  --agent-bg: #ffffff;
  --agent-fg: #09090b;
  --agent-muted: #71717a;
  --agent-border: #e4e4e7;
  --agent-soft: #fafafa;
  --agent-primary: #000000;
  --agent-primary-strong: #27272a;
  --agent-shadow: 0 18px 48px rgba(0, 0, 0, 0.18);
  --agent-toggle-bg: linear-gradient(135deg, #18181b 0%, #09090b 100%);
  --agent-toggle-shadow: 0 4px 14px rgba(9, 9, 11, 0.2), 0 1px 3px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.15);
  --agent-toggle-hover-shadow: 0 8px 28px rgba(9, 9, 11, 0.3), 0 0 20px rgba(9, 9, 11, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2);
  --agent-toggle-active-shadow: 0 2px 8px rgba(9, 9, 11, 0.15);
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", ui-sans-serif, system-ui, sans-serif;
}

:host([data-theme="dark"]) {
  --agent-bg: #000000;
  --agent-fg: #fafafa;
  --agent-muted: #a1a1aa;
  --agent-border: #27272a;
  --agent-soft: #09090b;
  --agent-primary: #ffffff;
  --agent-primary-strong: #e4e4e7;
  --agent-shadow: 0 22px 60px rgba(0, 0, 0, 0.52);
  --agent-toggle-bg: linear-gradient(135deg, #27272a 0%, #18181b 100%);
  --agent-toggle-shadow: 0 4px 14px rgba(0, 0, 0, 0.4), 0 1px 3px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1);
  --agent-toggle-hover-shadow: 0 8px 28px rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.15);
  --agent-toggle-active-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
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

/* ───── Panel (Sidebar) ───── */
.agent-panel {
  width: min(380px, calc(100vw - 32px));
  height: min(680px, calc(100vh - 112px));
  overflow: hidden;
  border: 1px solid var(--agent-border);
  border-radius: 16px;
  background: var(--agent-bg);
  box-shadow: var(--agent-shadow);
  transform-origin: top right;

  opacity: 0;
  transform: scale(0.05) translate(24px, -24px);
  pointer-events: none;
  visibility: hidden;
  transition:
    opacity 350ms cubic-bezier(0.16, 1, 0.3, 1),
    transform 350ms cubic-bezier(0.16, 1, 0.3, 1),
    visibility 350ms cubic-bezier(0.16, 1, 0.3, 1);
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
  background: var(--agent-bg);
  border-radius: 16px;
}

.agent-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px;
  border-bottom: 1px solid var(--agent-border);
}

.agent-title {
  margin: 0;
  font-size: 15px;
  line-height: 1.2;
  font-weight: 700;
}

.agent-subtitle {
  margin: 3px 0 0;
  color: var(--agent-muted);
  font-size: 12px;
  line-height: 1.35;
  max-width: 270px;
  overflow-wrap: anywhere;
}

.agent-close {
  width: 32px;
  height: 32px;
  border: 1px solid var(--agent-border);
  border-radius: 6px;
  background: transparent;
  color: var(--agent-fg);
  cursor: pointer;
}

.agent-body {
  padding: 14px;
  display: grid;
  gap: 12px;
}

.agent-card {
  border: 1px solid var(--agent-border);
  border-radius: 8px;
  padding: 12px;
  background: var(--agent-soft);
}

.agent-label {
  color: var(--agent-muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .04em;
  text-transform: uppercase;
  margin-bottom: 6px;
}

.agent-value {
  font-size: 13px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.agent-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.agent-button {
  height: 38px;
  border: 0;
  border-radius: 6px;
  background: var(--agent-primary);
  color: white;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
}

.agent-button.secondary {
  border: 1px solid var(--agent-border);
  background: transparent;
  color: var(--agent-fg);
}

.agent-note {
  margin: 0;
  color: var(--agent-muted);
  font-size: 12px;
  line-height: 1.45;
}

@media (max-width: 460px) {
  .agent-shell {
    top: 68px;
    right: 10px;
  }

  .agent-actions {
    grid-template-columns: 1fr;
  }
}

.agent-resize-handle {
  position: absolute;
  top: 0;
  left: 0;
  width: 6px;
  height: 100%;
  cursor: ew-resize;
  z-index: 10000;
  background: transparent;
  transition: background 180ms ease;
}
.agent-resize-handle:hover, .agent-resize-handle.resizing {
  background: var(--agent-muted);
  opacity: 0.5;
}
:host([data-theme="dark"]) .agent-resize-handle:hover, :host([data-theme="dark"]) .agent-resize-handle.resizing {
  background: var(--agent-primary);
  opacity: 0.8;
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
