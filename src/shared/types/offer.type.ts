import { Amenity } from './amenity.enum.js';
import { City } from './city.enum.js';
import { HousingType } from './housing-type.enum.js';
import { Location } from './location.type.js';
import { User } from './user.type.js';

export type Offer = {
  title: string;
  description: string;
  postDate: Date;
  city: City;
  previewImage: string;
  images: string[];
  isPremium: boolean;
  isFavorite: boolean;
  rating: number;
  type: HousingType;
  bedrooms: number;
  maxAdults: number;
  price: number;
  amenities: Amenity[];
  author: User;
  commentCount: number;
  location: Location;
};
