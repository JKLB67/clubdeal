'use client';

import { use, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Project } from '@/types';
import { ProjectForm } from '@/components/projects/ProjectForm';
import { AdminPhotosTab } from '@/components/admin/AdminPhotosTab';
import { AdminInvestorsTab } from '@/components/admin/AdminInvestorsTab';
import { AdminCollectedTab } from '@/components/admin/AdminCollectedTab';
import { AdminDocumentsTab } from '@/components/admin/AdminDocumentsTab';
import { AdminContractTab } from '@/components/admin/AdminContractTab';

const TABS = [
  { id: 'general',    label: 'Général' },
  { id: 'photos',     label: 'Photos' },
  { id: 'documents',  label: 'Documents' },
  { id: 'investors',  label: 'Investisseurs' },
  { id: 'collected',  label: 'Collecte' },
  { id: 'contract',   label: 'Contrat' },
] as const;
type Tab = typeof TABS[number]['id'];

export default function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [tab, setTab] = useState<Tab>('general');

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => api.get<Project>(`/api/projects/${id}`),
  });

  if (isLoading) return <p className="text-gray-400">Chargement...</p>;
  if (!project) return <p className="text-red-500">Projet introuvable</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Modifier le projet</h1>
      <p className="text-gray-500 mb-6">{project.name}</p>

      {/* Onglets */}
      <div className="flex gap-1 border-b border-gray-200 mb-8">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
              tab === t.id
                ? 'border-b-2 border-blue-600 text-blue-700 bg-blue-50/60'
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'general'   && <ProjectForm project={project} />}
      {tab === 'photos'    && <AdminPhotosTab project={project} />}
      {tab === 'documents' && <AdminDocumentsTab project={project} />}
      {tab === 'investors' && <AdminInvestorsTab projectId={id} tenantId={project.id} />}
      {tab === 'collected' && <AdminCollectedTab project={project} />}
      {tab === 'contract'  && <AdminContractTab project={project} />}
    </div>
  );
}
