'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { api } from '@/lib/api';
import { formatEuros } from '@/lib/utils';
import { FileText, ExternalLink } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface MyInvestment {
  id: string;
  amount: string;
  status: 'PENDING_SIGNATURE' | 'PENDING_PAYMENT' | 'CONFIRMED' | 'FAILED' | 'CANCELLED';
  createdAt: string;
  confirmedAt?: string;
  project: { name: string; address: string; annualYield: string; durationMonths: number; virtualIban?: string };
}

const STATUS_CONFIG = {
  PENDING_SIGNATURE: { label: 'Signature en attente', className: 'bg-yellow-100 text-yellow-700' },
  PENDING_PAYMENT:   { label: 'Paiement en attente',  className: 'bg-blue-100 text-blue-700' },
  CONFIRMED:         { label: 'Confirmé',              className: 'bg-green-100 text-green-700' },
  FAILED:            { label: 'Échoué',                className: 'bg-red-100 text-red-600' },
  CANCELLED:         { label: 'Annulé',                className: 'bg-gray-100 text-gray-500' },
};

export default function MyInvestmentsPage() {
  const { data: investments = [], isLoading } = useQuery({
    queryKey: ['my-investments'],
    queryFn: () => api.get<MyInvestment[]>('/api/investments/mine'),
    refetchInterval: 10_000, // rafraîchissement auto toutes les 10s
  });

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Mes investissements</h1>
        <p className="text-gray-500 mb-8">Suivez l'état de vos souscriptions en temps réel.</p>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <div key={i} className="bg-white rounded-2xl h-28 animate-pulse border border-gray-100" />)}
          </div>
        ) : investments.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-gray-500 mb-4">Aucun investissement pour le moment</p>
            <Link href="/" className="text-blue-700 font-medium hover:underline text-sm">
              Découvrir les projets →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {investments.map((inv) => {
              const cfg = STATUS_CONFIG[inv.status] ?? STATUS_CONFIG.PENDING_SIGNATURE;
              return (
                <div key={inv.id} className="bg-white border border-gray-100 rounded-2xl p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="font-bold text-gray-900">{inv.project.name}</p>
                      <p className="text-sm text-gray-400 mt-0.5">{inv.project.address}</p>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${cfg.className}`}>
                      {cfg.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                    <div>
                      <p className="text-gray-400 text-xs">Montant investi</p>
                      <p className="font-bold text-gray-900 mt-0.5">{formatEuros(inv.amount)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs">Rendement</p>
                      <p className="font-semibold text-green-700 mt-0.5">{inv.project.annualYield}% /an</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs">Durée</p>
                      <p className="font-semibold text-gray-900 mt-0.5">{inv.project.durationMonths} mois</p>
                    </div>
                  </div>

                  {/* Actions contextuelles */}
                  <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
                    <a
                      href={`${API_URL}/api/investments/${inv.id}/contract`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      <FileText className="w-4 h-4" />
                      Voir le contrat
                    </a>

                    {inv.status === 'PENDING_SIGNATURE' && (
                      <Link
                        href={`/invest/${inv.id}`}
                        className="flex items-center gap-1.5 text-sm text-amber-600 hover:text-amber-800 font-medium"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Finaliser la signature
                      </Link>
                    )}

                    {inv.status === 'PENDING_PAYMENT' && (
                      <div className="text-xs text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg">
                        Virement attendu sur IBAN :{' '}
                        <code className="font-mono">{inv.project.virtualIban ?? 'En attente de configuration'}</code>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
