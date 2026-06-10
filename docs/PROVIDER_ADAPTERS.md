# Provider Adapter Pattern (No-Hardcode Integrations)

Every external dependency is hidden behind an interface and selected at runtime. This is
how the platform avoids hardcoded providers and vendor lock-in, and how it satisfies the
free-first policy.

## Pattern

1. Define a **port** (TS interface) per capability: `StoragePort`, `EmailPort`, `AiPort`,
   `PaymentPort`, `SmsPort`, `NotificationPort`, ...
2. Provide one **adapter** per concrete service implementing the port.
3. A **factory provider** reads env (and per-tenant DB overrides) and binds the DI token to
   the chosen adapter at boot/call time.
4. Application code depends only on the port token — never on a vendor SDK directly.

```ts
export interface PaymentPort {
  createIntent(input: CreateIntentInput): Promise<PaymentIntent>;
  verifyWebhook(payload: unknown, signature: string): Promise<PaymentEvent>;
}
// adapters: MockPaymentAdapter (default), RazorpayAdapter, StripeAdapter
```

## Selection precedence

1. **Per-tenant override** in DB (e.g. tenant brings its own Razorpay keys) — read at call
   time so tenants are independent.
2. **Platform default** from env (`PAYMENT_PROVIDER`, etc.).
3. **Safe fallback** — `mock`/`log`/`local` so the system always boots and runs for free.

## Free-first defaults

| Capability | Default (free) | Upgrade paths |
|------------|----------------|---------------|
| Storage    | local disk     | MinIO / S3 / GCS |
| Email      | log (stdout)   | SMTP / SES / Resend |
| AI         | Ollama (local) | OpenAI / Gemini / Claude / OpenRouter |
| Payments   | mock           | Razorpay / Stripe |
| SMS        | log            | Twilio / MSG91 |
| Auth/SSO   | local JWT      | Keycloak (OIDC/SAML/social) |

## Adding a provider

1. Implement the port in `apps/api/src/providers/<capability>/<vendor>.adapter.ts`.
2. Register it in the capability's factory switch.
3. Add any new env keys to `.env.example` (documented, never hardcoded).
4. No changes required in feature modules — they keep using the port token.

Phase 0 ships the **interfaces + free defaults** (mock payment, log email, local storage).
Real vendor adapters are added in later phases as needed, without touching callers.
