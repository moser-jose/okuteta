# Okuteta 💈

> 🇦🇴 [Leia em português](README.pt.md) · [Main README](README.md)

A **barbershop booking platform for Angola**. Customers find barbershops near them, pick one or more services and a
barber (or "anyone"), and book a time. The barbershop manages its opening hours, team, services, schedule and the
payments it receives. Prices are in kwanzas (AOA), phone numbers are `+244`, and the default time zone is Luanda. Code
uses English names (`shop`, `booking`, `member`); user-facing text is in Angolan Portuguese ("marcação",
"telemóvel", "morada").

> **Status:** design approved, **no code yet**. Everything in this README describes what will be built, step by step
> (see [Next steps](#next-steps)). The next one is step 0: the project skeleton.
>
> The full system design (decisions, data model with columns and indexes, 141 use cases, architecture, capacity and
> operations) is in [docs/design.html](docs/design.html) (in Portuguese), summarised in
> [Data model and system design](#data-model-and-system-design). The project follows the same approach as Bazza: a
> modular monolith, Clean Architecture, and every provider behind a port.

## Features

### Planned for the MVP

- **Account:** sign-up with a required phone number (`+244`, mobile), optional password, session refresh, listing and
  ending sessions on other devices, and deletion with anonymisation
- **Sign-in:** nine ways in: email or phone with password, SMS code, WhatsApp code, email link, Google, Facebook,
  Apple and passkeys
- **2FA and MFA (optional for everyone):** authenticator app (TOTP), passkey, SMS, WhatsApp or email code, and 10
  recovery codes. Sensitive actions ask for a fresh confirmation, valid for 5 minutes
- **Password:** reset by code (SMS, WhatsApp or email), which also asks for the second factor when 2FA is on, and
  password change while signed in
- **Profile:** name, photo (uploaded straight to S3) and email verification
- **Barbershops:** created by the owner, with address and coordinates, a weekly schedule with split shifts, a cover
  photo, and approval by an administrator before showing up in search. Each barbershop chooses:
  - instant confirmation (`INSTANT`) or approval (`MANUAL`);
  - the customer's cancellation deadline;
  - the schedule interval (10, 15, 20 or 30 min);
  - the time zone;
  - the minimum and maximum booking notice;
  - the no-show limit.
- **Team:** the owner invites barbers by phone number (the invite lasts 7 days). Each barber has their own account and
  sets which services they do and whether they take bookings
- **Services:** name, duration (multiple of 5 min) and price in kwanzas. Changing the price doesn't touch existing
  bookings
- **Search:** approved barbershops around the customer (PostGIS), sorted by distance, with rating and lowest price
- **Schedule:** each barber's weekly hours, time off, and free slots generated for the booking window
- **Bookings:** one or more services with a barber or "anyone" (random pick among the free ones), never overlapping.
  Includes approval, rejection, cancellation by the customer (within the deadline) or by the barbershop, completion and
  no-shows. 3 no-shows in 90 days (or whatever the barbershop sets) block booking at that barbershop
- **Double-blind reviews:** the customer reviews the barbershop and the barber, and the barber reviews the customer.
  Neither side sees the other's review until both have reviewed or 14 days have passed. The owner can reply publicly
- **Notifications:** in-app inbox and push on Android and iOS (Firebase Cloud Messaging) for requests, confirmations,
  cancellations, reminders (24 h and 1 h before), invites, reviews, payments, refunds and messages
- **Payments (tracking only):** the customer pays the barbershop directly (cash, Multicaixa Express, Unitel Money,
  Afrimoney or bank transfer). The platform records the method, the proof and the confirmation, and shows the
  barbershop its revenue by method and by barber. **No commission in the MVP**
- **Refunds on request:** for a paid booking that was cancelled, the customer asks for the money back. The barbershop
  refunds with proof, and the customer confirms or disputes it. An administrator decides disputes
- **Messages:** chat between the customer and the barbershop (owner and barbers), with phone numbers and emails hidden
  (`•••`)
- **Administration:** barbershop approval queue, suspension, hiding reviews, and payment and refund disputes

### After the MVP

Product features by phase. The infrastructure each phase adds is in [Scale roadmap](#scale-roadmap).

- **Phase 2:**
  - reschedule without cancelling;
  - waiting list;
  - revenue model (barbershop subscription or commission);
  - reports and moderation;
  - personal data export;
  - second-factor approval by push.
- **Phase 3:**
  - electronic payments through an Angolan aggregator, with automatic refunds;
  - Redis for caching;
  - a CDN for public photos;
  - a read replica;
  - monthly partitioning of messages, notifications and slots.

## Technologies

| Technology        | Version |
|-------------------|---------|
| Java              | 25 (virtual threads) |
| Spring Boot       | 4.x     |
| Spring Security   | 7.x (OAuth2 Resource Server, JWT) |
| Spring Data JPA   | Hibernate 7.x |
| PostgreSQL        | 18, with PostGIS |
| Flyway            | —       |
| webauthn4j        | passkeys |
| libphonenumber    | phone numbers and chat masking |
| Docker Compose    | local environment (PostGIS and MinIO) |
| H2                | tests only |
| Maven             | through the `./mvnw` wrapper |

Exact versions get pinned in `pom.xml` in step 0.

External services: **Twilio** (SMS and WhatsApp), **Brevo** (email over SMTP), **Firebase** (push), **Google**,
**Facebook** and **Apple** (social sign-in) and **AWS S3** (files). All of them are optional in development: codes and
emails go to the log, and files go to MinIO.

## Running it

> There's no code yet. The commands below are the ones step 0 will make work.

### Prerequisites

- JDK 25 (`java -version`)
- Docker (Docker Desktop or Colima), for PostgreSQL with PostGIS and MinIO
- No need to install Maven: the project will use the `./mvnw` wrapper

### With Docker

```bash
# database (PostgreSQL 18 + PostGIS) and MinIO in Docker; the app runs through Maven
docker compose up -d
./mvnw spring-boot:run          # http://localhost:8080, dev profile

# everything in Docker (database, MinIO and the app)
docker compose --profile app up -d --build

# stop, or stop and delete the data
docker compose --profile app down
docker compose --profile app down -v
```

### Commands

```bash
./mvnw compile                                  # compile
./mvnw test                                     # tests on H2 (no Docker)
./mvnw test -Dokuteta.test.postgres=true        # the same tests on PostgreSQL 18 + PostGIS (Testcontainers)
./mvnw spring-boot:run                          # start the app
```

- **H2 tests:** tests run on H2 by default. They need no database or Docker, and send no SMS, WhatsApp or email.
- **PostGIS search:** the search test needs PostGIS, so it only runs with `-Dokuteta.test.postgres=true`, which is how
  CI runs.
- **Architecture rules:** `ArchitectureTest` (ArchUnit) checks them on every build:
  - a module doesn't touch another module's tables or repositories;
  - the domain doesn't depend on Spring, JPA or infrastructure;
  - `shared` doesn't know about the modules.

**API docs (Swagger):** with the app running, at **http://localhost:8080/swagger-ui.html**, and the OpenAPI JSON at
**/v3/api-docs**. Only available with the `dev` profile or `OPENAPI_ENABLED=true`.

**Health:** `GET /actuator/health` returns `UP` or `DOWN` (it only checks PostgreSQL), with no token, for the load
balancer.

### Continuous integration

GitHub Actions will run on every pull request to `main` and on every push to it:

1. **Tests:** compiles and runs every test with JDK 25 on a real PostgreSQL 18 + PostGIS (Testcontainers), ArchUnit
   included.
2. **Migrations:** rejects edits to an existing migration and, in new ones, changes that break the previous version
   during a zero-downtime deploy (dropping, renaming or changing the type of a column).
3. **Docker image:** checks that the ARM64 image builds.

Deploys to the AWS test environment use OIDC (no stored keys) and only run from `main`. Production only receives
images already tested, through a manual deploy.

## Configuration

### Files

| File | Use |
|---|---|
| `src/main/resources/application.properties` | Shared configuration. Sets no profile: the jar and the image start without `dev` |
| `src/main/resources/application-dev.properties` | Development values, and reading `.env` |
| `src/test/resources/application.properties` | H2 and test senders |
| `.env` | Local variables and credentials. **Not in git.** Created from `.env.example` |

**Never enable the `dev` profile in production:** it ships fixed secrets (JWT and encryption key) and writes codes to
the log. With `dev`, the app will refuse to start if the database isn't local.

### Environment variables

The names below are the proposal and become final in step 0. With the `dev` profile, every one has a default. Without
it, the **required** ones must be set, or the app refuses to start and says what's missing.

| Variable | Required | What for |
|---|---|---|
| `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | yes | PostgreSQL |
| `JWT_SECRET` | yes | Signs the tokens (access, social sign-up, 2FA) |
| `CRYPTO_KEY` | yes | AES-256-GCM key for TOTP secrets |
| `PUBLIC_BASE_URL` | yes | Domain for email links (e.g. `https://okuteta.ao`) |
| `EMAIL_SENDER` | no | `smtp` (Brevo) or `log` |
| `MAIL_FROM`, `SMTP_HOST`, `SMTP_USERNAME`, `SMTP_PASSWORD` | with `smtp` | Brevo |
| `SMS_SENDER` | no | `twilio` or `log` |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` | with `twilio` | SMS |
| `TWILIO_WHATSAPP_FROM`, `TWILIO_WHATSAPP_TEMPLATE_SID` | no | WhatsApp; without them, the app only offers SMS |
| `GOOGLE_CLIENT_IDS` | no | Google OAuth client IDs (Android, iOS) |
| `APPLE_CLIENT_IDS`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` | no | Sign in with Apple, and revoking it when an account is deleted |
| `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` | no | Facebook sign-in |
| `PASSKEY_RP_ID` | no | Passkey domain (e.g. `okuteta.ao`). Changing it later invalidates existing passkeys |
| `IOS_APP_IDS`, `ANDROID_PACKAGE_NAME`, `ANDROID_CERT_FINGERPRINTS` | no | `/.well-known` files so passkeys and links open the app |
| `FCM_SERVICE_ACCOUNT` | no | Firebase service account (JSON) for push |
| `STORAGE_TYPE` | no | `s3` (AWS or MinIO) |
| `S3_BUCKET`, `AWS_REGION`, `S3_ENDPOINT` | with `s3` | Bucket; `S3_ENDPOINT` only for MinIO |
| `LOG_FORMAT` | no | `json` for structured logs |
| `OPENAPI_ENABLED` | no | Turns Swagger on outside `dev` |

### Without providers configured

Without Twilio, Brevo, Firebase or social sign-in, the app still starts:

- codes and emails go to the log (only with `dev`);
- push is marked `SKIPPED`;
- endpoints of an unconfigured provider return **503**.

So you can develop without any external account.

### Migrations

Flyway runs at startup:

- **Shared migrations:** `src/main/resources/db/migration`. They run on both H2 and PostgreSQL, so they use no
  partial indexes and no `EXCLUDE`.
- **PostgreSQL only:** `db/migration/postgresql` holds what H2 lacks, such as the PostGIS extension and the generated
  `shops.location` column, with a GiST index.
- **Zero-downtime deploys:** every change stays compatible with the previous version (expand, migrate, contract).

## API

### Authentication

The API is stateless and authenticated with **JWT**. Every endpoint lives under `/api/v1`. Sign-in returns:

- `accessToken`: valid for 15 minutes, sent as `Authorization: Bearer <token>`. It carries `amr` (the methods used to
  sign in) and `auth_time`.
- `refreshToken`: valid for 30 days, used only to get new tokens at `/auth/refresh`. It's swapped for a new one on
  every use. If an already-used refresh token shows up again, the whole session is revoked.

There are two intermediate tokens, each with its own audience (`aud`), which don't work as a session:

- `signupToken` (15 min, `aud: okuteta-signup`): a new account from social sign-in uses it to finish sign-up with a
  phone number.
- `mfaToken` (5 min, `aud: okuteta-mfa`): with 2FA on, the first factor returns it instead of a session, and
  `/auth/mfa/verify` exchanges it for the session.

The phone number is **required** and checked against the numbering plan with libphonenumber. A number that doesn't
exist, or a landline, is rejected (**422**). Signing in with a phone only works once it's verified. Until then, the
API answers as if the number didn't exist.

### Endpoints

All planned. The full list, with every request and response field, will be in Swagger. `job` is a scheduled task (with
ShedLock), `event` reacts to another module's events, and `public` is called by another module, with no endpoint.

**Users** (`user`)

| Use case | Type | Endpoint | Who | What it does |
|---|---|---|---|---|
| `RegisterUser` | endpoint | `POST /api/v1/auth/register` | Visitor | Creates the account with name, phone (`+244`, mobile, checked with libphonenumber), optional email and optional password (Argon2id), and sends the code over the chosen channel (SMS or WhatsApp) |
| `SendPhoneCode` | endpoint | `POST /api/v1/auth/phone/code` | Visitor | Resends the code by SMS or WhatsApp (valid 10 min; 1 per minute and 5 per day) |
| `VerifyPhone` | endpoint | `POST /api/v1/auth/phone/verify` | Visitor | Checks the code (up to 5 attempts), marks the phone as verified and returns the session |
| `LoginWithPassword` | endpoint | `POST /api/v1/auth/login` | Visitor | Signs in with email or verified phone and password. 5 failures lock it for 15 min. With 2FA on, returns an `mfaToken` instead of the session |
| `RequestLoginCode` | endpoint | `POST /api/v1/auth/code` | Visitor | Sends a sign-in code by SMS or WhatsApp to a verified `+244` phone. Same response with or without an account |
| `LoginWithCode` | endpoint | `POST /api/v1/auth/code/verify` | Visitor | Checks the code and returns the session, or the `mfaToken` with 2FA on |
| `RequestLoginLink` | endpoint | `POST /api/v1/auth/link` | Visitor | Sends a single-use link, valid 15 min, that opens the app, to a confirmed email. At most 3 per hour |
| `LoginWithLink` | endpoint | `POST /api/v1/auth/link/verify` | Visitor | The app sends the link's token by POST. Opening the link (GET) doesn't use it up |
| `LoginWithGoogle` | endpoint | `POST /api/v1/auth/google` | Visitor | Validates the idToken with Google's keys (audience and nonce). A new account gets a 15-min sign-up token (`aud: okuteta-signup`) |
| `LoginWithFacebook` | endpoint | `POST /api/v1/auth/facebook` | Visitor | Checks the access token on the Graph API (`debug_token`, `/me`) or validates the Limited Login JWT on iOS |
| `LoginWithApple` | endpoint | `POST /api/v1/auth/apple` | Visitor | Validates the identityToken with Apple's keys and checks the nonce |
| `CompleteSocialSignup` | endpoint | `POST /api/v1/auth/social/complete` | Visitor with sign-up token | Asks for the phone (required) and, optionally, a password, and sends the code |
| `StartPasskeyLogin` | endpoint | `POST /api/v1/auth/passkey/options` | Visitor | Creates a single-use challenge (5 min) for a discoverable credential |
| `FinishPasskeyLogin` | endpoint | `POST /api/v1/auth/passkey/verify` | Visitor | Checks the signature, origin, user verification and counter. Returns the session with no second factor |
| `SendMfaCode` | endpoint | `POST /api/v1/auth/mfa/code` | Visitor with mfaToken | Sends the second-factor code by SMS, WhatsApp or email, on a different channel from the first |
| `VerifyMfa` | endpoint | `POST /api/v1/auth/mfa/verify` | Visitor with mfaToken | Accepts a TOTP, SMS, WhatsApp, email or recovery code, or a passkey, and returns the session with `amr` and `auth_time` |
| `StepUp` | endpoint | `POST /api/v1/auth/step-up` | User | Re-confirms with password, passkey, app or code, and returns a JWT with a fresh `auth_time`, valid 5 min for sensitive actions |
| `RefreshSession` | endpoint | `POST /api/v1/auth/refresh` | User | Rotates the refresh token without asking for the second factor. Reusing an old token revokes the whole family |
| `Logout` | endpoint | `POST /api/v1/auth/logout` | User | Revokes this device's session |
| `ListSessions` | endpoint | `GET /api/v1/me/sessions` | User | Lists devices with a session, the methods used and last use |
| `RevokeSession` | endpoint | `DELETE /api/v1/me/sessions/{id}` | User | Ends another device's session |
| `RequestPasswordReset` | endpoint | `POST /api/v1/auth/password/code` | Visitor | Sends a code by SMS, WhatsApp or email. Same response with or without an account |
| `ResetPassword` | endpoint | `POST /api/v1/auth/password/reset` | Visitor | Changes the password and ends every session. With 2FA on, also asks for the second factor |
| `StartTotpEnrollment` | endpoint | `POST /api/v1/me/mfa/totp` | User, with confirmation | Generates the secret and returns the `otpauth://` URI for the QR code |
| `ConfirmTotpEnrollment` | endpoint | `POST /api/v1/me/mfa/totp/confirm` | User | Checks the first code, turns 2FA on and returns 10 recovery codes, shown only once |
| `RegenerateRecoveryCodes` | endpoint | `POST /api/v1/me/mfa/recovery-codes` | User, with confirmation | Invalidates the old codes and generates 10 new ones |
| `DisableMfa` | endpoint | `DELETE /api/v1/me/mfa` | User, with confirmation | Turns 2FA off and deletes the TOTP and recovery codes |
| `StartPasskeyRegistration` | endpoint | `POST /api/v1/me/passkeys/options` | User, with confirmation | Creates the registration challenge, excluding credentials the person already has |
| `FinishPasskeyRegistration` | endpoint | `POST /api/v1/me/passkeys` | User | Checks the attestation and stores the passkey with the chosen name |
| `ListPasskeys` | endpoint | `GET /api/v1/me/passkeys` | User | Shows each passkey's name, creation date and last use |
| `RenamePasskey` | endpoint | `PATCH /api/v1/me/passkeys/{id}` | User | Renames the passkey |
| `DeletePasskey` | endpoint | `DELETE /api/v1/me/passkeys/{id}` | User, with confirmation | Deletes the passkey, but never the last way to sign in |
| `LinkSocialIdentity` | endpoint | `POST /api/v1/me/identities/{provider}` | User, with confirmation | Links a Google, Facebook or Apple account that isn't linked to someone else |
| `UnlinkSocialIdentity` | endpoint | `DELETE /api/v1/me/identities/{provider}` | User, with confirmation | Unlinks the social account, but never the last way to sign in |
| `GetMyProfile` | endpoint | `GET /api/v1/me` | User | Returns the account, sign-in methods, 2FA state, the barbershops where the person is owner or barber, and pending invites |
| `UpdateProfile` | endpoint | `PATCH /api/v1/me` | User | Changes the name. Changing phone or email asks for confirmation and a new code |
| `SetAvatar` | endpoint | `PUT /api/v1/me/avatar` | User | Takes the upload key and checks it's a JPG or PNG up to 5 MB |
| `VerifyEmail` | endpoint | `POST /api/v1/me/email/verify` | User | Confirms the email with a code |
| `ChangePassword` | endpoint | `PUT /api/v1/me/password` | User, with confirmation | Sets or changes the password |
| `DeleteAccount` | endpoint | `DELETE /api/v1/me` | User, with confirmation | Anonymises the account and publishes `UserAccountDeleted`. An owner with an active barbershop has to close it first |
| `GetAccountStatus` | public | — | booking, shop | Returns the account status and whether the phone is verified, to book and to create a barbershop |
| `FindUserByPhone` | public | — | shop | Returns the account with that verified phone, if any, to notify someone who's invited |
| `PurgeExpiredChallenges` | job | daily | System | Deletes codes and WebAuthn challenges that expired more than 1 day ago |

**Barbershops** (`shop`)

| Use case | Type | Endpoint | Who | What it does |
|---|---|---|---|---|
| `CreateShop` | endpoint | `POST /api/v1/shops` | Verified user | Creates the barbershop as DRAFT, with the owner as an OWNER member |
| `UpdateShop` | endpoint | `PATCH /api/v1/shops/{id}` | Owner | Changes name, address, coordinates, confirmation mode, cancellation deadline, time zone, slot interval, booking notice and no-show rule. Changing the time zone or interval publishes `ShopScheduleChanged` |
| `SetShopCover` | endpoint | `PUT /api/v1/shops/{id}/cover` | Owner | Takes the upload key of the cover photo |
| `SetOpeningHours` | endpoint | `PUT /api/v1/shops/{id}/opening-hours` | Owner | Sets the weekly schedule, with split shifts (e.g. 08:00–12:30 and 14:00–19:00) |
| `SubmitShopForReview` | endpoint | `POST /api/v1/shops/{id}/submit` | Owner | Requires address, hours, one service and one barber taking bookings; the barbershop becomes PENDING_REVIEW |
| `ListPendingShops` | endpoint | `GET /api/v1/admin/shops?status=PENDING_REVIEW` | Admin | Lists the approval queue, oldest first |
| `ApproveShop` | endpoint | `POST /api/v1/admin/shops/{id}/approve` | Admin | Becomes APPROVED and shows up in search. Publishes `ShopApproved` |
| `RejectShop` | endpoint | `POST /api/v1/admin/shops/{id}/reject` | Admin | Becomes REJECTED with a reason. The owner fixes it and resubmits |
| `SuspendShop` | endpoint | `POST /api/v1/admin/shops/{id}/suspend` | Admin | Leaves search. `ShopSuspended` cancels future bookings |
| `SearchShops` | endpoint | `GET /api/v1/shops?lat=&lng=&raio=&q=` | Visitor | Runs the PostGIS query: approved barbershops within the radius, sorted by distance, with rating and lowest price |
| `GetShop` | endpoint | `GET /api/v1/shops/{id}` | Visitor | Public profile: hours, services, barbers, rating, payment accounts and cancellation rule |
| `CreateService` | endpoint | `POST /api/v1/shops/{id}/services` | Owner | Creates a service with name, duration (multiple of 5 min) and price in kwanzas |
| `UpdateService` | endpoint | `PATCH /api/v1/shops/{id}/services/{serviceId}` | Owner | The new price and duration apply only to new bookings |
| `DeactivateService` | endpoint | `DELETE /api/v1/shops/{id}/services/{serviceId}` | Owner | Hides the service. Existing bookings stay |
| `InviteBarber` | endpoint | `POST /api/v1/shops/{id}/invites` | Owner | Invites by phone number, for 7 days. Anyone who already has an account gets a notice |
| `RevokeInvite` | endpoint | `DELETE /api/v1/shops/{id}/invites/{inviteId}` | Owner | Cancels a pending invite |
| `ListMyInvites` | endpoint | `GET /api/v1/me/invites` | User | Lists invites for the account's verified phone |
| `AcceptInvite` | endpoint | `POST /api/v1/invites/{id}/accept` | Invitee | Becomes a BARBER member (or reactivates the row of someone who was there before). The account's verified phone must match the invite |
| `DeclineInvite` | endpoint | `POST /api/v1/invites/{id}/decline` | Invitee | Declines the invite |
| `UpdateMember` | endpoint | `PATCH /api/v1/shops/{id}/members/{memberId}` | Owner or the member | Changes display name, bio and whether they take bookings |
| `SetMemberServices` | endpoint | `PUT /api/v1/shops/{id}/members/{memberId}/services` | Owner | Sets which services this barber does |
| `RemoveMember` | endpoint | `DELETE /api/v1/shops/{id}/members/{memberId}` | Owner, or the member to leave | Becomes REMOVED. `MemberRemoved` cancels the barber's future bookings and deletes their slots. The owner can't leave |
| `GetShopBookingRules` | public | — | booking, schedule | Returns the barbershop's status, confirmation mode, cancellation deadline, interval, time zone, booking notice, no-show rule and opening hours |
| `QuoteServices` | public | — | booking, schedule | Returns the price and duration of the requested services and the active barbers who do all of them |
| `GetShopRole` | public | — | booking, schedule, payment, messaging | Returns a person's role in the barbershop (OWNER, BARBER or none), to authorise requests |
| `ExpireInvites` | job | daily | System | PENDING invites older than 7 days become EXPIRED |
| `OnUserAccountDeleted` | event | UserAccountDeleted | System | Removes the person from barbershops where they're a barber |

**Schedule** (`schedule`)

| Use case | Type | Endpoint | Who | What it does |
|---|---|---|---|---|
| `SetWorkingHours` | endpoint | `PUT /api/v1/members/{id}/working-hours` | Barber or owner | Sets the weekly hours (within the barbershop's) and regenerates free slots. Returns 409 if a booking would fall outside the new hours |
| `AddTimeOff` | endpoint | `POST /api/v1/members/{id}/time-off` | Barber or owner | Adds a day off, holiday or break and deletes free slots in that period. Returns 409 if there are bookings in the period |
| `RemoveTimeOff` | endpoint | `DELETE /api/v1/members/{id}/time-off/{timeOffId}` | Barber or owner | Regenerates the period's slots |
| `ListTimeOff` | endpoint | `GET /api/v1/members/{id}/time-off?de=&ate=` | Barber or owner | Lists time off in the period |
| `GetAvailability` | endpoint | `GET /api/v1/shops/{id}/availability?data=&servicos=&barbeiro=` | Visitor | Reads the day's free slots and returns the start times with enough consecutive slots for the total duration, respecting the minimum notice. Without a barber, the union of everyone who does the services |
| `ReserveSlots` | public | — | booking | Takes the interval's slots with `UPDATE … WHERE booking_id IS NULL` and checks the row count. If any is missing, the booking fails with 409 |
| `GenerateSlots` | job | daily | System | For every barber, in the barbershop's time zone, generates slots for every day in the window (`max_advance_days`) that doesn't have them yet. A missed run is fixed by the next one |
| `PurgePastSlots` | job | daily | System | Deletes slots older than 7 days |
| `OnBookingEnded` | event | BookingCancelled, BookingRejected, BookingExpired | System | Frees the slots (`booking_id = NULL`) |
| `OnShopScheduleChanged` | event | ShopScheduleChanged | System | Regenerates free slots for all the barbershop's barbers with the new interval or time zone, without touching taken ones |
| `OnMemberRemoved` | event | MemberRemoved | System | Deletes the barber's future slots |

**Bookings** (`booking`)

| Use case | Type | Endpoint | Who | What it does |
|---|---|---|---|---|
| `CreateBooking` | endpoint | `POST /api/v1/shops/{id}/bookings` | Verified customer | Takes the services, start time, barber (or none) and payment method. Locks the candidates in id order, picks a random one with free slots, calls `ReserveSlots`, and creates it as CONFIRMED (INSTANT) or PENDING (MANUAL). Accepts `Idempotency-Key`. Refused if the customer hit that barbershop's no-show limit |
| `GetBooking` | endpoint | `GET /api/v1/bookings/{id}` | Customer, barber or owner | Shows the detail with copied services and prices. For the barbershop, includes the customer's rating |
| `ListMyBookings` | endpoint | `GET /api/v1/me/bookings?estado=` | Customer | Lists upcoming and past bookings |
| `ListShopAgenda` | endpoint | `GET /api/v1/shops/{id}/agenda?data=&barbeiro=` | Owner or barber | Shows the day's schedule: a barber sees only their own, the owner sees all |
| `ApproveBooking` | endpoint | `POST /api/v1/bookings/{id}/approve` | Owner or assigned barber | PENDING → CONFIRMED |
| `RejectBooking` | endpoint | `POST /api/v1/bookings/{id}/reject` | Owner or assigned barber | PENDING → REJECTED, with a reason, and frees the slots |
| `CancelBookingByCustomer` | endpoint | `POST /api/v1/bookings/{id}/cancel` | Customer | Cancels up to `cancel_notice_hours` before the start. After that, returns 409 and only the barbershop can cancel |
| `CancelBookingByShop` | endpoint | `POST /api/v1/shops/{id}/bookings/{bookingId}/cancel` | Owner or assigned barber | Cancels any time before the start, with a required reason |
| `CompleteBooking` | endpoint | `POST /api/v1/bookings/{id}/complete` | Owner or assigned barber | From the start time on, becomes COMPLETED and publishes `BookingCompleted` |
| `MarkNoShow` | endpoint | `POST /api/v1/bookings/{id}/no-show` | Owner or assigned barber | 15 min after the start, becomes NO_SHOW and counts towards that barbershop's limit |
| `ExpirePendingBookings` | job | every minute | System | PENDING bookings with no answer by `pending_expires_at` become EXPIRED |
| `AutoCompleteBookings` | job | hourly | System | CONFIRMED bookings that ended more than 12 h ago become COMPLETED |
| `GetBookingParticipants` | public | — | review, payment | Returns the customer, barber, barbershop, status and completion date |
| `HasBookingWithShop` | public | — | messaging | Says whether the customer has or had a booking at that barbershop |
| `OnMemberRemoved` | event | MemberRemoved | System | Cancels (SYSTEM) the barber's future bookings |
| `OnShopSuspended` | event | ShopSuspended | System | Cancels the barbershop's future bookings |
| `OnUserAccountDeleted` | event | UserAccountDeleted | System | Cancels the customer's future bookings |

**Reviews** (`review`)

| Use case | Type | Endpoint | Who | What it does |
|---|---|---|---|---|
| `ReviewShop` | endpoint | `POST /api/v1/bookings/{id}/review` | Customer | Up to 14 days after COMPLETED, rates the barbershop and the barber from 1 to 5, with a comment. Stays hidden until the barbershop reviews or the deadline ends |
| `ReviewCustomer` | endpoint | `POST /api/v1/bookings/{id}/customer-review` | Assigned barber or owner | Rates the customer from 1 to 5, with a comment. Once both sides have reviewed, publishes both |
| `PublishExpiredReviews` | job | hourly | System | Publishes reviews whose 14-day deadline ended, even without the other side's |
| `ReplyToReview` | endpoint | `POST /api/v1/reviews/{id}/reply` | Owner | Posts a public reply to a published barbershop review |
| `ListShopReviews` | endpoint | `GET /api/v1/shops/{id}/reviews` | Visitor | Lists published reviews, newest first |
| `ListMemberReviews` | endpoint | `GET /api/v1/members/{id}/reviews` | Visitor | Lists the barber's reviews |
| `GetCustomerRating` | public | — | booking | Returns the customer's rating and review count |
| `HideReview` | endpoint | `POST /api/v1/admin/reviews/{id}/hide` | Admin | Hides an offensive or fake review, with a reason |
| `RecalculateRating` | event | ReviewPublished, ReviewHidden | System | Recalculates `rating_stats` for the barbershop, barber or customer from published reviews |
| `OnUserAccountDeleted` | event | UserAccountDeleted | System | The author's name becomes "Utilizador removido" (removed user) |

**Notifications** (`notification`)

| Use case | Type | Endpoint | Who | What it does |
|---|---|---|---|---|
| `RegisterDevice` | endpoint | `POST /api/v1/me/devices` | User | Registers the device's FCM token |
| `UnregisterDevice` | endpoint | `DELETE /api/v1/me/devices/{token}` | User | Deletes the token when the person signs out |
| `ListNotifications` | endpoint | `GET /api/v1/me/notifications` | User | Shows the in-app inbox, paginated |
| `MarkNotificationRead` | endpoint | `POST /api/v1/me/notifications/{id}/read` | User | Marks a notice as read |
| `MarkAllRead` | endpoint | `POST /api/v1/me/notifications/read-all` | User | Marks every notice as read |
| `NotificationEventListener` | event | several | System | Stores the notice in the event's transaction: booking requested, confirmed, rejected, cancelled (with an invite to request a refund if it was paid), expired or completed (invite to review), reviews published, barber invite, barbershop approved or rejected, payment declared, refund requested or sent, new message, and security notices (sign-in from a new device, 2FA turned on or off, recovery code used), these also by email |
| `DeliverPush` | job | every 5 s | System | Sends through FCM with `FOR UPDATE SKIP LOCKED`, up to 5 attempts. An invalid token is deleted |
| `SendReminders` | job | every 5 min | System | Sends reminders 24 h and 1 h before the booking; `dedupe_key` prevents repeats |
| `PurgeOldNotifications` | job | daily | System | Deletes notices older than 6 months |

**Payments** (`payment`)

| Use case | Type | Endpoint | Who | What it does |
|---|---|---|---|---|
| `SetShopPaymentAccounts` | endpoint | `PUT /api/v1/shops/{id}/payment-accounts` | Owner | Sets the barbershop's Multicaixa Express, Unitel Money and Afrimoney numbers or IBAN |
| `OnBookingCreated` | event | BookingCreated | System | Creates the PENDING payment with the booking's amount and chosen method |
| `GetBookingPayment` | endpoint | `GET /api/v1/bookings/{id}/payment` | Customer or barbershop | Shows the amount, status, refund and where to pay (`payTo`) |
| `ChangePaymentMethod` | endpoint | `PUT /api/v1/bookings/{id}/payment/method` | Customer | Changes the method while the payment is PENDING |
| `DeclarePayment` | endpoint | `POST /api/v1/bookings/{id}/payment/declare` | Customer | Says the transfer was made, with the proof's upload key (JPG, PNG or PDF), and becomes DECLARED |
| `ConfirmPaymentReceived` | endpoint | `POST /api/v1/bookings/{id}/payment/received` | Owner or assigned barber | Becomes RECEIVED. For cash, this is the only step |
| `DisputePayment` | endpoint | `POST /api/v1/bookings/{id}/payment/not-received` | Owner | DECLARED → DISPUTED, and the admin sees the proof |
| `ResolvePaymentDispute` | endpoint | `POST /api/v1/admin/payments/{id}/resolve` | Admin | Decides RECEIVED or back to PENDING |
| `OnBookingCancelled` | event | BookingCancelled, BookingRejected, BookingExpired | System | A PENDING payment becomes CANCELLED. If it was already declared or received, it waits for a refund request |
| `RequestRefund` | endpoint | `POST /api/v1/bookings/{id}/payment/refund` | Customer | For a cancelled, rejected or expired booking whose payment is DECLARED or RECEIVED. Locks the payment (`FOR UPDATE`): only one request, for the amount paid |
| `SendRefund` | endpoint | `POST /api/v1/refunds/{id}/sent` | Owner | Marks it as refunded, with the proof's upload key: SENT |
| `ConfirmRefund` | endpoint | `POST /api/v1/refunds/{id}/confirm` | Customer | Confirms receipt: CONFIRMED, and the payment becomes REFUNDED |
| `DisputeRefund` | endpoint | `POST /api/v1/refunds/{id}/dispute` | Customer | Says it didn't arrive: DISPUTED, and the admin sees the proof |
| `ResolveRefundDispute` | endpoint | `POST /api/v1/admin/refunds/{id}/resolve` | Admin | Decides CONFIRMED or back to REQUESTED, with a note |
| `AutoConfirmRefunds` | job | daily | System | SENT refunds with no answer from the customer in 7 days become CONFIRMED |
| `GetShopRevenue` | endpoint | `GET /api/v1/shops/{id}/revenue?de=&ate=` | Owner | Shows the total received minus refunds, by method and by barber |

**Messages** (`messaging`)

| Use case | Type | Endpoint | Who | What it does |
|---|---|---|---|---|
| `OpenConversation` | endpoint | `POST /api/v1/shops/{id}/conversations` | Customer | Only for someone with a booking at that barbershop. One conversation per customer and barbershop |
| `ListConversations` | endpoint | `GET /api/v1/me/conversations` · `GET /api/v1/shops/{id}/conversations` | Customer · owner and barbers | Shows the last message and unread count |
| `ListMessages` | endpoint | `GET /api/v1/conversations/{id}/messages?antes=` | Participants | Lists messages, paginated by date |
| `SendMessage` | endpoint | `POST /api/v1/conversations/{id}/messages` | Participants | Sends up to 2000 characters, with phone numbers (libphonenumber, AO region) and emails replaced by `•••`. `clientMessageId` prevents duplicates, and the other side gets a push |
| `MarkConversationRead` | endpoint | `POST /api/v1/conversations/{id}/read` | Participants | Moves the reader's side read marker, which never goes back |
| `PurgeOldMessages` | job | daily | System | Deletes messages older than 2 years |

**Shared infrastructure** (`shared`)

| Use case | Type | Endpoint | Who | What it does |
|---|---|---|---|---|
| `CreateUploadUrl` | endpoint | `POST /api/v1/uploads` | User | Takes the purpose (avatar, cover or proof), type and size, and returns a 5-min pre-signed PUT URL and the key `users/{id}/…` |
| `OutboxRelay` | job | every 5 s | System | Delivers events that leave the app (emails), with up to 5 attempts and a log alert when they fail |

### Ways to sign in

| Method | How it works | Rules |
|---|---|---|
| Email or phone + password | `POST /auth/login` | Phone only once verified; 5 failures lock it for 15 min |
| SMS or WhatsApp code | `POST /auth/code` and `/auth/code/verify` | Only verified `+244` phones; 1 code per minute and 5 per day; same response with or without an account |
| Email link | `POST /auth/link`; the app receives the link and calls `/auth/link/verify` | Only a confirmed email; single use, 15 min, 3 per hour. Opening the link (GET) doesn't use it up, because email scanners open links on their own |
| Google, Facebook, Apple | The app uses the provider's SDK and sends the token to `POST /auth/{provider}` | An email **confirmed** by the provider links the existing account; an unconfirmed one (Facebook) never does. New account: finish sign-up with a phone |
| Passkey | Challenge at `/auth/passkey/options`, authenticator response at `/auth/passkey/verify` | Biometrics or PIN required; single-use challenge, 5 min; already counts as two factors |

An account can have several methods at once, and no operation leaves it without a way in: deleting the last passkey or
unlinking the last provider is refused.

### 2FA and MFA

2FA is **optional for everyone**, administrators included. Barbershop owners see a notice recommending it.

| Factor | Security | Notes |
|---|---|---|
| Passkey | Strong (phishing-resistant) | Signing in with a passkey asks for no second factor |
| Authenticator app (TOTP) | Good | RFC 6238 with the JDK; secret encrypted with AES-256-GCM; the same code can't be used twice |
| WhatsApp code | Medium | Exposed to SIM swap when WhatsApp is reinstalled |
| SMS code | Weak | SIM swap and interception |
| Email code | Medium | Only when the first factor wasn't email |
| Recovery codes | Emergency | 10 single-use codes, shown once, stored hashed |

- **Different channel:** the second factor is always on a different channel from the first. After an SMS code,
  another SMS doesn't count.
- **New sign-ins only:** the second factor is only asked on a new sign-in, and refreshing the session doesn't ask for
  it.
- **Password reset:** with 2FA on, resetting the password also asks for the second factor.
- **Notices:** a sign-in from a new device, turning 2FA on or off, and using a recovery code send an in-app notice and
  an email.

**Accepted risk:** since 2FA is optional and SMS and WhatsApp also count for administrators, a stolen admin password,
or a SIM swap, gives access to approvals and payment proofs. Confirmation for sensitive actions reduces the risk, but
doesn't prevent it.

### Confirmation for sensitive actions

These actions return **401** with the code `STEP_UP_REQUIRED` when the token's `auth_time` is more than 5 minutes
old:

- changing the password, phone or email;
- turning 2FA on or off, and generating new recovery codes;
- adding or removing passkeys, and linking or unlinking social accounts;
- deleting the account;
- **changing the barbershop's payment accounts** (where the money goes).

The app calls `POST /auth/step-up` with a factor (password, passkey, app or code) and repeats the request with the new
token. This applies to everyone, with or without 2FA.

### iOS and Android integration

- **Google.** Android: Credential Manager with `GetGoogleIdOption` (`serverClientId` is the "web client"). iOS: Google
  Sign-In. Send the `idToken` and the original `nonce`. All client IDs go in `GOOGLE_CLIENT_IDS`.
- **Apple.** iOS: `ASAuthorizationAppleIDProvider` with the name and email scopes and the nonce's SHA-256. Send the
  `idToken`, `authorizationCode`, the original `nonce` and the `fullName`, which Apple only provides on the first
  sign-in. The App Store requires "Sign in with Apple" whenever the app offers another social sign-in, and requires
  revoking access when the account is deleted.
- **Facebook.** Android: send the Facebook Login `accessToken`. iOS: send the `accessToken`, or the Limited Login
  `idToken` with the `nonce`, which is used when the person declines tracking.
- **Passkeys.** Options come in `publicKey`, in WebAuthn JSON format. Android: Credential Manager. iOS:
  `ASAuthorizationPlatformPublicKeyCredentialProvider`. Both only accept passkeys from a domain associated with the
  app:
  1. Set `PASSKEY_RP_ID` (e.g. `okuteta.ao`).
  2. The API serves `/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json` on that domain, built
     from `IOS_APP_IDS`, `ANDROID_PACKAGE_NAME` and `ANDROID_CERT_FINGERPRINTS`.
  3. On iOS, add `webcredentials:<domain>` and `applinks:<domain>` to *Associated Domains*.
- **Email links.** The link points to `https://<domain>/l/<token>`. With the app installed, Universal Links or App
  Links open it, and the app sends the token with `POST /auth/link/verify`. Without the app, the page only shows a
  button to open it.
- **WhatsApp.** The code request accepts `"via": "WHATSAPP"`. If WhatsApp isn't configured, or fails, the response says
  it went by SMS (`delivery`).
- **Files.** The app asks `POST /uploads` for a URL (purpose, type and size), sends the file straight to S3 with `PUT`,
  and passes the `key` to the endpoint that uses it (avatar, cover, proof).

### Protections

| Protection | How it works |
|---|---|
| Passwords | Argon2id. Refresh tokens, codes, link tokens and recovery codes are stored only as SHA-256 hashes |
| Sign-in lockout | 5 wrong passwords in a row lock the account for 15 min (HTTP 429 with `Retry-After`) |
| Per-IP limit | In AWS WAF, shared by every instance, on `/auth/*`. In development, in memory |
| Per-number and per-email limit | 1 code per minute and 5 per day per phone; 3 links per hour per email. Counted in PostgreSQL |
| Verification codes | 6 digits, valid 10 min, 5 attempts, read with `FOR UPDATE` |
| Files | 5-min pre-signed URL, with the key tied to the requester's id (`users/{id}/…`). The type is checked from the content after upload (JPG, PNG, PDF, up to 5 MB) |
| Roles in the barbershop | The owner sees everything in the barbershop, a barber only their own schedule, a customer only their own bookings |
| Chat | Phone numbers and emails written in messages are replaced by `•••` before saving |

**Real IP behind the load balancer:** with `server.forward-headers-strategy=native`, the IP in `X-Forwarded-For` is
used, accepted only when the request comes from the load balancer (a private IP). The app's port is open only to the
load balancer.

### Error responses

Every error follows **RFC 9457 (Problem Details)**, with `Content-Type: application/problem+json`. The `title` and
`detail` texts are in Portuguese, for the app to show:

```json
{
  "type": "urn:okuteta:error:conflict",
  "title": "Conflito",
  "status": 409,
  "detail": "Este horário acabou de ser marcado. Escolha outro",
  "instance": "/api/v1/shops/0192.../bookings",
  "code": "CONFLICT",
  "timestamp": "2026-10-27T09:42:12.286Z"
}
```

| HTTP | `code` | When |
|------|--------|------|
| 400 | `VALIDATION_FAILED` | Invalid request fields, listed in `errors` |
| 401 | `UNAUTHORIZED` | No token, expired token, invalid credentials or refresh token |
| 401 | `STEP_UP_REQUIRED` | Sensitive action with an `auth_time` older than 5 min |
| 403 | `FORBIDDEN` | No role in the barbershop, admin route, or suspended account |
| 404 | `RESOURCE_NOT_FOUND` | Missing resource or route |
| 409 | `CONFLICT` | Slot already taken, time off over bookings, phone or email already registered, concurrent change to the same record |
| 422 | `BUSINESS_RULE_VIOLATION` | Business rule broken (e.g. cancelling after the deadline, no-show limit, landline number) |
| 429 | `TOO_MANY_REQUESTS` | Sign-in locked, per-IP limit, or code requested too soon. Includes `Retry-After` |
| 500 | `INTERNAL_ERROR` | Unexpected error, without internal details |
| 503 | `SERVICE_UNAVAILABLE` | Provider (SMS, WhatsApp, email, social sign-in) not configured or down. The request can be retried |

Clients should rely on the `code` field, which is stable.

## Data model and system design

The full design is in [docs/design.html](docs/design.html), in Portuguese. Open it in a browser (online, for the
fonts, diagrams and hand-drawn sketches). It's organised in the same parts as Bazza's:

| Part | Contents |
|---|---|
| 0. Scope and decisions | The 16 decisions (with the reasoning), the nine ways to sign in and the 2FA/MFA analysis |
| 1. Data model | 31 tables by module, with columns, indexes and the relationship diagram |
| 2. Use cases | 141 use cases, with endpoint, caller and effect, filterable; state diagrams and request/response examples |
| 3. Architecture | Modules, dependency rules, stack and the AWS infrastructure, with costs |
| 4. Capacity | Estimates for 10 thousand, 100 thousand and 1 million users, and what gets tight first |
| 5. Operations | Service level objectives (SLOs), security, concurrency, data protection and observability |
| 6. Build plan | The 11 MVP steps and the later phases |

### Tables by module

| Module | Tables |
|---|---|
| `user` | `users`, `refresh_tokens`, `verification_codes`, `user_identities`, `passkeys`, `webauthn_challenges`, `totp_credentials`, `recovery_codes` |
| `shop` | `shops`, `shop_opening_hours`, `shop_members`, `shop_invites`, `services`, `member_services` |
| `schedule` | `working_hours`, `time_off`, `member_slots` |
| `booking` | `bookings`, `booking_services`, `booking_status_history` |
| `review` | `reviews`, `rating_stats` |
| `notification` | `notifications`, `device_tokens` |
| `payment` | `shop_payment_accounts`, `booking_payments`, `refund_requests` |
| `messaging` | `conversations`, `messages` |
| `shared` | `outbox_events`, `shedlock` |

### Core model rules

- **One user, several roles.** There's no barber or owner table. Being an owner or barber is a row in `shop_members`
  (`OWNER` or `BARBER`), and anyone without one is just a customer. The same person can work at one barbershop and
  book at another.
- **The schedule is made of slots.** For each barber, a daily job generates `member_slots` up to the barbershop's
  maximum notice, at the interval it chose. Slots exist only within working hours and outside time off, and a free
  slot has a null `booking_id`. Availability is a read of the consecutive free slots that fit the services' total
  duration. Example, with 15-min slots and Corte + Barba (haircut + beard: 30 + 15 = 45 min, i.e. 3 slots):

  | Barber | Free | Possible start times |
  |---|---|---|
  | Mário | 09:45–10:30, 11:00–13:00, 14:00–15:00, 16:00–19:00 | 09:45, 11:00 to 12:15, 14:00, 14:15, 16:00 to 18:15 |
  | Joana | 11:30–13:00, 14:30–18:00 | 11:30 to 12:15, 14:30 to 17:15 |

  "Anyone" shows the union. At 09:45 only Mário fits, and at 14:30 only Joana (Mário has Tranças at 15:00). At 11:30
  both fit, and the system picks one at random. With
  30-min slots, the same 45 min take 2 slots (60 min).
- **No overlapping bookings.** A booking locks the candidate barbers (`SELECT … FOR UPDATE` on `shop_members`, in id
  order to avoid deadlocks), picks a random one with free slots and takes them with
  `UPDATE member_slots SET booking_id = … WHERE … AND booking_id IS NULL`. If too few rows change, the transaction
  rolls back and the response is **409**. That `UPDATE` is the last line of defence in the database, and it also works
  on H2.
- **Changing the schedule never touches what's booked.** Changing working hours, time off, the interval or the time
  zone only regenerates free slots. Time off or new hours that would hit bookings are refused (**409**): the bookings
  must be cancelled first.
- **Per-barbershop rules.** Confirmation mode, cancellation deadline, interval, time zone, booking notice and no-show
  limit are columns in `shops`. No-shows are counted by query (no table), and the block only applies at that
  barbershop.
- **Time zone.** The database stores `timestamptz` in UTC. Weekly hours are `time` in the barbershop's time zone
  (`Africa/Luanda` by default).
- **Contended operations lock the right row.** These are read with `FOR UPDATE` before deciding:
  - the refresh token;
  - the verification code;
  - the passkey challenge;
  - the last TOTP step;
  - time off over bookings;
  - payment confirmation;
  - the refund request.

  Everything else uses `@Version` and returns **409**. Each case has a test with parallel requests.
- **Money in kwanza cents.** Amounts are `bigint` (`*_cents`) with `currency` (`AOA`). Services, durations and prices
  are copied into `booking_services` at booking time: the customer pays what they saw.
- **The platform never holds other people's money.** The customer pays the barbershop directly. The platform only
  records the payment and the refund, which is always the amount paid.
- **UUID v7 as the key.** Generated by the app (H2 has no `uuidv7()`), time-ordered.
- **Side effects through the outbox.** Emails go into `outbox_events` in the transaction that created them and are sent
  after the commit, with retries.
- **A notification never breaks the operation.** The notice is stored in the same transaction as the event, and the
  push goes out later, through a job with `FOR UPDATE SKIP LOCKED` and up to 5 attempts.
- **Double-blind reviews.** They stay `PENDING` until both sides have reviewed or 14 days have passed. Ratings are kept
  ready in `rating_stats` (barbershop, barber and customer), recalculated from published reviews.
- **Deletion with anonymisation (Angolan Law 22/11).** Deleted users stay in the database without personal data, so
  old bookings and reviews stay intact. In reviews, the name becomes "Utilizador removido" (removed user).

### Estimated capacity

Order-of-magnitude estimates for 10 thousand, 100 thousand and 1 million registered users (customers and barbers).
Assumptions, to be replaced with real data:

- one barbershop per 100 users, with 4 barbers;
- half of the users active each month;
- 1.5 bookings per active customer per month, i.e. 0.025 bookings per user per day;
- Saturday peak (×1.5), with 25% of the day's bookings between 09:00 and 10:00;
- 15 availability queries and 40 API requests per booking.

| Metric | 10 thousand | 100 thousand | 1 million |
|---|---|---|---|
| Barbershops / barbers | 100 / 400 | 1,000 / 4,000 | 10,000 / 40,000 |
| Bookings per day | 250 | 2,500 | 25,000 |
| Booking peak | ~2 per minute | ~0.3/s | ~2.6/s |
| Availability query peak | ~0.4/s | ~4/s | ~40/s |
| API request peak | ~1/s | ~10/s | ~100/s |
| Push per day (8 per booking) | 2 thousand | 20 thousand | 200 thousand |
| Stored slots (barbers × 30 days × 40) | 0.5 million | 4.8 million | 48 million |
| Slots generated and deleted per day | 16 thousand | 160 thousand | 1.6 million |
| Data in the first year | < 1 GB | ~5 GB | ~50 GB |
| API tasks (~150 requests/s each, to be measured with k6) | 2 (for availability) | 2 | 3 to 8, across 3 zones |
| AWS cost per month | ≈ US$290 | ≈ US$490 | ≈ US$1,200 |

**Request volume stays small even at 1 million** (about 100 requests per second). What gets tight first:

- **Saturday morning:** several people want the same barber at the same time. The lock is per barber, so contention
  stays among those people.
- **The slot table:** at 1 million users it has 48 million rows and changes 1.6 million a day. `DELETE` stops being
  enough, and it needs monthly partitions, dropping the old ones.
- **The SMS bill:** with 1 million accounts, SMS codes weigh more on the bill than AWS. Passkeys and WhatsApp reduce
  the number of SMS.
- **Database connections:** tasks × each task's pool. With 8 tasks and a pool of 10, that's already 80 connections,
  and from there RDS Proxy comes in.

## Architecture

The project follows **Clean Architecture (hexagonal)**, organised **by business module**. Each module has three
layers:

```
domain          → business rules (plain Java, no Spring or JPA)
application     → use cases that orchestrate the domain, and the outbound ports
infrastructure  → adapters: database (JPA), REST API, SMS, WhatsApp, email, push, S3, jobs
```

Dependencies always point inwards: `infrastructure → application → domain`.

- **Call:** a module asks another one right away through a public use case, behind a port. Examples: `booking` calls
  `schedule.ReserveSlots`, and `review` calls `booking.GetBookingParticipants`.
- **Event:** a module reacts to what another one publishes, in the same transaction. Examples: `BookingCancelled`
  frees the slots and creates the notice; `MemberRemoved` cancels the barber's future bookings.
- **`notification` only listens:** it listens to the other modules, and none depends on it.
- **No module reads another module's tables:** ArchUnit checks it.

### Who depends on whom

| Caller | Public use case | What for |
|---|---|---|
| `booking` | `shop.QuoteServices`, `shop.GetShopBookingRules`, `shop.GetShopRole` | Prices, durations and who does the services; confirmation mode, deadlines and no-shows; who approves |
| `booking` | `schedule.ReserveSlots` | Take the booking's slots |
| `booking` | `review.GetCustomerRating` | The customer's rating, for the barbershop |
| `booking` | `user.GetAccountStatus` | Verified phone to book |
| `schedule` | `shop.GetShopBookingRules`, `shop.QuoteServices`, `shop.GetShopRole` | Hours, interval, time zone and notice; who does the services; who can change a schedule |
| `shop` | `user.GetAccountStatus`, `user.FindUserByPhone` | Verified phone to create a barbershop; notify invitees who already have an account |
| `review` | `booking.GetBookingParticipants` | Who can review, and until when |
| `payment` | `booking.GetBookingParticipants`, `shop.GetShopRole` | Who declares, confirms and requests refunds |
| `messaging` | `booking.HasBookingWithShop`, `shop.GetShopRole` | Only customers with a booking open a chat; who answers for the barbershop |

| Event | Published by | Heard by |
|---|---|---|
| `UserAccountDeleted` | `user` | `shop`, `booking`, `review` |
| `LoginFromNewDevice`, `MfaChanged`, `RecoveryCodeUsed` | `user` | `notification` |
| `ShopApproved`, `ShopRejected`, `InviteCreated` | `shop` | `notification` |
| `ShopSuspended` | `shop` | `booking`, `notification` |
| `ShopScheduleChanged` | `shop` | `schedule` |
| `MemberRemoved` | `shop` | `booking`, `schedule` |
| `BookingCreated` | `booking` | `payment`, `notification` |
| `BookingConfirmed`, `BookingCompleted`, `BookingNoShow` | `booking` | `notification` |
| `BookingRejected`, `BookingCancelled`, `BookingExpired` | `booking` | `schedule`, `payment`, `notification` |
| `ReviewPublished`, `ReviewHidden` | `review` | `notification` |
| `PaymentDeclared`, `RefundRequested`, `RefundSent` | `payment` | `notification` |
| `MessageSent` | `messaging` | `notification` |

- Nobody depends on `notification`, and `user` calls nobody.
- For calls, only `booking` ↔ `review` depend on each other both ways (the customer's rating and the booking's
  participants), always through ports. Those ports are injected in the `@Bean` methods, not the constructor, so bean
  creation doesn't form a cycle.

The design page has an interactive version: pick a module to see what it calls, who calls it, what it publishes and
what it listens to.

### Architecture drawings

The images are in [docs/arquitetura](docs/arquitetura) (with Portuguese labels). They come from the drawings in
[docs/design.html](docs/design.html): if the architecture or the infrastructure changes, update the page and export
the images again.

#### Overview

![Overview: app, load balancer, API with the eight modules, data and providers, with the steps of a booking](docs/arquitetura/visao-geral.png)

- **Entry:** the app only reaches the API through the load balancer, with WAF in front. Spring Security checks the
  token, the role in the barbershop and the `auth_time` of sensitive actions before any module.
- **Providers:** each arrow leaves the module that uses the provider. `user` uses Twilio, Brevo and social sign-in;
  `notification` uses Firebase and Brevo. Each provider has its own circuit breaker (Resilience4j).
- **Data:** every module writes to PostgreSQL, each only to its own tables. Files go from the app straight to S3, and
  the API only signs the URLs.
- **Steps 1 to 6:** a customer books at a barbershop that approves bookings, and the notice reaches the barber's
  phone:
  1. the app sends `POST /shops/{id}/bookings`;
  2. `booking` asks `shop` for prices and who does the services;
  3. `schedule` takes the slots (conditional `UPDATE`);
  4. the booking and the event are stored in one transaction;
  5. on `BookingCreated`, `notification` stores the notice;
  6. the push job sends it through Firebase.

#### On AWS

| Test (`infra/teste`) | Production (proposal) |
|---|---|
| ![AWS: test environment](docs/arquitetura/aws-teste.png) | ![AWS: production proposal](docs/arquitetura/aws-producao.png) |

- **Test:** what `terraform apply` in `infra/teste` will create, for about US$85/month:
  - one ECS task in the public subnet, with a public IP and no NAT;
  - RDS (db.t4g.micro) in a private subnet, in a single zone;
  - no WAF.

  The second zone exists because AWS requires it for the load balancer and the database subnet group.
- **Production:** in `af-south-1` (Cape Town), the region closest to Angola, for about US$290/month plus outbound
  traffic:
  - 2 to 6 ECS Fargate ARM64 tasks in private subnets, one per zone;
  - 1 NAT Gateway for outbound traffic;
  - RDS PostgreSQL 18 + PostGIS Multi-AZ (db.t4g.small), with a standby replica that takes over if a zone goes down;
  - ALB with AWS WAF, which handles per-IP limits without Redis;
  - an S3 gateway endpoint, so tasks reach the bucket without going through the NAT;
  - Secrets Manager, CloudWatch with alarms through SNS, and AWS Budgets.
- **Production cost by service:** hourly prices come from the public AWS Price List API for `af-south-1`, read on
  27/10/2026, over 730 hours a month. Usage-based items are estimates.

  | Service | US$/month | Source |
  |---|---|---|
  | Tasks (2 × 1 vCPU, 2 GB, ARM) | 78 | AWS price: US$0.04372 per vCPU-hour, US$0.0048 per GB-hour |
  | RDS (db.t4g.small Multi-AZ, 50 GB gp3) | 75 | AWS price: US$0.082/hour, US$0.302 per GB-month |
  | NAT | 42 | AWS price: US$0.057/hour, plus US$0.057 per GB processed |
  | Load balancer | 29 | AWS price: US$0.03/hour, plus about 1 LCU at US$0.0095 |
  | WAF | 27 | AWS price: US$5 per ACL, US$1 per rule, US$0.60 per million requests (~30 million) |
  | CloudWatch | 15 | estimate |
  | IPv4 (3 addresses) | 11 | AWS price: US$0.005/hour each |
  | S3, Secrets Manager, ECR, Route 53 | 10 | estimate |

- **A single NAT:** if zone A goes down, zone B has no way out to the providers. One NAT per zone costs about US$42/month
  more.
- **Outside AWS:**
  - the `.ao` domain is registered with the Angolan registry and delegated to Route 53;
  - no AWS region is in Angola, so transferring data out of the country goes through the APD (Angola's data
    protection agency).

### Folder structure

```
src/main/java/ao/okuteta
├── shared/          # common code: UseCase, security, errors, outbox, uploads, config
├── user/            # accounts, sign-in methods, passkeys and 2FA
├── shop/            # barbershops, hours, services, team, invites and search
├── schedule/        # barbers' hours, time off and slots
├── booking/         # bookings
├── review/          # double-blind reviews
├── notification/    # in-app inbox, push and reminders
├── payment/         # payment and refund tracking
└── messaging/       # customer–barbershop conversations

infra/
├── modules/         # network, database, service, storage
├── teste/
└── producao/
```

Every module will have the same internal structure. Example with `booking`:

```
booking/
├── domain/
│   ├── model/           # Booking, BookingService, BookingStatus
│   ├── repository/      # persistence ports (interfaces)
│   └── exception/       # business rule errors
├── application/
│   ├── usecase/         # one use case per class (CreateBookingUseCase...)
│   ├── dto/             # commands, queries and results
│   └── port/            # outbound ports: SlotReservation, MemberAssigner...
└── infrastructure/
    ├── config/          # wires use cases as beans, with transactions
    ├── persistence/     # JPA entities, Spring Data repositories and adapters
    ├── web/             # REST controllers, requests and responses
    ├── integration/     # adapters for ports that call other modules
    └── job/             # scheduled jobs
```

### Design patterns

- **Repository and Adapter:** the domain defines the interface, and infrastructure implements it with JPA.
- **Ports and Adapters:** SMS, WhatsApp, email, push, social sign-in, files and encryption sit behind ports
  (`SmsSender`, `IdentityTokenVerifier`, `PushSender`, `FileStorage`…).
- **Strategy:** one sender per channel, chosen by configuration (`twilio`, `smtp` or `log`), and one verifier per 2FA
  factor (TOTP, code, passkey, recovery).
- **Decorator:** `TransactionalUseCase` wraps each use case in a transaction, without the application layer depending
  on Spring.
- **Factory:** `ProblemDetailFactory` builds every error response.
- **Observer (domain events):** modules react to other modules' events without depending on them.
- **Value Object and DTO/Mapper:** keep rules isolated (`PhoneNumber`, `Money`, `SlotMinutes`) and layers decoupled.

## Contributing a new use case

Example: a waiting list for a full time slot (phase 2).

1. **Domain:** create the aggregate (`booking/domain/model/WaitlistEntry`) and the repository interface in
   `booking/domain/repository`.
2. **Application:** create `JoinWaitlistCommand` in `application/dto` and `JoinWaitlistUseCase` in
   `application/usecase`, implementing `UseCase<JoinWaitlistCommand, WaitlistResult>`. To know when the slot frees up,
   listen to the `BookingCancelled` event.
3. **Wiring:** register the use case as a bean in `booking/infrastructure/config`, wrapped in
   `TransactionalUseCase.readWrite(...)`.
4. **Persistence:** create the Flyway migration (H2-compatible) and implement the repository in
   `infrastructure/persistence`.
5. **API:** expose the endpoint in `infrastructure/web/controller`, with its own request and response.
6. **Tests:**
   - unit tests for the domain and the use case (in-memory repositories);
   - an integration test for the API;
   - a parallel-request test, if there's contention.

   Packages are mirrored in `src/test/java`.
7. **Design:** update [docs/design.html](docs/design.html) and this README.

### Naming conventions

| Type               | Example                                        |
|--------------------|------------------------------------------------|
| Use case           | `CreateBookingUseCase`                         |
| Command / Query    | `CreateBookingCommand`, `GetAvailabilityQuery` |
| Port               | `BookingRepository`, `SmsSender`               |
| JPA adapter        | `BookingRepositoryAdapter`, `BookingJpaEntity` |
| Controller         | `BookingController`                            |
| Request / Response | `CreateBookingRequest`, `BookingResponse`      |
| Event              | `BookingConfirmed`, `MemberRemoved`            |

## Scale roadmap

Each phase only adds what that phase's volume needs. Starting with everything from phase 3 would add cost and
complexity with no gain. The triggers say when to move to the next phase, measured rather than guessed. Instance prices
come from the public AWS Price List API for `af-south-1` (27/10/2026); usage-based items are estimates.

### Phase 1 · MVP · up to 10 thousand users

~1 request/s at peak · 250 bookings/day · ≈ US$290/month

- The 11 steps in [Next steps](#next-steps): the eight modules and AWS.
- The approved production setup:
  - 2 Fargate tasks;
  - RDS db.t4g.small Multi-AZ;
  - ALB with WAF;
  - 1 NAT;
  - no Redis.

  It handles far more than this volume. The 2 tasks and Multi-AZ are there for availability, not load.
- Jobs (push, reminders, slots, outbox) inside the API, with ShedLock.
- JSON logs, metrics in CloudWatch and the alarms from the design.
- A k6 load test, with contention for the same slot, before opening to the public.
- Outside the code: the APD request, the `.ao` domain and the Meta and Apple approvals.

**Move to phase 2 when** the availability p95 goes above 300 ms, RDS CPU goes above 60% at the Saturday peak, or there
are more than 50 thousand users.

### Phase 2 · Growth · up to 100 thousand users

~10 requests/s at peak · 2,500 bookings/day · ≈ US$490/month

- **Valkey cache** (ElastiCache, cache.t4g.small with a replica, ≈ US$48):
  - search, for 60 s;
  - barbershop profile, for 5 min;
  - availability, for 30 s, invalidated by booking events.

  Slots never come from the cache when booking.
- **RDS db.t4g.medium** Multi-AZ (≈ US$120 plus storage).
- **One NAT per zone** (+≈ US$42): outbound traffic to providers survives losing a zone.
- **CloudFront** in front of public photos (avatars and covers), with long caching and `?v=`.
- **OpenTelemetry:** traces from request to push, dashboards and alerts on SLO burn rate.
- **Product:** rescheduling, waiting list, revenue model, reports and moderation, data export and push-approved 2FA.
- A load test before each busy season: year end and national holidays.

**Move to phase 3 when** the p95 stays above the SLO with the cache, RDS goes above 60% CPU or 80% of connections, or
the slot job takes more than 1 minute to delete.

### Phase 3 · Scale · 1 million+ users

~100 requests/s at peak · 25,000 bookings/day · ≈ US$1,200/month

- **API tasks:** 3 to 8, with autoscaling, across the region's 3 zones, with one NAT per zone.
- **Separate workers:** an ECS service (same image, `worker` profile) runs push, reminders, slots and the outbox, so
  sending peaks don't take CPU from requests.
- **Database:**
  - RDS db.m6g.large Multi-AZ (≈ US$304 plus storage);
  - a read replica for search and availability (≈ US$153);
  - RDS Proxy in front of the connections (≈ US$29).
- **Monthly partitioning** of `member_slots`, `messages` and `notifications`: drop partitions instead of deleting
  millions of rows.
- **Electronic payments** through an Angolan aggregator, with automatic refunds. The `payment` module can become its own
  service if the aggregator requires isolation.
- **Analytics data:** CDC export to S3, queried with Athena, away from the production database.
- **Regional disaster:** snapshots copied to another region (`eu-west-1`).
- On-call with runbooks, and regular load tests.
- **Fewer SMS:** passkeys and WhatsApp as the default ways to sign in.

**Beyond this:**

- OpenSearch, only if geographic search in PostgreSQL misses the SLO;
- microservices, only for a module with a concrete reason to leave.

| Cost per month (US$) | Phase 1 | Phase 2 | Phase 3 |
|---|---|---|---|
| API tasks and workers | 78 | ≈ 100 | ≈ 196 |
| RDS, storage, replica and Proxy | 75 | ≈ 150 | ≈ 576 |
| Valkey | — | 48 | 48 |
| NAT (1, 2 and 3) | 42 | 84 | 126 |
| ALB, WAF and IPv4 | 67 | ≈ 56 | ≈ 94 |
| CloudWatch, CloudFront, S3, secrets, ECR and DNS (estimate) | ≈ 28 | ≈ 50 | ≈ 130 |
| **Total**, before outbound traffic | **≈ 290** | **≈ 490** | **≈ 1,200** |

## Next steps

- [x] System design: decisions, data model, use cases, architecture, AWS and plan
- [ ] **Step 0 · Skeleton:** Maven, `ao.okuteta` packages, Flyway (with the PostgreSQL-only folder), Docker Compose (PostGIS and MinIO), H2 in tests and Testcontainers in CI, ArchUnit, RFC 9457 errors, pre-signed uploads, OpenAPI, Actuator and CI
- [ ] **Step 1 · `user`, accounts and sign-in:** sign-up, SMS and WhatsApp codes, sign-in by password, code and link, Google, Facebook and Apple, sessions, password reset, profile and deletion
- [ ] **Step 2 · `user`, passkeys and 2FA:** passkeys, authenticator app, recovery codes, second factor at sign-in, confirmation for sensitive actions and security notices
- [ ] **Step 3 · `shop`:** barbershop and its rules, hours, services, invites, members, approval and PostGIS search
- [ ] **Step 4 · `schedule`:** barbers' hours, time off, slot generation and regeneration, availability
- [ ] **Step 5 · `booking`:** booking without overlaps with random pick, approve, cancel, complete, per-barbershop no-shows and expiry jobs
- [ ] **Step 6 · `notification`:** in-app inbox, FCM push and reminders
- [ ] **Step 7 · `review`:** double-blind reviews both ways, owner replies and ratings
- [ ] **Step 8 · `payment`:** barbershop accounts, declaration with proof, confirmation, refunds and revenue
- [ ] **Step 9 · `messaging`:** customer ↔ barbershop chat, with masked contacts and retention
- [ ] **Step 10 · AWS:** Terraform for test and production, deploy through GitHub Actions, alarms and a restore test
- [ ] Load test (k6) with contention for the same slot, before opening to the public
- [ ] Phase 2: rescheduling, waiting list, revenue model, moderation, data export
