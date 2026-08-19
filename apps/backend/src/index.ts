import fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from 'fastify-jwt';
import webhookRoutes from './routes/webhooks';
import authRoutes from './routes/auth';

const app = fastify({ logger: true });

app.register(cors);
app.register(jwt, { secret: 'supersecret' });

app.register(webhookRoutes, { prefix: '/webhooks' });
app.register(authRoutes, { prefix: '/auth' });

const start = async () => {
  try {
    const port = Number(process.env.PORT) || 8080;
    const host = process.env.HOSTNAME || '0.0.0.0';
    await app.listen({ port, host });
    console.log('Backend is listening on port ' + port);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
