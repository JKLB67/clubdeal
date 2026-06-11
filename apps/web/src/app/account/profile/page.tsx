'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Navbar } from '@/components/layout/Navbar';
import { useAuth } from '@/context/auth';
import { api } from '@/lib/api';
import { KycBadge } from '@/components/ui/KycBadge';
import { User, Building2 } from 'lucide-react';

export default function ProfilePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get<any>('/api/users/me'),
    enabled: !!user,
  });

  const isLegal = user?.profileType === 'LEGAL';

  // ── État formulaire KYC physique ──
  const [phys, setPhys] = useState({
    firstName: '', lastName: '', birthDate: '', birthPlace: '', birthCountry: '',
    nationality: '', addressLine1: '', postalCode: '', city: '', country: 'France',
  });

  // ── État formulaire KYB morale ──
  const [legal, setLegal] = useState({
    companyName: '', legalForm: 'SAS', siren: '', siret: '',
    registeredAddress: '', legalRepresentativeId: '',
  });

  // Pré-remplir quand les données arrivent
  useState(() => {
    if (me?.physicalProfile) setPhys({ ...phys, ...me.physicalProfile, birthDate: me.physicalProfile.birthDate?.slice(0, 10) ?? '' });
    if (me?.legalProfile) setLegal({ ...legal, ...me.legalProfile });
  });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setMsg('');
    try {
      if (isLegal) {
        await api.patch('/api/users/me/legal-profile', legal);
      } else {
        await api.patch('/api/users/me/profile', phys);
      }
      qc.invalidateQueries({ queryKey: ['me'] });
      setMsg('✓ Profil enregistré');
    } catch (e: any) {
      setMsg(`Erreur : ${e.message}`);
    } finally { setSaving(false); }
  }

  const inputCls = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">
        <div className="flex items-center gap-3 mb-5">
          <h1 className="text-xl font-bold text-gray-900">Mon profil</h1>
          {user && <KycBadge status={user.statusKyc} />}
        </div>

        <form onSubmit={save} className="space-y-4">
          {msg && (
            <div className={`text-sm rounded-xl px-4 py-3 ${msg.startsWith('Erreur') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
              {msg}
            </div>
          )}

          {!isLegal ? (
            <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 font-semibold text-gray-800">
                <User className="w-4 h-4" /> Identité (KYC)
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Prénom', 'firstName', 'text'],
                  ['Nom', 'lastName', 'text'],
                  ['Date de naissance', 'birthDate', 'date'],
                  ['Lieu de naissance', 'birthPlace', 'text'],
                  ['Pays de naissance', 'birthCountry', 'text'],
                  ['Nationalité', 'nationality', 'text'],
                  ['Adresse', 'addressLine1', 'text'],
                  ['Code postal', 'postalCode', 'text'],
                  ['Ville', 'city', 'text'],
                  ['Pays', 'country', 'text'],
                ].map(([label, field, type]) => (
                  <div key={field}>
                    <label className="block text-xs text-gray-500 mb-1">{label}</label>
                    <input type={type} value={(phys as any)[field]}
                      onChange={(e) => setPhys((p) => ({ ...p, [field]: e.target.value }))}
                      className={inputCls} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 font-semibold text-gray-800">
                <Building2 className="w-4 h-4" /> Entreprise (KYB)
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Raison sociale', 'companyName', 'text'],
                  ['Forme juridique', 'legalForm', 'text'],
                  ['SIREN', 'siren', 'text'],
                  ['SIRET', 'siret', 'text'],
                  ['Siège social', 'registeredAddress', 'text'],
                  ['Représentant légal', 'legalRepresentativeId', 'text'],
                ].map(([label, field, type]) => (
                  <div key={field}>
                    <label className="block text-xs text-gray-500 mb-1">{label}</label>
                    <input type={type} value={(legal as any)[field]}
                      onChange={(e) => setLegal((l) => ({ ...l, [field]: e.target.value }))}
                      className={inputCls} />
                  </div>
                ))}
              </div>
            </div>
          )}

          <button type="submit" disabled={saving}
            className="bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors text-sm">
            {saving ? 'Enregistrement...' : 'Enregistrer mon profil'}
          </button>
        </form>
      </main>
    </div>
  );
}
