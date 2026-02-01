
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/server.js';

let app: FastifyInstance | undefined;

export default async function (req: any, res: any) {
  if (!app) {
    app = await buildApp();
    await app.ready();
  }
  
  app.server.emit('request', req, res);
}
