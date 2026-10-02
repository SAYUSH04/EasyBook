import { EventStaff, StaffRole } from '../types';
import { INITIAL_STAFF } from './seedData';

const STAFF_STORAGE_KEY = 'easybook_staff_store';

function getStoredStaff(): EventStaff[] {
  try {
    const raw = localStorage.getItem(STAFF_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  return INITIAL_STAFF;
}

function saveStaff(staff: EventStaff[]) {
  localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(staff));
}

export async function fetchStaffForEvent(eventId: string): Promise<EventStaff[]> {
  const all = getStoredStaff();
  return all.filter((s) => s.eventId === eventId);
}

export async function assignStaffMember(
  eventId: string,
  userEmail: string,
  userName: string,
  role: StaffRole
): Promise<EventStaff> {
  const all = getStoredStaff();
  const permissionsByRole: Record<StaffRole, string[]> = {
    REGISTRATION_STAFF: ['VIEW_REGISTRATIONS', 'APPROVE_REGISTRATION', 'REJECT_REGISTRATION'],
    CHECK_IN_STAFF: ['QR_SCAN', 'CHECK_IN', 'CHECK_OUT', 'RE_ENTRY', 'VIEW_ATTENDEES'],
    ATTENDANCE_MANAGER: ['QR_SCAN', 'CHECK_IN', 'SESSION_ATTENDANCE', 'MANUAL_ATTENDANCE', 'MASS_ATTENDANCE', 'VIEW_ANALYTICS'],
    EVENT_MANAGER: ['EVENT_SETTINGS', 'MANAGE_STAFF', 'MANAGE_TICKETS', 'MANAGE_FORMS', 'VIEW_ANALYTICS'],
    ORGANIZER: ['FULL_ACCESS'],
  };

  const newStaff: EventStaff = {
    id: `staff_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    eventId,
    userId: `user_${Date.now()}`,
    userEmail,
    userName,
    role,
    permissions: permissionsByRole[role] || ['QR_SCAN'],
    assignedAt: new Date().toISOString(),
  };

  all.push(newStaff);
  saveStaff(all);
  return newStaff;
}

export async function removeStaffMember(staffId: string): Promise<void> {
  const all = getStoredStaff();
  const filtered = all.filter((s) => s.id !== staffId);
  saveStaff(filtered);
}
