'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Edit } from 'lucide-react';
import { API_URL } from '@/config/api';

export default function AiTemplatesPage() {
  const [rawAgents, setRawAgents] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  // Create Template Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedVapiId, setSelectedVapiId] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [masterPrompt, setMasterPrompt] = useState('');

  // Edit Template Modal
  const [editingTemplate, setEditingTemplate] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };

      const [rawRes, tempRes] = await Promise.all([
        fetch(`${API_URL}/vapi/admin/raw-agents`, { headers }),
        fetch(`${API_URL}/vapi/admin/templates`, { headers })
      ]);

      if (rawRes.ok) {
        const data = await rawRes.json();
        setRawAgents(data.agents || []);
      }
      if (tempRes.ok) {
        const data = await tempRes.json();
        setTemplates(data.templates || []);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/vapi/admin/templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          vapiTemplateId: selectedVapiId,
          name: templateName,
          description: templateDescription,
          masterPrompt
        })
      });

      if (!res.ok) throw new Error('Failed to create template');
      
      setShowCreateModal(false);
      resetForm();
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleEditTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/vapi/admin/templates/${editingTemplate.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: templateName,
          description: templateDescription,
          masterPrompt
        })
      });

      if (!res.ok) throw new Error('Failed to update template');
      
      setEditingTemplate(null);
      resetForm();
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template? This will not delete the User Agents derived from it, but no new ones can be created from it.')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/vapi/admin/templates/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete template');
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const resetForm = () => {
    setSelectedVapiId('');
    setTemplateName('');
    setTemplateDescription('');
    setMasterPrompt('');
  };

  const openCreateModal = (vapiAgent: any) => {
    resetForm();
    setSelectedVapiId(vapiAgent.id);
    setTemplateName(vapiAgent.name || '');
    setShowCreateModal(true);
  };

  const openEditModal = (template: any) => {
    setEditingTemplate(template);
    setTemplateName(template.name);
    setTemplateDescription(template.description || '');
    setMasterPrompt(template.masterPrompt || '');
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">AI Templates</h1>
      </div>
      
      {error && <div className="bg-red-50 text-red-600 p-4 rounded-md">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Promoted Templates */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-lg font-semibold text-gray-900">Active Templates</h2>
            <p className="text-sm text-gray-500 mt-1">These templates are available for users to clone.</p>
          </div>
          <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
            {templates.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No active templates found.</div>
            ) : (
              templates.map((t) => (
                <div key={t.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-900">{t.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">{t.description}</p>
                      <div className="mt-3">
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full border border-blue-100">
                          ID: {t.vapiTemplateId.slice(0,8)}...
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => openEditModal(t)} className="p-2 text-gray-400 hover:text-blue-600 bg-white shadow-sm border border-gray-200 rounded-md">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteTemplate(t.id)} className="p-2 text-gray-400 hover:text-red-600 bg-white shadow-sm border border-gray-200 rounded-md">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Raw Vapi Agents */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-lg font-semibold text-gray-900">Vapi Agents (Raw)</h2>
            <p className="text-sm text-gray-500 mt-1">Raw agents from your Vapi account. Promote them to templates.</p>
          </div>
          <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
            {rawAgents.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No raw agents found in Vapi.</div>
            ) : (
              rawAgents.map((agent) => {
                const isPromoted = templates.some(t => t.vapiTemplateId === agent.id);
                return (
                  <div key={agent.id} className={`p-6 hover:bg-gray-50 transition-colors ${isPromoted ? 'opacity-50' : ''}`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold text-gray-900">{agent.name || 'Unnamed Agent'}</h3>
                        <p className="text-xs text-gray-400 mt-1">{agent.id}</p>
                      </div>
                      {!isPromoted && (
                        <button 
                          onClick={() => openCreateModal(agent)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-800 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          Promote
                        </button>
                      )}
                      {isPromoted && (
                        <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded border border-green-200">
                          Promoted
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingTemplate) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">
                {editingTemplate ? 'Edit Template' : 'Promote to Template'}
              </h2>
            </div>
            <form onSubmit={editingTemplate ? handleEditTemplate : handleCreateTemplate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
                <input
                  type="text"
                  required
                  value={templateName}
                  onChange={e => setTemplateName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (User Facing)</label>
                <input
                  type="text"
                  required
                  value={templateDescription}
                  onChange={e => setTemplateDescription(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Master System Prompt (Hidden from users)
                </label>
                <p className="text-xs text-gray-500 mb-2">This is the base instructions for the agent. The user's business prompt will be appended to the end of this.</p>
                <textarea
                  required
                  rows={8}
                  value={masterPrompt}
                  onChange={e => setMasterPrompt(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  placeholder="You are a helpful assistant..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingTemplate(null);
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  {editingTemplate ? 'Save Changes' : 'Promote Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
