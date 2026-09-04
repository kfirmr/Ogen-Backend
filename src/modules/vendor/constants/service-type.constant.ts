// Only services where a second active subscription is genuinely redundant; NONE covers the rest,
// since multiple utilities, insurances or communication lines are legitimate.
export enum TServiceType {
  VPN = 'VPN',
  NONE = 'NONE',
  FITNESS_APP = 'FITNESS_APP',
  DESIGN_TOOL = 'DESIGN_TOOL',
  AI_ASSISTANT = 'AI_ASSISTANT',
  CLOUD_STORAGE = 'CLOUD_STORAGE',
  GYM_MEMBERSHIP = 'GYM_MEMBERSHIP',
  MUSIC_STREAMING = 'MUSIC_STREAMING',
  VIDEO_STREAMING = 'VIDEO_STREAMING',
  PASSWORD_MANAGER = 'PASSWORD_MANAGER',
  PRODUCTIVITY_SUITE = 'PRODUCTIVITY_SUITE',
  GAMING_SUBSCRIPTION = 'GAMING_SUBSCRIPTION',
}

export const SERVICE_TYPE_VALUES = Object.values(TServiceType);

export const SERVICE_TYPE_LABELS: Record<TServiceType, string> = {
  [TServiceType.NONE]: 'שירות דומה',
  [TServiceType.VPN]: 'שירות VPN',
  [TServiceType.AI_ASSISTANT]: 'עוזר AI',
  [TServiceType.DESIGN_TOOL]: 'כלי עיצוב',
  [TServiceType.GYM_MEMBERSHIP]: 'חדר כושר',
  [TServiceType.CLOUD_STORAGE]: 'אחסון בענן',
  [TServiceType.VIDEO_STREAMING]: 'סטרימינג וידאו',
  [TServiceType.FITNESS_APP]: 'אפליקציית כושר',
  [TServiceType.MUSIC_STREAMING]: 'סטרימינג מוזיקה',
  [TServiceType.PASSWORD_MANAGER]: 'מנהל סיסמאות',
  [TServiceType.GAMING_SUBSCRIPTION]: 'שירות גיימינג',
  [TServiceType.PRODUCTIVITY_SUITE]: 'חבילת תוכנה לעבודה',
};
