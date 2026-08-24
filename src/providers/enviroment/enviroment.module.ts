import * as Joi from 'joi';
import { ConfigModule } from '@nestjs/config';

const environmentSchema = Joi.object({
  DB_USER: Joi.string().required(),
  DB_HOST: Joi.string().required(),
  DB_NAME: Joi.string().required(),
  DB_PASS: Joi.string().required(),
  DB_PORT: Joi.number().default(5432),
});

export const EnvironmentModule = ConfigModule.forRoot({
  isGlobal: true,
  validationSchema: environmentSchema,
});
