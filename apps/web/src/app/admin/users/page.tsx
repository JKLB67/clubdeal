'use client';

import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { KycBadge } from '@/components/ui/KycBadge';
import { ChevronRight, UserX, ShieldCheck, RotateCcw, Loader2 } from 'lucide-react';
import { useState } from 'react';

interface AdminUser {
  id: string;
  email: string;
  role: string;
  statusKyc: string;
  profileType: string;
  isSuspended: boolean;
  createdAt: string;
  physicalProfile?: { firstName: string; lastName: string } | null;
  legalProfile?: { companyName: string } | null;
}

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const [loadingKyc, setLoadingKyc] = useState<string | null>(null);
  const [kycError, setKycError] = useState('');

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get<AdminUser[]>('/api/users/admin/list'),
  });

  const investors = users.filter((u) => u.role === 'INVESTOR');
  const noKyc = investors.filter((u) => u.statusKyc === 'NOT_INITIATED');
  const withKyc = investors.filter((u) => u.statusKyc !== 'NOT_INITIATED');

  function displayName(u: AdminUser) {
    if (u.profileType === 'LEGAL' && u.legalProfile) return u.legalProfile.companyName;
    if (u.physicalProfile) return `${u.physicalProfile.firstName} ${u.physicalProfile.lastName}`;
    return '—';
  }

  async function setKyc(userId: string, status: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setKycError('');
    setLoadingKyc(`${userId}:${status}`);
    try {
      await api.patch(`/api/users/admin/${userId}/kyc`, { status });
      qc.invalidateQueries({ queryKey: ['admin-users'] });
    } catch (err: any) {
      setKycError(err.message);
    } finally {
      setLoadingKyc(null);
    }
  }

  function KycActions({ u }: { u: AdminUser }) {
    const isValidating = loadingKyc === `${u.id}:VALIDATED`;
    const isResetting = loadingKyc === `${u.id}:NOT_INITIATED`;

    return (
      <div className="flex items-center gap-1.5" onClick={(e) => e.preventDefault()}>
        {u.statusKyc !== 'VALIDATED' && (
          <button
            onClick={(e) => setKyc(u.id, 'VALIDATED', e)}
            disabled={!!loadingKyc}
            title="Forcer KYC validé"
            className="flex items-center gap-1 text-xs text-green-700 font-medium border border-green-200 rounded-lg px-2 py-1 hover:bg-green-50 disabled:opacity-50 transition-colors"
          >
            {isValidating ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
            Valider
          </button>
        )}
        {u.statusKyc !== 'NOT_INITIATED' && (
          <button
            onClick={(e) => setKyc(u.id, 'NOT_INITIATED', e)}
            disabled={!!loadingKyc}
            title="Remettre en attente (forcer nouveau KYC)"
            className="flex items-center gap-1 text-xs text-orange-600 font-medium border border-orange-200 rounded-lg px-2 py-1 hover:bg-orange-50 disabled:opacity-50 transition-colors"
          >
            {isResetting ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
            Réinitialiser
          </button>
        )}
      </div>
    );
  }

  function UserRow({ u, i }: { u: AdminUser; i: number }) {
    return (
      <Link key={u.id} href={`/admin/users/${u.id}`}
        className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${i > 0 ? 'border-t border-gray-50' : ''}`}>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 text-sm">{displayName(u)}</p>
          <p className="text-xs text-gray-400 truncate">{u.email}</p>
        </div>
        <KycActions u={u} />
        {u.statusKyc !== 'NOT_INITIATED' && <KycBadge status={u.statusKyc as any} />}
        <span className="text-xs text-gray-400">{u.profileType === 'PHYSICAL' ? 'Physique' : 'Morale'}</span>
        {u.isSuspended && <UserX className="w-4 h-4 text-red-400" />}
        <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
      </Link>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Investisseurs</h1>
        <p className="text-gray-500 text-sm mt-0.5">{investors.length} compte{investors.length > 1 ? 's' : ''} enregistré{investors.length > 1 ? 's' : ''}</p>
      </div>

      {kycError && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{kycError}</div>
      )}

      {/* Stats KYC */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {(['NOT_INITIATED', 'PENDING', 'VALIDATED', 'REFUSED'] as const).map((status) => {
          const count = investors.filter((u) => u.statusKyc === status).length;
          const labels = { NOT_INITIATED: 'Non initié', PENDING: 'En attente', VALIDATED: 'Validé', REFUSED: 'Refusé' };
          return (
            <div key={status} className="bg-white border border-gray-100 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-gray-900">{count}</p>
              <p className="text-xs text-gray-500 mt-0.5">{labels[status]}</p>
            </div>
          );
        })}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="bg-white rounded-xl h-14 animate-pulse border border-gray-100" />)}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Inscrits sans KYC */}
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Sans KYC ({noKyc.length})</h2>
            <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
              {noKyc.length === 0 ? (
                <p className="px-4 py-6 text-sm text-gray-400 text-center">Aucun</p>
              ) : noKyc.map((u, i) => <UserRow key={u.id} u={u} i={i} />)}
            </div>
          </section>

          {/* Avec KYC */}
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Avec KYC ({withKyc.length})</h2>
            <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
              {withKyc.length === 0 ? (
                <p className="px-4 py-6 text-sm text-gray-400 text-center">Aucun</p>
              ) : withKyc.map((u, i) => <UserRow key={u.id} u={u} i={i} />)}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
