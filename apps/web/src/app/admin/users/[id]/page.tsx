'use client';

import { use, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { KycBadge } from '@/components/ui/KycBadge';
import { formatEuros } from '@/lib/utils';
import { ChevronLeft, UserX, UserCheck, Trash2, KeyRound, AlertTriangle } from 'lucide-react';

interface AdminUserDetail {
  id: string;
  email: string;
  role: string;
  statusKyc: string;
  profileType: string;
  isSuspended: boolean;
  createdAt: string;
  physicalProfile?: {
    firstName: string; lastName: string; birthDate?: string; birthPlace?: string;
    birthCountry?: string; nationality?: string; addressLine1?: string;
    addressLine2?: string; postalCode?: string; city?: string; country?: string;
  } | null;
  legalProfile?: {
    companyName: string; legalForm?: string; siren?: string; siret?: string;
    registeredAddress?: string; legalRepresentativeId?: string;
    ubos?: { id: string; firstName: string; lastName: string }[];
  } | null;
  investments: { id: string; amount: string; status: string; createdAt: string; project: { id: string; name: string } }[];
}

const STATUS_LABELS: Record<string, string> = {
  PENDING_SIGNATURE: 'Signature en attente',
  PENDING_PAYMENT: 'Paiement en attente',
  CONFIRMED: 'Confirmé',
  FAILED: 'Échoué',
  CANCELLED: 'Annulé',
};

export default function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [showResetForm, setShowResetForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  const { data: user, isLoading } = useQuery({
    queryKey: ['admin-user', id],
    queryFn: () => api.get<AdminUserDetail>(`/api/users/admin/${id}`),
  });

  async function doAction(label: string, fn: () => Promise<any>) {
    setActionLoading(label); setActionMsg('');
    try {
      await fn();
      qc.invalidateQueries({ queryKey: ['admin-user', id] });
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      setActionMsg('✓ Action effectuée');
    } catch (e: any) {
      setActionMsg(`Erreur : ${e.message}`);
    } finally { setActionLoading(''); }
  }

  async function suspendToggle() {
    await doAction('suspend', () =>
      api.patch(`/api/users/admin/${id}/suspend`, { suspend: !user?.isSuspended })
    );
  }

  async function resetPassword() {
    if (!newPassword || newPassword.length < 8) { setActionMsg('8 caractères minimum'); return; }
    await doAction('reset', () =>
      api.post(`/api/users/admin/${id}/reset-password`, { newPassword })
    );
    setNewPassword(''); setShowResetForm(false);
  }

  async function deleteAccount() {
    await doAction('delete', () => api.delete(`/api/users/admin/${id}`));
    router.push('/admin/users');
  }

  if (isLoading) return <div className="text-gray-400 text-sm py-8">Chargement...</div>;
  if (!user) return <div className="text-red-600 text-sm py-8">Utilisateur introuvable</div>;

  const name = user.profileType === 'LEGAL' && user.legalProfile
    ? user.legalProfile.companyName
    : user.physicalProfile
      ? `${user.physicalProfile.firstName} ${user.physicalProfile.lastName}`
      : user.email;

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/admin/users" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-700">
          <ChevronLeft className="w-4 h-4" /> Investisseurs
        </Link>
      </div>

      {/* En-tête */}
      <div className="bg-white border border-gray-100 rounded-xl p-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">{name}</h1>
            <p className="text-sm text-gray-500">{user.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <KycBadge status={user.statusKyc as any} />
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                {user.profileType === 'PHYSICAL' ? 'Personne physique' : 'Personne morale'}
              </span>
              {user.isSuspended && (
                <span className="text-xs text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <UserX className="w-3 h-3" /> Suspendu
                </span>
              )}
            </div>
          </div>
          <p className="text-xs text-gray-400">Inscrit le {new Date(user.createdAt).toLocaleDateString('fr-FR')}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white border border-gray-100 rounded-xl p-5">
        <h2 className="font-semibold text-gray-800 mb-3">Actions</h2>

        {actionMsg && (
          <div className={`text-sm rounded-lg px-3 py-2 mb-3 ${actionMsg.startsWith('Erreur') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {actionMsg}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {/* Suspendre / Réactiver */}
          <button
            onClick={suspendToggle}
            disabled={actionLoading === 'suspend'}
            className={`flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg border transition-colors disabled:opacity-60 ${
              user.isSuspended
                ? 'border-green-200 text-green-700 hover:bg-green-50'
                : 'border-orange-200 text-orange-700 hover:bg-orange-50'
            }`}
          >
            {user.isSuspended ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
            {user.isSuspended ? 'Réactiver l\'accès' : 'Suspendre l\'accès'}
          </button>

          {/* Réinitialiser le mot de passe */}
          <button
            onClick={() => setShowResetForm((v) => !v)}
            className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50 transition-colors"
          >
            <KeyRound className="w-4 h-4" /> Réinitialiser le mot de passe
          </button>

          {/* Supprimer */}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" /> Supprimer le compte
          </button>
        </div>

        {/* Formulaire reset mot de passe */}
        {showResetForm && (
          <div className="mt-3 flex gap-2">
            <input
              type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Nouveau mot de passe (8 car. min)"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={resetPassword} disabled={actionLoading === 'reset'}
              className="bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-60"
            >
              Valider
            </button>
          </div>
        )}

        {/* Confirm suppression */}
        {showDeleteConfirm && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <p className="text-sm font-semibold text-red-700">Supprimer définitivement ce compte ?</p>
            </div>
            <p className="text-xs text-red-600 mb-3">Cette action est irréversible. Toutes les données seront perdues.</p>
            <div className="flex gap-2">
              <button onClick={deleteAccount} disabled={actionLoading === 'delete'}
                className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg disabled:opacity-60">
                Confirmer la suppression
              </button>
              <button onClick={() => setShowDeleteConfirm(false)} className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1.5 border border-gray-200 rounded-lg">
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Profil KYC */}
      {user.physicalProfile && (
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <h2 className="font-semibold text-gray-800 mb-3">Profil KYC — Personne physique</h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {[
              ['Prénom', user.physicalProfile.firstName],
              ['Nom', user.physicalProfile.lastName],
              ['Date de naissance', user.physicalProfile.birthDate ? new Date(user.physicalProfile.birthDate).toLocaleDateString('fr-FR') : '—'],
              ['Lieu de naissance', user.physicalProfile.birthPlace ?? '—'],
              ['Pays de naissance', user.physicalProfile.birthCountry ?? '—'],
              ['Nationalité', user.physicalProfile.nationality ?? '—'],
              ['Adresse', user.physicalProfile.addressLine1 ?? '—'],
              ['CP / Ville', user.physicalProfile.postalCode && user.physicalProfile.city ? `${user.physicalProfile.postalCode} ${user.physicalProfile.city}` : '—'],
              ['Pays', user.physicalProfile.country ?? '—'],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-gray-400">{label}</dt>
                <dd className="font-medium text-gray-900">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {/* Profil KYB */}
      {user.legalProfile && (
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <h2 className="font-semibold text-gray-800 mb-3">Profil KYB — Personne morale</h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {[
              ['Raison sociale', user.legalProfile.companyName],
              ['Forme juridique', user.legalProfile.legalForm ?? '—'],
              ['SIREN', user.legalProfile.siren ?? '—'],
              ['SIRET', user.legalProfile.siret ?? '—'],
              ['Siège social', user.legalProfile.registeredAddress ?? '—'],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-gray-400">{label}</dt>
                <dd className="font-medium text-gray-900">{value}</dd>
              </div>
            ))}
          </dl>
          {user.legalProfile.ubos && user.legalProfile.ubos.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-gray-400 font-semibold uppercase mb-2">Bénéficiaires effectifs (UBO)</p>
              <div className="space-y-1">
                {user.legalProfile.ubos.map((ubo) => (
                  <p key={ubo.id} className="text-sm text-gray-700">{ubo.firstName} {ubo.lastName}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Investissements */}
      <div className="bg-white border border-gray-100 rounded-xl p-5">
        <h2 className="font-semibold text-gray-800 mb-3">Investissements ({user.investments.length})</h2>
        {user.investments.length === 0 ? (
          <p className="text-sm text-gray-400">Aucun investissement</p>
        ) : (
          <div className="space-y-2">
            {user.investments.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between text-sm py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="font-medium text-gray-900">{inv.project.name}</p>
                  <p className="text-xs text-gray-400">{new Date(inv.createdAt).toLocaleDateString('fr-FR')}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">{formatEuros(inv.amount)}</p>
                  <p className="text-xs text-gray-500">{STATUS_LABELS[inv.status] ?? inv.status}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
