import {
  toCancellationContact,
  buildContactLookupMessage,
} from './utilities/cancellation-contact.utility';

import {
  RECORD_CONTACT_TOOL_NAME,
  CancellationContactSchema,
  CANCELLATION_CONTACT_MODEL,
  TRecordedCancellationContact,
  CANCELLATION_CONTACT_MAX_TOKENS,
  CANCELLATION_CONTACT_MAX_SEARCHES,
  CANCELLATION_CONTACT_SYSTEM_PROMPT,
  CANCELLATION_CONTACT_MAX_ITERATIONS,
} from './constants/cancellation-contact.constant';

import Anthropic from '@anthropic-ai/sdk';
import { Inject, Injectable } from '@nestjs/common';
import { TypedLogger } from '../../logger/logger.service';
import { AiProviderNames } from '@Providers/ai/provider-names';
import { VendorService } from '@Modules/vendor/vendor.service';
import { Vendor } from '@Modules/vendor/entities/vendor.entity';
import { betaZodTool } from '@anthropic-ai/sdk/helpers/beta/zod';
import { SubscriptionService } from '@Modules/subscription/subscription.service';
import { ICancellationContact } from '@Modules/vendor/interfaces/cancellation-contact.interface';

@Injectable()
export class CancellationContactService {
  private readonly logger = new TypedLogger('CancellationContactService');

  constructor(
    @Inject(AiProviderNames.ANTHROPIC_CLIENT)
    private readonly client: Anthropic,
    private readonly vendorService: VendorService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  // Looks up contacts only for vendors the user actually pays as a subscription, and only when
  // the stored contact is missing or old, so each vendor costs one web lookup per refresh window.
  public async resolveForUser(userId: string): Promise<void> {
    const vendorIds = await this.subscriptionService.getActiveVendorIds(userId);
    const vendors =
      await this.vendorService.getNeedingCancellationContact(vendorIds);

    const results = await Promise.allSettled(
      vendors.map((vendor) => this.resolveAndSave(vendor)),
    );

    for (const result of results) {
      if (result.status === 'rejected') {
        this.logger.error({
          message: 'Failed to resolve a vendor cancellation contact',
          error: result.reason,
        });
      }
    }
  }

  private async resolveAndSave(vendor: Vendor): Promise<void> {
    const contact = await this.lookUpContact(vendor);

    await this.vendorService.updateCancellationContact(vendor.id, contact);
  }

  private async lookUpContact(
    vendor: Vendor,
  ): Promise<ICancellationContact | null> {
    const recordedContacts: TRecordedCancellationContact[] = [];
    const recordContact = betaZodTool({
      name: RECORD_CONTACT_TOOL_NAME,
      inputSchema: CancellationContactSchema,
      description:
        "Record the vendor's cancellation channel found during the search.",
      run: (contact) => {
        recordedContacts.push(contact);

        return Promise.resolve('Recorded.');
      },
    });

    const runner = this.client.beta.messages.toolRunner({
      model: CANCELLATION_CONTACT_MODEL,
      max_tokens: CANCELLATION_CONTACT_MAX_TOKENS,
      system: CANCELLATION_CONTACT_SYSTEM_PROMPT,
      max_iterations: CANCELLATION_CONTACT_MAX_ITERATIONS,
      messages: [{ role: 'user', content: buildContactLookupMessage(vendor) }],
      tools: [
        recordContact,
        {
          name: 'web_search',
          type: 'web_search_20250305',
          max_uses: CANCELLATION_CONTACT_MAX_SEARCHES,
        },
      ],
    });

    // The runner only continues after a client tool result, so a paused server-side search
    // turn has to be pushed back by hand or the lookup silently ends early.
    for await (const message of runner) {
      if (message.stop_reason === 'pause_turn') {
        runner.pushMessages({ role: 'assistant', content: message.content });
      }
    }

    return toCancellationContact(recordedContacts.at(-1) ?? null);
  }
}
