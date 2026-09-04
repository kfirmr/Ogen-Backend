import {
  TIME_ZONE,
  TIME_UNITS,
  DATE_FORMATS,
  TIME_UNITS_TEXT,
} from '@Constants/date';

import moment from 'moment-timezone';

export const getStartOfToday = (): Date => {
  const today = new Date();

  today.setHours(0, 0, 0, 0);

  return today;
};

export const getXDaysAgo = (days: number): Date => {
  const date = getStartOfToday();

  date.setDate(date.getDate() - days);

  return date;
};

export const calculateDateDifference = (
  startDate: Date,
  endDate: Date,
): number => {
  const momentStartDate = moment(startDate);
  const momentEndDate = moment(endDate);

  return momentEndDate.diff(momentStartDate, TIME_UNITS_TEXT.DAYS);
};

export const isValidDate = (date: Date | string | number): boolean => {
  const parsed = new Date(date);

  return !isNaN(parsed.getTime());
};

export const formatDate = (
  date?: Date | string | number | null,
  format: string = DATE_FORMATS.HEBREW_FULL_WITH_SLASHES,
): string => {
  if (!date) {
    return '';
  }

  if (!isValidDate(date)) {
    return '';
  }

  return moment(date).tz(TIME_ZONE).format(format);
};

export const describeDurationMs = (durationMs: number): string => {
  const totalMinutes = Math.round(durationMs / TIME_UNITS.MINUTES);

  if (totalMinutes < 60) {
    return `${totalMinutes} ${totalMinutes === 1 ? 'minute' : 'minutes'}`;
  }

  const totalHours = Math.round(durationMs / TIME_UNITS.HOURS);

  if (totalHours < 24) {
    return `${totalHours} ${totalHours === 1 ? 'hour' : 'hours'}`;
  }

  const totalDays = Math.round(durationMs / TIME_UNITS.DAYS);

  return `${totalDays} ${totalDays === 1 ? 'day' : 'days'}`;
};
