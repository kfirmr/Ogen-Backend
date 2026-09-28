import { z } from 'zod';
import { strictZodOutputFormat } from './structured-output.utility';

enum TColor {
  RED = 'RED',
  BLUE = 'BLUE',
}

const PaletteSchema = z.object({
  name: z.string().min(1),
  primary: z.nativeEnum(TColor),
  accent: z.nativeEnum(TColor).nullable(),
  swatches: z.array(z.object({ color: z.enum(['LIGHT', 'DARK']) })),
});

const JsonSchemaNode = z.record(z.string(), z.unknown());

const getProperties = (schema: unknown) =>
  z.object({ properties: z.record(z.string(), JsonSchemaNode) }).parse(schema)
    .properties;

const getFirstVariant = (schema: unknown) =>
  z.object({ anyOf: z.array(JsonSchemaNode) }).parse(schema).anyOf[0];

describe('strictZodOutputFormat', () => {
  const format = strictZodOutputFormat(PaletteSchema);
  const properties = getProperties(format.schema);

  it('sends a top-level enum to the API as a real constraint', () => {
    expect(properties.primary).toMatchObject({
      type: 'string',
      enum: ['RED', 'BLUE'],
    });
  });

  it('restores enums inside nullable unions and array items', () => {
    const swatchProperties = getProperties(properties.swatches.items);

    expect(getFirstVariant(properties.accent)).toMatchObject({
      enum: ['RED', 'BLUE'],
    });
    expect(swatchProperties.color).toMatchObject({ enum: ['LIGHT', 'DARK'] });
  });

  it('keeps unsupported constraints out of the schema sent to the API', () => {
    expect(properties.name).not.toHaveProperty('minLength');
  });

  it('still validates the response with the zod schema', () => {
    const valid = JSON.stringify({
      name: 'Sunset',
      primary: 'RED',
      accent: null,
      swatches: [{ color: 'DARK' }],
    });
    const invalid = JSON.stringify({
      name: 'Sunset',
      primary: 'GREEN',
      accent: null,
      swatches: [],
    });

    expect(format.parse(valid).primary).toBe(TColor.RED);
    expect(() => format.parse(invalid)).toThrow();
  });
});
