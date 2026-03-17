require('dotenv').config();
const path = require('path');
const { defineConfig } = require('prisma/config');

const DATABASE_URL = process.env.DATABASE_URL;

module.exports = defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  datasource: {
    url: DATABASE_URL,
  },
  migrate: {
    async adapter() {
      const { Pool } = require('pg');
      const { PrismaPg } = require('@prisma/adapter-pg');
      const pool = new Pool({ connectionString: DATABASE_URL });
      return new PrismaPg(pool);
    },
  },
});
