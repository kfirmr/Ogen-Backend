import { Vendor } from '@Modules/vendor/entities/vendor.entity';
import { IVendorNameEntry } from '@Modules/vendor/interfaces/vendor.interface';
import { IVendorClassification } from '@Modules/vendor-classifier/interfaces/vendor-classification.interface';

interface IClassifiedVendorSource {
  knownVendor: Vendor | null;
  classification: IVendorClassification;
}

// A known-but-unclassified vendor keeps its own name so re-classifying it backfills that vendor
// instead of creating a sibling under whatever name the classifier extracted this time.
export const toVendorNameEntry = (
  source: IClassifiedVendorSource,
): IVendorNameEntry => ({
  name: source.knownVendor?.name ?? source.classification.vendorName,
  defaults: {
    category: source.classification.category,
    chargeKind: source.classification.chargeKind,
    serviceType: source.classification.serviceType,
    billingCycle: source.classification.billingCycle,
    averageMarketPrice: source.classification.estimatedAveragePrice,
  },
});
