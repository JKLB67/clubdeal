'use client';

import { use, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { KycBadge } from '@/components/ui/KycBadge';
import { useAuth } from '@/context/auth';
import { api } from '@/lib/api';
import { Project } from '@/types';
import { formatEuros, progressPercent, daysRemaining } from '@/lib/utils';
import { MapPin, TrendingUp, Clock, FileText, ChevronLeft, ChevronRight, X, ZoomIn, CalendarClock, Euro, Heart, Bell, Download } from 'lucide-react';
import { PdfViewer } from '@/components/ui/PdfViewer';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function YieldSimulator({ annualYield, durationMonths, minInvestment, collectionGoal, collectedAmount }: {
  annualYield: string; durationMonths: number; minInvestment?: string | null;
  collectionGoal: string; collectedAmount: string;
}) {
  const minEuros = minInvestment ? Math.ceil(Number(minInvestment) / 100) : 1000;
  const availableEuros = Math.floor((Number(collectionGoal) - Number(collectedAmount)) / 100);
  const [amount, setAmount] = useState(String(Math.min(Math.max(minEuros, 10000), availableEuros)));

  const invested = parseFloat(amount) || 0;
  const yieldRate = parseFloat(annualYield) / 100;
  const years = durationMonths / 12;
  const grossReturn = invested * yieldRate * years;
  const totalGross = invested + grossReturn;
  const belowMin = invested > 0 && invested < minEuros;
  const aboveMax = invested > 0 && availableEuros > 0 && invested > availableEuros;

  return (
    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
      <h3 className="font-bold text-gray-900 text-lg mb-4">Simulateur de rendement</h3>
      <div className="mb-2">
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Montant investi (€)</label>
        <input
          type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
          min={minEuros} max={availableEuros} step={1000}
          className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 bg-white ${belowMin || aboveMax ? 'border-red-400 focus:ring-red-400' : 'border-blue-200 focus:ring-blue-500'}`}
        />
      </div>
      {aboveMax && (
        <p className="text-red-600 text-xs font-medium mb-3">
          ⚠️ Dépasse le montant disponible : {availableEuros.toLocaleString('fr-FR')} €
        </p>
      )}
      {belowMin && !aboveMax && (
        <p className="text-red-600 text-xs font-medium mb-3">
          ⚠️ Montant minimum : {minEuros.toLocaleString('fr-FR')} €
        </p>
      )}
      {!belowMin && !aboveMax && (
        <p className="text-xs text-gray-400 mb-3">Min : {minEuros.toLocaleString('fr-FR')} € · Max disponible : {availableEuros.toLocaleString('fr-FR')} €</p>
      )}
      {invested > 0 && !belowMin && !aboveMax && (
        <div className="space-y-3 pt-2 border-t border-blue-200">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Capital investi</span>
            <span className="font-semibold">{invested.toLocaleString('fr-FR')} €</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Intérêts bruts sur {durationMonths} mois</span>
            <span className="font-semibold text-green-700">+{grossReturn.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €</span>
          </div>
          <div className="flex justify-between text-sm border-t border-blue-200 pt-3">
            <span className="font-bold text-gray-900">Total brut avant impôts</span>
            <span className="font-bold text-blue-700 text-lg">{totalGross.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €</span>
          </div>
          <p className="text-xs text-gray-400">Simulation indicative. Les rendements ne sont pas garantis. Hors fiscalité.</p>
        </div>
      )}
    </div>
  );
}

function DocumentsSection({ projectId, documents, isLoggedIn }: {
  projectId: string;
  documents: { id: string; name: string; label?: string | null }[];
  isLoggedIn: boolean;
}) {
  const [preview, setPreview] = useState<{ id: string; name: string } | null>(null);

  return (
    <div>
      {preview && (
        <PdfViewer
          path={`/api/projects/${projectId}/documents/${preview.id}/download`}
          filename={preview.name}
          onClose={() => setPreview(null)}
        />
      )}

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-gray-900">Documents du projet</h2>
      </div>

      <div className="space-y-2">
        {documents.map((doc) => (
          <div key={doc.id} className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-4 py-3 hover:border-blue-200 transition-colors">
            <FileText className="w-5 h-5 text-blue-500 flex-shrink-0" />
            <span className="text-sm text-gray-700 flex-1">{doc.label ?? doc.name}</span>
            {isLoggedIn ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreview({ id: doc.id, name: doc.label ?? doc.name })}
                  className="flex items-center gap-1 text-gray-500 hover:text-blue-700 text-xs font-medium border border-gray-200 rounded-lg px-2.5 py-1 hover:border-blue-300 transition-colors"
                >
                  <ZoomIn className="w-3.5 h-3.5" /> Lire
                </button>
                <button
                  onClick={() => api.download(`/api/projects/${projectId}/documents/${doc.id}/download`, `${doc.label ?? doc.name}.pdf`)}
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium"
                >
                  <Download className="w-3.5 h-3.5" /> Télécharger
                </button>
              </div>
            ) : (
              <span className="text-xs text-gray-400">Connectez-vous</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function PhotoGallery({ photos, name }: { photos: { id: string; url: string }[]; name: string }) {
  const [idx, setIdx] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);

  if (photos.length === 0) {
    return (
      <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-blue-100 to-blue-200 h-64 flex items-center justify-center text-blue-300 text-7xl">
        🏗️
      </div>
    );
  }

  const prev = () => setIdx((i) => (i - 1 + photos.length) % photos.length);
  const next = () => setIdx((i) => (i + 1) % photos.length);
  const prevLb = () => setLightbox((i) => ((i ?? 0) - 1 + photos.length) % photos.length);
  const nextLb = () => setLightbox((i) => ((i ?? 0) + 1) % photos.length);

  return (
    <>
      {/* Carousel principal */}
      <div className="rounded-2xl overflow-hidden bg-gray-100 h-72 relative group">
        <img
          src={photos[idx].url}
          alt={`${name} — photo ${idx + 1}`}
          className="w-full h-full object-cover cursor-zoom-in transition-opacity duration-300"
          onClick={() => setLightbox(idx)}
        />

        {photos.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {photos.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  className={`w-2 h-2 rounded-full transition-colors ${i === idx ? 'bg-white' : 'bg-white/40'}`}
                />
              ))}
            </div>
          </>
        )}

        <button
          onClick={() => setLightbox(idx)}
          className="absolute top-3 right-3 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <div className="absolute bottom-3 right-3 bg-black/40 text-white text-xs rounded-full px-2.5 py-1">
          {idx + 1} / {photos.length}
        </div>
      </div>

      {/* Miniatures */}
      {photos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 mt-3">
          {photos.map((photo, i) => (
            <button
              key={photo.id}
              onClick={() => setIdx(i)}
              className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                i === idx ? 'border-blue-600 scale-105' : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              <img src={photo.url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 text-white bg-white/10 hover:bg-white/20 rounded-full p-2 z-10"
          >
            <X className="w-6 h-6" />
          </button>

          {photos.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prevLb(); }}
                className="absolute left-4 text-white bg-white/10 hover:bg-white/20 rounded-full p-3 z-10"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); nextLb(); }}
                className="absolute right-4 text-white bg-white/10 hover:bg-white/20 rounded-full p-3 z-10"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          <img
            src={photos[lightbox].url}
            alt={`${name} — photo ${lightbox + 1}`}
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />

          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-sm">
            {lightbox + 1} / {photos.length}
          </p>
        </div>
      )}
    </>
  );
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const [localProject, setLocalProject] = useState<Project | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const { data: fetched, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => api.get<Project>(`/api/projects/${id}`),
  });

  // Investissements de l'utilisateur pour ce projet
  const { data: myInvestments = [] } = useQuery({
    queryKey: ['my-investments'],
    queryFn: () => api.get<{ id: string; status: string; project: { id: string } }[]>('/api/investments/mine'),
    enabled: !!user,
  });

  const project = localProject ?? fetched;

  useEffect(() => {
    if (!project?.address) return;
    fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(project.address)}&limit=1`)
      .then((r) => r.json())
      .then((data) => {
        const feature = data?.features?.[0];
        if (feature) {
          const [lng, lat] = feature.geometry.coordinates;
          setCoords({ lat, lng });
        }
      })
      .catch(() => {});
  }, [project?.address]);

  const existingInvestment = myInvestments.find(
    (i) => i.project?.id === id && !['CANCELLED', 'FAILED'].includes(i.status)
  );

  async function toggleFavorite() {
    if (!user || !project) return;
    const res = await api.post<{ isFavorite: boolean; favoritesCount?: number }>(`/api/projects/${project.id}/favorite`, {});
    setLocalProject({
      ...project,
      isFavorite: res.isFavorite,
      _count: { ...(project._count ?? { investments: 0, favorites: 0 }), favorites: res.favoritesCount ?? (project._count?.favorites ?? 0) },
    });
  }

  async function toggleAlert(type: string) {
    if (!user || !project) return;
    const res = await api.post<{ active: boolean; type: string }>(`/api/projects/${project.id}/alert`, { type });
    setLocalProject({
      ...(project),
      myAlerts: res.active
        ? [...(project.myAlerts ?? []), type]
        : (project.myAlerts ?? []).filter((a) => a !== type),
    });
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-gray-400">Chargement...</div>
      </div>
    );
  }

  if (!project) return null;

  const progress = progressPercent(project!.collectedAmount, project!.collectionGoal);
  const isFull = Number(project!.collectedAmount) >= Number(project!.collectionGoal);
  const kycValidated = user?.statusKyc === 'VALIDATED';
  const days = daysRemaining(project!.closingDate);
  const daysOpen = daysRemaining(project!.openingDate);
  const isUpcoming = daysOpen !== null && daysOpen > 0;
  const bellDoc = (project!.myAlerts ?? []).includes('DOCUMENT_CHANGE');
  const bellOpen = (project!.myAlerts ?? []).includes('COLLECTION_START');
  const favCount = project!._count?.favorites ?? 0;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(project!.address)}`;
  const streetviewUrl = coords
    ? `https://www.google.com/maps?q=${coords.lat},${coords.lng}&layer=c&cbll=${coords.lat},${coords.lng}`
    : null;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-10">
        {/* Retour */}
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-700 mb-6">
          <ChevronLeft className="w-4 h-4" />
          Retour aux collectes
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Colonne principale */}
          <div className="lg:col-span-2 space-y-6">
            {/* Photos */}
            <PhotoGallery photos={project!.photos} name={project!.name} />

            {/* Infos + actions */}
            <div>
              <div className="flex items-start justify-between gap-3">
                <h1 className="text-2xl font-bold text-gray-900">{project!.name}</h1>
                {user && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={toggleFavorite} title={project!.isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                      className="flex items-center gap-1 px-2 py-1.5 rounded-xl border border-gray-200 hover:border-red-300 transition-colors">
                      <Heart className={`w-4 h-4 ${project!.isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
                      {favCount > 0 && <span className="text-xs text-gray-500 font-medium">{favCount}</span>}
                    </button>
                    <div className="relative group">
                      <button onClick={() => toggleAlert('DOCUMENT_CHANGE')}
                        title="Alerte nouveaux documents"
                        className={`p-2 rounded-xl border transition-colors ${bellDoc ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-200 text-gray-400 hover:border-blue-300'}`}>
                        <Bell className="w-5 h-5" />
                      </button>
                      <div className="absolute right-0 top-full mt-1.5 w-52 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        {bellDoc ? 'Désactiver' : 'Activer'} l'alerte email lors de l'ajout de nouveaux documents
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 text-gray-500 text-sm mt-1 flex-wrap">
                <MapPin className="w-4 h-4 flex-shrink-0" />
                <span>{project!.address}</span>
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 border border-blue-200 rounded-md px-2 py-0.5 hover:bg-blue-50 transition-colors"
                  title="Voir sur Google Maps">
                  <MapPin className="w-3 h-3" /> Maps
                </a>
                {streetviewUrl && (
                  <a href={streetviewUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-green-600 hover:text-green-800 border border-green-200 rounded-md px-2 py-0.5 hover:bg-green-50 transition-colors"
                    title="StreetView">
                    👁 StreetView
                  </a>
                )}
              </div>
              {isUpcoming && (
                <div className="mt-3 flex items-center gap-2 bg-purple-50 border border-purple-100 rounded-xl px-4 py-2.5">
                  <CalendarClock className="w-4 h-4 text-purple-600 flex-shrink-0" />
                  <span className="text-purple-700 text-sm font-medium flex-1">Collecte dans {daysOpen} jour{daysOpen! > 1 ? 's' : ''}</span>
                  {user && (
                    <div className="relative group">
                      <button onClick={() => toggleAlert('COLLECTION_START')}
                        className={`p-1.5 rounded-lg transition-colors ${bellOpen ? 'bg-purple-600 text-white' : 'text-purple-400 hover:text-purple-700'}`}>
                        <Bell className="w-4 h-4" />
                      </button>
                      <div className="absolute right-0 top-full mt-1.5 w-52 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        {bellOpen ? 'Désactiver' : 'Activer'} l'alerte email 48h avant l'ouverture de la collecte
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {project!.description && (
              <p className="text-gray-600 leading-relaxed">{project!.description}</p>
            )}

            {/* Métriques */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { icon: TrendingUp, label: 'Rendement', value: `${project!.annualYield}% /an` },
                { icon: Clock, label: 'Durée', value: `${project!.durationMonths} mois` },
                { icon: FileText, label: 'Précomm.', value: project!.precommercialisationRate ? `${project!.precommercialisationRate}%` : 'N/A' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="bg-white border border-gray-100 rounded-xl p-4 text-center">
                  <Icon className="w-5 h-5 text-blue-600 mx-auto mb-1.5" />
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="font-bold text-gray-900 mt-0.5">{value}</p>
                </div>
              ))}
            </div>

            {/* Documents */}
            {project!.documents && project!.documents.length > 0 && (
              <DocumentsSection projectId={project!.id} documents={project!.documents} isLoggedIn={!!user} />
            )}

            {/* Simulateur */}
            <YieldSimulator annualYield={project!.annualYield} durationMonths={project!.durationMonths} minInvestment={project!.minInvestment} collectionGoal={project!.collectionGoal} collectedAmount={project!.collectedAmount} />
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            <div className="bg-white border border-gray-100 rounded-2xl p-6 sticky top-6">
              <h2 className="font-bold text-gray-900 mb-4">Progression de la collecte</h2>

              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-bold text-gray-900 text-lg">{formatEuros(project!.collectedAmount)}</span>
                  <span className="text-gray-500 text-sm self-end">sur {formatEuros(project!.collectionGoal)}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-right text-sm font-semibold text-blue-700 mt-1.5">{progress}% financé</p>
              </div>

              <div className="border-t border-gray-100 pt-4 mb-5 text-sm text-gray-600 space-y-2">
                <div className="flex justify-between">
                  <span>Investisseurs</span>
                  <span className="font-semibold text-gray-900">{project!._count?.investments ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Durée</span>
                  <span className="font-semibold text-gray-900">{project!.durationMonths} mois</span>
                </div>
                {project!.minInvestment && (
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1"><Euro className="w-3.5 h-3.5" />Ticket minimum</span>
                    <span className="font-semibold text-gray-900">{formatEuros(project!.minInvestment)}</span>
                  </div>
                )}
                {days !== null && (
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1"><CalendarClock className="w-3.5 h-3.5" />Clôture</span>
                    <span className={`font-semibold ${days <= 7 ? 'text-red-600' : days <= 30 ? 'text-orange-500' : 'text-gray-900'}`}>
                      {days > 0 ? `${days} jour${days > 1 ? 's' : ''}` : 'Clôturé'}
                    </span>
                  </div>
                )}
              </div>

              {/* CTA */}
              {!user ? (
                <Link
                  href="/login"
                  className="block w-full text-center bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 rounded-xl transition-colors"
                >
                  Se connecter pour investir
                </Link>
              ) : isFull ? (
                <button
                  disabled
                  className="w-full bg-gray-200 text-gray-500 font-semibold py-3 rounded-xl cursor-not-allowed"
                >
                  Collecte complète
                </button>
              ) : existingInvestment ? (
                <Link
                  href={`/invest/${project!.id}`}
                  className="block w-full text-center bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition-colors"
                >
                  ✓ Participation enregistrée
                </Link>
              ) : kycValidated ? (
                <Link
                  href={`/invest/${project!.id}`}
                  className="block w-full text-center bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 rounded-xl transition-colors"
                >
                  Participer à la collecte
                </Link>
              ) : (
                <div className="space-y-3">
                  <button
                    disabled
                    className="w-full bg-gray-200 text-gray-400 font-semibold py-3 rounded-xl cursor-not-allowed"
                  >
                    Participer à la collecte
                  </button>
                  <div className="text-center">
                    <KycBadge status={user.statusKyc} />
                    <p className="text-xs text-gray-500 mt-1.5">Validez votre KYC pour investir</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
