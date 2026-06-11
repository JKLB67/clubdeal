'use client';

import { use, useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { useAuth } from '@/context/auth';
import { api } from '@/lib/api';
import { Project } from '@/types';
import { formatEuros } from '@/lib/utils';
import { CheckCircle, FileText, CreditCard, ChevronLeft, Loader2, ZoomIn, Clock } from 'lucide-react';
import { PdfViewer } from '@/components/ui/PdfViewer';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

type Step = 'amount' | 'sign' | 'pending_cosign' | 'payment' | 'confirmed';

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
  const minEuros = project.minInvestment ? Math.ceil(Number(project.minInvestment) / 100) : 1000;
  const [amount, setAmount] = useState(String(Math.max(minEuros, 10000)));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const numAmount = parseFloat(amount) || 0;
  const belowMin = numAmount > 0 && numAmount < minEuros;
  const yieldRate = parseFloat(project.annualYield) / 100;
  const years = project.durationMonths / 12;
  const grossReturn = numAmount * yieldRate * years;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (numAmount < minEuros) return setError(`Montant minimum : ${minEuros.toLocaleString('fr-FR')} €`);
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
              min={minEuros}
              step={Math.min(minEuros, 1000)}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              placeholder={minEuros.toLocaleString('fr-FR')}
              className={`w-full border rounded-xl px-4 py-3 text-lg font-semibold focus:outline-none focus:ring-2 ${belowMin ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 focus:ring-blue-500'}`}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">€</span>
          </div>
          {belowMin ? (
            <p className="text-xs text-red-600 mt-1 font-medium">Montant minimum : {minEuros.toLocaleString('fr-FR')} €</p>
          ) : (
            <p className="text-xs text-gray-400 mt-1">Minimum : {minEuros.toLocaleString('fr-FR')} €</p>
          )}
        </div>

        {numAmount >= minEuros && (
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
          disabled={loading || numAmount < minEuros}
          className="w-full bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {loading ? 'Génération du contrat...' : 'Continuer vers la signature →'}
        </button>
      </form>
    </div>
  );
}

// ─── Étape 2 : Signature (2 documents) ───────────────────────────────────────
function StepSign({
  investment: initialInv,
  onNext,
}: {
  investment: Investment;
  onNext: (inv: Investment) => void;
}) {
  const [inv, setInv] = useState(initialInv);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  const contratSigned  = !!(inv as any).contratInvestorSignedAt;
  const bulletinSigned = !!(inv as any).bulletinSignedAt;

  async function signBulletin() {
    setLoading('bulletin'); setError('');
    try {
      const updated = await api.post<Investment>(`/api/investments/${inv.id}/sign-bulletin`, {});
      const merged = { ...inv, ...updated };
      setInv(merged);
      // Avancer vers l'attente de co-signature après les 2 signatures investisseur
      if ((merged as any).contratInvestorSignedAt && (merged as any).bulletinSignedAt) {
        onNext(merged);
      }
    } catch (e: any) { setError(e.message); } finally { setLoading(null); }
  }

  async function signContrat() {
    setLoading('contrat'); setError('');
    try {
      const updated = await api.post<Investment>(`/api/investments/${inv.id}/sign-contrat-investor`, {});
      setInv((p) => ({ ...p, ...updated }));
      // Ne pas avancer ici — attendre aussi la signature du bulletin
    } catch (e: any) { setError(e.message); } finally { setLoading(null); }
  }

  function DocRow({ docType, label, signed, canSign, onSign, signing }: {
    docType: 'bulletin' | 'contrat'; label: string; signed: boolean;
    canSign: boolean; onSign: () => void; signing: boolean;
  }) {
    const [preview, setPreview] = useState(false);

    return (
      <div className={`bg-white border rounded-2xl p-4 transition-colors ${signed ? 'border-green-200 bg-green-50/30' : 'border-gray-200'}`}>
        {preview && (
          <PdfViewer
            path={`/api/investments/${inv.id}/${docType}`}
            filename={label}
            isHtml={true}
            hideActions={true}
            onClose={() => setPreview(false)}
          />
        )}
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${signed ? 'bg-green-100' : 'bg-blue-50'}`}>
            <FileText className={`w-4 h-4 ${signed ? 'text-green-600' : 'text-blue-600'}`} />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-900 text-sm">{label}</p>
            <p className="text-xs text-gray-400">{formatEuros(inv.amount)}</p>
          </div>
          {signed && <span className="text-green-600 font-semibold text-xs bg-green-100 px-2.5 py-1 rounded-full">✓ Signé</span>}
          <button onClick={() => setPreview(true)}
            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium border border-blue-200 rounded-lg px-2.5 py-1 hover:bg-blue-50 transition-colors">
            <ZoomIn className="w-3.5 h-3.5" /> Lire
          </button>
        </div>
        {!signed && (
          <button onClick={onSign} disabled={!canSign || signing}
            className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
              canSign
                ? 'bg-blue-700 hover:bg-blue-800 text-white'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}>
            {signing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {signing ? 'Signature en cours...' : canSign ? '✍️ Signer ce document' : 'Signez d\'abord le contrat ci-dessus'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-xl font-bold text-gray-900 mb-1">Signature des documents</h2>
      <p className="text-gray-500 text-sm mb-4">
        Lisez chaque document attentivement puis signez-les dans l'ordre.
      </p>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">{error}</div>}

      <div className="space-y-3 mb-4">
        <DocRow
          docType="contrat" label="Contrat d'émission d'obligations"
          signed={contratSigned} canSign={true}
          onSign={signContrat} signing={loading === 'contrat'}
        />
        <DocRow
          docType="bulletin" label="Bulletin de souscription"
          signed={bulletinSigned} canSign={contratSigned}
          onSign={signBulletin} signing={loading === 'bulletin'}
        />
      </div>

      {contratSigned && bulletinSigned && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-800 text-center font-medium mb-4">
          ✓ Les 2 documents sont signés — en attente de co-signature
        </div>
      )}

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-800">
        <p className="font-semibold mb-0.5">Après votre signature</p>
        <p>L'émetteur co-signera le contrat. L'IBAN de virement vous sera communiqué une fois toutes les parties ayant signé.</p>
      </div>
    </div>
  );
}

// ─── Étape 3 : Attente co-signature ──────────────────────────────────────────
function StepPendingCosign({ investment }: { investment: Investment }) {
  return (
    <div className="max-w-lg mx-auto">
      <div className="flex flex-col items-center text-center py-6 mb-6">
        <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mb-4">
          <Clock className="w-8 h-8 text-purple-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">En attente de co-signature</h2>
        <p className="text-gray-500 text-sm max-w-sm">
          Vous avez signé les deux documents. L'émetteur doit maintenant co-signer le contrat d'émission.
          Vous recevrez un email dès que toutes les parties auront signé.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Vos signatures</p>
            <p className="text-xs text-gray-400">Contrat + bulletin signés</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
            <Clock className="w-4 h-4 text-purple-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Co-signature émetteur</p>
            <p className="text-xs text-gray-400">En attente — délai habituel 24–48h</p>
          </div>
        </div>
        <div className="flex items-center gap-3 opacity-40">
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
            <CreditCard className="w-4 h-4 text-gray-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Virement bancaire</p>
            <p className="text-xs text-gray-400">L'IBAN sera communiqué après toutes les signatures</p>
          </div>
        </div>
      </div>

      <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 text-sm text-purple-800 mb-6">
        <p className="font-semibold mb-1">Montant souscrit</p>
        <p className="text-2xl font-bold text-purple-700">{formatEuros(investment.amount)}</p>
        <p className="text-xs text-purple-600 mt-1">Réf. : {investment.id}</p>
      </div>

      <Link
        href="/account/investments"
        className="block w-full text-center border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium py-3 rounded-xl transition-colors text-sm"
      >
        Suivre mes investissements →
      </Link>
    </div>
  );
}

// ─── Étape 4 : Paiement ──────────────────────────────────────────────────────
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
  { key: 'amount',         label: 'Montant',     icon: CreditCard },
  { key: 'sign',           label: 'Signature',   icon: FileText },
  { key: 'pending_cosign', label: 'Co-signature', icon: Clock },
  { key: 'payment',        label: 'Virement',    icon: CreditCard },
];

export default function InvestPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const { user } = useAuth();
  const router = useRouter();

  const stepFromUrl = typeof window !== 'undefined'
    ? (new URLSearchParams(window.location.search).get('step') as Step | null)
    : null;
  const [step, setStep] = useState<Step>(stepFromUrl ?? 'amount');
  const [investment, setInvestment] = useState<Investment | null>(null);
  const [resumeChecked, setResumeChecked] = useState(false);

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => api.get<Project>(`/api/projects/${projectId}`),
  });

  // Détecter un investissement en cours pour ce projet et reprendre au bon endroit
  const { data: myInvestments } = useQuery({
    queryKey: ['my-investments'],
    queryFn: () => api.get<any[]>('/api/investments/mine'),
    enabled: !!user,
  });

  useEffect(() => {
    if (resumeChecked || !myInvestments) return;
    setResumeChecked(true);
    const existing = myInvestments.find(
      (i: any) => i.project?.id === projectId && ['PENDING_SIGNATURE', 'PENDING_COSIGN', 'PENDING_PAYMENT'].includes(i.status)
    );
    if (existing) {
      setInvestment(existing);
      // Si l'URL force une étape (ex: ?step=payment), on la respecte
      if (!stepFromUrl) {
        if (existing.status === 'PENDING_PAYMENT') setStep('payment');
        else if (existing.status === 'PENDING_COSIGN') setStep('pending_cosign');
        else setStep('sign');
      }
    }
  }, [myInvestments, projectId, resumeChecked]);

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
              onNext={(inv) => { setInvestment(inv); setStep('pending_cosign'); }}
            />
          )}
          {step === 'pending_cosign' && investment && (
            <StepPendingCosign investment={investment} />
          )}
          {step === 'payment' && investment && (
            <StepPayment investment={investment} />
          )}
        </div>
      </main>
    </div>
  );
}
