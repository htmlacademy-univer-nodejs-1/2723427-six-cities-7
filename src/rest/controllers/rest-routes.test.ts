import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import express from 'express';
import { Config, RestSchema } from '../../shared/libs/config/index.js';
import { Logger } from '../../shared/libs/logger/index.js';
import { CommentService } from '../../shared/modules/comment/index.js';
import { OfferService } from '../../shared/modules/offer/index.js';
import { UserService } from '../../shared/modules/user/index.js';
import { HttpErrorExceptionFilter } from '../exception-filters/index.js';
import { AVATAR_DIRECTORY, AVATAR_URL_PATH } from '../helpers/avatar.js';
import { CommentController, FavoritesController, OfferController, UserController } from './index.js';

const id = '0123456789abcdef01234567';
const avatarUserId = randomBytes(12).toString('hex');
const logger: Logger = { info() {}, error() {}, warn() {}, debug() {} };
const config = { get: () => 'secret' } as Config<RestSchema>;
const offers = {
  find: async () => [{
    id, title: 'An apartment in Paris', postDate: new Date('2025-01-01T00:00:00Z'), city: 'Paris',
    location: { latitude: 48.9, longitude: 2.4 }, previewImage: 'https://example.com/room.jpg',
    isPremium: false, isFavorite: false, rating: 0, type: 'apartment', price: 100, commentCount: 0,
  }],
  findById: async () => null,
  updateById: async () => null,
  deleteById: async () => ({ id }),
} as unknown as OfferService;
const users = {
  findFavoriteOffers: async (): Promise<[]> => [],
  findById: async (userId: string) => userId === avatarUserId ? { id: userId } : null,
  updateAvatar: async (userId: string, avatarPath: string) => userId === avatarUserId ? { id: userId, avatarPath } : null,
} as unknown as UserService;
const app = express();
app.use(AVATAR_URL_PATH, express.static(AVATAR_DIRECTORY));
app.use(express.json(), ...[
  new OfferController(logger, config, offers, users),
  new CommentController(logger, config, {} as CommentService, offers, users),
  new FavoritesController(logger, config, users, offers),
  new UserController(logger, config, users),
].map((controller) => controller.router));
app.use(new HttpErrorExceptionFilter(logger).catch);
const server = app.listen(0, '127.0.0.1');
let url: string;

before(async () => {
  await once(server, 'listening');
  const address = server.address();
  assert(address && typeof address !== 'string');
  url = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  server.close();
  server.closeAllConnections();
  await rm(join(AVATAR_DIRECTORY, `${avatarUserId}.jpg`), { force: true });
});

function request(path: string, method = 'GET', body?: unknown) {
  return fetch(`${url}${path}`, {
    method,
    ...(body === undefined ? {} : {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  });
}

test('rejects malformed identifiers on every offer route before reaching the service', async () => {
  for (const [method, suffix] of [
    ['GET', ''], ['PUT', ''], ['DELETE', ''], ['GET', '/comments'], ['POST', '/comments'],
    ['POST', '/favorites'], ['DELETE', '/favorites'],
  ]) {
    const response = await request(`/offers/invalid${suffix}`, method);
    assert.equal(response.status, 400, `${method} ${suffix}`);
    assert.equal((await response.json()).details[0].field, 'offerId');
  }
});

test('validates a partial offer update and does not treat null as omitted', async () => {
  assert.equal((await request(`/offers/${id}`, 'PUT', { rooms: null })).status, 400);
  assert.equal((await request(`/offers/${id}`, 'PUT', { coordinates: [] })).status, 400);
  assert.equal((await request(`/offers/${id}`, 'PUT', { coordinates: { latitude: 12 } })).status, 400);
  assert.equal((await request(`/offers/${id}`, 'PUT', { coordinates: { latitude: 91, longitude: 2 } })).status, 400);
  assert.equal((await request(`/offers/${id}`, 'PUT', { rooms: 3 })).status, 404);
});

test('rejects invalid credentials and invalid comment data before database access', async () => {
  assert.equal((await request('/users/register', 'POST', { email: 'invalid' })).status, 400);
  assert.equal((await request('/users/login', 'POST', { email: [], password: 'valid123' })).status, 400);
  assert.equal((await request(`/offers/${id}/comments`, 'POST', { text: 'Valid comment', rating: 6, authorId: id })).status, 400);
  assert.equal((await request(`/offers/${id}/comments`, 'POST', { text: 'Valid comment', rating: 5, authorId: id })).status, 404);
});

test('requires a valid author and all offer fields before creating an offer', async () => {
  const preview = 'https://example.com/room.jpg';
  const body = {
    title: 'An apartment in Paris',
    description: 'An apartment with room for two guests',
    city: 'Paris',
    preview,
    photos: Array(6).fill(preview),
    isPremium: false,
    housingType: 'apartment',
    rooms: 1,
    guests: 2,
    price: 100,
    amenities: ['Breakfast'],
    coordinates: { latitude: 48, longitude: 2 },
  };

  assert.equal((await request('/offers', 'POST', body)).status, 400);
  assert.equal((await request('/offers', 'POST', { ...body, authorId: id, photos: [preview] })).status, 400);
  assert.equal((await request('/offers', 'POST', { ...body, authorId: id })).status, 404);
});

test('allows deleting an offer and reading favorites without a token', async () => {
  assert.equal((await request(`/offers/${id}`, 'DELETE')).status, 204);
  const response = await request(`/favorites?userId=${id}`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), []);
  assert.equal((await request(`/favorites?userId=${id}&userId=${id}`)).status, 400);
});

test('uses the city center rather than the coordinates of the property', async () => {
  const response = await request('/offers');
  assert.equal(response.status, 200);
  const [offer] = await response.json();
  assert.deepEqual(offer.city, { name: 'Paris', coordinates: { latitude: 48.85661, longitude: 2.351499 } });
  assert.equal(offer.rating, 0);
});

test('rejects an avatar whose reported image type does not match its contents', async () => {
  const body = new FormData();
  body.set('userId', id);
  body.set('avatar', new Blob(['not a JPEG'], { type: 'image/jpeg' }), 'avatar.jpg');
  const response = await fetch(`${url}/users/avatar`, { method: 'POST', body });
  assert.equal(response.status, 400);
});

test('stores an uploaded avatar and serves the original image bytes', async () => {
  const image = await readFile(new URL('../../../markup/img/avatar-max.jpg', import.meta.url));
  const body = new FormData();
  body.set('userId', avatarUserId);
  body.set('avatar', new Blob([new Uint8Array(image)], { type: 'image/jpeg' }), 'avatar.jpg');
  const response = await fetch(`${url}/users/avatar`, { method: 'POST', body });
  assert.equal(response.status, 200);
  const { avatarUrl } = await response.json();
  const imageResponse = await request(avatarUrl);
  assert.equal(imageResponse.status, 200);
  assert.deepEqual(Buffer.from(await imageResponse.arrayBuffer()), image);

  const truncated = new FormData();
  truncated.set('userId', avatarUserId);
  truncated.set('avatar', new Blob([new Uint8Array(image.subarray(0, image.length - 10))], {
    type: 'image/jpeg',
  }), 'avatar.jpg');
  assert.equal((await fetch(`${url}/users/avatar`, { method: 'POST', body: truncated })).status, 400);
  assert.deepEqual(Buffer.from(await (await request(avatarUrl)).arrayBuffer()), image);
});
