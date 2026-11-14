/** localStorage that never throws (private mode, blocked storage, thumbnail capture). */
import { createJSONStorage, type StateStorage } from 'zustand/middleware';

const memory = new Map<string, string>();
const safe: StateStorage = {
  getItem: (k) => { try { return window.localStorage.getItem(k); } catch { return memory.get(k) ?? null; } },
  setItem: (k, v) => { try { window.localStorage.setItem(k, v); } catch { memory.set(k, v); } },
  removeItem: (k) => { try { window.localStorage.removeItem(k); } catch { memory.delete(k); } }
};
export const safeJSONStorage = createJSONStorage(() => safe);
