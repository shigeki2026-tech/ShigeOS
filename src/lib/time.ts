const BANGKOK_TZ = 'Asia/Bangkok'

type DateParts = {
  year: number
  month: number
  day: number
}

function getDateParts(timeZone: string, value = new Date()): DateParts {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  const parts = formatter.formatToParts(value)
  const year = Number(parts.find((part) => part.type === 'year')?.value)
  const month = Number(parts.find((part) => part.type === 'month')?.value)
  const day = Number(parts.find((part) => part.type === 'day')?.value)

  return { year, month, day }
}

export function getBangkokToday(): string {
  const { year, month, day } = getDateParts(BANGKOK_TZ)
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function getBangkokMonthKey(): string {
  const { year, month } = getDateParts(BANGKOK_TZ)
  return `${year}-${String(month).padStart(2, '0')}`
}

export function getBangkokMonthRange(): { start: string; end: string } {
  const { year, month } = getDateParts(BANGKOK_TZ)
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  return { start, end }
}

export function getRemainingDaysInBangkokMonth(): number {
  const { year, month, day } = getDateParts(BANGKOK_TZ)
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return Math.max(1, lastDay - day + 1)
}
