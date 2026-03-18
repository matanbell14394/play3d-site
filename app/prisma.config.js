require('dotenv').config();
const path = require('path');
const { defineConfig } = require('prisma/config');

const DATABASE_URL = process.env.DATABASE_URL;
const DIRECT_URL = process.env.DIRECT_URL || DATABASE_URL;

module.exports = defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  datasource: {
    url: DATABASE_URL,
  },
  migrate: {
    async adapter() {
      const { Pool } = require('pg');
      const { PrismaPg } = require('@prisma/adapter-pg');
      // Use DIRECT_URL (non-pooler) for migrations to avoid Neon pooler timeout
      const pool = new Pool({ connectionString: DIRECT_URL });
      return new PrismaPg(pool);
    },
  },
});
