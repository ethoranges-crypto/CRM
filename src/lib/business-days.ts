export function todayMidnight(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

// Whether a date falls strictly before today (calendar-day granularity, not
// wall-clock time — a date stamped at today's midnight is never "overdue").
export function isOverdue(date: Date): boolean {
  return date.getTime() < todayMidnight().getTime()
}

// Calendar days (not business days) since a given date, rounded to the
// nearest whole day.
export function daysSince(date: Date): number {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  return Math.round((todayMidnight().getTime() - start.getTime()) / 86_400_000)
}

// Returns number of business days (Mon–Fri) since a given date
export function businessDaysSince(date: Date): number {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  let count = 0
  const d = new Date(start)
  while (d < now) {
    d.setDate(d.getDate() + 1)
    const day = d.getDay()
    if (day !== 0 && day !== 6) count++
  }
  return count
}
