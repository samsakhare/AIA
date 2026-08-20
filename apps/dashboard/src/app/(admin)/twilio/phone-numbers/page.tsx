'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Phone,
  MessageSquare,
  Image as ImageIcon,
  Printer,
  Globe,
  Activity,
  Settings2,
  RefreshCw,
  Trash2,
  AlertTriangle,
  UserPlus,
  UserMinus,
  X,
  Search,
  User,
  Loader2
} from 'lucide-react';
import { API_URL } from '@/config/api';

export default function PhoneNumbersPage() {
  const [phoneNumbers, setPhoneNumbers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  
  const [viewingLogs, setViewingLogs] = useState<string | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const router = useRouter();

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

  // Assignment Modal State
  const [users, setUsers] = useState<any[]>([]);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedNumber, setSelectedNumber] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchPhoneNumbers = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }
      const res = await fetch(`${API_URL}/twilio/phone-numbers`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!res.ok) {
        throw new Error('Failed to fetch phone numbers');
      }

      const data = await res.json();
      setPhoneNumbers(data.phoneNumbers);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch users', err);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/twilio/phone-numbers/sync`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to sync phone numbers');
      }
      await fetchPhoneNumbers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        'Are you sure you want to delete this number from the local database? If it still exists in Twilio, syncing will restore it.'
      )
    ) {
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/twilio/phone-numbers/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete phone number');
      }
      await fetchPhoneNumbers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUnassignDirect = async (numberId: string) => {
    if (!confirm('Are you sure you want to unassign this user?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/twilio/phone-numbers/${numberId}/assign`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId: null })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to unassign user');
      }
      await fetchPhoneNumbers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAssignUser = async (userId: string | null) => {
    if (!selectedNumber) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/twilio/phone-numbers/${selectedNumber.id}/assign`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to assign user');
      }
      setAssignModalOpen(false);
      await fetchPhoneNumbers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const openAssignModal = (number: any) => {
    setSelectedNumber(number);
    setSearchQuery('');
    setAssignModalOpen(true);
    fetchUsers();
  };

  useEffect(() => {
    fetchPhoneNumbers();
  }, [router]);

  const filteredUsers = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phoneNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading Twilio Phone Numbers...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Phone Numbers</h1>
          <p className="text-gray-500 mt-1">
            Manage your synchronized Twilio phone numbers and assignments.
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Sync from Twilio'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 border border-red-100">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-500">
                <th className="px-6 py-4 font-medium">Phone Number</th>
                <th className="px-6 py-4 font-medium">Locality</th>
                <th className="px-6 py-4 font-medium">Capabilities</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Assigned To</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {phoneNumbers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No phone numbers found in the local database. Click Sync to fetch from Twilio.
                  </td>
                </tr>
              ) : (
                phoneNumbers.map((number: any) => {
                  const twilioData = number.twilioData || {};
                  return (
                    <tr key={number.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">
                          {twilioData.friendlyName || number.phoneNumber}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">{number.phoneNumber}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <Globe className="w-4 h-4 text-gray-400" />
                          {number.locality || 'Unknown'}{' '}
                          {twilioData.region ? `, ${twilioData.region}` : ''}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          {number.capabilities?.voice && (
                            <div
                              title="Voice"
                              className="p-1.5 bg-blue-50 text-blue-600 rounded-md"
                            >
                              <Phone className="w-4 h-4" />
                            </div>
                          )}
                          {number.capabilities?.sms && (
                            <div
                              title="SMS"
                              className="p-1.5 bg-green-50 text-green-600 rounded-md"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {number.status === 'RELEASED' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Released
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            <Activity className="w-3.5 h-3.5" />
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {number.user ? (
                          <div className="inline-flex items-center gap-3 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-full shadow-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center font-bold text-xs">
                                {number.user.name?.[0]?.toUpperCase() || 'U'}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-medium text-blue-900 text-xs leading-none">
                                  {number.user.name}
                                </span>
                                <span className="text-[10px] text-blue-600 mt-0.5">
                                  {number.user.phoneNumber || 'No phone number'}
                                </span>
                              </div>
                            </div>
                            <div className="w-px h-6 bg-blue-200 mx-0.5"></div>
                            <button
                              onClick={() => handleUnassignDirect(number.id)}
                              className="p-1 hover:bg-blue-200 rounded-full text-blue-500 hover:text-blue-800 transition-colors"
                              title="Unassign User"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-500">
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleViewLogs(number.id)}
                            className="p-2 text-gray-400 hover:text-green-600 transition-colors rounded-lg hover:bg-green-50"
                            title="View Logs"
                          >
                            <Activity className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openAssignModal(number)}
                            className="p-2 text-gray-400 hover:text-blue-600 transition-colors rounded-lg hover:bg-blue-50"
                            title="Assign User"
                          >
                            <UserPlus className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(number.id)}
                            className="p-2 text-gray-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
                            title="Delete from local database"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assign User Modal */}
      {assignModalOpen && selectedNumber && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-bold text-gray-900">
                Assign to {selectedNumber.phoneNumber}
              </h2>
              <button
                onClick={() => setAssignModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b border-gray-100">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, email, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition-all text-sm"
                />
              </div>
            </div>

            <div className="overflow-y-auto p-2 flex-1 min-h-[300px]">
              {filteredUsers.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">No users found.</div>
              ) : (
                <div className="space-y-1">
                  {filteredUsers.map((u) => (
                    <div
                      key={u.id}
                      className={`flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors ${selectedNumber.userId === u.id ? 'bg-blue-50/50 border border-blue-100' : 'border border-transparent'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                          {u.name?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 text-sm">
                            {u.name || 'Unnamed'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {u.phoneNumber || 'No phone number'}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleAssignUser(u.id)}
                        disabled={selectedNumber.userId === u.id}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                          selectedNumber.userId === u.id
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
                        }`}
                      >
                        {selectedNumber.userId === u.id ? 'Assigned' : 'Select'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between">
              {selectedNumber.userId ? (
                <button
                  onClick={() => handleAssignUser(null)}
                  className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                >
                  Unassign User
                </button>
              ) : (
                <div></div>
              )}
              <button
                onClick={() => setAssignModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Close
              </button>
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
                  <p className="text-gray-500">There are no call records for this number.</p>
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
