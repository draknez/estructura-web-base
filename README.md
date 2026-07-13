# 🚀 Estructura Web Base (BaLog)

**BaLog** es una plantilla Full Stack profesional para construir aplicaciones web seguras y escalables con gestión organizacional.

## 🛠️ Stack

- **Frontend:** React 18 + Vite + Tailwind CSS v4
- **Backend:** Node.js + Express 5 (ESM)
- **DB:** SQLite vía `sql.js` (archivo portable, sin binarios nativos)
- **Auth:** JWT en cookie `httpOnly` + bcryptjs + TOTP (2FA)
- **Seguridad:** Helmet, CORS estricto, rate-limit por IP/usuario, validaciones nativas

## 🔐 Características

- **Organigrama:** Grupos y subgrupos recursivos (hasta 5 niveles) con `leader_id`.
- **Roles jerárquicos:** `usr` / `adm` / `Sa`.
- **Lógica Génesis:** El primer registro se convierte en SuperAdmin.
- **2FA (TOTP, RFC 6238):** Secret base32 propio, ventana ±1, 10 backup codes hasheados.
- **Audit log:** `audit_log` persistente con acciones sensibles registradas.
- **System reset:** Wipe de fábrica con step-up (password + confirmación).
- **Migraciones SQL:** Declarativas, idempotentes, tracked en `_migrations`.
- **UI:** Tablas responsivas con sticky columns, modo oscuro, toasts.

## ⚡ Inicio rápido

```bash
npm install
cp .env.example .env       # edita JWT_SECRET con >=32 chars aleatorios
npm run dev                # frontend (Vite) en :5173
npm run server             # backend en :3000
```

### Variables de entorno

| Var | Default | Notas |
| --- | --- | --- |
| `JWT_SECRET` | — | **Requerido.** ≥32 chars. Sin esto el server aborta al boot. |
| `PORT` | `3000` | |
| `HOST` | `127.0.0.1` | IP literal o `0.0.0.0` |
| `ALLOWED_ORIGINS` | `http://localhost:5173` | CSV |
| `ALLOW_PUBLIC_REGISTER` | `true` | Cerrar tras crear el primer admin |
| `BCRYPT_ROUNDS` | `12` | Clamp 4–15 |
| `DB_PATH` | `server/database.sqlite` | |
| `TEST_DISABLE_RATE_LIMIT` | — | `1` en tests |
| `AUDIT_DEBUG` | — | `1` para trazar inserts de audit |

## 🔑 2FA (TOTP)

Endpoints `Sa`-only salvo `verify`:

| Método | Ruta | Notas |
| --- | --- | --- |
| `GET`  | `/api/auth/2fa/status` | Estado del usuario actual |
| `POST` | `/api/auth/2fa/setup`  | Devuelve `secret` + `otpauth_url` (no persiste) |
| `POST` | `/api/auth/2fa/enable` | Body `{ code }`. Devuelve 10 backup codes (una sola vez) |
| `POST` | `/api/auth/2fa/verify` | Body `{ temp_token, code }`. Canjea sesión completa |
| `POST` | `/api/auth/2fa/disable`| Body `{ password, code }` |

**Rate limit de códigos 2FA:** `verify` y `enable` están limitados a **5
intentos / 15 min** por (IP + username extraído del temp_token o userId).
Esto mitiga fuerza bruta sobre los 6 dígitos (1M combinaciones).

Flujo de login con 2FA activo:
1. `POST /api/login` → `{ requires_2fa: true, temp_token }`
2. `POST /api/auth/2fa/verify` con código TOTP **o** un backup code sin usar
3. Se emite cookie `balog_token` con sesión completa

Apps authenticator compatibles: Google Authenticator, Authy, Bitwarden, 1Password, etc.

## 🗄️ Migraciones

```text
server/migrations/
├── 001_initial_schema.sql   users, roles, user_roles, groups
├── 002_audit_log.sql        audit_log + índices
├── 003_2fa_totp.sql         totp_secret/enabled + backup_codes
├── 004_user_group_id.sql    users.group_id
└── 005_groups_leader_id.sql groups.leader_id
```

Convenciones:
- Nombre `NNN_descripcion.sql`, orden lexicográfico.
- Idempotentes (`CREATE IF NOT EXISTS`, `INSERT OR IGNORE`).
- El runner (`server/migrator.js`) las aplica una sola vez y registra en `_migrations`.

## 🧪 Tests

```bash
npm test                  # 38 casos: security + totp + integration
npm run test:unit         # solo unit (security, totp)
npm run test:integration  # levanta server in-process con DB efímera
```

Los integration tests usan `TEST_DISABLE_RATE_LIMIT=1` y un puerto aleatorio.

## 🏗️ Estructura

```text
├── server/                # API + DB
│   ├── index.js           # Express app + endpoints
│   ├── audit.js           # audit() / listAudit()
│   ├── migrator.js        # runMigrations()
│   ├── totp.js            # TOTP RFC 6238 + backup codes
│   ├── validators.js      # Validaciones nativas
│   └── migrations/        # SQL versionado
├── src/
│   ├── api/               # Cliente HTTP
│   ├── components/        # UI (TableDiv, Cards, …)
│   ├── context/           # Auth, Theme, Toast
│   ├── layouts/           # Base, Private
│   ├── pages/             # auth/ private/ public/
│   ├── routes/            # React Router
│   └── utils/             # Helpers
├── tests/                 # node --test
└── .env                   # Secretos (no commiteado)
```
