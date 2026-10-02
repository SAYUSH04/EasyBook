export type UserRole = 'ATTENDEE' | 'ORGANIZER' | 'VOLUNTEER' | 'ADMIN';

export type EventStatus =
  | 'DRAFT'
  | 'PUBLISHED'
  | 'REGISTRATION_OPEN'
  | 'REGISTRATION_CLOSED'
  | 'ONGOING'
  | 'COMPLETED'
  | 'CANCELLED';

export type EventMode = 'IN_PERSON' | 'ONLINE' | 'HYBRID';

export type RegistrationStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'WAITLISTED'
  | 'CANCELLED';

export type PhysicalStatus =
  | 'NOT_CHECKED_IN'
  | 'CHECKED_IN'
  | 'CHECKED_OUT'
  | 'RE_ENTERED';

export type AttendanceSource = 'QR' | 'MANUAL' | 'MASS_OPERATION' | 'SYSTEM';

export type CertificateType =
  | 'PARTICIPATION'
  | 'COMPLETION'
  | 'WINNER'
  | 'VOLUNTEER'
  | 'SPEAKER';

export type CertificateStatus = 'VALID' | 'REVOKED' | 'INVALID';

export type StaffRole =
  | 'REGISTRATION_STAFF'
  | 'CHECK_IN_STAFF'
  | 'ATTENDANCE_MANAGER'
  | 'EVENT_MANAGER'
  | 'ORGANIZER';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organizationId?: string;
  department?: string;
  college?: string;
  phone?: string;
  avatar?: string;
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string;
  ownerId: string;
  members: string[];
  createdAt: string;
}

export interface FormFieldConfig {
  id: string;
  label: string;
  type: 'text' | 'number' | 'email' | 'tel' | 'select' | 'checkbox' | 'textarea';
  placeholder?: string;
  required: boolean;
  options?: string[]; // for select
  defaultValue?: string;
}

export interface CertificateSettings {
  enabled: boolean;
  title: string;
  type: CertificateType;
  issuerName: string;
  issuerDesignation: string;
  signatureUrl?: string;
  organizationName: string;
  criteria: {
    rule: 'PERCENTAGE' | 'MIN_SESSIONS' | 'MANDATORY_BLOCKS' | 'ORGANIZER_APPROVAL';
    minPercentage?: number; // e.g. 75
    minSessions?: number; // e.g. 3
    mandatoryBlockIds?: string[];
  };
}

export interface AttendanceSettings {
  allowReentry: boolean;
  strictBlockTiming: boolean;
  allowManualOverride: boolean;
}

export interface EventItem {
  id: string;
  organizerId: string;
  organizationId?: string;
  organizationName: string;
  name: string;
  slug: string;
  description: string;
  banner: string;
  category: string;
  date: string;
  startTime: string;
  endTime: string;
  timezone: string;
  venue: string;
  location: string;
  eventMode: EventMode;
  capacity: number;
  registeredCount: number;
  checkedInCount: number;
  publishedStatus: EventStatus;
  isTeamEvent: boolean;
  minTeamSize?: number;
  maxTeamSize?: number;
  registrationDeadline: string;
  approvalRequired: boolean;
  waitlistEnabled: boolean;
  customFormFields: FormFieldConfig[];
  certificateSettings: CertificateSettings;
  attendanceSettings: AttendanceSettings;
  createdAt: string;
  updatedAt: string;
}

export interface TicketType {
  id: string;
  eventId: string;
  name: string;
  description: string;
  price: number; // in INR
  capacity: number;
  soldCount: number;
  saleStart: string;
  saleEnd: string;
  active: boolean;
  perks?: string[];
  createdAt: string;
}

export interface Registration {
  id: string;
  bookingId: string;
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
  teamId?: string;
  teamName?: string;
  isTeamLeader?: boolean;
  teamMembers?: { name: string; email: string; phone?: string }[];
  customFieldsData: Record<string, any>;
  status: RegistrationStatus;
  physicalStatus: PhysicalStatus;
  qrPayload: string;
  checkedInAt?: string;
  checkedOutAt?: string;
  reEnteredAt?: string;
  certificateEligible?: boolean;
  certificateIssued?: boolean;
  certificateId?: string;
  waitlistNumber?: number;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceBlock {
  id: string;
  eventId: string;
  title: string;
  order: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
  isClosed: boolean;
  totalPresent: number;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  eventId: string;
  attendanceBlockId: string;
  registrationId: string;
  attendeeId?: string;
  attendeeName: string;
  attendeeEmail: string;
  status: 'PRESENT' | 'ABSENT';
  source: AttendanceSource;
  actorId: string;
  actorName: string;
  actorRole: string;
  timestamp: string;
}

export interface AttendanceAuditLog {
  id: string;
  eventId: string;
  attendeeId?: string;
  attendeeName?: string;
  attendanceBlockId?: string;
  blockTitle?: string;
  actionType:
    | 'QR_SCAN'
    | 'CHECK_IN'
    | 'CHECK_OUT'
    | 'RE_ENTRY'
    | 'MANUAL_MARK'
    | 'MASS_MARK'
    | 'BLOCK_ACTIVATED'
    | 'BLOCK_CLOSED'
    | 'CERTIFICATE_GENERATED'
    | 'CERTIFICATE_REVOKED'
    | 'WAITLIST_PROMOTED';
  actorId: string;
  actorName: string;
  actorRole: string;
  source: AttendanceSource;
  timestamp: string;
  reason?: string;
  details?: string;
}

export interface CertificateRecord {
  id: string;
  certificateNumber: string; // e.g. EASYBOOK-CERT-2026-000182
  eventId: string;
  eventName: string;
  registrationId: string;
  participantName: string;
  participantEmail: string;
  certificateType: CertificateType;
  status: CertificateStatus;
  issueDate: string;
  issuerName: string;
  issuerDesignation: string;
  organizationName: string;
  qrVerificationUrl: string;
  revocationReason?: string;
  revokedAt?: string;
  revokedBy?: string;
  sessionsAttendedCount: number;
  totalSessionsCount: number;
  attendancePercentage: number;
  createdAt: string;
}

export interface EventStaff {
  id: string;
  eventId: string;
  userId: string;
  userEmail: string;
  userName: string;
  role: StaffRole;
  permissions: string[];
  assignedAt: string;
}

export interface CommunicationLog {
  id: string;
  eventId: string;
  type:
    | 'REGISTRATION_CONFIRMATION'
    | 'TICKET_PASS'
    | 'REMINDER'
    | 'SESSION_ANNOUNCEMENT'
    | 'CHECK_IN_CONFIRMATION'
    | 'CERTIFICATE_NOTIFICATION'
    | 'POST_EVENT';
  subject: string;
  content: string;
  recipientCount: number;
  recipientFilter: string;
  sentBy: string;
  sentAt: string;
  status: 'SENT' | 'DELIVERED';
}

export interface OfflinePendingScan {
  id: string;
  eventId: string;
  qrPayload: string;
  blockId: string;
  actionType: 'CHECK_IN' | 'SESSION_ATTENDANCE' | 'CHECK_OUT' | 'RE_ENTRY';
  scannedAt: string;
  status: 'PENDING' | 'SYNCED' | 'FAILED' | 'CONFLICT';
  errorMessage?: string;
}
