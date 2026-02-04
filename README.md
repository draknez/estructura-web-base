# 🚀 Estructura Web Base (BaLog)

**BaLog** es una plantilla Full Stack (MERN-ish) diseñada para iniciar proyectos web rápidamente con una arquitectura sólida y segura.

## 🛠️ Stack Tecnológico
- **Frontend:** React 18 + Vite + Tailwind CSS v4
- **Backend:** Node.js + Express
- **DB:** SQLite (Archivo local / Portátil)
- **Seguridad:** JWT, Bcrypt, Rate Limiting, Validaciones Nativas

## 🔐 Características Clave
- **Roles Jerárquicos:** `Usr` (Usuario), `Adm` (Admin), `Sa` (SuperAdmin).
- **Lógica Génesis:** El primer registro se convierte en SuperAdmin.
- **Autodestrucción:** Capacidad de reinicio de fábrica (Reset Total) para el SuperAdmin.
- **UI Profesional:** Tabla de datos avanzada (Sticky columns, Flexbox), modo oscuro y diseño responsive unificado.
- **Validación:** Módulo nativo extensible sin dependencias extra.

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
│   ├── pages/          # Vistas (Dashboard, AdminPanel)
│   └── utils/          # Helpers
└── .env                # Secretos
```