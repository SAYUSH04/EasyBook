import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Calendar,
  MapPin,
  Ticket,
  Clock,
  Award,
  Layers,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { EventItem, TicketType } from '../../types';
import { createEvent } from '../../services/eventService';
import { createTicket } from '../../services/bookingService';
import { createAttendanceBlock } from '../../services/attendanceService';
import { useAuth } from '../../context/AuthContext';

interface EventWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEventCreated: (event: EventItem) => void;
}

export const EventWizardModal: React.FC<EventWizardModalProps> = ({
  isOpen,
  onClose,
  onEventCreated,
}) => {
  const { currentUser, currentOrg } = useAuth();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Form State
  const [name, setName] = useState('NextGen Hackathon & Maker Expo 2026');
  const [description, setDescription] = useState(
    'A 24-hour hands-on prototyping event bringing together designers, builders, and engineers to build solutions for real-world civic and industrial challenges.'
  );
  const [category, setCategory] = useState('Hackathon & Competitions');
  const [banner, setBanner] = useState(
    'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1600&q=80'
  );

  const [date, setDate] = useState('2026-11-20');
  const [startTime, setStartTime] = useState('09:00 AM');
  const [endTime, setEndTime] = useState('06:00 PM');
  const [timezone, setTimezone] = useState('Asia/Kolkata (IST)');
  const [venue, setVenue] = useState('Main Campus Innovation Center');
  const [location, setLocation] = useState('Bangalore, India');
  const [eventMode, setEventMode] = useState<'IN_PERSON' | 'ONLINE' | 'HYBRID'>('IN_PERSON');

  const [capacity, setCapacity] = useState<number>(200);
  const [registrationDeadline, setRegistrationDeadline] = useState('2026-11-18T23:59');
  const [approvalRequired, setApprovalRequired] = useState(true);
  const [waitlistEnabled, setWaitlistEnabled] = useState(true);
  const [isTeamEvent, setIsTeamEvent] = useState(true);
  const [minTeamSize, setMinTeamSize] = useState(2);
  const [maxTeamSize, setMaxTeamSize] = useState(4);

  // Tickets
  const [ticketName, setTicketName] = useState('Standard Team Registration Pass');
  const [ticketPrice, setTicketPrice] = useState<number>(0); // Commission-free 0 INR
  const [ticketCapacity, setTicketCapacity] = useState<number>(50);

  // Attendance Blocks
  const [blocks, setBlocks] = useState<Array<{ title: string; startTime: string; endTime: string }>>([
    { title: 'Block 1: Check-in & Keynote', startTime: '09:00 AM', endTime: '10:30 AM' },
    { title: 'Block 2: Mentor Review & Architecture', startTime: '11:30 AM', endTime: '02:00 PM' },
    { title: 'Block 3: Prototype Demo & Pitch', startTime: '03:00 PM', endTime: '05:30 PM' },
  ]);

  // Certificate Settings
  const [certEnabled, setCertEnabled] = useState(true);
  const [certTitle, setCertTitle] = useState('Certificate of Participation & Technical Achievement');
  const [certType, setCertType] = useState<'PARTICIPATION' | 'COMPLETION' | 'WINNER'>('COMPLETION');
  const [certIssuer, setCertIssuer] = useState(currentUser?.name || 'Sayush Sunesh');
  const [certDesignation, setCertDesignation] = useState('Lead Convener & Operations Head');
  const [certCriteriaRule, setCertCriteriaRule] = useState<'MIN_SESSIONS' | 'PERCENTAGE'>('MIN_SESSIONS');
  const [minSessions, setMinSessions] = useState(2);
  const [minPercentage, setMinPercentage] = useState(75);

  const addBlock = () => {
    setBlocks([
      ...blocks,
      {
        title: `Block ${blocks.length + 1}: Checkpoint Session`,
        startTime: '02:00 PM',
        endTime: '04:00 PM',
      },
    ]);
  };

  const removeBlock = (idx: number) => {
    setBlocks(blocks.filter((_, i) => i !== idx));
  };

  const updateBlock = (idx: number, field: string, val: string) => {
    const next = [...blocks];
    next[idx] = { ...next[idx], [field]: val };
    setBlocks(next);
  };

  // Readiness Checklist checks
  const checks = [
    { label: 'Event Details & Scope Defined', valid: !!name && !!description },
    { label: 'High-Resolution Banner URL Provided', valid: !!banner },
    { label: 'Venue and Schedule Configured', valid: !!date && !!venue },
    { label: 'Registration Capacity & Rules Set', valid: capacity > 0 },
    { label: 'Commission-Free Ticket Configured', valid: !!ticketName && ticketCapacity > 0 },
    { label: 'Session Attendance Blocks Configured', valid: blocks.length >= 1 },
    { label: 'Verifiable E-Certificate Rules Defined', valid: !certEnabled || (!!certTitle && !!certIssuer) },
  ];

  const allPassed = checks.every((c) => c.valid);

  const handleFinish = async (publishImmediately: boolean) => {
    if (!name) return;
    setSubmitting(true);
    try {
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');

      const newEvt = await createEvent({
        organizerId: currentUser?.id || 'user_sayush_org',
        organizationId: currentOrg?.id,
        organizationName: currentOrg?.name || 'EasyBook Verified Hub',
        name,
        slug,
        description,
        banner,
        category,
        date,
        startTime,
        endTime,
        timezone,
        venue,
        location,
        eventMode,
        capacity,
        publishedStatus: publishImmediately ? 'PUBLISHED' : 'DRAFT',
        isTeamEvent,
        minTeamSize: isTeamEvent ? minTeamSize : undefined,
        maxTeamSize: isTeamEvent ? maxTeamSize : undefined,
        registrationDeadline,
        approvalRequired,
        waitlistEnabled,
        customFormFields: [
          { id: 'f_dept', label: 'Department / Major', type: 'text', required: true },
          { id: 'f_college', label: 'College / Organization Name', type: 'text', required: true },
          { id: 'f_github', label: 'Project / GitHub Link', type: 'text', required: false },
        ],
        certificateSettings: {
          enabled: certEnabled,
          title: certTitle,
          type: certType,
          issuerName: certIssuer,
          issuerDesignation: certDesignation,
          organizationName: currentOrg?.name || 'EasyBook Verified Hub',
          criteria: {
            rule: certCriteriaRule,
            minSessions: certCriteriaRule === 'MIN_SESSIONS' ? minSessions : undefined,
            minPercentage: certCriteriaRule === 'PERCENTAGE' ? minPercentage : undefined,
          },
        },
        attendanceSettings: {
          allowReentry: true,
          strictBlockTiming: false,
          allowManualOverride: true,
        },
      });

      // Create Initial Ticket
      await createTicket({
        eventId: newEvt.id,
        name: ticketName,
        description: 'General pass with 100% direct revenue (₹0 EasyBook commission)',
        price: ticketPrice,
        capacity: ticketCapacity,
        saleStart: new Date().toISOString(),
        saleEnd: registrationDeadline,
        active: true,
      });

      // Create Attendance Blocks
      for (const b of blocks) {
        await createAttendanceBlock(
          newEvt.id,
          b.title,
          b.startTime,
          b.endTime,
          {
            id: currentUser?.id || 'user_sayush_org',
            name: currentUser?.name || 'Sayush Sunesh',
            role: 'ORGANIZER',
          }
        );
      }

      onEventCreated(newEvt);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Event — Operations Wizard"
      subtitle={`Step ${currentStep} of 7 • Multi-Session Lifecycle Builder`}
      maxWidth="2xl"
    >
      {/* Wizard Progress Stepper */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800 text-[11px] overflow-x-auto gap-2">
        {[
          { num: 1, label: 'Basics' },
          { num: 2, label: 'Schedule' },
          { num: 3, label: 'Registration' },
          { num: 4, label: 'Tickets' },
          { num: 5, label: 'Sessions' },
          { num: 6, label: 'Certificates' },
          { num: 7, label: 'Checklist' },
        ].map((s) => (
          <button
            key={s.num}
            onClick={() => setCurrentStep(s.num)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors shrink-0 ${
              currentStep === s.num
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-700 font-semibold'
                : currentStep > s.num
                ? 'text-slate-300 hover:text-white'
                : 'text-slate-500'
            }`}
          >
            <span
              className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                currentStep === s.num
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : currentStep > s.num
                  ? 'bg-slate-700 text-slate-200'
                  : 'bg-slate-800 text-slate-500'
              }`}
            >
              {s.num}
            </span>
            <span>{s.label}</span>
          </button>
        ))}
      </div>

      {/* STEP 1: BASICS */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Event Name <span className="text-emerald-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-emerald-500"
              placeholder="e.g. Smart India Hackathon Regional Prelims"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="Hackathon & Competitions">Hackathon & Competitions</option>
              <option value="Engineering & Tech Conference">Engineering & Tech Conference</option>
              <option value="Workshop & Hands-On Lab">Workshop & Hands-On Lab</option>
              <option value="Research & AI">Research & AI</option>
              <option value="Cultural & Fest">Cultural & Fest</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Banner Image URL</label>
            <input
              type="text"
              value={banner}
              onChange={(e) => setBanner(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-emerald-500"
            />
            {banner && (
              <img
                src={banner}
                alt="preview"
                className="mt-2 w-full h-28 object-cover rounded-lg border border-slate-800"
              />
            )}
          </div>
        </div>
      )}

      {/* STEP 2: SCHEDULE & LOCATION */}
      {currentStep === 2 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Event Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Event Mode</label>
              <select
                value={eventMode}
                onChange={(e) => setEventMode(e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="IN_PERSON">In-Person</option>
                <option value="HYBRID">Hybrid</option>
                <option value="ONLINE">Online</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Start Time</label>
              <input
                type="text"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">End Time</label>
              <input
                type="text"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Venue / Auditorium</label>
            <input
              type="text"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-emerald-500"
              placeholder="Auditorium Complex or Hall name"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">City / Region</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
      )}

      {/* STEP 3: REGISTRATION CONFIGURATION */}
      {currentStep === 3 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Total Capacity</label>
              <input
                type="number"
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Deadline</label>
              <input
                type="datetime-local"
                value={registrationDeadline}
                onChange={(e) => setRegistrationDeadline(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Team configuration toggle */}
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs font-medium text-white">Enable Team / Group Registrations</span>
              <input
                type="checkbox"
                checked={isTeamEvent}
                onChange={(e) => setIsTeamEvent(e.target.checked)}
                className="rounded accent-emerald-500"
              />
            </label>
            {isTeamEvent && (
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Min Team Members</label>
                  <input
                    type="number"
                    min={1}
                    value={minTeamSize}
                    onChange={(e) => setMinTeamSize(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Max Team Members</label>
                  <input
                    type="number"
                    min={minTeamSize}
                    value={maxTeamSize}
                    onChange={(e) => setMaxTeamSize(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded text-white"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2 p-3 bg-slate-950 border border-slate-800 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={approvalRequired}
                onChange={(e) => setApprovalRequired(e.target.checked)}
                className="rounded accent-emerald-500"
              />
              <div>
                <p className="text-xs font-medium text-white">Require Manual Approval</p>
                <p className="text-[10px] text-slate-400">Applications start as PENDING</p>
              </div>
            </label>

            <label className="flex items-center gap-2 p-3 bg-slate-950 border border-slate-800 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={waitlistEnabled}
                onChange={(e) => setWaitlistEnabled(e.target.checked)}
                className="rounded accent-emerald-500"
              />
              <div>
                <p className="text-xs font-medium text-white">Automated Waitlist</p>
                <p className="text-[10px] text-slate-400">Promotes when slots open</p>
              </div>
            </label>
          </div>
        </div>
      )}

      {/* STEP 4: TICKETS */}
      {currentStep === 4 && (
        <div className="space-y-4">
          <div className="p-3 bg-emerald-950/20 border border-emerald-800/40 rounded-lg text-xs text-emerald-300">
            <p className="font-semibold">EasyBook 0% Commission Policy</p>
            <p className="text-[11px] text-emerald-400/80 mt-0.5">
              100% of the ticket price goes directly to your organization. Free events have ₹0 cost.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Ticket Tier Name</label>
            <input
              type="text"
              value={ticketName}
              onChange={(e) => setTicketName(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Price (INR ₹)
              </label>
              <input
                type="number"
                min={0}
                value={ticketPrice}
                onChange={(e) => setTicketPrice(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-emerald-500"
              />
              <span className="text-[10px] text-slate-500">Set 0 for free community pass</span>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Allocation Capacity</label>
              <input
                type="number"
                min={1}
                value={ticketCapacity}
                onChange={(e) => setTicketCapacity(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* STEP 5: DYNAMIC ATTENDANCE BLOCKS */}
      {currentStep === 5 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-semibold text-white">Dynamic Attendance Blocks</h4>
              <p className="text-[11px] text-slate-400">
                Attendance is session-aware. Scans record into the active block.
              </p>
            </div>
            <button
              onClick={addBlock}
              className="flex items-center gap-1 px-2.5 py-1 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 rounded hover:bg-emerald-900/50"
            >
              <Plus className="w-3 h-3" /> Add Block
            </button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {blocks.map((b, idx) => (
              <div
                key={idx}
                className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center gap-3 text-xs"
              >
                <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-[10px] font-mono shrink-0">
                  {idx + 1}
                </span>
                <input
                  type="text"
                  value={b.title}
                  onChange={(e) => updateBlock(idx, 'title', e.target.value)}
                  className="flex-1 px-2.5 py-1 text-xs bg-slate-900 border border-slate-800 rounded text-white"
                  placeholder="Block Title"
                />
                <input
                  type="text"
                  value={b.startTime}
                  onChange={(e) => updateBlock(idx, 'startTime', e.target.value)}
                  className="w-24 px-2 py-1 text-xs bg-slate-900 border border-slate-800 rounded text-white"
                  placeholder="09:00 AM"
                />
                <input
                  type="text"
                  value={b.endTime}
                  onChange={(e) => updateBlock(idx, 'endTime', e.target.value)}
                  className="w-24 px-2 py-1 text-xs bg-slate-900 border border-slate-800 rounded text-white"
                  placeholder="10:30 AM"
                />
                {blocks.length > 1 && (
                  <button
                    onClick={() => removeBlock(idx)}
                    className="p-1 text-slate-500 hover:text-rose-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 6: CERTIFICATE SETTINGS */}
      {currentStep === 6 && (
        <div className="space-y-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={certEnabled}
              onChange={(e) => setCertEnabled(e.target.checked)}
              className="rounded accent-emerald-500"
            />
            <span className="text-xs font-medium text-white">Enable Verifiable E-Certificates</span>
          </label>

          {certEnabled && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Certificate Title
                </label>
                <input
                  type="text"
                  value={certTitle}
                  onChange={(e) => setCertTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Certificate Type
                  </label>
                  <select
                    value={certType}
                    onChange={(e) => setCertType(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white"
                  >
                    <option value="COMPLETION">Completion</option>
                    <option value="PARTICIPATION">Participation</option>
                    <option value="WINNER">Winner / Merit</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Eligibility Rule
                  </label>
                  <select
                    value={certCriteriaRule}
                    onChange={(e) => setCertCriteriaRule(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white"
                  >
                    <option value="MIN_SESSIONS">Minimum Sessions Attended</option>
                    <option value="PERCENTAGE">Minimum Attendance Percentage (%)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Signatory / Issuer Name
                  </label>
                  <input
                    type="text"
                    value={certIssuer}
                    onChange={(e) => setCertIssuer(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Signatory Designation
                  </label>
                  <input
                    type="text"
                    value={certDesignation}
                    onChange={(e) => setCertDesignation(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* STEP 7: READINESS CHECKLIST */}
      {currentStep === 7 && (
        <div className="space-y-4">
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
            <h4 className="text-xs font-semibold text-white mb-2">Event Pre-Flight Readiness Checklist</h4>
            <div className="space-y-2">
              {checks.map((c, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1">
                  <span className="text-slate-300">{c.label}</span>
                  {c.valid ? (
                    <span className="flex items-center gap-1 text-emerald-400 font-medium text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-amber-400 font-medium text-[11px]">
                      <AlertTriangle className="w-3.5 h-3.5" /> Needs Attention
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-xs space-y-1">
            <p className="text-slate-300">
              <span className="text-slate-500">Event:</span> {name}
            </p>
            <p className="text-slate-300">
              <span className="text-slate-500">Venue:</span> {venue}, {location} ({date})
            </p>
            <p className="text-slate-300">
              <span className="text-slate-500">Attendance Blocks:</span> {blocks.length} sessions defined
            </p>
            <p className="text-slate-300">
              <span className="text-slate-500">Ticket:</span> {ticketName} (₹{ticketPrice})
            </p>
          </div>
        </div>
      )}

      {/* Wizard Footer Controls */}
      <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
        {currentStep > 1 ? (
          <button
            onClick={() => setCurrentStep(currentStep - 1)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 rounded-lg"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Previous
          </button>
        ) : (
          <div />
        )}

        {currentStep < 7 ? (
          <button
            onClick={() => setCurrentStep(currentStep + 1)}
            className="flex items-center gap-1 px-4 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors"
          >
            Continue <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleFinish(false)}
              disabled={submitting}
              className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 rounded-lg"
            >
              Save as Draft
            </button>
            <button
              onClick={() => handleFinish(true)}
              disabled={submitting || !allPassed}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-40 rounded-lg transition-colors shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {submitting ? 'Publishing...' : 'Publish Event Live'}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};
