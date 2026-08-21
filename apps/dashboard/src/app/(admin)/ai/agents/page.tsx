'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Edit, FileText, Settings, ShieldCheck, Phone } from 'lucide-react';
import { API_URL } from '@/config/api';

export default function UserAgentsPage() {
  const [agents, setAgents] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  // Creation Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [agentName, setAgentName] = useState('');
  const [userBusinessPrompt, setUserBusinessPrompt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Modal
  const [editingAgent, setEditingAgent] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'' | 'syncing' | 'synced' | 'error'>('');

  // Admin assigning
  const [isAdmin, setIsAdmin] = useState(false);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [targetUserId, setTargetUserId] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      if (!token) {
        router.push('/login');
        return;
      }

      let isSuperAdmin = false;
      if (userStr) {
        try {
          const u = JSON.parse(userStr);
          isSuperAdmin = u.role === 'SUPER_ADMIN';
          setIsAdmin(isSuperAdmin);
        } catch (e) {}
      }

      const headers = { Authorization: `Bearer ${token}` };
      const requests = [
        fetch(`${API_URL}/vapi/user/agents`, { headers }),
        fetch(`${API_URL}/vapi/user/templates`, { headers })
      ];

      if (isSuperAdmin) {
        requests.push(fetch(`${API_URL}/users`, { headers }));
      }

      const responses = await Promise.all(requests);
      
      const agentsRes = responses[0];
      const tempRes = responses[1];
      const usersRes = isSuperAdmin ? responses[2] : null;

      if (agentsRes.ok) {
        const data = await agentsRes.json();
        setAgents(data.agents || []);
      }
      if (tempRes.ok) {
        const data = await tempRes.json();
        setTemplates(data.templates || []);
      }
      if (usersRes && usersRes.ok) {
        const data = await usersRes.json();
        setUsersList(Array.isArray(data) ? data : (data.users || []));
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const payload: any = {
        templateId: selectedTemplateId,
        name: agentName,
        userBusinessPrompt
      };
      
      if (isAdmin && targetUserId) {
        payload.targetUserId = targetUserId;
      }

      const res = await fetch(`${API_URL}/vapi/user/agents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to create agent');
      
      setShowCreateModal(false);
      resetForm();
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAgent) return;
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/vapi/user/agents/${editingAgent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: agentName,
          userBusinessPrompt
        })
      });

      if (!res.ok) throw new Error('Failed to update agent');
      
      setEditingAgent(null);
      resetForm();
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAgent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this agent permanently?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/vapi/user/agents/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete agent');
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const resetForm = () => {
    setSelectedTemplateId('');
    setAgentName('');
    setUserBusinessPrompt('');
    setTargetUserId('');
  };

  const openCreateModal = (templateId: string) => {
    resetForm();
    setSelectedTemplateId(templateId);
    setShowCreateModal(true);
  };

  const openEditModal = async (agent: any) => {
    // 1. Instantly open UI with local data
    setEditingAgent(agent);
    setAgentName(agent.name);
    setUserBusinessPrompt(agent.userBusinessPrompt || '');
    
    // 2. Start JIT Sync
    setIsSyncing(true);
    setSyncStatus('syncing');
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/vapi/user/agents/${agent.id}/sync`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // 3. Update UI if Vapi had fresh data
        setAgentName(data.agent.name);
        setUserBusinessPrompt(data.agent.userBusinessPrompt || '');
        setSyncStatus('synced');
      } else {
        setSyncStatus('error');
      }
    } catch (error) {
      console.error("Sync failed", error);
      setSyncStatus('error');
    } finally {
      setIsSyncing(false);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My AI Agents</h1>
          <p className="text-sm text-gray-500 mt-1">Configure your business logic and manage your AI assistants.</p>
        </div>
      </div>
      
      {error && <div className="bg-red-50 text-red-600 p-4 rounded-md">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* User's Agents */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Active Agents</h2>
          
          {agents.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <ShieldCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No agents yet</h3>
              <p className="text-gray-500 mt-2 max-w-sm mx-auto">Choose a template from the right to create your first AI agent.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {agents.map((agent) => (
                <div key={agent.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-100 p-2 rounded-lg">
                        <Settings className="w-5 h-5 text-blue-700" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-gray-900">{agent.name}</h3>
                          <div className="flex items-center gap-1">
                            <div 
                              className={`w-2 h-2 rounded-full ${agent.twilioNumbers?.length > 0 ? 'bg-green-500' : 'bg-red-500'}`} 
                              title={agent.twilioNumbers?.length > 0 ? 'Linked to phone number' : 'Not linked to any phone number'}
                            ></div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                            {agent.template?.name || 'Custom Template'}
                          </span>
                          {agent.user && (
                            <span className={`text-xs font-medium px-2 py-0.5 rounded ${agent.user.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                              {agent.user.role === 'SUPER_ADMIN' 
                                ? '(System)' 
                                : `${agent.user.tenant?.name ? agent.user.tenant.name + ' | ' : ''}${agent.user.email}`
                              }
                            </span>
                          )}
                          {agent.twilioNumbers?.map((num: any, idx: number) => (
                            <span key={idx} className="text-xs font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100 flex items-center gap-1" title="Linked Twilio Number">
                              <Phone className="w-3 h-3" />
                              {num.phoneNumber}
                            </span>
                          ))}
                          <span className="text-xs text-gray-400">ID: {agent.vapiAgentId.slice(0, 8)}...</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        Business Instructions
                      </h4>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-3">
                        {agent.userBusinessPrompt || <span className="text-gray-400 italic">No custom instructions provided.</span>}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex md:flex-col gap-2 shrink-0">
                    <button 
                      onClick={() => openEditModal(agent)} 
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
                    >
                      <Edit className="w-4 h-4" />
                      Edit Prompt
                    </button>
                    <button 
                      onClick={() => handleDeleteAgent(agent.id)} 
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Available Templates */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Available Templates</h2>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="divide-y divide-gray-100">
              {templates.length === 0 ? (
                <div className="p-6 text-center text-gray-500 text-sm">No templates available.</div>
              ) : (
                templates.map((t) => (
                  <div key={t.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <h3 className="font-bold text-gray-900 text-base">{t.name}</h3>
                    <p className="text-sm text-gray-500 mt-2 mb-4 leading-relaxed">{t.description}</p>
                    <button 
                      onClick={() => openCreateModal(t.id)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                    >
                      <Plus className="w-4 h-4" />
                      Use Template
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingAgent) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-100 bg-gray-50 shrink-0 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {editingAgent ? 'Edit Agent Configuration' : 'Configure New Agent'}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {editingAgent ? 'Update your business instructions.' : 'Add your business logic to customize this agent.'}
                  </p>
                </div>
                {editingAgent && (
                  <div className="flex items-center gap-2">
                    {isSyncing ? (
                      <div className="flex items-center gap-2 text-sm text-amber-600 font-medium px-3 py-1 bg-amber-50 rounded-full animate-pulse border border-amber-200">
                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                        Syncing with Vapi...
                      </div>
                    ) : syncStatus === 'error' ? (
                      <div className="flex items-center gap-2 text-sm text-red-600 font-medium px-3 py-1 bg-red-50 rounded-full border border-red-200">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        Sync Failed
                      </div>
                    ) : syncStatus === 'synced' ? (
                      <div className="flex items-center gap-2 text-sm text-green-600 font-medium px-3 py-1 bg-green-50 rounded-full border border-green-200">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        Synced
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            
            <form onSubmit={editingAgent ? handleEditAgent : handleCreateAgent} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 space-y-5 overflow-y-auto flex-1">
                {isAdmin && !editingAgent && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-1">Target User</label>
                    <select
                      value={targetUserId}
                      onChange={e => setTargetUserId(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select a user...</option>
                      {usersList.map((u: any) => (
                        <option key={u.id} value={u.id}>
                          {u.name || u.email} {u.tenant?.name ? `(${u.tenant.name})` : ''}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Select the user this agent will belong to.</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1">Agent Name</label>
                  <input
                    type="text"
                    required
                    disabled={isSyncing || isSubmitting}
                    value={agentName}
                    onChange={e => setAgentName(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-50"
                    placeholder="e.g., Front Desk Receptionist"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1">
                    Business Instructions (Prompt)
                  </label>
                  <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg mb-3">
                    <p className="text-xs text-blue-800 leading-relaxed">
                      <strong>Tip:</strong> Tell the agent about your specific business, pricing, frequently asked questions, and how you want them to greet callers.
                    </p>
                  </div>
                  <textarea
                    required
                    disabled={isSyncing || isSubmitting}
                    value={userBusinessPrompt}
                    onChange={e => setUserBusinessPrompt(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-3 h-32 outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm disabled:opacity-50 disabled:bg-gray-50"
                    placeholder="Example: We are 'Sunrise Plumbing'. Our standard dispatch fee is $75. We operate 24/7. Always ask for the caller's address first..."
                  />
                </div>
              </div>
              
              <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingAgent(null);
                  }}
                  className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSyncing || isSubmitting}
                  className="px-5 py-2.5 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors flex items-center justify-center min-w-[120px] disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    editingAgent ? 'Save Changes' : 'Create Agent'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
