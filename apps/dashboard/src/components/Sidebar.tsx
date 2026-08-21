'use client';
import Link from 'next/link';
import { Home, Phone, Settings, LayoutDashboard, Users, X } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const [role, setRole] = useState<string>('');

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      setRole(JSON.parse(user).role);
    }
  }, []);

  return (
    <aside className="w-64 bg-gray-900 text-white h-full flex flex-col shadow-xl">
      <div className="p-6 flex items-center justify-between font-bold text-xl flex-shrink-0">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="w-6 h-6 text-blue-400" />
          <span>AIA Admin</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-1 rounded-md hover:bg-gray-800 text-gray-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
      <nav className="flex-1 px-4 space-y-2 overflow-y-auto pb-6">
        <Link
          href="/"
          onClick={onClose}
          className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-800 text-white"
        >
          <Home className="w-5 h-5" />
          Dashboard
        </Link>

        {role === 'USER' && (
          <>
            <div className="px-4 mt-8 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              AI
            </div>
            <Link
              href="/ai/agents"
              onClick={onClose}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            >
              <Settings className="w-5 h-5" />
              My Agents
            </Link>
            <Link
              href="/ai/phone-numbers"
              onClick={onClose}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            >
              <Phone className="w-5 h-5" />
              My Phone Numbers
            </Link>
          </>
        )}

        {role === 'SUPER_ADMIN' && (
          <Link
            href="/users"
            onClick={onClose}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <Users className="w-5 h-5" />
            Users
          </Link>
        )}

        {role === 'SUPER_ADMIN' && (
          <>
            <div className="px-4 mt-8 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Vapi (AI)
            </div>
            <Link
              href="/ai/templates"
              onClick={onClose}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            >
              <Settings className="w-5 h-5" />
              AI Templates
            </Link>
            <Link
              href="/ai/agents"
              onClick={onClose}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            >
              <Users className="w-5 h-5" />
              User Agents
            </Link>
            <div className="px-4 mt-8 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Twilio
            </div>
            <Link
              href="/twilio/phone-numbers"
              onClick={onClose}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            >
              <Phone className="w-5 h-5" />
              Phone Numbers
            </Link>
            <Link
              href="/twilio/quota"
              onClick={onClose}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            >
              <Settings className="w-5 h-5" />
              Quota
            </Link>
          </>
        )}
      </nav>
    </aside>
  );
}
