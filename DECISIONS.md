# Decisions

One line of reasoning per choice the PRD left open, or per approved change to it.

## Approved changes to the PRD

- **No counter TV.** `/display`, the `display` room, `display:update`, `DisplaySnapshot`, `GET /api/display`, the QR code and display presence were removed: the canteen has no TV, so the student's own phone (chime, vibration, notification) is the pickup signal.
- **Mobile-first for every role.** The kitchen board's three columns become tabs with live counts on phones (three columns from `md`), with the Collect box pinned; admin tables become stacked cards.
- **OTP before every order.** Anyone could otherwise order for fun; a fresh 4-digit SMS code is required per order and each phone number belongs to one account.
- **Free SMS via an Android phone** (SMS Gateway for Android, local mode) behind a swappable `SmsSender`; `console` prints codes during development. The owner chose "completely free" over paid providers.
- **Bill on collection.** A `Bill` + `BillLine` snapshot is created inside the READY→COLLECTED transaction with name, mobile, dishes, rates, total and times; no payment method and no GST, as requested.
- **3D food, hybrid.** WebP stills on the grid (4G budget) and a lazily loaded live Three.js viewer on tap; stylised procedural models, no plates.

## OTP details

- Codes and tokens are stored as HMAC-SHA256 with `JWT_SECRET` as the key, so a database leak doesn't reveal usable codes.
- Code valid 5 min; 5 wrong attempts lock it; 30 s resend cooldown; max 5 codes/hour per phone and 10/hour per IP. These are the smallest limits that still allow a real retry, and they keep the ~100 SMS/day gateway budget safe.
- A verified code yields a single-use token valid 10 min; `placeOrder` consumes it with a conditional `updateMany` inside the order transaction, so a failed order (e.g. out of stock) leaves the token usable.
- The Idempotency-Key is checked before the OTP token, and re-checked if the transaction fails, so a double tap returns the first order rather than "code already used".
- If an SMS send fails, the challenge is deleted so it doesn't count against the cooldown or hourly limit.
- `OTP_DEV_CODE` works only outside production, and the server refuses to start in production if it is set.
- New error codes: `OTP_REQUIRED` 403, `OTP_INVALID` 400, `OTP_LOCKED` 429, `PHONE_TAKEN` 409, `EMAIL_TAKEN` 409, `SMS_SEND_FAILED` 503.

## Data and API

- `User.phone` is nullable in the schema but required by the student registration validator; staff/admin don't need one.
- Phones are normalised to `+91XXXXXXXXXX` and must be 10 digits starting 6-9 (Indian mobile ranges).
- `MenuItem.modelKey` picks the procedural 3D model; `imageUrl` holds its rendered still (`/stills/<key>.webp`).
- `OrderDTO.billNumber` was added so the live `order:updated` event can show "View bill" instantly.
- Bill number is `CCL-YYYYMMDD-<token>`: unique because (business date, token) is unique, and readable at the counter.
- The body field is `otpToken` (not a header), keeping `Idempotency-Key` as the only custom header.
- Presence is `{ kitchen, students }` now that there is no display.

## Architecture and runtime

- Prisma uses **one SQLite connection** (`connection_limit=1`, added automatically): the app is one process and SQLite has one writer, so transactions queue (Prisma `maxWait` 15 s) instead of failing with `SQLITE_BUSY`. This is what makes "10 parallel orders on stock 3 → exactly 3" deterministic.
- `server.ts` loads `.env` with Node's `process.loadEnvFile`, not `@next/env`: calling `@next/env` before Next set its internal dev flag made Next's env reload (triggered by adding a route in dev) drop the flag and break every route with a missing `required-server-files.json`.
- Socket.IO uses `destroyUpgrade: false` so Next's dev HMR WebSocket on the same port keeps working.
- Ping interval 10 s / timeout 8 s (instead of 25 s / 20 s) so a phone that walks out of Wi-Fi is noticed quickly.
- The client forces a fresh socket on the browser's `online` event; half-open WebSockets otherwise delayed resync for up to the ping timeout.
- `src/proxy.ts` (Next 16's middleware) only forwards the path as `x-pathname` so layouts can build `/login?next=`; all role checks stay in layouts and route handlers, as the PRD requires.
- The rate-limit IP comes from the socket address; a client-sent `X-Forwarded-For` is overwritten unless `TRUST_PROXY=1` (set it only behind Render/Railway's proxy).
- Stats emits are trailing-throttled to 1/s so the latest state always goes out.
- Emit failures after commit are logged and never undo the write.

## UI

- Design direction "banana leaf, turmeric, chili": Bricolage Grotesque (display), Figtree (body), JetBrains Mono (timers); dark mode follows the system.
- The dashboard bar colour (`#2e8b57` light / `#4caa73` dark) was checked with the dataviz palette validator for lightness, chroma and 3:1 contrast on each surface; future hours are faded, and a table view is one tap away.
- Cart lines whose item became unavailable (or whose stock dropped below the quantity) block checkout until removed; price changes show a dismissible "Price updated" chip.
- Staff see bills with a masked phone (`••••• •4821`); only the owner and admins see the full number.
- Kitchen cards show first names only, as the PRD requires; stock inputs autosave after 500 ms and follow live changes unless focused.
- Sound uses Web Audio tones; the kitchen needs an explicit "Enable sound" tap, and on student pages any first tap unlocks audio for the Ready chime.

## 3D

- Models are code, not files: nothing to download, consistent style, and each dish renders deterministically (seeded RNG) so stills are reproducible.
- Lighting uses drei `Lightformer`s inside `Environment` with a warm grey backdrop, so polished steel (filter coffee) reflects light and no HDR is fetched from a CDN.
- Stills are rendered by the app itself (`/dev/render/[key]`, dev only) and saved via `canvas.toDataURL("image/webp")`, avoiding an image-processing dependency.

## Tooling

- Prisma pinned to 6 as the PRD requires (7/8 exist).
- npm 11 blocks install scripts by default; the needed ones (Prisma engines, esbuild, unrs-resolver) are listed in `package.json#allowScripts`.
- `npm run setup` creates `.env` with a random `JWT_SECRET` if missing, so a fresh clone needs no manual step.
- The test DB is a throwaway `prisma/test.db` rebuilt by `tests/global-setup.ts` (deletes only that file, then `db push`); integration files run serially because they share it.
- The socket integration test runs the real auth/room module (`registerSocketServer`) on a real HTTP server with a random port, without booting Next, which keeps it fast and deterministic.
- The simulator registers extra demo students when the seeded phones hit the OTP cooldown or hourly limit, still using only the public API.
