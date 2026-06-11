'use client';

import { useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Cookies from 'js-cookie';
import { Project } from '@/types';
import { Trash2, Upload, GripVertical, Pencil, Check, X, FileText, Download } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TENANT_SLUG = process.env.NEXT_PUBLIC_DEFAULT_TENANT_SLUG ?? 'default';

interface Doc { id: string; name: string; label?: string | null; url: string; orderIndex: number }

export function AdminDocumentsTab({ project }: { project: Project }) {
  const qc = useQueryClient();
  const [docs, setDocs] = useState<Doc[]>([...(project.documents ?? [])].sort((a, b) => a.orderIndex - b.orderIndex));
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
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
        const res = await fetch(`${API_URL}/api/projects/${project.id}/documents/upload`, {
          method: 'POST', headers, body: fd,
        });
        if (!res.ok) throw new Error((await res.json()).message ?? 'Erreur upload');
        const doc: Doc = await res.json();
        setDocs((d) => [...d, doc]);
      }
      invalidate();
    } catch (e: any) { setError(e.message); }
    finally { setUploading(false); }
  }

  async function saveLabel(id: string) {
    try {
      const res = await fetch(`${API_URL}/api/projects/${project.id}/documents/${id}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: editLabel }),
      });
      if (!res.ok) throw new Error('Erreur');
      setDocs((d) => d.map((doc) => doc.id === id ? { ...doc, label: editLabel } : doc));
      setEditingId(null);
      invalidate();
    } catch (e: any) { setError(e.message); }
  }

  async function deleteDoc(id: string) {
    try {
      await fetch(`${API_URL}/api/projects/${project.id}/documents/${id}`, { method: 'DELETE', headers });
      setDocs((d) => d.filter((doc) => doc.id !== id));
      invalidate();
    } catch (e: any) { setError(e.message); }
  }

  function onDragStart(idx: number) { dragIdx.current = idx; }
  function onDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    if (dragIdx.current === null || dragIdx.current === idx) return;
    const next = [...docs];
    const [moved] = next.splice(dragIdx.current, 1);
    next.splice(idx, 0, moved);
    dragIdx.current = idx;
    setDocs(next);
  }
  async function onDragEnd() {
    dragIdx.current = null;
    await fetch(`${API_URL}/api/projects/${project.id}/documents/reorder`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedIds: docs.map((d) => d.id) }),
    });
    invalidate();
  }

  return (
    <div className="max-w-2xl space-y-6">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>}

      <div className="bg-white border border-gray-100 rounded-2xl p-6">
        <h2 className="font-semibold text-gray-800 mb-4">Ajouter des documents PDF</h2>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
        >
          <Upload className="w-4 h-4" />
          {uploading ? 'Upload en cours...' : 'Importer des PDF'}
        </button>
        <input ref={fileRef} type="file" accept=".pdf,application/pdf" multiple className="hidden"
          onChange={(e) => e.target.files?.length && uploadFiles(e.target.files)} />
        <p className="text-xs text-gray-400 mt-2">Formats acceptés : PDF. Sélection multiple possible.</p>
      </div>

      {docs.length > 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Documents ({docs.length})</h2>
            <p className="text-xs text-gray-400">Glisser-déposer pour réordonner</p>
          </div>
          <ul className="divide-y divide-gray-50">
            {docs.map((doc, idx) => (
              <li
                key={doc.id}
                draggable
                onDragStart={() => onDragStart(idx)}
                onDragOver={(e) => onDragOver(e, idx)}
                onDragEnd={onDragEnd}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-grab active:cursor-grabbing"
              >
                <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
                <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  {editingId === doc.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveLabel(doc.id); if (e.key === 'Escape') setEditingId(null); }}
                        autoFocus
                        className="flex-1 border border-blue-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button onClick={() => saveLabel(doc.id)} className="text-green-600 hover:text-green-700"><Check className="w-4 h-4" /></button>
                      <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <p className="text-sm font-medium text-gray-800 truncate">{doc.label ?? doc.name}</p>
                  )}
                  <p className="text-xs text-gray-400 truncate">{doc.name}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <a href={doc.url} target="_blank" rel="noopener noreferrer"
                    className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
                    <Download className="w-3.5 h-3.5" />
                  </a>
                  <button onClick={() => { setEditingId(doc.id); setEditLabel(doc.label ?? doc.name); }}
                    className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => deleteDoc(doc.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="text-center py-12 bg-white border border-dashed border-gray-200 rounded-2xl text-gray-400">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Aucun document — importez vos PDF</p>
        </div>
      )}
    </div>
  );
}
