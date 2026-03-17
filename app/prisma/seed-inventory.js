// Seed inventory from existing system
// Run: DATABASE_URL="..." node prisma/seed-inventory.js

const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ Missing DATABASE_URL env var');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

const items = [
  // גלילי PLA
  { name: 'PLA לבן קר',          type: 'FILAMENT', quantity: 973,  unit: 'g',   price: 0.09 },
  { name: 'PLA תכלת',            type: 'FILAMENT', quantity: 1000, unit: 'g',   price: 0.09 },
  { name: 'PLA בד',              type: 'FILAMENT', quantity: 1000, unit: 'g',   price: 0.09 },
  { name: 'PLA קשת פסטל',        type: 'FILAMENT', quantity: 1000, unit: 'g',   price: 0.09 },
  { name: 'PLA אדום מט',         type: 'FILAMENT', quantity: 886,  unit: 'g',   price: 0.09 },
  { name: 'PLA מטאלי ירוק סגול', type: 'FILAMENT', quantity: 1000, unit: 'g',   price: 0.09 },
  { name: 'PLA שחור',            type: 'FILAMENT', quantity: 170,  unit: 'g',   price: 0.09 },
  // מוצרים מוכנים
  { name: 'מחזיק מפתחות',        type: 'OTHER',    quantity: 200,  unit: 'pcs', price: 0 },
  { name: 'מנורה',               type: 'OTHER',    quantity: 4,    unit: 'pcs', price: 0 },
  { name: 'קליקר',               type: 'OTHER',    quantity: 86,   unit: 'pcs', price: 0 },
];

async function main() {
  console.log('🌱 Adding inventory items...\n');

  for (const item of items) {
    const id = `inv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    await pool.query(
      `INSERT INTO "InventoryItem" (id, name, type, quantity, unit, price, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       ON CONFLICT DO NOTHING`,
      [id, item.name, item.type, item.quantity, item.unit, item.price]
    );
    console.log(`  ✅ ${item.name} — ${item.quantity}${item.unit}`);
    // small delay to ensure unique IDs
    await new Promise(r => setTimeout(r, 5));
  }

  console.log('\n✅ Done!');
  await pool.end();
}

main().catch(e => { console.error(e); pool.end(); process.exit(1); });
