// Price Refresh Scheduler
// Runs every day at 6:00 AM America/Indiana/Indianapolis (cron: 0 6 * * *).
// node-cron handles DST automatically when timezone is specified.
//
// Each run:
//  1. Fetches all Price Library items
//  2. Queries Menards + Lowe's for each item (currently awaiting authorization)
//  3. Matches equivalent products, selects the higher verified price
//  4. Saves supplier prices + price history snapshots
//  5. Sends in-app notifications for price changes, unavailable products, failures
//  6. Records a PricingRefreshHistory row (idempotent -- skips if already ran today)

import cron from 'node-cron';
import { db } from '../db/client.js';
import { priceLibrary, pricingRefreshHistory } from '../db/schema.js';
import { eq, and, gte, lte } from 'drizzle-orm';
import { menardsProvider } from './menards-provider.js';
import { lowesProvider } from './lowes-provider.js';
import { selectHigherVerifiedPrice } from './supplier-pricing.js';
import { matchProducts } from './product-matcher.js';
import { recordPriceSnapshot, upsertSupplierPrice, syncConnectionStatus } from './price-history.js';
import { createNotification } from '../lib/notify.js';

const TIMEZONE = 'America/Indiana/Indianapolis';

export async function runPriceRefresh(): Promise<void> {
  // Idempotency: skip if a completed run already exists for today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const [existingRun] = await db
    .select()
    .from(pricingRefreshHistory)
    .where(
      and(
        gte(pricingRefreshHistory.startedAt, todayStart),
        lte(pricingRefreshHistory.startedAt, todayEnd),
        eq(pricingRefreshHistory.status, 'completed'),
      ),
    )
    .limit(1);

  if (existingRun) {
    console.log('[price-refresh] Already completed today, skipping.');
    return;
  }

  const startedAt = new Date();
  const inserted = await db
    .insert(pricingRefreshHistory)
    .values({ startedAt, status: 'running', materialsChecked: 0, pricesUpdated: 0, priceIncreases: 0, priceDecreases: 0, failures: 0 });
  const runId = (inserted as unknown as { insertId: number }).insertId;

  let materialsChecked = 0;
  let pricesUpdated = 0;
  let priceIncreases = 0;
  let priceDecreases = 0;
  let failures = 0;
  const errorDetails: string[] = [];

  try {
    // Sync connection status — sequential to respect Scavio concurrency limit
    const menardsStatus = await menardsProvider.getConnectionStatus();
    const lowesStatus = await lowesProvider.getConnectionStatus();
    await Promise.all([
      syncConnectionStatus('Menards', menardsStatus.connectionStatus, menardsStatus.connectionStatus === 'error' ? menardsStatus.message : undefined),
      syncConnectionStatus("Lowe's", lowesStatus.connectionStatus, lowesStatus.connectionStatus === 'error' ? lowesStatus.message : undefined),
    ]);

    const materials = await db.select().from(priceLibrary).orderBy(priceLibrary.name);

    for (const material of materials) {
      materialsChecked++;
      try {
        // Search both providers sequentially to respect Scavio concurrency limit
        const menardsResults = await menardsProvider.searchProducts(material.name);
        const lowesResults = await lowesProvider.searchProducts(material.name);

        // Find best match from each provider
        let menardsPrice = menardsResults[0] ?? null;
        let lowesPrice = lowesResults[0] ?? null;

        // If both have results, verify they are equivalent products
        if (menardsPrice && lowesPrice) {
          const match = matchProducts(menardsPrice, lowesPrice);
          if (!match.isEquivalent) {
            menardsPrice = null;
            lowesPrice = null;
            errorDetails.push('Unit/product mismatch for "' + material.name + '"');
          }
        }

        const comparison = selectHigherVerifiedPrice(menardsPrice, lowesPrice);

        // Persist supplier price records
        if (menardsPrice) {
          await upsertSupplierPrice(material.id, 'Menards', {
            storeLocation: menardsPrice.storeLocation,
            retailerProductId: menardsPrice.retailerProductId,
            sku: menardsPrice.sku,
            upc: menardsPrice.upc,
            productName: menardsPrice.productName,
            unit: menardsPrice.unit,
            unitPrice: menardsPrice.unitPrice,
            productUrl: menardsPrice.productUrl,
            availabilityStatus: 'available',
            matchConfidence: 'high',
          });
        }

        if (lowesPrice) {
          await upsertSupplierPrice(material.id, "Lowe's", {
            storeLocation: lowesPrice.storeLocation,
            retailerProductId: lowesPrice.retailerProductId,
            sku: lowesPrice.sku,
            upc: lowesPrice.upc,
            productName: lowesPrice.productName,
            unit: lowesPrice.unit,
            unitPrice: lowesPrice.unitPrice,
            productUrl: lowesPrice.productUrl,
            availabilityStatus: 'available',
            matchConfidence: 'high',
          });
        }

        // Record history snapshots and detect changes
        if (menardsPrice) {
          const change = await recordPriceSnapshot(
            material.id, 'Menards', menardsPrice.unitPrice,
            comparison.selectedPrice, comparison.selectedSupplier, comparison.comparisonStatus,
          );
          if (change) {
            pricesUpdated++;
            if (change.isIncrease) {
              priceIncreases++;
              await createNotification('price_change',
                'Price Increase: ' + material.name,
                'Menards price increased from $' + change.previousPrice.toFixed(2) + ' to $' + change.newPrice.toFixed(2) + ' (+' + change.percentDiff.toFixed(1) + '%)',
              );
            } else {
              priceDecreases++;
            }
          }
        }

        if (lowesPrice) {
          const change = await recordPriceSnapshot(
            material.id, "Lowe's", lowesPrice.unitPrice,
            comparison.selectedPrice, comparison.selectedSupplier, comparison.comparisonStatus,
          );
          if (change) {
            pricesUpdated++;
            if (change.isIncrease) {
              priceIncreases++;
              await createNotification('price_change',
                'Price Increase: ' + material.name,
                "Lowe's price increased from $" + change.previousPrice.toFixed(2) + ' to $' + change.newPrice.toFixed(2) + ' (+' + change.percentDiff.toFixed(1) + '%)',
              );
            } else {
              priceDecreases++;
            }
          }
        }

        if (comparison.comparisonStatus === 'unavailable') {
          await createNotification('price_unavailable',
            'No Pricing Available: ' + material.name,
            'Neither Menards nor Lowe\'s returned a verified price for this item.',
          );
        }

      } catch (err) {
        failures++;
        const msg = err instanceof Error ? err.message : String(err);
        errorDetails.push('"' + material.name + '": ' + msg);
      }
    }

    // Mark run complete
    await db
      .update(pricingRefreshHistory)
      .set({
        completedAt: new Date(),
        status: 'completed',
        materialsChecked,
        pricesUpdated,
        priceIncreases,
        priceDecreases,
        failures,
        errorDetails: errorDetails.length > 0 ? errorDetails.join('\n') : null,
      })
      .where(eq(pricingRefreshHistory.id, runId));

    console.log('[price-refresh] Done. Checked: ' + materialsChecked + ', Updated: ' + pricesUpdated + ', Increases: ' + priceIncreases + ', Failures: ' + failures);

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await db
      .update(pricingRefreshHistory)
      .set({ completedAt: new Date(), status: 'failed', materialsChecked, pricesUpdated, priceIncreases, priceDecreases, failures: failures + 1, errorDetails: msg })
      .where(eq(pricingRefreshHistory.id, runId));

    await createNotification('price_refresh_failed',
      'Daily Price Refresh Failed',
      'The scheduled price refresh encountered an error: ' + msg,
    );

    console.error('[price-refresh] Fatal error:', msg);
  }
}

let schedulerStarted = false;

export function startPriceRefreshScheduler(): void {
  if (schedulerStarted) return;
  schedulerStarted = true;

  // 0 6 * * * = every day at 6:00 AM
  cron.schedule('0 6 * * *', () => {
    console.log('[price-refresh] Scheduled run starting...');
    runPriceRefresh().catch(err => {
      console.error('[price-refresh] Unhandled error in scheduled run:', err);
    });
  }, { timezone: TIMEZONE });

  console.log('[price-refresh] Scheduler active -- runs daily at 6:00 AM ' + TIMEZONE);
}
