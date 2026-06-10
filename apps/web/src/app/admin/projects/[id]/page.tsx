'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Project } from '@/types';
import { ProjectForm } from '@/components/projects/ProjectForm';

export default function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => api.get<Project>(`/api/projects/${id}`),
  });

  if (isLoading) return <p className="text-gray-400">Chargement...</p>;
  if (!project) return <p className="text-red-500">Projet introuvable</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Modifier le projet</h1>
      <p className="text-gray-500 mb-8">{project.name}</p>
      <ProjectForm project={project} />
    </div>
  );
}
