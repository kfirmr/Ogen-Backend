import { TCancellationMethod } from '../constants/cancellation-method.constant';

export interface ICancellationContact {
  url: string | null;
  email: string | null;
  phone: string | null;
  sourceUrl: string | null;
  method: TCancellationMethod;
}
