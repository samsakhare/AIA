'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Phone, MessageSquare, Image as ImageIcon, Printer, Globe, Activity, Settings2 } from 'lucide-react';

export default function PhoneNumbersPage() {
  const [phoneNumbers, setPhoneNumbers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  const apiUrl = process.env.NODE_ENV === 'production' 
    ? 'https://aia-api.srv1575169.hstgr.cloud/twilio/phone-numbers' 
    : 'http://localhost:8080/twilio/phone-numbers';

  const fetchPhoneNumbers = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }
      const res = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
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

  useEffect(() => {
    fetchPhoneNumbers();
  }, [router]);

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading Twilio Phone Numbers...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Phone Numbers</h1>
          <p className="text-gray-500 mt-1">Manage your purchased Twilio phone numbers and their capabilities.</p>
        </div>
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
                <th className="px-6 py-4 font-medium">Active Configuration</th>
                <th className="px-6 py-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {phoneNumbers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No phone numbers found in this Twilio account.
                  </td>
                </tr>
              ) : (
                phoneNumbers.map((number: any) => (
                  <tr key={number.sid} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{number.friendlyName}</div>
                      <div className="text-xs text-gray-400 mt-1">{number.phoneNumber}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <Globe className="w-4 h-4 text-gray-400" />
                        {number.locality || 'Unknown'} {number.region ? `, ${number.region}` : ''}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {number.capabilities?.voice && (
                          <div title="Voice" className="p-1.5 bg-blue-50 text-blue-600 rounded-md">
                            <Phone className="w-4 h-4" />
                          </div>
                        )}
                        {number.capabilities?.sms && (
                          <div title="SMS" className="p-1.5 bg-green-50 text-green-600 rounded-md">
                            <MessageSquare className="w-4 h-4" />
                          </div>
                        )}
                        {number.capabilities?.mms && (
                          <div title="MMS" className="p-1.5 bg-purple-50 text-purple-600 rounded-md">
                            <ImageIcon className="w-4 h-4" />
                          </div>
                        )}
                        {number.capabilities?.fax && (
                          <div title="Fax" className="p-1.5 bg-gray-100 text-gray-600 rounded-md">
                            <Printer className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 text-xs text-gray-600">
                        {number.voiceUrl && (
                          <div className="flex items-center gap-1.5" title="Voice Webhook">
                            <Settings2 className="w-3 h-3 text-blue-500" />
                            <span className="truncate max-w-[200px]">{number.voiceUrl}</span>
                          </div>
                        )}
                        {number.smsUrl && (
                          <div className="flex items-center gap-1.5" title="SMS Webhook">
                            <Settings2 className="w-3 h-3 text-green-500" />
                            <span className="truncate max-w-[200px]">{number.smsUrl}</span>
                          </div>
                        )}
                        {!number.voiceUrl && !number.smsUrl && (
                          <span className="text-gray-400 italic">No webhooks configured</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${number.status === 'in-use' || number.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                        <Activity className="w-3.5 h-3.5" />
                        {number.status || 'Active'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
