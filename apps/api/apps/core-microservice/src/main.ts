import { NestFactory } from "@nestjs/core";
import { CoreMicroserviceModule } from "./core-microservice.module";
import { configureCoreApp } from "./configure-app";

async function bootstrap() {
  const app = await NestFactory.create(CoreMicroserviceModule);
  configureCoreApp(app);
  await app.listen(process.env.PORT ?? 3000);
  console.info(`Application is running on: ${await app.getUrl()}`);
  console.info(`API documentation is running on: ${await app.getUrl()}/api`);
}
bootstrap();
