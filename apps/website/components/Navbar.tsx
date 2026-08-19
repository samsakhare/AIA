import Link from 'next/link';
import { PhoneCall } from 'lucide-react';
import { DASHBOARD_URL } from '../src/config/env';

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-blue-600">
          <PhoneCall className="h-6 w-6" />
          <span>AIA</span>
        </Link>
        <div className="hidden md:flex gap-6 text-sm font-medium text-gray-600">
          <Link href="#how-it-works" className="hover:text-blue-600 transition-colors">
            How it Works
          </Link>
          <Link href="#features" className="hover:text-blue-600 transition-colors">
            Features
          </Link>
          <Link href="#pricing" className="hover:text-blue-600 transition-colors">
            Pricing
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href={`${DASHBOARD_URL}/login`}
            className="text-sm font-medium text-gray-600 hover:text-blue-600"
          >
            Login
          </Link>
          <Link
            href={`${DASHBOARD_URL}/signup`}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
}
