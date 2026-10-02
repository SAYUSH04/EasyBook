import { jsPDF } from 'jspdf';
import { CertificateRecord } from '../types';
import { generateQRDataUrl } from './qr';

export async function generateCertificatePDF(cert: CertificateRecord): Promise<void> {
  // A4 Landscape: 297 x 210 mm
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();

  // 1. Dark executive background
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, width, height, 'F');

  // Inner subtle background frame
  doc.setFillColor(20, 30, 55);
  doc.roundedRect(8, 8, width - 16, height - 16, 4, 4, 'F');

  // Border rings
  doc.setDrawColor(16, 185, 129); // emerald-500
  doc.setLineWidth(1.2);
  doc.roundedRect(12, 12, width - 24, height - 24, 3, 3, 'S');

  doc.setDrawColor(51, 65, 85); // slate-700
  doc.setLineWidth(0.4);
  doc.roundedRect(15, 15, width - 30, height - 30, 2, 2, 'S');

  // Geometric corner accents
  const corners = [
    { x: 12, y: 12 },
    { x: width - 12, y: 12 },
    { x: 12, y: height - 12 },
    { x: width - 12, y: height - 12 },
  ];
  doc.setFillColor(16, 185, 129);
  corners.forEach(c => {
    doc.circle(c.x, c.y, 1.5, 'F');
  });

  // 2. Organization / Issuer Top Badge
  doc.setTextColor(148, 163, 184); // slate-400
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text((cert.organizationName || 'EASYBOOK EVENT OPERATIONS').toUpperCase(), width / 2, 28, {
    align: 'center',
  });

  // Brand Name
  doc.setTextColor(52, 211, 153); // emerald-400
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('EASYBOOK VERIFIED CREDENTIAL', width / 2, 34, { align: 'center' });

  // 3. Main Certificate Heading
  const typeMap: Record<string, string> = {
    PARTICIPATION: 'CERTIFICATE OF PARTICIPATION',
    COMPLETION: 'CERTIFICATE OF COMPLETION',
    WINNER: 'CERTIFICATE OF EXCELLENCE & VICTORY',
    VOLUNTEER: 'CERTIFICATE OF APPRECIATION (STAFF)',
    SPEAKER: 'CERTIFICATE OF DISTINGUISHED SPEAKER',
  };

  const titleText = typeMap[cert.certificateType] || 'CERTIFICATE OF ACHIEVEMENT';
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(titleText, width / 2, 52, { align: 'center' });

  // Subtitle
  doc.setTextColor(148, 163, 184);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text('This credential certifies that', width / 2, 64, { align: 'center' });

  // 4. Participant Name
  doc.setTextColor(248, 250, 252);
  doc.setFont('times', 'bold');
  doc.setFontSize(28);
  doc.text(cert.participantName, width / 2, 82, { align: 'center' });

  // Decorative divider below name
  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(0.8);
  doc.line(width / 2 - 45, 87, width / 2 + 45, 87);

  // 5. Participation Narrative
  doc.setTextColor(203, 213, 225); // slate-300
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  const narrative = `has successfully demonstrated active participation and fulfilled all session attendance requirements for`;
  doc.text(narrative, width / 2, 97, { align: 'center' });

  // Event Name
  doc.setTextColor(52, 211, 153);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(cert.eventName, width / 2, 108, { align: 'center' });

  // Session stats badge
  const sessionText = `Verified Session Attendance: ${cert.sessionsAttendedCount}/${cert.totalSessionsCount} Blocks (${cert.attendancePercentage}%) • Status: ${cert.status}`;
  doc.setTextColor(148, 163, 184);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(sessionText, width / 2, 118, { align: 'center' });

  // 6. Footer: QR code on left, Signatures & Info on right
  const verifyUrl = cert.qrVerificationUrl || `${window.location.origin}/verify/${cert.id}`;
  const qrDataUrl = await generateQRDataUrl(verifyUrl);

  if (qrDataUrl) {
    // Add verification QR
    doc.addImage(qrDataUrl, 'PNG', 32, 142, 34, 34);
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text('Scan to Verify Legitimacy', 49, 180, { align: 'center' });
    doc.text(`ID: ${cert.certificateNumber}`, 49, 184, { align: 'center' });
  }

  // Middle/Right: Signatures & Metadata
  // Signatory 1
  const sigX = width - 75;
  doc.setDrawColor(71, 85, 105);
  doc.setLineWidth(0.5);
  doc.line(sigX - 35, 164, sigX + 35, 164);

  doc.setTextColor(241, 245, 249);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(cert.issuerName || 'Event Convener', sigX, 170, { align: 'center' });

  doc.setTextColor(148, 163, 184);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(cert.issuerDesignation || 'Operations Lead, EasyBook', sigX, 175, { align: 'center' });

  // Issue Date & Authority
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.text(`Issued On: ${new Date(cert.issueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, sigX, 182, { align: 'center' });
  doc.text(`Tamper-evident verification at easybook.platform/verify`, width / 2, 196, { align: 'center' });

  // Save the PDF
  const filename = `${cert.certificateNumber}_${cert.participantName.replace(/\s+/g, '_')}.pdf`;
  doc.save(filename);
}
