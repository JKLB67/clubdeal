'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { PdfViewer } from '@/components/ui/PdfViewer';
import { api } from '@/lib/api';
import { formatEuros } from '@/lib/utils';
import { FileText, ExternalLink, ZoomIn } from 'lucide-react';

interface MyInvestment {
  id: string;
  amount: string;
  status: 'PENDING_SIGNATURE' | 'PENDING_COSIGN' | 'PENDING_PAYMENT' | 'CONFIRMED' | 'FAILED' | 'CANCELLED' | 'REJECTED';
  createdAt: string;
  confirmedAt?: string;
  bulletinSignedAt?: string | null;
  contratInvestorSignedAt?: string | null;
  contratEmitterSignedAt?: string | null;
  project: { id: string; name: string; address: string; annualYield: string; durationMonths: number; virtualIban?: string };
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  PENDING_SIGNATURE: { label: 'Signature en attente',    className: 'bg-yellow-100 text-yellow-700' },
  PENDING_COSIGN:    { label: 'Co-signature en attente', className: 'bg-purple-100 text-purple-700' },
  PENDING_PAYMENT:   { label: 'Paiement en attente',     className: 'bg-blue-100 text-blue-700' },
  CONFIRMED:         { label: 'Confirmé',                className: 'bg-green-100 text-green-700' },
  REJECTED:          { label: 'Refusé',                  className: 'bg-red-100 text-red-600' },
  FAILED:            { label: 'Échoué',                  className: 'bg-red-100 text-red-600' },
  CANCELLED:         { label: 'Annulé',                  className: 'bg-gray-100 text-gray-500' },
};

type DocType = { invId: string; type: 'contrat' | 'bulletin'; label: string };

export default function MyInvestmentsPage() {
  const [viewDoc, setViewDoc] = useState<DocType | null>(null);

  const { data: investments = [], isLoading } = useQuery({
    queryKey: ['my-investments'],
    queryFn: () => api.get<MyInvestment[]>('/api/investments/mine'),
    refetchInterval: 10_000,
  });

  // Exclure les investissements annulés et refusés
  const active = investments.filter((i) => !['CANCELLED', 'REJECTED'].includes(i.status));

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Mes investissements</h1>
        <p className="text-gray-500 text-sm mb-6">Suivez l'état de vos souscriptions en temps réel.</p>

        {viewDoc && (
          <PdfViewer
            path={`/api/investments/${viewDoc.invId}/${viewDoc.type}/pdf`}
            downloadPath={`/api/investments/${viewDoc.invId}/${viewDoc.type}/download`}
            filename={viewDoc.label}
            isHtml={false}
            onClose={() => setViewDoc(null)}
          />
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <div key={i} className="bg-white rounded-xl h-24 animate-pulse border border-gray-100" />)}
          </div>
        ) : active.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
            <p className="text-3xl mb-3">📋</p>
            <p className="text-gray-500 mb-4">Aucun investissement pour le moment</p>
            <Link href="/" className="text-blue-700 font-medium hover:underline text-sm">
              Découvrir les projets →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {active.map((inv) => {
              const cfg = STATUS_CONFIG[inv.status] ?? STATUS_CONFIG.PENDING_SIGNATURE;
              const bothSigned = !!(inv.contratInvestorSignedAt && inv.bulletinSignedAt);
              return (
                <div key={inv.id} className="bg-white border border-gray-100 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-gray-900">{inv.project.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{inv.project.address}</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.className}`}>
                      {cfg.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-sm mb-3">
                    <div>
                      <p className="text-gray-400 text-xs">Montant investi</p>
                      <p className="font-bold text-gray-900">{formatEuros(inv.amount)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs">Rendement</p>
                      <p className="font-semibold text-green-700">{inv.project.annualYield}% /an</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs">Durée</p>
                      <p className="font-semibold text-gray-900">{inv.project.durationMonths} mois</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-gray-100">
                    {/* Voir le contrat — disponible uniquement après co-signature (PDF stocké) */}
                    {inv.contratEmitterSignedAt && (
                      <button
                        onClick={() => setViewDoc({ invId: inv.id, type: 'contrat', label: "Contrat d'émission" })}
                        className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium border border-blue-200 rounded-lg px-2.5 py-1.5 hover:bg-blue-50 transition-colors"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                        Voir le contrat
                      </button>
                    )}

                    {/* Voir le bulletin */}
                    {inv.bulletinSignedAt && (
                      <button
                        onClick={() => setViewDoc({ invId: inv.id, type: 'bulletin', label: 'Bulletin de souscription' })}
                        className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium border border-blue-200 rounded-lg px-2.5 py-1.5 hover:bg-blue-50 transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Voir le bulletin
                      </button>
                    )}

                    {/* Finaliser la signature — lien vers la page projet */}
                    {inv.status === 'PENDING_SIGNATURE' && (
                      <Link
                        href={`/invest/${inv.project.id}`}
                        className="flex items-center gap-1.5 text-xs text-amber-700 hover:text-amber-900 font-medium border border-amber-200 rounded-lg px-2.5 py-1.5 hover:bg-amber-50 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Finaliser la signature
                      </Link>
                    )}

                    {/* En attente de co-signature émetteur */}
                    {inv.status === 'PENDING_COSIGN' && (
                      <span className="flex items-center gap-1.5 text-xs text-purple-600 font-medium bg-purple-50 border border-purple-200 rounded-lg px-2.5 py-1.5">
                        ⏳ En attente de co-signature
                      </span>
                    )}

                    {/* Effectuer le paiement — redirige vers la page virement */}
                    {inv.status === 'PENDING_PAYMENT' && (
                      <Link
                        href={`/invest/${inv.project.id}?step=payment`}
                        className="flex items-center gap-1.5 text-xs text-blue-700 hover:text-blue-900 font-medium border border-blue-300 rounded-lg px-2.5 py-1.5 hover:bg-blue-50 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Effectuer le paiement
                      </Link>
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
