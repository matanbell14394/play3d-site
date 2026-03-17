/**
 * Migration script: Firestore → PostgreSQL (Prisma)
 *
 * Prerequisites:
 *   1. npm install firebase-admin
 *   2. Download your Firebase service account key:
 *      Firebase Console → Project Settings → Service Accounts → Generate new private key
 *      Save as: prisma/firebase-service-account.json
 *   3. Make sure DATABASE_URL is set in your .env file
 *
 * Run:
 *   node prisma/migrate-from-firestore.js
 */

require('dotenv').config();
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { PrismaClient } = require('@prisma/client');
const path = require('path');

// ── Firebase init ────────────────────────────────────────────────────
const serviceAccount = require('./firebase-service-account.json');

initializeApp({ credential: cert(serviceAccount) });
const firestore = getFirestore();

// ── Prisma init ──────────────────────────────────────────────────────
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ── Type mapping ─────────────────────────────────────────────────────
function mapType(firestoreType) {
  const t = (firestoreType || '').toLowerCase();
  if (t === 'filament') return 'FILAMENT';
  if (t === 'resin')    return 'RESIN';
  if (t === 'spare' || t === 'spare_part') return 'SPARE_PART';
  if (t === 'tool')     return 'TOOL';
  return 'OTHER';
}

function mapUnit(firestoreType) {
  const t = (firestoreType || '').toLowerCase();
  if (t === 'filament') return 'g';
  if (t === 'resin')    return 'ml';
  return 'pcs';
}

// ── Main migration ───────────────────────────────────────────────────
async function main() {
  console.log('Starting Firestore → PostgreSQL migration...\n');

  // ── INVENTORY ────────────────────────────────────────────────────
  console.log('📦 Migrating inventory...');
  const inventorySnapshot = await firestore.collection('inventory').get();
  let inventoryCount = 0;

  for (const doc of inventorySnapshot.docs) {
    const d = doc.data();

    // Build a readable name from material + color
    const name = [d.material, d.color].filter(Boolean).join(' ');

    await prisma.inventoryItem.create({
      data: {
        name:     name || 'Unknown',
        type:     mapType(d.type),
        quantity: d.weight ?? d.units ?? 0,
        unit:     mapUnit(d.type),
        price:    d.price ?? 0,
      },
    });

    console.log(`  ✓ ${name} (${d.weight ?? d.units ?? 0}${mapUnit(d.type)}) — ₪${d.price ?? 0}`);
    inventoryCount++;
  }

  console.log(`\n✅ Inventory: ${inventoryCount} items migrated.`);

  // ── ORDERS (basic info only) ──────────────────────────────────────
  // Skipping orders migration because they require a userId (linked user).
  // You can manually migrate orders after users are set up.
  console.log('\n⚠️  Orders and Products were NOT migrated.');
  console.log('   Orders require linked user accounts — migrate manually if needed.');
}

main()
  .catch(err => {
    console.error('\n❌ Migration failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
