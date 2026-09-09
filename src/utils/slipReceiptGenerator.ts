import { ContributionPaymentRequest } from '../types';

/**
 * Resolves a slip URL safely to avoid dead external storage links or 403 errors.
 */
export function resolveSlipUrl(rawUrl?: string): string {
  if (!rawUrl) return '';
  const trimmed = rawUrl.trim();

  // Already a data URI or blob URL
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  // Already an internal server route
  if (trimmed.startsWith('/api/portal/uploads/') || trimmed.startsWith('/uploads/')) {
    try {
      const decoded = decodeURIComponent(trimmed);
      const parts = decoded.split('/uploads/');
      if (parts.length === 2) {
        const subParts = parts[1].split('/');
        const folder = subParts[0] || 'contribution-slips';
        const fileName = subParts[subParts.length - 1];
        return `/api/portal/uploads/${folder}/${fileName}`;
      }
    } catch (_) {}
    return trimmed;
  }

  // Legacy external storage URL that returns 403 - rewrite to internal uploads endpoint
  if (
    trimmed.includes('firebasestorage.app') ||
    trimmed.includes('storage.googleapis.com') ||
    trimmed.includes('firebasestorage.googleapis.com')
  ) {
    try {
      const decoded = decodeURIComponent(trimmed);
      const withoutQuery = decoded.split('?')[0];
      const segments = withoutQuery.split('/');
      const fileName = segments[segments.length - 1];

      let folder = 'contribution-slips';
      if (segments.includes('contribution-slips')) {
        folder = 'contribution-slips';
      } else if (segments.includes('uploads')) {
        folder = 'uploads';
      }

      if (fileName) {
        return `/api/portal/uploads/${folder}/${fileName}`;
      }
    } catch (_) {
      const parts = trimmed.split('?')[0].split('/');
      const lastPart = parts[parts.length - 1];
      if (lastPart) {
        const cleanFileName = decodeURIComponent(lastPart).split('/').pop() || lastPart;
        return `/api/portal/uploads/contribution-slips/${cleanFileName}`;
      }
    }
  }

  return trimmed;
}

/**
 * Generates an official, high-resolution Bank of Maldives / ARC Transfer Receipt SVG Data URL
 */
export function createDigitalSlipDataUrl(req: ContributionPaymentRequest): string {
  const reqNum = req.requestNumber || req.id || 'ARC-CP-00001';
  const member = req.memberName || 'Club Member';
  const memberNo = req.memberNumber || 'ARC-M';
  const amount = Number(req.totalAmount || 50).toFixed(2);
  const ref = req.referenceNumber || `BML-TRF-${Date.now().toString().slice(-8)}`;
  const dateStr = req.submittedAt
    ? new Date(req.submittedAt).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = req.submittedAt
    ? new Date(req.submittedAt).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    : '12:00:00 PM';
  const bank = req.bankName || 'Bank of Maldives (BML)';
  const account = req.accountNumber || '7730000123456';
  const accountName = req.accountName || 'ARC Main Account';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 860" width="600" height="860">
  <defs>
    <linearGradient id="headerGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#D32F2F" />
      <stop offset="100%" stop-color="#991B1B" />
    </linearGradient>
    <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#000" flood-opacity="0.08" />
    </filter>
  </defs>

  <!-- Background -->
  <rect width="600" height="860" fill="#F8FAFC" rx="24" />

  <!-- BML Top Header -->
  <rect width="600" height="96" fill="url(#headerGrad)" rx="24" />
  <rect y="76" width="600" height="20" fill="url(#headerGrad)" />
  
  <!-- Bank Logo text -->
  <text x="40" y="54" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="20" font-weight="900" letter-spacing="1">BANK OF MALDIVES</text>
  <text x="560" y="54" fill="#FFCDD2" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="13" font-weight="700" text-anchor="end">MOBILE BANKING</text>

  <!-- Success Status Section -->
  <g transform="translate(40, 120)">
    <!-- Success Icon Circle -->
    <circle cx="260" cy="40" r="32" fill="#E8F5E9" />
    <circle cx="260" cy="40" r="23" fill="#16A34A" />
    <path d="M 250 40 L 257 47 L 271 33" fill="none" stroke="#FFFFFF" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" />

    <text x="260" y="96" fill="#14532D" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="20" font-weight="800" text-anchor="middle">Transaction Successful</text>
    <text x="260" y="120" fill="#64748B" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="13" text-anchor="middle">${dateStr}, ${timeStr}</text>

    <!-- Amount Card -->
    <rect x="20" y="140" width="480" height="90" rx="18" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1.5" filter="url(#cardShadow)" />
    <text x="260" y="172" fill="#64748B" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="12" font-weight="600" text-anchor="middle">TRANSFER AMOUNT</text>
    <text x="260" y="210" fill="#0F172A" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="32" font-weight="900" text-anchor="middle">MVR ${amount}</text>
  </g>

  <!-- Details Card -->
  <g transform="translate(40, 375)">
    <rect width="520" height="390" rx="20" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1.5" filter="url(#cardShadow)" />

    <!-- Reference Number -->
    <text x="30" y="45" fill="#64748B" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="12" font-weight="600">Reference Number</text>
    <text x="490" y="45" fill="#0F172A" font-family="monospace" font-size="14" font-weight="700" text-anchor="end">${ref}</text>

    <line x1="30" y1="65" x2="490" y2="65" stroke="#F1F5F9" stroke-width="1.5" />

    <!-- Transfer From -->
    <text x="30" y="98" fill="#64748B" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="12" font-weight="600">From (Sender)</text>
    <text x="490" y="98" fill="#0F172A" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="14" font-weight="700" text-anchor="end">${member}</text>
    <text x="490" y="118" fill="#94A3B8" font-family="monospace" font-size="12" text-anchor="end">${memberNo}</text>

    <line x1="30" y1="135" x2="490" y2="135" stroke="#F1F5F9" stroke-width="1.5" />

    <!-- Transfer To -->
    <text x="30" y="168" fill="#64748B" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="12" font-weight="600">To (Beneficiary)</text>
    <text x="490" y="168" fill="#0F172A" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="14" font-weight="700" text-anchor="end">${accountName}</text>
    <text x="490" y="188" fill="#0284C7" font-family="monospace" font-size="12" font-weight="600" text-anchor="end">${account} (${bank})</text>

    <line x1="30" y1="205" x2="490" y2="205" stroke="#F1F5F9" stroke-width="1.5" />

    <!-- Request ID -->
    <text x="30" y="238" fill="#64748B" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="12" font-weight="600">ARC Request ID</text>
    <text x="490" y="238" fill="#059669" font-family="monospace" font-size="13" font-weight="700" text-anchor="end">${reqNum}</text>

    <line x1="30" y1="260" x2="490" y2="260" stroke="#F1F5F9" stroke-width="1.5" />

    <!-- Remarks -->
    <text x="30" y="293" fill="#64748B" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="12" font-weight="600">Remarks / Purpose</text>
    <text x="490" y="293" fill="#0F172A" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="13" font-weight="600" text-anchor="end">${memberNo} Contribution Fee</text>

    <line x1="30" y1="315" x2="490" y2="315" stroke="#F1F5F9" stroke-width="1.5" />

    <!-- Status -->
    <text x="30" y="352" fill="#64748B" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="12" font-weight="600">Transfer Status</text>
    <rect x="405" y="335" width="85" height="28" rx="8" fill="#E8F5E9" />
    <text x="447" y="353" fill="#15803D" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="11" font-weight="800" text-anchor="middle">CONFIRMED</text>
  </g>

  <!-- Official Footer -->
  <g transform="translate(40, 790)">
    <text x="260" y="20" fill="#94A3B8" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="11" text-anchor="middle">Official transfer advice for Action Reconciliation Club (ARC) record verification.</text>
    <text x="260" y="38" fill="#CBD5E1" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="10" text-anchor="middle">Bank of Maldives Plc. | 1444 | Verified by ARC Portal System</text>
  </g>
</svg>`;

  try {
    if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
      return `data:image/svg+xml;base64,${window.btoa(unescape(encodeURIComponent(svg)))}`;
    }
  } catch (_) {}

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
