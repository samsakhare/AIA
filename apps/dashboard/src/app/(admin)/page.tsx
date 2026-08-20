'use client';
import { useEffect, useState, useRef } from 'react';
import { API_URL } from '@/config/api';
import { Phone, CircleDollarSign, Clock, PhoneCall, ArrowRightLeft, ArrowLeftRight, CheckCircle2, XCircle, ArrowUpRight, ArrowDownLeft, Calendar, FileText, Play, Pause, ChevronLeft, ChevronRight } from 'lucide-react';

const MiniAudioPlayer = ({ src }: { src: string }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      const total = audioRef.current.duration;
      setCurrentTime(current);
      setProgress((current / total) * 100);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (audioRef.current) {
      const seekTime = (Number(e.target.value) / 100) * duration;
      audioRef.current.currentTime = seekTime;
      setProgress(Number(e.target.value));
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  };

  return (
    <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full px-2.5 py-1.5 w-full min-w-[140px] max-w-[180px]">
      <audio 
        ref={audioRef} 
        src={src} 
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />
      <button 
        onClick={togglePlay}
        className="w-7 h-7 flex items-center justify-center bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 flex-shrink-0 transition-colors"
      >
        {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
      </button>
      <div className="flex-1 flex items-center gap-2">
        <input 
          type="range" 
          min="0" 
          max="100" 
          value={progress || 0}
          onChange={handleSeek}
          className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
        <span className="text-[10px] text-gray-500 font-medium tabular-nums min-w-[24px]">
          {formatTime(currentTime)}
        </span>
      </div>
    </div>
  );
};

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

interface TwilioNumber {
  id: string;
  sid: string;
  phoneNumber: string;
  status: string;
  locality?: string;
  capabilities?: any;
}

interface CallLog {
  id: string;
  from: string;
  to: string;
  status: string;
  totalDuration: number | null;
  totalCost: number | null;
  createdAt: string;
  recordingUrl: string | null;
  legs: any[];
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

  // Phone Numbers and Logs State
  const [phoneNumbers, setPhoneNumbers] = useState<TwilioNumber[]>([]);
  const [selectedPhoneId, setSelectedPhoneId] = useState<string | null>(null);
  const [logs, setLogs] = useState<CallLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotalPages, setLogsTotalPages] = useState(1);

  // Initialize dates
  useEffect(() => {
    const { start, end } = getPresetDates('this_week');
    setStartDate(start);
    setEndDate(end);
  }, []);

  // Fetch role, quota, and phone numbers
  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      const parsedUser = JSON.parse(user);
      setRole(parsedUser.role);

      const token = localStorage.getItem('token');
      
      // Fetch phone numbers (for all users, but API filters to their own if USER)
      fetch(`${API_URL}/twilio/phone-numbers`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.phoneNumbers) {
            setPhoneNumbers(data.phoneNumbers);
            if (data.phoneNumbers.length > 0) {
              setSelectedPhoneId(data.phoneNumbers[0].id);
            }
          }
        })
        .catch(console.error);

      if (parsedUser.role === 'SUPER_ADMIN') {
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

  // Fetch Metrics when date changes
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

  // Fetch Logs when selectedPhoneId, dates, or page changes
  useEffect(() => {
    if (!selectedPhoneId || !startDate || !endDate) return;
    
    setLogsLoading(true);
    const token = localStorage.getItem('token');
    
    fetch(`${API_URL}/twilio/phone-numbers/${selectedPhoneId}/logs?startDate=${startDate}&endDate=${endDate}&page=${logsPage}&limit=5`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setLogs(data.logs || []);
          setLogsTotalPages(data.totalPages || 1);
        }
        setLogsLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch logs', err);
        setLogsLoading(false);
      });
  }, [selectedPhoneId, startDate, endDate, logsPage]);

  // Reset page to 1 when date changes
  useEffect(() => {
    setLogsPage(1);
  }, [startDate, endDate, selectedPhoneId]);

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    setPreset(selected);
    if (selected !== 'custom') {
      const { start, end } = getPresetDates(selected);
      setStartDate(start);
      setEndDate(end);
    }
  };

  const getAverages = () => {
    if (!metrics) return { avgCalls: 0, callsLabel: 'per day', avgCost: 0, avgDuration: 0 };
    
    let daysInclusive = 1;
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      daysInclusive = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1);
    }
    
    let avgCalls = 0;
    let callsLabel = '';
    if (daysInclusive <= 1) {
      avgCalls = metrics.totalCalls / 24;
      callsLabel = 'per hour';
    } else {
      avgCalls = metrics.totalCalls / daysInclusive;
      callsLabel = 'per day';
    }
    
    const avgCost = metrics.totalCalls > 0 ? metrics.totalCost / metrics.totalCalls : 0;
    const avgDuration = metrics.totalCalls > 0 ? metrics.totalDuration / metrics.totalCalls : 0;
    
    return { avgCalls, callsLabel, avgCost, avgDuration };
  };

  const { avgCalls, callsLabel, avgCost, avgDuration } = getAverages();

  return (
    <div className="space-y-6 max-w-full overflow-hidden">
      <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-sm text-gray-500">View your call analytics and total costs.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3">
          <div className="flex flex-col w-full sm:w-auto">
            <label className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Date Range</label>
            <select 
              value={preset} 
              onChange={handlePresetChange}
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 transition-colors cursor-pointer w-full sm:w-auto"
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

          <div className={`flex items-center gap-2 transition-opacity duration-300 w-full sm:w-auto ${preset === 'custom' ? 'opacity-100' : 'opacity-50 pointer-events-none hidden sm:flex'}`}>
            <div className="flex flex-col flex-1 sm:flex-initial">
               <label className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">From</label>
               <input 
                 type="date" 
                 value={startDate} 
                 onChange={(e) => { setStartDate(e.target.value); setPreset('custom'); }}
                 className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 w-full"
               />
            </div>
            <span className="text-gray-400 mt-5 hidden sm:block">-</span>
            <div className="flex flex-col flex-1 sm:flex-initial">
               <label className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">To</label>
               <input 
                 type="date" 
                 value={endDate} 
                 onChange={(e) => { setEndDate(e.target.value); setPreset('custom'); }}
                 className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 w-full"
               />
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <PhoneCall className="w-12 h-12" />
          </div>
          <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider">Total Calls</h3>
          {loadingMetrics ? (
            <div className="h-9 w-16 bg-gray-200 animate-pulse rounded mt-2"></div>
          ) : (
            <div className="flex flex-col mt-2">
              <p className="text-4xl font-bold text-gray-900">{metrics?.totalCalls || 0}</p>
              <div className="text-sm font-medium mt-1">
                <span className="text-blue-600 font-semibold">{avgCalls.toFixed(1)}</span> <span className="text-gray-500">{callsLabel}</span>
              </div>
            </div>
          )}
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <CircleDollarSign className="w-12 h-12" />
          </div>
          <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider">Total Cost</h3>
          {loadingMetrics ? (
            <div className="h-9 w-24 bg-gray-200 animate-pulse rounded mt-2"></div>
          ) : (
            <div className="flex flex-col mt-2">
              <p className="text-4xl font-bold text-gray-900">
                ${(metrics?.totalCost || 0).toFixed(4)}
              </p>
              <div className="text-sm font-medium mt-1">
                <span className="text-green-600 font-semibold">${avgCost.toFixed(4)}</span> <span className="text-gray-500">avg / call</span>
              </div>
            </div>
          )}
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Clock className="w-12 h-12" />
          </div>
          <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider">Total Duration</h3>
          {loadingMetrics ? (
            <div className="h-9 w-24 bg-gray-200 animate-pulse rounded mt-2"></div>
          ) : (
            <div className="flex flex-col mt-2">
              <p className="text-4xl font-bold text-gray-900">
                {Math.floor((metrics?.totalDuration || 0) / 60)}m {(metrics?.totalDuration || 0) % 60}s
              </p>
              <div className="text-sm font-medium mt-1">
                <span className="text-purple-600 font-semibold">{Math.floor(avgDuration / 60)}m {Math.floor(avgDuration % 60)}s</span> <span className="text-gray-500">avg / call</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Bottom Section */}
      <div className="grid grid-cols-1 xl:grid-cols-6 gap-6">
        
        {/* Left Column: Assigned Phone Numbers */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col xl:col-span-1 h-full min-h-[400px]">
          <div className="p-4 border-b border-gray-100 flex-shrink-0">
            <h3 className="text-lg font-bold text-gray-900">Assigned Numbers</h3>
            <p className="text-xs text-gray-500">Select a number to view logs.</p>
          </div>
          <div className="p-2 flex-1 overflow-y-auto">
            {phoneNumbers.length === 0 ? (
               <div className="text-center py-8">
                 <p className="text-sm text-gray-500">No numbers assigned.</p>
               </div>
            ) : (
              <div className="space-y-1">
                {phoneNumbers.map((num) => (
                  <button
                    key={num.id}
                    onClick={() => setSelectedPhoneId(num.id)}
                    className={`w-full text-left p-3 rounded-lg flex items-center justify-between transition-colors ${
                      selectedPhoneId === num.id 
                        ? 'bg-blue-50 border border-blue-100' 
                        : 'hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${selectedPhoneId === num.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                        <Phone className="w-4 h-4" />
                      </div>
                      <div>
                        <p className={`font-semibold ${selectedPhoneId === num.id ? 'text-blue-900' : 'text-gray-800'}`}>{num.phoneNumber}</p>
                        <p className="text-xs text-gray-500">{num.locality || 'Unknown location'}</p>
                      </div>
                    </div>
                    {selectedPhoneId === num.id && <ChevronRight className="w-5 h-5 text-blue-500" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Call Logs */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col xl:col-span-5 min-h-[500px]">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Call Logs</h3>
              <p className="text-xs text-gray-500">
                {selectedPhoneId 
                  ? `Showing logs for ${phoneNumbers.find(p => p.id === selectedPhoneId)?.phoneNumber}` 
                  : 'Select a number first'
                }
              </p>
            </div>
            
            {logsTotalPages > 1 && (
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setLogsPage(p => Math.max(1, p - 1))}
                  disabled={logsPage === 1 || logsLoading}
                  className="p-1 rounded-md hover:bg-gray-100 disabled:opacity-50"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <span className="text-sm font-medium text-gray-700">
                  Page {logsPage} of {logsTotalPages}
                </span>
                <button 
                  onClick={() => setLogsPage(p => Math.min(logsTotalPages, p + 1))}
                  disabled={logsPage === logsTotalPages || logsLoading}
                  className="p-1 rounded-md hover:bg-gray-100 disabled:opacity-50"
                >
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-x-auto">
            {!selectedPhoneId ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 py-12">
                <PhoneCall className="w-12 h-12 mb-3 opacity-20" />
                <p>Select a phone number to view logs</p>
              </div>
            ) : logsLoading ? (
              <div className="flex justify-center items-center h-full min-h-[200px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 py-12">
                <FileText className="w-12 h-12 mb-3 opacity-20" />
                <p>No calls found for this date range.</p>
              </div>
            ) : (
              <table className="w-full text-sm text-left text-gray-500 min-w-[800px]">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-4 rounded-tl-lg">Call Date</th>
                    <th scope="col" className="px-6 py-4">From</th>
                    <th scope="col" className="px-6 py-4">To</th>
                    <th scope="col" className="px-6 py-4">Status</th>
                    <th scope="col" className="px-6 py-4">Duration</th>
                    <th scope="col" className="px-6 py-4 text-center">Recording</th>
                    <th scope="col" className="px-6 py-4 text-right rounded-tr-lg">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="bg-white border-b hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{new Date(log.createdAt).toLocaleDateString()}</div>
                        <div className="text-xs text-gray-400">{new Date(log.createdAt).toLocaleTimeString()}</div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs">{log.from}</td>
                      <td className="px-6 py-4 font-mono text-xs">{log.to}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          log.status.toLowerCase() === 'completed' ? 'bg-green-100 text-green-800' :
                          log.status.toLowerCase() === 'failed' ? 'bg-red-100 text-red-800' :
                          log.status.toLowerCase() === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {log.totalDuration ? `${Math.floor(log.totalDuration / 60)}m ${log.totalDuration % 60}s` : '—'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {log.recordingUrl ? (
                           <div className="flex justify-center min-w-[200px]">
                             <MiniAudioPlayer src={log.recordingUrl} />
                           </div>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-6 py-4 text-right font-medium whitespace-nowrap">
                        {log.totalCost !== null ? `$${log.totalCost.toFixed(4)}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {role === 'SUPER_ADMIN' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mt-6 overflow-hidden">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Twilio Account Summary</h3>
          {loadingQuota ? (
            <p className="text-gray-500 text-sm">Loading...</p>
          ) : quota ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
