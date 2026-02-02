# 🚀 Estructura Web Base (BaLog)

**BaLog** es una plantilla de aplicación Full Stack (MERN-ish) diseñada para servir como punto de partida robusto, seguro y moderno para proyectos web. No es solo un esqueleto, es un sistema funcional con autenticación avanzada, seguridad reforzada y una UI pulida.

## 🛠️ Stack Tecnológico

- **Frontend:**
  - **React 18:** Biblioteca principal para la interfaz.
  - **Vite:** Herramienta de construcción ultrarrápida.
  - **Tailwind CSS v4:** Estilizado moderno mediante utilidades.
  - **React Router 6:** Gestión de navegación y rutas protegidas.
- **Backend:**
  - **Node.js + Express:** Servidor de API REST.
  - **SQLite (sql.js):** Base de datos relacional con persistencia local en archivo (Portabilidad total).
  - **JWT (JSON Web Tokens):** Autenticación de sesiones segura.
  - **Bcrypt:** Encriptación de contraseñas de nivel bancario.

## 🔐 Seguridad Avanzada (Hardening)

- **🛡️ Anti-Fuerza Bruta:** Implementación de `express-rate-limit`. El login se bloquea automáticamente tras 5 intentos fallidos en 15 minutos.
- **🙈 Sanitización de Errores:** El servidor nunca expone detalles técnicos (stack traces) al cliente en caso de fallo, previniendo ataques de reconocimiento.
- **🔑 Gestión de Secretos:** Uso estricto de variables de entorno (`.env`) para claves criptográficas.
- **👮 RBAC Jerárquico:** Sistema de control de acceso basado en roles multinivel.

## 👑 Sistema de Roles y Permisos

El sistema implementa tres niveles de autoridad con lógica visual distintiva:

1.  **🔵 Usuario (Usr):** 
    -   Acceso básico al sistema y su dashboard.
    -   Identificador visual: Azul Cielo (Sky).
2.  **🟠 Administrador (Adm):**
    -   Gestión de usuarios (Banear/Desbanear, Asignar roles de Admin).
    -   Identificador visual: Naranja (Orange).
3.  **🟡 SuperAdmin (Sa) - "El Dueño":**
    -   **Poder Absoluto:** Puede eliminar usuarios permanentemente de la base de datos.
    -   **Sigilo:** No aparece en las listas de usuarios de los administradores normales.
    -   Identificador visual: Dorado Brillante (Gold Gradient).

### 🚀 Lógica "Génesis" (Primer Usuario)
Al iniciar el sistema con una base de datos vacía, **el primer usuario que se registre** recibirá automáticamente todos los roles (`Usr` + `Adm` + `Sa`), convirtiéndose en el SuperAdmin propietario del sistema. Los siguientes registros serán usuarios estándar.

## 🎨 Características UI/UX

- **Navbar Unificado:** Navegación coherente y responsiva con menú hamburguesa para móviles.
- **Indicadores de Estado:** Puntos de colores en la interfaz que indican los roles activos del usuario.
- **Modo Oscuro:** Soporte nativo y persistente para temas claro/oscuro.
- **Diseño Atomic:** Componentes reutilizables (`Button`, `Card`, `Badge`) organizados profesionalmente.

## ⚡ Instalación y Uso

1.  **Instalar dependencias:**
    ```bash
    npm install
    ```

2.  **Configurar entorno:**
    Crea un archivo `.env` en la raíz (basado en el ejemplo) con:
    ```env
    PORT=3000
    JWT_SECRET=tu_clave_super_secreta_aqui
    ```

3.  **Iniciar Desarrollo:**
    ```bash
    npm run dev
    ```
    Esto iniciará tanto el servidor backend (puerto 3000) como el frontend (Vite).

## 🏗️ Estructura del Proyecto

```text
├── server/             # API Backend y persistencia SQLite
├── src/
│   ├── components/     # UI Reutilizable (Navbar, Cards, Buttons)
│   ├── context/        # Estado Global (Auth, Theme)
│   ├── layouts/        # Estructuras Maestras (Base vs Private)
│   ├── pages/          # Vistas (Home, Login, Dashboard, AdminPanel)
│   └── utils/          # Helpers (cn, validaciones)
└── .env                # Configuración de Secretos (No commitear)
```