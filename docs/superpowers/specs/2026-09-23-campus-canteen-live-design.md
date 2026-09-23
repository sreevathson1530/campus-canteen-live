# Campus Canteen Live — Design Spec

Date: 2026-09-23 · Status: **Approved**

The base contract is the PRD (`docs/PRD.txt`). This spec lists every approved change to it.
The illustrated version is `docs/Campus Canteen Live - How It Works.pdf`. Where this spec
and the PRD disagree, this spec wins.

## 1. Changes to the PRD

| Area | PRD | This design |
|---|---|---|
| Counter TV | `/display` page, `display` room, `display:update`, `DisplaySnapshot`, `GET /api/display`, QR code, display presence count, display socket tests | **All removed.** The student's phone is the pickup signal. Presence becomes `{ kitchen, students }`. |
| Devices | Kitchen = tablet, admin = laptop | **Mobile-first for every role**, from 360 px. Kitchen board columns become 3 swipeable tabs with live counts; Collect box pinned on top. Admin tables become stacked cards on phones. |
| Anti-prank | — | **4-digit SMS OTP before every order**, one account per phone number. |
| SMS | — | Swappable `SmsSender`: `console` (dev), `android-gateway` (SMS Gateway for Android, local mode). |
| Food visuals | Image or coloured initial tile | **3D food, hybrid.** Stylised procedural Three.js models (code-built, **no plates**: food floats over a soft shadow; drinks keep their cup). Menu grid shows stills; tapping opens a live viewer. |
| Bill | — | **A bill is created when an order becomes COLLECTED**, stored forever, never edited. |

## 2. Phone number and OTP

- `User.phone String? @unique`. Required at registration for students: an Indian mobile number, stored as `+91XXXXXXXXXX`,
  validated as 10 digits starting with 6–9. Optional for staff and admin. A duplicate returns `PHONE_TAKEN` (409).
- Flow: `POST /api/otp/send` (STUDENT) → SMS to the account's phone → `POST /api/otp/verify { code }`
  → `{ otpToken, expiresAt }` → `POST /api/orders` with body field `otpToken`.
- Rules: 4 random digits; code valid 5 min; 5 wrong attempts, then locked (`OTP_LOCKED` 429);
  resend cooldown 30 s; max 5 sends per hour per phone and 10 per hour per IP (`RATE_LIMITED`);
  verified token is single-use, valid 10 min, bound to the user.
- Storage: `OtpChallenge { id, userId, phone, codeHash, expiresAt, attempts, verifiedAt?, tokenHash?,
  tokenExpiresAt?, usedAt?, orderId?, createdAt }`. Only SHA-256 hashes of the code and token are stored (salted with JWT_SECRET).
- `placeOrder` order of checks: (1) idempotency key → return the existing order;
  (2) validate; (3) canteen open; (4) active-order limit; (5) transaction: **consume the OTP token with
  `updateMany where { tokenHash, userId, usedAt: null, tokenExpiresAt > now }` → count 0 ⇒ `OTP_REQUIRED`**,
  then stock, token and create. Because the token is consumed inside the transaction, a failed order leaves it unused.
- Errors: `OTP_REQUIRED` 403, `OTP_INVALID` 400 (details.attemptsLeft), `OTP_LOCKED` 429,
  `PHONE_TAKEN` 409, `SMS_SEND_FAILED` 503.
- Dev and test: `OTP_DEV_CODE` (e.g. `1234`) is always accepted, but only when `NODE_ENV !== "production"`.
  The server refuses to start in production if it's set. `SMS_PROVIDER=console|android-gateway`.
- Android gateway env: `SMS_GATEWAY_URL`, `SMS_GATEWAY_USER`, `SMS_GATEWAY_PASSWORD`.
- `GET /api/admin/sms-status` (ADMIN): provider name, whether the gateway is reachable, codes sent today.

## 3. Bill

- Created inside the READY→COLLECTED transaction (both `PATCH status` and `POST collect`).
- `Bill { id, billNumber @unique ("CCL-YYYYMMDD-<token>"), orderId @unique, tokenNumber, studentName,
  studentPhone, totalPaise, orderedAt, readyAt, collectedAt, collectedByName, createdAt }` plus
  `BillLine { id, billId, name, quantity, unitPricePaise, lineTotalPaise }`. All values are copied, never updated.
- No payment method, no GST.
- `OrderDTO.billNumber: string | null` (so the live `order:updated` shows "View bill" instantly).
- `GET /api/orders/[id]/bill`: owner and ADMIN see everything; STAFF see a masked phone (`••••• •4821`); 404 before COLLECTED.
- `GET /api/admin/bills?q=&date=&page=` (ADMIN), plus pages `/orders/[id]/bill` (student, printable) and `/admin/bills`.

## 4. 3D food

- `@react-three/fiber` + `@react-three/drei`. One procedural model per seeded dish (`src/components/food3d/dishes/*`),
  keyed by `MenuItem.modelKey` (new `String?` field). Unknown or absent keys fall back to a generic dish.
- Menu grid: a **shared** `<Canvas>`-free still. Stills are generated once by `npm run render:stills`
  (Playwright opens `/dev/render/[key]` and screenshots it to `public/stills/<key>.webp`). If a still is
  missing, a styled coloured-initial tile is shown.
- Tapping a dish opens a bottom sheet that lazy-loads the live viewer (`next/dynamic`, `ssr:false`):
  orbit drag and pinch, auto-rotate, steam particles for hot items, contact shadow.
- Falls back to the still when there's no WebGL or when `prefers-reduced-motion` is on (no auto-rotate).

## 5. Design direction

"Banana leaf, turmeric, chili". Tokens: leaf `#1F5E3B`, turmeric `#E3A21A`, chili `#C23B22`,
steel grey `#B9BCC0`, paper `#FAF6EE`, tawa (dark) `#151412`. Fonts: Bricolage Grotesque (display),
Figtree (body), JetBrains Mono (timers). Dark mode follows the system. WCAG AA contrast. Status is never shown by colour alone.

## 6. Milestones

M1 scaffold + socket badge · M2 auth + roles + phone · M3 menu, cart, menu admin, stock ·
M4 OTP + ordering · M5 real-time core + bill · M6 live extras · M7 3D food ·
M8 resilience and hardening · M9 tests, simulator, docs. Each ends with typecheck, lint and test passing, then a commit.

## 7. Project

Location: `C:\Users\sreev\projects\campus-canteen-live` (outside OneDrive). Node 20+.
