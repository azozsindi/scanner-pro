export interface ScannedItem {
  code: string;
  count: number;
  timestamp: number;
  name?: string;
}

export type InventoryState = Record<string, ScannedItem>;
