import 'reflect-metadata';
import { Container } from 'inversify';
import { createRestApplicationContainer, RestApplication } from './rest/index.js';
import { createUserContainer } from './shared/modules/user/index.js';
import { createOfferContainer } from './shared/modules/offer/index.js';
import { Component } from './shared/types/index.js';

async function bootstrap() {
  const container = Container.merge(
    createRestApplicationContainer(),
    createUserContainer(),
    createOfferContainer(),
  );

  const application = container.get<RestApplication>(Component.RestApplication);
  await application.init();
}

bootstrap();
