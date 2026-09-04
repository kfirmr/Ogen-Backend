import { z } from 'zod';
import { MONEY_REGEX } from '@Constants/money';
import { TServiceType } from '@Modules/vendor/constants/service-type.constant';
import { TVendorCategory } from '@Modules/vendor/constants/vendor-category.constant';
import { TBillingCycle } from '@Modules/subscription/constants/billing-cycle.constant';

export const CLASSIFICATION_MODEL = 'claude-haiku-4-5';

export const CLASSIFICATION_MAX_TOKENS = 1024;

export const CLASSIFICATION_SYSTEM_PROMPT = `You classify a single raw bank-transaction description from an Israeli bank statement (the text may be in Hebrew or English, and may contain merchant codes, dates, or punctuation noise). Identify the underlying vendor and return:

- vendorName: a clean, human-readable merchant name (e.g. "Netflix", not "NETFLIX.COM* 1234").
- category: the closest fit from the given category enum; use GROCERIES for supermarkets, grocery, and convenience stores (e.g. Carrefour, Super-Pharm groceries, a local mini-market); use DINING for restaurants, cafes, bars, and food delivery/takeout; use TRANSPORTATION for taxis, ride-hailing, public transit, and fuel/parking; use OTHER only when nothing else fits.
- isLikelySubscription: default to false. Only set true when you are confident this specific charge is an ongoing recurring plan with a fixed billing cycle — a streaming/software plan, an insurance policy, a utility or communication bill, or a fitness/studio MEMBERSHIP (not a single class, drop-in visit, or day pass). Treat the Hebrew suffix "הו״ק" or the phrase "הוראת קבע" (a standing bank order) anywhere in the description as a strong signal of a recurring charge — the bank itself is telling you this specific charge repeats — so lean toward true for those unless the vendor is clearly a one-off use case. Never mark true for a one-off retail or e-commerce purchase (a single Amazon/online-store order, a single grocery run, a single item bought at a shop, a cash withdrawal, a P2P transfer) even if the vendor also happens to sell subscriptions elsewhere. If the amount looks more like a one-time purchase or a small ad-hoc fee than a real plan price, mark false. When genuinely unsure, mark false.
- billingCycle: your best guess at how often it recurs, or null if isLikelySubscription is false or the cadence is unclear.
- cancellationEmail: a real, well-known cancellation/support email for this vendor ONLY if you are highly confident it is accurate. Otherwise null. Never invent or guess an email address.
- estimatedAveragePrice: your best estimate, in ILS, of the typical/average price for this exact vendor's subscription or service, as a plain decimal string with up to 2 decimal places (e.g. "39.90") — ONLY if you are reasonably confident. Otherwise null. Never invent or guess a number.
- serviceType: the specific interchangeable service the user is paying for, so that two vendors offering the same service share the same value (e.g. Netflix and Disney+ are both VIDEO_STREAMING; Gold's Gym and Icon Fitness are both GYM_MEMBERSHIP). Use NONE whenever the vendor is not one of the listed services, or when a household would reasonably pay several such vendors at once (utilities, communication lines, insurance policies).`;

export const VendorClassificationSchema = z.object({
  vendorName: z.string().min(1),
  category: z.nativeEnum(TVendorCategory),
  isLikelySubscription: z.boolean(),
  serviceType: z.nativeEnum(TServiceType),
  billingCycle: z.nativeEnum(TBillingCycle).nullable(),
  cancellationEmail: z.string().nullable(),
  estimatedAveragePrice: z.string().regex(MONEY_REGEX.AMOUNT).nullable(),
});
