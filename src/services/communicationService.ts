import { CommunicationLog } from '../types';
import { INITIAL_COMMUNICATIONS } from './seedData';

const COMM_STORAGE_KEY = 'easybook_communications_store';

function getStoredComms(): CommunicationLog[] {
  try {
    const raw = localStorage.getItem(COMM_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  return INITIAL_COMMUNICATIONS;
}

function saveComms(comms: CommunicationLog[]) {
  localStorage.setItem(COMM_STORAGE_KEY, JSON.stringify(comms));
}

export async function fetchCommunicationsForEvent(eventId: string): Promise<CommunicationLog[]> {
  const all = getStoredComms();
  return all.filter((c) => c.eventId === eventId);
}

export async function sendCommunication(
  eventId: string,
  type: CommunicationLog['type'],
  subject: string,
  content: string,
  recipientFilter: string,
  recipientCount: number,
  senderName: string
): Promise<CommunicationLog> {
  const all = getStoredComms();
  const newComm: CommunicationLog = {
    id: `comm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    eventId,
    type,
    subject,
    content,
    recipientFilter,
    recipientCount,
    sentBy: senderName,
    sentAt: new Date().toISOString(),
    status: 'DELIVERED',
  };

  all.unshift(newComm);
  saveComms(all);
  return newComm;
}
