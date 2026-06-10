import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Tenant unique (toi, le promoteur)
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'default' },
    update: {},
    create: {
      slug: 'default',
      subdomain: 'app',
      name: 'Mon Club Deal',
      primaryColor: '#1a56db',
      secondaryColor: '#e3a008',
      status: 'ACTIVE',
      settings: {
        create: {},
      },
    },
  });

  console.log(`Tenant créé : ${tenant.name} (id: ${tenant.id})`);

  // Compte Admin (toi)
  const adminHash = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'admin@clubdeal.fr' } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'admin@clubdeal.fr',
      passwordHash: adminHash,
      role: 'ADMIN',
      profileType: 'PHYSICAL',
      statusKyc: 'VALIDATED',
      physicalProfile: {
        create: {
          firstName: 'Admin',
          lastName: 'ClubDeal',
        },
      },
    },
  });

  console.log(`Admin créé : ${admin.email}`);

  // Projet de démo
  const project = await prisma.project.upsert({
    where: { id: 'demo-project-001' },
    update: {},
    create: {
      id: 'demo-project-001',
      tenantId: tenant.id,
      name: 'Résidence Les Jardins de Montpellier',
      address: '12 Rue des Fleurs, 34000 Montpellier',
      description: 'Programme résidentiel de 24 logements en cœur de ville. Livraison prévue T3 2026.',
      collectionGoal: 150000000n,  // 1 500 000 € en centimes
      collectedAmount: 45000000n,  // 450 000 € déjà collectés
      annualYield: 8.50,
      durationMonths: 24,
      precommercialisationRate: 65.0,
      status: 'ACTIVE',
    },
  });

  console.log(`Projet créé : ${project.name}`);
  console.log('\n✅ Seed terminé avec succès');
  console.log('──────────────────────────────────');
  console.log('Admin : admin@clubdeal.fr / admin123');
  console.log('──────────────────────────────────');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
