'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatEuros } from '@/lib/utils';
import { CheckCircle, Clock, Users, AlertCircle, FileSignature, ZoomIn, XCircle } from 'lucide-react';
import { PdfViewer } from '@/components/ui/PdfViewer';

interface InvestorInfo {
  id: string;
  email: string;
  physicalProfile?: { firstName: string; lastName: string } | null;
}

interface Investment {
  id: string;
  amount: string;
  status: string;
  createdAt: string;
  confirmedAt?: string;
  bulletinSignedAt?: string | null;
  contratInvestorSignedAt?: string | null;
  contratEmitterSignedAt?: string | null;
  rejectionReason?: string | null;
  rejectedAt?: string | null;
  user: InvestorInfo;
}

const STATUSES = [
  { value: 'PENDING_SIGNATURE', label: 'En attente de signature',   color: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
  { value: 'PENDING_COSIGN',   label: 'En attente co-signature',    color: 'text-purple-700 bg-purple-50 border-purple-200' },
  { value: 'PENDING_PAYMENT',  label: 'En attente de virement',     color: 'text-orange-700 bg-orange-50 border-orange-200' },
  { value: 'CONFIRMED',        label: 'Confirmé',                   color: 'text-green-700 bg-green-50 border-green-200' },
  { value: 'REJECTED',         label: 'Refusé',                     color: 'text-red-700 bg-red-50 border-red-200' },
  { value: 'FAILED',           label: 'Échoué',                     color: 'text-red-700 bg-red-50 border-red-200' },
  { value: 'CANCELLED',        label: 'Annulé',                     color: 'text-gray-600 bg-gray-100 border-gray-200' },
];

function statusMeta(value: string) {
  return STATUSES.find((s) => s.value === value) ?? { value, label: value, color: 'text-gray-600 bg-gray-100 border-gray-200' };
}

export function AdminInvestorsTab({ projectId }: { projectId: string; tenantId: string }) {
  const qc = useQueryClient();
  const [changingId, setChangingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [signingId, setSigningId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [previewInvId, setPreviewInvId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const { data: investments = [], isLoading } = useQuery({
    queryKey: ['admin-investors', projectId],
    queryFn: () => api.get<Investment[]>(`/api/projects/${projectId}/investors`),
  });

  const pending = investments.filter((i) => i.status === 'PENDING_PAYMENT');
  const confirmed = investments.filter((i) => i.status === 'CONFIRMED');
  const awaitingCosign = investments.filter((i) => i.status === 'PENDING_COSIGN' || (i.contratInvestorSignedAt && !i.contratEmitterSignedAt && i.status !== 'REJECTED'));

  const totalConfirmed = confirmed.reduce((s, i) => s + Number(i.amount), 0);
  const totalPending   = pending.reduce((s, i) => s + Number(i.amount), 0);

  function invalidate() {
    qc.invalidateQueries({ queryKey: ['admin-investors', projectId] });
    qc.invalidateQueries({ queryKey: ['project', projectId] });
    qc.invalidateQueries({ queryKey: ['admin-projects'] });
  }

  async function changeStatus(investmentId: string, status: string) {
    setError('');
    setChangingId(investmentId);
    try {
      await api.patch(`/api/projects/${projectId}/investments/${investmentId}/status`, { status });
      invalidate();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setChangingId(null);
    }
  }

  async function signContrat(investmentId: string) {
    setError('');
    setSigningId(investmentId);
    try {
      await api.post(`/api/investments/${investmentId}/sign-contrat-emitter`, {});
      invalidate();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSigningId(null);
    }
  }

  async function rejectContrat(investmentId: string) {
    setError('');
    setRejectingId(investmentId);
    try {
      await api.post(`/api/investments/${investmentId}/reject`, { reason: rejectReason });
      invalidate();
      setShowRejectModal(null);
      setRejectReason('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setRejectingId(null);
    }
  }

  async function confirmPayment(investmentId: string) {
    setError('');
    setConfirmingId(investmentId);
    try {
      await api.post(`/api/projects/${projectId}/investments/${investmentId}/confirm-payment`, {});
      invalidate();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setConfirmingId(null);
    }
  }

  if (isLoading) return <p className="text-gray-400">Chargement...</p>;

  return (
    <div className="max-w-3xl space-y-6">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>}

      {/* Modal de refus */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-bold text-gray-900">Refuser la signature</h3>
            <p className="text-sm text-gray-500">L'investisseur recevra un email avec le motif de refus.</p>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5 font-medium">Motif du refus</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Ex. : Documents incomplets, KYC non validé..."
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setShowRejectModal(null); setRejectReason(''); }}
                className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => rejectContrat(showRejectModal)}
                disabled={!rejectReason.trim() || rejectingId === showRejectModal}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <XCircle className="w-4 h-4" />
                {rejectingId === showRejectModal ? 'Refus en cours...' : 'Confirmer le refus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Résumé */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs font-medium mb-1">
            <Users className="w-3.5 h-3.5" /> Investisseurs
          </div>
          <p className="text-2xl font-bold text-gray-900">{investments.length}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-green-600 text-xs font-medium mb-1">
            <CheckCircle className="w-3.5 h-3.5" /> Collecté
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatEuros(String(totalConfirmed))}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-orange-600 text-xs font-medium mb-1">
            <Clock className="w-3.5 h-3.5" /> En attente
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatEuros(String(totalPending))}</p>
        </div>
      </div>

      {previewInvId && (
        <PdfViewer
          path={`/api/investments/${previewInvId}/contrat`}
          filename="Contrat d'émission d'obligations"
          isHtml={true}
          onClose={() => setPreviewInvId(null)}
        />
      )}

      {/* Contrats en attente de co-signature émetteur */}
      {awaitingCosign.length > 0 && (
        <div className="bg-purple-50 border border-purple-100 rounded-2xl p-6">
          <h2 className="font-semibold text-purple-800 mb-4 flex items-center gap-2">
            <FileSignature className="w-4 h-4" />
            Contrats à co-signer ({awaitingCosign.length})
          </h2>
          <div className="space-y-3">
            {awaitingCosign.map((inv) => (
              <div key={inv.id} className="bg-white rounded-xl border border-purple-100 px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900 text-sm">
                    {inv.user.physicalProfile
                      ? `${inv.user.physicalProfile.firstName} ${inv.user.physicalProfile.lastName}`
                      : inv.user.email}
                  </p>
                  <p className="text-xs text-gray-400">
                    {inv.user.email} · Signé le {new Date(inv.contratInvestorSignedAt!).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900 text-sm">{formatEuros(inv.amount)}</span>
                  <button onClick={() => setPreviewInvId(inv.id)}
                    className="flex items-center gap-1 text-purple-600 hover:text-purple-800 text-xs font-medium border border-purple-200 rounded-lg px-3 py-1.5 hover:bg-purple-50 transition-colors">
                    <ZoomIn className="w-3 h-3" /> Lire
                  </button>
                  <button
                    onClick={() => { setShowRejectModal(inv.id); setRejectReason(''); }}
                    className="flex items-center gap-1 text-red-600 hover:text-red-800 text-xs font-medium border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50 transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Refuser
                  </button>
                  <button
                    onClick={() => signContrat(inv.id)}
                    disabled={signingId === inv.id}
                    className="bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <FileSignature className="w-3.5 h-3.5" />
                    {signingId === inv.id ? 'Signature...' : 'Co-signer le contrat'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Virements en attente */}
      {pending.length > 0 && (
        <div className="bg-orange-50 border border-orange-100 rounded-2xl p-6">
          <h2 className="font-semibold text-orange-800 mb-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Virements en attente de réception ({pending.length})
          </h2>
          <div className="space-y-3">
            {pending.map((inv) => (
              <div key={inv.id} className="bg-white rounded-xl border border-orange-100 px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900 text-sm">
                    {inv.user.physicalProfile
                      ? `${inv.user.physicalProfile.firstName} ${inv.user.physicalProfile.lastName}`
                      : inv.user.email}
                  </p>
                  <p className="text-xs text-gray-400">{inv.user.email} · {new Date(inv.createdAt).toLocaleDateString('fr-FR')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-gray-900">{formatEuros(inv.amount)}</span>
                  <button
                    onClick={() => confirmPayment(inv.id)}
                    disabled={confirmingId === inv.id}
                    className="bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    {confirmingId === inv.id ? 'Validation...' : 'Valider la réception'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tableau complet */}
      {investments.length === 0 ? (
        <div className="text-center py-16 bg-white border border-gray-100 rounded-2xl text-gray-400">
          <p className="text-3xl mb-2">👥</p>
          <p className="text-sm">Aucun investisseur pour le moment</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50">
            <h2 className="font-semibold text-gray-800">Tous les investissements</h2>
          </div>
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-3">Investisseur</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-3">Montant</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-3">Statut</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {investments.map((inv) => {
                const meta = statusMeta(inv.status);
                return (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900 text-sm">
                        {inv.user.physicalProfile
                          ? `${inv.user.physicalProfile.firstName} ${inv.user.physicalProfile.lastName}`
                          : '—'}
                      </p>
                      <p className="text-xs text-gray-400">{inv.user.email}</p>
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-900 text-sm">
                      {formatEuros(inv.amount)}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <select
                          value={inv.status}
                          disabled={changingId === inv.id}
                          onChange={(e) => changeStatus(inv.id, e.target.value)}
                          className={`text-xs font-medium px-2.5 py-1.5 rounded-lg border cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 ${meta.color}`}
                        >
                          {STATUSES.map((s) => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </select>
                        {inv.status === 'REJECTED' && inv.rejectionReason && (
                          <p className="text-xs text-red-500 mt-1 max-w-[200px] truncate" title={inv.rejectionReason}>
                            Motif : {inv.rejectionReason}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {new Date(inv.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
