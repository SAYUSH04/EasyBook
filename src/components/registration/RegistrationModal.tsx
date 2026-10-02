import React, { useState, useEffect } from 'react';
import {
  Users,
  Ticket,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { EventItem, TicketType, Registration } from '../../types';
import { fetchTicketsForEvent, submitRegistration } from '../../services/bookingService';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency } from '../../utils/formatters';

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: EventItem | null;
  onSuccess: (registration: Registration) => void;
}

export const RegistrationModal: React.FC<RegistrationModalProps> = ({
  isOpen,
  onClose,
  event,
  onSuccess,
}) => {
  const { currentUser } = useAuth();
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string>('');
  const [loadingTickets, setLoadingTickets] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState(currentUser?.name || 'Aditya Verma');
  const [email, setEmail] = useState(currentUser?.email || 'aditya.verma@student.edu');
  const [phone, setPhone] = useState(currentUser?.phone || '+91 94471 23456');
  const [department, setDepartment] = useState(currentUser?.department || 'Computer Science');
  const [college, setCollege] = useState(currentUser?.college || 'National Institute of Tech');

  // Team fields
  const [teamName, setTeamName] = useState('Nexus Innovations');
  const [teamMembers, setTeamMembers] = useState<Array<{ name: string; email: string; phone?: string }>>([
    { name: currentUser?.name || 'Aditya Verma', email: currentUser?.email || 'aditya.verma@student.edu', phone: '+91 94471 23456' },
    { name: 'Pooja Sharma', email: 'pooja.s@nit.edu', phone: '+91 98822 33441' },
  ]);

  // Custom fields answers
  const [customAnswers, setCustomAnswers] = useState<Record<string, any>>({});

  useEffect(() => {
    if (event && isOpen) {
      setLoadingTickets(true);
      fetchTicketsForEvent(event.id)
        .then((t) => {
          setTickets(t);
          if (t.length > 0) setSelectedTicketId(t[0].id);
        })
        .finally(() => setLoadingTickets(false));

      // Reset errors
      setErrorMsg(null);
    }
  }, [event, isOpen]);

  if (!event) return null;

  const selectedTicket = tickets.find((t) => t.id === selectedTicketId) || tickets[0];

  const addTeamMember = () => {
    if (event.maxTeamSize && teamMembers.length >= event.maxTeamSize) return;
    setTeamMembers([...teamMembers, { name: '', email: '', phone: '' }]);
  };

  const removeTeamMember = (idx: number) => {
    if (teamMembers.length <= (event.minTeamSize || 1)) return;
    setTeamMembers(teamMembers.filter((_, i) => i !== idx));
  };

  const updateMember = (idx: number, field: string, value: string) => {
    const next = [...teamMembers];
    next[idx] = { ...next[idx], [field]: value };
    setTeamMembers(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) {
      setErrorMsg('Please fill in attendee name and email.');
      return;
    }

    if (event.isTeamEvent && !teamName) {
      setErrorMsg('Please enter your Team Name.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const reg = await submitRegistration({
        eventId: event.id,
        ticketId: selectedTicket?.id || 'tkt_default',
        ticketName: selectedTicket?.name || 'General Admission',
        pricePaid: selectedTicket?.price || 0,
        userId: currentUser?.id,
        attendeeName: name,
        attendeeEmail: email,
        attendeePhone: phone,
        attendeeDept: department,
        attendeeCollege: college,
        isTeam: event.isTeamEvent,
        teamName: event.isTeamEvent ? teamName : undefined,
        teamMembers: event.isTeamEvent ? teamMembers : undefined,
        customFieldsData: customAnswers,
        requiresApproval: event.approvalRequired,
      });

      onSuccess(reg);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit registration');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Register for ${event.name}`}
      subtitle="Commission-Free Ticket & Pass Issuance"
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5 text-xs text-slate-200">
        {errorMsg && (
          <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-lg text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 1. Ticket Selection */}
        <div>
          <label className="block text-xs font-semibold text-white mb-2">Select Ticket Tier</label>
          {loadingTickets ? (
            <div className="p-4 text-center text-slate-500 bg-slate-950 rounded-lg">
              Loading available ticket tiers...
            </div>
          ) : tickets.length === 0 ? (
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-400">
              Free Standard Admission (General Access)
            </div>
          ) : (
            <div className="space-y-2">
              {tickets.map((t) => (
                <label
                  key={t.id}
                  className={`flex items-start justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedTicketId === t.id
                      ? 'bg-emerald-950/40 border-emerald-500/70 text-white'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="ticketTier"
                      checked={selectedTicketId === t.id}
                      onChange={() => setSelectedTicketId(t.id)}
                      className="mt-0.5 accent-emerald-500"
                    />
                    <div>
                      <p className="font-semibold text-white text-xs">{t.name}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{t.description}</p>
                      {t.perks && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {t.perks.map((p, i) => (
                            <span
                              key={i}
                              className="px-1.5 py-0.5 bg-slate-800 text-[10px] text-slate-300 rounded"
                            >
                              ✓ {p}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono font-bold text-sm text-emerald-400">
                      {formatCurrency(t.price)}
                    </span>
                    <p className="text-[10px] text-slate-500">₹0 fee</p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* 2. Team Information if isTeamEvent */}
        {event.isTeamEvent && (
          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <h4 className="font-semibold text-white text-xs">Team Registration Details</h4>
              </div>
              <span className="text-[10px] text-slate-400">
                Size: {event.minTeamSize || 2} to {event.maxTeamSize || 4} members
              </span>
            </div>

            <div>
              <label className="block text-slate-300 mb-1">
                Team Name <span className="text-emerald-400">*</span>
              </label>
              <input
                type="text"
                required
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="e.g. CyberKnights"
                className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Team Members</span>
                {(!event.maxTeamSize || teamMembers.length < event.maxTeamSize) && (
                  <button
                    type="button"
                    onClick={addTeamMember}
                    className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300"
                  >
                    <Plus className="w-3 h-3" /> Add Member
                  </button>
                )}
              </div>

              {teamMembers.map((m, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-slate-500 w-4">{idx + 1}.</span>
                  <input
                    type="text"
                    required
                    placeholder="Member Name"
                    value={m.name}
                    onChange={(e) => updateMember(idx, 'name', e.target.value)}
                    className="flex-1 px-2.5 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded text-white"
                  />
                  <input
                    type="email"
                    required
                    placeholder="Email"
                    value={m.email}
                    onChange={(e) => updateMember(idx, 'email', e.target.value)}
                    className="flex-1 px-2.5 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded text-white"
                  />
                  {teamMembers.length > (event.minTeamSize || 1) && (
                    <button
                      type="button"
                      onClick={() => removeTeamMember(idx)}
                      className="p-1 text-slate-500 hover:text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. Primary Contact / Lead Details */}
        <div className="space-y-3">
          <h4 className="font-semibold text-white text-xs border-b border-slate-800 pb-1">
            {event.isTeamEvent ? 'Team Leader / Primary Contact' : 'Participant Details'}
          </h4>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-slate-300 mb-1">Email Address *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-300 mb-1">Phone *</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-slate-300 mb-1">Department</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-slate-300 mb-1">College / Organization</label>
              <input
                type="text"
                value={college}
                onChange={(e) => setCollege(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
              />
            </div>
          </div>
        </div>

        {/* 4. Custom Form Fields (configured by organizer) */}
        {event.customFormFields && event.customFormFields.length > 0 && (
          <div className="space-y-3 pt-2">
            <h4 className="font-semibold text-white text-xs border-b border-slate-800 pb-1">
              Event Specific Information
            </h4>
            {event.customFormFields.map((field) => (
              <div key={field.id}>
                <label className="block text-slate-300 mb-1">
                  {field.label} {field.required && <span className="text-emerald-400">*</span>}
                </label>

                {field.type === 'select' ? (
                  <select
                    required={field.required}
                    value={customAnswers[field.id] || ''}
                    onChange={(e) =>
                      setCustomAnswers({ ...customAnswers, [field.id]: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  >
                    <option value="">Select option</option>
                    {field.options?.map((opt, i) => (
                      <option key={i} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : field.type === 'checkbox' ? (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!customAnswers[field.id]}
                      onChange={(e) =>
                        setCustomAnswers({ ...customAnswers, [field.id]: e.target.checked })
                      }
                      className="rounded accent-emerald-500"
                    />
                    <span className="text-slate-300">Yes, check to confirm requirement</span>
                  </label>
                ) : (
                  <input
                    type={field.type === 'number' ? 'number' : 'text'}
                    required={field.required}
                    placeholder={field.placeholder || ''}
                    value={customAnswers[field.id] || ''}
                    onChange={(e) =>
                      setCustomAnswers({ ...customAnswers, [field.id]: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Bottom Banner note on Approval / Commission */}
        <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between text-slate-400 text-[11px]">
          <div>
            <p className="text-slate-200 font-medium">
              {event.approvalRequired
                ? 'Organizer Approval Required'
                : 'Instant Pass Issuance'}
            </p>
            <p className="text-[10px] text-slate-500">
              {event.approvalRequired
                ? 'Your registration will be submitted for organizer review.'
                : 'Digital Pass and QR code will be generated immediately.'}
            </p>
          </div>
          <span className="font-mono font-bold text-emerald-400 text-sm">
            Total: {formatCurrency(selectedTicket?.price || 0)}
          </span>
        </div>

        {/* Submit */}
        <div className="pt-2 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 rounded-lg transition-colors shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {submitting ? 'Processing Registration...' : 'Complete Registration'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
