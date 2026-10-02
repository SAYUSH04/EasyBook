import {
  AttendanceBlock,
  AttendanceRecord,
  AttendanceAuditLog,
  Registration,
  PhysicalStatus,
  AttendanceSource,
  OfflinePendingScan,
} from '../types';
import {
  INITIAL_ATTENDANCE_BLOCKS,
  INITIAL_ATTENDANCE_RECORDS,
  INITIAL_AUDIT_LOGS,
} from './seedData';
import { parseQRPayload } from '../utils/qr';
import { getRegistrationById } from './bookingService';

const BLOCKS_STORAGE_KEY = 'easybook_blocks_store';
const RECORDS_STORAGE_KEY = 'easybook_records_store';
const AUDIT_STORAGE_KEY = 'easybook_audit_store';
const OFFLINE_QUEUE_KEY = 'easybook_offline_scans_queue';

function getStoredBlocks(): AttendanceBlock[] {
  try {
    const raw = localStorage.getItem(BLOCKS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  return INITIAL_ATTENDANCE_BLOCKS;
}

function saveBlocks(blocks: AttendanceBlock[]) {
  localStorage.setItem(BLOCKS_STORAGE_KEY, JSON.stringify(blocks));
}

function getStoredRecords(): AttendanceRecord[] {
  try {
    const raw = localStorage.getItem(RECORDS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  return INITIAL_ATTENDANCE_RECORDS;
}

function saveRecords(records: AttendanceRecord[]) {
  localStorage.setItem(RECORDS_STORAGE_KEY, JSON.stringify(records));
}

function getStoredAuditLogs(): AttendanceAuditLog[] {
  try {
    const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  return INITIAL_AUDIT_LOGS;
}

function saveAuditLogs(logs: AttendanceAuditLog[]) {
  localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(logs));
}

export function getOfflineQueue(): OfflinePendingScan[] {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    //
  }
  return [];
}

export function saveOfflineQueue(queue: OfflinePendingScan[]) {
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

// ----------------- BLOCK MANAGEMENT -----------------

export async function fetchBlocksForEvent(eventId: string): Promise<AttendanceBlock[]> {
  const all = getStoredBlocks();
  return all
    .filter((b) => b.eventId === eventId)
    .sort((a, b) => a.order - b.order);
}

export async function getActiveBlock(eventId: string): Promise<AttendanceBlock | null> {
  const blocks = await fetchBlocksForEvent(eventId);
  return blocks.find((b) => b.isActive && !b.isClosed) || null;
}

export async function createAttendanceBlock(
  eventId: string,
  title: string,
  startTime: string,
  endTime: string,
  actor: { id: string; name: string; role: string }
): Promise<AttendanceBlock> {
  const all = getStoredBlocks();
  const eventBlocks = all.filter((b) => b.eventId === eventId);
  const newOrder = eventBlocks.length + 1;

  const newBlock: AttendanceBlock = {
    id: `blk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    eventId,
    title,
    order: newOrder,
    startTime,
    endTime,
    isActive: eventBlocks.length === 0, // activate if first block
    isClosed: false,
    totalPresent: 0,
    createdAt: new Date().toISOString(),
  };

  all.push(newBlock);
  saveBlocks(all);

  // Record audit log
  await recordAuditLog({
    eventId,
    actionType: 'BLOCK_ACTIVATED',
    blockTitle: title,
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    source: 'MANUAL',
    timestamp: new Date().toISOString(),
    reason: `Created and registered attendance block: ${title}`,
  });

  return newBlock;
}

export async function setActiveBlock(
  eventId: string,
  blockId: string,
  actor: { id: string; name: string; role: string }
): Promise<void> {
  const all = getStoredBlocks();
  let activatedTitle = '';

  all.forEach((b) => {
    if (b.eventId === eventId) {
      if (b.id === blockId) {
        b.isActive = true;
        b.isClosed = false;
        activatedTitle = b.title;
      } else {
        b.isActive = false;
      }
    }
  });

  saveBlocks(all);

  await recordAuditLog({
    eventId,
    attendanceBlockId: blockId,
    blockTitle: activatedTitle,
    actionType: 'BLOCK_ACTIVATED',
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    source: 'MANUAL',
    timestamp: new Date().toISOString(),
    reason: `Switched active attendance block to: ${activatedTitle}`,
  });
}

export async function closeBlock(
  eventId: string,
  blockId: string,
  actor: { id: string; name: string; role: string }
): Promise<void> {
  const all = getStoredBlocks();
  let closedTitle = '';

  all.forEach((b) => {
    if (b.eventId === eventId && b.id === blockId) {
      b.isActive = false;
      b.isClosed = true;
      closedTitle = b.title;
    }
  });

  saveBlocks(all);

  await recordAuditLog({
    eventId,
    attendanceBlockId: blockId,
    blockTitle: closedTitle,
    actionType: 'BLOCK_CLOSED',
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    source: 'MANUAL',
    timestamp: new Date().toISOString(),
    reason: `Organizer officially closed attendance block: ${closedTitle}`,
  });
}

// ----------------- SCAN & CHECK-IN ENGINE -----------------

export interface ScanResult {
  success: boolean;
  message: string;
  isDuplicate?: boolean;
  duplicateScanDetails?: {
    scannedAt: string;
    scannerName: string;
    blockTitle: string;
  };
  registration?: Registration;
  block?: AttendanceBlock;
  actionTaken?: 'PRIMARY_CHECK_IN' | 'SESSION_MARKED' | 'RE_ENTERED' | 'CHECKED_OUT';
  physicalStatus?: PhysicalStatus;
}

/**
 * Handles real-time scanning with duplicate check and session block attachment.
 */
export async function processQRScan(
  payload: string,
  currentEventId: string,
  actor: { id: string; name: string; role: string },
  forcedAction?: 'CHECK_IN' | 'CHECK_OUT' | 'RE_ENTRY'
): Promise<ScanResult> {
  const parsed = parseQRPayload(payload);

  if (!parsed.isValid && !parsed.registrationId && !parsed.bookingId) {
    return {
      success: false,
      message: parsed.error || 'Invalid QR code signature. Not an authentic EasyBook credential.',
    };
  }

  // Cross event validation
  if (parsed.eventId && parsed.eventId !== currentEventId) {
    return {
      success: false,
      message: 'Invalid Event: This ticket was issued for a different event venue.',
    };
  }

  // Find registration
  const regId = parsed.registrationId || parsed.bookingId || '';
  const registration = await getRegistrationById(regId);

  if (!registration) {
    return {
      success: false,
      message: `No active registration found for booking credential "${regId}".`,
    };
  }

  if (registration.eventId !== currentEventId) {
    return {
      success: false,
      message: 'Event Mismatch: Registration does not belong to the current active event.',
    };
  }

  if (registration.status === 'REJECTED' || registration.status === 'CANCELLED') {
    return {
      success: false,
      message: `Admission Denied: Registration is ${registration.status}. Reason: ${registration.rejectionReason || 'Organizer declined.'}`,
    };
  }

  if (registration.status === 'PENDING') {
    return {
      success: false,
      message: 'Registration is PENDING organizer approval. Admission cannot be granted.',
    };
  }

  if (registration.status === 'WAITLISTED') {
    return {
      success: false,
      message: `Attendee is on WAITLIST (Position #${registration.waitlistNumber || 'N/A'}). Has not been promoted yet.`,
    };
  }

  const activeBlock = await getActiveBlock(currentEventId);
  const now = new Date().toISOString();

  // Check forced physical action
  if (forcedAction === 'CHECK_OUT') {
    registration.physicalStatus = 'CHECKED_OUT';
    registration.checkedOutAt = now;
    registration.updatedAt = now;
    await updateStoredRegistration(registration);

    await recordAuditLog({
      eventId: currentEventId,
      attendeeId: registration.id,
      attendeeName: registration.attendeeName,
      actionType: 'CHECK_OUT',
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      source: 'QR',
      timestamp: now,
      reason: 'Physical departure registered at exit scanner',
    });

    return {
      success: true,
      message: `Checked out ${registration.attendeeName}. Re-entry enabled with pass.`,
      registration,
      actionTaken: 'CHECKED_OUT',
      physicalStatus: 'CHECKED_OUT',
    };
  }

  if (forcedAction === 'RE_ENTRY' || registration.physicalStatus === 'CHECKED_OUT') {
    registration.physicalStatus = 'RE_ENTERED';
    registration.reEnteredAt = now;
    registration.updatedAt = now;
    await updateStoredRegistration(registration);

    await recordAuditLog({
      eventId: currentEventId,
      attendeeId: registration.id,
      attendeeName: registration.attendeeName,
      actionType: 'RE_ENTRY',
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      source: 'QR',
      timestamp: now,
      reason: 'Re-entry verified and granted at portal',
    });

    // Also record active block attendance if one exists and not marked yet
    if (activeBlock) {
      await recordBlockAttendance(currentEventId, activeBlock.id, registration, actor, 'QR');
    }

    return {
      success: true,
      message: `Re-entry verified for ${registration.attendeeName}! Welcome back.`,
      registration,
      actionTaken: 'RE_ENTERED',
      physicalStatus: 'RE_ENTERED',
    };
  }

  // Regular In-Venue / Check-in Scan
  // 1. If not checked in physically yet:
  const isFirstAdmission = registration.physicalStatus === 'NOT_CHECKED_IN';
  if (isFirstAdmission) {
    registration.physicalStatus = 'CHECKED_IN';
    registration.checkedInAt = now;
    registration.updatedAt = now;
    await updateStoredRegistration(registration);

    await recordAuditLog({
      eventId: currentEventId,
      attendeeId: registration.id,
      attendeeName: registration.attendeeName,
      actionType: 'CHECK_IN',
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      source: 'QR',
      timestamp: now,
      reason: 'First-time venue check-in confirmed via QR scan',
    });
  }

  // 2. Active Session Attendance verification & DUPLICATE CHECK
  if (activeBlock) {
    const existingRecords = getStoredRecords();
    const alreadyPresent = existingRecords.find(
      (r) =>
        r.eventId === currentEventId &&
        r.attendanceBlockId === activeBlock.id &&
        r.registrationId === registration.id &&
        r.status === 'PRESENT'
    );

    if (alreadyPresent) {
      return {
        success: false,
        isDuplicate: true,
        message: `DUPLICATE SCAN: ${registration.attendeeName} is already marked PRESENT for "${activeBlock.title}".`,
        duplicateScanDetails: {
          scannedAt: alreadyPresent.timestamp,
          scannerName: alreadyPresent.actorName,
          blockTitle: activeBlock.title,
        },
        registration,
        block: activeBlock,
      };
    }

    // Record session block attendance
    await recordBlockAttendance(currentEventId, activeBlock.id, registration, actor, 'QR');
  }

  return {
    success: true,
    message: isFirstAdmission
      ? `Primary Check-In verified for ${registration.attendeeName} (${registration.ticketName})`
      : `Session Attendance marked for "${activeBlock?.title || 'General Venue'}"`,
    registration,
    block: activeBlock || undefined,
    actionTaken: isFirstAdmission ? 'PRIMARY_CHECK_IN' : 'SESSION_MARKED',
    physicalStatus: registration.physicalStatus,
  };
}

async function recordBlockAttendance(
  eventId: string,
  blockId: string,
  reg: Registration,
  actor: { id: string; name: string; role: string },
  source: AttendanceSource
) {
  const records = getStoredRecords();
  const blocks = getStoredBlocks();
  const currentBlock = blocks.find((b) => b.id === blockId);

  const newRec: AttendanceRecord = {
    id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    eventId,
    attendanceBlockId: blockId,
    registrationId: reg.id,
    attendeeId: reg.userId,
    attendeeName: reg.attendeeName,
    attendeeEmail: reg.attendeeEmail,
    status: 'PRESENT',
    source,
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    timestamp: new Date().toISOString(),
  };

  records.push(newRec);
  saveRecords(records);

  // Update block count
  if (currentBlock) {
    const blockCount = records.filter(
      (r) => r.attendanceBlockId === blockId && r.status === 'PRESENT'
    ).length;
    currentBlock.totalPresent = blockCount;
    saveBlocks(blocks);
  }

  // Audit log
  await recordAuditLog({
    eventId,
    attendeeId: reg.id,
    attendeeName: reg.attendeeName,
    attendanceBlockId: blockId,
    blockTitle: currentBlock?.title,
    actionType: 'QR_SCAN',
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    source,
    timestamp: new Date().toISOString(),
    reason: `Session attendance marked present for block: ${currentBlock?.title || blockId}`,
  });
}

function updateStoredRegistration(reg: Registration) {
  try {
    const raw = localStorage.getItem('easybook_registrations_store');
    if (raw) {
      const all: Registration[] = JSON.parse(raw);
      const idx = all.findIndex((r) => r.id === reg.id);
      if (idx !== -1) {
        all[idx] = reg;
        localStorage.setItem('easybook_registrations_store', JSON.stringify(all));
      }
    }
  } catch (e) {
    console.error(e);
  }
}

// ----------------- AUDIT TRAIL -----------------

export async function recordAuditLog(log: Omit<AttendanceAuditLog, 'id'>): Promise<void> {
  const logs = getStoredAuditLogs();
  const newLog: AttendanceAuditLog = {
    ...log,
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
  };
  logs.unshift(newLog);
  saveAuditLogs(logs);
}

export async function fetchAuditLogsForEvent(eventId: string): Promise<AttendanceAuditLog[]> {
  const logs = getStoredAuditLogs();
  return logs.filter((l) => l.eventId === eventId);
}

export async function fetchRecordsForEvent(eventId: string): Promise<AttendanceRecord[]> {
  const records = getStoredRecords();
  return records.filter((r) => r.eventId === eventId);
}

// ----------------- MASS ATTENDANCE -----------------

export async function executeMassAttendance(
  eventId: string,
  blockId: string,
  registrationsToMark: Registration[],
  action: 'MARK_PRESENT' | 'UNMARK',
  actor: { id: string; name: string; role: string },
  reason: string
): Promise<number> {
  const records = getStoredRecords();
  const blocks = getStoredBlocks();
  const currentBlock = blocks.find((b) => b.id === blockId);
  const now = new Date().toISOString();

  let affectedCount = 0;

  if (action === 'MARK_PRESENT') {
    for (const reg of registrationsToMark) {
      // Check if already present
      const exists = records.some(
        (r) => r.attendanceBlockId === blockId && r.registrationId === reg.id && r.status === 'PRESENT'
      );
      if (!exists) {
        records.push({
          id: `att_mass_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          eventId,
          attendanceBlockId: blockId,
          registrationId: reg.id,
          attendeeId: reg.userId,
          attendeeName: reg.attendeeName,
          attendeeEmail: reg.attendeeEmail,
          status: 'PRESENT',
          source: 'MASS_OPERATION',
          actorId: actor.id,
          actorName: actor.name,
          actorRole: actor.role,
          timestamp: now,
        });
        affectedCount++;
      }
    }
  } else {
    // Unmark
    const regIds = new Set(registrationsToMark.map((r) => r.id));
    for (let i = records.length - 1; i >= 0; i--) {
      if (records[i].attendanceBlockId === blockId && regIds.has(records[i].registrationId)) {
        records.splice(i, 1);
        affectedCount++;
      }
    }
  }

  saveRecords(records);

  if (currentBlock) {
    currentBlock.totalPresent = records.filter(
      (r) => r.attendanceBlockId === blockId && r.status === 'PRESENT'
    ).length;
    saveBlocks(blocks);
  }

  await recordAuditLog({
    eventId,
    attendanceBlockId: blockId,
    blockTitle: currentBlock?.title,
    actionType: 'MASS_MARK',
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    source: 'MASS_OPERATION',
    timestamp: now,
    reason: `Mass Attendance: ${action} applied to ${affectedCount} attendees. Reason: ${reason}`,
    details: `Affected ${affectedCount} records in session "${currentBlock?.title || blockId}"`,
  });

  return affectedCount;
}

// ----------------- ATTENDANCE DROP-OFF & RETENTION -----------------

export interface DropOffAnalysis {
  registeredCount: number;
  checkedInCount: number;
  blockStats: {
    blockId: string;
    title: string;
    order: number;
    presentCount: number;
    retentionFromPreviousPct: number;
    dropOffFromPreviousCount: number;
    dropOffSummary?: string;
  }[];
  overallRetentionPct: number;
  largestDropOffBlock?: string;
}

export async function calculateAttendanceDropOff(
  eventId: string,
  registeredCount: number,
  checkedInCount: number
): Promise<DropOffAnalysis> {
  const blocks = await fetchBlocksForEvent(eventId);
  const records = await fetchRecordsForEvent(eventId);

  const blockStats = blocks.map((block, idx) => {
    const presentInBlock = records.filter(
      (r) => r.attendanceBlockId === block.id && r.status === 'PRESENT'
    ).length;

    let retentionFromPreviousPct = 100;
    let dropOffFromPreviousCount = 0;

    if (idx === 0) {
      // Compared to Checked-in count
      if (checkedInCount > 0) {
        retentionFromPreviousPct = Math.round((presentInBlock / checkedInCount) * 100);
        dropOffFromPreviousCount = Math.max(0, checkedInCount - presentInBlock);
      }
    } else {
      const prevBlock = blocks[idx - 1];
      const prevPresent = records.filter(
        (r) => r.attendanceBlockId === prevBlock.id && r.status === 'PRESENT'
      ).length;

      if (prevPresent > 0) {
        retentionFromPreviousPct = Math.round((presentInBlock / prevPresent) * 100);
        dropOffFromPreviousCount = Math.max(0, prevPresent - presentInBlock);
      }
    }

    const dropOffSummary =
      dropOffFromPreviousCount > 0
        ? `${dropOffFromPreviousCount} attendees did not continue to this session (${100 - retentionFromPreviousPct}% drop)`
        : 'Full retention maintained';

    return {
      blockId: block.id,
      title: block.title,
      order: block.order,
      presentCount: presentInBlock,
      retentionFromPreviousPct,
      dropOffFromPreviousCount,
      dropOffSummary,
    };
  });

  // Calculate largest drop-off
  let maxDrop = -1;
  let largestDropBlock: string | undefined;

  blockStats.forEach((s) => {
    if (s.dropOffFromPreviousCount > maxDrop) {
      maxDrop = s.dropOffFromPreviousCount;
      largestDropBlock = s.title;
    }
  });

  const lastBlock = blockStats[blockStats.length - 1];
  const overallRetentionPct =
    checkedInCount > 0 && lastBlock
      ? Math.round((lastBlock.presentCount / checkedInCount) * 100)
      : 0;

  return {
    registeredCount,
    checkedInCount,
    blockStats,
    overallRetentionPct,
    largestDropOffBlock: maxDrop > 0 ? largestDropBlock : 'None (High Retention)',
  };
}
