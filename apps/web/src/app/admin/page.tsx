'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatEuros, progressPercent } from '@/lib/utils';
import { Project } from '@/types';
import { Building2, Users, TrendingUp, Euro, Plus } from 'lucide-react';

interface AdminUser {
  id: string;
  email: string;
  statusKyc: string;
  createdAt: string;
  physicalProfile?: { firstName: string; lastName: string } | null;
}

function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: string | number; icon: any; color: string;
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-6 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { data: projects = [] } = useQuery({
    queryKey: ['admin-projects'],
    queryFn: () => api.get<Project[]>('/api/projects'),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get<AdminUser[]>('/api/users/admin/list'),
  });

  const totalCollected = projects.reduce((sum, p) => sum + Number(p.collectedAmount), 0);
  const activeProjects = projects.filter((p) => p.status === 'ACTIVE').length;
  const kycValidated = users.filter((u) => u.statusKyc === 'VALIDATED').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-0.5">Vue d'ensemble de votre plateforme</p>
        </div>
        <Link
          href="/admin/projects/new"
          className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white font-medium px-4 py-2.5 rounded-xl transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          Nouveau projet
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard label="Projets actifs"     value={activeProjects}              icon={Building2}   color="bg-blue-50 text-blue-600" />
        <StatCard label="Investisseurs"      value={users.length}                icon={Users}       color="bg-purple-50 text-purple-600" />
        <StatCard label="KYC validés"        value={kycValidated}               icon={TrendingUp}  color="bg-green-50 text-green-600" />
        <StatCard label="Total collecté"     value={formatEuros(totalCollected * 100)} icon={Euro} color="bg-amber-50 text-amber-600" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Projets */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">Projets en cours</h2>
            <Link href="/admin/projects" className="text-sm text-blue-600 hover:underline">Voir tout</Link>
          </div>
          <div className="space-y-4">
            {projects.slice(0, 4).map((p) => {
              const pct = progressPercent(p.collectedAmount, p.collectionGoal);
              return (
                <Link key={p.id} href={`/admin/projects/${p.id}`} className="block group">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-800 group-hover:text-blue-700">{p.name}</span>
                    <span className="text-gray-500">{pct}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {formatEuros(p.collectedAmount)} sur {formatEuros(p.collectionGoal)}
                  </p>
                </Link>
              );
            })}
            {projects.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">Aucun projet actif</p>
            )}
          </div>
        </div>

        {/* Derniers investisseurs */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">Derniers investisseurs</h2>
            <Link href="/admin/users" className="text-sm text-blue-600 hover:underline">Voir tout</Link>
          </div>
          <div className="space-y-3">
            {users.slice(0, 5).map((u) => (
              <div key={u.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {u.physicalProfile ? `${u.physicalProfile.firstName} ${u.physicalProfile.lastName}` : u.email}
                  </p>
                  <p className="text-xs text-gray-400">{u.email}</p>
                </div>
                <KycPill status={u.statusKyc} />
              </div>
            ))}
            {users.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">Aucun investisseur</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function KycPill({ status }: { status: string }) {
  const cfg: Record<string, string> = {
    VALIDATED:    'bg-green-100 text-green-700',
    PENDING:      'bg-yellow-100 text-yellow-700',
    REFUSED:      'bg-red-100 text-red-700',
    NOT_INITIATED:'bg-gray-100 text-gray-500',
  };
  const labels: Record<string, string> = {
    VALIDATED: 'Validé', PENDING: 'En cours', REFUSED: 'Refusé', NOT_INITIATED: 'Non initié',
  };
  return (
    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${cfg[status] ?? cfg.NOT_INITIATED}`}>
      {labels[status] ?? status}
    </span>
  );
}
