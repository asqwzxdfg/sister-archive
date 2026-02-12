import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.OWNER_EMAIL || 'admin@yuna.family';
  const password = process.env.OWNER_PASSWORD || 'changeme123';
  const name = process.env.OWNER_NAME || 'Owner';

  const existing = await prisma.user.findUnique({ where: { email } });

  if (!existing) {
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role: Role.OWNER,
        approved: true,
      },
    });
    console.log(`Created OWNER account: ${email}`);
  } else {
    console.log(`OWNER account already exists: ${email}`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
