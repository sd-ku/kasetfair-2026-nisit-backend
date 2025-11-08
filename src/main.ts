import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as express from 'express';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cookieParser());
  app.enableCors({
    origin: [process.env.FRONTEND_URL],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  });
  app.use(
    '/upload',
    express.static(path.join(process.cwd(), 'upload')),
  );

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,            // ตัด field แปลก ๆ ทิ้ง
    forbidNonWhitelisted: true, // ถ้ามี field นอกเหนือ DTO → 400
    transform: true,            // แปลงชนิดพื้นฐานอัตโนมัติ
    stopAtFirstError: false,    // จะรวบรวมทุก error (ปรับตามชอบ)
    // exceptionFactory: (errors) => new BadRequestException(errors), // ถ้าอยากคุม shape เอง
  }));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('KasetFair Backend')
    .setDescription('API documentation for the KasetFair backend services.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(process.env.PORT ?? 4000);
}
bootstrap();
