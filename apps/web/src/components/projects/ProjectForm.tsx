'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Project } from '@/types';
import { MapPin, Plus, X } from 'lucide-react';

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
    minInvestment:           project?.minInvestment ? String(Number(project.minInvestment) / 100) : '',
    openingDate:             project?.openingDate ? project.openingDate.slice(0, 10) : '',
    closingDate:             project?.closingDate ? project.closingDate.slice(0, 10) : '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState<{ label: string; value: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [cadastralParcels, setCadastralParcels] = useState<string[]>(project ? [] : []);
  const [newParcel, setNewParcel] = useState('');
  const addressDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function fetchAddressSuggestions(q: string) {
    if (q.length < 3) { setAddressSuggestions([]); return; }
    try {
      const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&limit=5`);
      const data = await res.json();
      setAddressSuggestions(
        (data.features ?? []).map((f: any) => ({ label: f.properties.label, value: f.properties.label }))
      );
      setShowSuggestions(true);
    } catch { /* silently fail */ }
  }

  function handleAddressChange(val: string) {
    set('address', val);
    if (addressDebounce.current) clearTimeout(addressDebounce.current);
    addressDebounce.current = setTimeout(() => fetchAddressSuggestions(val), 300);
  }

  function selectAddress(label: string) {
    set('address', label);
    setShowSuggestions(false);
    setAddressSuggestions([]);
  }

  function addParcel() {
    const v = newParcel.trim();
    if (v && !cadastralParcels.includes(v)) setCadastralParcels((p) => [...p, v]);
    setNewParcel('');
  }

  function removeParcel(idx: number) {
    setCadastralParcels((p) => p.filter((_, i) => i !== idx));
  }

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
      minInvestment:  form.minInvestment ? parseFloat(form.minInvestment) : null,
      openingDate:    form.openingDate || null,
      closingDate:    form.closingDate || null,
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
          <div className="relative">
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                value={form.address}
                onChange={(e) => handleAddressChange(e.target.value)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                onFocus={() => addressSuggestions.length > 0 && setShowSuggestions(true)}
                required
                placeholder="12 rue de la Paix, 75001 Paris"
                className={`${inputCls} pl-9`}
              />
            </div>
            {showSuggestions && addressSuggestions.length > 0 && (
              <ul className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden text-sm">
                {addressSuggestions.map((s) => (
                  <li key={s.value}>
                    <button type="button" onMouseDown={() => selectAddress(s.label)}
                      className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors">
                      {s.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Field>

        <Field label="Parcelles cadastrales">
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                value={newParcel} onChange={(e) => setNewParcel(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addParcel())}
                placeholder="Ex : AB 0042"
                className={inputCls}
              />
              <button type="button" onClick={addParcel}
                className="flex items-center gap-1 bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium px-3 py-2 rounded-xl flex-shrink-0">
                <Plus className="w-4 h-4" /> Ajouter
              </button>
            </div>
            {cadastralParcels.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {cadastralParcels.map((p, i) => (
                  <span key={i} className="flex items-center gap-1 bg-gray-100 text-gray-700 text-xs font-mono px-2.5 py-1 rounded-lg">
                    {p}
                    <button type="button" onClick={() => removeParcel(i)} className="hover:text-red-600">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
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

          <Field label="Date d'ouverture de la collecte">
            <input type="date" value={form.openingDate} onChange={(e) => set('openingDate', e.target.value)} className={inputCls} />
          </Field>

          <Field label="Ticket minimum (€)">
            <input
              type="number" min={0} step={500}
              value={form.minInvestment} onChange={(e) => set('minInvestment', e.target.value)}
              placeholder="10000"
              className={inputCls}
            />
          </Field>

          <Field label="Date de clôture de la collecte">
            <input
              type="date"
              value={form.closingDate} onChange={(e) => set('closingDate', e.target.value)}
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
              {s === 'DRAFT' ? 'Brouillon' : s === 'ACTIVE' ? 'En collecte' : s === 'FUNDED' ? 'Financé' : 'Clôturé'}
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
