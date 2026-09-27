import { toVendorCategory } from './vendor-category.utility';
import { TVendorCategory } from '../constants/vendor-category.constant';

describe('toVendorCategory', () => {
  it('keeps a known category', () => {
    expect(toVendorCategory('GROCERIES')).toBe(TVendorCategory.GROCERIES);
  });

  it('treats a missing category as uncategorized', () => {
    expect(toVendorCategory(null)).toBeNull();
  });

  it('treats an unknown value as uncategorized', () => {
    expect(toVendorCategory('NOT_A_CATEGORY')).toBeNull();
  });
});
