export interface User {
  id: string;
  email: string;
  role: 'ADMIN' | 'INVESTOR' | 'SUPER_ADMIN';
  tenantId: string;
  statusKyc: 'NOT_INITIATED' | 'PENDING' | 'VALIDATED' | 'REFUSED';
  profileType: 'PHYSICAL' | 'LEGAL';
  physicalProfile?: {
    firstName: string;
    lastName: string;
    birthDate?: string;
    nationality?: string;
    city?: string;
    country?: string;
  } | null;
}

export interface Project {
  id: string;
  name: string;
  address: string;
  description?: string;
  collectionGoal: string;
  collectedAmount: string;
  annualYield: string;
  durationMonths: number;
  precommercialisationRate?: string;
  status: 'DRAFT' | 'ACTIVE' | 'FUNDED' | 'CLOSED';
  minInvestment?: string | null;
  openingDate?: string | null;
  closingDate?: string | null;
  virtualIban?: string;
  isFavorite?: boolean;
  myAlerts?: string[];
  _count?: { investments: number; favorites: number };
  photos: { id: string; url: string; orderIndex: number }[];
  documents?: { id: string; name: string; label?: string | null; url: string; type: string; orderIndex: number }[];
}

export interface AuthResponse {
  access_token: string;
  user: Pick<User, 'id' | 'email' | 'role' | 'tenantId'>;
}
