import React, { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  Download,
  Calendar,
  User,
  CheckCircle2,
  Award,
  Layers,
  AlertTriangle,
} from 'lucide-react';
import { CertificateRecord } from '../../types';
import { verifyCertificate, revokeCertificate } from '../../services/certificateService';
import { generateCertificatePDF } from '../../utils/certificatePdf';
import { useAuth } from '../../context/AuthContext';
import { formatDate, formatDateTime } from '../../utils/formatters';

export const CertificateVerificationView: React.FC = () => {
  const { currentUser } = useAuth();
  const [lookupId, setLookupId] = useState<string>('EASYBOOK-CERT-2026-000182');
  const [result, setResult] = useState<{
    searched: boolean;
    found: boolean;
    cert?: CertificateRecord;
    status: 'VALID' | 'REVOKED' | 'INVALID';
  }>({
    searched: true,
    found: true,
    status: 'VALID',
    cert: {
      id: 'cert_eb_2026_001',
      certificateNumber: 'EASYBOOK-CERT-2026-000182',
      eventId: 'evt_sih_hackathon_2026',
      eventName: 'Smart India Hackathon (SIH) 2026 — Regional Preliminary',
      registrationId: 'reg_aditya_01',
      participantName: 'Aditya Verma',
      participantEmail: 'aditya.verma@student.edu',
      certificateType: 'COMPLETION',
      status: 'VALID',
      issueDate: '2026-10-15T15:00:00Z',
      issuerName: 'Prof. K. R. Nambiar',
      issuerDesignation: 'Chief Technology Officer & Convener',
      organizationName: 'IEDC MESCE Operations Hub',
      qrVerificationUrl: `${window.location.origin}/verify/cert_eb_2026_001`,
      sessionsAttendedCount: 3,
      totalSessionsCount: 4,
      attendancePercentage: 75,
      createdAt: '2026-10-15T15:00:00Z',
    },
  });

  const [loading, setLoading] = useState(false);
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!lookupId.trim()) return;

    setLoading(true);
    try {
      const res = await verifyCertificate(lookupId.trim());
      setResult({
        searched: true,
        found: res.found,
        cert: res.certificate,
        status: res.status,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (result.cert) {
      await generateCertificatePDF(result.cert);
    }
  };

  const handleRevoke = async () => {
    if (!result.cert || !revokeReason) return;
    try {
      const actor = {
        id: currentUser?.id || 'user_sayush_org',
        name: currentUser?.name || 'Sayush Sunesh',
        role: currentUser?.role || 'ORGANIZER',
      };
      const updated = await revokeCertificate(result.cert.id, revokeReason, actor);
      setResult({
        searched: true,
        found: true,
        cert: updated,
        status: 'REVOKED',
      });
      setRevokeModalOpen(false);
      setRevokeReason('');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-3">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Public Certificate Verification</h1>
        <p className="mt-1 text-xs text-slate-400 max-w-md mx-auto">
          Verify authentic EasyBook credentials against tamper-resistant attendance records.
        </p>
      </div>

      {/* Search Input Box */}
      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex gap-2 p-1.5 bg-slate-900 border border-slate-800 rounded-xl shadow-lg">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              value={lookupId}
              onChange={(e) => setLookupId(e.target.value)}
              placeholder="Enter Certificate ID (e.g. EASYBOOK-CERT-2026-000182)"
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white font-mono placeholder:font-sans focus:outline-none focus:border-emerald-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 rounded-lg transition-colors shrink-0"
          >
            {loading ? 'Verifying...' : 'Verify Credential'}
          </button>
        </div>
      </form>

      {/* Verification Result Card */}
      {result.searched && (
        <div>
          {result.status === 'VALID' && result.cert && (
            <div className="bg-slate-900 border border-emerald-500/50 rounded-2xl p-6 shadow-2xl space-y-6">
              {/* Top verification banner */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950 border border-emerald-800 rounded">
                      AUTHENTIC & VALID CREDENTIAL
                    </span>
                    <h3 className="text-base font-semibold text-white mt-1">
                      {result.cert.certificateNumber}
                    </h3>
                  </div>
                </div>

                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Download PDF
                </button>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  <span className="text-[10px] font-mono text-slate-500 uppercase">Participant</span>
                  <p className="text-sm font-semibold text-white mt-0.5">
                    {result.cert.participantName}
                  </p>
                  <p className="text-[11px] text-slate-400">{result.cert.participantEmail}</p>
                </div>

                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  <span className="text-[10px] font-mono text-slate-500 uppercase">
                    Certificate Type
                  </span>
                  <p className="text-sm font-semibold text-emerald-400 mt-0.5">
                    {result.cert.certificateType}
                  </p>
                  <p className="text-[11px] text-slate-400">Verified Achievement</p>
                </div>

                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  <span className="text-[10px] font-mono text-slate-500 uppercase">
                    Event & Organization
                  </span>
                  <p className="text-xs font-semibold text-white mt-0.5">
                    {result.cert.eventName}
                  </p>
                  <p className="text-[11px] text-slate-400">{result.cert.organizationName}</p>
                </div>

                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  <span className="text-[10px] font-mono text-slate-500 uppercase">
                    Session Attendance Audit
                  </span>
                  <p className="text-sm font-semibold text-emerald-300 mt-0.5">
                    {result.cert.sessionsAttendedCount} of {result.cert.totalSessionsCount} Sessions ({result.cert.attendancePercentage}%)
                  </p>
                  <p className="text-[11px] text-slate-400">Exceeds completion requirements</p>
                </div>
              </div>

              {/* Issuer metadata */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <p className="text-slate-300 font-medium">Issued by: {result.cert.issuerName}</p>
                  <p className="text-[11px] text-slate-500">{result.cert.issuerDesignation}</p>
                </div>
                <div className="text-right text-[11px] text-slate-400">
                  <span>Issued on: {formatDate(result.cert.issueDate)}</span>
                </div>
              </div>

              {/* Organizer Revocation Control */}
              {currentUser?.role === 'ORGANIZER' && (
                <div className="pt-3 border-t border-slate-800 flex justify-end">
                  <button
                    onClick={() => setRevokeModalOpen(true)}
                    className="text-xs text-rose-400 hover:text-rose-300 underline"
                  >
                    Revoke this certificate (Organizer Action)
                  </button>
                </div>
              )}
            </div>
          )}

          {result.status === 'REVOKED' && (
            <div className="bg-rose-950/40 border border-rose-600/80 rounded-2xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-8 h-8 text-rose-400 shrink-0" />
                <div>
                  <h3 className="text-base font-bold text-rose-200">
                    CERTIFICATE REVOKED BY ORGANIZER
                  </h3>
                  <p className="text-xs text-rose-300/80 mt-0.5">
                    This certificate credential was formally revoked and is no longer valid.
                  </p>
                </div>
              </div>

              {result.cert && (
                <div className="p-3 bg-slate-950 border border-rose-800/40 rounded-xl text-xs space-y-1">
                  <p className="text-slate-300">
                    <span className="text-slate-500">Certificate ID:</span> {result.cert.certificateNumber}
                  </p>
                  <p className="text-slate-300">
                    <span className="text-slate-500">Participant:</span> {result.cert.participantName}
                  </p>
                  <p className="text-slate-300">
                    <span className="text-slate-500">Revocation Reason:</span>{' '}
                    <span className="text-rose-400 font-medium">
                      {result.cert.revocationReason || 'Violation of event requirements'}
                    </span>
                  </p>
                </div>
              )}
            </div>
          )}

          {result.status === 'INVALID' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
              <div className="inline-flex p-3 rounded-full bg-slate-800 text-slate-400">
                <AlertTriangle className="w-6 h-6 text-amber-400" />
              </div>
              <h3 className="text-sm font-semibold text-white">No Certificate Record Found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No certificate matches identifier &quot;{lookupId}&quot;. Please double check the ID from your digital pass or QR scan.
              </p>
            </div>
          )}
        </div>
      )}

      {/* REVOKE MODAL */}
      {revokeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 max-w-md w-full space-y-4">
            <h3 className="text-sm font-semibold text-white">Revoke Certificate</h3>
            <p className="text-xs text-slate-400">
              Revocation is recorded in the permanent audit trail. Please provide the reason.
            </p>
            <textarea
              rows={3}
              required
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              placeholder="e.g. Audit revealed attendee missed afternoon session block..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRevokeModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-400 bg-slate-800 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleRevoke}
                disabled={!revokeReason}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-40 rounded"
              >
                Confirm Revocation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
