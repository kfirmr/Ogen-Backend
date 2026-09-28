import { getHttpErrorResponse } from './http-error.utility';
import { HttpStatus, ConflictException } from '@nestjs/common';

const buildMiddlewareError = (fields: Record<string, unknown>) =>
  Object.assign(new Error('request entity too large'), fields);

describe('getHttpErrorResponse', () => {
  it('keeps the status and message of an HttpException', () => {
    const result = getHttpErrorResponse(new ConflictException('Busy'));

    expect(result).toEqual({
      statusCode: HttpStatus.CONFLICT,
      message: 'Busy',
    });
  });

  it('keeps the status of an exposed middleware error such as an oversized body', () => {
    const error = buildMiddlewareError({
      expose: true,
      status: HttpStatus.PAYLOAD_TOO_LARGE,
    });

    expect(getHttpErrorResponse(error)).toEqual({
      statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
      message: 'request entity too large',
    });
  });

  it('hides a middleware error that is not flagged as exposed', () => {
    const error = buildMiddlewareError({
      expose: false,
      status: HttpStatus.INTERNAL_SERVER_ERROR,
    });

    expect(getHttpErrorResponse(error)).toEqual({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal Server Error',
    });
  });

  it('hides an unknown error behind a generic 500', () => {
    expect(getHttpErrorResponse(new Error('secret detail'))).toEqual({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal Server Error',
    });
  });
});
