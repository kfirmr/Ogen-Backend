export enum TDraftActionStatus {
  DRAFTED = 'DRAFTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  EXECUTED = 'EXECUTED',
}

export const DRAFT_ACTION_STATUS_VALUES = Object.values(TDraftActionStatus);

// EXECUTED is reserved for a future send step; only the user's own approve/reject choice is a
// valid transition today, and every status is terminal once left DRAFTED.
export const DRAFT_ACTION_STATUS_TRANSITIONS: Record<
  TDraftActionStatus,
  TDraftActionStatus[]
> = {
  [TDraftActionStatus.DRAFTED]: [
    TDraftActionStatus.APPROVED,
    TDraftActionStatus.REJECTED,
  ],
  [TDraftActionStatus.APPROVED]: [],
  [TDraftActionStatus.REJECTED]: [],
  [TDraftActionStatus.EXECUTED]: [],
};
