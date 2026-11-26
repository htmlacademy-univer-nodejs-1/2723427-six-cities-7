import { ClassConstructor } from 'class-transformer';
import { ValidationError, validateSync } from 'class-validator';
import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { ErrorDetail, HttpError } from '../errors/http-error.js';
import { fillDTO } from '../helpers/fill-dto.js';
import { Middleware } from '../types/middleware.interface.js';

function flattenErrors(errors: ValidationError[], prefix = ''): ErrorDetail[] {
  return errors.flatMap(({ property, constraints, children }) => {
    const field = `${prefix}${property}`;
    return [
      ...Object.values(constraints ?? {}).map((message) => ({ field, message })),
      ...flattenErrors(children ?? [], `${field}.`),
    ];
  });
}

export class ValidateDtoMiddleware implements Middleware {
  constructor(
    private readonly dtoClass: ClassConstructor<object>,
    private readonly partial = false,
  ) {}

  public execute(req: Request, _res: Response, next: NextFunction): void {
    const body: unknown = req.body;

    if (!req.is('application/json') || !body || typeof body !== 'object' || Array.isArray(body)) {
      throw new HttpError(StatusCodes.BAD_REQUEST, 'Request body must be a JSON object');
    }

    const dto = fillDTO(this.dtoClass, body);
    const errors = validateSync(dto, {
      skipUndefinedProperties: this.partial,
      validationError: { target: false, value: false },
    });

    if (errors.length) {
      throw new HttpError(StatusCodes.BAD_REQUEST, 'Validation failed', flattenErrors(errors));
    }

    req.body = dto;
    next();
  }
}
