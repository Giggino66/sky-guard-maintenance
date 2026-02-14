
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  Plane, 
  LayoutDashboard, 
  ClipboardList, 
  AlertTriangle, 
  Plus, 
  Sparkles,
  Clock,
  Box,
  CheckCircle2,
  X,
  Trash2,
  Settings as SettingsIcon,
  Wrench,
  Edit2,
  Info,
  ShieldCheck,
  ShieldAlert,
  Download,
  Upload,
  Database,
  Navigation,
  Activity,
  Gauge,
  Layers,
  Fuel,
  Wind,
  RefreshCw
} from 'lucide-react';
import { 
  Aircraft, 
  Component, 
  MaintenanceType, 
  Criticality, 
  PredictionResult, 
  AircraftStatus
} from './types';
import { calculatePrediction } from './utils/maintenance';
import { getMaintenanceAdvice } from './services/geminiService';
import { storageService } from './services/storageService';

// --- Improved Status Badges with Aviation Styling ---

const StatusBadge = ({ status }: { status: AircraftStatus }) => {
  const configs: Record<AircraftStatus, { label: string; color: string; dot: string; icon: any }> = {
    'EFF': { label: 'Efficiente', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', dot: 'bg-emerald-500', icon: CheckCircle2 },
    'LIM': { label: 'Limitato', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', dot: 'bg-blue-500', icon: Navigation },
    'COR': { label: 'Correttiva', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20', dot: 'bg-orange-500', icon: Wrench },
    'PROG': { label: 'Programmata', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20', dot: 'bg-indigo-500', icon: Clock },
    'INE': { label: 'Inefficiente', color: 'bg-red-500/10 text-red-400 border-red-500/20', dot: 'bg-red-500', icon: ShieldAlert }
  };
  const { label, color, dot, icon: Icon } = configs[status];
  return (
    <span className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border ${color}`}>
      <div className={`w-1.5 h-1.5 rounded-full ${dot} animate-pulse`} />
      {label}
    </span>
  );
};

// --- Custom Sidebar Link ---

function SidebarLink({ to, icon: Icon, label }: { to: string; icon: React.ElementType; label: string }) {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link
      to={to}
      className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all relative group ${
        isActive 
          ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]' 
          : 'text-slate-400 hover:text-white hover:bg-slate-800'
      }`}
    >
      <Icon size={20} className={isActive ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'} />
      <span className="font-bold text-sm tracking-tight">{label}</span>
      {isActive && <div className="absolute right-4 w-1.5 h-1.5 rounded-full bg-white" />}
    </Link>
  );
}

// --- Glass Modal ---

function Modal({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children?: React.ReactNode }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden border border-slate-700 animate-in zoom-in-95 duration-200">
        <div className="px-10 py-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div>
            <h3 className="font-black text-white uppercase tracking-widest text-xs">{title}</h3>
            <p className="text-[10px] text-slate-500 uppercase font-bold mt-0.5 tracking-tighter">SkyGuard Operation Control</p>
          </div>
          <button onClick={onClose} className="p-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-2xl transition-all"><X size={20} /></button>
        </div>
        <div className="p-10 max-h-[85vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

// --- Main Application ---

export default function App() {
  const initialData = storageService.loadData();
  const [aircraft, setAircraft] = useState<Aircraft[]>(initialData.aircraft);
  const [components, setComponents] = useState<Component[]>(initialData.components);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isAddAircraftOpen, setIsAddAircraftOpen] = useState(false);
  const [editingAircraft, setEditingAircraft] = useState<Aircraft | null>(null);

  const [isAddComponentOpen, setIsAddComponentOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<Component | null>(null);

  const [aiAdvice, setAiAdvice] = useState<string>("");
  const [loadingAi, setLoadingAi] = useState(false);

  useEffect(() => {
    storageService.saveData(aircraft, components);
  }, [aircraft, components]);

  const predictions = useMemo(() => {
    const all: PredictionResult[] = [];
    components.forEach(comp => {
      const ac = aircraft.find(a => a.id === comp.aircraftId);
      all.push(...calculatePrediction(comp, ac));
    });
    return all.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [aircraft, components]);

  // --- Handlers ---

  const saveAircraft = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = {
      registration: fd.get('registration') as string,
      model: fd.get('model') as string,
      status: fd.get('status') as AircraftStatus,
      totalFlightHours: parseFloat(fd.get('fh') as string || '0'),
      avgMonthlyFH: parseFloat(fd.get('avg_fh') as string || '40'),
      totalCycles: parseInt(fd.get('cycles') as string || '0'),
      avgMonthlyCycles: parseInt(fd.get('avg_cycles') as string || '100'),
    };
    if (editingAircraft) {
      setAircraft(aircraft.map(a => a.id === editingAircraft.id ? { ...a, ...data, totalOperatingHours: data.totalFlightHours * 1.1 } : a));
    } else {
      const newAc: Aircraft = {
        ...data,
        id: `ac-${Date.now()}`,
        totalOperatingHours: data.totalFlightHours * 1.1,
      } as Aircraft;
      setAircraft([...aircraft, newAc]);
    }
    setIsAddAircraftOpen(false);
    setEditingAircraft(null);
  };

  const deleteAircraft = (id: string) => {
    if (confirm("Attenzione: Procedere con l'eliminazione del velivolo?")) {
      setAircraft(aircraft.filter(a => a.id !== id));
      setComponents(components.map(c => c.aircraftId === id ? { ...c, aircraftId: null } : c));
    }
  };

  const saveComponent = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = {
      name: fd.get('name') as string,
      serialNumber: fd.get('sn') as string,
      aircraftId: fd.get('acId') === 'mag' ? null : fd.get('acId') as string,
      criticality: Criticality.MEDIUM,
      leadTimeDays: parseInt(fd.get('lead_time') as string || '15'),
      requirements: [{
        id: 'req-1',
        type: fd.get('type') as string,
        interval: parseFloat(fd.get('interval') as string || "0"),
        lastPerformedValue: fd.get('next') as string,
        nextDueValue: fd.get('next') as string,
        description: fd.get('desc') as string
      }]
    };
    if (editingComponent) {
      setComponents(components.map(c => c.id === editingComponent.id ? { ...c, ...data, requirements: data.requirements } : c));
    } else {
      const newC: Component = { ...data, id: `cmp-${Date.now()}`, currentFH: 0, currentOH: 0, currentCycles: 0 } as Component;
      setComponents([...components, newC]);
    }
    setIsAddComponentOpen(false);
    setEditingComponent(null);
  };

  const handleAskAi = async () => {
    setLoadingAi(true);
    try {
      const advice = await getMaintenanceAdvice(predictions, components);
      setAiAdvice(advice);
    } catch (err) {
      setAiAdvice("Errore durante l'analisi AI. Verificare la chiave API.");
    } finally {
      setLoadingAi(false);
    }
  };

  const handleExport = () => storageService.exportData(aircraft, components);
  const handleImportClick = () => fileInputRef.current?.click();
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const data = storageService.parseImportedData(event.target?.result as string);
      if (data && confirm("Sovrascrivere il database corrente?")) {
        setAircraft(data.aircraft);
        setComponents(data.components);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <HashRouter>
      <div className="flex min-h-screen text-slate-200">
        
        {/* Sidebar: Navigation & Identity */}
        <aside className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col sticky top-0 h-screen">
          <div className="p-10 mb-6">
            <div className="flex items-center gap-4 group">
              <div className="bg-blue-600 p-3 rounded-2xl shadow-[0_0_25px_rgba(37,99,235,0.3)] transition-transform group-hover:scale-110">
                <Plane size={28} className="text-white" />
              </div>
              <div>
                <span className="font-black text-2xl tracking-tighter text-white block leading-none">SKYGUARD</span>
                <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Aero-Maintenance</span>
              </div>
            </div>
          </div>
          
          <nav className="flex-1 px-6 space-y-3">
            <SidebarLink to="/" icon={LayoutDashboard} label="Flight Ops Deck" />
            <SidebarLink to="/fleet" icon={Plane} label="Hangar Flotta" />
            <SidebarLink to="/inventory" icon={Layers} label="Inventory & Parts" />
            <SidebarLink to="/settings" icon={SettingsIcon} label="System Config" />
          </nav>

          <div className="p-8">
            <div className="bg-slate-800/50 rounded-3xl p-5 border border-slate-700/50">
               <div className="flex items-center gap-3 mb-3">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System Online</span>
               </div>
               <div className="text-[10px] text-slate-500 font-mono leading-tight">
                 VER: 1.1.5-FIX<br/>
                 LOC: LIRF (Roma)
               </div>
            </div>
          </div>
        </aside>

        {/* Main Viewport */}
        <main className="flex-1 p-12 lg:p-16 overflow-auto">
          <div className="max-w-7xl mx-auto">
            <Routes>
              <Route path="/" element={
                <div className="space-y-12">
                  <header className="flex justify-between items-end">
                    <div>
                      <h1 className="text-5xl font-black text-white tracking-tighter">Command Dashboard</h1>
                      <p className="text-slate-500 mt-2 font-medium flex items-center gap-2 uppercase text-xs tracking-widest"><Activity size={14}/> Monitoraggio real-time flotta aeroclub</p>
                    </div>
                    <button 
                      onClick={handleAskAi}
                      disabled={loadingAi}
                      className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-[1.5rem] font-black flex items-center gap-3 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 shadow-xl shadow-blue-600/20"
                    >
                      <Sparkles size={20} /> {loadingAi ? "ANALISI SISTEMI..." : "REPORT AI ANALYTICS"}
                    </button>
                  </header>

                  {/* AI Advice: HUD Style */}
                  {aiAdvice && (
                    <div className="glass-panel p-10 rounded-[2.5rem] border-blue-500/20 hud-glow animate-in fade-in slide-in-from-top-6 duration-700 relative overflow-hidden group">
                      <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/50" />
                      <div className="font-black flex items-center gap-3 mb-5 uppercase tracking-widest text-xs text-blue-400">
                        <Gauge size={16}/> Protocollo Suggerimenti AI
                      </div>
                      <div className="whitespace-pre-wrap font-medium text-slate-300 leading-relaxed text-sm italic prose prose-invert max-w-none">{aiAdvice}</div>
                      <button onClick={() => setAiAdvice("")} className="mt-6 text-blue-400/60 font-black text-[10px] uppercase hover:text-white transition-colors">Dismiss Report</button>
                    </div>
                  )}

                  {/* Quick Telemetry Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {[
                      { label: 'Airworthy', val: aircraft.filter(a => a.status === 'EFF' || a.status === 'LIM').length, color: 'text-emerald-400', icon: CheckCircle2 },
                      { label: 'Ground/Hangar', val: aircraft.filter(a => a.status === 'COR' || a.status === 'PROG').length, color: 'text-indigo-400', icon: Wrench },
                      { label: 'AOG/Inactive', val: aircraft.filter(a => a.status === 'INE').length, color: 'text-red-500', icon: AlertTriangle },
                      { label: 'Total Components', val: components.length, color: 'text-blue-400', icon: Layers },
                    ].map((stat, i) => (
                      <div key={i} className="bg-slate-900/50 p-8 rounded-[2rem] border border-slate-800 hover:border-slate-700 transition-all group">
                        <div className={`text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2 ${stat.color}`}>
                          <stat.icon size={12} /> {stat.label}
                        </div>
                        <div className="text-5xl font-black text-white font-mono tracking-tighter group-hover:scale-110 transition-transform origin-left">{stat.val}</div>
                      </div>
                    ))}
                  </div>

                  {/* Maintenance Priorities Table */}
                  <div className="bg-slate-900/80 rounded-[3rem] border border-slate-800 overflow-hidden shadow-2xl">
                    <div className="px-10 py-8 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="bg-blue-600/10 p-3 rounded-2xl"><Activity size={20} className="text-blue-500" /></div>
                        <span className="font-black text-xs uppercase tracking-[0.2em] text-white">Priority Maintenance Queue</span>
                      </div>
                    </div>
                    <div className="divide-y divide-slate-800/50">
                      {predictions.slice(0, 5).map((p, i) => (
                        <div key={i} className="px-10 py-7 flex items-center justify-between hover:bg-slate-800/30 transition-colors group">
                          <div className="flex items-center gap-8">
                            <div className={`w-3 h-10 rounded-full ${p.actionRequired === 'Immediate' ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]' : p.actionRequired === 'Procure' ? 'bg-orange-500' : 'bg-slate-700'}`} />
                            <div>
                              <div className="font-black text-white text-xl tracking-tight group-hover:text-blue-400 transition-colors">{p.componentName}</div>
                              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">{p.aircraftRegistration} • {p.requirementDescription}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-12 text-right">
                             <div>
                                <div className="text-[10px] font-black text-slate-600 uppercase mb-1 tracking-widest">Due Date</div>
                                <div className="text-sm font-bold text-slate-400 font-mono">{p.estimatedDueDate.toLocaleDateString()}</div>
                             </div>
                             <div>
                                <div className="text-[10px] font-black text-slate-600 uppercase mb-1 tracking-widest">Time Remaining</div>
                                <div className="text-4xl font-black text-white font-mono tracking-tighter">-{p.daysRemaining} <span className="text-sm uppercase font-sans text-slate-500">days</span></div>
                             </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              } />

              <Route path="/fleet" element={
                <div className="space-y-12">
                  <header className="flex justify-between items-center">
                    <div>
                      <h1 className="text-4xl font-black text-white tracking-tighter">Fleet Command</h1>
                      <p className="text-slate-500 uppercase text-xs font-bold tracking-[0.3em] mt-2">Gestione tecnica aeromobili (LIRF Center)</p>
                    </div>
                    <button 
                      onClick={() => { setEditingAircraft(null); setIsAddAircraftOpen(true); }}
                      className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 shadow-xl shadow-blue-600/20"
                    >
                      <Plus size={18} /> Add New Aircraft
                    </button>
                  </header>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    {aircraft.map(ac => (
                      <div key={ac.id} className="bg-slate-900 border border-slate-800 p-12 rounded-[3.5rem] relative overflow-hidden group hover:border-blue-500/50 transition-all hover:shadow-[0_0_50px_rgba(0,0,0,0.3)]">
                        <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity">
                           <Plane size={150} strokeWidth={1} />
                        </div>
                        <div className="flex justify-between items-start mb-12 relative z-10">
                          <div>
                            <div className="text-6xl font-black font-mono tracking-tighter uppercase text-white mb-2">{ac.registration}</div>
                            <div className="text-blue-500 text-xs font-black uppercase tracking-[0.3em]">{ac.model}</div>
                          </div>
                          <div className="flex flex-col items-end gap-3">
                            <StatusBadge status={ac.status} />
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                              <button onClick={() => { setEditingAircraft(ac); setIsAddAircraftOpen(true); }} className="p-3 bg-slate-800 text-slate-400 rounded-xl hover:bg-blue-600 hover:text-white transition-all"><Edit2 size={16} /></button>
                              <button onClick={() => deleteAircraft(ac.id)} className="p-3 bg-slate-800 text-slate-400 rounded-xl hover:bg-red-600 hover:text-white transition-all"><Trash2 size={16} /></button>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-8 border-t border-slate-800/50 pt-10 relative z-10">
                          <div>
                            <div className="text-[10px] text-slate-500 font-black uppercase mb-2 tracking-widest flex items-center gap-2"><Clock size={12}/> Total Flight Time</div>
                            <div className="text-3xl font-black font-mono tracking-tighter text-white">{ac.totalFlightHours.toFixed(1)} <span className="text-xs uppercase text-slate-600">Hrs</span></div>
                          </div>
                          <div className="text-right">
                             <div className="text-[10px] text-slate-500 font-black uppercase mb-2 tracking-widest flex items-center justify-end gap-2"><RefreshCw size={12}/> Total Cycles</div>
                             <div className="text-3xl font-black font-mono text-slate-400">{ac.totalCycles || 0} <span className="text-xs uppercase text-slate-600">CYC</span></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              } />

              <Route path="/inventory" element={
                <div className="space-y-12">
                  <header className="flex justify-between items-center">
                    <div>
                       <h1 className="text-4xl font-black text-white tracking-tighter">Inventory Control</h1>
                       <p className="text-slate-500 uppercase text-xs font-bold tracking-[0.3em] mt-2">Asset management & replacement parts</p>
                    </div>
                    <button onClick={() => { setEditingComponent(null); setIsAddComponentOpen(true); }} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 transition-all shadow-lg shadow-blue-600/20"><Plus size={18} /> Register Component</button>
                  </header>
                  <div className="bg-slate-900 rounded-[3rem] border border-slate-800 overflow-hidden shadow-2xl">
                    <table className="w-full text-left">
                      <thead className="bg-slate-800/50 text-[10px] font-black uppercase text-slate-500 border-b border-slate-800">
                        <tr>
                          <th className="px-10 py-6 tracking-widest uppercase">System Component</th>
                          <th className="px-10 py-6 tracking-widest uppercase text-center">Location</th>
                          <th className="px-10 py-6 tracking-widest uppercase">Service Due</th>
                          <th className="px-10 py-6 tracking-widest text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {components.map(c => (
                          <tr key={c.id} className="hover:bg-slate-800/30 transition-colors group">
                            <td className="px-10 py-8">
                              <div className="font-black text-white text-lg tracking-tight group-hover:text-blue-400 transition-colors">{c.name}</div>
                              <div className="text-[10px] text-slate-600 font-mono uppercase font-bold mt-1 tracking-widest">S/N: {c.serialNumber}</div>
                            </td>
                            <td className="px-10 py-8">
                              <div className="flex items-center justify-center">
                                {aircraft.find(a => a.id === c.aircraftId) ? (
                                  <div className="bg-blue-500/10 text-blue-400 px-4 py-2 rounded-xl border border-blue-500/20 flex items-center gap-3">
                                    <Plane size={14} />
                                    <span className="font-black text-xs font-mono tracking-widest uppercase">{aircraft.find(a => a.id === c.aircraftId)?.registration}</span>
                                  </div>
                                ) : (
                                  <div className="bg-slate-800 text-slate-500 px-4 py-2 rounded-xl border border-slate-700 flex items-center gap-3">
                                    <Box size={14} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">In Stock</span>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-10 py-8">
                              <div className="space-y-2">
                                {c.requirements.map((r, i) => (
                                  <div key={i} className="text-xs font-bold text-slate-400 flex items-center gap-3">
                                    <Gauge size={14} className="text-slate-600" />
                                    {r.description}: <span className="font-mono text-white ml-auto">
                                      {r.nextDueValue}
                                      {r.type === 'FH' ? 'h' : r.type === 'C' ? 'c' : ''}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </td>
                            <td className="px-10 py-8 text-right">
                              <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all">
                                <button onClick={() => { setEditingComponent(c); setIsAddComponentOpen(true); }} className="p-3 bg-slate-800 text-slate-400 rounded-xl hover:text-white"><Edit2 size={16} /></button>
                                <button onClick={() => setComponents(components.filter(it => it.id !== c.id))} className="p-3 bg-slate-800 text-slate-400 rounded-xl hover:text-red-500"><Trash2 size={16} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              } />

              <Route path="/settings" element={
                <div className="max-w-4xl mx-auto space-y-16 py-10">
                   <div className="text-center space-y-6">
                      <div className="w-24 h-24 bg-blue-600 text-white rounded-[2rem] flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(37,99,235,0.4)]"><SettingsIcon size={44} /></div>
                      <div>
                        <h2 className="text-5xl font-black text-white tracking-tighter uppercase">Ground Control</h2>
                        <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.4em] mt-3">Advanced System Configuration & Data Integrity</p>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                     <div className="bg-slate-900 p-12 rounded-[3.5rem] border border-slate-800 shadow-sm space-y-8 hover:border-blue-500/50 transition-all">
                       <div className="flex items-center gap-5 text-blue-500">
                         <div className="p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20"><Database size={28}/></div>
                         <h3 className="font-black text-sm uppercase tracking-[0.2em] text-white">Cloud Archive</h3>
                       </div>
                       <p className="text-sm text-slate-500 font-medium leading-relaxed">Genera un export critico del database aeronautico per l'archiviazione fuori linea in formato JSON.</p>
                       <button onClick={handleExport} className="w-full flex items-center justify-center gap-4 bg-white text-slate-900 py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-500 hover:text-white transition-all">
                         <Download size={20} /> Deploy Export
                       </button>
                     </div>

                     <div className="bg-slate-900 p-12 rounded-[3.5rem] border border-slate-800 shadow-sm space-y-8 hover:border-emerald-500/50 transition-all">
                       <div className="flex items-center gap-5 text-emerald-500">
                         <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20"><Upload size={28}/></div>
                         <h3 className="font-black text-sm uppercase tracking-[0.2em] text-white">System Restore</h3>
                       </div>
                       <p className="text-sm text-slate-500 font-medium leading-relaxed">Inietta un backup esistente nel registro di sistema locale. Sovrascriverà tutti i dati attivi.</p>
                       <button onClick={handleImportClick} className="w-full flex items-center justify-center gap-4 bg-slate-800 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest border border-slate-700 hover:border-emerald-500 transition-all">
                         <Upload size={20} /> Initialize Restore
                       </button>
                       <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleFileChange} />
                     </div>
                   </div>

                   <div className="glass-panel p-10 rounded-[3rem] border-amber-500/20 flex gap-8 items-start relative overflow-hidden">
                     <div className="absolute top-0 right-0 p-8 opacity-10"><Info size={80} /></div>
                     <div className="p-4 bg-amber-500/10 text-amber-500 rounded-2xl shrink-0 border border-amber-500/20"><ShieldAlert size={28} /></div>
                     <div className="space-y-3 relative z-10">
                       <h4 className="font-black text-amber-500 text-sm uppercase tracking-[0.2em]">Safety Compliance Notice</h4>
                       <p className="text-sm text-slate-400 leading-relaxed font-medium">I dati gestiti in SkyGuard sono residenti localmente. In conformità con le norme di sicurezza volo, si raccomanda di effettuare un backup settimanale per prevenire la perdita accidentale di dati telemetrici e record di manutenzione.</p>
                     </div>
                   </div>
                </div>
              } />
            </Routes>
          </div>
        </main>
      </div>

      {/* --- Modals: Enhanced with Cockpit Aesthetics --- */}

      {/* Modal: Aircraft (Add/Edit) */}
      <Modal isOpen={isAddAircraftOpen} onClose={() => { setIsAddAircraftOpen(false); setEditingAircraft(null); }} title={editingAircraft ? "Configure Aircraft" : "Register Aircraft Unit"}>
        <form onSubmit={saveAircraft} className="space-y-8">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Registration</label>
              <input name="registration" defaultValue={editingAircraft?.registration} placeholder="I-XXXX" required className="w-full px-5 py-4 bg-slate-800 rounded-2xl border border-slate-700 outline-none focus:ring-2 focus:ring-blue-600 text-white font-black font-mono uppercase tracking-widest" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Type/Model</label>
              <input name="model" defaultValue={editingAircraft?.model} placeholder="Cessna 172" required className="w-full px-5 py-4 bg-slate-800 rounded-2xl border border-slate-700 outline-none focus:ring-2 focus:ring-blue-600 text-white font-bold" />
            </div>
          </div>
          <div className="space-y-2">
             <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Technical Status Category</label>
             <select name="status" defaultValue={editingAircraft?.status || 'EFF'} className="w-full px-5 py-4 bg-slate-800 rounded-2xl border border-slate-700 outline-none text-white font-bold appearance-none cursor-pointer focus:ring-2 focus:ring-blue-600">
               <option value="EFF">Efficiente (AIRWORTHY)</option>
               <option value="LIM">Efficiente Limitato (VFR ONLY)</option>
               <option value="COR">Manutenzione Correttiva</option>
               <option value="PROG">Manutenzione Programmata</option>
               <option value="INE">Inefficiente (AOG)</option>
             </select>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Airframe Total Time (FH)</label>
              <input type="number" step="0.1" name="fh" defaultValue={editingAircraft?.totalFlightHours} required className="w-full px-5 py-4 bg-slate-800 rounded-2xl border border-slate-700 outline-none text-white font-mono" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Utilization (FH/Mo)</label>
              <input type="number" name="avg_fh" defaultValue={editingAircraft?.avgMonthlyFH || 40} required className="w-full px-5 py-4 bg-slate-800 rounded-2xl border border-slate-700 outline-none text-white font-mono" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Total Cycles (C)</label>
              <input type="number" name="cycles" defaultValue={editingAircraft?.totalCycles || 0} required className="w-full px-5 py-4 bg-slate-800 rounded-2xl border border-slate-700 outline-none text-white font-mono" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Avg Cycles (C/Mo)</label>
              <input type="number" name="avg_cycles" defaultValue={editingAircraft?.avgMonthlyCycles || 100} required className="w-full px-5 py-4 bg-slate-800 rounded-2xl border border-slate-700 outline-none text-white font-mono" />
            </div>
          </div>
          <button type="submit" className="w-full py-6 bg-blue-600 text-white font-black uppercase tracking-widest rounded-3xl shadow-2xl shadow-blue-600/20 hover:bg-blue-500 transition-all active:scale-95">Commit Aircraft Data</button>
        </form>
      </Modal>

      {/* Modal: Component (Add/Edit) */}
      <Modal isOpen={isAddComponentOpen} onClose={() => { setIsAddComponentOpen(false); setEditingComponent(null); }} title={editingComponent ? "Modify Component Record" : "Register New Component"}>
        <form onSubmit={saveComponent} className="space-y-8">
          <div className="grid grid-cols-2 gap-6">
             <div className="space-y-2">
               <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Component Name</label>
               <input name="name" defaultValue={editingComponent?.name} placeholder="Engine Overhaul" required className="w-full px-5 py-4 bg-slate-800 rounded-2xl border border-slate-700 outline-none focus:ring-2 focus:ring-blue-600 text-white font-bold" />
             </div>
             <div className="space-y-2">
               <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Serial Number</label>
               <input name="sn" defaultValue={editingComponent?.serialNumber} placeholder="S/N" required className="w-full px-5 py-4 bg-slate-800 rounded-2xl border border-slate-700 outline-none focus:ring-2 focus:ring-blue-600 text-white font-mono" />
             </div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
               <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Asset Installation</label>
               <select name="acId" defaultValue={editingComponent?.aircraftId || 'mag'} className="w-full px-5 py-4 bg-slate-800 rounded-2xl border border-slate-700 outline-none text-white font-bold appearance-none cursor-pointer focus:ring-2 focus:ring-blue-600">
                 <option value="mag">Magazzino (Spare Part)</option>
                 {aircraft.map(a => <option key={a.id} value={a.id}>{a.registration} - {a.model}</option>)}
               </select>
            </div>
            <div className="space-y-2">
               <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Lead Time (Days)</label>
               <input type="number" name="lead_time" defaultValue={editingComponent?.leadTimeDays || 15} required className="w-full px-5 py-4 bg-slate-800 rounded-2xl border border-slate-700 outline-none focus:ring-2 focus:ring-blue-600 text-white font-mono" />
             </div>
          </div>
          <div className="p-10 bg-slate-950/50 rounded-[2.5rem] border border-slate-800 space-y-6">
            <div className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em]">Lifecycle Configuration</div>
            <input name="desc" defaultValue={editingComponent?.requirements[0].description} placeholder="Service Interval Description" required className="w-full px-5 py-4 bg-slate-800 rounded-xl border border-slate-700 text-white font-bold" />
            <div className="flex gap-4">
              <select name="type" defaultValue={editingComponent?.requirements[0].type || 'FH'} className="flex-1 px-5 py-4 bg-slate-800 rounded-xl border border-slate-700 text-white font-bold">
                <option value="FH">Flight Hours (FH)</option>
                <option value="C">Cycles (C)</option>
                <option value="CAL">Calendar (CAL)</option>
              </select>
              <input name="next" defaultValue={editingComponent?.requirements[0].nextDueValue} placeholder="Limit Value" required className="flex-1 px-5 py-4 bg-slate-800 rounded-xl border border-slate-700 text-white font-mono font-bold" />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest px-1">Recurrent Interval</label>
              <input name="interval" type="number" defaultValue={editingComponent?.requirements[0].interval} placeholder="Cycle Interval" className="w-full px-5 py-4 bg-slate-800 rounded-xl border border-slate-700 text-white font-mono" />
            </div>
          </div>
          <button type="submit" className="w-full py-6 bg-blue-600 text-white font-black uppercase tracking-widest rounded-3xl shadow-2xl shadow-blue-600/20 hover:bg-blue-500 transition-all active:scale-95">Commit Asset Record</button>
        </form>
      </Modal>

    </HashRouter>
  );
}
