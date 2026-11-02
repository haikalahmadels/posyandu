// Runner SQL lintas platform (pengganti psql): node database/run.js schema|seed|reset
require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const FILES = {
  schema: ['schema.sql'],
  seed: ['seed.sql'],
  reset: ['schema.sql', 'seed.sql'],
};

async function main() {
  const cmd = process.argv[2];
  if (!FILES[cmd]) throw new Error('Pemakaian: node database/run.js schema|seed|reset');
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL belum diisi di .env');
  if (cmd === 'reset' && process.env.NODE_ENV === 'production') {
    throw new Error('db:reset ditolak karena NODE_ENV=production');
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    if (cmd === 'reset') {
      await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
      console.log('Schema public dikosongkan');
    }
    for (const file of FILES[cmd]) {
      await client.query(fs.readFileSync(path.join(__dirname, file), 'utf8'));
      console.log(`${file} selesai dijalankan`);
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(`Gagal: ${err.message}`);
  process.exit(1);
});
