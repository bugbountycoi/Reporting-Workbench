import {
  format,
  fromUnixTime,
  startOfDay,
  startOfWeek,
  eachDayOfInterval,
  eachWeekOfInterval,
  differenceInDays,
  parseISO,
} from 'date-fns'

export function unixToDate(unix: number): Date {
  return fromUnixTime(unix)
}

export function unixToDateString(unix: number): string {
  return format(fromUnixTime(unix), 'yyyy-MM-dd')
}

export function unixToWeekLabel(unix: number): string {
  return format(startOfWeek(fromUnixTime(unix), { weekStartsOn: 1 }), 'yyyy-MM-dd')
}

export function formatDate(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function daysBetween(unix: number): number {
  return differenceInDays(new Date(), fromUnixTime(unix))
}

export function dateToUnix(date: Date): number {
  return Math.floor(date.getTime() / 1000)
}

export function isoToDate(iso: string): Date {
  return parseISO(iso)
}

export { startOfDay, startOfWeek, eachDayOfInterval, eachWeekOfInterval, format, fromUnixTime }
