// All dates in the CRM use en-GB (DD/MM/YYYY) format.
// Use these helpers everywhere instead of bare toLocaleDateString() calls.

export function formatDate(date: Date | string | number): string {
  return new Date(date).toLocaleDateString("en-GB")
}

export function formatDateTime(date: Date | string | number): string {
  return new Date(date).toLocaleString("en-GB")
}

export function formatTime(date: Date | string | number): string {
  return new Date(date).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  })
}
