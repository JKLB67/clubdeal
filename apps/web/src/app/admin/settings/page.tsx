'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Shield, CreditCard, FileSignature, Eye, EyeOff, Building2, ChevronRight } from 'lucide-react';

function ApiKeyField({ label, placeholder }: { label: string; placeholder: string }) {
  const [visible, setVisible] = useState(false);
  const [value, setValue] = useState('');

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

export default function AdminSettingsPage() {
  const [pspProvider, setPspProvider] = useState<'MANGOPAY' | 'LEMONWAY'>('MANGOPAY');
  const [esignProvider, setEsignProvider] = useState<'YOUSIGN' | 'DOCUSIGN'>('YOUSIGN');

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
        <p className="text-gray-500 mt-0.5">Configurez vos intégrations PSP et signature électronique.</p>
      </div>

      <div className="space-y-6">
        {/* Entité émettrice */}
        <Link href="/admin/settings/entity"
          className="flex items-center gap-4 bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-sm hover:border-blue-200 transition-all group">
          <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center group-hover:bg-green-100 transition-colors">
            <Building2 className="w-5 h-5 text-green-600" />
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-gray-900">Profil de l'émetteur</h2>
            <p className="text-xs text-gray-500">Informations juridiques pré-remplies dans les contrats</p>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
        </Link>

        {/* PSP */}
        <section className="bg-white border border-gray-100 rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Paiement & KYC</h2>
              <p className="text-xs text-gray-500">Prestataire de services de paiement</p>
            </div>
          </div>

          <div className="flex gap-3">
            {(['MANGOPAY', 'LEMONWAY'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPspProvider(p)}
                className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${
                  pspProvider === p
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {p === 'MANGOPAY' ? 'Mangopay' : 'Lemonway'}
              </button>
            ))}
          </div>

          <ApiKeyField label="Client ID" placeholder="client_id_xxxxxxxxxxxx" />
          <ApiKeyField label="API Key" placeholder="api_key_xxxxxxxxxxxx" />

          <div className="pt-2">
            <button className="bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors">
              Enregistrer la configuration PSP
            </button>
          </div>
        </section>

        {/* Signature */}
        <section className="bg-white border border-gray-100 rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 bg-purple-50 rounded-lg flex items-center justify-center">
              <FileSignature className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Signature électronique</h2>
              <p className="text-xs text-gray-500">Prestataire pour la signature des contrats</p>
            </div>
          </div>

          <div className="flex gap-3">
            {(['YOUSIGN', 'DOCUSIGN'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setEsignProvider(p)}
                className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${
                  esignProvider === p
                    ? 'border-purple-600 bg-purple-50 text-purple-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {p === 'YOUSIGN' ? 'Yousign' : 'DocuSign'}
              </button>
            ))}
          </div>

          <ApiKeyField label="Account ID" placeholder="account_xxxxxxxxxxxx" />
          <ApiKeyField label="API Key" placeholder="api_key_xxxxxxxxxxxx" />

          <div className="pt-2">
            <button className="bg-purple-700 hover:bg-purple-800 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors">
              Enregistrer la configuration Signature
            </button>
          </div>
        </section>

        {/* Sécurité */}
        <section className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex gap-3">
          <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Sécurité des clés API</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Vos clés API sont chiffrées en AES-256 avant stockage. Elles ne sont jamais exposées en clair dans les logs ou les réponses API.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
