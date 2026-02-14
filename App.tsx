
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
// Fix: Import icons from lucide-react instead of local types file
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