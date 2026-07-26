import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const hash = (plain: string) => bcrypt.hash(plain, 10);

  // le seed tourne à chaque redémarrage du conteneur, donc si une session de test a
  // désactivé un compte ou coché mustChangePassword à false, ça reviendrait sinon
  const demoAccountReset = { mustChangePassword: true, deactivatedAt: null };

  const admin = await prisma.user.upsert({
    where: { email: 'admin@rh.local' },
    update: demoAccountReset,
    create: {
      email: 'admin@rh.local',
      password: await hash('Admin123!'),
      firstName: 'Alice',
      lastName: 'Admin',
      role: 'ADMINISTRATOR',
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: 'manager@rh.local' },
    update: demoAccountReset,
    create: {
      email: 'manager@rh.local',
      password: await hash('Manager123!'),
      firstName: 'Marc',
      lastName: 'Manager',
      role: 'MANAGER',
    },
  });

  const collaborator = await prisma.user.upsert({
    where: { email: 'collab@rh.local' },
    update: demoAccountReset,
    create: {
      email: 'collab@rh.local',
      password: await hash('Collab123!'),
      firstName: 'Chloé',
      lastName: 'Collaborateur',
      role: 'COLLABORATOR',
    },
  });

  // pas de contrainte unique sur Task, donc skipDuplicates ne servirait à rien ici :
  // on vérifie nous-mêmes pour ne pas dupliquer les tâches de démo à chaque redémarrage
  const hasDemoTasks = await prisma.task.count({ where: { creatorId: collaborator.id } });
  if (hasDemoTasks === 0) {
    await prisma.task.createMany({
      data: [
        {
          title: 'Rédiger le rapport mensuel',
          description: 'Compiler les chiffres de juillet',
          status: 'DRAFT',
          creatorId: collaborator.id,
        },
        {
          title: 'Mettre à jour le CRM',
          description: 'Ajouter les nouveaux contacts prospects',
          status: 'SUBMITTED',
          creatorId: collaborator.id,
        },
      ],
    });
  }

  console.log('Seed terminé :', {
    admin: admin.email,
    manager: manager.email,
    collaborator: collaborator.email,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
