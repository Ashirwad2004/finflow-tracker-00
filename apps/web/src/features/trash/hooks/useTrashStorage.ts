import { useCallback } from "react";
import {
  ItemType,
  BaseDeletedItem,
  DeletedItem,
  DeletedExpense,
  DeletedLentMoney,
  DeletedBorrowedMoney,
  DeletedGroup,
  DeletedParty,
  DeletedProduct,
  DeletedSale,
  DeletedPurchase,
} from "../types";

export const safeJSONParse = <T,>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (error) {
    console.warn(`Error parsing localStorage key "${key}":`, error);
    return fallback;
  }
};

export const useTrashStorage = (userId: string) => {
  const getStorageKey = useCallback((type: ItemType) => {
    const keys: Record<ItemType, string> = {
      expense: `recently_deleted_${userId}`,
      lent_money: `recently_deleted_lent_money_${userId}`,
      borrowed_money: `recently_deleted_borrowed_money_${userId}`,
      group: `recently_deleted_groups_${userId}`,
      party: `recently_deleted_parties_${userId}`,
      product: `recently_deleted_products_${userId}`,
      sale: `recently_deleted_sales_${userId}`,
      purchase: `recently_deleted_purchases_${userId}`,
    };
    return keys[type];
  }, [userId]);

  const getAllDeletedItems = useCallback((): DeletedItem[] => {
    if (!userId) return [];

    const load = <T extends DeletedItem>(type: ItemType): T[] => {
      const items = safeJSONParse<any[]>(getStorageKey(type), []);
      return items.map((i) => ({
        ...i,
        type,
        deleted_at: i.deleted_at || new Date().toISOString(),
      }));
    };

    const allItems = [
      ...load<DeletedExpense>("expense"),
      ...load<DeletedLentMoney>("lent_money"),
      ...load<DeletedBorrowedMoney>("borrowed_money"),
      ...load<DeletedGroup>("group"),
      ...load<DeletedParty>("party"),
      ...load<DeletedProduct>("product"),
      ...load<DeletedSale>("sale"),
      ...load<DeletedPurchase>("purchase"),
    ];

    // Sort by most recently deleted
    return allItems.sort((a, b) =>
      new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime()
    );
  }, [userId, getStorageKey]);

  const removePermanently = useCallback((itemsToRemove: { id: string; type: ItemType }[]) => {
    const types: ItemType[] = ["expense", "lent_money", "borrowed_money", "group", "party", "product", "sale", "purchase"];

    types.forEach((type) => {
      const idsToRemove = itemsToRemove
        .filter((i) => i.type === type)
        .map((i) => i.id);

      if (idsToRemove.length > 0) {
        const key = getStorageKey(type);
        const existing = safeJSONParse<BaseDeletedItem[]>(key, []);
        const updated = existing.filter((i) => !idsToRemove.includes(i.id));
        localStorage.setItem(key, JSON.stringify(updated));
      }
    });
  }, [getStorageKey]);

  return { getAllDeletedItems, removePermanently };
};
