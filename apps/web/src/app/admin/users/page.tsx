'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { KycBadge } from '@/components/ui/KycBadge';
import { ChevronRight, UserX } from 'lucide-react';

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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Investisseurs</h1>
        <p className="text-gray-500 text-sm mt-0.5">{investors.length} compte{investors.length > 1 ? 's' : ''} enregistré{investors.length > 1 ? 's' : ''}</p>
      </div>

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
              ) : noKyc.map((u, i) => (
                <Link key={u.id} href={`/admin/users/${u.id}`}
                  className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${i > 0 ? 'border-t border-gray-50' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm">{displayName(u)}</p>
                    <p className="text-xs text-gray-400 truncate">{u.email}</p>
                  </div>
                  <span className="text-xs text-gray-400">{u.profileType === 'PHYSICAL' ? 'Physique' : 'Morale'}</span>
                  {u.isSuspended && <UserX className="w-4 h-4 text-red-400" />}
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </Link>
              ))}
            </div>
          </section>

          {/* Avec KYC */}
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Avec KYC ({withKyc.length})</h2>
            <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
              {withKyc.length === 0 ? (
                <p className="px-4 py-6 text-sm text-gray-400 text-center">Aucun</p>
              ) : withKyc.map((u, i) => (
                <Link key={u.id} href={`/admin/users/${u.id}`}
                  className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${i > 0 ? 'border-t border-gray-50' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm">{displayName(u)}</p>
                    <p className="text-xs text-gray-400 truncate">{u.email}</p>
                  </div>
                  <KycBadge status={u.statusKyc as any} />
                  <span className="text-xs text-gray-400">{u.profileType === 'PHYSICAL' ? 'Physique' : 'Morale'}</span>
                  {u.isSuspended && <UserX className="w-4 h-4 text-red-400" />}
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </Link>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
