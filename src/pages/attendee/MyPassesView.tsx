import React, { useState, useEffect } from 'react';
import {
  QrCode,
  Calendar,
  MapPin,
  Users,
  Award,
  Download,
  ExternalLink,
  ShieldCheck,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Registration, EventItem, CertificateRecord } from '../../types';
import { fetchRegistrationsForEvent } from '../../services/bookingService';
import { fetchAllEvents } from '../../services/eventService';
import { fetchCertificatesForEvent } from '../../services/certificateService';
import { generateCertificatePDF } from '../../utils/certificatePdf';
import { DigitalPassModal } from '../../components/registration/DigitalPassModal';
import { Badge } from '../../components/common/Badge';
import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../utils/formatters';
import confetti from 'canvas-confetti';

export const MyPassesView: React.FC<{ onExploreEvents: () => void }> = ({ onExploreEvents }) => {
  const { currentUser } = useAuth();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [eventsMap, setEventsMap] = useState<Record<string, EventItem>>({});
  const [certs, setCerts] = useState<CertificateRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Selected pass for modal
  const [activePass, setActivePass] = useState<{
    reg: Registration;
    event: EventItem;
  } | null>(null);

  useEffect(() => {
    async function loadAttendeeData() {
      setLoading(true);
      try {
        const allEvts = await fetchAllEvents();
        const map: Record<string, EventItem> = {};
        allEvts.forEach((e) => (map[e.id] = e));
        setEventsMap(map);

        // Fetch registrations across events
        const allRegs: Registration[] = [];
        const allCerts: CertificateRecord[] = [];

        for (const evt of allEvts) {
          const regs = await fetchRegistrationsForEvent(evt.id);
          const evtCerts = await fetchCertificatesForEvent(evt.id);
          allRegs.push(...regs);
          allCerts.push(...evtCerts);
        }

        // Filter for current user if applicable or show top attendee registrations
        const userRegs = allRegs.filter(
          (r) =>
            r.userId === currentUser?.id ||
            r.attendeeEmail.toLowerCase() === (currentUser?.email || '').toLowerCase() ||
            currentUser?.role === 'ATTENDEE'
        );

        setRegistrations(userRegs.length > 0 ? userRegs : allRegs.slice(0, 3));
        setCerts(allCerts);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    loadAttendeeData();
  }, [currentUser]);

  const handleDownloadCert = async (cert: CertificateRecord) => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });
    await generateCertificatePDF(cert);
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <QrCode className="w-5 h-5 text-emerald-400" />
            My Event Passes & Credentials
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Access your entry QR passes, track session attendance checkpoints, and download verifiable certificates.
          </p>
        </div>

        <button
          onClick={onExploreEvents}
          className="px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors"
        >
          Explore More Events
        </button>
      </div>

      {/* Registrations List */}
      {loading ? (
        <div className="py-16 text-center text-xs text-slate-500">
          Loading your active passes and credentials...
        </div>
      ) : registrations.length === 0 ? (
        <div className="py-16 text-center bg-slate-900 border border-dashed border-slate-800 rounded-xl my-6">
          <QrCode className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-300">No Passes Registered Yet</h3>
          <p className="text-xs text-slate-500 mt-1">Explore our catalog to register for upcoming events.</p>
          <button
            onClick={onExploreEvents}
            className="mt-4 px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg"
          >
            Find Events
          </button>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {registrations.map((reg) => {
            const evt = eventsMap[reg.eventId];
            const issuedCert = certs.find((c) => c.registrationId === reg.id && c.status === 'VALID');

            return (
              <div
                key={reg.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                {/* Event info */}
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge status={reg.status} />
                    <Badge status={reg.physicalStatus} />
                    <span className="font-mono text-[10px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      {reg.bookingId}
                    </span>
                    {reg.isTeam && (
                      <span className="text-[11px] text-emerald-300 font-medium bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/50 flex items-center gap-1">
                        <Users className="w-3 h-3" /> Team: {reg.teamName}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-semibold text-white">
                    {evt?.name || 'Smart India Hackathon 2026'}
                  </h3>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      {formatDate(evt?.date)}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      {evt?.venue || 'Campus Auditorium'}
                    </span>
                    <span className="text-slate-300 font-medium">Ticket: {reg.ticketName}</span>
                  </div>
                </div>

                {/* Right Actions: Show QR Pass & Certificate */}
                <div className="flex flex-wrap items-center gap-2 shrink-0 w-full md:w-auto justify-end">
                  <button
                    onClick={() => setActivePass({ reg, event: evt })}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
                  >
                    <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                    Open Digital Pass
                  </button>

                  {issuedCert && (
                    <button
                      onClick={() => handleDownloadCert(issuedCert)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors shadow-xs"
                    >
                      <Award className="w-3.5 h-3.5" />
                      Download E-Certificate
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Digital Pass Modal */}
      {activePass && (
        <DigitalPassModal
          isOpen={!!activePass}
          onClose={() => setActivePass(null)}
          registration={activePass.reg}
          event={activePass.event}
          onOpenCertificate={() => {
            const cert = certs.find((c) => c.registrationId === activePass.reg.id);
            if (cert) handleDownloadCert(cert);
          }}
        />
      )}
    </div>
  );
};
