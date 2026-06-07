# Hunter Production Readiness Refactor

## Architecture

Hunter now routes agent work through a deterministic orchestration pipeline:

1. `IntentClassifier` scores user commands with regex and keyword rules.
2. `Planner` creates a constrained plan only after intent is known.
3. `AgentManager` owns state-machine transitions.
4. `Executor` runs actions through `ToolRegistry`.
5. `EventBus`, `MessageBus`, `ExecutionLogger`, and `AgentMetrics` record runtime behavior.

## Key Files

- `src/ai/intentClassifier.ts`: deterministic intent classification for apply, analyze, research, cover letter, form fill, save job, and summarize page.
- `src/ai/planner.ts`: intent-first planning with deterministic fallback.
- `src/ai/toolRegistry.ts`: central registry for executable actions.
- `src/ai/executor.ts`: retrying executor with structured error reports.
- `src/ai/stateMachine.ts`: valid execution lifecycle transitions.
- `src/ai/longTermMemory.ts`: persistent user preferences, saved jobs, companies, applications, and cover letters.
- `src/core/EventBus.ts`: decoupled plan/action/memory/state events.
- `src/core/MessageBus.ts`: inter-agent messages without direct agent coupling.
- `src/security/PermissionGuard.ts`: domain and sensitive-action checks.
- `src/debug/ExecutionLogger.ts`: persisted execution timeline.
- `src/debug/AgentMetrics.ts`: persisted action and agent success metrics.
- `src/ai/healthCheck.ts`: startup diagnostics.
- `src/sidebar/DeveloperPanel.tsx`: hidden developer panel.
- `src/types/`: shared domain types for agents, actions, plans, memory, jobs, resumes, and execution.

## Developer Mode

Developer mode is hidden behind `Ctrl+Shift+D` while the sidebar is focused. It shows:

- current agent
- state-machine state
- active plan steps
- execution timeline
- memory counts
- action success metrics
- startup health checks

## Security

Manifest content scripts and web-accessible resources are restricted to `http://*/*` and `https://*/*`.
Sensitive actions are guarded:

- resume upload
- external navigation
- form fill

Form fill remains confirmation-based through the existing autofill confirmation card.

## Reliability

The executor retries each action up to three times. If all attempts fail, it records a structured error report:

```json
{
  "action": "fill_form",
  "reason": "Content script did not respond.",
  "suggestion": "Refresh the tab, confirm the page is a normal http/https page, and try again.",
  "attempts": 3
}
```

## Performance

`requestCache` reduces duplicate page extraction, resume matching, cover letter, and company research calls during a workflow. The background worker continues to cache page content updates per tab.

## Verification

Production build:

```bash
npm run build
```

Vitest tests are present for classifier, planner, state machine, and registry. This machine does not have `pnpm` installed, and `npm install` cannot resolve the existing pnpm/workspace dependency tree. Install with pnpm in a normal dev environment, then run:

```bash
pnpm install
pnpm test
```
