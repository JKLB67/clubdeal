'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Building2, Save } from 'lucide-react';

interface TenantEntity {
  id?: string;
  name: string;
  legalForm: string;
  capital: number;
  address: string;
  rcsCity: string;
  rcsNumber: string;
  representative: string;
  representativeTitle: string;
  email: string;
  signatureCity: string;
}

const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';

export default function EntitySettingsPage() {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const { data, isLoading } = useQuery<TenantEntity>({
    queryKey: ['tenant-entity'],
    queryFn: () => api.get('/api/tenant/entity'),
  });

  const [form, setForm] = useState<TenantEntity | null>(null);
  const entity = form ?? data ?? {
    name: '', legalForm: 'SAS', capital: 1000, address: '', rcsCity: '',
    rcsNumber: '', representative: '', representativeTitle: 'Directeur Général',
    email: '', signatureCity: 'Strasbourg',
  };

  function set(field: keyof TenantEntity, value: string | number) {
    setForm((f) => ({ ...(f ?? entity), [field]: value } as TenantEntity));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    try {
      await api.patch('/api/tenant/entity', form ?? entity);
      qc.invalidateQueries({ queryKey: ['tenant-entity'] });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) return <p className="text-gray-400">Chargement...</p>;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
          <Building2 className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Profil de l'émetteur</h1>
          <p className="text-sm text-gray-500">Informations de votre société, pré-remplies dans les contrats</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-4">
          <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">Identité juridique</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Dénomination sociale</label>
              <input value={entity.name} onChange={(e) => set('name', e.target.value)} placeholder="JKLB" className={inputCls} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Forme juridique</label>
              <select value={entity.legalForm} onChange={(e) => set('legalForm', e.target.value)} className={inputCls}>
                {['SAS', 'SASU', 'SARL', 'SA', 'SCI', 'EURL', 'GIE'].map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Capital social (€)</label>
              <input type="number" value={entity.capital} onChange={(e) => set('capital', Number(e.target.value))} placeholder="1000" className={inputCls} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Siège social (adresse complète)</label>
            <input value={entity.address} onChange={(e) => set('address', e.target.value)} placeholder="17 RUE DE ROSHEIM - 67000 - Strasbourg" className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Ville du RCS</label>
              <input value={entity.rcsCity} onChange={(e) => set('rcsCity', e.target.value)} placeholder="Strasbourg" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Numéro RCS / SIREN</label>
              <input value={entity.rcsNumber} onChange={(e) => set('rcsNumber', e.target.value)} placeholder="949 692 750" className={inputCls} />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-4">
          <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">Représentant légal</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom et prénom</label>
              <input value={entity.representative} onChange={(e) => set('representative', e.target.value)} placeholder="Julien KAISER" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Qualité</label>
              <select value={entity.representativeTitle} onChange={(e) => set('representativeTitle', e.target.value)} className={inputCls}>
                {['Directeur Général', 'Président', 'Gérant', 'Directeur Général Délégué'].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email de contact</label>
              <input type="email" value={entity.email} onChange={(e) => set('email', e.target.value)} placeholder="contact@societe.fr" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Ville de signature des contrats</label>
              <input value={entity.signatureCity} onChange={(e) => set('signatureCity', e.target.value)} placeholder="Strasbourg" className={inputCls} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
          {success && <span className="text-green-600 text-sm font-medium">✓ Sauvegardé</span>}
        </div>
      </form>
    </div>
  );
}
