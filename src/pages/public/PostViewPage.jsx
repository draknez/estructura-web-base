import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Clock, User, Calendar, Edit3, Globe, Sparkles } from 'lucide-react';
import PostRenderer from '../../components/blocks/PostRenderer';
import { useAuth } from '../../context/AuthContext';

const PostViewPage = () => {
  const { slug } = useParams();
  const { user } = useAuth();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [publishedPosts, setPublishedPosts] = useState([]);

  const canEdit = user && (user.roles?.includes('Sa') || user.roles?.includes('adm') || user.roles?.includes('enc'));

  useEffect(() => {
    const fetchPost = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!slug) {
          // Listado público de publicaciones
          const res = await fetch('/api/posts');
          if (res.ok) {
            const data = await res.json();
            setPublishedPosts(data);
          }
          setLoading(false);
          return;
        }

        const res = await fetch(`/api/posts/${slug}`);
        if (!res.ok) {
          if (res.status === 404) throw new Error('Publicación no encontrada');
          if (res.status === 403) throw new Error('Esta publicación está en borrador o es privada');
          throw new Error('Error al cargar la publicación');
        }

        const data = await res.json();
        setPost(data);
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
          Cargando publicación...
        </p>
      </div>
    );
  }

  // Vista de lista si no hay slug específico
  if (!slug) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 select-none">
        <div className="text-center space-y-2">
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tight">
            Publicaciones
          </h1>
          <p className="text-xs text-gray-400 font-mono uppercase tracking-widest">
            Artículos, Noticias y Contenido Oficial
          </p>
        </div>

        {publishedPosts.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">
            No hay publicaciones disponibles en este momento.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {publishedPosts.map(p => (
              <Link 
                key={p.id}
                to={`/posts/${p.slug}`}
                className="group flex flex-col justify-between overflow-hidden rounded-3xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-sm hover:shadow-xl hover:border-teal-500/50 transition-all duration-300"
              >
                {p.cover_url && (
                  <div className="h-48 w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
                    <img 
                      src={p.cover_url} 
                      alt={p.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                  </div>
                )}
                <div className="p-6 space-y-2.5 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-mono text-gray-400">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(p.created_at).toLocaleDateString()}</span>
                      {p.author_name && <span>• Por {p.author_name}</span>}
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                      {p.title}
                    </h2>
                    {p.summary && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                        {p.summary}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 flex items-center gap-1 text-xs font-bold text-teal-600 dark:text-teal-400">
                    <span>Leer artículo</span>
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Vista de error
  if (error || !post) {
    return (
      <div className="max-w-md mx-auto text-center py-20 space-y-4">
        <h2 className="text-2xl font-black text-gray-900 dark:text-white">
          {error || 'No se encontró la publicación'}
        </h2>
        <p className="text-xs text-gray-400">
          Es posible que el enlace haya cambiado o la publicación ya no esté disponible públicamente.
        </p>
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al Inicio
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 select-none">
      
      {/* Botón Volver y Acciones de Edición */}
      <div className="flex items-center justify-between gap-4">
        <Link
          to="/posts"
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Todas las Publicaciones
        </Link>

        {canEdit && (
          <Link
            to="/studio"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-300 hover:text-teal-600 transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" /> Editar en Content Studio
          </Link>
        )}
      </div>

      {/* Portada Hero si está asignada */}
      {post.cover_url && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative w-full h-72 sm:h-96 rounded-3xl overflow-hidden shadow-xl border border-gray-200/50 dark:border-gray-800"
        >
          <img 
            src={post.cover_url} 
            alt={post.title} 
            className="w-full h-full object-cover" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950/80 via-gray-950/20 to-transparent" />
        </motion.div>
      )}

      {/* Encabezado del Post */}
      <header className="space-y-4 border-b border-gray-100 dark:border-gray-800/80 pb-6">
        <h1 className="text-3xl sm:text-5xl font-black text-gray-900 dark:text-white tracking-tight leading-tight">
          {post.title}
        </h1>

        {post.summary && (
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 font-medium leading-relaxed">
            {post.summary}
          </p>
        )}

        {/* Metadatos: Autor y Fecha */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-gray-400 pt-2">
          {post.author_name && (
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-teal-500" />
              <span>Por <b className="text-gray-700 dark:text-gray-300">{post.author_name}</b></span>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>{new Date(post.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>Lectura aprox. {Math.max(1, Math.ceil((post.blocks?.length || 1) * 0.4))} min</span>
          </div>
        </div>
      </header>

      {/* Cuerpo del Contenido (Renderizado de Bloques) */}
      <main className="py-2">
        <PostRenderer blocks={post.blocks} />
      </main>

    </div>
  );
};

export default PostViewPage;
