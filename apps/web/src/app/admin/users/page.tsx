'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { KycBadge } from '@/components/ui/KycBadge';

interface AdminUser {
  id: string;
  email: string;
  role: string;
  statusKyc: string;
  profileType: string;
  createdAt: string;
  physicalProfile?: { firstName: string; lastName: string } | null;
}

export default function AdminUsersPage() {
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get<AdminUser[]>('/api/users/admin/list'),
  });

  const investors = users.filter((u) => u.role === 'INVESTOR');

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Investisseurs</h1>
        <p className="text-gray-500 mt-0.5">{investors.length} compte{investors.length > 1 ? 's' : ''} enregistré{investors.length > 1 ? 's' : ''}</p>
      </div>

      {/* Stats KYC */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {(['NOT_INITIATED', 'PENDING', 'VALIDATED', 'REFUSED'] as const).map((status) => {
          const count = investors.filter((u) => u.statusKyc === status).length;
          const labels = { NOT_INITIATED: 'Non initié', PENDING: 'En attente', VALIDATED: 'Validé', REFUSED: 'Refusé' };
          return (
            <div key={status} className="bg-white border border-gray-100 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{count}</p>
              <p className="text-xs text-gray-500 mt-1">{labels[status]}</p>
            </div>
          );
        })}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="bg-white rounded-2xl h-16 animate-pulse border border-gray-100" />)}
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-6 py-3">Investisseur</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-6 py-3">Type</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-6 py-3">KYC</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-6 py-3">Inscrit le</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {investors.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900 text-sm">
                      {user.physicalProfile
                        ? `${user.physicalProfile.firstName} ${user.physicalProfile.lastName}`
                        : '—'}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{user.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">
                      {user.profileType === 'PHYSICAL' ? 'Pers. physique' : 'Pers. morale'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <KycBadge status={user.statusKyc as any} />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                </tr>
              ))}
              {investors.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-400 text-sm">
                    Aucun investisseur enregistré
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
