import { createReadStream } from 'node:fs';
import { EventEmitter } from 'node:events';
import { FileReader } from './file-reader.interface.js';
import { Amenity, City, HousingType, Offer, UserType } from '../../types/index.js';

const OFFER_FIELDS_COUNT = 19;
const CHUNK_SIZE = 16 * 1024;

export class TSVFileReader extends EventEmitter implements FileReader {
  constructor(
    private readonly filename: string
  ) {
    super();
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
    return value.split(';').map((item) => item.trim()).filter((item) => item.length > 0);
  }

  private parseBoolean(value: string): boolean {
    return value === 'true';
  }

  private parseLocation(value: string): Offer['location'] {
    const [latitude, longitude] = value.split(';').map(Number);
    return { latitude, longitude };
  }

  private emitLine(line: string, lineNumber: number): void {
    const trimmedLine = line.replace(/\r$/, '');

    if (trimmedLine.trim().length === 0) {
      return;
    }

    this.emit('offer', this.parseLineToOffer(trimmedLine, lineNumber));
  }

  public async read(): Promise<void> {
    const readStream = createReadStream(this.filename, {
      encoding: 'utf-8',
      highWaterMark: CHUNK_SIZE,
    });

    let remainder = '';
    let lineNumber = 0;

    for await (const chunk of readStream) {
      const lines = `${remainder}${String(chunk)}`.split('\n');
      remainder = lines.pop() ?? '';

      for (const line of lines) {
        lineNumber++;
        this.emitLine(line, lineNumber);
      }
    }

    if (remainder.length > 0) {
      lineNumber++;
      this.emitLine(remainder, lineNumber);
    }
  }
}
