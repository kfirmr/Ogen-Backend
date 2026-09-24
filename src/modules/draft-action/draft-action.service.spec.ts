import { UniqueConstraintError } from 'sequelize';
import { DraftActionService } from './draft-action.service';
import { DraftAction } from './entities/draft-action.entity';
import { DraftActionRepository } from './draft-action.repository';
import { TDraftActionType } from './constants/draft-action-type.constant';
import { TDraftActionStatus } from './constants/draft-action-status.constant';

describe('DraftActionService', () => {
  const buildDraftAction = (
    overrides: Partial<DraftAction> = {},
  ): DraftAction =>
    ({
      id: 'draft-1',
      userId: 'user-1',
      status: TDraftActionStatus.DRAFTED,
      ...overrides,
    }) as DraftAction;

  describe('updateStatus', () => {
    it('allows moving a drafted action to approved', async () => {
      const draftAction = buildDraftAction();
      const findById = jest
        .fn()
        .mockResolvedValueOnce(draftAction)
        .mockResolvedValueOnce({
          ...draftAction,
          status: TDraftActionStatus.APPROVED,
        });
      const update = jest.fn().mockResolvedValue([1]);
      const repository = {
        findById,
        update,
      } as unknown as DraftActionRepository;
      const service = new DraftActionService(repository);

      const result = await service.updateStatus('draft-1', 'user-1', {
        status: TDraftActionStatus.APPROVED,
      });

      expect(update).toHaveBeenCalledWith('draft-1', {
        status: TDraftActionStatus.APPROVED,
      });
      expect(result.status).toBe(TDraftActionStatus.APPROVED);
    });

    it('rejects moving an already-approved action back to drafted', async () => {
      const draftAction = buildDraftAction({
        status: TDraftActionStatus.APPROVED,
      });
      const update = jest.fn();
      const repository = {
        findById: jest.fn().mockResolvedValue(draftAction),
        update,
      } as unknown as DraftActionRepository;
      const service = new DraftActionService(repository);

      await expect(
        service.updateStatus('draft-1', 'user-1', {
          status: TDraftActionStatus.DRAFTED,
        }),
      ).rejects.toThrow();
      expect(update).not.toHaveBeenCalled();
    });

    it('rejects setting EXECUTED directly since sending is not implemented', async () => {
      const draftAction = buildDraftAction();
      const repository = {
        findById: jest.fn().mockResolvedValue(draftAction),
        update: jest.fn(),
      } as unknown as DraftActionRepository;
      const service = new DraftActionService(repository);

      await expect(
        service.updateStatus('draft-1', 'user-1', {
          status: TDraftActionStatus.EXECUTED,
        }),
      ).rejects.toThrow();
    });
  });

  describe('create', () => {
    it('reuses the existing draft when one already exists for the insight', async () => {
      const existingDraft = buildDraftAction();
      const create = jest.fn().mockRejectedValue(new UniqueConstraintError({}));
      const findByInsight = jest.fn().mockResolvedValue(existingDraft);
      const repository = {
        create,
        findByInsight,
      } as unknown as DraftActionRepository;
      const service = new DraftActionService(repository);

      const result = await service.create({
        userId: 'user-1',
        insightId: 'insight-1',
        actionType: TDraftActionType.CANCELLATION_EMAIL,
        subject: 'Cancellation request',
        body: 'Please cancel my subscription.',
      });

      expect(findByInsight).toHaveBeenCalledWith('insight-1');
      expect(result).toBe(existingDraft);
    });
  });
});
