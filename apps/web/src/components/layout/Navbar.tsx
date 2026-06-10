'use client';

import Link from 'next/link';
import { useAuth } from '@/context/auth';
import { useRouter } from 'next/navigation';

export function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();

  function handleLogout() {
    logout();
    router.push('/login');
  }

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <Link href="/" className="text-xl font-bold text-blue-700 tracking-tight">
        ClubDeal
      </Link>

      <div className="flex items-center gap-4">
        {user ? (
          <>
            <span className="text-sm text-gray-600">{user.email}</span>
            {user.role === 'ADMIN' && (
              <Link href="/admin" className="text-sm text-blue-600 hover:underline">
                Back-office
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-red-600 transition-colors"
            >
              Déconnexion
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className="text-sm text-gray-600 hover:text-blue-700">
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
