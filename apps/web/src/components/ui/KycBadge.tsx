const KYC_CONFIG = {
  NOT_INITIATED: { label: 'KYC non initié', className: 'bg-gray-100 text-gray-600' },
  PENDING:       { label: 'KYC en cours',   className: 'bg-yellow-100 text-yellow-700' },
  VALIDATED:     { label: 'KYC validé',     className: 'bg-green-100 text-green-700' },
  REFUSED:       { label: 'KYC refusé',     className: 'bg-red-100 text-red-700' },
} as const;

type KycStatus = keyof typeof KYC_CONFIG;

export function KycBadge({ status }: { status: KycStatus }) {
  const cfg = KYC_CONFIG[status] ?? KYC_CONFIG.NOT_INITIATED;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}
