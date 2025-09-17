const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // Create tenants
  const acmeTenant = await prisma.tenant.upsert({
    where: { slug: 'acme' },
    update: {},
    create: {
      name: 'Acme Corporation',
      slug: 'acme',
      plan: 'free',
    },
  });

  const globexTenant = await prisma.tenant.upsert({
    where: { slug: 'globex' },
    update: {},
    create: {
      name: 'Globex Corporation',
      slug: 'globex',
      plan: 'free',
    },
  });

  // Hash password for all test accounts
  const hashedPassword = await bcrypt.hash('password', 10);

  // Create users for Acme
  await prisma.user.upsert({
    where: { email: 'admin@acme.test' },
    update: {},
    create: {
      email: 'admin@acme.test',
      password: hashedPassword,
      role: 'admin',
      tenantId: acmeTenant.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'user@acme.test' },
    update: {},
    create: {
      email: 'user@acme.test',
      password: hashedPassword,
      role: 'member',
      tenantId: acmeTenant.id,
    },
  });

  // Create users for Globex
  await prisma.user.upsert({
    where: { email: 'admin@globex.test' },
    update: {},
    create: {
      email: 'admin@globex.test',
      password: hashedPassword,
      role: 'admin',
      tenantId: globexTenant.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'user@globex.test' },
    update: {},
    create: {
      email: 'user@globex.test',
      password: hashedPassword,
      role: 'member',
      tenantId: globexTenant.id,
    },
  });

  console.log('Database seeded successfully!');
  console.log('Test accounts created:');
  console.log('- admin@acme.test (Admin, Acme)');
  console.log('- user@acme.test (Member, Acme)');
  console.log('- admin@globex.test (Admin, Globex)');
  console.log('- user@globex.test (Member, Globex)');
  console.log('Password for all accounts: password');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
