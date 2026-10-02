import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Search,
  Layers,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Users,
  Award,
  ArrowRight,
} from 'lucide-react';
import { EventItem, Registration } from '../../types';
import { fetchAllEvents } from '../../services/eventService';
import { EventCard } from '../../components/events/EventCard';
import { RegistrationModal } from '../../components/registration/RegistrationModal';
import { DigitalPassModal } from '../../components/registration/DigitalPassModal';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { formatDate } from '../../utils/formatters';

interface EventDiscoveryViewProps {
  onOpenWorkspace: () => void;
  onOpenPasses: () => void;
  onOpenCreateWizard: () => void;
}

export const EventDiscoveryView: React.FC<EventDiscoveryViewProps> = ({
  onOpenWorkspace,
  onOpenPasses,
  onOpenCreateWizard,
}) => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Selected event for registration
  const [registeringEvent, setRegisteringEvent] = useState<EventItem | null>(null);
  // Selected event for detail view
  const [viewingEvent, setViewingEvent] = useState<EventItem | null>(null);

  // Recently issued pass to display after registration
  const [issuedPass, setIssuedPass] = useState<{
    reg: Registration;
    event: EventItem;
  } | null>(null);

  useEffect(() => {
    fetchAllEvents().then((evts) => {
      setEvents(evts);
      setLoading(false);
    });
  }, []);

  const categories = Array.from(new Set(events.map((e) => e.category)));

  const filteredEvents = events.filter((e) => {
    const matchesQuery =
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.venue.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'ALL' || e.category === categoryFilter;
    return matchesQuery && matchesCategory;
  });

  return (
    <div className="space-y-10 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-slate-800/80 bg-gradient-to-b from-slate-900/60 via-slate-950 to-slate-950 pt-12 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/50 text-emerald-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Full-Lifecycle Event Operations Platform</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
              An event is not just a booking. <br />
              <span className="text-emerald-400">It is an operational lifecycle.</span>
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
              EasyBook delivers session-aware dynamic attendance tracking, tamper-resistant QR badges, real drop-off retention intelligence, and verifiable e-certificates — with <strong>0% commission</strong> for organizers.
            </p>

            {/* Quick feature highlights */}
            <div className="flex flex-wrap gap-4 pt-3 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Session-Aware Dynamic Checkpoints</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Verifiable E-Certificates</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>Team & Individual Workflows</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Catalog Search & Filters */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
          {/* Search bar */}
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search hackathons, summits, workshops, or venues..."
              className="w-full pl-9 pr-4 py-2.5 text-xs bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Category Filter chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1">
            <button
              onClick={() => setCategoryFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                categoryFilter === 'ALL'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60 font-semibold'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              All Events
            </button>
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategoryFilter(c)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                  categoryFilter === c
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60 font-semibold'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Events Grid */}
        {loading ? (
          <div className="py-20 text-center text-xs text-slate-500">
            Loading active operational events...
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="py-20 text-center bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl">
            <Calendar className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-slate-300">No matching events found</h3>
            <p className="text-xs text-slate-500 mt-1">Try refining your search keyword or category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((evt) => (
              <EventCard
                key={evt.id}
                event={evt}
                onSelect={(selected) => setViewingEvent(selected)}
                onRegister={(selected) => setRegisteringEvent(selected)}
              />
            ))}
          </div>
        )}
      </section>

      {/* EVENT DETAIL MODAL */}
      {viewingEvent && (
        <Modal
          isOpen={!!viewingEvent}
          onClose={() => setViewingEvent(null)}
          title={viewingEvent.name}
          subtitle={`Organized by ${viewingEvent.organizationName}`}
          maxWidth="2xl"
        >
          <div className="space-y-4 text-xs text-slate-300">
            <div className="h-48 w-full overflow-hidden rounded-xl border border-slate-800">
              <img
                src={viewingEvent.banner}
                alt={viewingEvent.name}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge status={viewingEvent.publishedStatus} />
              <span className="px-2 py-0.5 bg-slate-800 rounded text-slate-200">
                {viewingEvent.eventMode}
              </span>
              <span className="text-emerald-400 font-mono">
                {viewingEvent.registeredCount} / {viewingEvent.capacity} Spots Filled
              </span>
            </div>

            <p className="text-slate-300 leading-relaxed">{viewingEvent.description}</p>

            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950 border border-slate-800 rounded-xl">
              <div>
                <span className="text-slate-500 block text-[11px]">Schedule & Time</span>
                <span className="font-semibold text-white">
                  {formatDate(viewingEvent.date)} • {viewingEvent.startTime} - {viewingEvent.endTime}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Venue & City</span>
                <span className="font-semibold text-white">
                  {viewingEvent.venue}, {viewingEvent.location}
                </span>
              </div>
            </div>

            {/* Attendance & Certificate Rules overview */}
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                <Award className="w-4 h-4" />
                <span>Certificate & Session Attendance Policy</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Requires session verification across active blocks. Verifiable e-certificate automatically generated upon meeting completion threshold.
              </p>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <button
                onClick={() => setViewingEvent(null)}
                className="px-4 py-2 text-slate-400 hover:text-white"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const toReg = viewingEvent;
                  setViewingEvent(null);
                  setRegisteringEvent(toReg);
                }}
                className="flex items-center gap-1.5 px-4 py-2 font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg shadow-xs"
              >
                Register for Event
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* REGISTRATION MODAL */}
      {registeringEvent && (
        <RegistrationModal
          isOpen={!!registeringEvent}
          onClose={() => setRegisteringEvent(null)}
          event={registeringEvent}
          onSuccess={(reg) => {
            setIssuedPass({ reg, event: registeringEvent });
            // Refresh list count
            fetchAllEvents().then((evts) => setEvents(evts));
          }}
        />
      )}

      {/* DIGITAL PASS MODAL (Shown immediately upon registration) */}
      {issuedPass && (
        <DigitalPassModal
          isOpen={!!issuedPass}
          onClose={() => setIssuedPass(null)}
          registration={issuedPass.reg}
          event={issuedPass.event}
          onOpenCertificate={onOpenPasses}
        />
      )}
    </div>
  );
};
