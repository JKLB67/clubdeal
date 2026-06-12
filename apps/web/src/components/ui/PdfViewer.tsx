'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { X, Loader2, AlertCircle, ZoomIn, ZoomOut, Printer, Loader } from 'lucide-react';

interface PdfViewerProps {
  /** API path pour le viewer (peut retourner HTML ou PDF) */
  path: string;
  /** Chemin séparé pour télécharger le PDF binaire. Utilise path par défaut. */
  downloadPath?: string;
  filename?: string;
  /** true = HTML contract with font-size controls, false = binary PDF */
  isHtml?: boolean;
  /** hide download and print buttons (signing flow) */
  hideActions?: boolean;
  onClose: () => void;
}

const FONT_STEPS = [9, 10, 11, 12, 13, 14, 16, 18];
const DEFAULT_STEP = 2; // index → 11pt

export function PdfViewer({ path, downloadPath, filename = 'document', isHtml = false, hideActions = false, onClose }: PdfViewerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [fontStep, setFontStep] = useState(DEFAULT_STEP);
  const [flattening, setFlattening] = useState(false);

  useEffect(() => {
    let active = true;
    let objUrl: string;
    api.blobUrl(path)
      .then((u) => {
        if (!active) { URL.revokeObjectURL(u); return; }
        objUrl = u;
        setBlobUrl(u);
      })
      .catch((e) => { if (active) setError(e.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => {
      active = false;
      if (objUrl) URL.revokeObjectURL(objUrl);
    };
  }, [path]);

  // Apply font size to HTML content iframe
  useEffect(() => {
    if (!isHtml || !blobUrl || !iframeRef.current) return;
    const apply = () => {
      try {
        const doc = iframeRef.current?.contentDocument;
        if (doc?.body) {
          doc.documentElement.style.setProperty('--fs', `${FONT_STEPS[fontStep]}pt`);
          doc.body.style.fontSize = `${FONT_STEPS[fontStep]}pt`;
        }
      } catch { /* cross-origin fallback */ }
    };
    const iframe = iframeRef.current;
    iframe.addEventListener('load', apply);
    apply();
    return () => iframe.removeEventListener('load', apply);
  }, [fontStep, blobUrl, isHtml]);

  async function handleFlattenDownload() {
    setFlattening(true);
    try {
      const target = downloadPath ?? (isHtml ? `${path}/flatten` : path);
      await api.download(target, `${filename.replace(/\.pdf$/i, '')}.pdf`);
    } catch (e: any) {
      alert(`Erreur : ${e.message}`);
    } finally {
      setFlattening(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-900/80 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center gap-3 bg-white border-b border-gray-200 px-4 py-2.5 flex-shrink-0">
        <p className="font-semibold text-gray-900 text-sm truncate flex-1 max-w-xs">{filename}</p>

        <div className="flex items-center gap-1 ml-auto">
          {/* Font controls — only for HTML contracts */}
          {isHtml && (
            <div className="flex items-center gap-1 border border-gray-200 rounded-lg px-1 py-0.5 mr-2">
              <button
                onClick={() => setFontStep((s) => Math.max(0, s - 1))}
                disabled={fontStep === 0}
                title="Réduire la police"
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-40 transition-colors"
              >
                <ZoomOut className="w-4 h-4 text-gray-600" />
              </button>
              <span className="text-xs text-gray-500 w-8 text-center font-mono">{FONT_STEPS[fontStep]}pt</span>
              <button
                onClick={() => setFontStep((s) => Math.min(FONT_STEPS.length - 1, s + 1))}
                disabled={fontStep === FONT_STEPS.length - 1}
                title="Agrandir la police"
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-40 transition-colors"
              >
                <ZoomIn className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          )}

          {/* PDF sécurisé (aplati, incopiable) */}
          {!hideActions && (
            <button
              onClick={handleFlattenDownload}
              disabled={flattening}
              title="Télécharger en PDF sécurisé (non copiable)"
              className={`flex items-center gap-1.5 text-sm border rounded-lg px-3 py-1.5 transition-colors ${
                flattening
                  ? 'text-blue-400 border-blue-200 bg-blue-50 animate-pulse cursor-wait'
                  : 'text-gray-600 hover:text-blue-700 border-gray-200 hover:border-blue-300'
              }`}
            >
              {flattening ? <Loader className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
              <span className="hidden sm:inline">{flattening ? 'Génération...' : 'PDF'}</span>
            </button>
          )}

          <button
            onClick={onClose}
            title="Fermer"
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-900 ml-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex items-center justify-center">
        {loading && (
          <div className="flex flex-col items-center gap-3 text-white">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p className="text-sm">Chargement du document...</p>
          </div>
        )}
        {error && (
          <div className="flex flex-col items-center gap-3 text-white">
            <AlertCircle className="w-8 h-8 text-red-400" />
            <p className="text-sm text-red-300">{error}</p>
            <button onClick={onClose} className="text-sm underline">Fermer</button>
          </div>
        )}
        {blobUrl && (
          <iframe
            ref={iframeRef}
            src={blobUrl}
            className="w-full h-full bg-white"
            title={filename}
            style={{ border: 'none' }}
          />
        )}
      </div>
    </div>
  );
}
