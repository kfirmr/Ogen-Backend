import { z } from 'zod';
import { DATA_LENGTHS } from '@Constants/data-length';
import { TCancellationMethod } from '@Modules/vendor/constants/cancellation-method.constant';

// The cheapest model with web search: the lookup is a narrow fact-finding task, and every search
// result is fed back as input tokens, so model price dominates its cost.
export const CANCELLATION_CONTACT_MODEL = 'claude-haiku-4-5';

export const CANCELLATION_CONTACT_MAX_TOKENS = 4096;

export const CANCELLATION_CONTACT_MAX_SEARCHES = 3;

export const CANCELLATION_CONTACT_MAX_ITERATIONS = 4;

export const RECORD_CONTACT_TOOL_NAME = 'record_cancellation_contact';

export const CANCELLATION_CONTACT_SYSTEM_PROMPT = `You find out how an Israeli consumer cancels a specific recurring subscription, so an app can cancel it on their behalf.

Search the web for the vendor's own published cancellation instructions: its official website, its terms of use (תקנון), or a cancellation page (ביטול מנוי, ביטול עסקה, ביטול הוראת קבע). Prefer the vendor's official pages over third-party sites.

Choose the primary method the vendor offers:
- EMAIL when the vendor accepts cancellation requests by email; give the exact address it publishes.
- WEB when there is an online cancellation form or account page; give that page's URL.
- IN_APP when cancellation only happens inside its mobile app or an app store subscription page; give that page's URL if one exists.
- PHONE when cancellation is only by phone; give the number.

Also fill any other channel you found (for example the email even when the primary method is WEB). Report only details you actually saw on a page during this search, and set sourceUrl to that page. Never guess an address, URL or phone number. If you cannot find the vendor's cancellation channel, record method null.

Finish by calling ${RECORD_CONTACT_TOOL_NAME} exactly once.`;

export const CancellationContactSchema = z.object({
  method: z.nativeEnum(TCancellationMethod).nullable(),
  url: z.string().url().max(DATA_LENGTHS.URL).nullable(),
  email: z.string().email().max(DATA_LENGTHS.EMAIL).nullable(),
  phone: z.string().min(1).max(DATA_LENGTHS.PHONE).nullable(),
  sourceUrl: z.string().url().max(DATA_LENGTHS.URL).nullable(),
});

export type TRecordedCancellationContact = z.infer<
  typeof CancellationContactSchema
>;
