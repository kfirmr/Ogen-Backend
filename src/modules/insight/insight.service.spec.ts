import { InsightService } from './insight.service';
import { Insight } from './entities/insight.entity';
import { InsightRepository } from './insight.repository';
import { XpEventService } from '@Modules/xp-event/xp-event.service';
import { TInsightStatus } from './constants/insight-status.constant';
import { TransactionService } from '@Modules/transaction/transaction.service';
import { SubscriptionService } from '@Modules/subscription/subscription.service';

const buildInsight = (overrides: Partial<Insight> = {}) =>
  ({
    id: 'a5f0c0de-0000-4000-8000-000000000020',
    userId: 'a5f0c0de-0000-4000-8000-000000000001',
    status: TInsightStatus.UNREAD,
    ...overrides,
  }) as Insight;

describe('InsightService', () => {
  const buildInsightRepository = (overrides: Partial<InsightRepository>) =>
    ({
      update: jest.fn(),
      findById: jest.fn(),
      ...overrides,
    }) as unknown as InsightRepository;

  const buildXpEventService = (overrides: Partial<XpEventService>) =>
    ({ award: jest.fn(), ...overrides }) as unknown as XpEventService;

  const buildService = ({
    insightRepository,
    xpEventService,
  }: {
    insightRepository: InsightRepository;
    xpEventService: XpEventService;
  }) =>
    new InsightService(
      insightRepository,
      xpEventService,
      {} as TransactionService,
      {} as SubscriptionService,
    );

  describe('updateStatus', () => {
    it('awards xp the first time an insight is marked as action taken', async () => {
      const insight = buildInsight({ status: TInsightStatus.UNREAD });
      const findById = jest.fn().mockResolvedValue(insight);
      const insightRepository = buildInsightRepository({ findById });
      const award = jest.fn().mockResolvedValue(null);
      const xpEventService = buildXpEventService({ award });
      const service = buildService({ insightRepository, xpEventService });

      await service.updateStatus(insight.id, insight.userId, {
        status: TInsightStatus.ACTION_TAKEN,
      });

      expect(award).toHaveBeenCalledWith(insight.userId, 'INSIGHT_DISMISSED');
    });

    it('does not award xp again when the insight is already action taken', async () => {
      const insight = buildInsight({ status: TInsightStatus.ACTION_TAKEN });
      const findById = jest.fn().mockResolvedValue(insight);
      const insightRepository = buildInsightRepository({ findById });
      const award = jest.fn().mockResolvedValue(null);
      const xpEventService = buildXpEventService({ award });
      const service = buildService({ insightRepository, xpEventService });

      await service.updateStatus(insight.id, insight.userId, {
        status: TInsightStatus.ACTION_TAKEN,
      });

      expect(award).not.toHaveBeenCalled();
    });

    it('does not award xp when moving to a status other than action taken', async () => {
      const insight = buildInsight({ status: TInsightStatus.UNREAD });
      const findById = jest.fn().mockResolvedValue(insight);
      const insightRepository = buildInsightRepository({ findById });
      const award = jest.fn().mockResolvedValue(null);
      const xpEventService = buildXpEventService({ award });
      const service = buildService({ insightRepository, xpEventService });

      await service.updateStatus(insight.id, insight.userId, {
        status: TInsightStatus.READ,
      });

      expect(award).not.toHaveBeenCalled();
    });
  });
});
