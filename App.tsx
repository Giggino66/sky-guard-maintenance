
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  Plane, 
  Settings as SettingsIcon, 
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
  Edit2,
  Database,
  Download,
  Upload,
  RefreshCcw,
  Wrench
} from 'lucide-react';
import { Aircraft, Component, MaintenanceType, Criticality, PredictionResult, MaintenanceRequirement } from './types';
import { calculatePrediction } from './utils/maintenance';
import { getMaintenanceAdvice } from './services/geminiService';
import { storageService } from './services/storageService';

// --- Interfaces ---

interface SidebarLinkProps {
  to: string;
  icon: React.ElementType;
  label: string;
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children?: React.ReactNode;
}

interface DashboardProps {
  aircraft: Aircraft[];
  predictions: PredictionResult[];
}

interface FleetViewProps {
  aircraft: Aircraft[];
  onAddAircraft: (data: Omit<Aircraft, 'id'>) => void;
  onEditAircraft: (acId: string, data: Partial<Aircraft>) => void;
  onDeleteAircraft: (acId: string) => void;
  onUpdateUsage: (acId: string, fh: number, oh: number, cycles: number) => void;
}

interface SettingsPageProps {
  aircraft: Aircraft[];
  components: Component[];
  onImport: (newAc: Aircraft[], newComp: Component[]) => void;
  onReset: () => void;
}

interface ReportsViewProps {
  predictions: PredictionResult[];
  components: Component[];
}

// --- Shared Components ---

const StatusBadge = ({ status }: { status: 'A' | 'R' | 'M' | 'I' }) => {
  const configs = {
    'A': { label: 'Efficiente', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
    'R': { label: 'Riparazione', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Wrench },
    'M': { label: 'Manutenzione', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Clock },
    'I': { label: 'Inefficiente', color: 'bg-red-100 text-red-700 border-red-200', icon: AlertTriangle }
  };

  const { label, color, icon: Icon } = configs[status];

  return (
    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${color}`}>
      <Icon size={12} />
      {label}
    </span>
  );
};

function SidebarLink({ to, icon: Icon, label }: SidebarLinkProps) {
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

function Dashboard({ aircraft, predictions }: DashboardProps) {
  const criticalCount = predictions.filter(p => p.actionRequired === 'Immediate').length;
  const efficientCount = aircraft.filter(a => a.status === 'A').length;

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
            <span className="text-xs font-semibold text-slate-400 uppercase">Operational</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{efficientCount} / {aircraft.length}</div>
          <div className="text-[10px] text-slate-400 mt-1 uppercase font-bold">Efficient Aircraft</div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-red-100 text-red-600 rounded-lg"><AlertTriangle size={24} /></div>
            <span className="text-xs font-semibold text-slate-400 uppercase">Immediate</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{criticalCount} Tasks</div>
          <div className="text-[10px] text-slate-400 mt-1 uppercase font-bold">Action Required</div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-orange-100 text-orange-600 rounded-lg"><Package size={24} /></div>
            <span className="text-xs font-semibold text-slate-400 uppercase">Procurements</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{predictions.filter(p => p.actionRequired === 'Procure').length} Items</div>
          <div className="text-[10px] text-slate-400 mt-1 uppercase font-bold">In Lead Time</div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-green-100 text-green-600 rounded-lg"><Box size={24} /></div>
            <span className="text-xs font-semibold text-slate-400 uppercase">Ground</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">Inventory</div>
          <div className="text-[10px] text-slate-400 mt-1 uppercase font-bold">Tracked Assets</div>
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

function FleetView({ aircraft, onAddAircraft, onEditAircraft, onDeleteAircraft, onUpdateUsage }: FleetViewProps) {
  const [selectedAcCounters, setSelectedAcCounters] = useState<Aircraft | null>(null);
  const [editingAc, setEditingAc] = useState<Aircraft | null>(null);
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
                <div className="text-2xl font-black text-slate-900 font-mono tracking-tighter mb-1 uppercase">{ac.registration}</div>
                <div className="text-slate-500 font-medium mb-2">{ac.model}</div>
                <StatusBadge status={ac.status} />
              </div>
              <div className="flex flex-col gap-2">
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

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Register New Aircraft">
        <form onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          onAddAircraft({
            registration: fd.get('reg') as string,
            model: fd.get('model') as string,
            status: fd.get('status') as 'A' | 'R' | 'M' | 'I',
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
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Stato Operativo</label>
            <select name="status" defaultValue="A" className="w-full px-4 py-2 rounded-lg border border-slate-200">
              <option value="A">A - Attivo/Efficiente</option>
              <option value="R">R - In Riparazione</option>
              <option value="M">M - In Manutenzione</option>
              <option value="I">I - Inefficiente</option>
            </select>
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

      <Modal isOpen={!!editingAc} onClose={() => setEditingAc(null)} title={`Edit Aircraft: ${editingAc?.registration}`}>
        <form onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          if (editingAc) {
            onEditAircraft(editingAc.id, {
              registration: fd.get('reg') as string,
              model: fd.get('model') as string,
              status: fd.get('status') as 'A' | 'R' | 'M' | 'I',
              avgMonthlyFH: Number(fd.get('avgFH')),
              avgMonthlyCycles: Number(fd.get('avgC'))
            });
            setEditingAc(null);
          }
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
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Stato Operativo</label>
            <select name="status" defaultValue={editingAc?.status} className="w-full px-4 py-2 rounded-lg border border-slate-200">
              <option value="A">A - Attivo/Efficiente</option>
              <option value="R">R - In Riparazione</option>
              <option value="M">M - In Manutenzione</option>
              <option value="I">I - Inefficiente</option>
            </select>
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

function SettingsPage({ aircraft, components, onImport, onReset }: SettingsPageProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.aircraft && data.components) {
          if (window.confirm("Importazione dati confermata. Sovrascrivere il database attuale?")) {
            onImport(data.aircraft, data.components);
          }
        } else {
          alert("Formato file non valido.");
        }
      } catch (err) {
        alert("Errore nella lettura del file.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">System Settings</h1>
        <p className="text-slate-500">Manage your local database and system preferences.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 space-y-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
              <Database size={28} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Database Management</h3>
              <p className="text-sm text-slate-400">Current persistence: Web Local Storage</p>
            </div>
          </div>

          <div className="space-y-3">
             <button 
              onClick={() => storageService.exportBackup(aircraft, components)}
              className="w-full flex items-center justify-between px-6 py-4 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-xl transition-all group border border-slate-100"
            >
              <div className="flex items-center gap-3">
                <Download size={20} className="text-slate-400 group-hover:text-blue-500" />
                <span className="font-semibold">Export Full Backup</span>
              </div>
              <span className="text-xs bg-white px-2 py-1 rounded border text-slate-400 uppercase font-bold">.JSON</span>
            </button>

            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-between px-6 py-4 bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 rounded-xl transition-all group border border-slate-100"
            >
              <div className="flex items-center gap-3">
                <Upload size={20} className="text-slate-400 group-hover:text-emerald-500" />
                <span className="font-semibold">Import Backup File</span>
              </div>
              <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} accept=".json" />
            </button>
          </div>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 space-y-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-100 text-red-600 rounded-xl">
              <RefreshCcw size={28} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Danger Zone</h3>
              <p className="text-sm text-slate-400">Irreversible actions on your data.</p>
            </div>
          </div>

          <div className="p-4 bg-red-50 border border-red-100 rounded-xl space-y-4">
            <p className="text-sm text-red-700 leading-relaxed">
              Resettando il sistema, cancellerai tutti i velivoli, i componenti e le scadenze inserite manualmente. Il sistema tornerà alla configurazione iniziale di fabbrica.
            </p>
            <button 
              onClick={() => {
                if (window.confirm("AZIONE CRITICA: Sei sicuro di voler cancellare TUTTI i dati? Questa azione non può essere annullata.")) {
                  onReset();
                }
              }}
              className="flex items-center gap-2 text-red-700 font-bold hover:bg-red-100 px-4 py-2 rounded-lg transition-all"
            >
              <Trash2 size={18} />
              Factory Reset System
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportsView({ predictions, components }: ReportsViewProps) {
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
  const [aircraft, setAircraft] = useState<Aircraft[]>(() => storageService.loadData().aircraft);
  const [components, setComponents] = useState<Component[]>(() => storageService.loadData().components);
  const [activeTaskModal, setActiveTaskModal] = useState<{component: Component, req: MaintenanceRequirement} | null>(null);
  const [isAddComponentOpen, setIsAddComponentOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<Component | null>(null);
  const [groundUsageModal, setGroundUsageModal] = useState<Component | null>(null);

  // Auto-sync effect
  useEffect(() => {
    storageService.saveData(aircraft, components);
  }, [aircraft, components]);

  const predictions = useMemo(() => {
    const allPredictions: PredictionResult[] = [];
    components.forEach(comp => {
      const ac = aircraft.find(a => a.id === comp.aircraftId);
      const results = calculatePrediction(comp, ac);
      allPredictions.push(...results);
    });
    return allPredictions;
  }, [aircraft, components]);

  // System Handlers
  function handleImport(newAc: Aircraft[], newComp: Component[]) {
    setAircraft(newAc);
    setComponents(newComp);
  }

  function handleReset() {
    storageService.clearData();
    const defaults = storageService.loadData();
    setAircraft(defaults.aircraft);
    setComponents(defaults.components);
  }

  // Aircraft Handlers
  function addAircraft(data: Omit<Aircraft, 'id'>) {
    const newAc: Aircraft = { id: `ac-${Date.now()}`, ...data };
    setAircraft(prev => [...prev, newAc]);
  }

  function editAircraft(acId: string, data: Partial<Aircraft>) {
    setAircraft(prev => prev.map(ac => ac.id === acId ? { ...ac, ...data } : ac));
  }

  function deleteAircraft(acId: string) {
    if (window.confirm("Eliminando il velivolo, tutti i componenti installati verranno spostati in magazzino. Procedere?")) {
      setAircraft(prev => prev.filter(ac => ac.id !== acId));
      setComponents(prev => prev.map(c => c.aircraftId === acId ? { ...c, aircraftId: null } : c));
    }
  }

  function updateAircraftUsage(acId: string, fh: number, oh: number, cycles: number) {
    setAircraft(prev => prev.map(ac => ac.id === acId ? {
      ...ac,
      totalFlightHours: fh,
      totalOperatingHours: oh,
      totalCycles: cycles
    } : ac));
  }

  // Component Handlers
  function addComponent(data: any) {
    const newComp: Component = {
      id: `cmp-${Date.now()}`,
      currentFH: 0,
      currentOH: 0,
      currentCycles: 0,
      ...data
    };
    setComponents(prev => [...prev, newComp]);
  }

  function editComponent(compId: string, data: Partial<Component>) {
    setComponents(prev => prev.map(c => c.id === compId ? { ...c, ...data } : c));
  }

  function deleteComponent(compId: string) {
    if (window.confirm("Sei sicuro di voler eliminare questo componente? L'azione è irreversibile.")) {
      setComponents(prev => prev.filter(c => c.id !== compId));
    }
  }

  function updateGroundUsage(compId: string, fh: number, oh: number, cycles: number) {
    setComponents(prev => prev.map(c => c.id === compId ? {
      ...c,
      currentFH: fh,
      currentOH: oh,
      currentCycles: cycles
    } : c));
    setGroundUsageModal(null);
  }

  function completeMaintenanceTask(compId: string, reqId: string, completionValue: number | string) {
    setComponents(prev => prev.map(comp => {
      if (comp.id !== compId) return comp;
      return {
        ...comp,
        requirements: comp.requirements.map(req => {
          if (req.id !== reqId) return req;
          
          let nextDueValue = req.nextDueValue;
          if (req.type === MaintenanceType.CALENDAR) {
            const lastDate = new Date(completionValue as string);
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
            <SidebarLink to="/settings" icon={SettingsIcon} label="Settings" />
          </nav>

          <div className="p-4 border-t border-slate-800">
            <div className="bg-slate-800/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3 px-1">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Database Local-Sync</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold">JD</div>
                <div className="text-sm">
                  <div className="font-medium text-slate-200">Admin</div>
                  <div className="text-slate-500 text-xs truncate">Maintenance Unit</div>
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
              <Route path="/settings" element={<SettingsPage aircraft={aircraft} components={components} onImport={handleImport} onReset={handleReset} />} />
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
                                        <div className="flex flex-col gap-1">
                                          <div className="flex items-center gap-1.5 text-blue-600 text-xs font-bold uppercase">
                                            <Truck size={14} /> {ac.registration}
                                          </div>
                                          <div className="scale-75 origin-left">
                                            <StatusBadge status={ac.status} />
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold uppercase">
                                          <Box size={14} /> Ground Storage
                                        </div>
                                      )}
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 text-sm">
                                      <div className="flex items-center gap-2 font-mono">
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
                                      <div className="text-sm font-bold text-slate-900 font-mono">
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
          <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700">Complete Registration</button>
        </form>
      </Modal>

      {/* Edit Component Modal */}
      <Modal isOpen={!!editingComponent} onClose={() => setEditingComponent(null)} title={`Edit Component: ${editingComponent?.name}`}>
        <form onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          if (editingComponent) {
            const updatedRequirements = editingComponent.requirements.map(req => ({
              ...req,
              nextDueValue: req.type === MaintenanceType.CALENDAR 
                ? fd.get(`nextDue-${req.id}`) as string
                : Number(fd.get(`nextDue-${req.id}`))
            }));
            editComponent(editingComponent.id, {
              name: fd.get('name') as string,
              serialNumber: fd.get('sn') as string,
              aircraftId: fd.get('acId') === 'ground' ? null : fd.get('acId') as string,
              criticality: fd.get('criticality') as string,
              leadTimeDays: Number(fd.get('leadTime')),
              requirements: updatedRequirements
            });
            setEditingComponent(null);
          }
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
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase">Maintenance Scadences (Next Due)</h4>
            {editingComponent?.requirements.map(req => (
              <div key={req.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex justify-between items-center mb-2">
                   <label className="text-[10px] font-bold text-slate-500 uppercase">{req.description}</label>
                   <span className="text-[10px] font-mono text-slate-400 bg-white px-1.5 rounded border border-slate-100">{req.type}</span>
                </div>
                <input 
                  name={`nextDue-${req.id}`} 
                  type={req.type === MaintenanceType.CALENDAR ? 'date' : 'number'}
                  step="0.1"
                  defaultValue={req.nextDueValue as string}
                  required
                  className="w-full px-3 py-1.5 rounded border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                />
              </div>
            ))}
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
          if (groundUsageModal) {
            updateGroundUsage(
              groundUsageModal.id,
              Number(fd.get('fh')),
              Number(fd.get('oh')),
              Number(fd.get('cycles'))
            );
          }
        }} className="space-y-4">
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
        <form onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          if (activeTaskModal) {
            completeMaintenanceTask(
              activeTaskModal.component.id,
              activeTaskModal.req.id,
              activeTaskModal.req.type === MaintenanceType.CALENDAR 
                ? formData.get('completionValue') as string
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
    </HashRouter>
  );
}
