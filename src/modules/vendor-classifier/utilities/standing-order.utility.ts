// The bank itself marks a charge as a standing order via "הו"ק" (or the spelled-out "הוראת קבע")
// in the merchant description, so that's a deterministic recurring-charge signal the AI classifier
// should never have to guess at.
const STANDING_ORDER_PATTERN = /הו["״]ק|הוראת קבע/;

export const hasStandingOrderMarker = (description: string): boolean =>
  STANDING_ORDER_PATTERN.test(description);
