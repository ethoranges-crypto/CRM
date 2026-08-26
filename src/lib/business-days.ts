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
