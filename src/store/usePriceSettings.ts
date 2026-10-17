import { create } from 'zustand';
import type { PriceSettings } from '../production/Estimate';

// Прайс салона — настройка рабочего места, а не проекта: цены листов и выбранный цех
// одинаковы для всех заказов. Хранится в этом браузере; без хранилища работает до закрытия вкладки.
const KEY = 'rnm26:price-settings';

const DEFAULTS: PriceSettings = { workshopId: 'damen', buyLdspAtWorkshop: false, sheetPrices: {} };

function load(): PriceSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const o = JSON.parse(raw) as Partial<PriceSettings>;
    const prices: Record<string, number> = {};
    for (const [k, v] of Object.entries(o.sheetPrices ?? {})) if (typeof v === 'number' && v >= 0 && Number.isFinite(v)) prices[k] = v;
    return {
      workshopId: typeof o.workshopId === 'string' ? o.workshopId : DEFAULTS.workshopId,
      buyLdspAtWorkshop: o.buyLdspAtWorkshop === true,
      sheetPrices: prices,
    };
  } catch {
    return DEFAULTS;
  }
}

interface PriceStore extends PriceSettings {
  setWorkshop: (id: string) => void;
  setBuyAtWorkshop: (v: boolean) => void;
  setSheetPrice: (materialId: string, price: number | null) => void;
}

export const usePriceSettings = create<PriceStore>()((set, get) => {
  const save = () => {
    const { workshopId, buyLdspAtWorkshop, sheetPrices } = get();
    try {
      localStorage.setItem(KEY, JSON.stringify({ workshopId, buyLdspAtWorkshop, sheetPrices }));
    } catch {
      // приватный режим: прайс живёт до закрытия вкладки
    }
  };
  return {
    ...(typeof localStorage === 'undefined' ? DEFAULTS : load()),
    setWorkshop: (id) => (set({ workshopId: id }), save()),
    setBuyAtWorkshop: (v) => (set({ buyLdspAtWorkshop: v }), save()),
    setSheetPrice: (materialId, price) => {
      const next = { ...get().sheetPrices };
      if (price === null) delete next[materialId];
      else next[materialId] = price;
      set({ sheetPrices: next });
      save();
    },
  };
});
