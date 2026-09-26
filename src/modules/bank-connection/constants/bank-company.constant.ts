// Values are israeli-bank-scrapers CompanyTypes ids, so the worker passes them straight through.
export enum TBankCompany {
  MAX = 'max',
  LEUMI = 'leumi',
  YAHAV = 'yahav',
  UNION = 'union',
  MASSAD = 'massad',
  PAGI = 'pagi',
  AMEX = 'amex',
  MIZRAHI = 'mizrahi',
  ONE_ZERO = 'oneZero',
  DISCOUNT = 'discount',
  HAPOALIM = 'hapoalim',
  ISRACARD = 'isracard',
  VISA_CAL = 'visaCal',
  BEINLEUMI = 'beinleumi',
  BEHATSDAA = 'behatsdaa',
  MERCANTILE = 'mercantile',
  OTSAR_HAHAYAL = 'otsarHahayal',
  BEYAHAD_BISHVILHA = 'beyahadBishvilha',
}

export const BANK_COMPANY_VALUES = Object.values(TBankCompany);
