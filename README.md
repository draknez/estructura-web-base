# 🚀 Estructura Web Base (BaLog)

**BaLog** es una plantilla Full Stack profesional diseñada para construir aplicaciones web seguras y escalables con gestión organizacional.

## 🛠️ Stack Tecnológico
- **Frontend:** React 18 + Vite + Tailwind CSS v4
- **Backend:** Node.js + Express
- **DB:** SQLite (Archivo local / Portátil)
- **Seguridad:** JWT, Bcrypt, Rate Limiting, Validaciones Nativas

## 🔐 Características Clave
- **Organigrama:** Gestión de Grupos y Subgrupos (hasta 5 niveles).
- **Roles Jerárquicos:** `Usr` (Usuario), `Adm` (Admin), `Sa` (SuperAdmin).
- **Lógica Génesis:** El primer registro se convierte en SuperAdmin.
- **Autodestrucción:** Capacidad de reinicio de fábrica para el SuperAdmin.
- **UI Profesional:** Tablas responsivas con sticky columns, modo oscuro y animaciones.

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
│   ├── components/     # UI (Navbar, TableDiv, Cards)
│   ├── context/        # Auth & Theme
│   ├── layouts/        # Base & Private
│   ├── pages/          # Vistas (Dashboard, Admin, Grupos)
│   └── utils/          # Helpers
└── .env                # Secretos
```
