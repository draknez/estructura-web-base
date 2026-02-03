# 🚀 Estructura Web Base (BaLog)

**BaLog** es una plantilla Full Stack ligera, segura y modular diseñada para iniciar proyectos web rápidamente.

## 🛠️ Stack Tecnológico
- **Frontend:** React 18 + Vite + Tailwind CSS v4
- **Backend:** Node.js + Express
- **DB:** SQLite (`sql.js` / archivo local)
- **Seguridad:** JWT, Bcrypt, Rate Limiting, Validaciones Nativas

## 🔐 Características Clave
- **Roles Jerárquicos:** `Usr` (Usuario), `Adm` (Admin), `Sa` (SuperAdmin).
- **Lógica Génesis:** El primer usuario registrado se convierte automáticamente en SuperAdmin.
- **Seguridad Activa:** Protección contra fuerza bruta y sanitización de errores.
- **Validación Cero-Dependencias:** Módulo nativo extensible para validar datos.
- **UI Unificada:** Navbar responsiva, modo oscuro y sistema de badges por rol.

## ⚡ Inicio Rápido

1.  **Instalar:**
    ```bash
    npm install
    ```
2.  **Configurar `.env`:**
    ```env
    PORT=3000
    JWT_SECRET=cambia_esto_por_algo_seguro
    ```
3.  **Ejecutar:**
    ```bash
    npm run dev
    ```

## 🏗️ Estructura
```text
├── server/             # API, Validaciones y DB
├── src/
│   ├── components/     # UI (Navbar, Cards)
│   ├── context/        # Auth & Theme
│   ├── layouts/        # Base & Private
│   ├── pages/          # Vistas
│   └── utils/          # Helpers
└── .env                # Secretos
```
