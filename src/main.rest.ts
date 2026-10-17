import 'reflect-metadata';
import { createRestApplicationContainer, RestApplication } from './rest/index.js';
import { Component } from './shared/types/index.js';

async function bootstrap() {
  const container = createRestApplicationContainer();
  const application = container.get<RestApplication>(Component.RestApplication);
  await application.init();
}

bootstrap();
