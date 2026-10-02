import React, { useState, useEffect } from 'react';
import {
  QrCode,
  Calendar,
  MapPin,
  Users,
  Award,
  Download,
  Share2,
  CheckCircle2,
  Clock,
  Printer,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Registration, EventItem } from '../../types';
import { generateQRDataUrl } from '../../utils/qr';
import { Badge } from '../common/Badge';
import { formatDate } from '../../utils/formatters';

interface DigitalPassModalProps {
  isOpen: boolean;
  onClose: () => void;
  registration: Registration | null;
  event: EventItem | null;
  onOpenCertificate?: () => void;
}

export const DigitalPassModal: React.FC<DigitalPassModalProps> = ({
  isOpen,
  onClose,
  registration,
  event,
  onOpenCertificate,
}) => {
  const [qrUrl, setQrUrl] = useState<string>('');

  useEffect(() => {
    if (registration && isOpen) {
      generateQRDataUrl(registration.qrPayload).then((url) => setQrUrl(url));
    }
  }, [registration, isOpen]);

  if (!registration || !event) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Official Digital Event Pass"
      subtitle={`Booking Credential: ${registration.bookingId}`}
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Pass Card */}
        <div className="relative bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-emerald-500/40 rounded-2xl p-6 shadow-2xl overflow-hidden text-center">
          {/* Top Notch Decorative line */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600" />

          {/* Org & Brand */}
          <div className="flex items-center justify-between text-left text-xs mb-3 pb-3 border-b border-slate-800">
            <div>
              <p className="font-mono text-[10px] text-emerald-400 font-semibold tracking-wider uppercase">
                {event.organizationName}
              </p>
              <p className="text-white font-bold text-sm tracking-tight">{event.name}</p>
            </div>
            <div className="shrink-0 text-right">
              <Badge status={registration.physicalStatus} />
            </div>
          </div>

          {/* QR Code Container */}
          <div className="my-4 flex flex-col items-center justify-center">
            <div className="p-3 bg-white rounded-xl shadow-lg border border-slate-300">
              {qrUrl ? (
                <img
                  src={qrUrl}
                  alt="Pass QR Code"
                  className="w-48 h-48 object-contain"
                />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center text-slate-800 font-mono text-xs">
                  Generating Pass...
                </div>
              )}
            </div>
            <p className="mt-2 font-mono text-[11px] text-slate-400 tracking-wider">
              {registration.bookingId}
            </p>
            <p className="text-[10px] text-slate-500">Scan at entrance checkpoints</p>
          </div>

          {/* Participant Info */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 text-left space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Participant</span>
              <span className="text-white font-semibold">{registration.attendeeName}</span>
            </div>

            {registration.isTeam && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Team</span>
                <span className="text-emerald-300 font-medium">
                  {registration.teamName} {registration.isTeamLeader ? '(Leader)' : ''}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Ticket Tier</span>
              <span className="text-slate-200">{registration.ticketName}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Registration Status</span>
              <Badge status={registration.status} />
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>{formatDate(event.date)}</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                <span className="truncate max-w-[140px]">{event.venue}</span>
              </div>
            </div>
          </div>

          {/* Check-in Activity Status Note */}
          <div className="mt-3 p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Physical Presence:</span>
            </span>
            <span className="font-medium text-slate-200">
              {registration.physicalStatus === 'CHECKED_IN'
                ? `Checked in at ${registration.checkedInAt?.slice(11, 16) || 'Venue'}`
                : registration.physicalStatus === 'CHECKED_OUT'
                ? `Temporarily checked out`
                : registration.physicalStatus === 'RE_ENTERED'
                ? `Re-entry verified`
                : 'Not Yet Admitted'}
            </span>
          </div>
        </div>

        {/* Certificate Eligibility banner if applicable */}
        {registration.certificateIssued && onOpenCertificate && (
          <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-400" />
              <div>
                <p className="font-semibold text-emerald-300">Verified E-Certificate Available</p>
                <p className="text-[10px] text-slate-400">Session attendance requirements verified.</p>
              </div>
            </div>
            <button
              onClick={onOpenCertificate}
              className="px-2.5 py-1 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded transition-colors"
            >
              View Certificate
            </button>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 rounded-lg transition-colors"
          >
            <Printer className="w-3.5 h-3.5" /> Print / Save Pass
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-400 hover:text-white"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};
