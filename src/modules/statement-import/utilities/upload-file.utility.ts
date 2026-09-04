import { Request } from 'express';
import { BadRequestException } from '@nestjs/common';

const XLSX_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/octet-stream',
];

type TFileFilterCallback = (error: Error | null, acceptFile: boolean) => void;

export const xlsxFileFilter = (
  _request: Request,
  file: Express.Multer.File,
  callback: TFileFilterCallback,
): void => {
  const hasXlsxExtension = file.originalname.toLowerCase().endsWith('.xlsx');
  const hasXlsxMimeType = XLSX_MIME_TYPES.includes(file.mimetype);

  if (!hasXlsxExtension || !hasXlsxMimeType) {
    callback(new BadRequestException('Only .xlsx files are accepted'), false);
    return;
  }

  callback(null, true);
};
