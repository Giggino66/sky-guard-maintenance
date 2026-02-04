
import React, { useState, useMemo } from 'react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  Plane, 
  Settings, 
  LayoutDashboard, 
  ClipboardList, 
  AlertTriangle, 
  Plus, 
  Sparkles,
  BarChart3,
  Clock,
  Package,
  CheckCircle2,
  X,
  History,
  Box,
  Truck,
  Trash2,
  Edit2
} from 'lucide-react';
import { INITIAL_AIRCRAFT, INITIAL_COMPONENTS } from './constants';
import { MaintenanceType, Criticality } from './types';
import { calculatePrediction } from './utils/maintenance';
import { getMaintenanceAdvice } from './services/geminiService';

// --- Shared Components ---

function SidebarLink({ to, icon: Icon, label }) {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
        isActive 
          ? 'bg-blue-600 text-white' 
          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
      }`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </Link>
  );
}

// Interface added to fix 'children' prop type error in .tsx file
interface ModalProps {
  isOpen: any;
  onClose: any;
  title: any;
  children?: React.ReactNode;
}

function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h3 className="font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

// --- Page Components ---

function Dashboard({ aircraft, predictions }) {
  const criticalCount = predictions.filter(p => p.actionRequired === 'Immediate').length;
  const procureCount = predictions.filter(p => p.actionRequired === 'Procure').length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">Fleet & Inventory Dashboard</h1>
        <p className="text-slate-500">Real-time monitoring of aircraft and ground assets.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Plane size={24} /></div>
            <span className="text-xs font-semibold text-slate-400 uppercase">Active Fleet</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{aircraft.length} Aircraft</div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-red-100 text-red-600 rounded-lg"><AlertTriangle size={24} /></div>
            <span className="text-xs font-semibold text-slate-400 uppercase">Immediate</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{criticalCount} Tasks</div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-orange-100 text-orange-600 rounded-lg"><Package size={24} /></div>
            <span className="text-xs font-semibold text-slate-400 uppercase">Lead Time Alert</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{procureCount} Procurements</div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-green-100 text-green-600 rounded-lg"><Box size={24} /></div>
            <span className="text-xs font-semibold text-slate-400 uppercase">Ground Assets</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">Tracked</div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Predictive Expirations</h2>
          <Link to="/reports" className="text-sm text-blue-600 font-medium hover:underline">View Full Report</Link>
        </div>
        <div className="divide-y divide-slate-100">
          {predictions.sort((a,b) => a.daysRemaining - b.daysRemaining).slice(0, 5).map((p, i) => (
            <div key={`pred-${i}`} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50">
              <div className="flex items-center gap-4">
                <div className={`w-2 h-2 rounded-full ${p.actionRequired === 'Immediate' ? 'bg-red-500' : p.actionRequired === 'Procure' ? 'bg-orange-500' : 'bg-green-500'}`} />
                <div>
                  <div className="font-medium text-slate-900">{p.componentName}</div>
                  <div className="text-xs text-slate-500">{p.aircraftRegistration} • {p.requirementDescription}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-slate-900">
                  {p.daysRemaining > 3000 ? 'Calendar Only' : `${p.daysRemaining} days left`}
                </div>
                <div className="text-xs text-slate-500">{p.estimatedDueDate.toLocaleDateString()}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FleetView({ aircraft, onAddAircraft, onEditAircraft, onDeleteAircraft, onUpdateUsage }) {
  const [selectedAcCounters, setSelectedAcCounters] = useState(null);
  const [editingAc, setEditingAc] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Aircraft Inventory</h1>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={18} />
          Add Aircraft
        </button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {aircraft.map(ac => (
          <div key={ac.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between group hover:border-blue-300 transition-all">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="text-2xl font-black text-slate-900 font-mono tracking-tighter mb-1">{ac.registration}</div>
                <div className="text-slate-500 font-medium">{ac.model}</div>
              </div>
              <div className="flex flex-col gap-2">
                <div className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-bold uppercase tracking-wider text-center">Active</div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  <button 
                    onClick={() => setSelectedAcCounters(ac)}
                    className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all"
                    title="Update Counters"
                  >
                    <History size={16} />
                  </button>
                  <button 
                    onClick={() => setEditingAc(ac)}
                    className="p-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-all"
                    title="Edit Aircraft"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => onDeleteAircraft(ac.id)}
                    className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all"
                    title="Delete Aircraft"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 border-t border-slate-100 pt-6">
              <div>
                <div className="text-xs text-slate-400 font-bold uppercase mb-1">Flight Hours</div>
                <div className="text-lg font-bold text-slate-800 font-mono">{ac.totalFlightHours}h</div>
              </div>
              <div>
                <div className="text-xs text-slate-400 font-bold uppercase mb-1">Cycles</div>
                <div className="text-lg font-bold text-slate-800 font-mono">{ac.totalCycles}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400 font-bold uppercase mb-1">Avg. Monthly</div>
                <div className="text-lg font-bold text-slate-800 font-mono">{ac.avgMonthlyFH}h</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Aircraft Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Register New Aircraft">
        <form onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          onAddAircraft({
            registration: fd.get('reg'),
            model: fd.get('model'),
            totalFlightHours: Number(fd.get('fh')),
            totalOperatingHours: Number(fd.get('oh')),
            totalCycles: Number(fd.get('cycles')),
            avgMonthlyFH: Number(fd.get('avgFH')),
            avgMonthlyCycles: Number(fd.get('avgC'))
          });
          setIsAddModalOpen(false);
        }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Registration</label>
              <input name="reg" placeholder="I-XXXX" required className="w-full px-4 py-2 rounded-lg border border-slate-200" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Model</label>
              <input name="model" placeholder="Cessna 172" required className="w-full px-4 py-2 rounded-lg border border-slate-200" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Total FH</label>
              <input name="fh" type="number" step="0.1" defaultValue="0" className="w-full px-4 py-2 rounded-lg border border-slate-200" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Total OH</label>
              <input name="oh" type="number" step="0.1" defaultValue="0" className="w-full px-4 py-2 rounded-lg border border-slate-200" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Total Cycles</label>
              <input name="cycles" type="number" defaultValue="0" className="w-full px-4 py-2 rounded-lg border border-slate-200" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Avg Monthly FH</label>
              <input name="avgFH" type="number" defaultValue="30" className="w-full px-4 py-2 rounded-lg border border-slate-200" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Avg Monthly Cycles</label>
              <input name="avgC" type="number" defaultValue="150" className="w-full px-4 py-2 rounded-lg border border-slate-200" />
            </div>
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700">Add to Fleet</button>
        </form>
      </Modal>

      {/* Edit Aircraft Modal */}
      <Modal isOpen={!!editingAc} onClose={() => setEditingAc(null)} title={`Edit Aircraft: ${editingAc?.registration}`}>
        <form onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          onEditAircraft(editingAc.id, {
            registration: fd.get('reg'),
            model: fd.get('model'),
            avgMonthlyFH: Number(fd.get('avgFH')),
            avgMonthlyCycles: Number(fd.get('avgC'))
          });
          setEditingAc(null);
        }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Registration</label>
              <input name="reg" defaultValue={editingAc?.registration} required className="w-full px-4 py-2 rounded-lg border border-slate-200" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Model</label>
              <input name="model" defaultValue={editingAc?.model} required className="w-full px-4 py-2 rounded-lg border border-slate-200" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Avg Monthly FH</label>
              <input name="avgFH" type="number" defaultValue={editingAc?.avgMonthlyFH} className="w-full px-4 py-2 rounded-lg border border-slate-200" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Avg Monthly Cycles</label>
              <input name="avgC" type="number" defaultValue={editingAc?.avgMonthlyCycles} className="w-full px-4 py-2 rounded-lg border border-slate-200" />
            </div>
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700">Save Changes</button>
        </form>
      </Modal>

      {/* Counters Update Modal */}
      <Modal 
        isOpen={!!selectedAcCounters} 
        onClose={() => setSelectedAcCounters(null)} 
        title={`Update Counters: ${selectedAcCounters?.registration || ''}`}
      >
        <form onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          if (selectedAcCounters) {
            onUpdateUsage(
              selectedAcCounters.id,
              Number(formData.get('fh')),
              Number(formData.get('oh')),
              Number(formData.get('cycles'))
            );
            setSelectedAcCounters(null);
          }
        }} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Total Flight Hours</label>
            <input name="fh" type="number" step="0.1" defaultValue={selectedAcCounters?.totalFlightHours} required className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Total Operating Hours</label>
            <input name="oh" type="number" step="0.1" defaultValue={selectedAcCounters?.totalOperatingHours} required className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Total Cycles</label>
            <input name="cycles" type="number" defaultValue={selectedAcCounters?.totalCycles} required className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200">
            Save New Counters
          </button>
        </form>
      </Modal>
    </div>
  );
}

function ReportsView({ predictions, components }) {
  const [aiAdvice, setAiAdvice] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleAiAdvice() {
    setLoading(true);
    const advice = await getMaintenanceAdvice(predictions, components);
    setAiAdvice(advice || 'No strategic advice available at this time.');
    setLoading(false);
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Procurement & Maintenance Report</h1>
        <button 
          onClick={handleAiAdvice}
          disabled={loading}
          className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
        >
          <Sparkles size={18} />
          {loading ? 'Analyzing...' : 'Generate AI Strategy'}
        </button>
      </div>

      {aiAdvice && (
        <div className="bg-purple-50 border border-purple-100 rounded-xl p-6 relative">
           <button 
            onClick={() => setAiAdvice('')}
            className="absolute top-4 right-4 text-purple-400 hover:text-purple-600"
           >
            <X size={20} />
           </button>
           <h3 className="flex items-center gap-2 text-purple-800 font-bold mb-3">
             <Sparkles size={18} />
             AI Maintenance Insights
           </h3>
           <div className="text-purple-900 leading-relaxed whitespace-pre-wrap text-sm">
             {aiAdvice}
           </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Component</th>
              <th className="px-6 py-4">Aircraft</th>
              <th className="px-6 py-4">Est. Due</th>
              <th className="px-6 py-4">Days Left</th>
              <th className="px-6 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {predictions.sort((a,b) => a.daysRemaining - b.daysRemaining).map((p, i) => (
              <tr key={`report-${i}`} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-semibold text-slate-900">{p.componentName}</div>
                  <div className="text-xs text-slate-500">{p.requirementDescription}</div>
                </td>
                <td className="px-6 py-4 text-slate-600 font-mono text-sm">
                  {p.aircraftRegistration === 'Storage' ? (
                    <span className="flex items-center gap-1 text-slate-400 italic">
                      <Box size={14} /> Ground
                    </span>
                  ) : p.aircraftRegistration}
                </td>
                <td className="px-6 py-4 text-slate-600 text-sm">{p.estimatedDueDate.toLocaleDateString()}</td>
                <td className="px-6 py-4 text-slate-600 font-bold">
                  {p.daysRemaining > 3000 ? 'No Usage' : p.daysRemaining}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                    p.actionRequired === 'Immediate' ? 'bg-red-100 text-red-700' :
                    p.actionRequired === 'Procure' ? 'bg-orange-100 text-orange-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {p.actionRequired}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- Main App ---

export default function App() {
  const [aircraft, setAircraft] = useState(INITIAL_AIRCRAFT);
  const [components, setComponents] = useState(INITIAL_COMPONENTS);
  const [activeTaskModal, setActiveTaskModal] = useState(null);
  const [isAddComponentOpen, setIsAddComponentOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState(null);
  const [groundUsageModal, setGroundUsageModal] = useState(null);

  const predictions = useMemo(() => {
    const allPredictions = [];
    components.forEach(comp => {
      const ac = aircraft.find(a => a.id === comp.aircraftId);
      const results = calculatePrediction(comp, ac);
      allPredictions.push(...results);
    });
    return allPredictions;
  }, [aircraft, components]);

  // Aircraft Handlers
  function addAircraft(data) {
    const newAc = {
      id: `ac-${Date.now()}`,
      ...data
    };
    setAircraft(prev => [...prev, newAc]);
  }

  function editAircraft(acId, data) {
    setAircraft(prev => prev.map(ac => ac.id === acId ? { ...ac, ...data } : ac));
  }

  function deleteAircraft(acId) {
    if (window.confirm("Eliminando il velivolo, tutti i componenti installati verranno spostati in magazzino. Procedere?")) {
      setAircraft(prev => prev.filter(ac => ac.id !== acId));
      setComponents(prev => prev.map(c => c.aircraftId === acId ? { ...c, aircraftId: null } : c));
    }
  }

  function updateAircraftUsage(acId, fh, oh, cycles) {
    setAircraft(prev => prev.map(ac => ac.id === acId ? {
      ...ac,
      totalFlightHours: fh,
      totalOperatingHours: oh,
      totalCycles: cycles
    } : ac));
  }

  // Component Handlers
  function addComponent(data) {
    const newComp = {
      id: `cmp-${Date.now()}`,
      currentFH: 0,
      currentOH: 0,
      currentCycles: 0,
      ...data
    };
    setComponents(prev => [...prev, newComp]);
  }

  function editComponent(compId, data) {
    setComponents(prev => prev.map(c => c.id === compId ? { ...c, ...data } : c));
  }

  function deleteComponent(compId) {
    if (window.confirm("Sei sicuro di voler eliminare questo componente? L'azione è irreversibile.")) {
      setComponents(prev => prev.filter(c => c.id !== compId));
    }
  }

  function updateGroundUsage(compId, fh, oh, cycles) {
    setComponents(prev => prev.map(c => c.id === compId ? {
      ...c,
      currentFH: fh,
      currentOH: oh,
      currentCycles: cycles
    } : c));
    setGroundUsageModal(null);
  }

  function completeMaintenanceTask(compId, reqId, completionValue) {
    setComponents(prev => prev.map(comp => {
      if (comp.id !== compId) return comp;
      return {
        ...comp,
        requirements: comp.requirements.map(req => {
          if (req.id !== reqId) return req;
          
          let nextDueValue = req.nextDueValue;
          if (req.type === MaintenanceType.CALENDAR) {
            const lastDate = new Date(completionValue);
            lastDate.setDate(lastDate.getDate() + Number(req.interval));
            nextDueValue = lastDate.toISOString().split('T')[0];
          } else {
            nextDueValue = Number(completionValue) + Number(req.interval);
          }

          return {
            ...req,
            lastPerformedValue: completionValue,
            nextDueValue
          };
        })
      };
    }));
    setActiveTaskModal(null);
  }

  return (
    <HashRouter>
      <div className="flex min-h-screen bg-slate-50">
        <aside className="w-64 bg-slate-900 text-white flex flex-col sticky top-0 h-screen">
          <div className="p-6 flex items-center gap-3 border-b border-slate-800">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Plane size={24} className="text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">SkyGuard</span>
          </div>

          <nav className="flex-1 p-4 space-y-2 mt-4">
            <SidebarLink to="/" icon={LayoutDashboard} label="Dashboard" />
            <SidebarLink to="/fleet" icon={Plane} label="Fleet" />
            <SidebarLink to="/components" icon={ClipboardList} label="Inventory" />
            <SidebarLink to="/reports" icon={BarChart3} label="Reports" />
            <SidebarLink to="/settings" icon={Settings} label="Settings" />
          </nav>

          <div className="p-4 border-t border-slate-800">
            <div className="bg-slate-800/50 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold">JD</div>
                <div className="text-sm">
                  <div className="font-medium">Admin</div>
                  <div className="text-slate-400 text-xs truncate">Maintenance Manager</div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 p-8 lg:p-12 overflow-auto">
          <div className="max-w-7xl mx-auto">
            <Routes>
              <Route path="/" element={<Dashboard aircraft={aircraft} predictions={predictions} />} />
              <Route path="/fleet" element={
                <FleetView 
                  aircraft={aircraft} 
                  onAddAircraft={addAircraft} 
                  onEditAircraft={editAircraft} 
                  onDeleteAircraft={deleteAircraft} 
                  onUpdateUsage={updateAircraftUsage} 
                />
              } />
              <Route path="/reports" element={<ReportsView predictions={predictions} components={components} />} />
              <Route path="/components" element={
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-slate-900">Components & Ground Assets</h1>
                    <button 
                      onClick={() => setIsAddComponentOpen(true)}
                      className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plus size={18} />
                      Register Component
                    </button>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                        <tr>
                          <th className="px-6 py-4">Asset / Task</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4">Usage (FH/OH/C)</th>
                          <th className="px-6 py-4">Next Due</th>
                          <th className="px-6 py-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {components.map(c => {
                          const ac = aircraft.find(a => a.id === c.aircraftId);
                          return (
                            <React.Fragment key={`comp-group-${c.id}`}>
                              {c.requirements.map((req, reqIndex) => {
                                const pred = predictions.find(p => p.componentId === c.id && p.requirementDescription === req.description);
                                return (
                                  <tr key={`req-${req.id}`} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-6 py-4">
                                      <div className="flex items-center gap-2">
                                        <div className="font-semibold text-slate-900">{c.name}</div>
                                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                                          c.criticality === Criticality.HIGH ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-500'
                                        }`}>{c.criticality}</span>
                                      </div>
                                      <div className="text-xs text-slate-500">{req.description} ({req.type})</div>
                                      <div className="text-[10px] text-slate-400 font-mono">SN: {c.serialNumber}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                      {ac ? (
                                        <div className="flex items-center gap-1.5 text-blue-600 text-xs font-bold">
                                          <Truck size={14} /> Installed: {ac.registration}
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold">
                                          <Box size={14} /> Ground Storage
                                        </div>
                                      )}
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 text-sm">
                                      <div className="flex items-center gap-2">
                                        {req.type === MaintenanceType.FLIGHT_HOURS && `${(ac?.totalFlightHours ?? c.currentFH).toFixed(1)}h`}
                                        {req.type === MaintenanceType.OPERATING_HOURS && `${(ac?.totalOperatingHours ?? c.currentOH).toFixed(1)}h`}
                                        {req.type === MaintenanceType.CYCLES && `${(ac?.totalCycles ?? c.currentCycles)}c`}
                                        {req.type === MaintenanceType.CALENDAR && `${new Date().toLocaleDateString()}`}
                                        
                                        {!ac && (
                                          <button 
                                            onClick={() => setGroundUsageModal(c)}
                                            className="p-1 bg-slate-100 rounded hover:bg-blue-100 text-blue-600"
                                            title="Update Ground Counters"
                                          >
                                            <History size={12} />
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-6 py-4">
                                      <div className="text-sm font-bold text-slate-900">
                                        {req.type === MaintenanceType.CALENDAR ? req.nextDueValue : `${req.nextDueValue}${String(req.type).toLowerCase()}`}
                                      </div>
                                      {pred && (
                                        <div className={`text-[10px] font-bold ${pred.daysRemaining < 10 ? 'text-red-500' : 'text-slate-400'}`}>
                                          {pred.daysRemaining > 3000 ? 'Shelf Life' : `Est. ${pred.daysRemaining} days left`}
                                        </div>
                                      )}
                                    </td>
                                    <td className="px-6 py-4">
                                      <div className="flex items-center gap-1">
                                        <button 
                                          onClick={() => setActiveTaskModal({ component: c, req })}
                                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                          title="Record Maintenance Task"
                                        >
                                          <CheckCircle2 size={16} />
                                        </button>
                                        {reqIndex === 0 && (
                                          <>
                                            <button 
                                              onClick={() => setEditingComponent(c)}
                                              className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-all"
                                              title="Modifica Componente"
                                            >
                                              <Edit2 size={16} />
                                            </button>
                                            <button 
                                              onClick={() => deleteComponent(c.id)}
                                              className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                              title="Elimina Componente"
                                            >
                                              <Trash2 size={16} />
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              } />
              <Route path="*" element={<div className="text-center py-12"><h2 className="text-xl text-slate-400">Settings Coming Soon</h2></div>} />
            </Routes>
          </div>
        </main>
      </div>

      {/* Add Component Modal */}
      <Modal isOpen={isAddComponentOpen} onClose={() => setIsAddComponentOpen(false)} title="Register Component/Asset">
        <form onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          addComponent({
            name: fd.get('name'),
            serialNumber: fd.get('sn'),
            aircraftId: fd.get('acId') === 'ground' ? null : fd.get('acId'),
            criticality: fd.get('criticality'),
            leadTimeDays: Number(fd.get('leadTime')),
            requirements: [{
              id: `req-${Date.now()}`,
              type: fd.get('reqType'),
              interval: Number(fd.get('interval')),
              description: fd.get('reqDesc'),
              lastPerformedValue: fd.get('reqType') === MaintenanceType.CALENDAR ? fd.get('lastDate') : Number(fd.get('lastVal')),
              nextDueValue: fd.get('reqType') === MaintenanceType.CALENDAR ? fd.get('nextDate') : Number(fd.get('nextVal'))
            }]
          });
          setIsAddComponentOpen(false);
        }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Component Name</label>
              <input name="name" required className="w-full px-4 py-2 rounded-lg border border-slate-200" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Serial Number</label>
              <input name="sn" required className="w-full px-4 py-2 rounded-lg border border-slate-200" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Assignment</label>
              <select name="acId" className="w-full px-4 py-2 rounded-lg border border-slate-200">
                <option value="ground">Ground Inventory (Storage)</option>
                {aircraft.map(ac => <option key={ac.id} value={ac.id}>{ac.registration}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Criticality</label>
              <select name="criticality" className="w-full px-4 py-2 rounded-lg border border-slate-200">
                <option value={Criticality.HIGH}>High</option>
                <option value={Criticality.MEDIUM}>Medium</option>
                <option value={Criticality.LOW}>Low</option>
              </select>
            </div>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase">Primary Requirement</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase">Type</label>
                <select name="reqType" className="w-full px-3 py-1.5 rounded border border-slate-200 text-sm">
                  <option value={MaintenanceType.FLIGHT_HOURS}>Flight Hours (FH)</option>
                  <option value={MaintenanceType.OPERATING_HOURS}>Operating Hours (OH)</option>
                  <option value={MaintenanceType.CYCLES}>Cycles (C)</option>
                  <option value={MaintenanceType.CALENDAR}>Calendar (Days)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase">Interval</label>
                <input name="interval" type="number" required className="w-full px-3 py-1.5 rounded border border-slate-200 text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase">Description</label>
              <input name="reqDesc" placeholder="e.g. 50h Inspection" className="w-full px-3 py-1.5 rounded border border-slate-200 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase">Last Val/Date</label>
                <input name="lastVal" placeholder="Last value" className="w-full px-3 py-1.5 rounded border border-slate-200 text-sm" />
                <input name="lastDate" type="date" className="w-full px-3 py-1.5 rounded border border-slate-200 text-sm mt-1" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase">Next Val/Date</label>
                <input name="nextVal" placeholder="Next value" className="w-full px-3 py-1.5 rounded border border-slate-200 text-sm" />
                <input name="nextDate" type="date" className="w-full px-3 py-1.5 rounded border border-slate-200 text-sm mt-1" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Lead Time (Days)</label>
              <input name="leadTime" type="number" defaultValue="7" className="w-full px-4 py-2 rounded-lg border border-slate-200" />
            </div>
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700">Complete Registration</button>
        </form>
      </Modal>

      {/* Edit Component Modal */}
      <Modal isOpen={!!editingComponent} onClose={() => setEditingComponent(null)} title={`Edit Component: ${editingComponent?.name}`}>
        <form onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          editComponent(editingComponent.id, {
            name: fd.get('name'),
            serialNumber: fd.get('sn'),
            aircraftId: fd.get('acId') === 'ground' ? null : fd.get('acId'),
            criticality: fd.get('criticality'),
            leadTimeDays: Number(fd.get('leadTime'))
          });
          setEditingComponent(null);
        }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Component Name</label>
              <input name="name" defaultValue={editingComponent?.name} required className="w-full px-4 py-2 rounded-lg border border-slate-200" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Serial Number</label>
              <input name="sn" defaultValue={editingComponent?.serialNumber} required className="w-full px-4 py-2 rounded-lg border border-slate-200" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Assignment</label>
              <select name="acId" defaultValue={editingComponent?.aircraftId || 'ground'} className="w-full px-4 py-2 rounded-lg border border-slate-200">
                <option value="ground">Ground Inventory (Storage)</option>
                {aircraft.map(ac => <option key={ac.id} value={ac.id}>{ac.registration}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Criticality</label>
              <select name="criticality" defaultValue={editingComponent?.criticality} className="w-full px-4 py-2 rounded-lg border border-slate-200">
                <option value={Criticality.HIGH}>High</option>
                <option value={Criticality.MEDIUM}>Medium</option>
                <option value={Criticality.LOW}>Low</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Lead Time (Days)</label>
              <input name="leadTime" type="number" defaultValue={editingComponent?.leadTimeDays} className="w-full px-4 py-2 rounded-lg border border-slate-200" />
            </div>
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700">Update Record</button>
        </form>
      </Modal>

      {/* Ground Usage Modal */}
      <Modal isOpen={!!groundUsageModal} onClose={() => setGroundUsageModal(null)} title={`Update Ground Usage: ${groundUsageModal?.name || ''}`}>
        <form onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          updateGroundUsage(
            groundUsageModal.id,
            Number(fd.get('fh')),
            Number(fd.get('oh')),
            Number(fd.get('cycles'))
          );
        }} className="space-y-4">
          <p className="text-xs text-slate-500">Manually update usage for this ground asset (e.g. after bench testing).</p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">FH</label>
              <input name="fh" type="number" step="0.1" defaultValue={groundUsageModal?.currentFH} className="w-full px-4 py-2 rounded-lg border border-slate-200" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">OH</label>
              <input name="oh" type="number" step="0.1" defaultValue={groundUsageModal?.currentOH} className="w-full px-4 py-2 rounded-lg border border-slate-200" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cycles</label>
              <input name="cycles" type="number" defaultValue={groundUsageModal?.currentCycles} className="w-full px-4 py-2 rounded-lg border border-slate-200" />
            </div>
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700">Update Asset Counters</button>
        </form>
      </Modal>

      {/* Maintenance Task Completion Modal */}
      <Modal 
        isOpen={!!activeTaskModal} 
        onClose={() => setActiveTaskModal(null)} 
        title={`Complete Task: ${activeTaskModal?.req?.description || ''}`}
      >
        <div className="mb-6">
          <p className="text-sm text-slate-500">Record maintenance sign-off. Next due date or value will be recalculated based on interval.</p>
        </div>
        <form onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          if (activeTaskModal) {
            completeMaintenanceTask(
              activeTaskModal.component.id,
              activeTaskModal.req.id,
              activeTaskModal.req.type === MaintenanceType.CALENDAR 
                ? formData.get('completionValue')
                : Number(formData.get('completionValue'))
            );
          }
        }} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">
              {activeTaskModal?.req?.type === MaintenanceType.CALENDAR ? 'Completion Date' : `Value at Completion (${activeTaskModal?.req?.type || ''})`}
            </label>
            <input 
              name="completionValue" 
              type={activeTaskModal?.req?.type === MaintenanceType.CALENDAR ? 'date' : 'number'} 
              step="0.1" 
              required 
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" 
            />
          </div>
          <button type="submit" className="w-full bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 transition-colors shadow-lg shadow-green-200 flex items-center justify-center gap-2">
            <CheckCircle2 size={18} />
            Sign-off Task
          </button>
        </form>
      </Modal>
    </div>
  );
}
