'use client';

import { useQuery } from '@tanstack/react-query';
import { Navbar } from '@/components/layout/Navbar';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { KycBadge } from '@/components/ui/KycBadge';
import { useAuth } from '@/context/auth';
import { api } from '@/lib/api';
import { Project } from '@/types';

export default function HomePage() {
  const { user } = useAuth();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get<Project[]>('/api/projects'),
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-10">
        {/* Bannière KYC */}
        {user && user.statusKyc !== 'VALIDATED' && (
          <div className="mb-8 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-amber-800">Vérification d'identité requise</p>
              <p className="text-sm text-amber-700 mt-0.5">
                Complétez votre KYC pour pouvoir investir dans les projets.
              </p>
            </div>
            <KycBadge status={user.statusKyc} />
          </div>
        )}

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Collectes en cours</h1>
          <p className="text-gray-500 mt-1">Découvrez nos opportunités d'investissement immobilier.</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 h-96 animate-pulse" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-24 text-gray-400">
            <p className="text-5xl mb-4">🏗️</p>
            <p className="text-lg">Aucun projet disponible pour le moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
