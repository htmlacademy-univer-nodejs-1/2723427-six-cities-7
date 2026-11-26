import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { isObjectIdOrHexString } from 'mongoose';
import { HttpError } from '../errors/http-error.js';
import { Middleware } from '../types/middleware.interface.js';

export class ValidateObjectIdMiddleware implements Middleware {
  constructor(
    private readonly field: string,
    private readonly source: 'params' | 'query' | 'body' = 'params',
  ) {}

  public execute(req: Request, _res: Response, next: NextFunction): void {
    const value: unknown = req[this.source]?.[this.field];

    if (typeof value !== 'string' || !isObjectIdOrHexString(value)) {
      const message = `${this.field} must be a valid ObjectId`;
      throw new HttpError(StatusCodes.BAD_REQUEST, message, [{ field: this.field, message }]);
    }

    next();
  }
}
