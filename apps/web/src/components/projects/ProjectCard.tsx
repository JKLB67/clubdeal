'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { Project } from '@/types';
import { formatEuros, progressPercent, daysRemaining } from '@/lib/utils';
import { MapPin, TrendingUp, Clock, ChevronLeft, ChevronRight, CalendarClock, Euro, Heart, Bell } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/auth';

export function ProjectCard({ project: initial }: { project: Project }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [project, setProject] = useState(initial);
  const photos = project.photos;
  const [idx, setIdx] = useState(0);
  const progress = progressPercent(project.collectedAmount, project.collectionGoal);
  const daysClose = daysRemaining(project.closingDate);
  const daysOpen  = daysRemaining(project.openingDate);
  const isUpcoming = daysOpen !== null && daysOpen > 0;

  function prev(e: React.MouseEvent) { e.preventDefault(); setIdx((i) => (i - 1 + photos.length) % photos.length); }
  function next(e: React.MouseEvent) { e.preventDefault(); setIdx((i) => (i + 1) % photos.length); }

  async function toggleFavorite(e: React.MouseEvent) {
    e.preventDefault();
    if (!user) return;
    const res = await api.post<{ isFavorite: boolean; favoritesCount?: number }>(`/api/projects/${project.id}/favorite`, {});
    setProject((p) => ({
      ...p,
      isFavorite: res.isFavorite,
      _count: { ...(p._count ?? { investments: 0, favorites: 0 }), favorites: res.favoritesCount ?? (p._count?.favorites ?? 0) },
    }));
    // Synchroniser le cache React Query pour la page de détail
    qc.invalidateQueries({ queryKey: ['project', project.id] });
  }

  async function toggleBell(e: React.MouseEvent) {
    e.preventDefault();
    if (!user) return;
    const res = await api.post<{ active: boolean }>(`/api/projects/${project.id}/alert`, { type: 'COLLECTION_START' });
    setProject((p) => ({
      ...p,
      myAlerts: res.active
        ? [...(p.myAlerts ?? []), 'COLLECTION_START']
        : (p.myAlerts ?? []).filter((a) => a !== 'COLLECTION_START'),
    }));
  }

  const bellActive = (project.myAlerts ?? []).includes('COLLECTION_START');

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
      {/* Carousel photo */}
      <div className="h-48 bg-gradient-to-br from-blue-100 to-blue-200 relative overflow-hidden group">
        {photos.length > 0 ? (
          <>
            <img src={photos[idx].url} alt={project.name} className="w-full h-full object-cover transition-opacity duration-300" />
            {photos.length > 1 && (
              <>
                <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronRight className="w-4 h-4" />
                </button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                  {photos.map((_, i) => (
                    <button key={i} onClick={(e) => { e.preventDefault(); setIdx(i); }}
                      className={`w-1.5 h-1.5 rounded-full transition-colors ${i === idx ? 'bg-white' : 'bg-white/50'}`} />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-blue-300 text-5xl">🏗️</div>
        )}

        {/* Badges superposés */}
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-semibold text-green-700">
          {project.annualYield}% /an
        </div>
        {user && (
          <button onClick={toggleFavorite}
            className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 transition-colors hover:bg-white flex items-center gap-1"
            title={project.isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          >
            <Heart className={`w-4 h-4 transition-colors ${project.isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
            {(project._count?.favorites ?? 0) > 0 && (
              <span className="text-xs font-semibold text-gray-600">{project._count!.favorites}</span>
            )}
          </button>
        )}

        {/* Badge "Bientôt" pour les projets à venir */}
        {isUpcoming && (
          <div className="absolute bottom-2 left-2 bg-purple-600 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
            Ouverture dans {daysOpen}j
          </div>
        )}
      </div>

      {/* Contenu */}
      <div className="p-5">
        <h3 className="font-bold text-gray-900 text-lg leading-tight mb-1">{project.name}</h3>
        <div className="flex items-center gap-1 text-gray-500 text-sm mb-4">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">{project.address}</span>
        </div>

        {/* Barre de progression */}
        <div className="mb-3">
          <div className="flex justify-between text-sm mb-1.5">
            <span className="font-semibold text-gray-900">{formatEuros(project.collectedAmount)}</span>
            <span className="text-gray-500">sur {formatEuros(project.collectionGoal)}</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-right text-xs text-gray-500 mt-1">{progress}% financé</p>
        </div>

        {/* Méta */}
        <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-3">
          <div className="flex items-center gap-1"><TrendingUp className="w-4 h-4 text-blue-500" />{project.annualYield}% /an</div>
          <div className="flex items-center gap-1"><Clock className="w-4 h-4 text-blue-500" />{project.durationMonths} mois</div>
          {project.precommercialisationRate && (
            <div className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium self-center">
              {project.precommercialisationRate}% précomm.
            </div>
          )}
        </div>

        {/* Ticket min + dates */}
        <div className="flex items-center justify-between text-xs mb-4">
          {project.minInvestment ? (
            <div className="flex items-center gap-1 font-medium text-gray-700">
              <Euro className="w-3.5 h-3.5 text-green-600" />Min. {formatEuros(project.minInvestment)}
            </div>
          ) : <span />}
          {daysClose !== null && !isUpcoming && (
            <div className={`flex items-center gap-1 font-semibold ${daysClose <= 7 ? 'text-red-600' : daysClose <= 30 ? 'text-orange-500' : 'text-gray-500'}`}>
              <CalendarClock className="w-3.5 h-3.5" />
              {daysClose > 0 ? `${daysClose}j restants` : 'Clôturé'}
            </div>
          )}
        </div>

        {/* CTA + cloche pour projets à venir */}
        {isUpcoming ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 text-center bg-purple-50 text-purple-700 font-medium py-2.5 rounded-xl text-sm border border-purple-100">
              Collecte dans {daysOpen} jour{daysOpen! > 1 ? 's' : ''}
            </div>
            {user && (
              <button
                onClick={toggleBell}
                title={bellActive ? 'Désactiver le rappel' : 'Être alerté 48h avant l\'ouverture'}
                className={`p-2.5 rounded-xl border transition-colors ${bellActive ? 'bg-purple-600 border-purple-600 text-white' : 'border-gray-200 text-gray-400 hover:border-purple-400 hover:text-purple-600'}`}
              >
                <Bell className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          <Link href={`/projects/${project.id}`}
            className="block w-full text-center bg-blue-700 hover:bg-blue-800 text-white font-medium py-2.5 rounded-xl transition-colors">
            En savoir +
          </Link>
        )}
      </div>
    </div>
  );
}
