const BEARER_PREFIX = 'bearer ';

export const extractBearerToken = (
  authorizationHeader?: string | null,
): string | null => {
  if (authorizationHeader == null) {
    return null;
  }

  if (!authorizationHeader.toLowerCase().startsWith(BEARER_PREFIX)) {
    return null;
  }

  const token = authorizationHeader.slice(BEARER_PREFIX.length).trim();

  if (token.length === 0) {
    return null;
  }

  return token;
};
