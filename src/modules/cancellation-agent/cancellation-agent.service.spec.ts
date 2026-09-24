import { Vendor } from '@Modules/vendor/entities/vendor.entity';
import { Insight } from '@Modules/insight/entities/insight.entity';
import { CancellationAgentService } from './cancellation-agent.service';
import { TInsightType } from '@Modules/insight/constants/insight-type.constant';
import { ICancellationDraftContext } from './interfaces/cancellation-draft.interface';

const invoke = jest.fn();
const createReactAgent = jest.fn().mockReturnValue({ invoke });

jest.mock('@langchain/core/tools', () => ({ tool: jest.fn() }));

jest.mock('@langchain/langgraph/prebuilt', () => ({
  createReactAgent: (...args: unknown[]): unknown => createReactAgent(...args),
}));

jest.mock('@langchain/anthropic', () => ({
  ChatAnthropic: jest.fn(),
}));

describe('CancellationAgentService', () => {
  const buildContext = (
    overrides: Partial<ICancellationDraftContext> = {},
  ): ICancellationDraftContext => ({
    vendor: {
      name: 'Netflix',
      cancellationEmail: 'help@netflix.com',
    } as Vendor,
    insight: { id: 'insight-1', type: TInsightType.OVERPAYING } as Insight,
    subscription: null,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    createReactAgent.mockReturnValue({ invoke });
  });

  it('skips drafting when the vendor has no cancellation email', async () => {
    const service = new CancellationAgentService();

    const result = await service.draftCancellation(
      buildContext({
        vendor: { name: 'Netflix', cancellationEmail: null } as Vendor,
      }),
    );

    expect(result).toBeNull();
    expect(createReactAgent).not.toHaveBeenCalled();
  });

  it('skips drafting for an informational HIGH_SPENDING insight', async () => {
    const service = new CancellationAgentService();

    const result = await service.draftCancellation(
      buildContext({
        insight: {
          id: 'insight-1',
          type: TInsightType.HIGH_SPENDING,
        } as Insight,
      }),
    );

    expect(result).toBeNull();
    expect(createReactAgent).not.toHaveBeenCalled();
  });

  it('drafts a cancellation email for an eligible OVERPAYING insight', async () => {
    const structuredResponse = {
      subject: 'Cancellation request',
      body: 'Please cancel my subscription.',
      reasoning: 'The user is overpaying compared to the market average.',
    };
    invoke.mockResolvedValue({ structuredResponse });

    const service = new CancellationAgentService();
    const result = await service.draftCancellation(buildContext());

    expect(createReactAgent).toHaveBeenCalledTimes(1);
    expect(result).toEqual(structuredResponse);
  });
});
