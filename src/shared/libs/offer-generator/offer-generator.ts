import {
  getRandomBoolean,
  getRandomFloat,
  getRandomInt,
  getRandomItem,
  getRandomItems,
} from '../../helpers/random.js';
import { MockServerData } from '../../types/index.js';
import { OfferGenerator } from './offer-generator.interface.js';

const IMAGES_COUNT = 6;
const AMENITIES_MAX_COUNT = 5;
const RATING_MIN = 1;
const RATING_MAX = 5;
const RATING_DIGITS = 1;
const BEDROOMS_MIN = 1;
const BEDROOMS_MAX = 8;
const ADULTS_MIN = 1;
const ADULTS_MAX = 10;
const PRICE_MIN = 100;
const PRICE_MAX = 100000;
const POST_DATE_RANGE_DAYS = 90;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export class TSVOfferGenerator implements OfferGenerator {
  constructor(
    private readonly mockData: MockServerData
  ) {}

  private generatePostDate(): string {
    const offset = getRandomInt(0, POST_DATE_RANGE_DAYS) * MS_PER_DAY;
    return new Date(Date.now() - offset).toISOString();
  }

  public generate(): string {
    const title = getRandomItem(this.mockData.titles);
    const description = getRandomItem(this.mockData.descriptions);
    const postDate = this.generatePostDate();
    const city = getRandomItem(this.mockData.cities);
    const previewImage = getRandomItem(this.mockData.previewImages);
    const images = getRandomItems(this.mockData.images, IMAGES_COUNT);
    const isPremium = getRandomBoolean();
    const isFavorite = getRandomBoolean();
    const rating = getRandomFloat(RATING_MIN, RATING_MAX, RATING_DIGITS);
    const type = getRandomItem(this.mockData.housingTypes);
    const bedrooms = getRandomInt(BEDROOMS_MIN, BEDROOMS_MAX);
    const maxAdults = getRandomInt(ADULTS_MIN, ADULTS_MAX);
    const price = getRandomInt(PRICE_MIN, PRICE_MAX);
    const amenities = getRandomItems(this.mockData.amenities, getRandomInt(1, AMENITIES_MAX_COUNT));
    const user = getRandomItem(this.mockData.users);

    return [
      title,
      description,
      postDate,
      city.name,
      previewImage,
      images.join(';'),
      isPremium,
      isFavorite,
      rating,
      type,
      bedrooms,
      maxAdults,
      price,
      amenities.join(';'),
      user.name,
      user.email,
      user.avatarPath ?? '',
      user.type,
      `${city.location.latitude};${city.location.longitude}`,
    ].join('\t');
  }
}
