import React from 'react';
import { motion } from 'motion/react';
import { 
  FileText, 
  Download, 
  Music, 
  Video, 
  Info, 
  AlertTriangle, 
  CheckCircle2, 
  Lightbulb, 
  Quote as QuoteIcon,
  Sparkles
} from 'lucide-react';

/**
 * Componentes de Bloque individuales
 */

const HeadingBlock = ({ data }) => {
  const level = data.level || 2;
  const content = data.content || '';

  if (level === 1) {
    return (
      <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-gray-900 dark:text-white pt-4 pb-2">
        {content}
      </h1>
    );
  }
  if (level === 2) {
    return (
      <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-800 dark:text-gray-100 pt-3 pb-1 border-b border-gray-100 dark:border-gray-800/80">
        {content}
      </h2>
    );
  }
  return (
    <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-800 dark:text-gray-200 pt-2">
      {content}
    </h3>
  );
};

const ParagraphBlock = ({ data }) => {
  return (
    <p className="text-base sm:text-lg leading-relaxed text-gray-700 dark:text-gray-300 font-normal whitespace-pre-line">
      {data.content}
    </p>
  );
};

const QuoteBlock = ({ data }) => {
  return (
    <blockquote className="relative p-5 my-4 rounded-2xl bg-teal-500/5 dark:bg-teal-500/10 border-l-4 border-teal-500 text-gray-800 dark:text-gray-200 shadow-sm">
      <QuoteIcon className="w-6 h-6 text-teal-500/40 mb-2" />
      <p className="text-lg italic font-medium leading-relaxed">
        "{data.content}"
      </p>
    </blockquote>
  );
};

const CalloutBlock = ({ data }) => {
  const variant = data.variant || 'info';
  
  let colors = {
    bg: 'bg-sky-50 dark:bg-sky-950/30 border-sky-500/30 text-sky-900 dark:text-sky-200',
    icon: <Info className="w-5 h-5 text-sky-500 shrink-0" />
  };

  if (variant === 'tip') {
    colors = {
      bg: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500/30 text-emerald-900 dark:text-emerald-200',
      icon: <Lightbulb className="w-5 h-5 text-emerald-500 shrink-0" />
    };
  } else if (variant === 'warning' || variant === 'caution') {
    colors = {
      bg: 'bg-amber-50 dark:bg-amber-950/30 border-amber-500/30 text-amber-900 dark:text-amber-200',
      icon: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
    };
  } else if (variant === 'important') {
    colors = {
      bg: 'bg-teal-50 dark:bg-teal-950/30 border-teal-500/30 text-teal-900 dark:text-teal-200',
      icon: <CheckCircle2 className="w-5 h-5 text-teal-500 shrink-0" />
    };
  }

  return (
    <div className={`flex items-start gap-3.5 p-4 rounded-2xl border ${colors.bg} shadow-sm my-3`}>
      {colors.icon}
      <div className="text-sm font-medium leading-relaxed">
        {data.content}
      </div>
    </div>
  );
};

const ListBlock = ({ data }) => {
  const items = data.items || [];
  const isNumbered = data.style === 'numbered';

  if (isNumbered) {
    return (
      <ol className="list-decimal list-inside space-y-2 text-gray-700 dark:text-gray-300 pl-2">
        {items.map((item, idx) => (
          <li key={idx} className="leading-relaxed font-medium">
            {item}
          </li>
        ))}
      </ol>
    );
  }

  return (
    <ul className="space-y-2 text-gray-700 dark:text-gray-300 pl-2">
      {items.map((item, idx) => (
        <li key={idx} className="flex items-start gap-2.5 leading-relaxed font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-2.5 shrink-0" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
};

const ImageBlock = ({ data }) => {
  return (
    <figure className="my-6 space-y-2">
      <div className={`relative overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-900 border border-gray-200/60 dark:border-gray-800 shadow-md ${
        data.isCover ? 'ring-2 ring-teal-500/50 shadow-teal-500/10' : ''
      }`}>
        {data.isCover && (
          <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-600/90 text-white backdrop-blur-md text-[10px] font-black uppercase tracking-wider shadow-lg">
            <Sparkles className="w-3 h-3" /> Portada
          </div>
        )}
        <img 
          src={data.url} 
          alt={data.caption || data.filename || 'Imagen de la publicación'} 
          className="w-full h-auto max-h-[600px] object-cover rounded-2xl transition-transform duration-300 hover:scale-[1.01]"
          loading="lazy"
        />
      </div>
      {data.caption && (
        <figcaption className="text-center text-xs text-gray-500 dark:text-gray-400 font-medium italic">
          {data.caption}
        </figcaption>
      )}
    </figure>
  );
};

const AudioBlock = ({ data }) => {
  return (
    <div className="my-5 p-4 rounded-2xl bg-gradient-to-r from-teal-500/10 via-emerald-500/5 to-transparent border border-teal-500/20 shadow-sm flex flex-col gap-3">
      <div className="flex items-center gap-2.5 text-teal-700 dark:text-teal-400">
        <Music className="w-5 h-5" />
        <span className="text-xs font-bold uppercase tracking-wider">
          {data.caption || data.filename || 'Archivo de Audio'}
        </span>
      </div>
      <audio controls src={data.url} className="w-full h-10 rounded-lg outline-none" />
    </div>
  );
};

const VideoBlock = ({ data }) => {
  return (
    <figure className="my-6 space-y-2">
      <div className="overflow-hidden rounded-2xl bg-black border border-gray-200/60 dark:border-gray-800 shadow-lg">
        <video controls src={data.url} className="w-full max-h-[550px] rounded-2xl">
          Tu navegador no soporta reproducción de video.
        </video>
      </div>
      {data.caption && (
        <figcaption className="text-center text-xs text-gray-500 dark:text-gray-400 font-medium italic">
          {data.caption}
        </figcaption>
      )}
    </figure>
  );
};

const FileBlock = ({ data }) => {
  const formatSize = (bytes) => {
    if (!bytes) return '';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="my-4 p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between gap-4">
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="w-11 h-11 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
          <FileText className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">
            {data.filename || data.name || 'Documento adjunto'}
          </p>
          {data.size && (
            <p className="text-[11px] font-mono text-gray-400">
              {formatSize(data.size)}
            </p>
          )}
        </div>
      </div>

      <a
        href={data.url}
        download={data.filename}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-sm transition-transform active:scale-95 shrink-0"
      >
        <Download className="w-4 h-4" />
        <span className="hidden sm:inline">Descargar</span>
      </a>
    </div>
  );
};

/**
 * Diccionario central de bloques (Registry Pattern)
 */
export const BLOCK_COMPONENTS = {
  heading: HeadingBlock,
  paragraph: ParagraphBlock,
  quote: QuoteBlock,
  callout: CalloutBlock,
  list: ListBlock,
  image: ImageBlock,
  audio: AudioBlock,
  video: VideoBlock,
  file: FileBlock,
};

/**
 * Componente principal PostRenderer
 */
export const PostRenderer = ({ blocks = [], className = '' }) => {
  if (!blocks || blocks.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 text-sm">
        Esta publicación no contiene bloques de contenido aún.
      </div>
    );
  }

  return (
    <article className={`space-y-6 max-w-3xl mx-auto ${className}`}>
      {blocks.map((block) => {
        const Component = BLOCK_COMPONENTS[block.type];
        if (!Component) return null;

        return (
          <div key={block.id} className="block-render-wrapper">
            <Component data={block.data} />
          </div>
        );
      })}
    </article>
  );
};

export default PostRenderer;
