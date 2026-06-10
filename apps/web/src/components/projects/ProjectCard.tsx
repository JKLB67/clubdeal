import Link from 'next/link';
import { Project } from '@/types';
import { formatEuros, progressPercent } from '@/lib/utils';
import { MapPin, TrendingUp, Clock } from 'lucide-react';

export function ProjectCard({ project }: { project: Project }) {
  const progress = progressPercent(project.collectedAmount, project.collectionGoal);
  const coverPhoto = project.photos[0]?.url;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
      {/* Photo */}
      <div className="h-48 bg-gradient-to-br from-blue-100 to-blue-200 relative overflow-hidden">
        {coverPhoto ? (
          <img src={coverPhoto} alt={project.name} className="w-full h-full object-cover" />
        ) : (
          <div className="flex items-center justify-center h-full text-blue-300 text-5xl">🏗️</div>
        )}
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-semibold text-green-700">
          {project.annualYield}% /an
        </div>
      </div>

      {/* Contenu */}
      <div className="p-5">
        <h3 className="font-bold text-gray-900 text-lg leading-tight mb-1">{project.name}</h3>

        <div className="flex items-center gap-1 text-gray-500 text-sm mb-4">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">{project.address}</span>
        </div>

        {/* Barre de progression */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1.5">
            <span className="font-semibold text-gray-900">{formatEuros(project.collectedAmount)}</span>
            <span className="text-gray-500">sur {formatEuros(project.collectionGoal)}</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-right text-xs text-gray-500 mt-1">{progress}% financé</p>
        </div>

        {/* Méta */}
        <div className="flex gap-4 text-sm text-gray-600 mb-5">
          <div className="flex items-center gap-1">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <span>{project.annualYield}% /an</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4 text-blue-500" />
            <span>{project.durationMonths} mois</span>
          </div>
          {project.precommercialisationRate && (
            <div className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
              {project.precommercialisationRate}% précomm.
            </div>
          )}
        </div>

        <Link
          href={`/projects/${project.id}`}
          className="block w-full text-center bg-blue-700 hover:bg-blue-800 text-white font-medium py-2.5 rounded-xl transition-colors"
        >
          En savoir +
        </Link>
      </div>
    </div>
  );
}
