import React, { useState, useEffect } from 'react';
import {
  QrCode,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Play,
  CheckSquare,
  ShieldCheck,
  Plus,
  RefreshCw,
  LogOut,
  LogIn,
  Filter,
  Search,
  Sliders,
  Sparkles,
} from 'lucide-react';
import {
  EventItem,
  AttendanceBlock,
  AttendanceRecord,
  AttendanceAuditLog,
  Registration,
} from '../../types';
import {
  fetchBlocksForEvent,
  fetchRecordsForEvent,
  fetchAuditLogsForEvent,
  createAttendanceBlock,
  setActiveBlock,
  closeBlock,
  processQRScan,
  executeMassAttendance,
  calculateAttendanceDropOff,
  DropOffAnalysis,
  ScanResult,
} from '../../services/attendanceService';
import { fetchRegistrationsForEvent } from '../../services/bookingService';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { formatTime, formatDateTime } from '../../utils/formatters';

interface AttendanceWorkspaceProps {
  event: EventItem;
  onRefreshEvent?: () => void;
}

export const AttendanceWorkspace: React.FC<AttendanceWorkspaceProps> = ({ event, onRefreshEvent }) => {
  const { currentUser } = useAuth();

  // State
  const [blocks, setBlocks] = useState<AttendanceBlock[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [auditLogs, setAuditLogs] = useState<AttendanceAuditLog[]>([]);
  const [dropOff, setDropOff] = useState<DropOffAnalysis | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Active Sub-tab in Attendance Workspace
  const [subTab, setSubTab] = useState<'live' | 'matrix' | 'blocks' | 'audit'>('live');

  // Scanner Simulator / Live Scan State
  const [scanInput, setScanInput] = useState<string>('');
  const [scanMode, setScanMode] = useState<'AUTO' | 'CHECK_OUT' | 'RE_ENTRY'>('AUTO');
  const [lastScanResult, setLastScanResult] = useState<ScanResult | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);

  // New Block Modal
  const [showAddBlockModal, setShowAddBlockModal] = useState<boolean>(false);
  const [newBlockTitle, setNewBlockTitle] = useState<string>('');
  const [newBlockStart, setNewBlockStart] = useState<string>('02:00 PM');
  const [newBlockEnd, setNewBlockEnd] = useState<string>('04:00 PM');

  // Mass Attendance Modal
  const [showMassModal, setShowMassModal] = useState<boolean>(false);
  const [massAction, setMassAction] = useState<'MARK_PRESENT' | 'UNMARK'>('MARK_PRESENT');
  const [massReason, setMassReason] = useState<string>('Auditorium mass attendance verification');
  const [massFilterDept, setMassFilterDept] = useState<string>('ALL');

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [deptFilter, setDeptFilter] = useState<string>('ALL');

  const loadData = async () => {
    setLoading(true);
    try {
      const [blks, recs, regs, logs] = await Promise.all([
        fetchBlocksForEvent(event.id),
        fetchRecordsForEvent(event.id),
        fetchRegistrationsForEvent(event.id),
        fetchAuditLogsForEvent(event.id),
      ]);

      setBlocks(blks);
      setRecords(recs);
      setRegistrations(regs);
      setAuditLogs(logs);

      // Calculate checked-in count
      const checkedInCount = regs.filter((r) => r.physicalStatus !== 'NOT_CHECKED_IN').length;
      const dropAnalysis = await calculateAttendanceDropOff(event.id, regs.length, checkedInCount);
      setDropOff(dropAnalysis);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [event.id]);

  const activeBlock = blocks.find((b) => b.isActive && !b.isClosed);

  // Handle Scanning
  const handleExecuteScan = async (payloadToProcess?: string) => {
    const targetPayload = payloadToProcess || scanInput;
    if (!targetPayload.trim()) return;

    setIsScanning(true);
    const actor = {
      id: currentUser?.id || 'user_sayush_org',
      name: currentUser?.name || 'Sayush Sunesh',
      role: currentUser?.role || 'ORGANIZER',
    };

    const forced = scanMode === 'CHECK_OUT' ? 'CHECK_OUT' : scanMode === 'RE_ENTRY' ? 'RE_ENTRY' : undefined;

    const result = await processQRScan(targetPayload.trim(), event.id, actor, forced);
    setLastScanResult(result);
    setIsScanning(false);
    setScanInput('');

    // Refresh records
    await loadData();
    if (onRefreshEvent) onRefreshEvent();
  };

  // Block management
  const handleActivateBlock = async (blockId: string) => {
    const actor = {
      id: currentUser?.id || 'user_sayush_org',
      name: currentUser?.name || 'Sayush Sunesh',
      role: currentUser?.role || 'ORGANIZER',
    };
    await setActiveBlock(event.id, blockId, actor);
    await loadData();
  };

  const handleCloseBlock = async (blockId: string) => {
    const actor = {
      id: currentUser?.id || 'user_sayush_org',
      name: currentUser?.name || 'Sayush Sunesh',
      role: currentUser?.role || 'ORGANIZER',
    };
    await closeBlock(event.id, blockId, actor);
    await loadData();
  };

  const handleCreateBlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBlockTitle) return;
    const actor = {
      id: currentUser?.id || 'user_sayush_org',
      name: currentUser?.name || 'Sayush Sunesh',
      role: currentUser?.role || 'ORGANIZER',
    };
    await createAttendanceBlock(event.id, newBlockTitle, newBlockStart, newBlockEnd, actor);
    setShowAddBlockModal(false);
    setNewBlockTitle('');
    await loadData();
  };

  // Mass Attendance execution
  const handleMassAttendanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBlock) return;

    const actor = {
      id: currentUser?.id || 'user_sayush_org',
      name: currentUser?.name || 'Sayush Sunesh',
      role: currentUser?.role || 'ORGANIZER',
    };

    let targetRegs = registrations.filter((r) => r.status === 'APPROVED');
    if (massFilterDept !== 'ALL') {
      targetRegs = targetRegs.filter((r) => r.attendeeDept === massFilterDept);
    }

    await executeMassAttendance(
      event.id,
      activeBlock.id,
      targetRegs,
      massAction,
      actor,
      massReason
    );

    setShowMassModal(false);
    await loadData();
  };

  // Unique departments for filter
  const departments = Array.from(
    new Set(registrations.map((r) => r.attendeeDept).filter(Boolean) as string[])
  );

  const filteredRegistrations = registrations.filter((r) => {
    const matchesSearch =
      r.attendeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.bookingId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.teamName && r.teamName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesDept = deptFilter === 'ALL' || r.attendeeDept === deptFilter;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner: Active Session Block Controller & Quick Stats */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-base font-semibold text-white">Live Attendance Operations Engine</h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Session-aware attendance tracks real block-level retention, duplicate scans, and re-entry.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddBlockModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 rounded-lg hover:bg-emerald-900/50"
            >
              <Plus className="w-3.5 h-3.5" />
              New Block
            </button>
            <button
              onClick={loadData}
              className="p-1.5 text-slate-400 hover:text-white bg-slate-800 border border-slate-700 rounded-lg"
              title="Refresh attendance records"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Active Block Status bar */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
            <span className="text-[10px] font-mono uppercase text-slate-500 tracking-wider">
              Active Session Block
            </span>
            <p className="text-xs font-semibold text-emerald-400 mt-1 truncate">
              {activeBlock ? activeBlock.title : 'No Session Block Active'}
            </p>
            <p className="text-[10px] text-slate-400">
              {activeBlock ? `${activeBlock.startTime} - ${activeBlock.endTime}` : 'Activate a block below'}
            </p>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
            <span className="text-[10px] font-mono uppercase text-slate-500 tracking-wider">
              Current Session Present
            </span>
            <p className="text-lg font-bold font-mono text-white mt-0.5">
              {activeBlock ? activeBlock.totalPresent : 0}
            </p>
            <p className="text-[10px] text-slate-400">
              in active checkpoint session
            </p>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
            <span className="text-[10px] font-mono uppercase text-slate-500 tracking-wider">
              Physical In-Venue
            </span>
            <p className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
              {registrations.filter((r) => r.physicalStatus === 'CHECKED_IN' || r.physicalStatus === 'RE_ENTERED').length}
            </p>
            <p className="text-[10px] text-slate-400">
              {registrations.filter((r) => r.physicalStatus === 'CHECKED_OUT').length} stepped out
            </p>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
            <span className="text-[10px] font-mono uppercase text-slate-500 tracking-wider">
              Drop-Off Retention
            </span>
            <p className="text-lg font-bold font-mono text-amber-400 mt-0.5">
              {dropOff?.overallRetentionPct ?? 100}%
            </p>
            <p className="text-[10px] text-slate-400 truncate">
              Peak Drop: {dropOff?.largestDropOffBlock || 'None'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSubTab('live')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              subTab === 'live'
                ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            Live Check-In & Scanner
          </button>

          <button
            onClick={() => setSubTab('matrix')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              subTab === 'matrix'
                ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Session Attendance Matrix
          </button>

          <button
            onClick={() => setSubTab('blocks')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              subTab === 'blocks'
                ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Attendance Blocks ({blocks.length})
          </button>

          <button
            onClick={() => setSubTab('audit')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              subTab === 'audit'
                ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Audit Trail ({auditLogs.length})
          </button>
        </div>

        {subTab === 'matrix' && activeBlock && (
          <button
            onClick={() => setShowMassModal(true)}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-amber-300 bg-amber-950/40 border border-amber-800/60 rounded-lg hover:bg-amber-900/50"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            Mass Attendance
          </button>
        )}
      </div>

      {/* TAB 1: LIVE CHECK-IN & SCANNER CONSOLE */}
      {subTab === 'live' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Live Scan Input & Duplicate Detector */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h3 className="text-xs font-semibold text-white mb-1 flex items-center gap-2">
                <QrCode className="w-4 h-4 text-emerald-400" />
                Live QR Badge Scanner
              </h3>
              <p className="text-[11px] text-slate-400 mb-4">
                Scan pass badges or simulated tokens. Automatic session block tagging & duplicate detection.
              </p>

              {/* Mode Selector (Auto / Check-out / Re-entry) */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <button
                  onClick={() => setScanMode('AUTO')}
                  className={`px-2 py-1.5 text-xs font-medium rounded-lg border flex items-center justify-center gap-1.5 ${
                    scanMode === 'AUTO'
                      ? 'bg-emerald-950/60 text-emerald-300 border-emerald-600/60 font-semibold'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" /> Check-In / Session
                </button>
                <button
                  onClick={() => setScanMode('CHECK_OUT')}
                  className={`px-2 py-1.5 text-xs font-medium rounded-lg border flex items-center justify-center gap-1.5 ${
                    scanMode === 'CHECK_OUT'
                      ? 'bg-blue-950/60 text-blue-300 border-blue-600/60 font-semibold'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <LogOut className="w-3.5 h-3.5" /> Check-Out
                </button>
                <button
                  onClick={() => setScanMode('RE_ENTRY')}
                  className={`px-2 py-1.5 text-xs font-medium rounded-lg border flex items-center justify-center gap-1.5 ${
                    scanMode === 'RE_ENTRY'
                      ? 'bg-purple-950/60 text-purple-300 border-purple-600/60 font-semibold'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Re-Entry
                </button>
              </div>

              {/* Input box */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleExecuteScan()}
                  placeholder="Paste QR payload, Booking ID (e.g. BK-SIH-901), or Registration ID"
                  className="flex-1 px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white font-mono placeholder:font-sans focus:outline-none focus:border-emerald-500"
                />
                <button
                  onClick={() => handleExecuteScan()}
                  disabled={isScanning || !scanInput.trim()}
                  className="px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-40 rounded-lg transition-colors"
                >
                  {isScanning ? 'Verifying...' : 'Process'}
                </button>
              </div>

              {/* Quick Simulation Badge Chips */}
              <div className="mt-4 pt-3 border-t border-slate-800/80">
                <span className="text-[10px] uppercase font-mono text-slate-500 tracking-wider">
                  Test Attendees Quick-Scan
                </span>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {registrations.slice(0, 4).map((reg) => (
                    <button
                      key={reg.id}
                      onClick={() => handleExecuteScan(reg.qrPayload)}
                      className="px-2.5 py-1 text-[11px] bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 rounded transition-colors"
                    >
                      {reg.attendeeName} ({reg.bookingId})
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Scan Feedback Box: Duplicate Detection / Success */}
            {lastScanResult && (
              <div
                className={`p-4 rounded-xl border ${
                  lastScanResult.isDuplicate
                    ? 'bg-amber-950/40 border-amber-500/80 text-amber-200'
                    : lastScanResult.success
                    ? 'bg-emerald-950/40 border-emerald-500/80 text-emerald-200'
                    : 'bg-rose-950/40 border-rose-500/80 text-rose-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  {lastScanResult.isDuplicate ? (
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  ) : lastScanResult.success ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  )}

                  <div className="flex-1 text-xs">
                    <p className="font-semibold text-sm">
                      {lastScanResult.isDuplicate
                        ? 'SUSPICIOUS / DUPLICATE SCAN DETECTED'
                        : lastScanResult.success
                        ? 'VERIFICATION SUCCESSFUL'
                        : 'VALIDATION ERROR'}
                    </p>
                    <p className="mt-1">{lastScanResult.message}</p>

                    {/* Duplicate details */}
                    {lastScanResult.duplicateScanDetails && (
                      <div className="mt-2.5 p-2 bg-slate-950/80 border border-amber-600/40 rounded text-[11px] space-y-0.5">
                        <p className="text-slate-300 font-medium">Prior Scan Record:</p>
                        <p className="text-slate-400">
                          Timestamp: {formatDateTime(lastScanResult.duplicateScanDetails.scannedAt)}
                        </p>
                        <p className="text-slate-400">
                          Scanner Staff: {lastScanResult.duplicateScanDetails.scannerName}
                        </p>
                        <p className="text-slate-400">
                          Block: {lastScanResult.duplicateScanDetails.blockTitle}
                        </p>
                      </div>
                    )}

                    {/* Participant Details Card */}
                    {lastScanResult.registration && (
                      <div className="mt-2.5 pt-2 border-t border-current/20 flex items-center justify-between text-[11px]">
                        <span>
                          {lastScanResult.registration.attendeeName} • {lastScanResult.registration.ticketName}
                        </span>
                        <Badge status={lastScanResult.registration.physicalStatus} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Attendance Drop-Off Intelligence & Recent Scans */}
          <div className="lg:col-span-6 space-y-4">
            {/* Session Drop-off Intelligence */}
            {dropOff && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-white flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    Attendance Drop-Off Intelligence
                  </h3>
                  <span className="text-[11px] font-mono text-emerald-400">
                    Retention: {dropOff.overallRetentionPct}%
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mb-3">
                  Session-to-session retention calculated from live block records.
                </p>

                <div className="space-y-2.5">
                  {dropOff.blockStats.map((bs, i) => (
                    <div key={bs.blockId} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-300 truncate max-w-[220px]">
                          {bs.order}. {bs.title}
                        </span>
                        <div className="flex items-center gap-2 font-mono">
                          <span className="text-white font-semibold">{bs.presentCount} present</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded ${
                              bs.retentionFromPreviousPct >= 90
                                ? 'bg-emerald-950 text-emerald-400'
                                : bs.retentionFromPreviousPct >= 75
                                ? 'bg-amber-950 text-amber-400'
                                : 'bg-rose-950 text-rose-400'
                            }`}
                          >
                            {bs.retentionFromPreviousPct}% ret.
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${bs.retentionFromPreviousPct}%` }}
                        />
                      </div>
                      {bs.dropOffFromPreviousCount > 0 && (
                        <p className="text-[10px] text-amber-400/90 font-mono">
                          ↳ {bs.dropOffSummary}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Scans feed */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h3 className="text-xs font-semibold text-white mb-2">Recent Scans & Activity</h3>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {auditLogs.slice(0, 6).map((log) => (
                  <div
                    key={log.id}
                    className="p-2 bg-slate-950 border border-slate-800 rounded-lg text-[11px] flex items-center justify-between"
                  >
                    <div>
                      <p className="text-slate-200 font-medium">{log.attendeeName || log.reason}</p>
                      <p className="text-[10px] text-slate-500">
                        {log.actionType} • by {log.actorName} ({log.source})
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 shrink-0">
                      {formatTime(log.timestamp.slice(11, 16))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SESSION ATTENDANCE MATRIX */}
      {subTab === 'matrix' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search attendee, booking ID, or team..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-300"
              >
                <option value="ALL">All Departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Matrix Table */}
          <div className="overflow-x-auto border border-slate-800 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Attendee / Team</th>
                  <th className="py-2.5 px-3">Ticket</th>
                  <th className="py-2.5 px-3">Physical Presence</th>
                  {blocks.map((b) => (
                    <th key={b.id} className="py-2.5 px-3 text-center">
                      <span className="truncate block max-w-[120px]" title={b.title}>
                        {b.title}
                      </span>
                    </th>
                  ))}
                  <th className="py-2.5 px-3 text-right">Attendance %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredRegistrations.map((reg) => {
                  const regRecords = records.filter((r) => r.registrationId === reg.id && r.status === 'PRESENT');
                  const attendedCount = regRecords.length;
                  const pct = blocks.length > 0 ? Math.round((attendedCount / blocks.length) * 100) : 0;

                  return (
                    <tr key={reg.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 font-medium text-white">
                        <div>{reg.attendeeName}</div>
                        {reg.teamName && (
                          <div className="text-[10px] text-emerald-400">Team: {reg.teamName}</div>
                        )}
                        <div className="text-[10px] font-mono text-slate-500">{reg.bookingId}</div>
                      </td>

                      <td className="py-2.5 px-3">
                        <span className="text-slate-300">{reg.ticketName}</span>
                      </td>

                      <td className="py-2.5 px-3">
                        <Badge status={reg.physicalStatus} />
                      </td>

                      {/* Block Columns */}
                      {blocks.map((b) => {
                        const isPresent = records.some(
                          (r) => r.attendanceBlockId === b.id && r.registrationId === reg.id && r.status === 'PRESENT'
                        );

                        return (
                          <td key={b.id} className="py-2.5 px-3 text-center">
                            {isPresent ? (
                              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Present
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                                <XCircle className="w-3.5 h-3.5" /> Absent
                              </span>
                            )}
                          </td>
                        );
                      })}

                      <td className="py-2.5 px-3 text-right font-mono font-semibold">
                        <span
                          className={
                            pct >= 75 ? 'text-emerald-400' : pct >= 50 ? 'text-amber-400' : 'text-slate-500'
                          }
                        >
                          {attendedCount}/{blocks.length} ({pct}%)
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: DYNAMIC ATTENDANCE BLOCKS MANAGER */}
      {subTab === 'blocks' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold text-white">Dynamic Session Blocks</h3>
              <p className="text-[11px] text-slate-400">
                Activate blocks to direct incoming scans into the corresponding session checkpoint.
              </p>
            </div>
            <button
              onClick={() => setShowAddBlockModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 rounded hover:bg-emerald-900/50"
            >
              <Plus className="w-3.5 h-3.5" /> Add Block
            </button>
          </div>

          <div className="space-y-3">
            {blocks.map((b) => (
              <div
                key={b.id}
                className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                  b.isActive
                    ? 'bg-emerald-950/20 border-emerald-500/60 shadow-md'
                    : b.isClosed
                    ? 'bg-slate-950 border-slate-800/80 opacity-70'
                    : 'bg-slate-950 border-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-slate-500">#{b.order}</span>
                    <h4 className="text-xs font-semibold text-white">{b.title}</h4>
                    {b.isActive && (
                      <span className="px-1.5 py-0.2 text-[10px] font-semibold text-emerald-300 bg-emerald-900/60 rounded border border-emerald-700">
                        ACTIVE SESSION
                      </span>
                    )}
                    {b.isClosed && (
                      <span className="px-1.5 py-0.2 text-[10px] font-semibold text-slate-400 bg-slate-800 rounded">
                        CLOSED
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Timing: {b.startTime} - {b.endTime} • Total Verified Present: {b.totalPresent}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {!b.isActive && (
                    <button
                      onClick={() => handleActivateBlock(b.id)}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-700/60 rounded hover:bg-emerald-900/60"
                    >
                      <Play className="w-3 h-3" /> Set Active
                    </button>
                  )}
                  {b.isActive && (
                    <button
                      onClick={() => handleCloseBlock(b.id)}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded"
                    >
                      Close Block
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: AUDIT TRAIL LOGS */}
      {subTab === 'audit' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div>
              <h3 className="text-xs font-semibold text-white">Immutable Operations Audit Trail</h3>
              <p className="text-[11px] text-slate-400">
                Every scan, manual override, block toggle, and cert action is cryptographically logged.
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400">{auditLogs.length} Records</span>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 bg-slate-950 border border-slate-800/90 rounded-lg text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-emerald-400 font-semibold uppercase">
                      [{log.actionType}]
                    </span>
                    <span className="text-white font-medium">{log.attendeeName || log.blockTitle || 'Event Level'}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {log.reason} {log.details ? `— ${log.details}` : ''}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
                    Actor: {log.actorName} ({log.actorRole}) • Source: {log.source}
                  </p>
                </div>
                <span className="text-[10px] font-mono text-slate-500 shrink-0">
                  {formatDateTime(log.timestamp)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CREATE BLOCK MODAL */}
      <Modal
        isOpen={showAddBlockModal}
        onClose={() => setShowAddBlockModal(false)}
        title="Add Dynamic Attendance Block"
        subtitle="Define a new trackable session checkpoint"
        maxWidth="md"
      >
        <form onSubmit={handleCreateBlockSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 mb-1">Block Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Afternoon Keynote & Fireside"
              value={newBlockTitle}
              onChange={(e) => setNewBlockTitle(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 mb-1">Start Time</label>
              <input
                type="text"
                value={newBlockStart}
                onChange={(e) => setNewBlockStart(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-slate-300 mb-1">End Time</label>
              <input
                type="text"
                value={newBlockEnd}
                onChange={(e) => setNewBlockEnd(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddBlockModal(false)}
              className="px-3 py-1.5 text-xs text-slate-400 bg-slate-800 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded"
            >
              Save Block
            </button>
          </div>
        </form>
      </Modal>

      {/* MASS ATTENDANCE MODAL */}
      <Modal
        isOpen={showMassModal}
        onClose={() => setShowMassModal(false)}
        title="Execute Mass Attendance"
        subtitle={`Session Target: ${activeBlock?.title || 'Active Block'}`}
        maxWidth="md"
      >
        <form onSubmit={handleMassAttendanceSubmit} className="space-y-4 text-xs">
          <div className="p-3 bg-amber-950/30 border border-amber-800/40 rounded-lg text-amber-200">
            <p className="font-semibold text-xs">Audit Protection Warning</p>
            <p className="text-[11px] text-amber-300/80 mt-0.5">
              Bulk actions require a verifiable justification reason and are permanently preserved in the event audit trail.
            </p>
          </div>

          <div>
            <label className="block text-slate-300 mb-1">Action Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMassAction('MARK_PRESENT')}
                className={`p-2 rounded border text-center ${
                  massAction === 'MARK_PRESENT'
                    ? 'bg-emerald-950/60 border-emerald-600 text-emerald-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                Mark Filtered Present
              </button>
              <button
                type="button"
                onClick={() => setMassAction('UNMARK')}
                className={`p-2 rounded border text-center ${
                  massAction === 'UNMARK'
                    ? 'bg-rose-950/60 border-rose-600 text-rose-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                Unmark Filtered
              </button>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 mb-1">Target Department Filter</label>
            <select
              value={massFilterDept}
              onChange={(e) => setMassFilterDept(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
            >
              <option value="ALL">All Approved Attendees</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-300 mb-1">Audit Justification Reason *</label>
            <textarea
              rows={2}
              required
              value={massReason}
              onChange={(e) => setMassReason(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
              placeholder="e.g. Auditorium roll call completed by floor managers."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowMassModal(false)}
              className="px-3 py-1.5 text-xs text-slate-400 bg-slate-800 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded"
            >
              Confirm & Execute
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
