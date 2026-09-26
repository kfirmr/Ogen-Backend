import { Public } from './public.decorator';
import { applyDecorators, UseGuards } from '@nestjs/common';
import { ServiceTokenGuard } from '../guards/service-token.guard';

export const WorkerEndpoint = () =>
  applyDecorators(Public(), UseGuards(ServiceTokenGuard));
