import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Creates a safe HTML string with dangerouslySetInnerHTML
 * Use this for content from trusted sources like API data that includes HTML tags
 * @param html HTML string to create safe object from
 * @returns Object to use with dangerouslySetInnerHTML
 */
export function createMarkup(html: string | null) {
  return {
    __html: html || ''
  };
}

/**
 * Convert an array of objects to CSV and trigger download
 * @param data Array of objects to convert
 * @param filename Name of the file to download
 */
export function downloadAsCSV(data: Record<string, any>[], filename: string) {
  if (!data || !data.length) {
    return;
  }
  
  // Get headers from the first object
  const headers = Object.keys(data[0]);
  
  // Convert data to CSV format
  const csvRows = [];
  
  // Add headers row
  csvRows.push(headers.join(','));
  
  // Add data rows
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header] || '';
      // Escape quotes and wrap with quotes if value contains comma, quote, or newline
      const escaped = typeof value === 'string' ? value.replace(/"/g, '""') : value;
      if (typeof escaped === 'string' && (escaped.includes(',') || escaped.includes('"') || escaped.includes('\n'))) {
        return `"${escaped}"`;
      }
      return escaped;
    });
    csvRows.push(values.join(','));
  }
  
  // Create CSV content
  const csvString = csvRows.join('\n');
  
  // Create a blob and download
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  // Create a temporary link element
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.display = 'none';
  
  // Add link to the document, click it, and remove it
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Revoke the created object URL to free up resources
  setTimeout(() => URL.revokeObjectURL(url), 100);
}
