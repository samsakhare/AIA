'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import packageJson from '../../../package.json';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
    }
  }, [router]);

  if (!mounted) return null;

  return (
    <div className="flex min-h-screen bg-gray-50 overflow-hidden">
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 transition-transform duration-300 ease-in-out flex-shrink-0`}>
        <Sidebar onClose={() => setIsSidebarOpen(false)} />
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-auto h-screen">
        <Topbar onMenuClick={() => setIsSidebarOpen(true)} />
        <div className="p-4 md:p-6 flex-1 w-full max-w-[100vw] lg:max-w-none">{children}</div>
        <footer className="py-4 text-center text-xs text-gray-400 border-t border-gray-100 flex-shrink-0">
          aia-admin v{packageJson.version}
        </footer>
      </main>
    </div>
  );
}
