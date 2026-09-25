import { Vendor } from '@Modules/vendor/entities/vendor.entity';
import { TRecordedCancellationContact } from '../constants/cancellation-contact.constant';
import { TCancellationMethod } from '@Modules/vendor/constants/cancellation-method.constant';
import { ICancellationContact } from '@Modules/vendor/interfaces/cancellation-contact.interface';

// A method is only usable when the channel it needs was actually found; IN_APP can be followed
// from the app itself even without a link.
const HAS_REQUIRED_CHANNEL: Record<
  TCancellationMethod,
  (contact: TRecordedCancellationContact) => boolean
> = {
  [TCancellationMethod.IN_APP]: () => true,
  [TCancellationMethod.WEB]: (contact) => contact.url != null,
  [TCancellationMethod.EMAIL]: (contact) => contact.email != null,
  [TCancellationMethod.PHONE]: (contact) => contact.phone != null,
};

export const buildContactLookupMessage = (vendor: Vendor): string =>
  [
    `Vendor: ${vendor.name}`,
    `Category: ${vendor.category ?? 'unknown'}`,
    'Country: Israel',
  ].join('\n');

export const toCancellationContact = (
  recorded: TRecordedCancellationContact | null,
): ICancellationContact | null => {
  if (recorded?.method == null) {
    return null;
  }

  if (!HAS_REQUIRED_CHANNEL[recorded.method](recorded)) {
    return null;
  }

  return {
    url: recorded.url,
    email: recorded.email,
    phone: recorded.phone,
    method: recorded.method,
    sourceUrl: recorded.sourceUrl,
  };
};
