import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  BankAccount,
  IncomeRecord,
  ExpenseRecord,
  CategoryBudgetAllocation,
  MemberContributionRecord,
  User
} from '../types';

export interface FinancialReportPdfOptions {
  year: number;
  month: number | null; // 1-12 or null for all months
  accounts: BankAccount[];
  incomeRecords: IncomeRecord[];
  expenseRecords: ExpenseRecord[];
  allocations?: CategoryBudgetAllocation[];
  contributions?: MemberContributionRecord[];
  currentUser?: User | null;
  reportTitle?: string;
  notes?: string;
  includeItemizedIncome?: boolean;
  includeItemizedExpense?: boolean;
  includeBankBalances?: boolean;
  includeSignatures?: boolean;
}

export const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const MONTH_NAMES_DV = [
  'ޖެނުއަރީ', 'ފެބްރުއަރީ', 'މާރިޗު', 'އޭޕްރީލް', 'މެއި', 'ޖޫން',
  'ޖުލައި', 'އޮގަސްޓް', 'ސެޕްޓެމްބަރ', 'އޮކްޓޯބަރ', 'ނޮވެމްބަރ', 'ޑިސެމްބަރ'
];

export const INCOME_CATEGORY_LABELS: Record<string, string> = {
  member_contribution: 'Member Contributions (މެންބަރޝިޕް ފީ)',
  sponsorship: 'Sponsorships (ސްޕޮންސަރޝިޕް)',
  donation: 'Donations (ހެޔޮއެދޭ ފަރާތްތަކުގެ އެހީ)',
  event_fee: 'Event Participation Fees (އިވެންޓް ފީ)',
  service_fee: 'Service Fees (ޚިދުމަތުގެ އަގު)',
  merchandise: 'Merchandise & Sales (ތަކެތި ވިއްކުން)',
  rental: 'Rental Services (ކުއްޔަށް ދިނުން)',
  rental_service: 'Rental Services (ކުއްޔަށް ދިނުން)',
  grant: 'Grants & Aid (އެހީ/ގްރާންޓް)',
  other: 'Other Revenue (އެހެނިހެން)'
};

export const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  event_logistics: 'Event Logistics (އިވެންޓް ސާމާނު)',
  venue_rent: 'Venue & Hall Rent (ހޯލް ކުލި)',
  catering: 'Catering & Refreshments (ކެއިންބުއިން)',
  marketing_pr: 'Marketing & Media (މީޑިއާ އިޝްތިހާރު)',
  prizes_awards: 'Prizes & Awards (އިނާމު)',
  office_admin: 'Admin & Office Operations (އޮފީސް އިދާރީ)',
  utilities: 'Utilities & Bills (ބިލްތައް)',
  equipment: 'Sports & Clubhouse Gear (ކުޅިވަރު ސާމާނު)',
  travel: 'Travel & Transport (ދަތުރުފަތުރު)',
  maintenance: 'Repairs & Maintenance (މަރާމާތު)',
  other: 'Other Expenditures (އެހެނިހެން)'
};

/**
 * Formats a number as MVR currency with commas and 2 decimals
 */
export function formatReportCurrency(amount: number): string {
  const num = Number(amount || 0);
  const formatted = num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return `MVR ${formatted}`;
}

/**
 * Formats ISO date string to DD/MM/YYYY
 */
export function formatReportDate(dateStr?: string): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}

/**
 * Generates an official, publication-grade Financial Summary Report PDF
 */
export function generateFinancialSummaryPdf(options: FinancialReportPdfOptions): jsPDF {
  const {
    year,
    month,
    accounts,
    incomeRecords,
    expenseRecords,
    allocations = [],
    contributions = [],
    currentUser,
    reportTitle,
    notes,
    includeItemizedIncome = true,
    includeItemizedExpense = true,
    includeBankBalances = true,
    includeSignatures = true
  } = options;

  // 1. Initialize Document (A4 portrait: 210mm x 297mm)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm

  // Determine period text
  const isMonthly = month !== null && month >= 1 && month <= 12;
  const periodLabel = isMonthly
    ? `${MONTH_NAMES_EN[month - 1]} ${year}`
    : `Full Fiscal Year ${year}`;
  const periodDhivehi = isMonthly
    ? `${MONTH_NAMES_DV[month - 1]} ${year}`
    : `${year} ވަނަ އަހަރު`;

  const defaultTitle = isMonthly
    ? `MONTHLY FINANCIAL SUMMARY & AUDIT STATEMENT`
    : `ANNUAL FINANCIAL STATEMENT & AUDIT REPORT`;
  const finalTitle = reportTitle?.trim() || defaultTitle;

  // Filter records by year and month
  const filteredIncome = incomeRecords.filter(r => {
    if (!r.date) return false;
    const d = new Date(r.date);
    if (d.getFullYear() !== year) return false;
    if (isMonthly && d.getMonth() + 1 !== month) return false;
    // Only count received / valid income
    return r.status !== 'cancelled';
  });

  const filteredExpense = expenseRecords.filter(r => {
    if (!r.date) return false;
    const d = new Date(r.date);
    if (d.getFullYear() !== year) return false;
    if (isMonthly && d.getMonth() + 1 !== month) return false;
    // Count paid or approved expenses (ignore rejected)
    return r.status !== 'rejected' && r.approvalStatus !== 'rejected';
  });

  // Calculate totals
  const totalIncome = filteredIncome.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const totalExpense = filteredExpense.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const netSurplus = totalIncome - totalExpense;
  const totalLiquidAssets = accounts.reduce((sum, a) => sum + Number(a.currentBalance || 0), 0);

  // Group by category
  const incomeByCategory: Record<string, { count: number; total: number }> = {};
  filteredIncome.forEach(r => {
    const cat = r.category || 'other';
    if (!incomeByCategory[cat]) incomeByCategory[cat] = { count: 0, total: 0 };
    incomeByCategory[cat].count += 1;
    incomeByCategory[cat].total += Number(r.amount || 0);
  });

  const expenseByCategory: Record<string, { count: number; total: number }> = {};
  filteredExpense.forEach(r => {
    const cat = r.category || 'other';
    if (!expenseByCategory[cat]) expenseByCategory[cat] = { count: 0, total: 0 };
    expenseByCategory[cat].count += 1;
    expenseByCategory[cat].total += Number(r.amount || 0);
  });

  // Reference Code
  const reportRef = `ARC-FIN-${year}${isMonthly ? String(month).padStart(2, '0') : 'ANN'}-${Date.now().toString().slice(-4)}`;
  const generatedAt = new Date().toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  const generatedBy = currentUser?.fullName || currentUser?.username || 'System Administrator';

  // --- DRAW HEADER ---
  let currentY = 12;

  // Header Background bar
  doc.setFillColor(15, 23, 42); // slate-900
  doc.roundedRect(margin, currentY, contentWidth, 34, 3, 3, 'F');

  // Decorative emerald accent line
  doc.setFillColor(5, 150, 105); // emerald-600
  doc.rect(margin, currentY + 32, contentWidth, 2, 'F');

  // Club Name & Subtitle
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('AANANDHA RECREATION CLUB (ARC)', margin + 6, currentY + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text('FINANCIAL MANAGEMENT & TREASURY DIVISION • R. MADUVVARI, MALDIVES', margin + 6, currentY + 16);

  // Document Title badge
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(52, 211, 153); // emerald-400
  doc.text(finalTitle, margin + 6, currentY + 25);

  // Metadata block (Right side)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(`Doc Ref: ${reportRef}`, pageWidth - margin - 6, currentY + 9, { align: 'right' });
  doc.text(`Period: ${periodLabel}`, pageWidth - margin - 6, currentY + 15, { align: 'right' });
  doc.text(`Generated: ${generatedAt}`, pageWidth - margin - 6, currentY + 21, { align: 'right' });
  doc.text(`Generated By: ${generatedBy}`, pageWidth - margin - 6, currentY + 27, { align: 'right' });

  currentY += 40;

  // --- EXECUTIVE SUMMARY CARDS GRID ---
  const cardGap = 3;
  const numCards = 4;
  const cardW = (contentWidth - cardGap * (numCards - 1)) / numCards;
  const cardH = 20;

  // Card 1: Total Revenue / Inflow
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, cardW, cardH, 2, 2, 'FD');
  doc.setFillColor(16, 185, 129); // emerald
  doc.rect(margin, currentY, cardW, 1.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text('TOTAL REVENUE (INFLOW)', margin + 3, currentY + 6);
  doc.setFontSize(10);
  doc.setTextColor(5, 150, 105);
  doc.text(formatReportCurrency(totalIncome), margin + 3, currentY + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`${filteredIncome.length} transaction(s)`, margin + 3, currentY + 17);

  // Card 2: Total Expenditures / Outflow
  const card2X = margin + cardW + cardGap;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(card2X, currentY, cardW, cardH, 2, 2, 'FD');
  doc.setFillColor(239, 68, 68); // red
  doc.rect(card2X, currentY, cardW, 1.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text('TOTAL EXPENSES (OUTFLOW)', card2X + 3, currentY + 6);
  doc.setFontSize(10);
  doc.setTextColor(220, 38, 38);
  doc.text(formatReportCurrency(totalExpense), card2X + 3, currentY + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`${filteredExpense.length} disbursement(s)`, card2X + 3, currentY + 17);

  // Card 3: Net Operating Balance (Surplus / Deficit)
  const card3X = card2X + cardW + cardGap;
  const isSurplus = netSurplus >= 0;
  doc.setFillColor(isSurplus ? 240 : 254, isSurplus ? 253 : 242, isSurplus ? 244 : 242);
  doc.setDrawColor(isSurplus ? 187 : 254, isSurplus ? 247 : 202, isSurplus ? 208 : 202);
  doc.roundedRect(card3X, currentY, cardW, cardH, 2, 2, 'FD');
  doc.setFillColor(isSurplus ? 16 : 220, isSurplus ? 185 : 38, isSurplus ? 129 : 38);
  doc.rect(card3X, currentY, cardW, 1.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(isSurplus ? 22 : 153, isSurplus ? 101 : 27, isSurplus ? 52 : 27);
  doc.text(isSurplus ? 'NET SURPLUS' : 'NET DEFICIT', card3X + 3, currentY + 6);
  doc.setFontSize(10);
  doc.setTextColor(isSurplus ? 22 : 185, isSurplus ? 101 : 28, isSurplus ? 52 : 28);
  doc.text(formatReportCurrency(Math.abs(netSurplus)), card3X + 3, currentY + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  const marginPct = totalIncome > 0 ? ((netSurplus / totalIncome) * 100).toFixed(1) : '0';
  doc.text(`Margin: ${marginPct}%`, card3X + 3, currentY + 17);

  // Card 4: Total Liquid Bank & Cash Balances
  const card4X = card3X + cardW + cardGap;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(card4X, currentY, cardW, cardH, 2, 2, 'FD');
  doc.setFillColor(59, 130, 246); // blue
  doc.rect(card4X, currentY, cardW, 1.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text('TOTAL LIQUID RESERVES', card4X + 3, currentY + 6);
  doc.setFontSize(10);
  doc.setTextColor(30, 58, 138);
  doc.text(formatReportCurrency(totalLiquidAssets), card4X + 3, currentY + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`${accounts.length} active account(s)`, card4X + 3, currentY + 17);

  currentY += cardH + 7;

  // Optional Admin Notes box if provided
  if (notes && notes.trim()) {
    doc.setFillColor(254, 252, 232); // light yellow
    doc.setDrawColor(254, 240, 138);
    doc.roundedRect(margin, currentY, contentWidth, 12, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(133, 77, 14);
    doc.text('OFFICIAL NOTE:', margin + 3, currentY + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(113, 63, 18);
    const splitNotes = doc.splitTextToSize(notes.trim(), contentWidth - 30);
    doc.text(splitNotes, margin + 27, currentY + 4.5);
    currentY += 15;
  }

  // --- SECTION 1: CATEGORY BREAKDOWN TABLES (SIDE BY SIDE OR STACKED) ---
  // We prepare Income by Category Table Data
  const incomeCategoryRows = Object.entries(incomeByCategory)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([cat, data]) => {
      const label = INCOME_CATEGORY_LABELS[cat] || cat.toUpperCase().replace(/_/g, ' ');
      const pct = totalIncome > 0 ? ((data.total / totalIncome) * 100).toFixed(1) : '0';
      return [
        label,
        data.count.toString(),
        `${pct}%`,
        formatReportCurrency(data.total)
      ];
    });

  if (incomeCategoryRows.length === 0) {
    incomeCategoryRows.push(['No income recorded in this period', '0', '0%', formatReportCurrency(0)]);
  }

  // Income summary table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('1. REVENUE & INFLOW BREAKDOWN (އާމްދަނީގެ ތަފްޞީލް)', margin, currentY);
  currentY += 3;

  autoTable(doc, {
    startY: currentY,
    head: [['Income Category', 'Transactions', 'Share (%)', 'Amount (MVR)']],
    body: [
      ...incomeCategoryRows,
      [{ content: 'TOTAL REVENUE', colSpan: 3, styles: { fontStyle: 'bold', halign: 'right' } }, { content: formatReportCurrency(totalIncome), styles: { fontStyle: 'bold', halign: 'right', textColor: [5, 150, 105] } }]
    ],
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.1
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5
    },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { cellWidth: 25, halign: 'center' },
      2: { cellWidth: 25, halign: 'center' },
      3: { cellWidth: 42, halign: 'right', fontStyle: 'bold' }
    },
    margin: { left: margin, right: margin }
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // Expense by Category Table Data
  const expenseCategoryRows = Object.entries(expenseByCategory)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([cat, data]) => {
      const label = EXPENSE_CATEGORY_LABELS[cat] || cat.toUpperCase().replace(/_/g, ' ');
      const pct = totalExpense > 0 ? ((data.total / totalExpense) * 100).toFixed(1) : '0';
      return [
        label,
        data.count.toString(),
        `${pct}%`,
        formatReportCurrency(data.total)
      ];
    });

  if (expenseCategoryRows.length === 0) {
    expenseCategoryRows.push(['No expenses recorded in this period', '0', '0%', formatReportCurrency(0)]);
  }

  // Check if we need page break before Section 2
  if (currentY > pageHeight - 60) {
    doc.addPage();
    currentY = 16;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('2. EXPENDITURES & OUTFLOW BREAKDOWN (ޚަރަދުގެ ތަފްޞީލް)', margin, currentY);
  currentY += 3;

  autoTable(doc, {
    startY: currentY,
    head: [['Expenditure Category', 'Disbursements', 'Share (%)', 'Amount (MVR)']],
    body: [
      ...expenseCategoryRows,
      [{ content: 'TOTAL EXPENDITURES', colSpan: 3, styles: { fontStyle: 'bold', halign: 'right' } }, { content: formatReportCurrency(totalExpense), styles: { fontStyle: 'bold', halign: 'right', textColor: [220, 38, 38] } }]
    ],
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.1
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5
    },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { cellWidth: 25, halign: 'center' },
      2: { cellWidth: 25, halign: 'center' },
      3: { cellWidth: 42, halign: 'right', fontStyle: 'bold' }
    },
    margin: { left: margin, right: margin }
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // --- SECTION 3: BANK & LIQUID ACCOUNTS RECONCILIATION ---
  if (includeBankBalances && accounts.length > 0) {
    if (currentY > pageHeight - 55) {
      doc.addPage();
      currentY = 16;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('3. BANK & LIQUID ACCOUNTS RECONCILIATION (އެކައުންޓްތަކުގެ ބެލެންސް)', margin, currentY);
    currentY += 3;

    const accountRows = accounts.map(acc => [
      acc.accountName,
      acc.bankName,
      acc.accountNumber || 'N/A',
      acc.type === 'cash' ? 'Cash in Hand' : 'Bank Vault',
      acc.status === 'active' ? 'Active' : 'Inactive',
      formatReportCurrency(acc.currentBalance)
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Account Name', 'Bank / Institution', 'Account Number', 'Type', 'Status', 'Current Balance (MVR)']],
      body: [
        ...accountRows,
        [{ content: 'TOTAL LIQUID RESERVES', colSpan: 5, styles: { fontStyle: 'bold', halign: 'right' } }, { content: formatReportCurrency(totalLiquidAssets), styles: { fontStyle: 'bold', halign: 'right', textColor: [30, 58, 138] } }]
      ],
      theme: 'grid',
      styles: {
        fontSize: 7.2,
        cellPadding: 2,
        textColor: [30, 41, 59],
        lineColor: [226, 232, 240],
        lineWidth: 0.1
      },
      headStyles: {
        fillColor: [51, 65, 85],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.2
      },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 35 },
        2: { cellWidth: 32 },
        3: { cellWidth: 22, halign: 'center' },
        4: { cellWidth: 16, halign: 'center' },
        5: { cellWidth: 32, halign: 'right', fontStyle: 'bold' }
      },
      margin: { left: margin, right: margin }
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // --- SECTION 4: ITEMIZED TRANSACTION RECORDS (IF REQUESTED) ---
  if (includeItemizedIncome && filteredIncome.length > 0) {
    if (currentY > pageHeight - 50) {
      doc.addPage();
      currentY = 16;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(`4. ITEMIZED INFLOW TRANSACTIONS AUDIT (${filteredIncome.length} Records)`, margin, currentY);
    currentY += 3;

    const incomeItemRows = filteredIncome
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(r => [
        formatReportDate(r.date),
        r.title || 'Income Entry',
        INCOME_CATEGORY_LABELS[r.category] ? INCOME_CATEGORY_LABELS[r.category].split(' (')[0] : r.category,
        r.accountName || accounts.find(a => a.id === r.accountId)?.accountName || 'Primary Account',
        r.referenceNumber || r.receivedFrom || '-',
        formatReportCurrency(r.amount)
      ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Date', 'Description / Source', 'Category', 'Account', 'Reference #', 'Amount (MVR)']],
      body: incomeItemRows,
      theme: 'striped',
      styles: {
        fontSize: 6.8,
        cellPadding: 1.8,
        textColor: [30, 41, 59],
        lineColor: [226, 232, 240],
        lineWidth: 0.1
      },
      headStyles: {
        fillColor: [6, 95, 70], // dark emerald
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7
      },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 47 },
        2: { cellWidth: 33 },
        3: { cellWidth: 32 },
        4: { cellWidth: 24 },
        5: { cellWidth: 26, halign: 'right', fontStyle: 'bold' }
      },
      margin: { left: margin, right: margin }
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  if (includeItemizedExpense && filteredExpense.length > 0) {
    if (currentY > pageHeight - 50) {
      doc.addPage();
      currentY = 16;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(`5. ITEMIZED OUTFLOW & DISBURSEMENTS AUDIT (${filteredExpense.length} Records)`, margin, currentY);
    currentY += 3;

    const expenseItemRows = filteredExpense
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(r => [
        formatReportDate(r.date),
        r.title || 'Expense Entry',
        EXPENSE_CATEGORY_LABELS[r.category] ? EXPENSE_CATEGORY_LABELS[r.category].split(' (')[0] : r.category,
        r.payee || r.vendorName || '-',
        r.billNumber || r.receiptNumber || r.referenceNumber || '-',
        r.approvedBy || (r.status === 'paid' ? 'Approved' : 'Pending'),
        formatReportCurrency(r.amount)
      ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Date', 'Title / Payee', 'Category', 'Vendor / Payee', 'Bill / Ref #', 'Approved By', 'Amount (MVR)']],
      body: expenseItemRows,
      theme: 'striped',
      styles: {
        fontSize: 6.8,
        cellPadding: 1.8,
        textColor: [30, 41, 59],
        lineColor: [226, 232, 240],
        lineWidth: 0.1
      },
      headStyles: {
        fillColor: [153, 27, 27], // dark red
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7
      },
      columnStyles: {
        0: { cellWidth: 18 },
        1: { cellWidth: 40 },
        2: { cellWidth: 30 },
        3: { cellWidth: 26 },
        4: { cellWidth: 22 },
        5: { cellWidth: 22 },
        6: { cellWidth: 24, halign: 'right', fontStyle: 'bold' }
      },
      margin: { left: margin, right: margin }
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // --- SECTION 5: EXECUTIVE AUDIT & SIGN-OFF SECTION ---
  if (includeSignatures) {
    // If not enough room on current page for signatures block (needs ~40mm), start a new page
    if (currentY > pageHeight - 48) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, currentY, contentWidth, 38, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text('OFFICIAL VERIFICATION & EXECUTIVE SIGN-OFF (ރަސްމީ ތަޞްދީޤު)', margin + 4, currentY + 6);

    const sigW = (contentWidth - 16) / 3;
    const sigY = currentY + 14;

    // Signature Block 1: Prepared By
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text('Prepared By:', margin + 4, sigY);
    doc.line(margin + 4, sigY + 12, margin + 4 + sigW - 4, sigY + 12);
    doc.setFont('helvetica', 'bold');
    doc.text(generatedBy, margin + 4, sigY + 16);
    doc.setFont('helvetica', 'normal');
    doc.text('Finance / Accounts Officer', margin + 4, sigY + 19.5);

    // Signature Block 2: Verified By (Treasurer)
    const sig2X = margin + 4 + sigW + 2;
    doc.text('Verified By (Treasurer):', sig2X, sigY);
    doc.line(sig2X, sigY + 12, sig2X + sigW - 4, sigY + 12);
    doc.setFont('helvetica', 'bold');
    doc.text('Treasurer / Internal Auditor', sig2X, sigY + 16);
    doc.setFont('helvetica', 'normal');
    doc.text('Date: ____ / ____ / ________', sig2X, sigY + 19.5);

    // Signature Block 3: Approved By (President)
    const sig3X = sig2X + sigW + 2;
    doc.text('Approved By (Executive):', sig3X, sigY);
    doc.line(sig3X, sigY + 12, sig3X + sigW - 4, sigY + 12);
    doc.setFont('helvetica', 'bold');
    doc.text('President / Vice President', sig3X, sigY + 16);
    doc.setFont('helvetica', 'normal');
    doc.text('Official ARC Club Seal', sig3X, sigY + 19.5);
  }

  // --- FOOTER ON ALL PAGES ---
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Footer divider line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 11, pageWidth - margin, pageHeight - 11);

    // Footer text
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Confidential & Proprietary • Aanandha Recreation Club • Report ID: ${reportRef}`,
      margin,
      pageHeight - 7
    );
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth - margin,
      pageHeight - 7,
      { align: 'right' }
    );
  }

  return doc;
}

/**
 * Generates and immediately downloads the PDF file to user device
 */
export function downloadFinancialSummaryPdf(
  options: FinancialReportPdfOptions,
  customFilename?: string
): void {
  const doc = generateFinancialSummaryPdf(options);
  const periodStr = options.month !== null && options.month >= 1 && options.month <= 12
    ? `${options.year}_${String(options.month).padStart(2, '0')}`
    : `${options.year}_Annual`;
  const filename = customFilename || `ARC_Financial_Summary_${periodStr}.pdf`;
  doc.save(filename);
}

/**
 * Generates the PDF and opens it in a new browser tab for print/preview
 */
export function previewFinancialSummaryPdfInNewTab(
  options: FinancialReportPdfOptions
): void {
  const doc = generateFinancialSummaryPdf(options);
  const blobUrl = doc.output('bloburl');
  window.open(blobUrl, '_blank');
}
