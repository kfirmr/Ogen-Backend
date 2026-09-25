export enum TCancellationMethod {
  WEB = 'WEB',
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  IN_APP = 'IN_APP',
}

export const CANCELLATION_METHOD_VALUES = Object.values(TCancellationMethod);

// Vendors change their cancellation channels; a looked-up contact is re-checked after this long.
export const CANCELLATION_CONTACT_REFRESH_DAYS = 90;
