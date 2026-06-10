'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatEuros, progressPercent } from '@/lib/utils';
import { Project } from '@/types';
import { Plus, Pencil, Eye } from 'lucide-react';

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  DRAFT:  { label: 'Brouillon', className: 'bg-gray-100 text-gray-600' },
  ACTIVE: { label: 'Actif',     className: 'bg-green-100 text-green-700' },
  FUNDED: { label: 'Financé',   className: 'bg-blue-100 text-blue-700' },
  CLOSED: { label: 'Clôturé',   className: 'bg-red-100 text-red-600' },
};

export default function AdminProjectsPage() {
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['admin-projects'],
    queryFn: () => api.get<Project[]>('/api/projects'),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projets immobiliers</h1>
          <p className="text-gray-500 mt-0.5">{projects.length} projet{projects.length > 1 ? 's' : ''}</p>
        </div>
        <Link
          href="/admin/projects/new"
          className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white font-medium px-4 py-2.5 rounded-xl transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          Nouveau projet
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="bg-white rounded-2xl h-24 animate-pulse border border-gray-100" />)}
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-2xl border border-gray-100">
          <p className="text-4xl mb-3">🏗️</p>
          <p className="text-gray-500 mb-4">Aucun projet pour le moment</p>
          <Link href="/admin/projects/new" className="text-blue-700 font-medium hover:underline text-sm">
            Créer votre premier projet →
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-6 py-3">Projet</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-6 py-3">Progression</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-6 py-3">Rendement</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-6 py-3">Statut</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {projects.map((project) => {
                const pct = progressPercent(project.collectedAmount, project.collectionGoal);
                const status = STATUS_LABELS[project.status] ?? STATUS_LABELS.DRAFT;
                return (
                  <tr key={project.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900 text-sm">{project.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{project.address}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-32">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-500">{formatEuros(project.collectedAmount)}</span>
                          <span className="font-semibold text-gray-800">{pct}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">/ {formatEuros(project.collectionGoal)}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-green-700">{project.annualYield}% /an</span>
                      <p className="text-xs text-gray-400">{project.durationMonths} mois</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${status.className}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 justify-end">
                        <Link href={`/projects/${project.id}`} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Voir">
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link href={`/admin/projects/${project.id}`} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Modifier">
                          <Pencil className="w-4 h-4" />
                        </Link>
                      </div>
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
