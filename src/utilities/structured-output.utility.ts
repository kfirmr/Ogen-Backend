import { z } from 'zod';
import { isObject } from './object.utility';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { AutoParseableOutputFormat } from '@anthropic-ai/sdk/lib/parser';

type TJsonSchema = Record<string, unknown>;

const restoreEnumsInValue = (source: unknown, target: unknown): unknown => {
  if (Array.isArray(source) && Array.isArray(target)) {
    return target.map((entry, index) =>
      restoreEnumsInValue(source[index], entry),
    );
  }

  if (!isObject(source) || !isObject(target)) {
    return target;
  }

  return restoreEnums(source, target);
};

const restoreEnums = (
  source: TJsonSchema,
  target: TJsonSchema,
): TJsonSchema => {
  const restored = Object.fromEntries(
    Object.entries(target).map(([key, value]) => [
      key,
      restoreEnumsInValue(source[key], value),
    ]),
  );

  if (!Array.isArray(source.enum)) {
    return restored;
  }

  return { ...restored, enum: source.enum };
};

// The SDK's schema transform keeps only type, format and structure, so an enum reaches the API as
// a description hint and the model can answer outside it; the enum is restored so the API enforces it.
export const strictZodOutputFormat = <TSchema extends z.ZodType>(
  schema: TSchema,
): AutoParseableOutputFormat<z.infer<TSchema>> => {
  const format = zodOutputFormat(schema);
  const zodJsonSchema = z.toJSONSchema(schema, { reused: 'ref' });

  return { ...format, schema: restoreEnums(zodJsonSchema, format.schema) };
};
