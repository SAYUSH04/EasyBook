import React from 'react';
import { Shield, Layers, CheckCircle2 } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-slate-800/80 bg-slate-950 py-8 text-xs text-slate-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xs">
              EB
            </div>
            <div>
              <p className="font-semibold text-slate-200">EasyBook Operations Engine</p>
              <p className="text-[11px] text-slate-500">
                Session-Aware Dynamic Attendance • Verifiable E-Certificates • Real-Time Operations
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-[11px]">
            <div className="flex items-center gap-1.5 text-slate-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Commission-Free (100% Organizer Revenue)</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Tamper-Resistant Audit Trail</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <span>Multi-Block Session Retention</span>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-600">
          <p>© 2026 EasyBook Platform by Sayush. Built for production event operations.</p>
          <p className="mt-1 sm:mt-0 font-mono">Status: Operational • Version 2.4.0</p>
        </div>
      </div>
    </footer>
  );
};
