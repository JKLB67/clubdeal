'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatEuros, progressPercent } from '@/lib/utils';
import { Project } from '@/types';
import { RefreshCw, PencilLine, CheckCircle } from 'lucide-react';

export function AdminCollectedTab({ project }: { project: Project }) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<'auto' | 'manual'>('manual');
  const [manualEuros, setManualEuros] = useState(String(Number(project.collectedAmount) / 100));
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const progress = progressPercent(project.collectedAmount, project.collectionGoal);
  const collectedEuros = Number(project.collectedAmount) / 100;
  const goalEuros = Number(project.collectionGoal) / 100;

  function invalidate() {
    qc.invalidateQueries({ queryKey: ['project', project.id] });
    qc.invalidateQueries({ queryKey: ['admin-projects'] });
  }

  async function saveManual() {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const euros = parseFloat(manualEuros);
      if (isNaN(euros) || euros < 0) throw new Error('Montant invalide');
      await api.patch(`/api/projects/${project.id}/collected`, { amountEuros: euros });
      setSuccess('Montant collecté mis à jour');
      invalidate();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function syncFromBank() {
    setError('');
    setSuccess('');
    setSyncing(true);
    try {
      await api.post(`/api/projects/${project.id}/sync-balance`, {});
      setSuccess('Solde synchronisé depuis l\'API bancaire');
      invalidate();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSyncing(false);
    }
  }

  const fmt = (n: number) =>
    n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

  return (
    <div className="max-w-2xl space-y-6">
      {error   && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3 flex items-center gap-2"><CheckCircle className="w-4 h-4" />{success}</div>}

      {/* Jauge actuelle */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6">
        <h2 className="font-semibold text-gray-800 mb-4">État de la collecte</h2>
        <div className="flex justify-between items-end mb-2">
          <div>
            <p className="text-3xl font-bold text-gray-900">{fmt(collectedEuros)}</p>
            <p className="text-sm text-gray-500 mt-0.5">collectés sur {fmt(goalEuros)}</p>
          </div>
          <p className="text-2xl font-bold text-blue-600">{progress}%</p>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1.5">
          <span>{fmt(collectedEuros)}</span>
          <span>Objectif : {fmt(goalEuros)}</span>
        </div>
      </div>

      {/* Mode */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6">
        <h2 className="font-semibold text-gray-800 mb-4">Mode de mise à jour</h2>
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setMode('auto')}
            className={`flex-1 py-3 rounded-xl border text-sm font-medium transition-colors ${
              mode === 'auto'
                ? 'border-blue-600 bg-blue-50 text-blue-700'
                : 'border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            🏦 Automatique (API bancaire)
          </button>
          <button
            onClick={() => setMode('manual')}
            className={`flex-1 py-3 rounded-xl border text-sm font-medium transition-colors ${
              mode === 'manual'
                ? 'border-blue-600 bg-blue-50 text-blue-700'
                : 'border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            ✏️ Manuel
          </button>
        </div>

        {mode === 'auto' && (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">
              Interroge l'API bancaire pour récupérer le solde reçu sur l'IBAN virtuel{' '}
              {project.virtualIban
                ? <strong className="font-mono text-gray-700">{project.virtualIban}</strong>
                : <span className="text-orange-600">(aucun IBAN configuré)</span>
              }.
            </p>
            <button
              onClick={syncFromBank}
              disabled={syncing || !project.virtualIban}
              className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Synchronisation...' : 'Synchroniser maintenant'}
            </button>
            {!project.virtualIban && (
              <p className="text-xs text-orange-600">Configurez un IBAN virtuel dans l'onglet Général pour activer cette fonctionnalité.</p>
            )}
          </div>
        )}

        {mode === 'manual' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Saisissez directement le montant total collecté. Cette valeur remplace le calcul automatique.
            </p>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Montant collecté (€)
                </label>
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={manualEuros}
                  onChange={(e) => setManualEuros(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={saveManual}
                disabled={loading}
                className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm"
              >
                <PencilLine className="w-4 h-4" />
                {loading ? 'Enregistrement...' : 'Appliquer'}
              </button>
            </div>
            <p className="text-xs text-gray-400">
              Les virements validés individuellement dans l'onglet Investisseurs ajoutent automatiquement au montant collecté.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
