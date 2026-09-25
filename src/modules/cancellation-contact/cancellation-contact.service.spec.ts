import Anthropic from '@anthropic-ai/sdk';
import { VendorService } from '@Modules/vendor/vendor.service';
import { CancellationContactService } from './cancellation-contact.service';
import { SubscriptionService } from '@Modules/subscription/subscription.service';
import { RECORD_CONTACT_TOOL_NAME } from './constants/cancellation-contact.constant';
import { TCancellationMethod } from '@Modules/vendor/constants/cancellation-method.constant';

interface IRunnableTool {
  name: string;
  type?: string;
  run?: (input: unknown) => Promise<string>;
}

interface IRunnerParams {
  model: string;
  tools: IRunnableTool[];
}

// Stands in for the SDK tool runner: invokes the record tool the way the model would, then
// yields the final message.
const buildClient = (recordedInput: unknown, stopReasons: string[]) => {
  const pushMessages = jest.fn();
  const toolRunner = jest.fn((params: IRunnerParams) => ({
    pushMessages,
    async *[Symbol.asyncIterator]() {
      const recordTool = params.tools.find(
        (tool) => tool.name === RECORD_CONTACT_TOOL_NAME,
      );

      if (recordedInput != null) {
        await recordTool?.run?.(recordedInput);
      }

      for (const stopReason of stopReasons) {
        yield { stop_reason: stopReason, content: [] };
      }
    },
  }));

  const client = {
    beta: { messages: { toolRunner } },
  } as unknown as Anthropic;

  return { client, toolRunner, pushMessages };
};

const vendor = { id: 'vendor-1', name: 'CrossFit Impulso', category: null };

const buildServices = () => {
  const updateCancellationContact = jest.fn().mockResolvedValue(undefined);
  const vendorService = {
    updateCancellationContact,
    getNeedingCancellationContact: jest.fn().mockResolvedValue([vendor]),
  } as unknown as VendorService;
  const subscriptionService = {
    getActiveVendorIds: jest.fn().mockResolvedValue(['vendor-1']),
  } as unknown as SubscriptionService;

  return { vendorService, subscriptionService, updateCancellationContact };
};

describe('CancellationContactService', () => {
  it('saves the contact the web lookup recorded for each vendor needing one', async () => {
    const { client, toolRunner } = buildClient(
      {
        url: null,
        phone: null,
        email: 'info@impulso.co.il',
        method: TCancellationMethod.EMAIL,
        sourceUrl: 'https://impulso.co.il/terms',
      },
      ['end_turn'],
    );
    const { vendorService, subscriptionService, updateCancellationContact } =
      buildServices();
    const service = new CancellationContactService(
      client,
      vendorService,
      subscriptionService,
    );

    await service.resolveForUser('user-1');

    const [runnerParams] = toolRunner.mock.calls[0];

    expect(runnerParams.model).toBe('claude-haiku-4-5');
    expect(runnerParams.tools.map((tool) => tool.type)).toContain(
      'web_search_20250305',
    );
    expect(updateCancellationContact).toHaveBeenCalledWith('vendor-1', {
      url: null,
      phone: null,
      email: 'info@impulso.co.il',
      method: TCancellationMethod.EMAIL,
      sourceUrl: 'https://impulso.co.il/terms',
    });
  });

  it('marks the vendor as checked with no contact when the lookup finds nothing', async () => {
    const { client } = buildClient(null, ['end_turn']);
    const { vendorService, subscriptionService, updateCancellationContact } =
      buildServices();
    const service = new CancellationContactService(
      client,
      vendorService,
      subscriptionService,
    );

    await service.resolveForUser('user-1');

    expect(updateCancellationContact).toHaveBeenCalledWith('vendor-1', null);
  });

  it('resumes a paused server-side search turn instead of ending the lookup', async () => {
    const { client, pushMessages } = buildClient(null, [
      'pause_turn',
      'end_turn',
    ]);
    const { vendorService, subscriptionService } = buildServices();
    const service = new CancellationContactService(
      client,
      vendorService,
      subscriptionService,
    );

    await service.resolveForUser('user-1');

    expect(pushMessages).toHaveBeenCalledWith({
      role: 'assistant',
      content: [],
    });
  });

  it('does not fail the caller when one vendor lookup throws', async () => {
    const client = {
      beta: {
        messages: {
          toolRunner: jest.fn(() => {
            throw new Error('rate limited');
          }),
        },
      },
    } as unknown as Anthropic;
    const { vendorService, subscriptionService, updateCancellationContact } =
      buildServices();
    const service = new CancellationContactService(
      client,
      vendorService,
      subscriptionService,
    );

    await expect(service.resolveForUser('user-1')).resolves.toBeUndefined();
    expect(updateCancellationContact).not.toHaveBeenCalled();
  });
});
