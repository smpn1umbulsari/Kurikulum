/**
 * RPE Calculator - SIKAD v4.0
 * Calculate Realistic Processing Education (RPE) weeks based on academic calendar events
 * RPE = Total school days minus weekends, national holidays, and school breaks
 */

import type { AcademicCalendarEvent, AcademicTerm } from '@/types';

export interface RPEWeek {
  weekNumber: number;
  startDate: Date;
  endDate: Date;
  effectiveDays: number;
  holidays: number;
  breaks: number;
  isPartialWeek: boolean;
}

export interface MonthlyRPE {
  month: number;
  year: number;
  monthName: string;
  totalDays: number;
  effectiveDays: number;
  weekends: number;
  holidays: number;
  breaks: number;
  weeks: RPEWeek[];
}

export interface SemesterRPE {
  semester: string;
  tahunAjaran: string;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  effectiveDays: number;
  totalWeeks: number;
  holidays: number;
  breaks: number;
  monthlyBreakdown: MonthlyRPE[];
}

// Event types that count as non-effective days
const NON_EFFECTIVE_TYPES = ['national_holiday', 'break'] as const;

// Weekend days (0 = Sunday, 6 = Saturday)
const WEEKEND_DAYS_5 = [0, 6];
const WEEKEND_DAYS_6 = [0];

/**
 * Check if a date is a weekend
 */
export function isWeekend(date: Date, workingDaysPerWeek: 5 | 6 = 5): boolean {
  const weekends = workingDaysPerWeek === 5 ? WEEKEND_DAYS_5 : WEEKEND_DAYS_6;
  return weekends.includes(date.getDay());
}

/**
 * Check if a date falls on a holiday or break
 */
export function isHolidayOrBreak(date: Date, events: AcademicCalendarEvent[]): boolean {
  const dateStr = formatDateISO(date);
  return events.some(event =>
    event.date === dateStr &&
    NON_EFFECTIVE_TYPES.includes(event.type as typeof NON_EFFECTIVE_TYPES[number]) &&
    event.is_active
  );
}

/**
 * Format date to ISO string (YYYY-MM-DD)
 */
export function formatDateISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse date string to Date object
 */
export function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Get month name in Indonesian
 */
export function getMonthNameIndonesian(month: number): string {
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return months[month];
}

/**
 * Get all dates in a date range
 */
export function getDateRange(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = [];
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * Count effective school days in a date range
 */
export function countEffectiveDays(
  startDate: Date,
  endDate: Date,
  events: AcademicCalendarEvent[],
  workingDaysPerWeek: 5 | 6 = 5
): {
  total: number;
  weekends: number;
  holidays: number;
  breaks: number;
  effective: number;
} {
  const dates = getDateRange(startDate, endDate);

  let weekends = 0;
  let holidays = 0;
  let breaks = 0;

  for (const date of dates) {
    if (isWeekend(date, workingDaysPerWeek)) {
      weekends++;
    } else if (isHolidayOrBreak(date, events)) {
      const event = events.find(e => e.date === formatDateISO(date));
      if (event?.type === 'national_holiday') {
        holidays++;
      } else {
        breaks++;
      }
    }
  }

  const effective = dates.length - weekends - holidays - breaks;

  return {
    total: dates.length,
    weekends,
    holidays,
    breaks,
    effective: Math.max(0, effective),
  };
}

/**
 * Calculate weekly breakdown for RPE
 */
export function calculateWeeklyRPE(
  startDate: Date,
  endDate: Date,
  events: AcademicCalendarEvent[],
  workingDaysPerWeek: 5 | 6 = 5
): RPEWeek[] {
  const weeks: RPEWeek[] = [];
  const dates = getDateRange(startDate, endDate);

  let weekNumber = 1;
  let weekStart: Date | null = null;
  let weekDates: Date[] = [];

  for (const date of dates) {
    if (weekStart === null) {
      weekStart = date;
    }

    weekDates.push(date);

    // End of week (Saturday) or end of range
    if (date.getDay() === 6 || date === dates[dates.length - 1]) {
      const stats = countEffectiveDays(
        weekDates[0],
        weekDates[weekDates.length - 1],
        events,
        workingDaysPerWeek
      );

      weeks.push({
        weekNumber,
        startDate: new Date(weekDates[0]),
        endDate: new Date(weekDates[weekDates.length - 1]),
        effectiveDays: stats.effective,
        holidays: stats.holidays,
        breaks: stats.breaks,
        isPartialWeek: weekDates.length < 7,
      });

      weekNumber++;
      weekStart = null;
      weekDates = [];
    }
  }

  return weeks;
}

/**
 * Calculate monthly RPE breakdown
 */
export function calculateMonthlyRPE(
  startDate: Date,
  endDate: Date,
  events: AcademicCalendarEvent[],
  workingDaysPerWeek: 5 | 6 = 5
): MonthlyRPE[] {
  const monthlyBreakdown: MonthlyRPE[] = [];
  const dates = getDateRange(startDate, endDate);

  // Group dates by month
  const monthGroups = new Map<string, Date[]>();
  for (const date of dates) {
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    if (!monthGroups.has(key)) {
      monthGroups.set(key, []);
    }
    monthGroups.get(key)!.push(date);
  }

  // Calculate stats for each month
  let monthIndex = 1;
  for (const [, monthDates] of monthGroups) {
    const firstDay = monthDates[0];
    const lastDay = monthDates[monthDates.length - 1];
    const stats = countEffectiveDays(firstDay, lastDay, events, workingDaysPerWeek);

    const weeks = calculateWeeklyRPE(firstDay, lastDay, events, workingDaysPerWeek);

    monthlyBreakdown.push({
      month: firstDay.getMonth(),
      year: firstDay.getFullYear(),
      monthName: getMonthNameIndonesian(firstDay.getMonth()),
      totalDays: stats.total,
      effectiveDays: stats.effective,
      weekends: stats.weekends,
      holidays: stats.holidays,
      breaks: stats.breaks,
      weeks,
    });

    monthIndex++;
  }

  return monthlyBreakdown;
}

/**
 * Calculate semester RPE
 */
export function calculateSemesterRPE(
  academicTerm: AcademicTerm,
  events: AcademicCalendarEvent[],
  workingDaysPerWeek: 5 | 6 = 5
): SemesterRPE {
  const startDate = parseDate(academicTerm.tanggal_mulai.split('T')[0]);
  const endDate = parseDate(academicTerm.tanggal_selesai.split('T')[0]);

  const overallStats = countEffectiveDays(startDate, endDate, events, workingDaysPerWeek);
  const monthlyBreakdown = calculateMonthlyRPE(startDate, endDate, events, workingDaysPerWeek);

  // Calculate total weeks from effective days (assuming 5 or 6 days/week)
  const totalWeeks = Math.ceil(overallStats.effective / workingDaysPerWeek);

  return {
    semester: academicTerm.semester,
    tahunAjaran: academicTerm.tahun_ajaran,
    startDate,
    endDate,
    totalDays: overallStats.total,
    effectiveDays: overallStats.effective,
    totalWeeks,
    holidays: overallStats.holidays,
    breaks: overallStats.breaks,
    monthlyBreakdown,
  };
}

/**
 * Get event type color for display
 */
export function getEventTypeColor(type: AcademicCalendarEvent['type']): string {
  const colors: Record<AcademicCalendarEvent['type'], string> = {
    national_holiday: 'bg-red-100 text-red-800 border-red-300',
    school_event: 'bg-blue-100 text-blue-800 border-blue-300',
    exam: 'bg-amber-100 text-amber-800 border-amber-300',
    break: 'bg-green-100 text-green-800 border-green-300',
  };
  return colors[type] || 'bg-neutral-100 text-neutral-800 border-neutral-300';
}

/**
 * Get event type label in Indonesian
 */
export function getEventTypeLabel(type: AcademicCalendarEvent['type']): string {
  const labels: Record<AcademicCalendarEvent['type'], string> = {
    national_holiday: 'Hari Libur Nasional',
    school_event: 'Kegiatan Sekolah',
    exam: 'Ujian',
    break: 'Libur/Cuti',
  };
  return labels[type] || type;
}

/**
 * Get default holidays for Indonesian school year (common national holidays)
 * This is a fallback when no events are loaded
 */
export function getDefaultIndonesianHolidays(year: number): AcademicCalendarEvent[] {
  const holidays: AcademicCalendarEvent[] = [
    { id: 'ny1', academic_year_id: '', date: `${year}-01-01`, type: 'national_holiday', title: 'Tahun Baru Masehi', is_active: true, created_at: '', updated_at: '' },
    { id: 'nyh', academic_year_id: '', date: `${year}-01-01`, type: 'national_holiday', title: '1 Suro (Tahun Baru Hijriah - varies)', is_active: true, created_at: '', updated_at: '' },
    { id: 'independence-day', academic_year_id: '', date: `${year}-08-17`, type: 'national_holiday', title: 'Hari Kemerdekaan RI', is_active: true, created_at: '', updated_at: '' },
  ];

  return holidays;
}

/**
 * Calculate RPE for a specific month (for dashboard display)
 */
export function calculateMonthRPE(
  year: number,
  month: number,
  events: AcademicCalendarEvent[],
  workingDaysPerWeek: 5 | 6 = 5
): MonthlyRPE {
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0);

  const stats = countEffectiveDays(startDate, endDate, events, workingDaysPerWeek);
  const weeks = calculateWeeklyRPE(startDate, endDate, events, workingDaysPerWeek);

  return {
    month,
    year,
    monthName: getMonthNameIndonesian(month),
    totalDays: stats.total,
    effectiveDays: stats.effective,
    weekends: stats.weekends,
    holidays: stats.holidays,
    breaks: stats.breaks,
    weeks,
  };
}
