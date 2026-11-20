// Product matcher -- determines whether two products represent equivalent materials.
//
// Equivalence rules (ALL must pass):
//   1. Unit must match exactly (each vs each, linear ft vs linear ft, etc.)
//   2. Dimensions must match (2x4 != 2x6; 8ft != 10ft)
//   3. Treatment must match (untreated != pressure-treated)
//   4. Species/material class must match (pine != cedar != redwood)
//   5. Grade must match where determinable (standard/stud != premium/select)
//   6. Intended use must be compatible (framing != insulation != decking)
//
// A missing attribute is treated as "unknown" and does NOT block a match
// unless the other product has a clearly incompatible attribute.

import type { SupplierPrice } from './supplier-pricing.js';

export interface MatchResult {
  isEquivalent: boolean;
  confidence: 'high' | 'medium'  | 'low' | 'none';
  reason: string;
  exclusionReason?: string;
}

export type ProductCategory =
  | 'standard_framing'
  | 'pressure_treated'
  | 'premium_lumber'
  | 'cedar_redwood'
  | 'engineered_lumber'
  | 'plywood_osb'
  | 'insulation'
  | 'drywall'
  | 'concrete_masonry'
  | 'fasteners'
  | 'specialty'
  | 'unrelated';

export interface ClassifiedProduct {
  category: ProductCategory;
  dimensions: string[];      // e.g. ["2x4", "8ft"]
  treatment: string;         // "none" | "pressure_treated" | "fire_retardant" | "unknown"
  species: string;           // "pine" | "fir" | "cedar" | "redwood" | "spruce" | "unknown"
  grade: string;             // "standard" | "select" | "premium" | "stud" | "unknown"
  isLumber: boolean;
}

// ─── Normalisation helpers ────────────────────────────────────────────────────

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s.x]/g, ' ').replace(/\s+/g, ' ').trim();
}

// Extract dimension tokens: "2x4", "2 x 4", "2x4x8", "8'", "8 ft", "8-ft"
function extractDimensions(name: string): string[] {
  const n = norm(name);
  const dims: string[] = [];

  // Cross-section like 2x4, 2x6, 4x4, 2x4x8, 2x6x10
  const crossSection = n.match(/\b(\d+)\s*x\s*(\d+)(?:\s*x\s*(\d+))?\b/g);
  if (crossSection) dims.push(...crossSection.map(d => d.replace(/\s/g, '')));

  // Standalone lengths: "8'", "8 ft", "8-ft", "8 foot", "10ft", "12 ft"
  const lengths = n.match(/\b(\d+)\s*(?:ft|foot|feet|')\b/g);
  if (lengths) dims.push(...lengths.map(d => d.replace(/\s/g, '').replace(/foot|feet/, 'ft').replace(/'/, 'ft')));

  return [...new Set(dims)];
}

// ─── Treatment detection ──────────────────────────────────────────────────────

const PT_SIGNALS = [
  'pressure.?treat', 'pressure treat', ' pt ', '\\bpt\\b', 'treated lumber',
  'ground contact', 'above ground', 'ac2', 'acq', 'ca-c', 'mca', 'cca',
  'weather shield', 'weathershield', 'preserve', 'prowood', 'yellawood',
  'brown treated', 'green treated',
];
const FR_SIGNALS = ['fire.?retardant', 'fire treat', '\\bfrt\\b'];

function detectTreatment(name: string): string {
  const n = norm(name);
  if (PT_SIGNALS.some(p => new RegExp(p).test(n))) return 'pressure_treated';
  if (FR_SIGNALS.some(p => new RegExp(p).test(n))) return 'fire_retardant';
  return 'none';
}

// ─── Species detection ────────────────────────────────────────────────────────

function detectSpecies(name: string): string {
  const n = norm(name);
  if (/\bcedar\b/.test(n)) return 'cedar';
  if (/\bredwood\b/.test(n)) return 'redwood';
  if (/\bpine\b/.test(n)) return 'pine';
  if (/\bfir\b/.test(n)) return 'fir';
  if (/\bspruce\b/.test(n)) return 'spruce';
  if (/\bhemlock\b/.test(n)) return 'hemlock';
  if (/\bpoplar\b/.test(n)) return 'poplar';
  if (/\boak\b/.test(n)) return 'oak';
  if (/\bspl\b|southern.?pine|spf\b/.test(n)) return 'pine';
  return 'unknown';
}

// ─── Grade detection ──────────────────────────────────────────────────────────

function detectGrade(name: string): string {
  const n = norm(name);
  if (/\bselect\b|\bpremium\b|\bclear\b|\bfinish\b|\b#1\b/.test(n)) return 'premium';
  if (/\bstud\b/.test(n)) return 'stud';
  if (/\bconstruction\b|\bframing\b|\bstandard\b|\b#2\b|\butility\b/.test(n)) return 'standard';
  return 'unknown';
}

// ─── Category classification ──────────────────────────────────────────────────

export function classifyProduct(name: string): ClassifiedProduct {
  const n = norm(name);
  const treatment = detectTreatment(n);
  const species = detectSpecies(n);
  const grade = detectGrade(n);
  const dimensions = extractDimensions(name);

  // Pressure-treated always its own category
  if (treatment === 'pressure_treated') {
    return { category: 'pressure_treated', dimensions, treatment, species, grade, isLumber: true };
  }

  // Cedar / redwood — specialty species
  if (species === 'cedar' || species === 'redwood') {
    return { category: 'cedar_redwood', dimensions, treatment, species, grade, isLumber: true };
  }

  // Engineered lumber
  if (/\blvl\b|\bglulam\b|\blaminated\b|\bi.?joist\b|\brim board\b|\bparallam\b/.test(n)) {
    return { category: 'engineered_lumber', dimensions, treatment, species, grade, isLumber: true };
  }

  // Plywood / OSB / sheathing
  if (/\bplywood\b|\bosb\b|\boriented strand\b|\bsheathing\b|\bsubfloor\b/.test(n)) {
    return { category: 'plywood_osb', dimensions, treatment, species: 'unknown', grade, isLumber: false };
  }

  // Insulation — must never match lumber
  if (/\binsulat\b|\bfoam\b|\bfiberglass\b|\bmineral wool\b|\brock wool\b|\bbatt\b|\bblown\b/.test(n)) {
    return { category: 'insulation', dimensions, treatment, species: 'unknown', grade: 'unknown', isLumber: false };
  }

  // Drywall
  if (/\bdrywall\b|\bgypsum\b|\bsheetrock\b|\bwallboard\b/.test(n)) {
    return { category: 'drywall', dimensions, treatment, species: 'unknown', grade: 'unknown', isLumber: false };
  }

  // Concrete / masonry
  if (/\bconcrete\b|\bcement\b|\bmortar\b|\bblock\b|\bbrick\b|\bmasonry\b/.test(n)) {
    return { category: 'concrete_masonry', dimensions, treatment, species: 'unknown', grade: 'unknown', isLumber: false };
  }

  // Fasteners
  if (/\bnail\b|\bscrew\b|\bbolt\b|\bstaple\b|\bjoist hanger\b|\bframing anchor\b/.test(n)) {
    return { category: 'fasteners', dimensions, treatment, species: 'unknown', grade: 'unknown', isLumber: false };
  }

  // Standard dimensional lumber (framing)
  if (
    dimensions.some(d => /^\d+x\d+/.test(d)) &&
    (/\blumber\b|\bboard\b|\bstud\b|\bframing\b|\bconstruction\b|\bdimensional\b/.test(n) ||
      species !== 'unknown' ||
      grade !== 'unknown')
  ) {
    return { category: 'standard_framing', dimensions, treatment, species, grade, isLumber: true };
  }

  // Fallback: if it has cross-section dimensions it's probably lumber
  if (dimensions.some(d => /^\d+x\d+/.test(d))) {
    return { category: 'standard_framing', dimensions, treatment, species, grade, isLumber: true };
  }

  return { category: 'unrelated', dimensions, treatment, species, grade, isLumber: false };
}

// ─── Core match logic ─────────────────────────────────────────────────────────

function normUnit(u: string): string {
  return u.toLowerCase().trim().replace(/s$/, ''); // "eachs" -> "each"
}

export function matchProducts(a: SupplierPrice, b: SupplierPrice): MatchResult {
  // 1. Unit must match
  if (normUnit(a.unit) !== normUnit(b.unit)) {
    return { isEquivalent: false, confidence: 'none', reason: 'Unit mismatch', exclusionReason: `"${a.unit}" vs "${b.unit}"` };
  }

  const ca = classifyProduct(a.productName);
  const cb = classifyProduct(b.productName);

  // 2. Category must match — different categories are never equivalent
  if (ca.category !== cb.category) {
    return {
      isEquivalent: false,
      confidence: 'none',
      reason: 'Different product categories',
      exclusionReason: `${ca.category} vs ${cb.category}`,
    };
  }

  // 3. Treatment must match (untreated != pressure-treated)
  if (ca.treatment !== cb.treatment) {
    return {
      isEquivalent: false,
      confidence: 'none',
      reason: 'Treatment mismatch',
      exclusionReason: `${ca.treatment} vs ${cb.treatment}`,
    };
  }

  // 4. Species must match when both are known
  if (ca.species !== 'unknown' && cb.species !== 'unknown' && ca.species !== cb.species) {
    return {
      isEquivalent: false,
      confidence: 'none',
      reason: 'Species mismatch',
      exclusionReason: `${ca.species} vs ${cb.species}`,
    };
  }

  // 5. Grade: premium must not match standard
  const gradeIncompat =
    (ca.grade === 'premium' && cb.grade === 'standard') ||
    (ca.grade === 'standard' && cb.grade === 'premium');
  if (gradeIncompat) {
    return {
      isEquivalent: false,
      confidence: 'none',
      reason: 'Grade mismatch',
      exclusionReason: `${ca.grade} vs ${cb.grade}`,
    };
  }

  // 6. Dimensions must match when both have them
  if (ca.dimensions.length > 0 && cb.dimensions.length > 0) {
    const aDims = new Set(ca.dimensions);
    const bDims = new Set(cb.dimensions);
    const allMatch = [...aDims].every(d => bDims.has(d)) && [...bDims].every(d => aDims.has(d));
    if (!allMatch) {
      return {
        isEquivalent: false,
        confidence: 'none',
        reason: 'Dimension mismatch',
        exclusionReason: `[${[...aDims].join(', ')}] vs [${[...bDims].join(', ')}]`,
      };
    }
  }

  // UPC match = high confidence
  if (a.upc && b.upc && a.upc.replace(/\D/g, '') === b.upc.replace(/\D/g, '')) {
    return { isEquivalent: true, confidence: 'high', reason: 'UPC match — identical product' };
  }

  // Dimensions + category + treatment all match
  if (ca.dimensions.length > 0 && cb.dimensions.length > 0) {
    const speciesNote = ca.species !== 'unknown' && cb.species !== 'unknown'
      ? ` (${ca.species})`
      : '';
    return {
      isEquivalent: true,
      confidence: 'medium',
      reason: `Matching ${ca.category.replace(/_/g, ' ')}${speciesNote}, dimensions [${ca.dimensions.join(', ')}], treatment: ${ca.treatment}`,
    };
  }

  // Same category, no dimensions to compare
  return {
    isEquivalent: true,
    confidence: 'low',
    reason: `Same product category (${ca.category.replace(/_/g, ' ')}), no dimension data to verify`,
  };
}

// ─── Search result grouping ───────────────────────────────────────────────────

export interface GroupedSearchResult {
  category: ProductCategory;
  label: string;
  description: string;
  products: SearchResultProduct[];
}

export interface SearchResultProduct {
  supplier: string;
  retailerProductId: string;
  sku?: string;
  productName: string;
  unit: string;
  unitPrice: number;
  productUrl?: string;
  storeLocation: string;
  verifiedAt: string;
  category: ProductCategory;
  classification: ClassifiedProduct;
  isLikelyMatch: boolean;
  matchNote: string;
}

const CATEGORY_LABELS: Record<ProductCategory, { label: string; description: string }> = {
  standard_framing:   { label: 'Standard Framing Lumber',    description: 'Untreated dimensional lumber for framing' },
  pressure_treated:   { label: 'Pressure-Treated Lumber',    description: 'Chemically treated for outdoor/ground contact use' },
  premium_lumber:     { label: 'Premium / Select Lumber',    description: 'Higher grade, select, or finish lumber' },
  cedar_redwood:      { label: 'Cedar / Redwood',            description: 'Naturally rot-resistant species' },
  engineered_lumber:  { label: 'Engineered Lumber',          description: 'LVL, I-joists, glulam, and engineered products' },
  plywood_osb:        { label: 'Plywood / OSB / Sheathing',  description: 'Sheet goods and structural panels' },
  insulation:         { label: 'Insulation',                 description: 'Batt, foam, and blown insulation products' },
  drywall:            { label: 'Drywall / Gypsum',           description: 'Wallboard and gypsum products' },
  concrete_masonry:   { label: 'Concrete / Masonry',         description: 'Concrete, cement, block, and masonry products' },
  fasteners:          { label: 'Fasteners / Hardware',       description: 'Nails, screws, bolts, and connectors' },
  specialty:          { label: 'Specialty Products',         description: 'Specialty or niche building materials' },
  unrelated:          { label: 'Other Products',             description: 'Products not directly related to the search' },
};

export function groupSearchResults(
  products: SearchResultProduct[],
  queryCategory: ProductCategory,
): GroupedSearchResult[] {
  const groups = new Map<ProductCategory, SearchResultProduct[]>();

  for (const p of products) {
    const existing = groups.get(p.category) ?? [];
    existing.push(p);
    groups.set(p.category, existing);
  }

  // Sort: query-matching category first, then others, unrelated last
  const order: ProductCategory[] = [
    queryCategory,
    'standard_framing', 'pressure_treated', 'premium_lumber', 'cedar_redwood',
    'engineered_lumber', 'plywood_osb', 'insulation', 'drywall',
    'concrete_masonry', 'fasteners', 'specialty', 'unrelated',
  ];

  const result: GroupedSearchResult[] = [];
  const seen = new Set<ProductCategory>();

  for (const cat of order) {
    if (seen.has(cat)) continue;
    seen.add(cat);
    const prods = groups.get(cat);
    if (prods && prods.length > 0) {
      const meta = CATEGORY_LABELS[cat];
      result.push({ category: cat, label: meta.label, description: meta.description, products: prods });
    }
  }

  return result;
}

export function classifySearchResult(
  p: { productName: string; unit: string; unitPrice: number; retailerProductId: string; sku?: string; productUrl?: string; storeLocation: string; verifiedAt: string; supplier: string },
  queryCategory: ProductCategory,
  queryDimensions: string[],
): SearchResultProduct {
  const classification = classifyProduct(p.productName);
  const isLikelyMatch = classification.category === queryCategory &&
    (queryDimensions.length === 0 || queryDimensions.every(d => classification.dimensions.includes(d)));

  let matchNote = '';
  if (classification.category !== queryCategory) {
    matchNote = `Different category: ${CATEGORY_LABELS[classification.category].label}`;
  } else if (classification.treatment === 'pressure_treated') {
    matchNote = 'Pressure-treated — not equivalent to untreated';
  } else if (classification.species !== 'unknown' && classification.species !== 'pine' && classification.species !== 'fir' && classification.species !== 'spruce') {
    matchNote = `${classification.species.charAt(0).toUpperCase() + classification.species.slice(1)} — specialty species`;
  } else if (isLikelyMatch) {
    matchNote = 'Likely equivalent product';
  } else if (queryDimensions.length > 0 && !queryDimensions.every(d => classification.dimensions.includes(d))) {
    matchNote = `Different dimensions: ${classification.dimensions.join(', ') || 'unknown'}`;
  }

  return { ...p, category: classification.category, classification, isLikelyMatch, matchNote };
}
