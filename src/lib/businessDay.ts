/**
 * Utility functions for Restaurant Business Day calculations (IST UTC+05:30).
 */

export function parseSafeDate(dInput: any): Date {
  if (!dInput) return new Date();
  if (dInput instanceof Date) {
    return isNaN(dInput.getTime()) ? new Date() : dInput;
  }
  if (typeof dInput === 'number') {
    return new Date(dInput);
  }
  if (typeof dInput === 'string') {
    const formatted = dInput.trim().replace(' ', 'T');
    const d = new Date(formatted);
    if (!isNaN(d.getTime())) return d;
    const fallback = new Date(dInput);
    if (!isNaN(fallback.getTime())) return fallback;
  }
  return new Date();
}

export function getISTDate(dInput: any = new Date()): Date {
  const date = parseSafeDate(dInput);
  // Calculate exact UTC time in epoch ms, then add 5.5 hours (+05:30 IST offset)
  const utcMs = date.getTime() + (date.getTimezoneOffset() * 60000);
  const istMs = utcMs + (5.5 * 3600000);
  return new Date(istMs);
}

/**
 * Returns the restaurant business date string (YYYY-MM-DD) for a given timestamp.
 * Standard cutoff: If local IST time is before 04:00 AM, it is considered part of the previous calendar day's business session.
 */
export function getRestaurantBusinessDateStr(dInput: any = new Date()): string {
  const ist = getISTDate(dInput);
  const hour = ist.getHours();
  
  // Cutoff at 4:00 AM IST for late night operating hours
  if (hour < 4) {
    ist.setDate(ist.getDate() - 1);
  }
  
  const year = ist.getFullYear();
  const month = String(ist.getMonth() + 1).padStart(2, '0');
  const day = String(ist.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns UTC ISO bounds for a given business date string (YYYY-MM-DD).
 */
export function getBusinessDateBoundsISO(dateStr: string) {
  const startISO = new Date(`${dateStr}T00:00:00+05:30`).toISOString();
  
  const nextDateObj = new Date(`${dateStr}T00:00:00+05:30`);
  nextDateObj.setDate(nextDateObj.getDate() + 1);
  const year = nextDateObj.getFullYear();
  const month = String(nextDateObj.getMonth() + 1).padStart(2, '0');
  const day = String(nextDateObj.getDate()).padStart(2, '0');
  
  const endISO = new Date(`${year}-${month}-${day}T03:59:59.999+05:30`).toISOString();
  
  return { startISO, endISO };
}
