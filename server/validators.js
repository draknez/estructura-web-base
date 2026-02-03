/**
 * Módulo de Validaciones Universales (BaLog)
 * Sin dependencias externas. JavaScript Puro.
 * Diseñado para ser escalable: añade nuevas reglas aquí según crezca el proyecto.
 */

export const Validators = {
    // ==========================================
    //  REGLAS ACTIVAS (Usadas en Auth)
    // ==========================================
  
    /**
     * Valida nombre de usuario
     * Regla: 3 a 20 caracteres, letras (a-z), números (0-9) y guiones bajos (_).
     * Sin espacios ni caracteres especiales raros.
     */
    username: (text) => {
      if (!text) return "El nombre de usuario es requerido.";
      // Regex: Inicio(^), a-z, A-Z, 0-9, _, 3-20 chars, Fin($)
      const regex = /^[a-zA-Z0-9_]{3,20}$/;
      if (!regex.test(text)) {
        return "El usuario debe tener 3-20 caracteres (letras, números o guion bajo).";
      }
      return true;
    },
  
    /**
     * Valida contraseña
     * Regla actual: Mínimo 6 caracteres.
     * Futuro: Se puede descomentar la regex compleja para exigir Mayúsculas/Números.
     */
    password: (text) => {
      if (!text) return "La contraseña es requerida.";
      
      if (text.length < 6) {
        return "La contraseña debe tener al menos 6 caracteres.";
      }
      
      // Opcional: Regex fuerte (Mínimo 8, 1 letra, 1 número)
      // const strongRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
      // if (!strongRegex.test(text)) return "La contraseña es muy débil (requiere letras y números).";
  
      return true;
    },
  
    // ==========================================
    //  REGLAS STANDBY (Listas para usar)
    // ==========================================
  
    /**
     * Valida formato de email estándar
     */
    email: (text) => {
      if (!text) return true; // Si es opcional, dejar pasar null
      const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return regex.test(text) || "El formato del correo electrónico no es válido.";
    },
  
    /**
     * Valida URLs (http/https)
     */
    url: (text) => {
      if (!text) return true;
      try { 
        new URL(text); 
        return true; 
      } catch { 
        return "La URL proporcionada no es válida."; 
      }
    },
  
    /**
     * Valida longitud mínima genérica
     */
    minLength: (text, min) => {
      return (text && text.length >= min) || `Este campo requiere mínimo ${min} caracteres.`;
    },
  
    /**
     * Valida longitud máxima genérica
     */
    maxLength: (text, max) => {
      return (text && text.length <= max) || `Este campo no puede exceder ${max} caracteres.`;
    },
  
    /**
     * Valida que sea solo números
     */
    numeric: (text) => {
      const regex = /^\d+$/;
      return regex.test(text) || "Este campo solo acepta números.";
    },
  
    // ==========================================
    //  HELPER DE VALIDACIÓN
    // ==========================================
  
    /**
     * Valida un objeto de datos contra un esquema de validadores.
     * @param {Object} data - Los datos a validar (ej: req.body)
     * @param {Object} schema - Mapa de campo -> función validadora
     * @returns {String|null} - Retorna el mensaje de error o null si todo es válido.
     */
    validate: (data, schema) => {
      for (const field in schema) {
        if (Object.prototype.hasOwnProperty.call(schema, field)) {
          const value = data[field];
          const validator = schema[field];
          
          // Ejecutar validación
          const result = validator(value);
          
          // Si devuelve string, es un error
          if (result !== true) {
            return result; 
          }
        }
      }
      return null; // Éxito
    }
  };
