import { pickMissingFields } from './object.utility';

interface IVendorFields {
  name: string;
  email: string | null;
  price: string | null;
}

describe('pickMissingFields', () => {
  it('returns candidates only for fields that are still empty', () => {
    const current: IVendorFields = {
      name: 'Netflix',
      email: null,
      price: null,
    };

    const result = pickMissingFields(current, {
      name: 'Other',
      email: 'cancel@netflix.com',
      price: null,
    });

    expect(result).toEqual({ email: 'cancel@netflix.com' });
  });

  it('returns nothing when every field is already resolved', () => {
    const result = pickMissingFields({ name: 'Netflix' }, { name: 'Other' });

    expect(result).toEqual({});
  });
});
