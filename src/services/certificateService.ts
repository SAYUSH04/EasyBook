import {
  CertificateRecord,
  EventItem,
  Registration,
  AttendanceBlock,
  AttendanceRecord,
} from '../types';
import { INITIAL_CERTIFICATES } from './seedData';
import { fetchBlocksForEvent, fetchRecordsForEvent, recordAuditLog } from './attendanceService';

const CERT_STORAGE_KEY = 'easybook_certificates_store';

function getStoredCerts(): CertificateRecord[] {
  try {
    const raw = localStorage.getItem(CERT_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  return INITIAL_CERTIFICATES;
}

function saveCerts(certs: CertificateRecord[]) {
  localStorage.setItem(CERT_STORAGE_KEY, JSON.stringify(certs));
}

export interface EligibilityResult {
  isEligible: boolean;
  attendedCount: number;
  totalSessions: number;
  percentage: number;
  reason: string;
}

/**
 * Calculates real rule-based eligibility from attendance records
 */
export async function calculateEligibility(
  event: EventItem,
  registration: Registration,
  blocks?: AttendanceBlock[],
  records?: AttendanceRecord[]
): Promise<EligibilityResult> {
  const allBlocks = blocks || (await fetchBlocksForEvent(event.id));
  const allRecords = records || (await fetchRecordsForEvent(event.id));

  const totalSessions = allBlocks.length;
  if (totalSessions === 0) {
    return {
      isEligible: false,
      attendedCount: 0,
      totalSessions: 0,
      percentage: 0,
      reason: 'No attendance blocks defined for this event.',
    };
  }

  // Count sessions where attendee has a PRESENT record
  const attendedSessionIds = new Set(
    allRecords
      .filter((r) => r.registrationId === registration.id && r.status === 'PRESENT')
      .map((r) => r.attendanceBlockId)
  );

  const attendedCount = attendedSessionIds.size;
  const percentage = Math.round((attendedCount / totalSessions) * 100);

  const criteria = event.certificateSettings?.criteria || { rule: 'PERCENTAGE', minPercentage: 75 };

  let isEligible = false;
  let reason = '';

  switch (criteria.rule) {
    case 'PERCENTAGE': {
      const required = criteria.minPercentage ?? 75;
      isEligible = percentage >= required;
      reason = isEligible
        ? `Attendance (${percentage}%) meets or exceeds ${required}% threshold.`
        : `Attendance (${percentage}%) is below required ${required}% minimum threshold.`;
      break;
    }
    case 'MIN_SESSIONS': {
      const minReq = criteria.minSessions ?? Math.ceil(totalSessions * 0.7);
      isEligible = attendedCount >= minReq;
      reason = isEligible
        ? `Attended ${attendedCount} of ${totalSessions} sessions (Requirement: minimum ${minReq} sessions).`
        : `Attended ${attendedCount} sessions; requires at least ${minReq} sessions for certificate issuance.`;
      break;
    }
    case 'MANDATORY_BLOCKS': {
      const mandatory = criteria.mandatoryBlockIds || [];
      const missing = mandatory.filter((id) => !attendedSessionIds.has(id));
      isEligible = missing.length === 0;
      reason = isEligible
        ? 'Successfully completed all required mandatory sessions.'
        : `Missing ${missing.length} mandatory session block(s).`;
      break;
    }
    case 'ORGANIZER_APPROVAL':
    default: {
      isEligible = registration.certificateEligible ?? false;
      reason = isEligible
        ? 'Manual organizer approval granted.'
        : 'Pending organizer review and certificate approval.';
      break;
    }
  }

  return {
    isEligible,
    attendedCount,
    totalSessions,
    percentage,
    reason,
  };
}

export async function issueCertificate(
  event: EventItem,
  registration: Registration,
  actor: { id: string; name: string; role: string }
): Promise<CertificateRecord> {
  const allCerts = getStoredCerts();

  // Check if already issued
  const existing = allCerts.find(
    (c) => c.eventId === event.id && c.registrationId === registration.id && c.status === 'VALID'
  );
  if (existing) {
    return existing;
  }

  const eligibility = await calculateEligibility(event, registration);
  const now = new Date().toISOString();
  const certId = `cert_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const certSeqNumber = (allCerts.length + 1).toString().padStart(6, '0');
  const certNumber = `EASYBOOK-CERT-2026-${certSeqNumber}`;

  const newCert: CertificateRecord = {
    id: certId,
    certificateNumber: certNumber,
    eventId: event.id,
    eventName: event.name,
    registrationId: registration.id,
    participantName: registration.attendeeName,
    participantEmail: registration.attendeeEmail,
    certificateType: event.certificateSettings?.type || 'COMPLETION',
    status: 'VALID',
    issueDate: now,
    issuerName: event.certificateSettings?.issuerName || 'Event Convener',
    issuerDesignation: event.certificateSettings?.issuerDesignation || 'Operations Lead, EasyBook',
    organizationName: event.organizationName || 'EasyBook Verified Hub',
    qrVerificationUrl: `${window.location.origin}/verify/${certId}`,
    sessionsAttendedCount: eligibility.attendedCount,
    totalSessionsCount: eligibility.totalSessions,
    attendancePercentage: eligibility.percentage,
    createdAt: now,
  };

  allCerts.unshift(newCert);
  saveCerts(allCerts);

  // Update registration record
  registration.certificateEligible = true;
  registration.certificateIssued = true;
  registration.certificateId = certId;
  registration.updatedAt = now;

  try {
    const raw = localStorage.getItem('easybook_registrations_store');
    if (raw) {
      const allRegs: Registration[] = JSON.parse(raw);
      const idx = allRegs.findIndex((r) => r.id === registration.id);
      if (idx !== -1) {
        allRegs[idx] = registration;
        localStorage.setItem('easybook_registrations_store', JSON.stringify(allRegs));
      }
    }
  } catch (e) {
    console.error(e);
  }

  // Audit log
  await recordAuditLog({
    eventId: event.id,
    attendeeId: registration.id,
    attendeeName: registration.attendeeName,
    actionType: 'CERTIFICATE_GENERATED',
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    source: 'SYSTEM',
    timestamp: now,
    reason: `Certificate generated (${certNumber}) based on rule criteria. Attendance: ${eligibility.percentage}%`,
  });

  return newCert;
}

export async function revokeCertificate(
  certId: string,
  reason: string,
  actor: { id: string; name: string; role: string }
): Promise<CertificateRecord> {
  const allCerts = getStoredCerts();
  const cert = allCerts.find((c) => c.id === certId || c.certificateNumber === certId);
  if (!cert) throw new Error('Certificate not found');

  const now = new Date().toISOString();
  cert.status = 'REVOKED';
  cert.revocationReason = reason;
  cert.revokedAt = now;
  cert.revokedBy = actor.name;

  saveCerts(allCerts);

  await recordAuditLog({
    eventId: cert.eventId,
    attendeeId: cert.registrationId,
    attendeeName: cert.participantName,
    actionType: 'CERTIFICATE_REVOKED',
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    source: 'MANUAL',
    timestamp: now,
    reason: `Certificate ${cert.certificateNumber} revoked. Cause: ${reason}`,
  });

  return cert;
}

export async function verifyCertificate(identifier: string): Promise<{
  found: boolean;
  certificate?: CertificateRecord;
  status: 'VALID' | 'REVOKED' | 'INVALID';
}> {
  const allCerts = getStoredCerts();
  const cleanId = identifier.trim();
  const cert = allCerts.find(
    (c) =>
      c.id === cleanId ||
      c.certificateNumber.toLowerCase() === cleanId.toLowerCase() ||
      c.qrVerificationUrl.endsWith(cleanId)
  );

  if (!cert) {
    return { found: false, status: 'INVALID' };
  }

  return {
    found: true,
    certificate: cert,
    status: cert.status,
  };
}

export async function fetchCertificatesForEvent(eventId: string): Promise<CertificateRecord[]> {
  const allCerts = getStoredCerts();
  return allCerts.filter((c) => c.eventId === eventId);
}
