# Coverage Matrix — Master Build Prompt vs Current Code

Status of every requirement in the "Universal White-Label NGO + LMS + E-Commerce +
Community + Digital Library + AI Platform" master prompt against what is actually
implemented in this repository.

**Legend:** ✅ implemented/working · 🟡 partial or skeleton · ❌ not started

> Snapshot: 2026-06-11. Verified against `apps/api/src/**` (37 modules, 31 spec files),
> `apps/api/prisma/schema.prisma` (**87 models**, **24 migrations**), `apps/web/app/**`.
> Verification gates: `prisma generate` + `tsc` typecheck + `nest build` + **150 jest tests/31
> suites** all green. Boot smoke verified this session: `/api/health` ok, Swagger `/api/docs`
> 200, GraphQL `/graphql` returns live tenant data, `/api/i18n/translate` ok.

## Rollup
- ✅ Implemented across the backend: tenancy/RBAC/isolation; donations + tax/80G + receipts +
  certificates; currency/FX; storage (local/S3) + email (log/SMTP) + notifications
  (in-app/email/webhook + log SMS/push/whatsapp/telegram); **AI platform** (7 providers, echo
  default); **digital library federation**; **commerce** (catalog + categories + shipping +
  invoices + returns); **multi-vendor marketplace**; **LMS** (courses→exams, notes, discussions,
  attendance, QR IDs); **live classes** (Jitsi); **engagement** (QR tickets, hours, benefits);
  **ad management**; **deep linking**; **analytics**; **auth** (JWT + OAuth + MFA/TOTP + OTP);
  **security** (rate limiting + audit logs); **CRM + campaigns + sponsorship**; **website/theme
  builder**; **SEO structured data**; **GraphQL + OpenAPI/Swagger**; **PWA push**; **multilingual
  AI** (translation/TTS/STT ports); REST + GraphQL; SEO basics; CI; Dockerfiles + prod compose.
- 🟡 Partial: real provider integrations behind free-first defaults (TTS/STT are stubs; SMS/push
  log-backed; AI defaults to offline `echo`); some admin/web UIs lag the API surface.
- ❌ Remaining: event-driven bus/BullMQ; SAML; full WCAG audit; native mobile apps (PWA only);
  several design/architecture deliverable documents.

### Provider-adapter pattern (free-first, no lock-in)
Every external concern is a capability **port** with a free-first default adapter, swappable by
env with no feature-code change:

| Concern | Env | Free default | Other adapters |
|---|---|---|---|
| AI | `AI_PROVIDER` | `echo` (offline) | ollama, openai, gemini, anthropic, openrouter, deepseek, mistral |
| Storage | `STORAGE_PROVIDER` | `local` | s3/MinIO |
| Email | `EMAIL_PROVIDER` | `log` | smtp |
| Notifications | — | in-app/email/webhook + log SMS/push/wa/telegram | real senders pluggable |
| Live class | `LIVECLASS_PROVIDER` | `jitsi` | self-hosted Jitsi |
| Translation | `TRANSLATION_PROVIDER` | `echo` (offline) | libretranslate |
| Speech (TTS/STT) | `SPEECH_PROVIDER` | `stub` | Whisper/Piper/Coqui |
| Payments | `PAYMENT_PROVIDER` | `mock` | razorpay/stripe (pluggable) |
| FX | `FX_PROVIDER` | `seeded` | frankfurter |

## Platform "must function as"
| Capability | Status | Notes |
|---|---|---|
| NGO Management System | ✅ | Programs/projects (CMS) + CRM contacts + campaigns + sponsorships + volunteers |
| Donation Platform | ✅ | One-time + recurring, tax/80G, FX, receipts, webhook |
| Fundraising Platform | ✅ | `Campaign` entity with goal/raised (recomputed from donations) |
| CRM | ✅ | Contact + activity timeline + segmentation by type |
| Website Builder | ✅ | Block-based pages (17 block types), drafts/publish/schedule/revisions |
| CMS | ✅ | Polymorphic `Content` + block builder + revisions |
| LMS | ✅ | Course→Module→Lesson→Quiz→Assignment→**Exam**→Certificate, notes, discussions |
| Online School / Live Class | ✅ | Jitsi sessions, scheduling, attendance, recordings ref |
| Digital Library | ✅ | Federated Open Library + Gutenberg + Internet Archive, bookmarks, recommendations |
| E-Commerce | ✅ | Catalog, categories, variants, reviews, coupons, wishlist, shipping, invoices, returns |
| Multi-Vendor Marketplace | ✅ | Vendor onboarding, commission split, payouts, dashboard |
| Community Platform | 🟡 | Posts + comments + course discussions; groups/messaging not yet |
| Membership Platform | ✅ | Plans + memberships + benefits + entitlement resolution |
| Event Management | ✅ | Events + registration + QR tickets + check-in/attendance |
| Volunteer Management | ✅ | Opportunities + signups + hour logs + verification |
| Ad Management | ✅ | Placements/ads, targeting, weighted serving, impressions/clicks/CTR |
| AI Knowledge Platform | ✅ | Tutor/chat/KB/content/quiz/summary/SEO/categorize + explanation modes |
| Mobile App Platform | 🟡 | PWA (manifest + SW + offline + push subscriptions); no native shells |
| White-Label SaaS | ✅ | Multi-tenant + branding + domains + theme builder |

## Architecture
| Item | Status | Notes |
|---|---|---|
| Modular, API-first | ✅ | NestJS modular monolith, REST + GraphQL |
| Event-driven | 🟡 | Notifications dispatcher + audit interceptor; no BullMQ bus yet |
| Monolith / modular-monolith / container / cloud / VPS / self-host | ✅ | Dockerfiles (api+web) + prod compose + deploy guide |
| Microservices deploy | 🟡 | Modular monolith (clean module seams; not split) |
| All modules expose APIs | ✅ | REST everywhere; GraphQL gateway for core catalog |
| Nothing hardcoded | ✅ | Branding/config/domains/themes/menus data-driven; provider adapters |
| Provider abstraction | ✅ | See provider table above |

## Multi-tenant
| Item | Status |
|---|---|
| Unlimited tenants, isolation (Prisma scoped client + guard), data separation | ✅ |
| Branding / domains / subdomains / users / config / APIs | ✅ |
| App icons / email / certificate / invoice templates | 🟡 certificate ✅, invoice ✅, email/app-icon partial |

## LMS / school
| Item | Status |
|---|---|
| Free/Paid/Certification/Recorded/Hybrid | ✅ price/type fields |
| Course→Module→Lesson→Quiz→Assignment→Exam→Certificate | ✅ (`Exam`/`ExamAttempt`, MCQ auto-grade + subjective manual) |
| Notes / Discussions | ✅ `LessonNote`, `Discussion`/`DiscussionReply` |
| Attendance | ✅ `ClassAttendance` + live-session attendance |
| Student/Teacher profiles, enrollment numbers, QR IDs | ✅ `StudentProfile`/`TeacherProfile` with QR (qrcode lib) |
| Examination types (MCQ/essay/subjective/viva/coding/file) | ✅ types modelled; MCQ auto-graded |
| Proctoring / anti-cheating | ❌ |

## Live class
Jitsi free adapter (`LIVECLASS_PORT`), `LiveSession` scheduling (one-time/recurring), join/leave
attendance, recording URL. Whiteboard/polls/breakout are Jitsi-native. ✅ core; advanced in-call
features delegated to the provider.

## Digital library
NDLI/SWAYAM/NPTEL/OpenStax/OER/Wikibooks listed as future connectors; **Open Library, Project
Gutenberg (Gutendex), Internet Archive** implemented with unified federated search, bookmarks,
recommendations. ✅ (extensible registry — add a `LibrarySource` and list it).

## AI platform & features
Providers (echo/ollama/openai/gemini/anthropic/openrouter/deepseek/mistral) ✅. Features: tutor,
chatbot, content generator, quiz generator, lesson planner, summaries, SEO assistant, auto
categorization, conversation history ✅. Explanation modes (ELI5→Expert/Teacher/Exam/Practical) ✅.

## Multilingual AI
Translation (echo offline default / LibreTranslate), TTS + STT ports (stub default, Whisper/Piper
pluggable), localized explanation modes, 100+ language registry. ✅ ports + free defaults;
real dubbing/voice-cloning require a configured engine.

## Ad management
Banner/Video/Native/Sponsored/Affiliate/Campaign types; targeting by country/state/city/language/
device/role/membership; weighted serving; impressions/clicks/CTR analytics. ✅

## Deep linking
`SmartLink` with platform detection (android/ios/web), per-platform targets, campaign/referral
tags, QR, click tracking + per-platform stats. ✅

## Authentication
Email/JWT ✅; Mobile + email **OTP** ✅; **OAuth** Google/GitHub + generic profile ✅; **MFA**
TOTP (otplib) ✅; SSO/OIDC 🟡 (token verification paths); SAML ❌.

## Notification platform
In-app ✅, Email ✅, Webhook ✅, SMS/WhatsApp/Push/Telegram 🟡 (log-backed, swappable),
dispatcher + outbox/audit ✅. PWA web-push subscriptions captured ✅.

## Analytics platform
`AnalyticsEvent` ingestion (public + authed), overview by type, time-series, top paths,
conversion **funnels**, unique visitors. ✅

## Security
HTTPS (deploy) 🟡, helmet/CSP ✅, MFA ✅, RBAC ✅, **audit logs** ✅, **rate limiting** ✅
(throttler, GraphQL-aware), CSRF (N/A for Bearer APIs) 🟡, XSS (helmet+validation) ✅, SQLi
(Prisma) ✅, encryption (bcrypt; field-level ❌), backup/DR (documented) 🟡.

## SEO
SSR/SSG ✅; sitemap/robots ✅; OpenGraph/Twitter (per-tenant + builder) ✅; **Schema.org JSON-LD**
(Organization/NGO/Event/Course/Product/FAQ/Article) ✅ pure builders + `/api/seo/*` endpoints.

## API
REST ✅; **GraphQL** gateway (code-first, `/graphql`) ✅; **OpenAPI/Swagger** (`/api/docs`) ✅.

## Database
Normalized schema ✅ (87 models). Migrations ✅ (24). Seed data ✅ (two tenants). Full ERD diagram 🟡 (doc overview).

## DevOps
Docker ✅ (api + web Dockerfiles, Next standalone). Compose ✅ (infra + **prod stack**). CI ✅
(GitHub Actions: generate→typecheck→build→test). Monitoring/logging 🟡 (health probe + Nest
logger + audit). Backup/DR 🟡 (documented in `docs/DEPLOYMENT.md`). Deploy guide + **production
launch checklist** ✅.

## Free-first deployment policy
Local storage ✅, Postgres ✅, SMTP/log email ✅, offline/open-source AI default ✅, free
educational resources ✅, free live-class (Jitsi) ✅, free translation (LibreTranslate) ✅,
avoid lock-in ✅ (every concern is an adapter).

## Accessibility (WCAG 2.2)
Keyboard nav 🟡, screen readers 🟡, high contrast 🟡 (CSS tokens), dyslexia/TTS/STT 🟡 (speech
ports exist). No formal audit performed → 🟡.

## Deliverables (1–21)
✅ PRD, System Architecture, Multi-tenancy, Provider-adapter doc, Data model, Roadmap, **Deployment
guide + launch checklist**, Backend, Frontend + Admin portal, API spec (OpenAPI/Swagger + GraphQL
schema), Database design + migrations + seed, Testing (150 unit tests).
🟡 Full ERD diagram, tenant portal (admin shell), UI/UX design system, mobile (PWA not native),
monitoring/analytics architecture docs.
❌ Standalone solution-architecture & security-architecture documents, wireframes, formal a11y audit.

### Changelog
- 2026-06-11 (this build): Shipped AI platform, digital library, commerce completion, multi-vendor,
  LMS completion, live classes, engagement completion, ads, deep linking, analytics, auth
  (OAuth/MFA/OTP), security (rate limit + audit), CRM/campaigns/sponsorship, website/theme builder,
  SEO structured data, GraphQL + Swagger, PWA push, multilingual AI, and DevOps (Dockerfiles + prod
  compose + deploy guide). Schema 47→87 models; 9→24 migrations; 102→150 tests.
