import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Registration, TicketType, RegistrationStatus, PhysicalStatus } from '../types';
import { INITIAL_TICKETS, INITIAL_REGISTRATIONS } from './seedData';
import { generateTicketQRPayload } from '../utils/qr';

const TICKETS_STORAGE_KEY = 'easybook_tickets_store';
const REGISTRATIONS_STORAGE_KEY = 'easybook_registrations_store';

function getStoredTickets(): TicketType[] {
  try {
    const raw = localStorage.getItem(TICKETS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  return INITIAL_TICKETS;
}

function saveTickets(tickets: TicketType[]) {
  localStorage.setItem(TICKETS_STORAGE_KEY, JSON.stringify(tickets));
}

function getStoredRegistrations(): Registration[] {
  try {
    const raw = localStorage.getItem(REGISTRATIONS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  return INITIAL_REGISTRATIONS;
}

function saveRegistrations(regs: Registration[]) {
  localStorage.setItem(REGISTRATIONS_STORAGE_KEY, JSON.stringify(regs));
}

export async function fetchTicketsForEvent(eventId: string): Promise<TicketType[]> {
  try {
    const snap = await getDocs(collection(db, 'tickets'));
    if (!snap.empty) {
      const all: TicketType[] = [];
      snap.forEach((d) => all.push(d.data() as TicketType));
      const filtered = all.filter((t) => t.eventId === eventId);
      if (filtered.length > 0) return filtered;
    }
  } catch (e) {
    console.warn('Firestore tickets fetch notice:', e);
  }

  const all = getStoredTickets();
  return all.filter((t) => t.eventId === eventId);
}

export async function createTicket(ticket: Omit<TicketType, 'id' | 'createdAt' | 'soldCount'>): Promise<TicketType> {
  const newId = `tkt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();
  const created: TicketType = {
    ...ticket,
    id: newId,
    soldCount: 0,
    createdAt: now,
  };

  try {
    await setDoc(doc(db, 'tickets', newId), created);
  } catch (e) {
    console.warn(e);
  }

  const all = getStoredTickets();
  all.push(created);
  saveTickets(all);
  return created;
}

export async function fetchRegistrationsForEvent(eventId: string): Promise<Registration[]> {
  try {
    const snap = await getDocs(collection(db, 'registrations'));
    if (!snap.empty) {
      const all: Registration[] = [];
      snap.forEach((d) => all.push(d.data() as Registration));
      const filtered = all.filter((r) => r.eventId === eventId);
      if (filtered.length > 0) return filtered;
    }
  } catch (e) {
    console.warn('Firestore registrations fetch notice:', e);
  }

  const all = getStoredRegistrations();
  return all.filter((r) => r.eventId === eventId);
}

export async function getRegistrationById(regId: string): Promise<Registration | null> {
  const all = getStoredRegistrations();
  return all.find((r) => r.id === regId || r.bookingId === regId) || null;
}

export interface RegisterInput {
  eventId: string;
  ticketId: string;
  ticketName: string;
  pricePaid: number;
  userId?: string;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone: string;
  attendeeDept?: string;
  attendeeCollege?: string;
  isTeam: boolean;
  teamName?: string;
  teamMembers?: { name: string; email: string; phone?: string }[];
  customFieldsData: Record<string, any>;
  requiresApproval: boolean;
}

export async function submitRegistration(input: RegisterInput): Promise<Registration> {
  const allRegs = getStoredRegistrations();
  const eventRegs = allRegs.filter((r) => r.eventId === input.eventId);

  const regId = `reg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const bookingId = `BK-${Date.now().toString().slice(-6)}`;
  const now = new Date().toISOString();

  // Determine initial status
  let initialStatus: RegistrationStatus = input.requiresApproval ? 'PENDING' : 'APPROVED';

  // Check waitlist condition if ticket / event is full
  const tickets = getStoredTickets();
  const ticket = tickets.find((t) => t.id === input.ticketId);
  let waitlistNumber: number | undefined;

  if (ticket && ticket.soldCount >= ticket.capacity) {
    initialStatus = 'WAITLISTED';
    const waitlistedCount = eventRegs.filter((r) => r.status === 'WAITLISTED').length;
    waitlistNumber = waitlistedCount + 1;
  }

  const qrPayload = generateTicketQRPayload(input.eventId, bookingId, regId);

  const newReg: Registration = {
    id: regId,
    bookingId,
    eventId: input.eventId,
    ticketId: input.ticketId,
    ticketName: input.ticketName,
    pricePaid: input.pricePaid,
    userId: input.userId,
    attendeeName: input.attendeeName,
    attendeeEmail: input.attendeeEmail,
    attendeePhone: input.attendeePhone,
    attendeeDept: input.attendeeDept,
    attendeeCollege: input.attendeeCollege,
    isTeam: input.isTeam,
    teamId: input.isTeam ? `team_${Date.now()}` : undefined,
    teamName: input.teamName,
    isTeamLeader: input.isTeam ? true : undefined,
    teamMembers: input.teamMembers,
    customFieldsData: input.customFieldsData,
    status: initialStatus,
    physicalStatus: 'NOT_CHECKED_IN',
    qrPayload,
    waitlistNumber,
    certificateEligible: false,
    certificateIssued: false,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await setDoc(doc(db, 'registrations', regId), newReg);
  } catch (e) {
    console.warn('Firestore set registration warning:', e);
  }

  allRegs.unshift(newReg);
  saveRegistrations(allRegs);

  // Increment ticket sold count if approved
  if (initialStatus === 'APPROVED' && ticket) {
    ticket.soldCount += 1;
    saveTickets(tickets);
  }

  return newReg;
}

export async function updateRegistrationStatus(
  regId: string,
  newStatus: RegistrationStatus,
  rejectionReason?: string
): Promise<Registration> {
  const allRegs = getStoredRegistrations();
  const index = allRegs.findIndex((r) => r.id === regId);
  if (index === -1) throw new Error('Registration not found');

  const now = new Date().toISOString();
  const updated: Registration = {
    ...allRegs[index],
    status: newStatus,
    rejectionReason: rejectionReason || allRegs[index].rejectionReason,
    updatedAt: now,
  };

  allRegs[index] = updated;
  saveRegistrations(allRegs);

  try {
    await updateDoc(doc(db, 'registrations', regId), {
      status: newStatus,
      rejectionReason: rejectionReason || null,
      updatedAt: now,
    });
  } catch (e) {
    console.warn(e);
  }

  return updated;
}

export async function promoteWaitlistedRegistration(eventId: string): Promise<Registration | null> {
  const allRegs = getStoredRegistrations();
  const waitlisted = allRegs
    .filter((r) => r.eventId === eventId && r.status === 'WAITLISTED')
    .sort((a, b) => (a.waitlistNumber || 999) - (b.waitlistNumber || 999));

  if (waitlisted.length === 0) return null;

  const candidate = waitlisted[0];
  candidate.status = 'APPROVED';
  candidate.waitlistNumber = undefined;
  candidate.updatedAt = new Date().toISOString();

  saveRegistrations(allRegs);
  return candidate;
}
