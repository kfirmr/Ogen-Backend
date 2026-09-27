import {
  TVendorCategory,
  VENDOR_CATEGORY_VALUES,
} from '../constants/vendor-category.constant';

const isVendorCategory = (value?: unknown): value is TVendorCategory =>
  VENDOR_CATEGORY_VALUES.some((category) => category === value);

// Aggregated rows come back untyped; anything that is not a known category counts as uncategorized.
export const toVendorCategory = (value?: unknown): TVendorCategory | null => {
  if (!isVendorCategory(value)) {
    return null;
  }

  return value;
};
