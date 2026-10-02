import {
  Registration,
  AttendanceBlock,
  AttendanceRecord,
  CertificateRecord,
  AttendanceAuditLog,
  EventItem,
} from '../types';

function triggerCsvDownload(csvContent: string, filename: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCsv(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

export function exportAttendeesCsv(event: EventItem, registrations: Registration[]) {
  const headers = [
    'Booking ID',
    'Registration ID',
    'Attendee Name',
    'Email',
    'Phone',
    'Department',
    'College',
    'Ticket Type',
    'Price (INR)',
    'Is Team',
    'Team Name',
    'Status',
    'Physical Presence',
    'Checked In At',
    'Checked Out At',
    'Re-entered At',
    'Registered Date',
  ];

  const rows = registrations.map((r) => [
    escapeCsv(r.bookingId),
    escapeCsv(r.id),
    escapeCsv(r.attendeeName),
    escapeCsv(r.attendeeEmail),
    escapeCsv(r.attendeePhone),
    escapeCsv(r.attendeeDept || ''),
    escapeCsv(r.attendeeCollege || ''),
    escapeCsv(r.ticketName),
    escapeCsv(r.pricePaid),
    escapeCsv(r.isTeam ? 'Yes' : 'No'),
    escapeCsv(r.teamName || ''),
    escapeCsv(r.status),
    escapeCsv(r.physicalStatus),
    escapeCsv(r.checkedInAt || ''),
    escapeCsv(r.checkedOutAt || ''),
    escapeCsv(r.reEnteredAt || ''),
    escapeCsv(r.createdAt),
  ]);

  const content = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  triggerCsvDownload(content, `${event.slug}_attendees_export.csv`);
}

export function exportSessionAttendanceMatrixCsv(
  event: EventItem,
  registrations: Registration[],
  blocks: AttendanceBlock[],
  records: AttendanceRecord[]
) {
  // Build lookup: `${regId}_${blockId}` -> boolean
  const lookup = new Set(
    records.filter((r) => r.status === 'PRESENT').map((r) => `${r.registrationId}_${r.attendanceBlockId}`)
  );

  const blockHeaders = blocks.map((b) => escapeCsv(`Session: ${b.title}`));
  const headers = [
    'Attendee Name',
    'Email',
    'Ticket Type',
    'Team',
    'Physical Status',
    ...blockHeaders,
    'Total Sessions Attended',
    'Session Attendance (%)',
  ];

  const rows = registrations.map((r) => {
    let attendedCount = 0;
    const sessionPresence = blocks.map((b) => {
      const isPresent = lookup.has(`${r.id}_${b.id}`);
      if (isPresent) attendedCount++;
      return escapeCsv(isPresent ? 'PRESENT' : 'ABSENT');
    });

    const pct = blocks.length > 0 ? Math.round((attendedCount / blocks.length) * 100) : 0;

    return [
      escapeCsv(r.attendeeName),
      escapeCsv(r.attendeeEmail),
      escapeCsv(r.ticketName),
      escapeCsv(r.teamName || ''),
      escapeCsv(r.physicalStatus),
      ...sessionPresence,
      escapeCsv(attendedCount),
      escapeCsv(`${pct}%`),
    ].join(',');
  });

  const content = [headers.join(','), ...rows].join('\n');
  triggerCsvDownload(content, `${event.slug}_session_attendance_matrix.csv`);
}

export function exportCertificatesCsv(event: EventItem, certificates: CertificateRecord[]) {
  const headers = [
    'Certificate Number',
    'Participant Name',
    'Email',
    'Type',
    'Status',
    'Sessions Attended',
    'Total Sessions',
    'Attendance (%)',
    'Issue Date',
    'Verification URL',
  ];

  const rows = certificates.map((c) =>
    [
      escapeCsv(c.certificateNumber),
      escapeCsv(c.participantName),
      escapeCsv(c.participantEmail),
      escapeCsv(c.certificateType),
      escapeCsv(c.status),
      escapeCsv(c.sessionsAttendedCount),
      escapeCsv(c.totalSessionsCount),
      escapeCsv(`${c.attendancePercentage}%`),
      escapeCsv(c.issueDate),
      escapeCsv(c.qrVerificationUrl),
    ].join(',')
  );

  const content = [headers.join(','), ...rows].join('\n');
  triggerCsvDownload(content, `${event.slug}_issued_certificates.csv`);
}

export function exportAuditLogsCsv(event: EventItem, logs: AttendanceAuditLog[]) {
  const headers = [
    'Timestamp',
    'Action Type',
    'Attendee',
    'Session Block',
    'Actor Name',
    'Actor Role',
    'Source',
    'Reason',
    'Details',
  ];

  const rows = logs.map((l) =>
    [
      escapeCsv(l.timestamp),
      escapeCsv(l.actionType),
      escapeCsv(l.attendeeName || ''),
      escapeCsv(l.blockTitle || ''),
      escapeCsv(l.actorName),
      escapeCsv(l.actorRole),
      escapeCsv(l.source),
      escapeCsv(l.reason || ''),
      escapeCsv(l.details || ''),
    ].join(',')
  );

  const content = [headers.join(','), ...rows].join('\n');
  triggerCsvDownload(content, `${event.slug}_audit_trail.csv`);
}
