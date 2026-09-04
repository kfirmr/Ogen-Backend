export interface ISpendingBaseline {
  count: number;
  average: number;
}

export const computeSpendingBaseline = (
  amounts: string[],
): ISpendingBaseline => {
  if (amounts.length === 0) {
    return { average: 0, count: 0 };
  }

  const total = amounts.reduce((sum, amount) => sum + Number(amount), 0);

  return { average: total / amounts.length, count: amounts.length };
};
