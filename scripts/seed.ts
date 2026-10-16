import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { seedDatabase } from '../src/db/seed';

async function run() {
  console.log('🌱 Seeding Neon database...');
  try {
    const result = await seedDatabase();
    console.log(`✅ Successfully seeded ${result.users} users and ${result.anime} anime titles`);
    console.log('🎉 Database is ready!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

run();
