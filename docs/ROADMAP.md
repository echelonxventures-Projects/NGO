# Delivery Roadmap (Realistic Phasing)

The full vision spans ~18 product areas. Building them all at once produces broken
software. Instead each phase ships something **runnable, tested, and demoable**, layered on
the same tenancy/isolation/config core so nothing later forces a rewrite.

> Effort estimates assume a small senior team. They are planning guidance, not commitments.

## Phase 0 — Foundation (this repo)
Monorepo, docs, core data model, runnable NestJS API proving: tenant resolution,
isolation, RBAC, no-hardcode config/branding, provider-adapter pattern, plus CMS +
Donations skeletons. Docker Compose (Postgres + Redis), seed script.
**Exit:** API boots, health green, two seeded tenants are provably isolated.

## Phase 1 — NGO MVP (launch Vashundhara)
Donations (one-time + recurring intents) via payment adapter; receipts + 80G certificate
generation; CMS pages/articles; tenant branding + domain mapping; admin auth; Next.js
public site with SSR/SEO. **~6–10 weeks.**

## Phase 2 — LMS core
Course → Module → Lesson → Quiz; enrollments; video/PDF lessons; progress; certificates;
student/teacher roles. **~8–12 weeks.**

## Phase 3 — Commerce & marketplace
Catalog, cart, orders, coupons, inventory; digital + physical products; multi-vendor with
commissions and vendor dashboards. **~10–14 weeks.**

## Phase 4 — Community, events, volunteers, membership
Profiles, groups, forums, messaging, notifications; event registration + QR tickets;
volunteer hours/certificates; membership plans + benefits. **~10–14 weeks.**

## Phase 5 — Live classes & recorded learning
WebRTC (LiveKit/Jitsi adapter), whiteboard, polls, breakout, recordings; video library
with transcripts/chapters. **~12–16 weeks.** (Significant infra.)

## Phase 6 — Digital library federation
Connectors to NDLI, SWAYAM/NPTEL, Internet Archive, OpenStax, Gutenberg, OER, etc.;
unified search, bookmarking, offline reading. **~8–12 weeks.**

## Phase 7 — AI layer
Provider-configurable AI (Ollama/OpenAI/Gemini/Claude); tutor, chatbot, content/quiz
generation, summaries, auto-categorization; explanation modes (ELI5→Expert). **~10–16 wks.**

## Phase 8 — Multilingual AI (hardest)
Real-time translation, captions, STT/TTS, auto-subtitles/dubbing, multi-audio tracks,
consent-based voice cloning, 100+ languages. **Largest, most uncertain area — own track.**

## Phase 9 — Ads, deep linking, embeddable widgets
Ad server with targeting + analytics; cross-platform deep/smart links; embeddable
donation/course/event/community widgets.

## Phase 10 — Mobile & PWA
PWA first (offline, push, deep links), then React Native apps sharing the API.

## Continuous (every phase)
Security hardening, accessibility (WCAG 2.2), SEO, analytics, observability, CI/CD,
backup/DR, API docs (OpenAPI/GraphQL), automated tests.

## Honest note on the "100+ language real-time dubbing" goal
Real-time, low-latency voice translation/dubbing across 100+ languages with voice cloning
is at the frontier of what's possible and is itself a product. It should be scoped,
prototyped, and budgeted separately (Phase 8) rather than assumed as a checkbox.
