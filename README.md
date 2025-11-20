## ReplyFlow Backend (SaaS MVP)

Initial backend for the ReplyFlow COD WhatsApp confirmation bot. Merchants connect Shopify, WooCommerce, or YouCan stores, capture COD orders, and let the bot confirm via WhatsApp (including wilaya & delivery fees). The stack is production ready for DigitalOcean deployment with Redis + PostgreSQL.

### Key Tech

- **NestJS 11** + TypeScript, modular architecture
- **Prisma ORM 5** on **PostgreSQL 15+**
- **Redis** shared between cache & **BullMQ** queues (WhatsApp + Delivery)
- **Meta WhatsApp Cloud API** integration with dynamic templates (AR/FR)
- **OAuth2 (Google/Facebook) + JWT** auth flows
- **Server-Sent Events** for live dashboard updates (`new_order`, `message_status_update`, `trial_expiring`)
- **Husky + lint-staged + ESLint + Prettier** keep commits clean
- **Future Delivery Partner abstraction** (`IDeliveryPartnerService`)

> Frontend dashboard will be built separately with **Astro + React + shadcn + Tailwind (Vite)** to enable partial hydration + SEO.

### Project Structure

```
src/
  common/        Shared decorators, guards, utils (wilaya, encryption, templates)
  config/        Zod-powered env validation
  database/      Prisma module/service
  modules/
    auth, users, stores, integrations, orders, messages,
    whatsapp, products, shopify, woocommerce, youcan,
    delivery, trials
  queue/         BullMQ setup, worker bootstrap, processors
  sse/           SSE controller/service
```

### Getting Started

1. **Install deps**
   ```bash
   npm install
   ```
2. **Bootstrap environment**
   ```bash
   cp example.env .env
   # fill Postgres, Redis, WhatsApp, OAuth, JWT, ENCRYPTION_KEY, etc.
   ```
3. **Apply database schema**
   ```bash
   npm run prisma:migrate
   ```
4. **Run app + worker**
   ```bash
   npm run start:dev      # API + webhooks + SSE
   npm run start:worker   # BullMQ worker (WhatsApp + delivery jobs)
   ```

### Quality Tooling

- `npm run lint` – ESLint (Nest config)
- `npm run format` – Prettier
- `npm run test` / `test:e2e` / `test:cov` – Jest suites
- **Husky** pre-commit hook automatically executes `lint-staged`
  - staged TS/JS → `eslint --fix`
  - staged TS/JS/JSON/MD/CSS → `prettier --write`

### Core Modules

- **Auth** – Local register/login + OAuth (Google/Facebook), refresh tokens
- **Users** – Basic profile endpoint (`GET /users/me`)
- **Stores** – Connect/manage stores, sync cached products, manage delivery settings
- **Integrations** – Per-store config (webhook secret, WhatsApp template, delivery creds)
- **Orders** – Webhook ingestion, wilaya validation, product snapshots, analytics, delivery queue
- **Messages** – WhatsApp history + status updates
- **WhatsApp** – Template dispatch via Cloud API, webhook verification
- **Products** – Normalize + cache product catalogs per platform
- **Trials** – 7-day free trial tracker + SSE alerts
- **Delivery** – Stub partner service + BullMQ processor to future-proof courier integrations
- **Queue / SSE** – BullMQ orchestrations and per-store SSE streams

### SSE Events

- `new_order` – full order payload (wilaya, products snapshot)
- `message_status_update` – message + delivery status transitions
- `trial_expiring` – hours remaining until trial end

### Useful Commands

```bash
npm run start          # prod mode (no watch)
npm run start:prod     # run compiled dist
npm run start:worker   # queue worker (after build)
npm run prisma:generate
npm run prisma:deploy  # for CI/CD migrations
```

### Deployment Notes

- Provision **Redis** & **PostgreSQL** (DigitalOcean managed or self-hosted)
- Export env vars from `example.env`
- Run `npm run build`, then `node dist/main` + `node dist/queue/worker.js`
- Configure Shopify/WooCommerce/YouCan webhooks to hit `/api/orders/webhook/:platform?token=WEBHOOK_SECRET`
- WhatsApp webhook lives at `/api/whatsapp/webhook`

### Frontend Roadmap

- Astro + React + shadcn UI for merchant dashboard (orders, trials, analytics, messaging)
- SSE client for live updates
- OAuth callback views + bot configuration flows

---

Need anything else (delivery partner integration, frontend bootstrapping, CI, Terraform)? Open an issue or extend the TODO. 🎯
