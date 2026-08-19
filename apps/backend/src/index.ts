import fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from 'fastify-jwt';
import bcrypt from 'bcrypt';
import { prisma } from '@saas-poc/shared';
import webhookRoutes from './routes/webhooks';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';

const app = fastify({ logger: true });

app.register(cors);
app.register(jwt, { secret: process.env.JWT_SECRET || 'supersecret' });

app.register(webhookRoutes, { prefix: '/webhooks' });
app.register(authRoutes, { prefix: '/auth' });
app.register(userRoutes, { prefix: '/users' });

async function runSeed() {
  const adminEmail = 'admin@admin.com';
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  
  if (!existingAdmin) {
    console.log('Seeding super admin user...');
    const hashedPassword = await bcrypt.hash('admin@123456', 10);
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'Super Admin',
        password: hashedPassword,
        role: 'SUPER_ADMIN',
        tenant: {
          create: {
            name: 'Super Admin Tenant',
          }
        }
      }
    });
    console.log('Super admin created successfully!');
  }
}

const start = async () => {
  try {
    const port = Number(process.env.PORT) || 8080;
    const host = process.env.HOSTNAME || '0.0.0.0';
    await runSeed();
    await app.listen({ port, host });
    console.log('Backend is listening on port ' + port);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
