import { Amenity } from './amenity.enum.js';
import { HousingType } from './housing-type.enum.js';
import { Location } from './location.type.js';
import { User } from './user.type.js';

export type MockCity = {
  name: string;
  location: Location;
};

export type MockServerData = {
  titles: string[];
  descriptions: string[];
  cities: MockCity[];
  previewImages: string[];
  images: string[];
  housingTypes: HousingType[];
  amenities: Amenity[];
  users: User[];
};
