'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Project } from '@/types';
import { Save, FileText } from 'lucide-react';

interface ContractConfig {
  priorityRank: number;
  minGuaranteedRate: number;
  guaranteedPeriodMonths: number;
  monthlyComplementaryRate: number;
  contractualCapRate: number;
  propertyDescription: string | null;
  massRepresentative: string;
  competentCourt: string;
  earlyRepaymentNoticeDays: number;
  latePaymentPenaltyPoints: number;
}

const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';

const COURTS = ['Strasbourg', 'Paris', 'Lyon', 'Marseille', 'Bordeaux', 'Nantes', 'Lille', 'Toulouse', 'Nice', 'Rennes', 'Grenoble', 'Montpellier'];

export function AdminContractTab({ project }: { project: Project }) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [changes, setChanges] = useState<Partial<ContractConfig>>({});

  const { data: config, isLoading } = useQuery<ContractConfig>({
    queryKey: ['contract-config', project.id],
    queryFn: () => api.get(`/api/projects/${project.id}/contract-config`),
  });

  const values: ContractConfig = { ...(config ?? {
    priorityRank: 1,
    minGuaranteedRate: 6,
    guaranteedPeriodMonths: 3,
    monthlyComplementaryRate: 2,
    contractualCapRate: 22,
    propertyDescription: '',
    massRepresentative: '',
    competentCourt: 'Strasbourg',
    earlyRepaymentNoticeDays: 7,
    latePaymentPenaltyPoints: 5,
  }), ...changes };

  function set<K extends keyof ContractConfig>(field: K, value: ContractConfig[K]) {
    setChanges((c) => ({ ...c, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setSuccess(false);
    try {
      await api.patch(`/api/projects/${project.id}/contract-config`, values);
      qc.invalidateQueries({ queryKey: ['contract-config', project.id] });
      setChanges({});
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) return <p className="text-gray-400">Chargement...</p>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <FileText className="w-4 h-4" />
        <span>Ces paramètres sont injectés dans le Contrat d'Émission d'Obligations et le Bulletin de Souscription générés pour ce projet.</span>
      </div>

      {/* Propriété */}
      <section className="bg-white border border-gray-100 rounded-2xl p-6 space-y-4">
        <h3 className="font-semibold text-gray-800">Bien immobilier financé</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Description du bien (Article 1 & préambule 7)
          </label>
          <textarea
            rows={2}
            value={values.propertyDescription ?? project.address}
            onChange={(e) => set('propertyDescription', e.target.value)}
            placeholder={`${project.address}, référence cadastrale XXX BP XX, superficie XXX m²`}
            className={inputCls}
          />
          <p className="text-xs text-gray-400 mt-1">Par défaut : adresse du projet. Vous pouvez préciser la référence cadastrale et la superficie.</p>
        </div>
      </section>

      {/* Rang de priorité */}
      <section className="bg-white border border-gray-100 rounded-2xl p-6 space-y-4">
        <h3 className="font-semibold text-gray-800">Priorité de remboursement (Art. 6.2)</h3>
        <div className="flex gap-3">
          {[1, 2, 3].map((r) => (
            <button key={r} type="button" onClick={() => set('priorityRank', r)}
              className={`px-5 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${
                values.priorityRank === r ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}>
              Rang {r}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400">Rang 1 = remboursé en priorité sur tous les autres obligataires.</p>
      </section>

      {/* Intérêts */}
      <section className="bg-white border border-gray-100 rounded-2xl p-6 space-y-4">
        <h3 className="font-semibold text-gray-800">Structure des intérêts (Art. 7)</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Taux minimum garanti (%)</label>
            <select value={values.minGuaranteedRate} onChange={(e) => set('minGuaranteedRate', Number(e.target.value))} className={inputCls}>
              {[4, 5, 6, 7, 8, 9, 10, 12].map((v) => <option key={v} value={v}>{v}%</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Période garantie (mois)</label>
            <select value={values.guaranteedPeriodMonths} onChange={(e) => set('guaranteedPeriodMonths', Number(e.target.value))} className={inputCls}>
              {[1, 2, 3, 4, 6].map((v) => <option key={v} value={v}>{v} mois</option>)}
            </select>
            <p className="text-xs text-gray-400 mt-1">Intérêt minimum acquis même en cas de remboursement avant ce délai.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Taux complémentaire mensuel (%)</label>
            <select value={values.monthlyComplementaryRate} onChange={(e) => set('monthlyComplementaryRate', Number(e.target.value))} className={inputCls}>
              {[1, 1.5, 2, 2.5, 3, 3.5, 4].map((v) => <option key={v} value={v}>{v}% / mois</option>)}
            </select>
            <p className="text-xs text-gray-400 mt-1">Appliqué à partir du {values.guaranteedPeriodMonths + 1}ème mois.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Plafond contractuel total (%)</label>
            <select value={values.contractualCapRate} onChange={(e) => set('contractualCapRate', Number(e.target.value))} className={inputCls}>
              {[12, 15, 18, 20, 22, 24, 25, 30].map((v) => <option key={v} value={v}>{v}%</option>)}
            </select>
            <p className="text-xs text-gray-400 mt-1">Intérêts totaux plafonnés sur la durée maximale.</p>
          </div>
        </div>

        {/* Simulation rapide */}
        <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-800">
          <p className="font-semibold mb-1">Simulation (10 000 €)</p>
          <p>Taux minimum garanti : <strong>{(10000 * values.minGuaranteedRate / 100).toLocaleString('fr-FR')} €</strong> ({values.minGuaranteedRate}% – acquis dès {values.guaranteedPeriodMonths} mois)</p>
          <p>Plafond total intérêts : <strong>{(10000 * values.contractualCapRate / 100).toLocaleString('fr-FR')} €</strong> ({values.contractualCapRate}%)</p>
        </div>
      </section>

      {/* Remboursement */}
      <section className="bg-white border border-gray-100 rounded-2xl p-6 space-y-4">
        <h3 className="font-semibold text-gray-800">Conditions de remboursement (Art. 6.3 & 7.5)</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Délai de préavis – remboursement anticipé volontaire</label>
            <select value={values.earlyRepaymentNoticeDays} onChange={(e) => set('earlyRepaymentNoticeDays', Number(e.target.value))} className={inputCls}>
              {[5, 7, 10, 14, 30].map((v) => <option key={v} value={v}>{v} jours ouvrés</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Majoration intérêts de retard (points)</label>
            <select value={values.latePaymentPenaltyPoints} onChange={(e) => set('latePaymentPenaltyPoints', Number(e.target.value))} className={inputCls}>
              {[3, 5, 7, 10].map((v) => <option key={v} value={v}>+{v} points / an</option>)}
            </select>
          </div>
        </div>
      </section>

      {/* Gouvernance */}
      <section className="bg-white border border-gray-100 rounded-2xl p-6 space-y-4">
        <h3 className="font-semibold text-gray-800">Gouvernance (Art. 13 & 22)</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Représentant de la Masse</label>
            <input
              value={values.massRepresentative}
              onChange={(e) => set('massRepresentative', e.target.value)}
              placeholder="Prénom NOM"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Tribunal compétent</label>
            <select value={values.competentCourt} onChange={(e) => set('competentCourt', e.target.value)} className={inputCls}>
              {COURTS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving || Object.keys(changes).length === 0}
          className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Enregistrement...' : 'Enregistrer les paramètres'}
        </button>
        {success && <span className="text-green-600 text-sm font-medium">✓ Sauvegardé</span>}
      </div>
    </div>
  );
}
