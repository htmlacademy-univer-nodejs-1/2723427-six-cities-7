import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { StatusCodes } from 'http-status-codes';
import sharp from 'sharp';
import { HttpError } from '../errors/http-error.js';

export const AVATAR_URL_PATH = '/avatars';
export const AVATAR_DIRECTORY = fileURLToPath(new URL('../../../uploads/avatars/', import.meta.url));
export const DEFAULT_AVATAR_URL = '/img/avatar.svg';
export const DEFAULT_AVATAR_FILE = fileURLToPath(new URL('../../../markup/img/avatar.svg', import.meta.url));
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const MAX_AVATAR_PIXELS = 4096 * 4096;

export async function validateAvatar(file: Express.Multer.File | undefined): Promise<{ image: Buffer; extension: string }> {
  const image = file?.buffer;
  const isPng = file?.mimetype === 'image/png' && image?.subarray(0, 8).equals(PNG_SIGNATURE);
  const isJpeg = file?.mimetype === 'image/jpeg' && image?.[0] === 0xff && image[1] === 0xd8 && image[2] === 0xff;

  if (!image || (!isPng && !isJpeg)) {
    throw new HttpError(StatusCodes.BAD_REQUEST, 'Avatar must be a JPG or PNG image');
  }

  try {
    await sharp(image, { failOn: 'warning', limitInputPixels: MAX_AVATAR_PIXELS }).raw().toBuffer();
  } catch {
    throw new HttpError(StatusCodes.BAD_REQUEST, 'Avatar is damaged or exceeds the pixel limit');
  }

  return { image, extension: isPng ? 'png' : 'jpg' };
}

export async function storeAvatar(userId: string, image: Buffer, extension: string): Promise<string> {
  const filename = `${userId.toLowerCase()}.${extension}`;
  await mkdir(AVATAR_DIRECTORY, { recursive: true });
  await writeFile(join(AVATAR_DIRECTORY, filename), image);
  return `${AVATAR_URL_PATH}/${filename}`;
}
