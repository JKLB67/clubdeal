'use client';

import { useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Cookies from 'js-cookie';
import { Project } from '@/types';
import { Trash2, Upload, Link as LinkIcon, GripVertical, Star } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_SLUG = process.env.NEXT_PUBLIC_DEFAULT_TENANT_SLUG ?? 'default';

interface Photo { id: string; url: string; orderIndex: number }

export function AdminPhotosTab({ project }: { project: Project }) {
  const qc = useQueryClient();
  const [photos, setPhotos] = useState<Photo[]>([...project.photos].sort((a, b) => a.orderIndex - b.orderIndex));
  const [urlInput, setUrlInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const dragIdx = useRef<number | null>(null);

  const token = Cookies.get('token');
  const headers = { Authorization: `Bearer ${token}`, 'x-tenant-slug': TENANT_SLUG };

  async function invalidate() {
    await qc.invalidateQueries({ queryKey: ['project', project.id] });
  }

  async function uploadFiles(files: FileList) {
    setUploading(true);
    setError('');
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch(`${API_URL}/api/projects/${project.id}/photos/upload`, {
          method: 'POST',
          headers,
          body: fd,
        });
        if (!res.ok) throw new Error((await res.json()).message ?? 'Erreur upload');
        const photo: Photo = await res.json();
        setPhotos((p) => [...p, photo]);
      }
      invalidate();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  }

  async function addUrl() {
    if (!urlInput.trim()) return;
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/projects/${project.id}/photos/url`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput.trim() }),
      });
      if (!res.ok) throw new Error((await res.json()).message ?? 'Erreur');
      const photo: Photo = await res.json();
      setPhotos((p) => [...p, photo]);
      setUrlInput('');
      invalidate();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function deletePhoto(id: string) {
    try {
      await fetch(`${API_URL}/api/projects/${project.id}/photos/${id}`, { method: 'DELETE', headers });
      setPhotos((p) => p.filter((ph) => ph.id !== id));
      invalidate();
    } catch (e: any) {
      setError(e.message);
    }
  }

  function onDragStart(idx: number) { dragIdx.current = idx; }
  function onDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    if (dragIdx.current === null || dragIdx.current === idx) return;
    const next = [...photos];
    const [moved] = next.splice(dragIdx.current, 1);
    next.splice(idx, 0, moved);
    dragIdx.current = idx;
    setPhotos(next);
  }
  async function onDragEnd() {
    dragIdx.current = null;
    try {
      await fetch(`${API_URL}/api/projects/${project.id}/photos/reorder`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: photos.map((p) => p.id) }),
      });
      invalidate();
    } catch (_) {}
  }

  return (
    <div className="max-w-2xl space-y-6">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>}

      {/* Upload fichier */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6">
        <h2 className="font-semibold text-gray-800 mb-4">Ajouter des photos</h2>

        <div className="flex gap-3 mb-4">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
          >
            <Upload className="w-4 h-4" />
            {uploading ? 'Upload en cours...' : 'Importer des photos'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => e.target.files?.length && uploadFiles(e.target.files)}
          />
        </div>

        <div className="flex gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addUrl()}
            placeholder="https://exemple.com/photo.jpg"
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={addUrl}
            className="flex items-center gap-2 border border-gray-200 hover:border-blue-400 text-gray-700 hover:text-blue-700 text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
          >
            <LinkIcon className="w-4 h-4" />
            Ajouter URL
          </button>
        </div>
      </div>

      {/* Grille photos */}
      {photos.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Photos ({photos.length})</h2>
            <p className="text-xs text-gray-400">Glisser-déposer pour réordonner</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {photos.map((photo, idx) => (
              <div
                key={photo.id}
                draggable
                onDragStart={() => onDragStart(idx)}
                onDragOver={(e) => onDragOver(e, idx)}
                onDragEnd={onDragEnd}
                className="relative group rounded-xl overflow-hidden border border-gray-100 cursor-grab active:cursor-grabbing"
              >
                <img src={photo.url} alt="" className="w-full h-36 object-cover" />
                {idx === 0 && (
                  <div className="absolute top-2 left-2 bg-yellow-400 text-yellow-900 text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Star className="w-3 h-3" /> Couverture
                  </div>
                )}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <button
                    onClick={() => deletePhoto(photo.id)}
                    className="bg-red-500 hover:bg-red-600 text-white rounded-lg p-1.5 shadow"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <GripVertical className="w-4 h-4 text-white drop-shadow" />
                </div>
                <div className="absolute bottom-2 right-2 bg-black/40 text-white text-xs rounded-full px-2 py-0.5">
                  {idx + 1}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {photos.length === 0 && (
        <div className="text-center py-12 bg-white border border-gray-100 border-dashed rounded-2xl text-gray-400">
          <p className="text-3xl mb-2">🖼️</p>
          <p className="text-sm">Aucune photo — importez un fichier ou ajoutez une URL</p>
        </div>
      )}
    </div>
  );
}
