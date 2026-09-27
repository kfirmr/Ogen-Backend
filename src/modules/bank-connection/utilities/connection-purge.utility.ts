import { ITransaction } from '@Modules/transaction/interfaces/transaction.interface';

export const collectSubscriptionIds = (
  transactions: Pick<ITransaction, 'subscriptionId'>[],
): string[] => [
  ...new Set(
    transactions.flatMap((transaction) =>
      transaction.subscriptionId === null ? [] : [transaction.subscriptionId],
    ),
  ),
];

// A subscription also billed on another connected account keeps its remaining charges, so only
// the ones this connection was the sole source of are removed with it.
export const findOrphanedSubscriptionIds = (
  subscriptionIds: string[],
  stillChargedIds: string[],
): string[] =>
  subscriptionIds.filter(
    (subscriptionId) => !stillChargedIds.includes(subscriptionId),
  );
