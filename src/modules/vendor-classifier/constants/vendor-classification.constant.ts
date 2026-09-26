import { z } from 'zod';
import { MONEY_REGEX } from '@Constants/money';
import { TChargeKind } from '@Modules/vendor/constants/charge-kind.constant';
import { TServiceType } from '@Modules/vendor/constants/service-type.constant';
import { TVendorCategory } from '@Modules/vendor/constants/vendor-category.constant';
import { TBillingCycle } from '@Modules/subscription/constants/billing-cycle.constant';

export const CLASSIFICATION_MODEL = 'claude-haiku-4-5';

export const CLASSIFICATION_MAX_TOKENS = 1024;

export const CLASSIFICATION_SYSTEM_PROMPT = `You classify a single raw bank-transaction description from an Israeli bank statement (the text may be in Hebrew or English, and may contain merchant codes, dates, or punctuation noise). Identify the underlying vendor and return:

- vendorName: a clean, human-readable merchant name (e.g. "Netflix", not "NETFLIX.COM* 1234").
- category: the closest fit from the given category enum; use GROCERIES for supermarkets, grocery, and convenience stores (e.g. Carrefour, Super-Pharm groceries, a local mini-market); use DINING for restaurants, cafes, bars, and food delivery/takeout; use TRANSPORTATION for taxis, ride-hailing, and public transit; use FUEL_ENERGY for gas stations and home energy providers; use SHOPPING_APPAREL for clothing, shoes, and general retail; use ELECTRONICS for phones, computers, and appliances; use HOME_DESIGN for furniture, décor, and home-improvement stores; use COSMETICS for beauty, skincare, and personal-care products; use PETS for pet food, supplies, and veterinary care; use KIDS_EDUCATION for childcare, tuition, and school supplies; use BOOKS_PRINT for books, stationery, and printing services; use LEISURE_SPORTS for hobbies, sporting goods, and entertainment venues; use TRAVEL_VACATIONS for flights, hotels, and trip bookings; use GOVERNMENT for taxes, fines, and municipal payments; use FINANCIAL_FEES for bank charges, ATM fees, and interest charges; use DEBT_REPAYMENT for loan and credit repayments; use MONEY_TRANSFER for P2P transfers and money-transfer services; use OTHER only when nothing else fits.
- chargeKind: what kind of charge this is. Default to ONE_OFF.
  - SUBSCRIPTION: an ongoing plan the user signed up for and could cancel with the vendor — a streaming/software/app plan, a digital service, or a fitness/studio MEMBERSHIP (not a single class, drop-in visit, or day pass). A charge from a gym, CrossFit box, or fitness/yoga/pilates studio with nothing marking it as a single visit is a membership. Only choose it when you are confident this specific charge is such a plan.
  - ESSENTIAL_BILL: a recurring household bill for an essential or regulated service that is not "cancelled" but only paid or switched between providers — electricity (e.g. חברת החשמל), water corporations (e.g. מי רמת גן, מי אביבים), gas, municipal property tax (ארנונה) and other government or municipal payments, any insurance policy (health, car, home, life, pension-linked), and mobile, internet, landline, or TV communication lines. Always choose ESSENTIAL_BILL for these, even when the charge is a standing order.
  - ONE_OFF: everything else — a single retail or e-commerce purchase, a grocery run, a restaurant, fuel, a cash withdrawal, a P2P transfer, a small ad-hoc fee — even if the vendor also sells subscriptions elsewhere. When genuinely unsure, choose ONE_OFF.
  The Hebrew suffix "הו״ק" or the phrase "הוראת קבע" (a standing bank order) means the bank itself says this charge repeats: prefer SUBSCRIPTION over ONE_OFF for those, but never over ESSENTIAL_BILL.
- billingCycle: your best guess at how often it recurs, or null if chargeKind is ONE_OFF or the cadence is unclear.
- estimatedAveragePrice: your best estimate, in ILS, of the typical/average price for this exact vendor's subscription or service, as a plain decimal string with up to 2 decimal places (e.g. "39.90") — ONLY if you are reasonably confident. Otherwise null. Never invent or guess a number.
- serviceType: the specific interchangeable service the user is paying for, so that two vendors offering the same service share the same value (e.g. Netflix and Disney+ are both VIDEO_STREAMING; Gold's Gym and Icon Fitness are both GYM_MEMBERSHIP). Use NONE whenever the vendor is not one of the listed services, or when a household would reasonably pay several such vendors at once (utilities, communication lines, insurance policies). Decide serviceType from what the vendor sells, independently of chargeKind: a gym, CrossFit box, or fitness/yoga/pilates/climbing studio is GYM_MEMBERSHIP even when you chose ONE_OFF for this charge.`;

export const CONFIRMED_SUBSCRIPTION_SYSTEM_PROMPT = `The user's own bank history has already proven that each vendor below charges them a steady amount on a steady billing cycle, so treat every item as an ongoing subscription the user signed up for: set chargeKind to SUBSCRIPTION unless it is an ESSENTIAL_BILL, and choose the serviceType that plan belongs to.`;

export const VendorClassificationSchema = z.object({
  vendorName: z.string().min(1),
  category: z.nativeEnum(TVendorCategory),
  chargeKind: z.nativeEnum(TChargeKind),
  serviceType: z.nativeEnum(TServiceType),
  billingCycle: z.nativeEnum(TBillingCycle).nullable(),
  estimatedAveragePrice: z.string().regex(MONEY_REGEX.AMOUNT).nullable(),
});

export const CLASSIFICATION_BATCH_SIZE = 20;

export const CLASSIFICATION_BATCH_MAX_TOKENS = 8192;

export const CLASSIFICATION_BATCH_SYSTEM_PROMPT = `${CLASSIFICATION_SYSTEM_PROMPT}

You will receive a JSON array of transaction descriptions, each tagged with an index, e.g. [{"index": 0, "description": "..."}, {"index": 1, "description": "..."}]. Classify every item independently using the rules above, and return exactly one classification per input item, each carrying back the same "index" value it was given, so the caller can match your output to the correct input even if your response reorders or omits an item.`;

export const CONFIRMED_SUBSCRIPTION_BATCH_SYSTEM_PROMPT = `${CLASSIFICATION_BATCH_SYSTEM_PROMPT}

${CONFIRMED_SUBSCRIPTION_SYSTEM_PROMPT}`;

export const VendorClassificationBatchItemSchema =
  VendorClassificationSchema.extend({
    index: z.number().int(),
  });

export const VendorClassificationBatchSchema = z.object({
  classifications: z.array(VendorClassificationBatchItemSchema),
});
