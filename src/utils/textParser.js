/**
 * textParser.js
 * Motor de Ingesta Inteligente y descomposición de texto a bloques estructurados.
 */

export const generateBlockId = () => {
  return `blk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
};

/**
 * Crea una instancia de bloque estándar.
 */
export const createBlock = (type = 'paragraph', data = {}) => {
  return {
    id: generateBlockId(),
    type,
    data: {
      content: '',
      ...data,
    },
  };
};

/**
 * Analiza una cadena de texto en bruto (ej. copiada y pegada de un documento)
 * y la fragmenta automáticamente en bloques semánticos listos para reordenar y enriquecer.
 *
 * @param {string} rawText Texto en bruto
 * @returns {Array} Lista de bloques estructurados
 */
export const parseTextToBlocks = (rawText = '') => {
  if (!rawText || !rawText.trim()) return [];

  // 1. Normalizar saltos de línea
  const clean = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();

  // 2. Dividir por saltos de línea dobles para agrupar párrafos/secciones
  const rawSections = clean.split(/\n\s*\n+/);
  const blocks = [];

  rawSections.forEach((section) => {
    const trimmed = section.trim();
    if (!trimmed) return;

    // Verificar si es un bloque de lista multilínea (empieza cada línea con viñeta o número)
    const lines = trimmed.split('\n').map(l => l.trim()).filter(Boolean);
    const isBulletList = lines.length > 0 && lines.every(l => /^[-*•]\s+/.test(l));
    const isNumberedList = lines.length > 0 && lines.every(l => /^\d+\.\s+/.test(l));

    if (isBulletList) {
      blocks.push(createBlock('list', {
        style: 'bullet',
        items: lines.map(l => l.replace(/^[-*•]\s+/, '')),
      }));
      return;
    }

    if (isNumberedList) {
      blocks.push(createBlock('list', {
        style: 'numbered',
        items: lines.map(l => l.replace(/^\d+\.\s+/, '')),
      }));
      return;
    }

    // Si es una sola sección pero tiene saltos internos, evaluar si la primera línea es un título
    if (lines.length > 1 && (/^#{1,3}\s+/.test(lines[0]) || (lines[0].length < 65 && !lines[0].endsWith('.') && lines[0] === lines[0].toUpperCase()))) {
      // Primera línea como encabezado
      const firstLine = lines[0];
      const rest = lines.slice(1).join('\n');

      if (/^#\s+/.test(firstLine)) {
        blocks.push(createBlock('heading', { content: firstLine.replace(/^#\s+/, ''), level: 1 }));
      } else if (/^##\s+/.test(firstLine)) {
        blocks.push(createBlock('heading', { content: firstLine.replace(/^##\s+/, ''), level: 2 }));
      } else if (/^###\s+/.test(firstLine)) {
        blocks.push(createBlock('heading', { content: firstLine.replace(/^###\s+/, ''), level: 3 }));
      } else {
        blocks.push(createBlock('heading', { content: firstLine, level: 2 }));
      }

      // El resto se procesa recursivamente
      const subBlocks = parseTextToBlocks(rest);
      blocks.push(...subBlocks);
      return;
    }

    // Detección de encabezados Markdown
    if (/^#\s+/.test(trimmed)) {
      blocks.push(createBlock('heading', {
        content: trimmed.replace(/^#\s+/, '').trim(),
        level: 1,
      }));
      return;
    }

    if (/^##\s+/.test(trimmed)) {
      blocks.push(createBlock('heading', {
        content: trimmed.replace(/^##\s+/, '').trim(),
        level: 2,
      }));
      return;
    }

    if (/^###\s+/.test(trimmed)) {
      blocks.push(createBlock('heading', {
        content: trimmed.replace(/^###\s+/, '').trim(),
        level: 3,
      }));
      return;
    }

    // Detección de citas (Blockquote)
    if (/^>\s+/.test(trimmed) || (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length < 240)) {
      blocks.push(createBlock('quote', {
        content: trimmed.replace(/^>\s*/, '').replace(/^"|"$/g, '').trim(),
      }));
      return;
    }

    // Detección de llamadas de atención (Callouts / Alerts)
    if (/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i.test(trimmed)) {
      const match = trimmed.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(.*)/i);
      blocks.push(createBlock('callout', {
        variant: match ? match[1].toLowerCase() : 'info',
        content: match ? match[2].trim() : trimmed,
      }));
      return;
    }

    if (/^(NOTA|AVISO|IMPORTANTE|TIP|ATENCIÓN):\s+/i.test(trimmed)) {
      const match = trimmed.match(/^(NOTA|AVISO|IMPORTANTE|TIP|ATENCIÓN):\s*(.*)/i);
      blocks.push(createBlock('callout', {
        variant: 'info',
        content: match ? match[2].trim() : trimmed,
      }));
      return;
    }

    // Detección de título implícito (muy corto, sin punto final, o todo mayúsculas)
    if (trimmed.length < 50 && !trimmed.endsWith('.') && !trimmed.includes('\n')) {
      if (trimmed === trimmed.toUpperCase() && trimmed.length > 3) {
        blocks.push(createBlock('heading', { content: trimmed, level: 2 }));
        return;
      }
    }

    // Párrafo convencional
    blocks.push(createBlock('paragraph', {
      content: trimmed,
    }));
  });

  return blocks;
};
