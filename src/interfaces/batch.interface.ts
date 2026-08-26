export interface IBatchCursor {
  id: string;
  createdAt: string;
}

export interface IBatchResult<TItem> {
  items: TItem[];
  nextCursor: IBatchCursor | null;
}
