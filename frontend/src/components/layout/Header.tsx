import React, { useState } from 'react';
import { Menu, LogOut, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { riskApi } from '../../services/api';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const [isCalculating, setIsCalculating] = useState(false);
  const [calcSuccess, setCalcSuccess] = useState<string | null>(null);

  const handleRunRiskEngine = async () => {
    try {
      setIsCalculating(true);
      setCalcSuccess(null);
      const res = await riskApi.calculateAll();
      setCalcSuccess(`Evaluated ${res.processed} students (${res.high_risk} High Risk)`);
      setTimeout(() => {
        setCalcSuccess(null);
        window.location.reload();
      }, 1500);
    } catch {
      alert('Failed to run risk assessment. Please check backend connection.');
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 lg:hidden transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            Term 2026-27
          </span>
          <span className="text-xs text-slate-700 font-semibold tracking-tight">
            JSPM University Pune
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Quick batch calculate action */}
        <button
          onClick={handleRunRiskEngine}
          disabled={isCalculating}
          title="Recalculate risk scores for all enrolled students"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isCalculating ? 'animate-spin text-blue-600' : ''}`} />
          <span className="hidden sm:inline">
            {isCalculating ? 'Evaluating...' : 'Recalculate Risk'}
          </span>
        </button>

        {calcSuccess && (
          <span className="hidden md:inline-flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 animate-in fade-in">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {calcSuccess}
          </span>
        )}

        <div className="h-6 w-px bg-slate-200 mx-1" />

        {/* User Info & Logout */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-slate-800 leading-tight">
              {user?.full_name}
            </div>
            <div className="text-[10px] text-slate-400 capitalize">
              {user?.role}
            </div>
          </div>

          <button
            onClick={logout}
            title="Sign out"
            className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
