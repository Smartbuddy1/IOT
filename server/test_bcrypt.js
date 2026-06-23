import bcrypt from 'bcryptjs';

async function test() {
  const dynBcrypt = await import('bcryptjs');
  console.log("Root compare:", typeof dynBcrypt.compare);
  console.log("Default compare:", typeof dynBcrypt.default?.compare);
}

test();
