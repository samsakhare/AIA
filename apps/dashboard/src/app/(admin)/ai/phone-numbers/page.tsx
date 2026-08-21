'use client';

import { useEffect, useState } from 'react';
import {
  Phone,
  MessageSquare,
  Image as ImageIcon,
  Printer,
  Globe,
  Activity,
  Edit2,
  User,
  Loader2
} from 'lucide-react';
import { API_URL } from '@/config/api';

interface UserData {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
}

interface TwilioNumber {
  id: string;
  sid: string;
  phoneNumber: string;
  locality: string | null;
  capabilities: {
    voice: boolean;
    sms: boolean;
    mms: boolean;
    fax: boolean;
  };
  status: 'ACTIVE' | 'RELEASED';
  createdAt: string;
  updatedAt: string;
  user: UserData | null;
  activeAgentId: string | null;
}

export default function AIPhoneNumbersPage() {
  const [numbers, setNumbers] = useState<TwilioNumber[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [editingPhone, setEditingPhone] = useState(false);
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);

  const [viewingLogs, setViewingLogs] = useState<string | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [numbersRes, agentsRes] = await Promise.all([
        fetch(`${API_URL}/twilio/phone-numbers`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/vapi/user/agents`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (numbersRes.ok) {
        const data = await numbersRes.json();
        setNumbers(data.phoneNumbers);
      }
      
      if (agentsRes.ok) {
        const data = await agentsRes.json();
        setAgents(data.agents || []);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignAgent = async (numberId: string, agentId: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/twilio/phone-numbers/${numberId}/agent`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ activeAgentId: agentId || null })
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.details || data.error || 'Failed to assign agent');
      }
      
      fetchData(); // Refresh the list
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleEditPhoneClick = (currentPhone: string) => {
    setNewPhoneNumber(currentPhone);
    setEditingPhone(true);
  };

  const submitPhoneChange = async () => {
    setSavingPhone(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/users/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ phoneNumber: newPhoneNumber })
      });
      if (!res.ok) throw new Error('Failed to update phone number');
      
      await fetchData();
      setEditingPhone(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingPhone(false);
    }
  };

  const handleViewLogs = async (numberId: string) => {
    setViewingLogs(numberId);
    setLoadingLogs(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/twilio/phone-numbers/${numberId}/logs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch logs');
      const data = await res.json();
      setLogs(data.logs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLogs(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My AI Phone Numbers</h1>
          <p className="text-gray-500 mt-1">View phone numbers assigned to your account.</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg flex items-center gap-2">
          <span>{error}</span>
        </div>
      )}

      {numbers.length === 0 && !error ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Phone className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No Phone Numbers Assigned</h3>
          <p className="text-gray-500 mt-1">You currently don't have any AI phone numbers assigned to you.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                  <th className="px-6 py-4">Phone Number</th>
                  <th className="px-6 py-4">Assigned To</th>
                  <th className="px-6 py-4">Active Agent</th>
                  <th className="px-6 py-4">Locality</th>
                  <th className="px-6 py-4">Capabilities</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {numbers.map((num) => (
                  <tr key={num.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{num.phoneNumber}</div>
                    </td>
                    <td className="px-6 py-4">
                      {num.user && (
                        <div className="inline-flex items-center gap-3 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-full">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                              <User className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-semibold text-blue-900">{num.user.name || 'User'}</span>
                              <span className="text-[10px] text-blue-600 font-medium">{num.user.phoneNumber}</span>
                            </div>
                          </div>
                          <div className="w-px h-6 bg-blue-200 mx-1"></div>
                          <button
                            onClick={() => handleEditPhoneClick(num.user?.phoneNumber || '')}
                            className="p-1 hover:bg-blue-200 rounded-full text-blue-600 transition-colors"
                            title="Edit personal phone number"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <select
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2 max-w-[200px]"
                        value={num.activeAgentId || ''}
                        onChange={(e) => handleAssignAgent(num.id, e.target.value)}
                      >
                        <option value="">No Agent (Forward to me)</option>
                        {agents.map((agent) => (
                          <option key={agent.id} value={agent.id}>
                            {agent.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {num.locality ? (
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-gray-400" />
                          {num.locality}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Not set</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {num.capabilities.voice && (
                          <div title="Voice" className="p-1.5 bg-green-50 text-green-600 rounded-md">
                            <Phone className="w-4 h-4" />
                          </div>
                        )}
                        {num.capabilities.sms && (
                          <div title="SMS" className="p-1.5 bg-blue-50 text-blue-600 rounded-md">
                            <MessageSquare className="w-4 h-4" />
                          </div>
                        )}
                        {num.capabilities.mms && (
                          <div title="MMS" className="p-1.5 bg-purple-50 text-purple-600 rounded-md">
                            <ImageIcon className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Activity className={`w-4 h-4 ${num.status === 'ACTIVE' ? 'text-green-500' : 'text-gray-400'}`} />
                        <span className={`text-sm font-medium ${num.status === 'ACTIVE' ? 'text-green-700' : 'text-gray-500'}`}>
                          {num.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleViewLogs(num.id)}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                      >
                        View Logs
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Phone Number Modal */}
      {editingPhone && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Update Phone Number</h2>
              <p className="text-sm text-gray-500 mb-4">
                Update the personal phone number associated with your account.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={newPhoneNumber}
                    onChange={(e) => setNewPhoneNumber(e.target.value)}
                    placeholder="+1234567890"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    autoFocus
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    <strong>Important:</strong> Include the country code without any spaces (e.g., +1234567890).
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setEditingPhone(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={submitPhoneChange}
                  disabled={savingPhone || !newPhoneNumber.trim()}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {savingPhone && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logs Panel */}
      {viewingLogs && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end">
          <div className="bg-white w-full max-w-3xl h-full shadow-2xl overflow-y-auto flex flex-col">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Call Logs</h2>
                <p className="text-sm text-gray-500">History for this Twilio number</p>
              </div>
              <button
                onClick={() => setViewingLogs(null)}
                className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 flex-1 bg-gray-50">
              {loadingLogs ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                  <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">No Logs Found</h3>
                  <p className="text-gray-500">There are no call records for this number while assigned to you.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {logs.map((log) => (
                    <div key={log.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                      <div 
                        className="p-4 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
                        onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                      >
                        <div className="flex items-center gap-6">
                          <div>
                            <p className="text-xs text-gray-500 font-medium">DATE</p>
                            <p className="text-sm font-semibold">{new Date(log.createdAt).toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 font-medium">FROM</p>
                            <p className="text-sm">{log.from}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 font-medium">TO</p>
                            <p className="text-sm">{log.to}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 font-medium">DURATION</p>
                            <p className="text-sm">{log.totalDuration ? `${log.totalDuration}s` : '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 font-medium">COST</p>
                            <p className="text-sm">{log.totalCost ? `$${log.totalCost}` : '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 font-medium">RECORDING</p>
                            <p className="text-sm">
                              {log.recordingUrl ? (
                                <span className="text-blue-600 font-medium">Yes</span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${log.status === 'completed' || log.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                            {log.status.toUpperCase()}
                          </span>
                          <span className="text-gray-400">
                            {expandedLogId === log.id ? '▼' : '▶'}
                          </span>
                        </div>
                      </div>

                      {expandedLogId === log.id && (
                        <div className="bg-gray-50 p-4 border-t border-gray-200 text-sm">
                          {log.recordingUrl && (
                            <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                              <p className="font-semibold text-gray-700 mb-2">Call Recording</p>
                              <audio controls src={log.recordingUrl} className="w-full h-10" />
                            </div>
                          )}
                          
                          <p className="font-semibold text-gray-700 mb-3">Internal Call Legs</p>
                          <div className="space-y-2">
                            {log.legs?.map((leg: any) => (
                              <div key={leg.id} className="flex items-center justify-between bg-white p-3 rounded border border-gray-200">
                                <div className="flex items-center gap-4">
                                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${leg.direction === 'Inbound' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                    {leg.direction}
                                  </span>
                                  <span className="text-gray-600">{leg.from} ➔ {leg.to}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                  <span className="text-gray-500">{leg.duration ? `${leg.duration}s` : '-'}</span>
                                  <span className="text-gray-500 font-mono text-xs bg-gray-50 px-2 py-1 rounded">{leg.cost ? `$${leg.cost}` : '-'}</span>
                                  <span className="text-gray-400 capitalize">{leg.status}</span>
                                </div>
                              </div>
                            ))}
                            {(!log.legs || log.legs.length === 0) && (
                              <p className="text-gray-500 italic">No leg details found.</p>
                            )}
                          </div>
                          
                          {log.user && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Assigned To</p>
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-gray-400" />
                                <span className="font-medium text-gray-900">{log.user.name || log.user.email}</span>
                                <span className="text-gray-500">({log.user.phoneNumber})</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
