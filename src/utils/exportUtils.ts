// Export utilities for Reports & Logs (CSV, Excel-compatible XML/CSV, Print to PDF)

export function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function downloadExcel(filename: string, headers: string[], rows: (string | number)[][]) {
  // Generates an Excel-parseable HTML Table string (.xls)
  const headerHTML = headers.map((h) => `<th style="background-color:#1e293b;color:#ffffff;font-weight:bold;padding:8px;">${h}</th>`).join('');
  const rowsHTML = rows
    .map(
      (row) =>
        `<tr>${row.map((cell) => `<td style="padding:6px;border:1px solid #e2e8f0;">${cell}</td>`).join('')}</tr>`
    )
    .join('');

  const excelTemplate = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8"/>
        <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
        <x:Name>Report</x:Name>
        <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
        </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
      </head>
      <body style="font-family:Arial, sans-serif;">
        <h2>ITDB Server Monitor - Report Export: ${filename}</h2>
        <p>Generated at: ${new Date().toLocaleString()}</p>
        <table border="1" style="border-collapse:collapse;">
          <thead><tr>${headerHTML}</tr></thead>
          <tbody>${rowsHTML}</tbody>
        </table>
      </body>
    </html>
  `;

  const blob = new Blob([excelTemplate], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.xls`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function printPDF(reportTitle: string, contentElementId: string) {
  const element = document.getElementById(contentElementId);
  if (!element) return;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to export to PDF');
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>ITDB Server Monitor Report - ${reportTitle}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #0f172a; }
          h1 { color: #0284c7; margin-bottom: 4px; }
          .meta { color: #64748b; font-size: 13px; margin-bottom: 24px; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th { background: #0f172a; color: #fff; text-align: left; padding: 10px; font-size: 12px; }
          td { padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
          tr:nth-child(even) { background: #f8fafc; }
          .badge { padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; display: inline-block; }
          .badge-critical { background: #fee2e2; color: #991b1b; }
          .badge-warning { background: #fef3c7; color: #92400e; }
          .badge-normal { background: #dcfce7; color: #166534; }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <h1>ITDB Server Monitor Monitoring Report</h1>
        <div class="meta">
          <strong>Report:</strong> ${reportTitle} | <strong>Generated on:</strong> ${new Date().toLocaleString()} | <strong>Scope:</strong> ITDB Infrastructure Network
        </div>
        ${element.innerHTML}
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 500);
}
