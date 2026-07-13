/**
 * Módulo de Validaciones Universales (BaLog)
 * Sin dependencias externas. JavaScript Puro.
 * Diseñado para ser escalable: añade nuevas reglas aquí según crezca el proyecto.
 *
 * Convención: cada validador devuelve `true` si pasa, o un string con el mensaje
 * de error si falla. Esto permite usar `Validators.validate(data, schema)`
 * con cualquier mezcla de reglas.
 */

export const Validators = {
  // ==========================================
  //  REGLAS ACTIVAS (Usadas en Auth)
  // ==========================================

  /**
   * Valida nombre de usuario
   * Regla: 3 a 30 caracteres, letras (a-z, A-Z), números (0-9) y guiones bajos (_).
   */
  username: (text) => {
    if (text === undefined || text === null || text === '') {
      return 'El nombre de usuario es requerido.';
    }
    if (typeof text !== 'string') {
      return 'El nombre de usuario debe ser texto.';
    }
    if (text.length < 3 || text.length > 30) {
      return 'El usuario debe tener entre 3 y 30 caracteres.';
    }
    const regex = /^[a-zA-Z0-9_]+$/;
    if (!regex.test(text)) {
      return 'El usuario sólo puede tener letras, números y guion bajo.';
    }
    return true;
  },

  /**
   * Valida contraseña
   * Regla: mínimo 8 caracteres (recomendado OWASP).
   */
  password: (text) => {
    if (text === undefined || text === null || text === '') {
      return 'La contraseña es requerida.';
    }
    if (typeof text !== 'string') {
      return 'La contraseña debe ser texto.';
    }
    if (text.length < 8) {
      return 'La contraseña debe tener al menos 8 caracteres.';
    }
    if (text.length > 200) {
      return 'La contraseña es demasiado larga.';
    }
    return true;
  },

  // ==========================================
  //  REGLAS OPCIONALES
  // ==========================================

  /**
   * Valida formato de email estándar
   */
  email: (text) => {
    if (!text) return true;
    if (typeof text !== 'string') return 'Email inválido.';
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(text) || 'El formato del correo electrónico no es válido.';
  },

  /**
   * Valida URLs (http/https)
   */
  url: (text) => {
    if (!text) return true;
    try {
      const u = new URL(text);
      return (u.protocol === 'http:' || u.protocol === 'https:') || 'La URL debe usar http o https.';
    } catch {
      return 'La URL proporcionada no es válida.';
    }
  },

  /**
   * Longitud mínima genérica
   */
  minLength: (text, min) => {
    return (typeof text === 'string' && text.length >= min) || `Este campo requiere mínimo ${min} caracteres.`;
  },

  /**
   * Longitud máxima genérica
   */
  maxLength: (text, max) => {
    return (typeof text === 'string' && text.length <= max) || `Este campo no puede exceder ${max} caracteres.`;
  },

  /**
   * Sólo números
   */
  numeric: (text) => {
    return /^\d+$/.test(String(text)) || 'Este campo solo acepta números.';
  },

  // ==========================================
  //  HELPER DE VALIDACIÓN
  // ==========================================

  /**
   * Valida un objeto de datos contra un esquema.
   * @param {Object} data - Los datos a validar (ej: req.body)
   * @param {Object} schema - Mapa de campo -> función validadora
   * @returns {String|null} - Retorna el mensaje de error o null si todo OK.
   */
  validate: (data, schema) => {
    if (!data || typeof data !== 'object') {
      return 'Datos inválidos.';
    }
    for (const field in schema) {
      if (Object.prototype.hasOwnProperty.call(schema, field)) {
        const validator = schema[field];
        const result = validator(data[field]);
        if (result !== true) {
          return result;
        }
      }
    }
    return null;
  },
};