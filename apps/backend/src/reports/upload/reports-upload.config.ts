
import {
  BadRequestException,
} from '@nestjs/common';

import {
  diskStorage,
} from 'multer';

import {
  extname,
} from 'path';

import {
  mkdirSync,
} from 'fs';

const uploadDirectory = './uploads/reports';

mkdirSync(
  uploadDirectory,
  {
    recursive: true,
  },
);

const allowedMimeTypes = new Set([
  // Images
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/heic',
  'image/heif',
  'image/avif',

  // Videos
  'video/mp4',
  'video/quicktime',
  'video/x-m4v',
  'video/x-msvideo',
  'video/x-matroska',
  'video/webm',
  'video/3gpp',

  // Documents
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);

const allowedExtensions = new Set([
  // Images
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.bmp',
  '.heic',
  '.heif',
  '.avif',

  // Videos
  '.mp4',
  '.mov',
  '.m4v',
  '.avi',
  '.mkv',
  '.webm',
  '.3gp',

  // Documents
  '.pdf',
  '.txt',
  '.csv',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
]);

export const reportUploadOptions = {
  storage: diskStorage({
    destination: uploadDirectory,

    filename: (
      _req: any,
      file: Express.Multer.File,
      callback: (
        error: Error | null,
        filename: string,
      ) => void,
    ) => {
      const uniqueName =
        `${Date.now()}-${Math.round(
          Math.random() * 1e9,
        )}${extname(
          file.originalname,
        ).toLowerCase()}`;

      callback(
        null,
        uniqueName,
      );
    },
  }),

  limits: {
    fileSize: 20 * 1024 * 1024,
    files: 10,
  },

  fileFilter: (
    _req: any,
    file: Express.Multer.File,
    callback: (
      error: Error | null,
      acceptFile: boolean,
    ) => void,
  ) => {
    // Preserve existing debugging information.
    console.log(
      'Uploaded file:',
      file.originalname,
      'MIME type:',
      file.mimetype,
    );

    const extension = extname(
      file.originalname,
    ).toLowerCase();

    const hasAllowedMimeType =
      allowedMimeTypes.has(
        file.mimetype,
      );

    const hasAllowedExtension =
      allowedExtensions.has(
        extension,
      );

    // Preserve the existing file acceptance rules.
    if (
      hasAllowedMimeType ||
      (
        file.mimetype ===
          'application/octet-stream' &&
        hasAllowedExtension
      )
    ) {
      callback(
        null,
        true,
      );
    } else {
      callback(
        new BadRequestException(
          `Unsupported file type: ${file.mimetype}`,
        ),
        false,
      );
    }
  },
};
