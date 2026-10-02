import React, { useState, useEffect } from 'react';
import {
  Layers,
  Calendar,
  Users,
  QrCode,
  Award,
  Download,
  Mail,
  Shield,
  Settings,
  Plus,
  Copy,
  ChevronDown,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
  TrendingUp,
  FileSpreadsheet,
  Trash2,
  Sparkles,
} from 'lucide-react';
import {
  EventItem,
  Registration,
  CertificateRecord,
  EventStaff,
  CommunicationLog,
  AttendanceBlock,
  AttendanceRecord,
} from '../../types';
import {
  fetchAllEvents,
  duplicateEvent,
  changeEventStatus,
} from '../../services/eventService';
import {
  fetchRegistrationsForEvent,
  updateRegistrationStatus,
  promoteWaitlistedRegistration,
} from '../../services/bookingService';
import {
  fetchCertificatesForEvent,
  calculateEligibility,
  issueCertificate,
} from '../../services/certificateService';
import { fetchStaffForEvent, assignStaffMember, removeStaffMember } from '../../services/staffService';
import { fetchCommunicationsForEvent, sendCommunication } from '../../services/communicationService';
import {
  exportAttendeesCsv,
  exportSessionAttendanceMatrixCsv,
  exportCertificatesCsv,
  exportAuditLogsCsv,
} from '../../services/exportService';
import {
  fetchBlocksForEvent,
  fetchRecordsForEvent,
  fetchAuditLogsForEvent,
} from '../../services/attendanceService';
import { AttendanceWorkspace } from '../../components/attendance/AttendanceWorkspace';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { useAuth } from '../../context/AuthContext';
import { generateCertificatePDF } from '../../utils/certificatePdf';
import { formatDate, formatCurrency, formatDateTime } from '../../utils/formatters';
import confetti from 'canvas-confetti';

interface OrganizerWorkspaceViewProps {
  onOpenCreateWizard: () => void;
}

export const OrganizerWorkspaceView: React.FC<OrganizerWorkspaceViewProps> = ({
  onOpenCreateWizard,
}) => {
  const { currentUser, currentOrg } = useAuth();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<
    'overview' | 'attendance' | 'attendees' | 'certificates' | 'comms' | 'staff' | 'exports' | 'settings'
  >('overview');

  // Event related states
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [certificates, setCertificates] = useState<CertificateRecord[]>([]);
  const [staff, setStaff] = useState<EventStaff[]>([]);
  const [comms, setComms] = useState<CommunicationLog[]>([]);
  const [blocks, setBlocks] = useState<AttendanceBlock[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modals
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<'CHECK_IN_STAFF' | 'ATTENDANCE_MANAGER' | 'REGISTRATION_STAFF'>('CHECK_IN_STAFF');
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);

  const [commSubject, setCommSubject] = useState('');
  const [commContent, setCommContent] = useState('');
  const [commType, setCommType] = useState<CommunicationLog['type']>('SESSION_ANNOUNCEMENT');
  const [showSendCommModal, setShowSendCommModal] = useState(false);

  // Attendees search & filter
  const [attendeeSearch, setAttendeeSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const loadAll = async (targetId?: string) => {
    setLoading(true);
    try {
      const allEvts = await fetchAllEvents();
      setEvents(allEvts);

      const activeId = targetId || selectedEventId || allEvts[0]?.id;
      setSelectedEventId(activeId);

      if (activeId) {
        const [regs, certs, stf, cms, blks, recs] = await Promise.all([
          fetchRegistrationsForEvent(activeId),
          fetchCertificatesForEvent(activeId),
          fetchStaffForEvent(activeId),
          fetchCommunicationsForEvent(activeId),
          fetchBlocksForEvent(activeId),
          fetchRecordsForEvent(activeId),
        ]);

        setRegistrations(regs);
        setCertificates(certs);
        setStaff(stf);
        setComms(cms);
        setBlocks(blks);
        setRecords(recs);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const currentEvent = events.find((e) => e.id === selectedEventId) || events[0];

  const handleDuplicate = async () => {
    if (!currentEvent) return;
    try {
      const cloned = await duplicateEvent(currentEvent.id, currentUser?.id || 'user_sayush_org');
      await loadAll(cloned.id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleStatusChange = async (newStatus: any) => {
    if (!currentEvent) return;
    await changeEventStatus(currentEvent.id, newStatus);
    await loadAll();
  };

  const handleApproveRegistration = async (regId: string) => {
    await updateRegistrationStatus(regId, 'APPROVED');
    await loadAll();
  };

  const handleRejectRegistration = async (regId: string) => {
    const reason = prompt('Please specify rejection cause:');
    if (reason) {
      await updateRegistrationStatus(regId, 'REJECTED', reason);
      await loadAll();
    }
  };

  const handlePromoteWaitlist = async () => {
    if (!currentEvent) return;
    const promoted = await promoteWaitlistedRegistration(currentEvent.id);
    if (promoted) {
      alert(`Promoted ${promoted.attendeeName} to APPROVED!`);
      await loadAll();
    } else {
      alert('No waitlisted registrations found.');
    }
  };

  const handleIssueCertForReg = async (reg: Registration) => {
    if (!currentEvent) return;
    const actor = {
      id: currentUser?.id || 'user_sayush_org',
      name: currentUser?.name || 'Sayush Sunesh',
      role: 'ORGANIZER',
    };
    const cert = await issueCertificate(currentEvent, reg, actor);
    confetti({ particleCount: 60, spread: 60 });
    await loadAll();
    await generateCertificatePDF(cert);
  };

  const handleAddStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEvent || !newStaffEmail) return;
    await assignStaffMember(currentEvent.id, newStaffEmail, newStaffName || newStaffEmail.split('@')[0], newStaffRole);
    setShowAddStaffModal(false);
    setNewStaffEmail('');
    setNewStaffName('');
    await loadAll();
  };

  const handleRemoveStaff = async (staffId: string) => {
    await removeStaffMember(staffId);
    await loadAll();
  };

  const handleSendCommSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEvent || !commSubject) return;
    await sendCommunication(
      currentEvent.id,
      commType,
      commSubject,
      commContent,
      'All Registered Attendees',
      registrations.length,
      currentUser?.name || 'Sayush Sunesh'
    );
    setShowSendCommModal(false);
    setCommSubject('');
    setCommContent('');
    await loadAll();
  };

  // Funnel analytics calculation
  const totalRegistered = registrations.length;
  const totalCheckedIn = registrations.filter((r) => r.physicalStatus !== 'NOT_CHECKED_IN').length;
  const attendedRequiredSessions = registrations.filter((r) => {
    const recs = records.filter((rec) => rec.registrationId === r.id && rec.status === 'PRESENT');
    return blocks.length > 0 && recs.length >= Math.ceil(blocks.length * 0.7);
  }).length;
  const certsEligibleCount = registrations.filter((r) => r.certificateEligible).length;
  const certsIssuedCount = certificates.length;

  const filteredRegistrations = registrations.filter((r) => {
    const matchesQuery =
      r.attendeeName.toLowerCase().includes(attendeeSearch.toLowerCase()) ||
      r.attendeeEmail.toLowerCase().includes(attendeeSearch.toLowerCase()) ||
      r.bookingId.toLowerCase().includes(attendeeSearch.toLowerCase()) ||
      (r.teamName && r.teamName.toLowerCase().includes(attendeeSearch.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Top Event Selector & Actions Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <select
                value={selectedEventId}
                onChange={(e) => {
                  setSelectedEventId(e.target.value);
                  loadAll(e.target.value);
                }}
                className="text-base font-bold text-white bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 focus:outline-none focus:border-emerald-500"
              >
                {events.map((evt) => (
                  <option key={evt.id} value={evt.id}>
                    {evt.name}
                  </option>
                ))}
              </select>
              {currentEvent && <Badge status={currentEvent.publishedStatus} />}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {currentOrg?.name || 'Operations Workspace'} • {formatDate(currentEvent?.date)} • {currentEvent?.venue}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDuplicate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 border border-slate-800 rounded-lg transition-colors"
            title="Duplicate event configuration with fresh IDs"
          >
            <Copy className="w-3.5 h-3.5 text-slate-400" />
            Duplicate
          </button>

          <button
            onClick={onOpenCreateWizard}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            New Event
          </button>
        </div>
      </div>

      {/* Main Workspace Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-800 pb-2 overflow-x-auto text-xs">
        {[
          { id: 'overview', label: 'Overview & Funnel', icon: TrendingUp },
          { id: 'attendance', label: 'Live Attendance & QR', icon: QrCode },
          { id: 'attendees', label: `Attendees & Teams (${registrations.length})`, icon: Users },
          { id: 'certificates', label: `Certificates (${certificates.length})`, icon: Award },
          { id: 'comms', label: `Communications (${comms.length})`, icon: Mail },
          { id: 'staff', label: `Staff & Roles (${staff.length})`, icon: Shield },
          { id: 'exports', label: 'Data Exports', icon: FileSpreadsheet },
          { id: 'settings', label: 'Settings & Status', icon: Settings },
        ].map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors shrink-0 ${
                active
                  ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW & FUNNEL */}
      {activeTab === 'overview' && currentEvent && (
        <div className="space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="text-[10px] uppercase font-mono text-slate-500 tracking-wider">
                Total Registrations
              </span>
              <p className="text-2xl font-bold font-mono text-white mt-1">
                {totalRegistered}{' '}
                <span className="text-xs font-normal text-slate-400">/ {currentEvent.capacity}</span>
              </p>
              <p className="text-[11px] text-emerald-400 mt-1">
                {Math.round((totalRegistered / currentEvent.capacity) * 100)}% Capacity reached
              </p>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="text-[10px] uppercase font-mono text-slate-500 tracking-wider">
                In-Venue Check-In
              </span>
              <p className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                {totalCheckedIn}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                {totalRegistered > 0 ? Math.round((totalCheckedIn / totalRegistered) * 100) : 0}% Check-in rate
              </p>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="text-[10px] uppercase font-mono text-slate-500 tracking-wider">
                Session Qualified
              </span>
              <p className="text-2xl font-bold font-mono text-teal-300 mt-1">
                {attendedRequiredSessions}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Attended required block sessions</p>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="text-[10px] uppercase font-mono text-slate-500 tracking-wider">
                Commission-Free Revenue
              </span>
              <p className="text-2xl font-bold font-mono text-white mt-1">
                ₹{registrations.reduce((acc, r) => acc + (r.pricePaid || 0), 0).toLocaleString('en-IN')}
              </p>
              <p className="text-[11px] text-emerald-400 mt-1">
                EasyBook Fee: ₹0 (100% Organizer)
              </p>
            </div>
          </div>

          {/* Registration -> Attendance -> Certificate Funnel */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="text-xs font-semibold text-white mb-2 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              Operational Conversion Funnel
            </h3>
            <p className="text-[11px] text-slate-400 mb-4">
              Real calculations tracking participants through registration, physical entry, session compliance, and credential issuance.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-center">
              {[
                { stage: '1. Registered', count: totalRegistered, pct: 100, color: 'text-white' },
                { stage: '2. Checked In', count: totalCheckedIn, pct: totalRegistered ? Math.round((totalCheckedIn / totalRegistered) * 100) : 0, color: 'text-emerald-400' },
                { stage: '3. Sessions Done', count: attendedRequiredSessions, pct: totalCheckedIn ? Math.round((attendedRequiredSessions / totalCheckedIn) * 100) : 0, color: 'text-teal-300' },
                { stage: '4. Cert Eligible', count: certsEligibleCount || attendedRequiredSessions, pct: 100, color: 'text-amber-400' },
                { stage: '5. Issued', count: certsIssuedCount, pct: 100, color: 'text-emerald-400' },
              ].map((step, idx) => (
                <div key={idx} className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  <span className="text-[10px] uppercase font-mono text-slate-500">{step.stage}</span>
                  <p className={`text-xl font-bold font-mono mt-1 ${step.color}`}>{step.count}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{step.pct}% retention</p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold text-white">Live Attendance Console</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Launch the scanner and session block operations
                </p>
              </div>
              <button
                onClick={() => setActiveTab('attendance')}
                className="flex items-center gap-1 px-3 py-1.5 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 rounded-lg hover:bg-emerald-900/50"
              >
                Launch Console <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold text-white">Automated Waitlist Promotion</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Promote highest-priority waitlisted candidate
                </p>
              </div>
              <button
                onClick={handlePromoteWaitlist}
                className="flex items-center gap-1 px-3 py-1.5 text-xs text-amber-300 bg-amber-950/40 border border-amber-800/60 rounded-lg hover:bg-amber-900/50"
              >
                Promote #1 <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LIVE ATTENDANCE WORKSPACE */}
      {activeTab === 'attendance' && currentEvent && (
        <AttendanceWorkspace event={currentEvent} onRefreshEvent={() => loadAll()} />
      )}

      {/* TAB 3: ATTENDEES & TEAMS */}
      {activeTab === 'attendees' && currentEvent && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <input
              type="text"
              placeholder="Search name, booking ID, email, or team..."
              value={attendeeSearch}
              onChange={(e) => setAttendeeSearch(e.target.value)}
              className="w-full sm:w-80 px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white"
            />

            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-300"
              >
                <option value="ALL">All Statuses</option>
                <option value="APPROVED">Approved</option>
                <option value="PENDING">Pending Review</option>
                <option value="WAITLISTED">Waitlisted</option>
                <option value="REJECTED">Rejected</option>
              </select>

              <button
                onClick={() => exportAttendeesCsv(currentEvent, registrations)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 rounded-lg hover:bg-emerald-900/50"
              >
                <Download className="w-3.5 h-3.5" /> Export CSV
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-800 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Participant / Team</th>
                  <th className="py-2.5 px-3">Contact</th>
                  <th className="py-2.5 px-3">Ticket</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Physical Presence</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredRegistrations.map((reg) => (
                  <tr key={reg.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 font-medium text-white">
                      <div>{reg.attendeeName}</div>
                      {reg.teamName && (
                        <div className="text-[11px] text-emerald-400">
                          Team: {reg.teamName} ({reg.teamMembers?.length || 1} members)
                        </div>
                      )}
                      <div className="text-[10px] font-mono text-slate-500">{reg.bookingId}</div>
                    </td>

                    <td className="py-2.5 px-3">
                      <div>{reg.attendeeEmail}</div>
                      <div className="text-[10px] text-slate-500">{reg.attendeePhone}</div>
                    </td>

                    <td className="py-2.5 px-3">
                      <span>{reg.ticketName}</span>
                    </td>

                    <td className="py-2.5 px-3">
                      <Badge status={reg.status} />
                      {reg.waitlistNumber && (
                        <span className="text-[10px] font-mono text-amber-400 block mt-0.5">
                          Waitlist #{reg.waitlistNumber}
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-3">
                      <Badge status={reg.physicalStatus} />
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      {reg.status === 'PENDING' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleApproveRegistration(reg.id)}
                            className="px-2 py-1 text-[11px] bg-emerald-950 text-emerald-400 border border-emerald-800 rounded hover:bg-emerald-900"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectRegistration(reg.id)}
                            className="px-2 py-1 text-[11px] bg-rose-950 text-rose-400 border border-rose-800 rounded hover:bg-rose-900"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-500 font-mono">Processed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: CERTIFICATES */}
      {activeTab === 'certificates' && currentEvent && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-xs font-semibold text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-400" />
                Rule-Based Certificate Engine
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Rule: {currentEvent.certificateSettings.criteria.rule} (
                {currentEvent.certificateSettings.criteria.minSessions
                  ? `Min ${currentEvent.certificateSettings.criteria.minSessions} sessions`
                  : `${currentEvent.certificateSettings.criteria.minPercentage}% attendance`}
                )
              </p>
            </div>

            <button
              onClick={() => exportCertificatesCsv(currentEvent, certificates)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 rounded-lg hover:bg-emerald-900/50"
            >
              <Download className="w-3.5 h-3.5" /> Export Certificates CSV
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-800 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Participant</th>
                  <th className="py-2.5 px-3">Session Progress</th>
                  <th className="py-2.5 px-3">Eligibility Rule Status</th>
                  <th className="py-2.5 px-3">Certificate ID</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {registrations.map((reg) => {
                  const regRecords = records.filter(
                    (r) => r.registrationId === reg.id && r.status === 'PRESENT'
                  );
                  const count = regRecords.length;
                  const total = blocks.length;
                  const isEligible = total > 0 && count >= Math.min(total, 2);
                  const issuedCert = certificates.find((c) => c.registrationId === reg.id);

                  return (
                    <tr key={reg.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 font-medium text-white">
                        {reg.attendeeName}
                        <div className="text-[10px] text-slate-500">{reg.attendeeEmail}</div>
                      </td>

                      <td className="py-2.5 px-3 font-mono">
                        {count} / {total} Sessions
                      </td>

                      <td className="py-2.5 px-3">
                        {isEligible ? (
                          <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Eligible
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-500">Incomplete Attendance</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 font-mono text-[11px]">
                        {issuedCert ? issuedCert.certificateNumber : '—'}
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        {issuedCert ? (
                          <button
                            onClick={() => generateCertificatePDF(issuedCert)}
                            className="px-2.5 py-1 text-[11px] font-medium text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded"
                          >
                            Download PDF
                          </button>
                        ) : isEligible ? (
                          <button
                            onClick={() => handleIssueCertForReg(reg)}
                            className="px-2.5 py-1 text-[11px] font-medium text-emerald-300 bg-emerald-950 border border-emerald-700 rounded hover:bg-emerald-900"
                          >
                            Generate & Issue
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-600">Pending</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: COMMUNICATIONS */}
      {activeTab === 'comms' && currentEvent && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-xs font-semibold text-white">Communications & Notification Dispatch</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Send official announcements, session calls, or certificate alerts to attendees.
              </p>
            </div>
            <button
              onClick={() => setShowSendCommModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg"
            >
              <Plus className="w-3.5 h-3.5" /> Compose Message
            </button>
          </div>

          <div className="space-y-3">
            {comms.map((c) => (
              <div key={c.id} className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-emerald-400 font-semibold">
                    [{c.type}]
                  </span>
                  <span className="text-slate-500 font-mono text-[10px]">
                    {formatDateTime(c.sentAt)}
                  </span>
                </div>
                <h4 className="font-semibold text-white text-sm">{c.subject}</h4>
                <p className="text-slate-300 text-xs">{c.content}</p>
                <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-[10px] text-slate-500">
                  <span>Sent by: {c.sentBy}</span>
                  <span>Delivered to {c.recipientCount} attendees</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: STAFF & ROLES */}
      {activeTab === 'staff' && currentEvent && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-xs font-semibold text-white">Event-Scoped Staff & Permissions</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Assign volunteers and managers with granular privileges for this event only.
              </p>
            </div>
            <button
              onClick={() => setShowAddStaffModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg"
            >
              <Plus className="w-3.5 h-3.5" /> Assign Staff
            </button>
          </div>

          <div className="space-y-3">
            {staff.map((s) => (
              <div
                key={s.id}
                className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs"
              >
                <div>
                  <h4 className="font-semibold text-white">{s.userName}</h4>
                  <p className="text-[11px] text-slate-400">{s.userEmail}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    <span className="px-1.5 py-0.2 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded text-[10px] font-mono">
                      Role: {s.role}
                    </span>
                    {s.permissions.map((p, i) => (
                      <span key={i} className="px-1.5 py-0.2 bg-slate-800 text-slate-300 rounded text-[10px]">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>

                {s.role !== 'ORGANIZER' && (
                  <button
                    onClick={() => handleRemoveStaff(s.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded hover:bg-slate-800"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 7: DATA EXPORTS */}
      {activeTab === 'exports' && currentEvent && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div>
            <h3 className="text-xs font-semibold text-white">Full Operations Data Export Suite</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Instantly export complete, verified CSV records for institutional reporting and archives.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-white text-xs">Registered Attendees List</h4>
                <p className="text-[11px] text-slate-400">Complete bookings, contact details, teams</p>
              </div>
              <button
                onClick={() => exportAttendeesCsv(currentEvent, registrations)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 rounded-lg hover:bg-emerald-900/50"
              >
                <Download className="w-3.5 h-3.5" /> CSV
              </button>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-white text-xs">Session Attendance Matrix</h4>
                <p className="text-[11px] text-slate-400">Block-by-block presence matrix & percentages</p>
              </div>
              <button
                onClick={() =>
                  exportSessionAttendanceMatrixCsv(currentEvent, registrations, blocks, records)
                }
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 rounded-lg hover:bg-emerald-900/50"
              >
                <Download className="w-3.5 h-3.5" /> CSV
              </button>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-white text-xs">Issued Certificates Record</h4>
                <p className="text-[11px] text-slate-400">Certificate IDs, verification links, criteria</p>
              </div>
              <button
                onClick={() => exportCertificatesCsv(currentEvent, certificates)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 rounded-lg hover:bg-emerald-900/50"
              >
                <Download className="w-3.5 h-3.5" /> CSV
              </button>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-white text-xs">Full Audit Log Trail</h4>
                <p className="text-[11px] text-slate-400">Chronological cryptographic activity logs</p>
              </div>
              <button
                onClick={async () => {
                  const logs = await fetchAuditLogsForEvent(currentEvent.id);
                  exportAuditLogsCsv(currentEvent, logs);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 rounded-lg hover:bg-emerald-900/50"
              >
                <Download className="w-3.5 h-3.5" /> CSV
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 8: SETTINGS & STATUS */}
      {activeTab === 'settings' && currentEvent && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div>
            <h3 className="text-xs font-semibold text-white">Event Lifecycle Management</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Transition event state across the operational lifecycle.
            </p>
          </div>

          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
            <span className="text-xs font-medium text-slate-300 block">Change Lifecycle State:</span>
            <div className="flex flex-wrap gap-2">
              {(
                ['DRAFT', 'PUBLISHED', 'REGISTRATION_OPEN', 'ONGOING', 'COMPLETED', 'CANCELLED'] as const
              ).map((st) => (
                <button
                  key={st}
                  onClick={() => handleStatusChange(st)}
                  className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                    currentEvent.publishedStatus === st
                      ? 'bg-emerald-400 text-slate-950 shadow-xs'
                      : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ASSIGN STAFF MODAL */}
      <Modal
        isOpen={showAddStaffModal}
        onClose={() => setShowAddStaffModal(false)}
        title="Assign Staff Member"
        subtitle={`Event: ${currentEvent?.name}`}
        maxWidth="md"
      >
        <form onSubmit={handleAddStaffSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 mb-1">Staff Member Name *</label>
            <input
              type="text"
              required
              value={newStaffName}
              onChange={(e) => setNewStaffName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-white"
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-1">Email Address *</label>
            <input
              type="email"
              required
              value={newStaffEmail}
              onChange={(e) => setNewStaffEmail(e.target.value)}
              placeholder="rahul@easybook.platform"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-white"
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-1">Assigned Operational Role</label>
            <select
              value={newStaffRole}
              onChange={(e) => setNewStaffRole(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-white"
            >
              <option value="CHECK_IN_STAFF">CHECK_IN_STAFF (QR scanning & re-entry)</option>
              <option value="ATTENDANCE_MANAGER">ATTENDANCE_MANAGER (Blocks & Mass Attendance)</option>
              <option value="REGISTRATION_STAFF">REGISTRATION_STAFF (Review & approvals)</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddStaffModal(false)}
              className="px-3 py-1.5 text-slate-400 bg-slate-800 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded"
            >
              Assign Role
            </button>
          </div>
        </form>
      </Modal>

      {/* SEND COMM MODAL */}
      <Modal
        isOpen={showSendCommModal}
        onClose={() => setShowSendCommModal(false)}
        title="Compose Official Communication"
        subtitle={`Event: ${currentEvent?.name}`}
        maxWidth="lg"
      >
        <form onSubmit={handleSendCommSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 mb-1">Message Type</label>
            <select
              value={commType}
              onChange={(e) => setCommType(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-white"
            >
              <option value="SESSION_ANNOUNCEMENT">SESSION_ANNOUNCEMENT</option>
              <option value="REGISTRATION_CONFIRMATION">REGISTRATION_CONFIRMATION</option>
              <option value="REMINDER">REMINDER</option>
              <option value="CERTIFICATE_NOTIFICATION">CERTIFICATE_NOTIFICATION</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 mb-1">Subject Header *</label>
            <input
              type="text"
              required
              value={commSubject}
              onChange={(e) => setCommSubject(e.target.value)}
              placeholder="e.g. Session 3 Prototype Demo Commencing at Main Hall"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-white"
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-1">Message Content *</label>
            <textarea
              rows={4}
              required
              value={commContent}
              onChange={(e) => setCommContent(e.target.value)}
              placeholder="Enter operational directive, room location, or certificate instructions..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowSendCommModal(false)}
              className="px-3 py-1.5 text-slate-400 bg-slate-800 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded"
            >
              Send & Log
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
