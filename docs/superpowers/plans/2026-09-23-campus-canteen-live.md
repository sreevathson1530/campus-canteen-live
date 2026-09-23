# Campus Canteen Live Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the mobile-first real-time canteen ordering app from the PRD, plus the approved changes: OTP before every order, a bill on collection, 3D food, and no counter TV.

**Architecture:** One Next.js 16 App Router project with a custom `server.ts`, so Socket.IO shares port 3000. All writes are HTTP route handlers that call service functions (`src/lib/**/service.ts`) running Prisma transactions, and events are emitted only after commit through `src/lib/realtime/emitters.ts`. Clients load snapshots with TanStack Query and patch the cache from typed socket events.

**Tech Stack:** Next 16, React 19, TypeScript strict, Tailwind 4, shadcn/ui, Socket.IO 4.8, Prisma **6** + SQLite, Zod 4, jose, bcryptjs, TanStack Query 5, Zustand 5, Recharts 3, sonner, motion, three + @react-three/fiber 9 + drei 10, date-fns 4 + date-fns-tz 3, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-23-campus-canteen-live-design.md` (overrides) + `docs/PRD.txt` (base contract).

## Global Constraints

- Keep the PRD's status names, event names, payload types, error codes and route paths exactly as written (minus the removed display parts).
- Writes go over HTTP only; emit after commit, only via `src/lib/realtime/emitters.ts`. No polling, ever.
- Money is whole paise (`Int`); totals are always computed from DB prices.
- Pin `prisma@^6` and `@prisma/client@^6`.
- Scripts must work on Windows (use `cross-env`, no `rm -rf` or `&&` in env assignment).
- `OTP_DEV_CODE` only works when `NODE_ENV !== "production"`; the server refuses to start in production if it's set.
- Timezone: `CANTEEN_TIMEZONE` (default `Asia/Kolkata`). Tokens restart at 101 per business date.
- Mobile-first from 360 px. Status never shown by colour alone. `prefers-reduced-motion` respected.
- Every milestone ends with `npm run typecheck && npm run lint && npm test` passing, then a commit named `M<n>: ...`.

## File Structure

```
server.ts                         custom HTTP server + Socket.IO + graceful shutdown
prisma/schema.prisma, seed.ts
scripts/simulate-orders.ts, render-stills.ts
src/app/                          routes (see PRD 9.1; no display/)
  (auth)/login, (auth)/register
  (student)/menu, orders, orders/[id], orders/[id]/bill
  kitchen/, kitchen/stock
  admin/, admin/menu, admin/users, admin/settings, admin/bills
  dev/render/[key]                3D still renderer (dev only)
  api/…                           route handlers
src/lib/
  db.ts auth.ts api.ts validators.ts dto.ts money.ts time.ts env.ts rate-limit.ts
  orders/service.ts  orders/transitions.ts  orders/queue.ts
  menu/service.ts  stats.ts  settings.ts
  otp/service.ts  sms/{index,console,android-gateway}.ts
  bills/service.ts
  realtime/{events,io,socket-server,emitters,presence}.ts
src/components/ ui/ shared/ menu/ orders/ kitchen/ admin/ food3d/
src/hooks/ useSocketEvent useConnectionStatus useSound
src/providers/ QueryProvider SocketProvider
src/stores/cart.ts
tests/unit tests/integration tests/e2e
```

---

## M1 — Scaffold and live socket

### Task 1: Project scaffold, tooling and design tokens
**Files:** `package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `.prettierrc`, `postcss.config.mjs`, `src/app/globals.css`, `src/app/layout.tsx`, `.env.example`, `.gitignore`, `vitest.config.ts`
- [ ] Install deps (exact list in Tech Stack), dev deps (`typescript`, `tsx`, `cross-env`, `vitest`, `@playwright/test`, `eslint`, `eslint-config-next`, `prettier`, `@types/*`).
- [ ] Scripts: exactly the PRD 9.3 scripts, plus `"render:stills": "tsx scripts/render-stills.ts"` and `"test": "cross-env NODE_ENV=test vitest run"`.
- [ ] `globals.css`: Tailwind 4 `@theme` tokens: `--color-leaf #1F5E3B`, `--color-turmeric #E3A21A`, `--color-chili #C23B22`, `--color-steel #B9BCC0`, `--color-paper #FAF6EE`, `--color-tawa #151412`, a dark-mode palette via `prefers-color-scheme`, and fonts via `next/font/google` (Bricolage Grotesque, Figtree, JetBrains Mono).
- [ ] Verify: `npm run typecheck` passes.

### Task 2: Prisma schema, db singleton, seed
**Files:** `prisma/schema.prisma`, `prisma/seed.ts`, `src/lib/db.ts`, `src/lib/env.ts`
**Interfaces — Produces:** `prisma` (PrismaClient singleton on `globalThis`), `env` (Zod-parsed: `DATABASE_URL, JWT_SECRET (min 32), PORT, BIND_HOST, CANTEEN_TIMEZONE, NEXT_PUBLIC_APP_URL, SMS_PROVIDER, SMS_GATEWAY_URL?, SMS_GATEWAY_USER?, SMS_GATEWAY_PASSWORD?, OTP_DEV_CODE?`).
- [ ] Schema = PRD §6 plus `User.phone String? @unique`, `MenuItem.modelKey String?`, `OtpChallenge`, `Bill`, `BillLine` exactly as in spec §2–3.
- [ ] `db.ts` runs `PRAGMA journal_mode = WAL` and `PRAGMA busy_timeout = 5000` once (via `$queryRawUnsafe`).
- [ ] Seed (idempotent upserts): PRD 9.4 accounts; students get phones `+919000000001..3`; PRD 9.5 menu with `modelKey` per dish (`idli, masala-dosa, pongal, poori, veg-meals, curd-rice, lemon-rice, biryani, egg-fried-rice, samosa, veg-puff, egg-puff, onion-bajji, filter-coffee, tea, lime-juice`); Settings row.
- [ ] Verify: `npm run setup` creates `prisma/dev.db` and prints the seeded counts.

### Task 3: Custom server, Socket.IO, connection badge
**Files:** `server.ts`, `src/lib/realtime/{io,socket-server,events}.ts`, `src/providers/{SocketProvider,QueryProvider}.tsx`, `src/hooks/useConnectionStatus.ts`, `src/components/shared/ConnectionBadge.tsx`, `src/app/page.tsx`
**Interfaces — Produces:** `getIO(): Server<{}, ServerToClientEvents> | null`; `useSocket(): Socket`; `useConnectionStatus(): "live"|"reconnecting"|"offline"`.
- [ ] `server.ts` as in PRD §7 outline (+ SIGINT/SIGTERM shutdown: `io.close`, `httpServer.close`, `prisma.$disconnect`).
- [ ] Badge: green "Live" when connected, amber "Reconnecting" while retrying, red "Offline" after 10 s disconnected or on `navigator.onLine === false`.
- [ ] Verify manually: `npm run dev` → the badge is green; stop the server → amber; restart → green. Commit `M1: scaffold and live socket`.

## M2 — Auth, roles and phone

### Task 4: Validators, API helpers, auth
**Files:** `src/lib/{validators,api,auth,rate-limit}.ts`, `tests/unit/validators.test.ts`, `tests/unit/rate-limit.test.ts`
**Produces:**
- `apiError(code: ErrorCode, message: string, details?: unknown): never` (throws `ApiError`); `handler(fn)` wraps route handlers, maps `ApiError`/`ZodError` to `{ error: { code, message, details } }`, never leaks stacks; `requireJson(req)`.
- `signSession(user) / readSession(): Promise<SessionUser|null>`; `requireUser()`, `requireRole(...roles)`; `SessionUser = { id, role, firstName }`; the cookie is named `ccl_session`.
- `rateLimit(key: string, limit: number, windowMs: number): boolean`.
- Zod: `registerSchema` (name 2–50, email, rollNumber?, password ≥8, phone `^[6-9]\d{9}$` normalised to `+91…`), `loginSchema`, `placeOrderSchema` (lines 1–10, qty 1–10, note ≤140, `otpToken` string), `transitionSchema`, `collectSchema`, `stockSchema`, `settingsSchema`, `otpVerifySchema` (`code` `^\d{4}$`), and admin item/category schemas.
- [ ] Write failing tests for each schema edge (bad phone, 11 lines, note 141 chars, code "12a4"), then implement and run `npm test`.

### Task 5: Auth routes, role layouts, socket auth and rooms
**Files:** `src/app/api/auth/{register,login,logout,me}/route.ts`, `src/app/(auth)/{login,register}/page.tsx`, `src/app/(student)/layout.tsx`, `src/app/kitchen/layout.tsx`, `src/app/admin/layout.tsx`, `src/lib/realtime/socket-server.ts`
- [ ] Register → STUDENT + cookie; `PHONE_TAKEN` / duplicate-email errors. Login is rate-limited to 10/min per IP; the error never reveals whether an email exists.
- [ ] The socket middleware parses the cookie, verifies the JWT, and rejects with `UNAUTHORIZED`. Rooms: `public`, `user:{id}` (students), `kitchen` (STAFF/ADMIN), `admin` (ADMIN).
- [ ] Safe `?next=` (relative paths only). Verify: each seeded account lands on its home page; a student hitting `/kitchen` is redirected; `/api/admin/stats` as a student → 403. Commit `M2`.

## M3 — Menu, cart, menu admin

### Task 6: Menu service and API, money, time
**Files:** `src/lib/{money,time,dto,settings}.ts`, `src/lib/menu/service.ts`, `src/app/api/menu/route.ts`, `src/app/api/menu/items/[id]/stock/route.ts`, `src/app/api/settings/route.ts`, `src/app/api/admin/{categories,items}/**`, `tests/unit/{money,time}.test.ts`
**Produces:** `formatRupees(paise): string` ("₹1,250" Indian grouping); `businessDate(d = new Date()): "YYYY-MM-DD"`; `toMenuItemDTO`, `toOrderDTO` (includes `billNumber`); `getMenu()`; `updateStock(id, {isAvailable?, stock?})`.
- [ ] Tests: `businessDate` at 2026-09-23T18:29Z → "2026-09-23" and at 18:31Z → "2026-09-24" (IST midnight); `formatRupees(12345600)` → "₹1,23,456".

### Task 7: Menu page, cart store, stock page, admin menu
**Files:** `src/stores/cart.ts`, `src/components/menu/*`, `src/app/(student)/menu/page.tsx`, `src/app/kitchen/stock/page.tsx`, `src/app/admin/menu/page.tsx`
- [ ] Sticky category tabs, cards with still (or initial tile), veg marker plus text label, "Only N left" when ≤5, Sold out; stepper ≤10, ≤10 lines; sticky cart bar; cart sheet with note (≤140) and total.
- [ ] Stock page: open/closed switch plus message; per-item switch and stock input, autosaved after 500 ms; rows with ≤5 left highlighted.
- [ ] Commit `M3`.

## M4 — OTP and ordering

### Task 8: SMS senders and OTP service
**Files:** `src/lib/sms/{index,console,android-gateway}.ts`, `src/lib/otp/service.ts`, `src/app/api/otp/{send,verify}/route.ts`, `src/app/api/admin/sms-status/route.ts`, `tests/integration/otp.test.ts`
**Produces:** `SmsSender = { name: string; send(to: string, text: string): Promise<void>; health(): Promise<boolean> }`; `getSmsSender()`; `sendOtp(userId, ip): Promise<{ expiresAt: string; resendAt: string; maskedPhone: string }>`; `verifyOtp(userId, code): Promise<{ otpToken: string; expiresAt: string }>`; `consumeOtpToken(tx, userId, otpToken): Promise<void>` (throws `OTP_REQUIRED`).
- [ ] Android gateway: `POST {SMS_GATEWAY_URL}/message` with basic auth, body `{ textMessage: { text }, phoneNumbers: [to] }` (SMS Gateway for Android local API); `health` = `GET {url}/health`.
- [ ] Tests: a wrong code 5× → `OTP_LOCKED`; a resend within 30 s → `RATE_LIMITED`; an expired code → `OTP_INVALID`; the dev code works in test; a token consumed once succeeds and the second time throws `OTP_REQUIRED`.

### Task 9: placeOrder, tracker, my orders, cancel
**Files:** `src/lib/orders/{service,transitions,queue}.ts`, `src/app/api/orders/route.ts`, `src/app/api/orders/[id]/route.ts`, `src/app/api/orders/[id]/status/route.ts`, `src/components/orders/*`, `src/app/(student)/orders/**`, `tests/unit/transitions.test.ts`, `tests/unit/queue.test.ts`, `tests/integration/place-order.test.ts`
**Produces:** `placeOrder(user, body, idempotencyKey): Promise<{ order: OrderDTO; created: boolean }>`; `canTransition(from, to, role, isOwner): boolean`; `transitionStatus(actor, orderId, { to, expectedVersion, reason? }): Promise<OrderDTO>`; `getQueue(date): Order[]`; `queuePosition(queue, orderId, minutesPerOrder)`.
- [ ] Transaction exactly as spec §2 plus PRD §6.1 (idempotency first; the OTP token is consumed inside the tx).
- [ ] Integration tests (separate `test.db`): 10 parallel orders on stock 3 → exactly 3 succeed; the same idempotency key → the same order id; parallel tokens are unique and sequential from 101; the client price is ignored; cancel restores stock; an order without a token → `OTP_REQUIRED`.
- [ ] UI: the cart's "Place order" opens the OTP sheet (4 boxes, `autocomplete="one-time-code"`, resend timer) → verify → POST → navigate to `/orders/[id]`. Commit `M4`.

## M5 — Real-time core and bill

### Task 10: Emitters and the kitchen board
**Files:** `src/lib/realtime/emitters.ts`, `src/lib/orders/service.ts` (emit calls), `src/app/api/orders/collect/route.ts`, `src/components/kitchen/*`, `src/app/kitchen/page.tsx`, `src/hooks/useSocketEvent.ts`
- [ ] Emitters: `emitOrderCreated, emitOrderUpdated, emitQueueUpdates, emitMenuItemUpdated, emitMenuChanged, emitCanteenStatus, emitPresence, scheduleStatsUpdate`.
- [ ] Board: three tabs with live counts, cards (token, first name, items, highlighted note, total, 1 s timer: neutral <10 min, amber 10–20, red >20), one primary action, a Reject dialog with quick reasons, an optimistic move with revert and a toast on `VERSION_CONFLICT`, a Collect box, an "Uncollected" badge after 15 min, a Done-today drawer, a sound toggle, and the reconnect banner after 3 s.

### Task 11: Bill on collection
**Files:** `src/lib/bills/service.ts`, `src/app/api/orders/[id]/bill/route.ts`, `src/app/api/admin/bills/route.ts`, `src/app/(student)/orders/[id]/bill/page.tsx`, `src/app/admin/bills/page.tsx`, `tests/integration/bill.test.ts`
**Produces:** `createBillInTx(tx, order, staffName): Promise<Bill>`; `getBill(orderId, viewer)` (masks the phone for STAFF); `billNumber(date, token) => "CCL-YYYYMMDD-<token>"`.
- [ ] Tests: collecting creates exactly one bill with copied lines and total; a later price change leaves the bill unchanged; staff see `••••• •XXXX`; a non-collected order → 404; cancelled orders never get a bill.
- [ ] Live tracker, stepper, queue card, "View bill" appearing on `order:updated`. Commit `M5`.

## M6 — Live extras
### Task 12: Live menu, open/closed, queue, sounds, notifications, dashboard, presence
**Files:** `src/components/menu/*` (event patches), `src/hooks/useSound.ts`, `src/lib/stats.ts`, `src/lib/realtime/presence.ts`, `src/app/admin/page.tsx`, `src/app/admin/{users,settings}/page.tsx`, `src/app/api/admin/{stats,users,users/[id]}/route.ts`
- [ ] Cart warnings ("No longer available", "Price updated"); closed banner; READY: chime, `navigator.vibrate`, a Notification with a permission button; presence `{kitchen, students}`; stats throttled to 1/s. Commit `M6`.

## M7 — 3D food
### Task 13: Procedural dishes, viewer, stills
**Files:** `src/components/food3d/{DishModel,DishViewer,Steam,dishes.tsx}`, `src/app/dev/render/[key]/page.tsx`, `scripts/render-stills.ts`, `public/stills/*.webp`, `src/components/menu/DishImage.tsx`
- [ ] 16 stylised models, no plates, a soft contact shadow; the viewer is lazy with orbit, pinch and auto-rotate plus steam for hot items; fallback to the still when there's no WebGL or reduced motion is on.
- [ ] `npm run render:stills` writes 16 WebP files (≈30 KB). Commit `M7`.

## M8 — Resilience and hardening
### Task 14
- [ ] Refetch on every `connect`; version guard on `order:updated`; rate limits (orders 5/min/user, login 10/min/IP, OTP); JSON-only writes; error shape everywhere; graceful shutdown; PRAGMAs. Commit `M8`.

## M9 — Tests, simulator, docs
### Task 15
- [ ] Socket integration test (real server on a random port; student/staff rooms; no display). Playwright e2e: a student orders with the dev OTP, the kitchen moves it to Ready, and the student sees Ready plus the bill after Collected within 2 s.
- [ ] `scripts/simulate-orders.ts` (uses `/api/otp/send` + `/verify` with the dev code). README (setup, seed accounts, LAN demo, gateway phone setup, simulator, tests, how the real-time works) + DECISIONS.md. Commit `M9`.
