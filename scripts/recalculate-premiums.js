/**
 * One-time script: Set base premium (0.2% of quantity × rate) for ALL requests
 * regardless of status (pending, approved, rejected).
 *
 * Run from backend directory: npm run recalculate-premiums
 * Ensure .env is set (DATABASE_URL).
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const prisma = require('../src/config/database');

const PREMIUM_RATE = 0.002; // 0.2%
// Decimal(10,2) max value to avoid DB overflow
const MAX_PREMIUM = 99_999_999.99;

async function recalculatePremiums() {
  console.log('🔄 Fetching all requests (any status)...\n');

  const requests = await prisma.insuranceRequest.findMany({
    select: {
      id: true,
      quantity: true,
      rate: true,
      premiumAmount: true,
      status: true,
    },
  });

  if (requests.length === 0) {
    console.log('✅ No requests found.');
    process.exit(0);
    return;
  }

  console.log(`Found ${requests.length} request(s).\n`);

  let updated = 0;
  let skipped = 0;

  for (const req of requests) {
    const totalValue = Number(req.quantity) * Number(req.rate || 0);
    let newPremium = totalValue * PREMIUM_RATE;
    if (newPremium > MAX_PREMIUM) {
      console.warn(`  ${req.id.slice(0, 8)}... | Premium capped (${newPremium.toFixed(2)} → ${MAX_PREMIUM})`);
      newPremium = MAX_PREMIUM;
    }
    const oldPremium = req.premiumAmount != null ? Number(req.premiumAmount) : null;

    if (oldPremium != null && Math.abs(newPremium - oldPremium) < 0.01) {
      skipped++;
      continue;
    }

    await prisma.insuranceRequest.update({
      where: { id: req.id },
      data: { premiumAmount: newPremium },
    });

    const oldStr = oldPremium != null ? `₹${oldPremium.toFixed(2)}` : '—';
    console.log(
      `  ${req.id.slice(0, 8)}... | ${oldStr} → ₹${newPremium.toFixed(2)}  (${req.status})`
    );
    updated++;
  }

  console.log(`\n✅ Done. Updated: ${updated}, Skipped (unchanged): ${skipped}`);
  process.exit(0);
}

recalculatePremiums().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
