import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { 
  GripVertical, 
  Sparkles, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Upload, 
  Link as LinkIcon, 
  Eye, 
  Save, 
  FileText, 
  Image as ImageIcon, 
  Music, 
  Video, 
  ListPlus, 
  Quote, 
  AlertCircle, 
  Zap, 
  CheckCircle2, 
  Globe, 
  ChevronRight,
  ExternalLink,
  Loader2,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import PostRenderer from '../../components/blocks/PostRenderer';
import { parseTextToBlocks, createBlock } from '../../utils/textParser';
import { Link } from 'react-router-dom';

const ContentStudioPage = () => {
  const { user, token } = useAuth();
  const { addToast } = useToast();

  // Estados principales
  const [activeTab, setActiveTab] = useState('editor'); // 'editor' | 'preview' | 'posts'
  const [postId, setPostId] = useState(null);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [summary, setSummary] = useState('');
  const [status, setStatus] = useState('draft'); // 'draft' | 'published'
  const [coverUrl, setCoverUrl] = useState('');
  const [blocks, setBlocks] = useState([]);
  const [saving, setSaving] = useState(false);

  // Lista de publicaciones existentes
  const [existingPosts, setExistingPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  // Modales
  const [isSmartIngestOpen, setIsSmartIngestOpen] = useState(false);
  const [rawTextToIngest, setRawTextToIngest] = useState('');
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [mediaMode, setMediaMode] = useState('upload'); // 'upload' | 'url'
  const [externalUrl, setExternalUrl] = useState('');
  const [externalMediaType, setExternalMediaType] = useState('image');
  const [externalCaption, setExternalCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const canPublish = user?.roles?.includes('Sa') || user?.roles?.includes('adm');

  // Cargar lista de posts
  const fetchPosts = async () => {
    try {
      setLoadingPosts(true);
      const res = await fetch('/api/posts', {
        headers: { 'x-access-token': token }
      });
      if (res.ok) {
        const data = await res.json();
        setExistingPosts(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPosts(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'posts') {
      fetchPosts();
    }
  }, [activeTab]);

  // Manejo de Ingesta Inteligente de Texto
  const handleApplySmartIngest = () => {
    if (!rawTextToIngest.trim()) {
      addToast('Ingresa o pega un texto para descomponer', 'error');
      return;
    }

    const newBlocks = parseTextToBlocks(rawTextToIngest);
    if (newBlocks.length === 0) {
      addToast('No se identificaron bloques válidos', 'error');
      return;
    }

    // Si el post no tiene título y el primer bloque es un título, asignarlo automáticamente
    if (!title && newBlocks[0]?.type === 'heading') {
      setTitle(newBlocks[0].data.content);
    }

    setBlocks(prev => [...prev, ...newBlocks]);
    setIsSmartIngestOpen(false);
    setRawTextToIngest('');
    addToast(`¡Se descompuso el texto en ${newBlocks.length} bloques interactivos!`, 'success');
  };

  // Subida de archivos multimedia
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const reader = new FileReader();

      reader.onload = async () => {
        const base64Data = reader.result;
        let detectedType = 'file';
        if (file.type.startsWith('image/')) detectedType = 'image';
        else if (file.type.startsWith('audio/')) detectedType = 'audio';
        else if (file.type.startsWith('video/')) detectedType = 'video';

        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-access-token': token
          },
          body: JSON.stringify({
            filename: file.name,
            data: base64Data,
            type: detectedType
          })
        });

        const data = await res.json();
        if (res.ok) {
          const newBlock = createBlock(detectedType, {
            url: data.url,
            filename: file.name,
            size: file.size,
            caption: '',
            isCover: blocks.length === 0 && detectedType === 'image'
          });

          if (newBlock.data.isCover) {
            setCoverUrl(data.url);
          }

          setBlocks(prev => [...prev, newBlock]);
          setIsMediaModalOpen(false);
          addToast(`Elemento ${file.name} subido correctamente`, 'success');
        } else {
          addToast(data.error || 'Error al subir archivo', 'error');
        }
        setUploading(false);
      };

      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      setUploading(false);
      addToast('Error al leer el archivo', 'error');
    }
  };

  // Añadir medio por URL externa
  const handleAddExternalMedia = () => {
    if (!externalUrl.trim()) {
      addToast('Ingresa una URL válida', 'error');
      return;
    }

    const newBlock = createBlock(externalMediaType, {
      url: externalUrl.trim(),
      caption: externalCaption.trim(),
      filename: externalUrl.split('/').pop()?.split('?')[0] || 'recurso-externo',
      isCover: blocks.length === 0 && externalMediaType === 'image'
    });

    if (newBlock.data.isCover) {
      setCoverUrl(externalUrl.trim());
    }

    setBlocks(prev => [...prev, newBlock]);
    setIsMediaModalOpen(false);
    setExternalUrl('');
    setExternalCaption('');
    addToast('Medio externo agregado a la secuencia', 'success');
  };

  // Marcado de Portada / Elemento Principal
  const handleToggleCover = (blockId) => {
    setBlocks(prev => {
      const target = prev.find(b => b.id === blockId);
      const isCurrentlyCover = target?.data?.isCover;

      return prev.map(b => {
        if (b.id === blockId) {
          const nextState = !isCurrentlyCover;
          if (nextState) setCoverUrl(b.data.url || '');
          else setCoverUrl('');
          return { ...b, data: { ...b.data, isCover: nextState } };
        }
        // Desmarcar otros bloques como portada
        return { ...b, data: { ...b.data, isCover: false } };
      });
    });
  };

  // Reordenar mediante botones accesibles
  const moveBlock = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= blocks.length) return;

    setBlocks(prev => {
      const copy = [...prev];
      const [moved] = copy.splice(index, 1);
      copy.splice(targetIndex, 0, moved);
      return copy;
    });
  };

  // Eliminar un bloque
  const removeBlock = (blockId) => {
    setBlocks(prev => {
      const filtered = prev.filter(b => b.id !== blockId);
      const removed = prev.find(b => b.id === blockId);
      if (removed?.data?.isCover) {
        setCoverUrl('');
      }
      return filtered;
    });
  };

  // Actualizar datos de un bloque in-place
  const updateBlockData = (blockId, updates) => {
    setBlocks(prev => prev.map(b => {
      if (b.id === blockId) {
        return { ...b, data: { ...b.data, ...updates } };
      }
      return b;
    }));
  };

  // Guardar publicación
  const handleSavePost = async () => {
    if (!title.trim()) {
      addToast('El título de la publicación es obligatorio', 'error');
      return;
    }

    if (blocks.length === 0) {
      addToast('Agrega al menos un bloque de contenido', 'error');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        title: title.trim(),
        slug: slug.trim() || undefined,
        summary: summary.trim(),
        cover_url: coverUrl,
        status,
        blocks
      };

      const url = postId ? `/api/posts/${postId}` : '/api/posts';
      const method = postId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-access-token': token
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        addToast(
          postId ? 'Publicación actualizada correctamente' : '¡Publicación creada exitosamente!', 
          'success'
        );
        if (data.post?.id) setPostId(data.post.id);
        if (data.post?.slug) setSlug(data.post.slug);
      } else {
        addToast(data.error || 'Error al guardar la publicación', 'error');
      }
    } catch (err) {
      console.error(err);
      addToast('Error de red al conectar con el servidor', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Cargar post para editar
  const handleLoadPostToEdit = async (postItem) => {
    try {
      const res = await fetch(`/api/posts/${postItem.id}`, {
        headers: { 'x-access-token': token }
      });
      if (res.ok) {
        const fullPost = await res.json();
        setPostId(fullPost.id);
        setTitle(fullPost.title || '');
        setSlug(fullPost.slug || '');
        setSummary(fullPost.summary || '');
        setStatus(fullPost.status || 'draft');
        setCoverUrl(fullPost.cover_url || '');
        setBlocks(fullPost.blocks || []);
        setActiveTab('editor');
        addToast(`Post "${fullPost.title}" cargado en el editor`, 'info');
      }
    } catch (err) {
      console.error(err);
      addToast('Error al cargar la publicación', 'error');
    }
  };

  // Reiniciar editor para nuevo post
  const handleNewPost = () => {
    setPostId(null);
    setTitle('');
    setSlug('');
    setSummary('');
    setStatus('draft');
    setCoverUrl('');
    setBlocks([]);
    setActiveTab('editor');
  };

  // Eliminar post
  const handleDeletePost = async (id) => {
    if (!confirm('¿Estás seguro de eliminar esta publicación permanentemente?')) return;

    try {
      const res = await fetch(`/api/posts/${id}`, {
        method: 'DELETE',
        headers: { 'x-access-token': token }
      });
      if (res.ok) {
        addToast('Publicación eliminada', 'success');
        fetchPosts();
        if (postId === id) handleNewPost();
      }
    } catch (err) {
      console.error(err);
      addToast('Error al eliminar', 'error');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 select-none">
      
      {/* Encabezado del Content Studio */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <Zap className="w-5 h-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
              Content Studio
            </h1>
          </div>
          <p className="text-xs text-gray-400 font-medium uppercase tracking-widest mt-1">
            Gestor y Diseñador Visual de Publicaciones
          </p>
        </div>

        {/* Pestañas de Navegación */}
        <div className="flex items-center p-1 rounded-2xl bg-gray-100 dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 text-xs font-bold">
          <button
            onClick={() => setActiveTab('editor')}
            className={`px-4 py-2 rounded-xl transition-all ${
              activeTab === 'editor' 
                ? 'bg-white dark:bg-gray-800 text-teal-600 dark:text-teal-400 shadow-sm' 
                : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            Editor Visual
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-4 py-2 rounded-xl transition-all ${
              activeTab === 'preview' 
                ? 'bg-white dark:bg-gray-800 text-teal-600 dark:text-teal-400 shadow-sm' 
                : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            Vista Previa ({blocks.length})
          </button>
          <button
            onClick={() => setActiveTab('posts')}
            className={`px-4 py-2 rounded-xl transition-all ${
              activeTab === 'posts' 
                ? 'bg-white dark:bg-gray-800 text-teal-600 dark:text-teal-400 shadow-sm' 
                : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            Mis Publicaciones
          </button>
        </div>
      </div>

      {/* PESTAÑA 1: EDITOR VISUAL */}
      {activeTab === 'editor' && (
        <div className="space-y-6">
          
          {/* Metadatos Principales del Post */}
          <div className="p-6 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-xs font-black uppercase tracking-widest text-teal-600 dark:text-teal-400">
                {postId ? `Editando Post ID #${postId}` : 'Nueva Publicación'}
              </span>

              <div className="flex items-center gap-2">
                {postId && (
                  <Button variant="ghost" size="sm" onClick={handleNewPost}>
                    Limpiar / Nuevo
                  </Button>
                )}
                
                {/* Selector de Estado */}
                <div className="flex items-center p-1 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs font-bold">
                  <button
                    onClick={() => setStatus('draft')}
                    className={`px-3 py-1 rounded-lg transition-colors ${
                      status === 'draft' ? 'bg-amber-500 text-white shadow-sm' : 'text-gray-400'
                    }`}
                  >
                    Borrador
                  </button>
                  <button
                    onClick={() => canPublish ? setStatus('published') : addToast('Solo Admin/Sa pueden publicar directamente', 'info')}
                    className={`px-3 py-1 rounded-lg transition-colors ${
                      status === 'published' ? 'bg-emerald-500 text-white shadow-sm' : 'text-gray-400'
                    }`}
                  >
                    Publicado
                  </button>
                </div>

                {/* Botón Guardar */}
                <Button onClick={handleSavePost} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Guardar
                </Button>
              </div>
            </div>

            {/* Inputs de Título, Slug y Resumen */}
            <div className="space-y-3">
              <Input
                label="Título de la publicación"
                placeholder="Ej: Nuevos Avances Médicos 2026"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  label="Slug URL (Opcional, se autogenera)"
                  placeholder="avances-medicos-2026"
                  value={slug}
                  onChange={e => setSlug(e.target.value)}
                />
                <Input
                  label="Resumen o Subtítulo corto"
                  placeholder="Una breve descripción para redes y búsquedas..."
                  value={summary}
                  onChange={e => setSummary(e.target.value)}
                />
              </div>

              {coverUrl && (
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-xs font-bold text-teal-800 dark:text-teal-300">
                  <Sparkles className="w-4 h-4 text-teal-500 shrink-0" />
                  <span className="truncate">Portada Principal asignada: {coverUrl}</span>
                  <button 
                    onClick={() => setCoverUrl('')} 
                    className="ml-auto text-gray-400 hover:text-red-500"
                    title="Quitar portada"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Barra de Herramientas de Creación de Bloques */}
          <div className="p-4 rounded-3xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200/80 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              
              {/* Botón Destacado: Smart Ingest */}
              <button
                onClick={() => setIsSmartIngestOpen(true)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 text-white text-xs font-bold shadow-md shadow-teal-500/20 hover:scale-105 active:scale-95 transition-all"
              >
                <Zap className="w-4 h-4" />
                <span>⚡ Pegar Texto y Descomponer</span>
              </button>

              {/* Botón: Añadir Multimedia */}
              <button
                onClick={() => setIsMediaModalOpen(true)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-xs font-bold hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors shadow-sm"
              >
                <ImageIcon className="w-4 h-4 text-teal-500" />
                <span>+ Multimedia</span>
              </button>
            </div>

            {/* Inserción Rápida de Bloques Específicos */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setBlocks(prev => [...prev, createBlock('paragraph')])}
                className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-xs font-semibold hover:border-teal-500 transition-colors"
                title="Añadir Párrafo"
              >
                + Párrafo
              </button>
              <button
                onClick={() => setBlocks(prev => [...prev, createBlock('heading', { level: 2 })])}
                className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-xs font-semibold hover:border-teal-500 transition-colors"
                title="Añadir Subtítulo"
              >
                + Título
              </button>
              <button
                onClick={() => setBlocks(prev => [...prev, createBlock('quote')])}
                className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-xs font-semibold hover:border-teal-500 transition-colors"
                title="Añadir Cita"
              >
                + Cita
              </button>
              <button
                onClick={() => setBlocks(prev => [...prev, createBlock('callout')])}
                className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-xs font-semibold hover:border-teal-500 transition-colors"
                title="Añadir Aviso Contextual"
              >
                + Aviso
              </button>
            </div>
          </div>

          {/* Área Interactiva Drag & Drop de Bloques */}
          {blocks.length === 0 ? (
            <div className="text-center py-16 px-4 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto">
                <FileText className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-gray-800 dark:text-gray-200">
                  La publicación aún no tiene bloques
                </h3>
                <p className="text-xs text-gray-400 max-w-sm mx-auto">
                  Usa el botón <b>⚡ Pegar Texto y Descomponer</b> para importar un artículo completo o agrega bloques manualmente arriba.
                </p>
              </div>
            </div>
          ) : (
            <Reorder.Group 
              axis="y" 
              values={blocks} 
              onReorder={setBlocks}
              className="space-y-3"
            >
              {blocks.map((block, index) => {
                const isMedia = ['image', 'video', 'audio', 'file'].includes(block.type);

                return (
                  <Reorder.Item
                    key={block.id}
                    value={block}
                    className={`group relative p-4 rounded-2xl bg-white dark:bg-gray-900 border transition-all shadow-sm ${
                      block.data?.isCover 
                        ? 'border-teal-500 shadow-teal-500/10 dark:border-teal-500' 
                        : 'border-gray-200/90 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                    }`}
                  >
                    {/* Barra de cabecera del bloque */}
                    <div className="flex items-center justify-between gap-3 mb-3 pb-2.5 border-b border-gray-100 dark:border-gray-800/80">
                      
                      {/* Manilla Drag & Drop y tipo */}
                      <div className="flex items-center gap-2">
                        <div 
                          className="cursor-grab active:cursor-grabbing p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                          title="Arrastrar para mover posición"
                        >
                          <GripVertical className="w-4 h-4" />
                        </div>

                        <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                          #{index + 1} {block.type}
                        </span>

                        {block.data?.isCover && (
                          <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500 text-white shadow-sm">
                            <Sparkles className="w-3 h-3" /> Portada
                          </span>
                        )}
                      </div>

                      {/* Controles del Bloque */}
                      <div className="flex items-center gap-1">
                        
                        {/* Botón Portada (Solo para Medios) */}
                        {isMedia && (
                          <button
                            onClick={() => handleToggleCover(block.id)}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                              block.data?.isCover
                                ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 border border-teal-500/30'
                                : 'text-gray-400 hover:text-teal-600 hover:bg-gray-100 dark:hover:bg-gray-800'
                            }`}
                            title="Marcar como elemento de portada principal"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Portada</span>
                          </button>
                        )}

                        {/* Mover Arriba / Abajo (Accesibilidad) */}
                        <button
                          onClick={() => moveBlock(index, -1)}
                          disabled={index === 0}
                          className="p-1 rounded-lg text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:hover:text-gray-400"
                          title="Subir posición"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => moveBlock(index, 1)}
                          disabled={index === blocks.length - 1}
                          className="p-1 rounded-lg text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:hover:text-gray-400"
                          title="Bajar posición"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>

                        {/* Eliminar Bloque */}
                        <button
                          onClick={() => removeBlock(block.id)}
                          className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors ml-1"
                          title="Eliminar bloque"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Contenido editable según el tipo */}
                    {block.type === 'heading' && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase text-gray-400">Nivel:</span>
                          {[1, 2, 3].map(lvl => (
                            <button
                              key={lvl}
                              onClick={() => updateBlockData(block.id, { level: lvl })}
                              className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                (block.data.level || 2) === lvl
                                  ? 'bg-teal-600 text-white'
                                  : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                              }`}
                            >
                              H{lvl}
                            </button>
                          ))}
                        </div>
                        <input
                          type="text"
                          value={block.data.content || ''}
                          onChange={e => updateBlockData(block.id, { content: e.target.value })}
                          placeholder="Texto del encabezado..."
                          className="w-full text-lg font-bold bg-transparent border-b border-gray-200 dark:border-gray-800 focus:border-teal-500 outline-none pb-1"
                        />
                      </div>
                    )}

                    {block.type === 'paragraph' && (
                      <textarea
                        rows={3}
                        value={block.data.content || ''}
                        onChange={e => updateBlockData(block.id, { content: e.target.value })}
                        placeholder="Escribe el párrafo aquí..."
                        className="w-full text-sm leading-relaxed bg-transparent border-0 focus:ring-0 outline-none resize-y p-0 text-gray-800 dark:text-gray-200"
                      />
                    )}

                    {block.type === 'quote' && (
                      <div className="pl-3 border-l-2 border-teal-500">
                        <textarea
                          rows={2}
                          value={block.data.content || ''}
                          onChange={e => updateBlockData(block.id, { content: e.target.value })}
                          placeholder="Texto de la cita..."
                          className="w-full text-sm italic bg-transparent border-0 focus:ring-0 outline-none resize-y p-0 text-gray-800 dark:text-gray-200"
                        />
                      </div>
                    )}

                    {block.type === 'callout' && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                          {['info', 'tip', 'warning', 'important'].map(v => (
                            <button
                              key={v}
                              onClick={() => updateBlockData(block.id, { variant: v })}
                              className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                (block.data.variant || 'info') === v
                                  ? 'bg-teal-600 text-white'
                                  : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                              }`}
                            >
                              {v}
                            </button>
                          ))}
                        </div>
                        <textarea
                          rows={2}
                          value={block.data.content || ''}
                          onChange={e => updateBlockData(block.id, { content: e.target.value })}
                          placeholder="Contenido del aviso..."
                          className="w-full text-xs bg-transparent border-0 focus:ring-0 outline-none resize-y p-0 text-gray-800 dark:text-gray-200"
                        />
                      </div>
                    )}

                    {block.type === 'list' && (
                      <div className="space-y-2">
                        <textarea
                          rows={3}
                          value={(block.data.items || []).join('\n')}
                          onChange={e => updateBlockData(block.id, { items: e.target.value.split('\n') })}
                          placeholder="Un elemento por línea..."
                          className="w-full text-xs font-mono bg-transparent border-0 focus:ring-0 outline-none resize-y p-0 text-gray-800 dark:text-gray-200"
                        />
                        <span className="text-[10px] text-gray-400">Cada salto de línea será un punto de la lista.</span>
                      </div>
                    )}

                    {block.type === 'image' && (
                      <div className="flex flex-col sm:flex-row items-start gap-4">
                        <img 
                          src={block.data.url} 
                          alt="preview" 
                          className="w-24 h-24 sm:w-32 sm:h-24 object-cover rounded-xl bg-gray-100 dark:bg-gray-800 shrink-0" 
                        />
                        <div className="flex-1 w-full space-y-2">
                          <input
                            type="text"
                            value={block.data.caption || ''}
                            onChange={e => updateBlockData(block.id, { caption: e.target.value })}
                            placeholder="Pie de foto / descripción..."
                            className="w-full text-xs bg-gray-50 dark:bg-gray-800/60 p-2 rounded-xl outline-none"
                          />
                          <p className="text-[10px] font-mono text-gray-400 truncate">{block.data.url}</p>
                        </div>
                      </div>
                    )}

                    {block.type === 'audio' && (
                      <div className="space-y-2">
                        <audio controls src={block.data.url} className="w-full h-8" />
                        <input
                          type="text"
                          value={block.data.caption || ''}
                          onChange={e => updateBlockData(block.id, { caption: e.target.value })}
                          placeholder="Título del audio..."
                          className="w-full text-xs bg-gray-50 dark:bg-gray-800/60 p-2 rounded-xl outline-none"
                        />
                      </div>
                    )}

                    {block.type === 'video' && (
                      <div className="space-y-2">
                        <video src={block.data.url} controls className="w-full max-h-48 rounded-xl bg-black" />
                        <input
                          type="text"
                          value={block.data.caption || ''}
                          onChange={e => updateBlockData(block.id, { caption: e.target.value })}
                          placeholder="Descripción del video..."
                          className="w-full text-xs bg-gray-50 dark:bg-gray-800/60 p-2 rounded-xl outline-none"
                        />
                      </div>
                    )}

                    {block.type === 'file' && (
                      <div className="flex items-center gap-3 p-2 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                        <FileText className="w-6 h-6 text-teal-500" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate">{block.data.filename}</p>
                          <p className="text-[10px] text-gray-400">{block.data.url}</p>
                        </div>
                      </div>
                    )}

                  </Reorder.Item>
                );
              })}
            </Reorder.Group>
          )}

        </div>
      )}

      {/* PESTAÑA 2: VISTA PREVIA EN VIVO */}
      {activeTab === 'preview' && (
        <div className="p-6 sm:p-10 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-sm space-y-6">
          
          {/* Hero de Portada si existe */}
          {coverUrl && (
            <div className="relative w-full h-64 sm:h-80 rounded-2xl overflow-hidden shadow-md">
              <img src={coverUrl} alt="Portada" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-6">
                <span className="px-3 py-1 rounded-full bg-teal-500/90 text-white text-[10px] font-black uppercase tracking-wider backdrop-blur-md">
                  Portada Destacada
                </span>
              </div>
            </div>
          )}

          {/* Encabezado del Post */}
          <div className="border-b border-gray-100 dark:border-gray-800 pb-6 space-y-2">
            <h1 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tight">
              {title || 'Título de ejemplo'}
            </h1>
            {summary && (
              <p className="text-base text-gray-500 dark:text-gray-400 font-medium">
                {summary}
              </p>
            )}
            <div className="flex items-center gap-3 text-xs text-gray-400 pt-2 font-mono">
              <span>Por {user?.username}</span>
              <span>•</span>
              <span className="uppercase">{status === 'published' ? '🟢 Publicado' : '🟡 Borrador'}</span>
            </div>
          </div>

          {/* Renderizado de Bloques */}
          <PostRenderer blocks={blocks} />
        </div>
      )}

      {/* PESTAÑA 3: MIS PUBLICACIONES */}
      {activeTab === 'posts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Publicaciones Guardadas
            </h2>
            <Button size="sm" onClick={handleNewPost} className="gap-2">
              <Plus className="w-4 h-4" /> Crear Nueva
            </Button>
          </div>

          {loadingPosts ? (
            <div className="text-center py-12 text-gray-400">Cargando publicaciones...</div>
          ) : existingPosts.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No hay publicaciones registradas aún.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {existingPosts.map(p => (
                <div 
                  key={p.id}
                  className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-sm flex flex-col justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        p.status === 'published' 
                          ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30' 
                          : 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                      }`}>
                        {p.status === 'published' ? 'Publicado' : 'Borrador'}
                      </span>
                      <span className="text-[10px] font-mono text-gray-400">
                        {new Date(p.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                      {p.title}
                    </h3>

                    {p.summary && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                        {p.summary}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800/80">
                    <Link
                      to={`/posts/${p.slug}`}
                      className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
                      target="_blank"
                    >
                      <Globe className="w-3.5 h-3.5" /> Ver en Vivo
                    </Link>

                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="secondary" onClick={() => handleLoadPostToEdit(p)}>
                        Editar
                      </Button>
                      <button
                        onClick={() => handleDeletePost(p.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: SMART INGEST (PEGAR Y DESCOMPONER) */}
      <Modal 
        isOpen={isSmartIngestOpen} 
        onClose={() => setIsSmartIngestOpen(false)}
        title="⚡ Pegar y Descomponer Texto Automáticamente"
      >
        <div className="space-y-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            Pega aquí el contenido completo de tu informe, artículo o documento. Nuestro motor analizará la estructura y lo dividirá en títulos, citas, listas y párrafos individuales para que puedas reordenarlos o intercalarles fotos fácilmente.
          </p>

          <textarea
            rows={10}
            value={rawTextToIngest}
            onChange={e => setRawTextToIngest(e.target.value)}
            placeholder="# Gran Título&#10;&#10;Este es el primer párrafo con la información principal...&#10;&#10;> Una cita o frase destacada&#10;&#10;- Punto 1&#10;- Punto 2"
            className="w-full text-xs font-mono p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 outline-none focus:border-teal-500"
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setIsSmartIngestOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleApplySmartIngest} className="gap-2">
              <Zap className="w-4 h-4" /> Descomponer en Bloques
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 2: AÑADIR MULTIMEDIA */}
      <Modal 
        isOpen={isMediaModalOpen} 
        onClose={() => setIsMediaModalOpen(false)}
        title="Añadir Elemento Multimedia"
      >
        <div className="space-y-5">
          {/* Selector de Modo */}
          <div className="flex p-1 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs font-bold">
            <button
              onClick={() => setMediaMode('upload')}
              className={`flex-1 py-1.5 rounded-lg text-center transition-colors ${
                mediaMode === 'upload' ? 'bg-white dark:bg-gray-900 text-teal-600 dark:text-teal-400 shadow-sm' : 'text-gray-500'
              }`}
            >
              Subir Archivo Local
            </button>
            <button
              onClick={() => setMediaMode('url')}
              className={`flex-1 py-1.5 rounded-lg text-center transition-colors ${
                mediaMode === 'url' ? 'bg-white dark:bg-gray-900 text-teal-600 dark:text-teal-400 shadow-sm' : 'text-gray-500'
              }`}
            >
              Enlace / URL Directa
            </button>
          </div>

          {mediaMode === 'upload' ? (
            <div className="space-y-4">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer p-8 rounded-2xl border-2 border-dashed border-teal-500/40 hover:border-teal-500 bg-teal-500/5 flex flex-col items-center justify-center text-center transition-all hover:scale-[1.01]"
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  className="hidden" 
                  accept="image/*,audio/*,video/*,.pdf,.doc,.docx"
                />
                <Upload className="w-8 h-8 text-teal-500 mb-2" />
                <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
                  {uploading ? 'Procesando archivo...' : 'Haz clic o arrastra un archivo aquí'}
                </p>
                <p className="text-[11px] text-gray-400 mt-1">
                  Soporta imágenes (PNG, JPG, WEBP), audio (MP3), video (MP4) y documentos (PDF).
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {['image', 'video', 'audio', 'file'].map(t => (
                  <button
                    key={t}
                    onClick={() => setExternalMediaType(t)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold uppercase ${
                      externalMediaType === t 
                        ? 'bg-teal-600 text-white' 
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <Input
                label="URL directa del recurso"
                placeholder="https://ejemplo.com/foto.jpg"
                value={externalUrl}
                onChange={e => setExternalUrl(e.target.value)}
              />

              <Input
                label="Descripción / Pie de recurso (Opcional)"
                placeholder="Fotografía del evento..."
                value={externalCaption}
                onChange={e => setExternalCaption(e.target.value)}
              />

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => setIsMediaModalOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddExternalMedia}>
                  Agregar a la secuencia
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

    </div>
  );
};

export default ContentStudioPage;
