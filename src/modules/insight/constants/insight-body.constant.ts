export const buildOverpayingInsightBody = (
  vendorName: string,
  amount: string,
  averageMarketPrice: string,
): string =>
  `שמנו לב שאתה משלם ${amount} ₪ עבור ${vendorName}, בעוד שהמחיר הממוצע בשוק הוא כ-${averageMarketPrice} ₪. ייתכן שכדאי לבדוק חלופה זולה יותר.`;

export const buildDuplicateInsightBody = (vendorName: string): string =>
  `שמנו לב שיש לך יותר ממנוי פעיל אחד עבור ${vendorName}. ייתכן שאחד מהם מיותר.`;

const VENDOR_NAME_SEPARATOR = ', ';
const LAST_VENDOR_NAME_SEPARATOR = ' ו-';

const joinVendorNames = (vendorNames: string[]): string => {
  const leadingNames = vendorNames.slice(0, -1);
  const lastName = vendorNames[vendorNames.length - 1];

  if (leadingNames.length === 0) {
    return lastName;
  }

  return `${leadingNames.join(VENDOR_NAME_SEPARATOR)}${LAST_VENDOR_NAME_SEPARATOR}${lastName}`;
};

export const buildRedundantServiceInsightBody = (
  serviceLabel: string,
  vendorNames: string[],
): string =>
  `שמנו לב שיש לך יותר ממנוי פעיל אחד ל${serviceLabel}: ${joinVendorNames(vendorNames)}. אפשר להשאיר רק אחד מהם ולחסוך כל חודש.`;

export const buildVendorSpendingSpikeInsightBody = (
  vendorName: string,
  amount: string,
  averageAmount: string,
): string =>
  `החיוב האחרון מ${vendorName} (${amount} ₪) גבוה משמעותית מהממוצע שלך אצל הספק הזה (${averageAmount} ₪). כדאי לבדוק את הצריכה ולנסות לצמצם.`;

export const buildLargePurchaseInsightBody = (
  vendorName: string,
  amount: string,
): string =>
  `ביצעת רכישה גדולה יוצאת דופן אצל ${vendorName} (${amount} ₪). כדאי להיות שמרניים יותר בהוצאות החודש.`;
