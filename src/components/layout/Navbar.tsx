import React from 'react';
import {
  Calendar,
  QrCode,
  Award,
  ShieldCheck,
  UserCheck,
  ChevronDown,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  openCreateModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, openCreateModal }) => {
  const { currentUser, switchRole, allDemoProfiles, currentOrg } = useAuth();
  const [roleDropdownOpen, setRoleDropdownOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-6">
            <button
              onClick={() => setActiveTab('events')}
              className="flex items-center gap-2.5 text-left group"
            >
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:border-emerald-500/60 transition-colors">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-base tracking-tight text-white">EasyBook</span>
                  <span className="px-1.5 py-0.2 text-[10px] font-semibold text-emerald-400 bg-emerald-950/70 border border-emerald-800/60 rounded">
                    OPS
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 -mt-0.5 tracking-wide uppercase font-mono">
                  Commission-Free
                </p>
              </div>
            </button>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              <button
                onClick={() => setActiveTab('events')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                  activeTab === 'events'
                    ? 'text-white bg-slate-800 border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                Explore Events
              </button>

              <button
                onClick={() => setActiveTab('passes')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                  activeTab === 'passes'
                    ? 'text-white bg-slate-800 border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                My Passes & QR
              </button>

              <button
                onClick={() => setActiveTab('organizer')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                  activeTab === 'organizer'
                    ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-800/60'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                Organizer Workspace
              </button>

              <button
                onClick={() => setActiveTab('verify')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                  activeTab === 'verify'
                    ? 'text-white bg-slate-800 border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Verify Certificate
              </button>
            </nav>
          </div>

          {/* Right Action: Role Switcher & User Profile */}
          <div className="flex items-center gap-3">
            {/* Quick Demo Role Switcher */}
            <div className="relative">
              <button
                onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                className="flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg transition-colors"
                title="Switch test roles (Organizer, Attendee, Staff, Admin)"
              >
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline font-mono text-[11px] text-slate-400">Role:</span>
                <span className="text-white font-semibold">{currentUser?.role}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              </button>

              {roleDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 p-2 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 text-xs">
                  <div className="px-2 py-1.5 border-b border-slate-800 mb-1">
                    <p className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
                      Switch Role Mode
                    </p>
                    <p className="text-slate-300 font-medium text-xs truncate">
                      {currentUser?.name}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">{currentUser?.email}</p>
                  </div>

                  {allDemoProfiles.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        switchRole(p.role);
                        setRoleDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors ${
                        currentUser?.role === p.role
                          ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-800/40'
                          : 'hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      <div>
                        <p className="font-semibold text-xs text-white">{p.role}</p>
                        <p className="text-[11px] text-slate-400">{p.name}</p>
                      </div>
                      {currentUser?.role === p.role && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      )}
                    </button>
                  ))}

                  <div className="mt-2 pt-2 border-t border-slate-800 text-[10px] text-slate-500 px-2">
                    Active Org: {currentOrg?.name || 'IEDC Hub'}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Action Button */}
            {currentUser?.role === 'ORGANIZER' && openCreateModal && (
              <button
                onClick={openCreateModal}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Create Event
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile navigation tab bar */}
      <div className="flex md:hidden border-t border-slate-800/80 px-2 py-1.5 justify-around bg-slate-950">
        <button
          onClick={() => setActiveTab('events')}
          className={`px-3 py-1 text-xs font-medium rounded ${
            activeTab === 'events' ? 'text-emerald-400 bg-slate-900' : 'text-slate-400'
          }`}
        >
          Explore
        </button>
        <button
          onClick={() => setActiveTab('passes')}
          className={`px-3 py-1 text-xs font-medium rounded ${
            activeTab === 'passes' ? 'text-emerald-400 bg-slate-900' : 'text-slate-400'
          }`}
        >
          My Passes
        </button>
        <button
          onClick={() => setActiveTab('organizer')}
          className={`px-3 py-1 text-xs font-medium rounded ${
            activeTab === 'organizer' ? 'text-emerald-400 bg-slate-900' : 'text-slate-400'
          }`}
        >
          Workspace
        </button>
        <button
          onClick={() => setActiveTab('verify')}
          className={`px-3 py-1 text-xs font-medium rounded ${
            activeTab === 'verify' ? 'text-emerald-400 bg-slate-900' : 'text-slate-400'
          }`}
        >
          Verify
        </button>
      </div>
    </header>
  );
};
