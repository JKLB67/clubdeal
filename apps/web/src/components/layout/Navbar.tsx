'use client';

import Link from 'next/link';
import { useAuth } from '@/context/auth';
import { useRouter } from 'next/navigation';
import { LayoutDashboard, Briefcase, Settings, LogOut, User, Building2, BadgeCheck } from 'lucide-react';

export function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();

  function handleLogout() {
    logout();
    router.push('/login');
  }

  const displayName = user?.physicalProfile
    ? `${user.physicalProfile.firstName} ${user.physicalProfile.lastName}`
    : user?.email ?? '';

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      <Link href="/" className="text-lg font-bold text-blue-700 tracking-tight flex items-center gap-2">
        <Building2 className="w-5 h-5" />
        ClubDeal
      </Link>

      <div className="flex items-center gap-1">
        {user ? (
          <>
            <Link href="/" className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-blue-700 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
              <LayoutDashboard className="w-4 h-4" />
              <span className="hidden sm:inline">Collectes</span>
            </Link>

            {/* Lien investissements : tous les utilisateurs avec KYC validé (ou en cours) */}
            {user.statusKyc !== 'NOT_INITIATED' && (
              <Link href="/account/investments" className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-blue-700 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                <Briefcase className="w-4 h-4" />
                <span className="hidden sm:inline">Mes investissements</span>
              </Link>
            )}

            {user.role === 'INVESTOR' && (
              <Link href="/account/profile" className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-blue-700 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                <BadgeCheck className="w-4 h-4" />
                <span className="hidden sm:inline">{user.statusKyc === 'VALIDATED' ? 'Mon profil' : 'Compléter mon profil'}</span>
              </Link>
            )}

            {(user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') && (
              <Link href="/admin" className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors">
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Back-office</span>
              </Link>
            )}

            <div className="flex items-center gap-1.5 ml-2 pl-3 border-l border-gray-200">
              <div className="flex items-center gap-1.5 text-sm text-gray-700">
                <User className="w-4 h-4 text-gray-400" />
                <span className="max-w-[120px] truncate hidden sm:inline">{displayName}</span>
              </div>
              <button
                onClick={handleLogout}
                title="Déconnexion"
                className="flex items-center gap-1 text-sm text-gray-400 hover:text-red-600 transition-colors px-2 py-2 rounded-lg hover:bg-red-50"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          <>
            <Link href="/login" className="text-sm text-gray-600 hover:text-blue-700 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
              Connexion
            </Link>
            <Link
              href="/register"
              className="text-sm bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition-colors"
            >
              S'inscrire
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
