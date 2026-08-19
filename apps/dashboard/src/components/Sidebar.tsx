import Link from 'next/link';
import { Home, Phone, Settings, LayoutDashboard } from 'lucide-react';

export default function Sidebar() {
  return (
    <aside className="w-64 bg-gray-900 text-white min-h-screen flex flex-col">
      <div className="p-6 flex items-center gap-2 font-bold text-xl">
        <LayoutDashboard className="w-6 h-6 text-blue-400" />
        <span>AIA Admin</span>
      </div>
      <nav className="flex-1 px-4 space-y-2">
        <Link href="/" className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-800 text-white">
          <Home className="w-5 h-5" />
          Dashboard
        </Link>
        <Link href="/calls" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors">
          <Phone className="w-5 h-5" />
          Calls
        </Link>
        <Link href="/settings" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors">
          <Settings className="w-5 h-5" />
          Settings
        </Link>
      </nav>
    </aside>
  );
}
