import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { test } from 'node:test';
import mongoose from 'mongoose';
import { Logger } from '../../libs/logger/index.js';
import { City, HousingType, Amenity, UserType } from '../../types/index.js';
import { CommentModel, DefaultCommentService } from '../comment/index.js';
import { DefaultUserService, UserModel } from '../user/index.js';
import { DefaultOfferService, OfferModel } from './index.js';

const uri = process.env.TEST_MONGO_URI;
const logger: Logger = { info() {}, error() {}, warn() {}, debug() {} };

test('offer transactions preserve related records on rollback and leave no orphans on concurrent deletion', { skip: !uri }, async (t) => {
  assert(uri);
  await mongoose.connect(uri, { dbName: `six_cities_test_${randomBytes(6).toString('hex')}`, serverSelectionTimeoutMS: 5000 });
  try {
    await Promise.all([OfferModel.init(), CommentModel.init(), UserModel.init()]);
    const users = new DefaultUserService(logger, UserModel);
    const offers = new DefaultOfferService(logger, OfferModel, CommentModel, users);
    const comments = new DefaultCommentService(CommentModel, offers);
    const user = await users.create({ name: 'Tester', email: 'tester@example.org', password: 'password', userType: UserType.Regular }, 'salt');
    const createOffer = () => offers.create({
      title: 'An apartment in Paris', description: 'An apartment with room for two guests', city: City.Paris,
      preview: 'https://example.com/room.jpg', photos: Array(6).fill('https://example.com/room.jpg'),
      isPremium: false, housingType: HousingType.Apartment, rooms: 1, guests: 2, price: 100,
      amenities: [Amenity.Breakfast], coordinates: { latitude: 48.9, longitude: 2.4 },
    }, user.id);
    const createComment = (offerId: string, rating = 5) => comments.create({ offerId, authorId: user.id, text: 'A comment about the apartment', rating });

    const existing = await createOffer();
    await createComment(existing.id);
    await UserModel.updateOne({ _id: user.id }, { $addToSet: { favoriteOffers: existing.id } });
    const failRemoval = t.mock.method(users, 'removeFavoriteOfferFromAllUsers', async () => {
      throw new Error('Simulated write failure');
    });
    try {
      await assert.rejects(offers.deleteById(existing.id), /Simulated write failure/);
      assert.ok(await offers.findById(existing.id));
      assert.equal((await comments.findByOfferId(existing.id)).length, 1);
      assert.deepEqual(await users.findFavoriteOfferIds(user.id), [existing.id]);
    } finally {
      failRemoval.mock.restore();
    }


    await users.removeFavoriteOffer(user.id, existing.id);
    const favorite = await offers.addFavorite(existing.id, user.id);
    assert.equal(typeof favorite !== 'string' && favorite.isFavorite, true);
    assert.deepEqual(await users.findFavoriteOfferIds(user.id), [existing.id]);
    await Promise.all([createComment(existing.id, 1), createComment(existing.id, 3)]);
    const updated = await offers.findById(existing.id);
    assert.equal(updated?.commentCount, 3);
    assert.equal(updated?.rating, 3);

    await Promise.all([offers.deleteById(existing.id), createComment(existing.id), offers.addFavorite(existing.id, user.id)]);
    assert.equal(await offers.findById(existing.id), null);
    assert.deepEqual(await comments.findByOfferId(existing.id), []);
    assert.deepEqual(await users.findFavoriteOfferIds(user.id), []);
    assert.equal(await createComment(existing.id), null);
    assert.equal(await offers.addFavorite(existing.id, user.id), 'offer-not-found');
    assert.deepEqual(await comments.findByOfferId(existing.id), []);
  } finally {
    try {
      await mongoose.connection.dropDatabase();
    } finally {
      await mongoose.disconnect();
    }
  }
});
