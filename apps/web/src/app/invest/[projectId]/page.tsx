'use client';

import { use, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { useAuth } from '@/context/auth';
import { api } from '@/lib/api';
import { Project } from '@/types';
import { formatEuros } from '@/lib/utils';
import { CheckCircle, FileText, CreditCard, ChevronLeft, Loader2, ExternalLink } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

type Step = 'amount' | 'sign' | 'payment' | 'confirmed';

interface Investment {
  id: string;
  amount: string;
  status: string;
  esignRequestId?: string;
  contractUrl?: string;
  project?: { virtualIban?: string; name: string };
}

// ─── Étape 1 : Saisie du montant ────────────────────────────────────────────
function StepAmount({
  project,
  onNext,
}: {
  project: Project;
  onNext: (investment: Investment) => void;
}) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const numAmount = parseFloat(amount) || 0;
  const yieldRate = parseFloat(project.annualYield) / 100;
  const years = project.durationMonths / 12;
  const grossReturn = numAmount * yieldRate * years;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (numAmount < 1000) return setError('Montant minimum : 1 000 €');
    setError('');
    setLoading(true);
    try {
      const inv = await api.post<Investment>('/api/investments', {
        projectId: project.id,
        amount: numAmount,
      });
      onNext(inv);
    } catch (err: any) {
      setError(err.message ?? 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-xl font-bold text-gray-900 mb-1">Montant de l'investissement</h2>
      <p className="text-gray-500 text-sm mb-6">Saisissez le montant que vous souhaitez investir dans ce projet.</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Montant (€)</label>
          <div className="relative">
            <input
              type="number"
              min={1000}
              step={1000}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              placeholder="10 000"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">€</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">Minimum : 1 000 €</p>
        </div>

        {numAmount >= 1000 && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-2">
            <p className="text-sm font-semibold text-blue-800">Simulation</p>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Capital investi</span>
              <span className="font-semibold">{numAmount.toLocaleString('fr-FR')} €</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Intérêts bruts ({project.durationMonths} mois)</span>
              <span className="font-semibold text-green-700">+{grossReturn.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €</span>
            </div>
            <div className="flex justify-between text-sm border-t border-blue-200 pt-2">
              <span className="font-bold text-gray-900">Total brut avant impôts</span>
              <span className="font-bold text-blue-700">{(numAmount + grossReturn).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €</span>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || numAmount < 1000}
          className="w-full bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {loading ? 'Génération du contrat...' : 'Continuer vers la signature →'}
        </button>
      </form>
    </div>
  );
}

// ─── Étape 2 : Signature ─────────────────────────────────────────────────────
function StepSign({
  investment,
  onNext,
}: {
  investment: Investment;
  onNext: (inv: Investment) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSign() {
    setLoading(true);
    setError('');
    try {
      const updated = await api.post<Investment>(`/api/investments/${investment.id}/sign`, {});
      onNext(updated);
    } catch (err: any) {
      setError(err.message ?? 'Erreur lors de la signature');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-xl font-bold text-gray-900 mb-1">Signature du contrat</h2>
      <p className="text-gray-500 text-sm mb-6">
        Votre contrat de souscription a été généré. Lisez-le attentivement avant de signer.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">{error}</div>
      )}

      {/* Aperçu contrat */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">Contrat de souscription</p>
            <p className="text-xs text-gray-400">PDF généré · {formatEuros(investment.amount)}</p>
          </div>
          <a
            href={`${API_URL}/api/investments/${investment.id}/contract`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1.5 text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            <ExternalLink className="w-4 h-4" />
            Lire
          </a>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
          <strong>Mode MVP :</strong> La signature est simulée localement. En production, vous seriez redirigé vers Yousign pour signer électroniquement.
        </div>
      </div>

      <button
        onClick={handleSign}
        disabled={loading}
        className="w-full bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {loading ? 'Signature en cours...' : '✍️ Signer le contrat'}
      </button>
    </div>
  );
}

// ─── Étape 3 : Paiement ──────────────────────────────────────────────────────
function StepPayment({ investment }: { investment: Investment }) {
  const iban = investment.project?.virtualIban ?? 'FR76 1234 5678 9012 3456 7890 123';

  function copyIban() {
    navigator.clipboard.writeText(iban.replace(/\s/g, ''));
  }

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-xl font-bold text-gray-900 mb-1">Effectuez votre virement</h2>
      <p className="text-gray-500 text-sm mb-6">
        Votre contrat est signé. Effectuez maintenant un virement bancaire vers l'IBAN ci-dessous.
        La confirmation sera automatique à réception des fonds.
      </p>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6 space-y-4">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1.5">Montant à virer</p>
          <p className="text-3xl font-bold text-blue-700">{formatEuros(investment.amount)}</p>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1.5">IBAN bénéficiaire</p>
          <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
            <code className="text-sm font-mono text-gray-800 flex-1 tracking-wider">{iban}</code>
            <button
              onClick={copyIban}
              className="text-blue-600 hover:text-blue-800 text-xs font-medium flex-shrink-0"
            >
              Copier
            </button>
          </div>
        </div>

        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1.5">Référence obligatoire</p>
          <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
            <code className="text-sm font-mono text-gray-800">{investment.id}</code>
          </div>
          <p className="text-xs text-gray-400 mt-1.5">⚠️ Indiquez cette référence dans le libellé du virement</p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800 space-y-1.5">
        <p className="font-semibold">Que se passe-t-il ensuite ?</p>
        <p>1. Vous effectuez le virement depuis votre banque.</p>
        <p>2. La réception est détectée automatiquement (1–3 jours ouvrés).</p>
        <p>3. Votre investissement passe au statut <strong>Confirmé</strong> et la jauge du projet se met à jour.</p>
      </div>

      <Link
        href="/account/investments"
        className="mt-6 block w-full text-center border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium py-3 rounded-xl transition-colors text-sm"
      >
        Suivre mes investissements →
      </Link>
    </div>
  );
}

// ─── Page principale ─────────────────────────────────────────────────────────
const STEPS: { key: Step; label: string; icon: any }[] = [
  { key: 'amount',    label: 'Montant',   icon: CreditCard },
  { key: 'sign',      label: 'Signature', icon: FileText },
  { key: 'payment',   label: 'Paiement',  icon: CreditCard },
];

export default function InvestPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const { user } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<Step>('amount');
  const [investment, setInvestment] = useState<Investment | null>(null);

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => api.get<Project>(`/api/projects/${projectId}`),
  });

  if (!user) {
    router.replace('/login');
    return null;
  }

  if (isLoading) return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center text-gray-400">Chargement...</div>
    </div>
  );

  if (!project) return null;

  const stepIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-10">
        {/* Retour */}
        <Link href={`/projects/${projectId}`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-700 mb-8">
          <ChevronLeft className="w-4 h-4" />
          {project.name}
        </Link>

        {/* Barre de progression */}
        <div className="flex items-center gap-0 mb-10">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex items-center flex-1">
              <div className={`flex items-center gap-2 ${i <= stepIndex ? 'text-blue-700' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${
                  i < stepIndex ? 'bg-blue-700 border-blue-700 text-white' :
                  i === stepIndex ? 'border-blue-700 text-blue-700' :
                  'border-gray-300 text-gray-400'
                }`}>
                  {i < stepIndex ? <CheckCircle className="w-5 h-5" /> : i + 1}
                </div>
                <span className="text-xs font-medium hidden sm:block">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 ${i < stepIndex ? 'bg-blue-700' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Contenu de l'étape */}
        <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm">
          {step === 'amount' && (
            <StepAmount
              project={project}
              onNext={(inv) => { setInvestment(inv); setStep('sign'); }}
            />
          )}
          {step === 'sign' && investment && (
            <StepSign
              investment={investment}
              onNext={(inv) => { setInvestment(inv); setStep('payment'); }}
            />
          )}
          {step === 'payment' && investment && (
            <StepPayment investment={investment} />
          )}
        </div>
      </main>
    </div>
  );
}
