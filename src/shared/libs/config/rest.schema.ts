import convict from 'convict';
import validator from 'convict-format-with-validator';

convict.addFormats(validator);

function nonEmptyString(value: unknown): void {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error('must be a non-empty string');
  }
}

export type RestSchema = {
  PORT: number;
  DB_HOST: string;
  DB_PORT: number;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_NAME: string;
  SALT: string;
};

export const configRestSchema = convict<RestSchema>({
  PORT: {
    doc: 'Port for incoming connections',
    format: 'port',
    env: 'PORT',
    default: null,
  },
  DB_HOST: {
    doc: 'IP address of the database server',
    format: 'ipaddress',
    env: 'DB_HOST',
    default: null,
  },
  DB_PORT: {
    doc: 'Port to connect to the database (MongoDB)',
    format: 'port',
    env: 'DB_PORT',
    default: 27017,
  },
  DB_USER: {
    doc: 'Username to connect to the database',
    format: nonEmptyString,
    env: 'DB_USER',
    default: null,
  },
  DB_PASSWORD: {
    doc: 'Password to connect to the database',
    format: nonEmptyString,
    env: 'DB_PASSWORD',
    default: null,
  },
  DB_NAME: {
    doc: 'Database name (MongoDB)',
    format: nonEmptyString,
    env: 'DB_NAME',
    default: 'six-cities',
  },
  SALT: {
    doc: 'Salt for password hash',
    format: nonEmptyString,
    env: 'SALT',
    default: null,
  },
});
