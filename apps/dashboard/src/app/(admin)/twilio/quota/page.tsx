'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, AlertCircle, Phone, Hash } from 'lucide-react';
import { API_URL } from '@/config/api';

interface QuotaLimit {
  product: string;
  channel: string;
  freeUnits: number;
  consumed: number;
  unit: string;
  remaining: number | string;
  hasLimit: boolean;
}

interface QuotaData {
  balance: string;
  currency: string;
  plan: string;
  limits: QuotaLimit[];
}

export default function QuotaPage() {
  const [quota, setQuota] = useState<QuotaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openAccordions, setOpenAccordions] = useState<Record<number, boolean>>({
    0: true,
    1: true
  });

  useEffect(() => {
    const fetchQuota = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/twilio/quota`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();

        if (data.error) throw new Error(data.error);
        setQuota(data);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Failed to fetch quota data');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchQuota();
  }, []);

  const toggleAccordion = (index: number) => {
    setOpenAccordions((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-2">
        <AlertCircle className="w-5 h-5" />
        {error}
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Twilio Quota & Usage</h1>
          <p className="text-gray-500 mt-1">
            Manage your Twilio usage, plan limits, and account balance.
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-gray-500">Current Plan</p>
          <span className="inline-flex items-center px-3 py-1 mt-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
            {quota?.plan}
          </span>
        </div>
      </div>

      {/* Balance Card */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-8 text-white shadow-md">
        <p className="text-blue-100 font-medium mb-2 uppercase tracking-wide text-sm">
          Available Balance
        </p>
        <div className="flex items-baseline gap-2">
          <span className="text-5xl font-bold">${quota?.balance || '0.00'}</span>
          <span className="text-xl text-blue-200">{quota?.currency || 'USD'}</span>
        </div>
        <p className="mt-4 text-sm text-blue-100">
          Top up your balance in the Twilio Console to continue using services uninterrupted.
        </p>
      </div>

      {/* Quota Details */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Usage Details</h2>
        </div>

        <div className="divide-y divide-gray-100">
          {quota?.limits?.map((limit, index: number) => {
            const percentage = limit.hasLimit
              ? Math.min(100, Math.max(0, (limit.consumed / limit.freeUnits) * 100))
              : 100;
            const isOpen = openAccordions[index];
            const isNearLimit = limit.hasLimit && percentage > 80;

            return (
              <div key={index} className="bg-white">
                <button
                  onClick={() => toggleAccordion(index)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors focus:outline-none"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`p-2 rounded-lg ${isNearLimit ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}
                    >
                      {limit.channel === 'Voice' ? (
                        <Phone className="w-5 h-5" />
                      ) : (
                        <Hash className="w-5 h-5" />
                      )}
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-gray-900">{limit.product}</h3>
                      <p className="text-sm text-gray-500">
                        {limit.consumed} {limit.hasLimit ? `of ${limit.freeUnits} ` : ''}
                        {limit.unit} used
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="w-32 hidden sm:block">
                      {limit.hasLimit ? (
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${percentage > 90 ? 'bg-red-500' : percentage > 75 ? 'bg-yellow-400' : 'bg-green-500'}`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400 text-right italic">Pay-as-you-go</div>
                      )}
                    </div>
                    <div className="text-gray-400">
                      {isOpen ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </div>
                  </div>
                </button>

                {isOpen && (
                  <div className="px-6 pb-6 pt-2 bg-gray-50/50">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-gray-500 uppercase bg-gray-100 rounded-lg">
                        <tr>
                          <th className="px-4 py-3 rounded-l-lg">Channel / Feature</th>
                          <th className="px-4 py-3">Free Units / Limit</th>
                          <th className="px-4 py-3">Consumed</th>
                          <th className="px-4 py-3 rounded-r-lg">Remaining</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-gray-100">
                          <td className="px-4 py-4 font-medium text-gray-900">{limit.channel}</td>
                          <td className="px-4 py-4">
                            {limit.hasLimit ? `${limit.freeUnits} ${limit.unit}` : 'Unlimited'}
                          </td>
                          <td className="px-4 py-4 text-gray-600">
                            {limit.consumed} {limit.unit}
                          </td>
                          <td
                            className={`px-4 py-4 font-medium ${!limit.hasLimit ? 'text-gray-500' : limit.remaining === 0 ? 'text-red-600' : 'text-green-600'}`}
                          >
                            {limit.hasLimit ? `${limit.remaining} ${limit.unit}` : 'N/A'}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
