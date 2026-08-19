import Navbar from '../../components/Navbar';
import { ArrowRight, Bot, PhoneCall, Zap, BarChart3, Database } from 'lucide-react';
import Link from 'next/link';
import { DASHBOARD_URL } from '@/config/env';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      {/* Hero Section */}
      <section className="flex-1 flex items-center justify-center pt-24 pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 tracking-tight">
            Never Miss a Lead Again.
            <span className="block text-blue-600">Warm Handoff to AI.</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Answer the phone, greet your customer, and immediately hand them off to a specialized AI
            Voice Agent to collect intake details, book appointments, and sync to your CRM.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href={`${DASHBOARD_URL}/signup`}
              className="w-full sm:w-auto rounded-lg bg-blue-600 px-8 py-4 text-lg font-semibold text-white hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
            >
              Start Free Trial <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="#how-it-works"
              className="w-full sm:w-auto rounded-lg bg-white px-8 py-4 text-lg font-semibold text-gray-900 border border-gray-200 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              See How It Works
            </Link>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">The Perfect 3-Way Handoff</h2>
            <p className="text-gray-600 mt-4 text-lg">
              Keep the human touch while automating the tedious intake process.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            {/* Step 1 */}
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-inner">
                <PhoneCall className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">1. You Answer</h3>
              <p className="text-gray-600">
                You pick up the phone on your personal device and greet the caller with a warm,
                human introduction.
              </p>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center text-center space-y-4 relative">
              <div className="hidden md:block absolute top-8 left-[-50%] w-full h-[2px] bg-blue-100 -z-10"></div>
              <div className="hidden md:block absolute top-8 right-[-50%] w-full h-[2px] bg-blue-100 -z-10"></div>
              <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-200">
                <Bot className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">2. AI Joins the Call</h3>
              <p className="text-gray-600">
                With a tap, your dedicated AI assistant instantly joins the conference call to
                assist the customer.
              </p>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-inner">
                <Zap className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">3. You Hang Up</h3>
              <p className="text-gray-600">
                You drop off to focus on your business. The AI continues the conversation,
                collecting details and booking appointments.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">
              Everything you need to automate intake
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm flex gap-4">
              <Database className="w-8 h-8 text-blue-600 shrink-0" />
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Structured Data Extraction</h3>
                <p className="text-gray-600">
                  The AI automatically pulls out names, phone numbers, budgets, and specific
                  requirements from the natural conversation and saves it as clean JSON data.
                </p>
              </div>
            </div>
            <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm flex gap-4">
              <BarChart3 className="w-8 h-8 text-blue-600 shrink-0" />
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Instant Call Summaries</h3>
                <p className="text-gray-600">
                  Get a bulleted summary, full transcript, and action items delivered instantly to
                  your dashboard the moment the call ends.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-12">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 text-blue-600 font-bold">
            <PhoneCall className="w-5 h-5" />
            <span>AIA</span>
          </div>
          <p className="text-gray-500 text-sm">© 2026 AIA. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
