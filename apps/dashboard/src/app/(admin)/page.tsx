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

interface DashboardMetrics {
  totalCalls: number;
  totalCost: number;
  totalDuration: number;
}

const getPresetDates = (preset: string) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  if (preset === 'today') {
    return { start: todayStart.toISOString().split('T')[0], end: now.toISOString().split('T')[0] };
  }
  if (preset === 'yesterday') {
    const yesterday = new Date(todayStart);
    yesterday.setDate(yesterday.getDate() - 1);
    return { start: yesterday.toISOString().split('T')[0], end: yesterday.toISOString().split('T')[0] };
  }
  if (preset === 'this_week') {
    const startOfWeek = new Date(todayStart);
    startOfWeek.setDate(todayStart.getDate() - todayStart.getDay());
    return { start: startOfWeek.toISOString().split('T')[0], end: now.toISOString().split('T')[0] };
  }
  if (preset === 'last_week') {
    const endOfLastWeek = new Date(todayStart);
    endOfLastWeek.setDate(todayStart.getDate() - todayStart.getDay() - 1);
    const startOfLastWeek = new Date(endOfLastWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 6);
    return { start: startOfLastWeek.toISOString().split('T')[0], end: endOfLastWeek.toISOString().split('T')[0] };
  }
  if (preset === 'this_year') {
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    return { start: startOfYear.toISOString().split('T')[0], end: now.toISOString().split('T')[0] };
  }
  if (preset === 'last_year') {
    const startOfLastYear = new Date(now.getFullYear() - 1, 0, 1);
    const endOfLastYear = new Date(now.getFullYear() - 1, 11, 31);
    return { start: startOfLastYear.toISOString().split('T')[0], end: endOfLastYear.toISOString().split('T')[0] };
  }
  return { start: '', end: '' };
};

export default function DashboardHome() {
  const [role, setRole] = useState<string>('');
  const [quota, setQuota] = useState<QuotaData | null>(null);
  const [loadingQuota, setLoadingQuota] = useState(true);

  // Date Range and Metrics State
  const [preset, setPreset] = useState<string>('this_week');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  // Initialize dates
  useEffect(() => {
    const { start, end } = getPresetDates('this_week');
    setStartDate(start);
    setEndDate(end);
  }, []);

  // Fetch role and quota
  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      const parsedUser = JSON.parse(user);
      setRole(parsedUser.role);

      if (parsedUser.role === 'SUPER_ADMIN') {
        const token = localStorage.getItem('token');
        fetch(`${API_URL}/twilio/quota`, {
          headers: { Authorization: `Bearer ${token}` }
        })
          .then((res) => res.json())
          .then((data) => {
            if (!data.error) setQuota(data);
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

  // Fetch Metrics
  useEffect(() => {
    if (!startDate || !endDate) return;
    
    setLoadingMetrics(true);
    const token = localStorage.getItem('token');
    
    fetch(`${API_URL}/dashboard/metrics?startDate=${startDate}&endDate=${endDate}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setMetrics(data);
        }
        setLoadingMetrics(false);
      })
      .catch(err => {
        console.error('Failed to fetch metrics', err);
        setLoadingMetrics(false);
      });
  }, [startDate, endDate]);

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    setPreset(selected);
    if (selected !== 'custom') {
      const { start, end } = getPresetDates(selected);
      setStartDate(start);
      setEndDate(end);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-sm text-gray-500">View your call analytics and total costs.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Date Range</label>
            <select 
              value={preset} 
              onChange={handlePresetChange}
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 transition-colors cursor-pointer"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="this_week">This Week</option>
              <option value="last_week">Last Week</option>
              <option value="this_year">This Year</option>
              <option value="last_year">Last Year</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          <div className={`flex items-center gap-2 transition-opacity duration-300 ${preset === 'custom' ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
            <div className="flex flex-col">
               <label className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">From</label>
               <input 
                 type="date" 
                 value={startDate} 
                 onChange={(e) => { setStartDate(e.target.value); setPreset('custom'); }}
                 className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2"
               />
            </div>
            <span className="text-gray-400 mt-5">-</span>
            <div className="flex flex-col">
               <label className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">To</label>
               <input 
                 type="date" 
                 value={endDate} 
                 onChange={(e) => { setEndDate(e.target.value); setPreset('custom'); }}
                 className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2"
               />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-phone-call"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/><path d="M14.05 2a9 9 0 0 1 8 7.94"/><path d="M14.05 6A5 5 0 0 1 18 10"/></svg>
          </div>
          <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider">Total Calls</h3>
          {loadingMetrics ? (
            <div className="h-9 w-16 bg-gray-200 animate-pulse rounded mt-2"></div>
          ) : (
            <p className="text-4xl font-bold text-gray-900 mt-2">{metrics?.totalCalls || 0}</p>
          )}
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-circle-dollar-sign"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg>
          </div>
          <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider">Total Cost</h3>
          {loadingMetrics ? (
            <div className="h-9 w-24 bg-gray-200 animate-pulse rounded mt-2"></div>
          ) : (
            <p className="text-4xl font-bold text-gray-900 mt-2">
              ${(metrics?.totalCost || 0).toFixed(4)}
            </p>
          )}
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-clock"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider">Total Duration</h3>
          {loadingMetrics ? (
            <div className="h-9 w-24 bg-gray-200 animate-pulse rounded mt-2"></div>
          ) : (
            <p className="text-4xl font-bold text-gray-900 mt-2">
              {Math.floor((metrics?.totalDuration || 0) / 60)}m {(metrics?.totalDuration || 0) % 60}s
            </p>
          )}
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
    </div>
  );
}
