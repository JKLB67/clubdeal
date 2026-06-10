'use client';

import { use, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { KycBadge } from '@/components/ui/KycBadge';
import { useAuth } from '@/context/auth';
import { api } from '@/lib/api';
import { Project } from '@/types';
import { formatEuros, progressPercent } from '@/lib/utils';
import { MapPin, TrendingUp, Clock, FileText, ChevronLeft } from 'lucide-react';

function YieldSimulator({ annualYield, durationMonths }: { annualYield: string; durationMonths: number }) {
  const [amount, setAmount] = useState('');

  const invested = parseFloat(amount) || 0;
  const yieldRate = parseFloat(annualYield) / 100;
  const years = durationMonths / 12;
  const grossReturn = invested * yieldRate * years;
  const totalGross = invested + grossReturn;

  return (
    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
      <h3 className="font-bold text-gray-900 text-lg mb-4">Simulateur de rendement</h3>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Montant investi (€)
        </label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          min={0}
          step={1000}
          placeholder="Ex : 10 000"
          className="w-full border border-blue-200 bg-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {invested > 0 && (
        <div className="space-y-3 pt-2 border-t border-blue-200">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Capital investi</span>
            <span className="font-semibold">{invested.toLocaleString('fr-FR')} €</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Intérêts bruts sur {durationMonths} mois</span>
            <span className="font-semibold text-green-700">+{grossReturn.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €</span>
          </div>
          <div className="flex justify-between text-sm border-t border-blue-200 pt-3">
            <span className="font-bold text-gray-900">Total brut avant impôts</span>
            <span className="font-bold text-blue-700 text-lg">{totalGross.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €</span>
          </div>
          <p className="text-xs text-gray-400">Simulation indicative. Les rendements ne sont pas garantis. Hors fiscalité.</p>
        </div>
      )}
    </div>
  );
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => api.get<Project>(`/api/projects/${id}`),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-gray-400">Chargement...</div>
      </div>
    );
  }

  if (!project) return null;

  const progress = progressPercent(project.collectedAmount, project.collectionGoal);
  const kycValidated = user?.statusKyc === 'VALIDATED';

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-10">
        {/* Retour */}
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-700 mb-6">
          <ChevronLeft className="w-4 h-4" />
          Retour aux collectes
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Colonne principale */}
          <div className="lg:col-span-2 space-y-6">
            {/* Photos */}
            <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-blue-100 to-blue-200 h-64">
              {project.photos[0] ? (
                <img src={project.photos[0].url} alt={project.name} className="w-full h-full object-cover" />
              ) : (
                <div className="flex items-center justify-center h-full text-blue-300 text-7xl">🏗️</div>
              )}
            </div>

            {/* Infos */}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
              <div className="flex items-center gap-1.5 text-gray-500 text-sm mt-1">
                <MapPin className="w-4 h-4" />
                {project.address}
              </div>
            </div>

            {project.description && (
              <p className="text-gray-600 leading-relaxed">{project.description}</p>
            )}

            {/* Métriques */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { icon: TrendingUp, label: 'Rendement', value: `${project.annualYield}% /an` },
                { icon: Clock, label: 'Durée', value: `${project.durationMonths} mois` },
                { icon: FileText, label: 'Précomm.', value: project.precommercialisationRate ? `${project.precommercialisationRate}%` : 'N/A' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="bg-white border border-gray-100 rounded-xl p-4 text-center">
                  <Icon className="w-5 h-5 text-blue-600 mx-auto mb-1.5" />
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="font-bold text-gray-900 mt-0.5">{value}</p>
                </div>
              ))}
            </div>

            {/* Documents */}
            {project.documents && project.documents.length > 0 && (
              <div>
                <h2 className="font-bold text-gray-900 mb-3">Documents du projet</h2>
                <div className="space-y-2">
                  {project.documents.map((doc) => (
                    <a
                      key={doc.id}
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-4 py-3 hover:border-blue-300 transition-colors"
                    >
                      <FileText className="w-5 h-5 text-blue-500 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{doc.name}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Simulateur */}
            <YieldSimulator annualYield={project.annualYield} durationMonths={project.durationMonths} />
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            <div className="bg-white border border-gray-100 rounded-2xl p-6 sticky top-6">
              <h2 className="font-bold text-gray-900 mb-4">Progression de la collecte</h2>

              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-bold text-gray-900 text-lg">{formatEuros(project.collectedAmount)}</span>
                  <span className="text-gray-500 text-sm self-end">sur {formatEuros(project.collectionGoal)}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-right text-sm font-semibold text-blue-700 mt-1.5">{progress}% financé</p>
              </div>

              <div className="border-t border-gray-100 pt-4 mb-5 text-sm text-gray-600 space-y-2">
                <div className="flex justify-between">
                  <span>Investisseurs</span>
                  <span className="font-semibold text-gray-900">{project._count?.investments ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Durée</span>
                  <span className="font-semibold text-gray-900">{project.durationMonths} mois</span>
                </div>
              </div>

              {/* CTA */}
              {!user ? (
                <Link
                  href="/login"
                  className="block w-full text-center bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 rounded-xl transition-colors"
                >
                  Se connecter pour investir
                </Link>
              ) : kycValidated ? (
                <Link
                  href={`/invest/${project.id}`}
                  className="block w-full text-center bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 rounded-xl transition-colors"
                >
                  Participer à la collecte
                </Link>
              ) : (
                <div className="space-y-3">
                  <button
                    disabled
                    className="w-full bg-gray-200 text-gray-400 font-semibold py-3 rounded-xl cursor-not-allowed"
                  >
                    Participer à la collecte
                  </button>
                  <div className="text-center">
                    <KycBadge status={user.statusKyc} />
                    <p className="text-xs text-gray-500 mt-1.5">Validez votre KYC pour investir</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
