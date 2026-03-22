import { NestFactory } from "@nestjs/core";
import { CoreMicroserviceModule } from "./core-microservice.module";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";

async function bootstrap() {
  const app = await NestFactory.create(CoreMicroserviceModule);

  const config = new DocumentBuilder()
    .setTitle("Core Microservice")
    .setDescription("Core Microservice API Gateway")
    .setVersion("0.2.2")
    .build();
  const DocumentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api", app, DocumentFactory());

  app.use(cookieParser);
  await app.listen(process.env.PORT ?? 3000);
  console.log(`Application is running on: ${await app.getUrl()}`);
  console.log(`API documentation is running on: ${await app.getUrl()}/api`);
}
bootstrap();
