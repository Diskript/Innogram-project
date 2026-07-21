const { NestFactory } = require('@nestjs/core');
const { CoreMicroserviceModule } = require('./dist/core-microservice.module');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');

async function bootstrap() {
  const app = await NestFactory.create(CoreMicroserviceModule);
  
  app.enableCors({
    origin: [
      "http://localhost:3000", "http://localhost:3001", "http://localhost:3002",
      process.env.FRONTEND_URL || "http://localhost:3003",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
    exposedHeaders: ["Authorization"],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  app.use(helmet({ strictTransportSecurity: false }));
  app.use(cookieParser);

  // Add a raw direct Express route to test
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.get('/raw-test', (req, res) => {
    console.log('RAW TEST HIT!');
    res.json({ ok: true, message: 'Direct Express route works' });
  });

  // Add instrumentation at the HTTP level
  const httpServer = app.getHttpServer();
  httpServer.on('request', (req, res) => {
    console.log('HTTP REQUEST:', req.method, req.url);
  });

  await app.listen(process.env.PORT ?? 3000);
  console.log('Application is running on:', await app.getUrl());
  console.log('Server has', httpServer.listening ? 'started' : 'not started');
}

bootstrap().catch(e => {
  console.error('BOOTSTRAP ERROR:', e);
  process.exit(1);
});
