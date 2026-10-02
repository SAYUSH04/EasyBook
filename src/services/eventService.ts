import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { EventItem, EventStatus } from '../types';
import { INITIAL_EVENTS } from './seedData';

const LOCAL_STORAGE_KEY = 'easybook_events_store';

function getLocalStoredEvents(): EventItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  return INITIAL_EVENTS;
}

function saveLocalEvents(events: EventItem[]) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(events));
}

export async function fetchAllEvents(): Promise<EventItem[]> {
  try {
    const snap = await getDocs(collection(db, 'events'));
    if (!snap.empty) {
      const list: EventItem[] = [];
      snap.forEach((d) => list.push(d.data() as EventItem));
      // Save locally
      saveLocalEvents(list);
      return list;
    }
  } catch (err) {
    console.warn('Firestore fetch notice, using localized storage:', err);
  }

  // Fallback to local storage or seed
  const local = getLocalStoredEvents();
  // Ensure seed is initialized if empty
  if (local.length === 0) {
    saveLocalEvents(INITIAL_EVENTS);
    return INITIAL_EVENTS;
  }
  return local;
}

export async function getEventById(eventId: string): Promise<EventItem | null> {
  try {
    const snap = await getDoc(doc(db, 'events', eventId));
    if (snap.exists()) {
      return snap.data() as EventItem;
    }
  } catch (err) {
    console.warn('Firestore getEventById notice:', err);
  }

  const all = getLocalStoredEvents();
  return all.find((e) => e.id === eventId) || null;
}

export async function createEvent(eventData: Omit<EventItem, 'id' | 'createdAt' | 'updatedAt' | 'registeredCount' | 'checkedInCount'>): Promise<EventItem> {
  const newId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const newEvent: EventItem = {
    ...eventData,
    id: newId,
    registeredCount: 0,
    checkedInCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await setDoc(doc(db, 'events', newId), newEvent);
  } catch (e) {
    console.warn('Firestore write warning:', e);
  }

  const all = getLocalStoredEvents();
  const updated = [newEvent, ...all];
  saveLocalEvents(updated);

  return newEvent;
}

export async function updateEvent(eventId: string, partial: Partial<EventItem>): Promise<EventItem> {
  const now = new Date().toISOString();
  const all = getLocalStoredEvents();
  const index = all.findIndex((e) => e.id === eventId);
  if (index === -1) throw new Error('Event not found');

  const updated: EventItem = {
    ...all[index],
    ...partial,
    updatedAt: now,
  };

  all[index] = updated;
  saveLocalEvents(all);

  try {
    await updateDoc(doc(db, 'events', eventId), { ...partial, updatedAt: now });
  } catch (e) {
    console.warn('Firestore update warning:', e);
  }

  return updated;
}

export async function duplicateEvent(sourceEventId: string, newOrganizerId: string): Promise<EventItem> {
  const source = await getEventById(sourceEventId);
  if (!source) throw new Error('Source event not found');

  const newId = `evt_dup_${Date.now()}`;
  const now = new Date().toISOString();

  const cloned: EventItem = {
    ...source,
    id: newId,
    organizerId: newOrganizerId,
    name: `${source.name} (Copy)`,
    slug: `${source.slug}-copy-${Date.now().toString().slice(-4)}`,
    publishedStatus: 'DRAFT',
    registeredCount: 0,
    checkedInCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await setDoc(doc(db, 'events', newId), cloned);
  } catch (e) {
    console.warn('Firestore duplicate warning:', e);
  }

  const all = getLocalStoredEvents();
  const updated = [cloned, ...all];
  saveLocalEvents(updated);

  return cloned;
}

export async function changeEventStatus(eventId: string, status: EventStatus): Promise<EventItem> {
  return updateEvent(eventId, { publishedStatus: status });
}
