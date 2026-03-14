/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { InventoryItem, AppConfig, DEFAULT_CONFIG, SHEET_URL, STOCK_SHEET_URL, STOCK_SHEET_NAME, AuditEntry } from './types';
import { toast } from 'sonner';
import { translations } from './i18n';

export function useInventory() {
  const [inventory, setInventory] = useState<InventoryItem[]>(() => {
    const saved = localStorage.getItem("noor_glass_v2026_final");
    return saved ? JSON.parse(saved) : [];
  });

  const [config, setConfig] = useState<AppConfig>(() => {
    const saved = localStorage.getItem("noor_config");
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_CONFIG, ...parsed };
    }
    return DEFAULT_CONFIG;
  });

  const [lang, setLang] = useState<'ar' | 'en'>(() => {
    const saved = localStorage.getItem("noor_lang");
    return (saved as 'ar' | 'en') || 'ar';
  });

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem("noor_theme");
    return (saved as 'light' | 'dark') || 'light';
  });

  const [notes, setNotes] = useState(() => localStorage.getItem('noor_notes') || "");

  useEffect(() => {
    localStorage.setItem("noor_glass_v2026_final", JSON.stringify(inventory));
  }, [inventory]);

  useEffect(() => {
    localStorage.setItem("noor_config", JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    localStorage.setItem("noor_lang", lang);
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    localStorage.setItem("noor_theme", theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('noor_notes', notes);
  }, [notes]);

  const addAuditEntry = (action: string, details: string) => {
    const entry: AuditEntry = {
      id: Date.now().toString(),
      userId: 'system',
      userName: 'System',
      action,
      details,
      date: new Date().toLocaleString()
    };

    setConfig(prev => ({
      ...prev,
      auditLog: [entry, ...(prev.auditLog || [])].slice(0, 100)
    }));
  };

  const addItem = (item: Omit<InventoryItem, 'id' | 'date'>) => {
    const newItem: InventoryItem = {
      ...item,
      id: Date.now(),
      date: new Date().toLocaleString()
    };
    setInventory(prev => [newItem, ...prev]);
    addAuditEntry('ADD_ITEM', `Added ${item.type}: ${item.sku} (Qty: ${item.qty})`);
    toast.success(translations[lang].saved_msg);
  };

  const bulkAddItems = (items: Omit<InventoryItem, 'id' | 'date'>[]) => {
    const now = Date.now();
    const newItems: InventoryItem[] = items.map((item, index) => ({
      ...item,
      id: now + index,
      date: new Date().toLocaleString()
    }));
    setInventory(prev => [...newItems, ...prev]);
    addAuditEntry('BULK_ADD', `Added ${items.length} items via bulk import`);
    toast.success(translations[lang].import_success);
  };

  const deleteItem = (id: number, silent = false) => {
    const item = inventory.find(i => i.id === id);
    if (item) {
      setInventory(prev => prev.filter(i => i.id !== id));
      addAuditEntry('DELETE_ITEM', `Deleted ${item.sku}`);
      if (!silent) {
        toast.error(translations[lang].deleted_msg);
      }
    }
  };

  const updateQty = (id: number, delta: number) => {
    setInventory(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, item.qty + delta);
        if (newQty !== item.qty) {
          addAuditEntry('UPDATE_QTY', `Updated ${item.sku} qty from ${item.qty} to ${newQty}`);
        }
        return { ...item, qty: newQty };
      }
      return item;
    }));
  };

  const sendToSheet = async (id: number, targetSheet?: string) => {
    const item = inventory.find(i => i.id === id);
    if (!item) return false;

    const url = (targetSheet === STOCK_SHEET_NAME) 
      ? (STOCK_SHEET_URL || SHEET_URL) 
      : SHEET_URL;

    if (!url) {
      toast.error(lang === 'ar' ? 'رابط Google Sheet غير مضبوط' : 'Google Sheet URL not configured');
      return false;
    }

    try {
      await fetch(url, {
        method: "POST",
        mode: 'no-cors',
        body: JSON.stringify({
          sku: item.sku,
          qty: item.qty,
          type: item.type,
          cost: item.cost || 0,
          sell: item.sell || 0,
          date: item.date,
          sheetName: targetSheet || "Main"
        })
      });
      addAuditEntry('SEND_TO_SHEET', `Sent ${item.sku} to cloud (${targetSheet || "Main"})`);
      toast.success(translations[lang].saved_sent);
      deleteItem(id, true);
      return true;
    } catch (error) {
      console.error("Error sending to sheet:", error);
      return false;
    }
  };

  const clearInventory = () => {
    setInventory([]);
    addAuditEntry('CLEAR_INVENTORY', 'Cleared all inventory records');
  };

  const clearAuditLog = () => {
    setConfig(prev => ({ ...prev, auditLog: [] }));
  };

  const sendAllToSheet = async (targetSheet?: string) => {
    if (inventory.length === 0) return;
    
    const loadingToast = toast.loading(translations[lang].sending);
    let successCount = 0;
    const url = (targetSheet === STOCK_SHEET_NAME) 
      ? (STOCK_SHEET_URL || SHEET_URL) 
      : SHEET_URL;
    
    if (!url) {
      toast.error(lang === 'ar' ? 'رابط Google Sheet غير مضبوط' : 'Google Sheet URL not configured');
      toast.dismiss(loadingToast);
      return;
    }

    // Process sequentially to be safe
    const itemsToSend = [...inventory];
    for (const item of itemsToSend) {
      try {
        await fetch(url, {
          method: "POST",
          mode: 'no-cors',
          body: JSON.stringify({
            sku: item.sku,
            qty: item.qty,
            type: item.type,
            cost: item.cost || 0,
            sell: item.sell || 0,
            date: item.date,
            sheetName: targetSheet || "Main"
          })
        });
        successCount++;
        // Small delay to avoid hitting Google rate limits
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        console.error("Error sending item:", item.sku, error);
      }
    }
    
    toast.dismiss(loadingToast);
    if (successCount > 0) {
      setInventory([]);
      addAuditEntry('SEND_ALL_TO_SHEET', `Sent ${successCount} items to cloud (${targetSheet || "Main"}) and cleared inventory`);
      toast.success(translations[lang].saved_sent);
    } else {
      toast.error(translations[lang].err_send);
    }
  };

  return {
    inventory,
    config,
    setConfig,
    lang,
    setLang,
    theme,
    setTheme,
    notes,
    setNotes,
    addItem,
    bulkAddItems,
    deleteItem,
    updateQty,
    sendToSheet,
    clearInventory,
    clearAuditLog,
    sendAllToSheet
  };
}
