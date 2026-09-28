import { isString } from 'class-validator';
import { isObject } from './object.utility';
import { HttpException } from '@nestjs/common';

type TSafeResponse = Record<string, unknown>;

interface IHttpErrorResponse {
  message: string;
  statusCode: number;
  safeResponse?: TSafeResponse;
}

const extractErrorMessage = (error: HttpException): string => {
  const response = error.getResponse();

  if (!response) {
    return error.message;
  }

  if (isString(response)) {
    return response;
  }

  if (Reflect.has(response, 'message')) {
    return Reflect.get(response, 'message');
  }

  return error.message;
};

const extractSafeResponse = (error: HttpException): TSafeResponse | null => {
  const response = error.getResponse();

  if (!isObject(response)) {
    return null;
  }

  const safeResponse: unknown = Reflect.get(response, 'safeResponse');

  if (isObject(safeResponse)) {
    return safeResponse;
  }

  return null;
};

interface IExposedHttpError {
  status: number;
  message: string;
}

// Express middleware such as body-parser rejects requests with http-errors objects, flagging the
// client-facing ones (e.g. 413 payload too large) with `expose` instead of throwing HttpException.
const isExposedHttpError = (error: unknown): error is IExposedHttpError => {
  if (!isObject(error)) {
    return false;
  }

  const hasStatus = typeof error.status === 'number';
  const isExposed = error.expose === true;

  return hasStatus && isExposed && isString(error.message);
};

export const getHttpErrorResponse = (error: unknown): IHttpErrorResponse => {
  if (error && error instanceof HttpException) {
    const safeResponse = extractSafeResponse(error);

    const result: IHttpErrorResponse = {
      statusCode: error.getStatus(),
      message: extractErrorMessage(error),
    };

    if (safeResponse) {
      result.safeResponse = safeResponse;
    }

    return result;
  }

  if (isExposedHttpError(error)) {
    return { statusCode: error.status, message: error.message };
  }

  return {
    statusCode: 500,
    message: 'Internal Server Error',
  };
};
