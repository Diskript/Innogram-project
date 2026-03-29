import { NestFactory } from "@nestjs/core";
import { CoreMicroserviceModule } from "./core-microservice.module";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import helmet from "helmet";

async function bootstrap() {
  const app = await NestFactory.create(CoreMicroserviceModule);

  // CORS configuration
  app.enableCors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:3002",
      process.env.FRONTEND_URL || "http://localhost:3001",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
    ],
    exposedHeaders: ["Authorization"],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // Helmet middleware for protaction
  app.use(
    helmet({
      strictTransportSecurity: false, //no TLS security protocol for this pet project
    }),
  );

  const config = new DocumentBuilder()
    .setTitle("Core Microservice")
    .setDescription("Core Microservice API Gateway")
    .setVersion("0.2.2")
    .build();
  const DocumentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api", app, DocumentFactory());

  app.use(cookieParser);
  await app.listen(process.env.PORT ?? 3000);
  console.info(`Application is running on: ${await app.getUrl()}`);
  console.info(`API documentation is running on: ${await app.getUrl()}/api`);
}
bootstrap();
