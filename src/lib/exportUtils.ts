import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { getCurrentBsDate, getCurrentAdDate } from './dateUtils';

export interface SummaryMetric {
  label: string;
  value: string | number;
}

export interface ExportHeaderOptions {
  companyName: string;
  reportTitle: string;
  subtitle?: string;
  dateRange?: string;
  summaryMetrics?: SummaryMetric[];
}

export interface ExportTableOptions extends ExportHeaderOptions {
  fileName: string;
  headers: string[];
  rows: (string | number)[][];
  footers?: (string | number)[];
  orientation?: 'portrait' | 'landscape';
  columnStyles?: Record<number, any>;
}

export interface GroupedExportSection {
  groupTitle: string;
  summaryText?: string;
  headers: string[];
  rows: (string | number)[][];
  footer?: (string | number)[];
}

export interface GroupedExportTableOptions extends ExportHeaderOptions {
  fileName: string;
  groups: GroupedExportSection[];
  grandTotalFooter?: (string | number)[];
  orientation?: 'portrait' | 'landscape';
}

/**
 * Exports a standard single-table report to PDF
 */
export function exportTableToPDF(options: ExportTableOptions) {
  const {
    fileName,
    companyName,
    reportTitle,
    dateRange = 'All Records',
    summaryMetrics = [],
    headers,
    rows,
    footers,
    orientation = 'landscape',
    columnStyles = {},
  } = options;

  const activeCompany = companyName || "rstraders's Company";
  const doc = new jsPDF({ orientation, unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // 1. Company Name & Title
  doc.setFontSize(16);
  doc.setTextColor(15, 67, 43); // #0F432B Dark Forest Green
  doc.text(activeCompany, 40, 40);

  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.text(reportTitle, 40, 58);

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Generated: ${getCurrentBsDate()} BS (${getCurrentAdDate()} AD)  |  Date Range: ${dateRange}`,
    40,
    73
  );

  let startY = 85;

  // 2. Summary Metrics Banner Box
  if (summaryMetrics.length > 0) {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    const boxWidth = pageWidth - 80;
    doc.roundedRect(40, startY, boxWidth, 28, 4, 4, 'FD');

    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    const metricsStr = summaryMetrics
      .map((m) => `${m.label}: ${m.value}`)
      .join('   |   ');
    doc.text(metricsStr, 50, startY + 18);
    startY += 38;
  }

  // 3. Main Data Table
  autoTable(doc, {
    startY,
    head: [headers],
    body: rows,
    foot: footers ? [footers] : undefined,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 4,
      overflow: 'linebreak',
      textColor: [30, 41, 59],
    },
    headStyles: {
      fillColor: [15, 67, 43], // #0F432B
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
    },
    columnStyles,
    didDrawPage: (data) => {
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Page ${data.pageNumber} of ${pageCount}  •  ChequeDesk Nepal`,
        data.settings.margin.left,
        pageHeight - 20
      );
    },
  });

  // 4. Signatures on final page
  const finalY = (doc as any).lastAutoTable?.finalY || 450;
  if (finalY + 60 < pageHeight) {
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Prepared By: __________________________', 50, finalY + 40);
    doc.text(
      'Authorized Signature: __________________________',
      pageWidth - 280,
      finalY + 40
    );
  }

  const cleanFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  doc.save(cleanFileName);
}

/**
 * Exports grouped tables (e.g. Due Date Timeline, Issued Date Log) to PDF
 */
export function exportGroupedTableToPDF(options: GroupedExportTableOptions) {
  const {
    fileName,
    companyName,
    reportTitle,
    dateRange = 'All Records',
    summaryMetrics = [],
    groups,
    grandTotalFooter,
    orientation = 'landscape',
  } = options;

  const activeCompany = companyName || "rstraders's Company";
  const doc = new jsPDF({ orientation, unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // Header
  doc.setFontSize(16);
  doc.setTextColor(15, 67, 43);
  doc.text(activeCompany, 40, 40);

  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.text(reportTitle, 40, 58);

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Generated: ${getCurrentBsDate()} BS (${getCurrentAdDate()} AD)  |  Date Range: ${dateRange}`,
    40,
    73
  );

  let currentY = 85;

  // Summary Metrics Banner Box
  if (summaryMetrics.length > 0) {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    const boxWidth = pageWidth - 80;
    doc.roundedRect(40, currentY, boxWidth, 28, 4, 4, 'FD');

    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    const metricsStr = summaryMetrics
      .map((m) => `${m.label}: ${m.value}`)
      .join('   |   ');
    doc.text(metricsStr, 50, currentY + 18);
    currentY += 40;
  }

  // Loop through sections
  groups.forEach((group, index) => {
    // Check if we need page break before group header
    if (currentY + 60 > pageHeight) {
      doc.addPage();
      currentY = 40;
    }

    // Group Header Title Banner
    doc.setFontSize(11);
    doc.setTextColor(15, 67, 43);
    const subtitle = group.summaryText ? `  (${group.summaryText})` : '';
    doc.text(`▸ ${group.groupTitle}${subtitle}`, 40, currentY + 12);
    currentY += 20;

    autoTable(doc, {
      startY: currentY,
      head: [group.headers],
      body: group.rows.length > 0 ? group.rows : [['No records in this group', '', '', '', '', '', '']],
      foot: group.footer ? [group.footer] : undefined,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 4,
        overflow: 'linebreak',
        textColor: [30, 41, 59],
      },
      headStyles: {
        fillColor: [40, 75, 55],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      footStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        fontStyle: 'bold',
      },
      didDrawPage: (data) => {
        const pageCount = doc.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(
          `Page ${data.pageNumber} of ${pageCount}  •  ChequeDesk Nepal`,
          data.settings.margin.left,
          pageHeight - 20
        );
      },
    });

    currentY = ((doc as any).lastAutoTable?.finalY || currentY) + 20;
  });

  // Grand Total Summary Table at the end
  if (grandTotalFooter) {
    if (currentY + 40 > pageHeight) {
      doc.addPage();
      currentY = 40;
    }

    autoTable(doc, {
      startY: currentY,
      body: [grandTotalFooter],
      theme: 'plain',
      styles: {
        fontSize: 9,
        cellPadding: 6,
        fontStyle: 'bold',
        textColor: [15, 67, 43],
        fillColor: [236, 253, 245], // Emerald 50
      },
    });

    currentY = ((doc as any).lastAutoTable?.finalY || currentY) + 20;
  }

  // Signatures on final page
  if (currentY + 60 < pageHeight) {
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Prepared By: __________________________', 50, currentY + 40);
    doc.text(
      'Authorized Signature: __________________________',
      pageWidth - 280,
      currentY + 40
    );
  }

  const cleanFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  doc.save(cleanFileName);
}

/**
 * Exports a standard single-table report to Excel (.xlsx)
 */
export function exportTableToExcel(options: ExportTableOptions) {
  const {
    fileName,
    companyName,
    reportTitle,
    dateRange = 'All Records',
    summaryMetrics = [],
    headers,
    rows,
    footers,
  } = options;

  const activeCompany = companyName || "rstraders's Company";
  const genDate = `${getCurrentBsDate()} BS (${getCurrentAdDate()} AD)`;

  const sheetData: (string | number)[][] = [
    ['COMPANY NAME:', activeCompany],
    ['REPORT TITLE:', reportTitle],
    ['GENERATED ON:', genDate],
    ['DATE RANGE:', dateRange],
  ];

  if (summaryMetrics.length > 0) {
    sheetData.push([
      'SUMMARY METRICS:',
      summaryMetrics.map((m) => `${m.label}: ${m.value}`).join(' | '),
    ]);
  }

  sheetData.push([]); // Empty spacing line
  sheetData.push(headers);

  rows.forEach((row) => {
    sheetData.push(row);
  });

  if (footers) {
    sheetData.push([]);
    sheetData.push(footers);
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // Auto-calculate column widths
  const colWidths = headers.map((h, colIdx) => {
    let maxLen = String(h).length;
    rows.forEach((row) => {
      const cellVal = row[colIdx];
      if (cellVal !== undefined && cellVal !== null) {
        maxLen = Math.max(maxLen, String(cellVal).length);
      }
    });
    return { wch: Math.min(45, Math.max(12, maxLen + 3)) };
  });
  ws['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, 'Report Data');
  const cleanFileName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
  XLSX.writeFile(wb, cleanFileName);
}

/**
 * Exports grouped tables (e.g. Due Date Timeline, Issued Date Log) to Excel (.xlsx)
 */
export function exportGroupedTableToExcel(options: GroupedExportTableOptions) {
  const {
    fileName,
    companyName,
    reportTitle,
    dateRange = 'All Records',
    summaryMetrics = [],
    groups,
    grandTotalFooter,
  } = options;

  const activeCompany = companyName || "rstraders's Company";
  const genDate = `${getCurrentBsDate()} BS (${getCurrentAdDate()} AD)`;

  const sheetData: (string | number)[][] = [
    ['COMPANY NAME:', activeCompany],
    ['REPORT TITLE:', reportTitle],
    ['GENERATED ON:', genDate],
    ['DATE RANGE:', dateRange],
  ];

  if (summaryMetrics.length > 0) {
    sheetData.push([
      'SUMMARY METRICS:',
      summaryMetrics.map((m) => `${m.label}: ${m.value}`).join(' | '),
    ]);
  }

  groups.forEach((group) => {
    sheetData.push([]);
    sheetData.push([
      `SECTION: ${group.groupTitle.toUpperCase()}`,
      group.summaryText ? `(${group.summaryText})` : '',
    ]);
    sheetData.push(group.headers);
    group.rows.forEach((row) => {
      sheetData.push(row);
    });
    if (group.footer) {
      sheetData.push(group.footer);
    }
  });

  if (grandTotalFooter) {
    sheetData.push([]);
    sheetData.push(grandTotalFooter);
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // Column width approximation
  const maxCols = Math.max(...sheetData.map((r) => r.length));
  ws['!cols'] = Array.from({ length: maxCols }, () => ({ wch: 18 }));

  XLSX.utils.book_append_sheet(wb, ws, 'Grouped Report');
  const cleanFileName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
  XLSX.writeFile(wb, cleanFileName);
}
