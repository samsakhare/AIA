'use client';
import { useState, useEffect } from 'react';
import { User, LogOut, Menu } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const router = useRouter();

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      setDisplayName(user.name || user.email);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 sticky top-0 z-10 flex-shrink-0">
      <div className="flex items-center gap-3">
        {onMenuClick && (
          <button 
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
        )}
        <h1 className="text-xl font-semibold text-gray-800">Overview</h1>
      </div>

      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <span className="hidden sm:inline-block text-sm font-medium text-gray-700">{displayName}</span>
          <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5" />
          </div>
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1">
            <div className="px-4 py-2 border-b border-gray-100 sm:hidden">
              <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
            </div>
            <button
              onClick={() => {
                setOpen(false);
                router.push('/profile');
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <User className="w-4 h-4" />
              Profile
            </button>
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50 flex items-center gap-2 border-t border-gray-100"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
