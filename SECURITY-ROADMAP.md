# SECURITY-ROADMAP — BaLog (estructura-web-base)

> Registro persistente de tareas de seguridad del proyecto.
> **Cómo retomar:** decirme *“lee SECURITY-ROADMAP.md y continúa”* y retomo desde la
> última tarea abierta. Marco cada cierre actualizando el estado y la fecha.

## Estado del proyecto (snapshot)

- **Branch:** `refactor/structure`
- **Última release/commit limpio:** `3d7dca3 security(2fa): rate-limit verify + enable (5/15min per IP+user)`
- **Working tree:** T-SEC-1 y T-SEC-2 completados — tests pasan **44/44**.
- **Stack:** React 18 + Vite, Express 5 (ESM), sql.js, JWT cookie httpOnly + bcryptjs + TOTP.
- **Foco actual:** endurecer 2FA y superficies adyacentes.

---

## Leyenda

- `[x]` cerrada · `[ ]` pendiente · `[~]` en curso · `[!]` bloqueada
- `T-SEC-N` es el identificador estable para referenciar la tarea en commits, PRs y
  mensajes. **No renumerar tareas cerradas** para no romper referencias históricas.

---

## Backlog de seguridad

### T-SEC-1 — Constant-time TOTP compare + revocación de sesiones al toggle 2FA `[x]` 2026-07-12

**Riesgo:** comparación `===` de códigos TOTP vulnerable a timing attack
(códigos 6 dígitos → 1M combinaciones); togglear 2FA no revocaba sesiones previas
del mismo usuario en otros dispositivos.

**Cambios (working tree, sin commit):**
- `server/totp.js`: helper `constantTimeEqualStr` con `crypto.timingSafeEqual`,
  validación de tipo string antes de regex.
- `server/index.js` `POST /api/auth/2fa/enable` y `POST /api/auth/2fa/disable`:
  - `UPDATE users SET …, token_version = token_version + 1` (revoca otras
    sesiones / dispositivos).
  - Re-emisión de cookie `balog_token` con JWT fresco (tv sincronizado).
  - Audit metadata `sessions_revoked: true`.

**Validación:** `pnpm test` → 40/40 verde (rate-limit + flow + totp unit).
**Siguiente paso:** commitear con mensaje `security(2fa): constant-time totp + session revoke on toggle`.

---

### T-SEC-2 — Audit del consumo de backup codes `[x]` 2026-07-12

**Riesgo:** anteriormente se marcaba el código como usado y se iniciaba sesión,
pero no quedaba traza forense de *qué* código se usó (hash) ni del contador
restante. Tampoco se distinguía "código mal tipeado" de "código ya consumido"
en el audit log.

**Cambios (working tree, sin commit):**
- `server/index.js` `POST /api/auth/2fa/verify`:
  - Backup code consumido → `backup_code.consumed` con
    `{ code_hash_prefix: <8 hex>, remaining: <count post-update>, ip }`.
  - Backup code formato válido sin match (o ya usado) →
    `backup_code.consume_failed` con
    `{ code_hash_prefix, reason: 'no_match_or_already_used', ip }`.
  - El `user.2fa_verify_failed` existente se conserva para fallos de TOTP,
    con flag extra `backup_attempted: true` cuando proceda.
- `tests/integration.test.js`: nueva suite `HTTP 2FA backup code audit (T-SEC-2)`
  con 4 casos (consume OK, reuso, código inexistente, TOTP inválido).

**Validación:** `pnpm test` → 44/44 verde (40 anteriores + 4 nuevos).
**Siguiente paso:** commitear con mensaje
`security(audit): backup_code.consumed / consume_failed (T-SEC-2)`.

---

### T-SEC-3 — Hash endurecido para backup codes + migración `[ ]`

**Riesgo:** `hashBackupCode` usa SHA-256 sin sal. Backup codes son ~36 bits
efectivos (`XXXX-XXXX` mayúsculas/dígitos), así que el espacio es crackeable con
GPU/Hashcat si la BD filtra.

**Trabajo:**
- Sustituir por HMAC-SHA256 con `pepper = JWT_SECRET` (`crypto.createHmac`).
- Considerar bcrypt cost 8 (códigos cortos → cost alto penaliza UX sin ganar
  mucho; HMAC con pepper es suficiente).
- Migración `006_backup_codes_pepper.sql` que añada columna `algo_version`
  (default 2) y rehaga hashes perezosamente en próximo login del usuario.
- Test unit: mismo código → mismo hash; código distinto → hash distinto;
  sin `JWT_SECRET` → throw al boot.

**Archivos:** `server/totp.js`, nueva migración, `server/index.js` (boot guard).

---

### T-SEC-4 — Lockout progresivo en `/api/login` `[ ]`

**Riesgo:** existe `authLimiter` por IP+username (5/15min) pero tras consumir la
cuota el atacante cambia de IP y vuelve a empezar. Falta el lado servidor: un
contador de fallos por username que dispare lockout temporal aunque varíe la IP.

**Trabajo:**
- Tabla `login_failures (username, attempts, first_at, locked_until)`.
- Tras N fallos (ej. 10) en ventana 15min → `locked_until = now + 15min` y
  respuestas 429 incluso antes del limiter.
- Reset del contador en login exitoso.
- Audit `user.login_locked` cuando se active.
- Test: 11 fallos mismos username (IPs distintas simuladas con header) → 429.

---

### T-SEC-5 — Headers de seguridad (Helmet) endurecidos `[ ]`

**Riesgo:** Helmet por defecto no activa CSP estricta, HSTS `preload` ni COOP.
Aplicable a prod (NODE_ENV=production).

**Trabajo:**
- CSP `'self'` con whitelist para `connect-src` (Vite HMR dev) y `style-src`
  Tailwind v4 inline.
- HSTS `maxAge=63072000; includeSubDomains; preload`.
- COOP `same-origin`, COEP `require-corp` (evaluar impacto en imágenes).
- `Permissions-Policy` denegando `camera, microphone, geolocation`.
- Test de integración: `GET /` → headers presentes en prod; ausentes en dev.

---

### T-SEC-6 — UI `/admin/audit` con tabla + filtros + export CSV `[ ]`

**Riesgo:** existe el endpoint de listado pero no hay vista. Los eventos de
seguridad viven solo en BD sin que un Sa los revise de forma cómoda.

**Trabajo:**
- Página React `src/pages/private/admin/Audit.jsx` con `TableDiv`.
- Filtros: rango fechas, actor, acción, target.
- Botón “Exportar CSV” (endpoint nuevo `/api/admin/audit/export` con rate-limit
  bajo y audit de la propia exportación).
- Empty state + paginación cursor-based.

---

### T-SEC-7 — Sesiones activas por dispositivo (revoke granular) `[ ]`

**Riesgo:** el `token_version++` actual es todo-o-nada. Si un Sa quiere expulsar
solo el portátil robado, hoy invalida también su móvil.

**Trabajo:**
- Tabla `sessions (id, user_id, jti, ua, ip, created_at, last_seen, revoked_at)`.
- Middleware emite `jti` (uuid v4) por JWT; persiste fila al login/2fa-verify.
- Endpoint `GET /api/me/sessions` y `DELETE /api/me/sessions/:id`.
- Mantener `token_version` como “kill switch” global; las sesiones granulares
  son additive.
- Migración `007_sessions.sql` + UI en `Profile`.

---

## Convenciones del roadmap

- Estado se actualiza con la fecha en la línea: `[x] 2026-07-12` al cerrar.
- Si una tarea cambia de alcance durante el trabajo, **no** se renumera: se
  edita la descripción y se deja nota de redirección al final de la sección.
- Commits deben referenciar el id: `security(2fa): ... (T-SEC-1)`.

## Historial resumido

| Fecha       | Tarea    | Acción                                                            |
|-------------|----------|-------------------------------------------------------------------|
| 2026-07-12  | T-SEC-1  | Implementado y verificado con tests. Tests 40/40 verde.          |
| 2026-07-12  | T-SEC-2  | Implementado y verificado con tests. Tests 44/44 verde.          |
