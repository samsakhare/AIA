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
}

export default function AIPhoneNumbersPage() {
  const [numbers, setNumbers] = useState<TwilioNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [editingPhone, setEditingPhone] = useState(false);
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);

  useEffect(() => {
    fetchNumbers();
  }, []);

  const fetchNumbers = async () => {
    try {
      const res = await fetch(`${API_URL}/twilio/phone-numbers`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch phone numbers');
      setNumbers(data.phoneNumbers || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditPhoneClick = (currentPhone: string) => {
    setNewPhoneNumber(currentPhone);
    setEditingPhone(true);
  };

  const submitPhoneChange = async () => {
    if (!newPhoneNumber.trim()) return;
    setSavingPhone(true);
    try {
      const res = await fetch(`${API_URL}/users/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ phoneNumber: newPhoneNumber })
      });
      if (!res.ok) throw new Error('Failed to update phone number');
      
      // Update local storage just in case
      const existingUser = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...existingUser, phoneNumber: newPhoneNumber }));
      
      await fetchNumbers();
      setEditingPhone(false);
    } catch (error: any) {
      alert(error.message || 'Failed to update phone number');
    } finally {
      setSavingPhone(false);
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
                  <th className="px-6 py-4">Locality</th>
                  <th className="px-6 py-4">Capabilities</th>
                  <th className="px-6 py-4">Status</th>
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
                              <span className="text-sm font-semibold text-blue-900 leading-tight">
                                {num.user.name || 'User'}
                              </span>
                              <span className="text-xs text-blue-700 leading-tight">
                                {num.user.phoneNumber}
                              </span>
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
    </div>
  );
}
