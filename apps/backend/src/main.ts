import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module.js';

import { getConnectionToken } from '@nestjs/mongoose';

import mongoose from 'mongoose';

import {
  ValidationPipe,
} from '@nestjs/common';

import {
  join,
} from 'path';

import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // MongoDB connection check
  const connection =
    app.get<mongoose.Connection>(
      getConnectionToken(),
    );

  if (connection.readyState === 1) {
    console.log(
      '✅ MongoDB connected successfully',
    );
  } else {
    console.log(
      '❌ MongoDB is not connected',
    );
  }

  // Enable CORS
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Global API prefix
  app.setGlobalPrefix('api');

  // Global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Serve uploaded files
  app.use(
    '/uploads',
    express.static(
      join(
        process.cwd(),
        'uploads',
      ),
    ),
  );

  // Server port
  const port =
    process.env.PORT || 3000;

  await app.listen(port);

  console.log(
    `🚀 Backend running on http://localhost:${port}/api`,
  );
}

bootstrap();