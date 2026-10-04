import { readFileSync } from 'node:fs';
import { FileReader } from './file-reader.interface.js';
import { Amenity, City, HousingType, Offer, UserType } from '../../types/index.js';

const OFFER_FIELDS_COUNT = 19;

export class TSVFileReader implements FileReader {
  private rawData = '';

  constructor(
    private readonly filename: string
  ) {}

  private validateRawData(): void {
    if (! this.rawData) {
      throw new Error('File was not read');
    }
  }

  private parseRawDataToOffers(): Offer[] {
    return this.rawData
      .split(/\r?\n/)
      .map((line, index) => ({ line, lineNumber: index + 1 }))
      .filter(({ line }) => line.trim().length > 0)
      .map(({ line, lineNumber }) => this.parseLineToOffer(line, lineNumber));
  }

  private parseLineToOffer(line: string, lineNumber: number): Offer {
    const fields = line.split('\t');

    if (fields.length !== OFFER_FIELDS_COUNT) {
      throw new Error(`Line ${lineNumber}: expected ${OFFER_FIELDS_COUNT} fields, got ${fields.length}`);
    }

    const [
      title,
      description,
      postDate,
      city,
      previewImage,
      images,
      isPremium,
      isFavorite,
      rating,
      type,
      bedrooms,
      maxAdults,
      price,
      amenities,
      authorName,
      authorEmail,
      authorAvatar,
      authorType,
      location,
    ] = fields;

    return {
      title,
      description,
      postDate: new Date(postDate),
      city: city as City,
      previewImage,
      images: this.parseList(images),
      isPremium: this.parseBoolean(isPremium),
      isFavorite: this.parseBoolean(isFavorite),
      rating: Number(rating),
      type: type as HousingType,
      bedrooms: Number.parseInt(bedrooms, 10),
      maxAdults: Number.parseInt(maxAdults, 10),
      price: Number.parseInt(price, 10),
      amenities: this.parseList(amenities) as Amenity[],
      author: {
        name: authorName,
        email: authorEmail,
        avatarPath: authorAvatar || undefined,
        type: authorType as UserType,
      },
      commentCount: 0,
      location: this.parseLocation(location),
    };
  }

  private parseList(value: string): string[] {
    return value.split(';').map((item) => item.trim());
  }

  private parseBoolean(value: string): boolean {
    return value === 'true';
  }

  private parseLocation(value: string): Offer['location'] {
    const [latitude, longitude] = value.split(';').map(Number);
    return { latitude, longitude };
  }

  public read(): void {
    this.rawData = readFileSync(this.filename, { encoding: 'utf-8' });
  }

  public toArray(): Offer[] {
    this.validateRawData();
    return this.parseRawDataToOffers();
  }
}
