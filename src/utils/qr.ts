import QRCode from 'qrcode';

export interface ParsedQRPayload {
  isValid: boolean;
  eventId?: string;
  bookingId?: string;
  registrationId?: string;
  rawPayload: string;
  error?: string;
}

/**
 * Generates a standard EasyBook secure QR payload.
 */
export function generateTicketQRPayload(eventId: string, bookingId: string, registrationId: string): string {
  // Simple deterministic signature/checksum for validation
  const base = `${eventId}:${bookingId}:${registrationId}`;
  let hash = 0;
  for (let i = 0; i < base.length; i++) {
    hash = ((hash << 5) - hash) + base.charCodeAt(i);
    hash |= 0;
  }
  const checksum = Math.abs(hash).toString(36).slice(0, 6).toUpperCase();
  return `EASYBOOK:v1:${eventId}:${bookingId}:${registrationId}:${checksum}`;
}

/**
 * Validates and extracts identifiers from a scanned QR payload.
 */
export function parseQRPayload(payload: string): ParsedQRPayload {
  if (!payload || typeof payload !== 'string') {
    return { isValid: false, rawPayload: payload || '', error: 'Empty or invalid QR code format' };
  }

  const parts = payload.trim().split(':');
  if (parts[0] !== 'EASYBOOK' || parts[1] !== 'v1' || parts.length < 6) {
    // If it's a raw booking or registration ID fallback
    if (payload.startsWith('BK-') || payload.startsWith('REG-')) {
      return {
        isValid: true,
        bookingId: payload,
        registrationId: payload,
        rawPayload: payload,
      };
    }
    return { isValid: false, rawPayload: payload, error: 'Unrecognized EasyBook QR format' };
  }

  const [, , eventId, bookingId, registrationId, checksum] = parts;

  // Validate checksum
  const base = `${eventId}:${bookingId}:${registrationId}`;
  let hash = 0;
  for (let i = 0; i < base.length; i++) {
    hash = ((hash << 5) - hash) + base.charCodeAt(i);
    hash |= 0;
  }
  const expectedChecksum = Math.abs(hash).toString(36).slice(0, 6).toUpperCase();

  if (checksum !== expectedChecksum) {
    return {
      isValid: false,
      eventId,
      bookingId,
      registrationId,
      rawPayload: payload,
      error: 'Security signature mismatch — potentially tampered QR code',
    };
  }

  return {
    isValid: true,
    eventId,
    bookingId,
    registrationId,
    rawPayload: payload,
  };
}

/**
 * Generates a data URL for a QR code image
 */
export async function generateQRDataUrl(data: string): Promise<string> {
  try {
    return await QRCode.toDataURL(data, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 280,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('QR code generation failed:', err);
    return '';
  }
}
