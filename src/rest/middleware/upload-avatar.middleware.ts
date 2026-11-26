import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import multer from 'multer';
import { HttpError } from '../errors/http-error.js';
import { Middleware } from '../types/middleware.interface.js';

export class UploadAvatarMiddleware implements Middleware {
  private readonly parse = multer({
    limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 1, fieldSize: 24 },
  }).single('avatar');

  public execute(req: Request, res: Response, next: NextFunction): void {
    if (!req.is('multipart/form-data')) {
      throw new HttpError(StatusCodes.BAD_REQUEST, 'Expected multipart/form-data');
    }

    this.parse(req, res, (error?: unknown) => {
      next(error ? new HttpError(StatusCodes.BAD_REQUEST, 'Invalid avatar upload') : undefined);
    });
  }
}
