'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Project } from '@/types';

interface ProjectFormProps {
  project?: Project;
}

export function ProjectForm({ project }: ProjectFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEdit = !!project;

  const [form, setForm] = useState({
    name:                    project?.name ?? '',
    address:                 project?.address ?? '',
    description:             project?.description ?? '',
    collectionGoal:          project ? String(Number(project.collectionGoal) / 100) : '',
    annualYield:             project?.annualYield ?? '',
    durationMonths:          project?.durationMonths?.toString() ?? '',
    precommercialisationRate:project?.precommercialisationRate ?? '',
    status:                  project?.status ?? 'DRAFT',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const payload = {
      ...form,
      collectionGoal: Math.round(parseFloat(form.collectionGoal) * 100),
      annualYield:    parseFloat(form.annualYield),
      durationMonths: parseInt(form.durationMonths),
      precommercialisationRate: form.precommercialisationRate ? parseFloat(form.precommercialisationRate) : undefined,
    };

    try {
      if (isEdit) {
        await api.patch(`/api/projects/${project.id}`, payload);
      } else {
        await api.post('/api/projects', payload);
      }
      queryClient.invalidateQueries({ queryKey: ['admin-projects'] });
      router.push('/admin/projects');
    } catch (err: any) {
      setError(err.message ?? 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
      )}

      <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-5">
        <h2 className="font-semibold text-gray-800">Informations générales</h2>

        <Field label="Nom du projet" required>
          <input
            value={form.name} onChange={(e) => set('name', e.target.value)}
            required placeholder="Résidence Les Jardins..."
            className={inputCls}
          />
        </Field>

        <Field label="Adresse" required>
          <input
            value={form.address} onChange={(e) => set('address', e.target.value)}
            required placeholder="12 rue de la Paix, 75001 Paris"
            className={inputCls}
          />
        </Field>

        <Field label="Description">
          <textarea
            value={form.description} onChange={(e) => set('description', e.target.value)}
            rows={4} placeholder="Description du projet..."
            className={inputCls}
          />
        </Field>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-5">
        <h2 className="font-semibold text-gray-800">Paramètres financiers</h2>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Objectif de collecte (€)" required>
            <input
              type="number" min={0} step={1000}
              value={form.collectionGoal} onChange={(e) => set('collectionGoal', e.target.value)}
              required placeholder="500000"
              className={inputCls}
            />
          </Field>

          <Field label="Rendement annuel (%)" required>
            <input
              type="number" min={0} max={100} step={0.1}
              value={form.annualYield} onChange={(e) => set('annualYield', e.target.value)}
              required placeholder="8.5"
              className={inputCls}
            />
          </Field>

          <Field label="Durée (mois)" required>
            <input
              type="number" min={1} max={120}
              value={form.durationMonths} onChange={(e) => set('durationMonths', e.target.value)}
              required placeholder="24"
              className={inputCls}
            />
          </Field>

          <Field label="Taux de précommercialisation (%)">
            <input
              type="number" min={0} max={100} step={1}
              value={form.precommercialisationRate} onChange={(e) => set('precommercialisationRate', e.target.value)}
              placeholder="65"
              className={inputCls}
            />
          </Field>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-6">
        <h2 className="font-semibold text-gray-800 mb-4">Statut</h2>
        <div className="flex gap-3 flex-wrap">
          {(['DRAFT', 'ACTIVE', 'FUNDED', 'CLOSED'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => set('status', s)}
              className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${
                form.status === s
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {s === 'DRAFT' ? 'Brouillon' : s === 'ACTIVE' ? 'Actif' : s === 'FUNDED' ? 'Financé' : 'Clôturé'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors"
        >
          {loading ? 'Enregistrement...' : isEdit ? 'Enregistrer' : 'Créer le projet'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-gray-500 hover:text-gray-700 px-4 py-2.5 rounded-xl hover:bg-gray-100 transition-colors text-sm font-medium"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';
