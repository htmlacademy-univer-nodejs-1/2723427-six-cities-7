import { setTimeout } from 'node:timers/promises';
import { inject, injectable } from 'inversify';
import mongoose, { Mongoose } from 'mongoose';
import { DatabaseClient } from './database-client.interface.js';
import { Logger } from '../logger/index.js';
import { Component } from '../../types/index.js';

const RETRY_COUNT = 5;
const RETRY_TIMEOUT = 1000;

@injectable()
export class MongoDatabaseClient implements DatabaseClient {
  private mongoose: Mongoose | null = null;

  constructor(
    @inject(Component.Logger) private readonly logger: Logger
  ) {}

  public isConnectedToDatabase(): boolean {
    return this.mongoose !== null;
  }

  public async connect(uri: string): Promise<void> {
    if (this.isConnectedToDatabase()) {
      throw new Error('MongoDB client already connected');
    }

    this.logger.info('Trying to connect to MongoDB…');

    for (let attempt = 1; attempt <= RETRY_COUNT; attempt++) {
      try {
        this.mongoose = await mongoose.connect(uri);
        this.logger.info('Database connection established.');
        return;
      } catch (error) {
        this.logger.error(`Failed to connect to the database. Attempt ${attempt} of ${RETRY_COUNT}`, error as Error);

        if (attempt < RETRY_COUNT) {
          await setTimeout(RETRY_TIMEOUT);
        }
      }
    }

    throw new Error(`Unable to establish database connection after ${RETRY_COUNT} attempts`);
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnectedToDatabase()) {
      throw new Error('Not connected to the database');
    }

    await this.mongoose?.disconnect();
    this.mongoose = null;
    this.logger.info('Database connection closed.');
  }
}
