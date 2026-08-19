'use client';
import { useEffect, useState } from 'react';
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

export default function DashboardHome() {
  const [role, setRole] = useState<string>('');
  const [quota, setQuota] = useState<QuotaData | null>(null);
  const [loadingQuota, setLoadingQuota] = useState(true);

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      const parsedUser = JSON.parse(user);
      setRole(parsedUser.role);

      if (parsedUser.role === 'SUPER_ADMIN') {
        const token = localStorage.getItem('token');
        fetch(`${API_URL}/twilio/quota`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
          .then((res) => res.json())
          .then((data) => {
            if (!data.error) {
              setQuota(data);
            }
            setLoadingQuota(false);
          })
          .catch((err) => {
            console.error('Failed to fetch quota', err);
            setLoadingQuota(false);
          });
      } else {
        setLoadingQuota(false);
      }
    }
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-gray-500 text-sm font-medium">Total Calls</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-gray-500 text-sm font-medium">AI Handoff Rate</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">0%</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-gray-500 text-sm font-medium">Active Agents</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">1</p>
        </div>
      </div>

      {role === 'SUPER_ADMIN' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Twilio Account Summary</h3>
          {loadingQuota ? (
            <p className="text-gray-500 text-sm">Loading...</p>
          ) : quota ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Available Balance</p>
                <p className="text-3xl font-bold text-green-600">
                  ${quota.balance}{' '}
                  <span className="text-lg text-gray-400 font-normal">{quota.currency}</span>
                </p>
                <p className="text-xs text-gray-400 mt-2">Plan: {quota.plan}</p>
              </div>
              <div className="space-y-4">
                {quota.limits?.map((limit, index: number) => {
                  const percentage = limit.hasLimit
                    ? Math.min(100, Math.max(0, (limit.consumed / limit.freeUnits) * 100))
                    : 100;
                  return (
                    <div key={index}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700">{limit.product}</span>
                        <span className="text-gray-500">
                          {limit.consumed} {limit.hasLimit ? `/ ${limit.freeUnits} ` : ''}
                          {limit.unit}
                        </span>
                      </div>
                      {limit.hasLimit ? (
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div
                            className={`h-2.5 rounded-full ${percentage > 90 ? 'bg-red-500' : percentage > 75 ? 'bg-yellow-400' : 'bg-blue-600'}`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      ) : (
                        <div className="w-full h-2.5 flex items-center justify-end text-xs text-gray-400 italic">
                          Pay-as-you-go
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-red-500 text-sm">Failed to load Twilio data. Check API keys.</p>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Calls</h3>
        <p className="text-gray-500 text-sm">
          No calls have been routed yet. Configure your Twilio webhook to get started.
        </p>
      </div>
    </div>
  );
}
