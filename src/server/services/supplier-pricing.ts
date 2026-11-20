// Supplier Pricing -- shared interfaces, comparison logic, and types.
// Provider adapters (Menards, Lowe's) implement SupplierProvider.
// Neither retailer offers a public API; both adapters return
// awaiting_authorization status until official credentials are obtained.

export type SupplierName = "Menards" | "Lowe's";
export type ComparisonStatus = 'complete' | 'incomplete' | 'unavailable' | 'unit_mismatch';

export interface SupplierPrice {
  supplier: SupplierName;
  retailerProductId: string;
  sku?: string;
  upc?: string;
  productName: string;
  unit: string;
  unitPrice: number;
  productUrl?: string;
  storeLocation: string;
  verifiedAt: Date;
}

export interface SupplierProvider {
  readonly name: SupplierName;
  readonly storeLocation: string;
  searchProducts(query: string): Promise<SupplierPrice[]>;
  getProductPrice(retailerProductId: string): Promise<SupplierPrice | null>;
  getConnectionStatus(): Promise<ProviderStatus>;
}

export interface ProviderStatus {
  supplier: SupplierName;
  connectionStatus: 'connected' | 'awaiting_authorization' | 'error' | 'unconfigured';
  message: string;
  lastChecked: Date;
}

export interface PriceComparisonResult {
  menards: SupplierPrice | null;
  lowes: SupplierPrice | null;
  selectedPrice: number | null;
  selectedSupplier: SupplierName | null;
  comparisonStatus: ComparisonStatus;
}

/**
 * Selects the higher verified price between two suppliers.
 * Only compares prices when both units match exactly.
 * Never substitutes an AI-generated estimate for a verified retailer price.
 */
export function selectHigherVerifiedPrice(
  menards: SupplierPrice | null,
  lowes: SupplierPrice | null,
): PriceComparisonResult {
  if (!menards && !lowes) {
    return { menards, lowes, selectedPrice: null, selectedSupplier: null, comparisonStatus: 'unavailable' };
  }

  if (!menards || !lowes) {
    const available = menards ?? lowes!;
    return {
      menards,
      lowes,
      selectedPrice: available.unitPrice,
      selectedSupplier: available.supplier,
      comparisonStatus: 'incomplete',
    };
  }

  if (menards.unit.toLowerCase().trim() !== lowes.unit.toLowerCase().trim()) {
    return { menards, lowes, selectedPrice: null, selectedSupplier: null, comparisonStatus: 'unit_mismatch' };
  }

  const selected = menards.unitPrice >= lowes.unitPrice ? menards : lowes;
  return {
    menards,
    lowes,
    selectedPrice: selected.unitPrice,
    selectedSupplier: selected.supplier,
    comparisonStatus: 'complete',
  };
}
