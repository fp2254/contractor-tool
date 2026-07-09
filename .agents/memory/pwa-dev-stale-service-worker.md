---
name: PWA service worker causes stale errors in dev screenshots
description: sw.js can serve stale cached JS chunks in the dev preview browser even after fixing the bug and restarting the server — don't chase a phantom bug.
---

TradeBase registers a service worker (`public/sw.js`, `components/ServiceWorkerRegistration.tsx`) with cache-first behavior for static assets/pages. In dev, the screenshot tool's browser session can keep serving an old cached JS chunk (with a bug already fixed in source) even after the file is corrected, `.next` is deleted, and the workflow is restarted.

**Why:** the service worker caches by URL, not content hash awareness of source edits, and persists across page navigations/reloads within the same browser session used by the screenshot tool.

**How to apply:** when a runtime error persists in a screenshot despite the file being visibly correct, verify independently via `curl` (SSR output) and by fetching the actual `_next/static/chunks/*.js` file and grepping for the fix — if those confirm the fix is live, treat the screenshot error as a stale service-worker artifact, not a real bug. Bump `CACHE_VERSION` in `sw.js` if you need the real user's browser to pick up a fix.
