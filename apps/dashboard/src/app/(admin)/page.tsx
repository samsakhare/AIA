export default function DashboardHome() {
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

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Calls</h3>
        <p className="text-gray-500 text-sm">No calls have been routed yet. Configure your Twilio webhook to get started.</p>
      </div>
    </div>
  );
}
