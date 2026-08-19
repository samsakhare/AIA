'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import packageJson from '../../../package.json';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
    }
  }, [router]);

  if (!mounted) return null;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 flex flex-col">
        <Topbar />
        <div className="p-6 flex-1">
          {children}
        </div>
        <footer className="py-4 text-center text-xs text-gray-400 border-t border-gray-100">
          aia-admin v{packageJson.version}
        </footer>
      </main>
    </div>
  );
}
