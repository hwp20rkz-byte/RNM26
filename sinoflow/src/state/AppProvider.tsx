"use client";

import { createContext, useCallback, useContext, useEffect, useReducer, useRef, useState, type ReactNode } from "react";
import { DEFAULT_PRICING, fetchLiveRates, SNAPSHOT_RATES } from "@/lib/currencyEngine";
import {
  AbortedError,
  completedState,
  DemoClock,
  DEMO_ORDER,
  initialWorkflowState,
  reduceWorkflow,
  runStage as runStageImpl,
  STAGE_ORDER,
  type RunnableStage,
} from "@/lib/mockAgentWorkflow";
import type {
  Channel,
  ChatMessage,
  CurrencyCode,
  DestinationCode,
  OrderRequest,
  PricingConfig,
  RatesSnapshot,
  WorkflowEvent,
  WorkflowState,
} from "@/types/sourcing";

export type AppMode = "deck" | "prototype";
export type UiLang = "ru" | "en";
export type Theme = "light" | "dark";
export type RatesStatus = "loading" | "live" | "fallback";

export type IntakeDraft = Pick<
  OrderRequest,
  "title" | "rawText" | "quantity" | "targetPrice" | "destination" | "urgency" | "services" | "category" | "incoterm"
> & { company: string };

export const DEMO_DRAFT: IntakeDraft = {
  title: DEMO_ORDER.title,
  rawText: DEMO_ORDER.rawText,
  quantity: DEMO_ORDER.quantity,
  targetPrice: DEMO_ORDER.targetPrice,
  destination: DEMO_ORDER.destination,
  urgency: DEMO_ORDER.urgency,
  services: DEMO_ORDER.services,
  category: DEMO_ORDER.category,
  incoterm: DEMO_ORDER.incoterm,
  company: DEMO_ORDER.client.company,
};

interface AppContextValue {
  // режим и оформление
  mode: AppMode;
  setMode: (m: AppMode) => void;
  theme: Theme;
  toggleTheme: () => void;
  lang: UiLang;
  setLang: (l: UiLang) => void;
  // деньги
  rates: RatesSnapshot;
  ratesStatus: RatesStatus;
  refreshRates: () => void;
  pricing: PricingConfig;
  setPricing: (p: PricingConfig) => void;
  displayCurrency: CurrencyCode;
  setDisplayCurrency: (c: CurrencyCode) => void;
  // заявка
  intakeOpen: boolean;
  openIntake: (draft?: Partial<IntakeDraft>) => void;
  closeIntake: () => void;
  draft: IntakeDraft;
  patchDraft: (p: Partial<IntakeDraft>) => void;
  submitIntake: () => OrderRequest;
  // воркфлоу
  wf: WorkflowState;
  clock: DemoClock;
  runStage: (s: RunnableStage) => Promise<void>;
  runAll: () => Promise<void>;
  approve: () => void;
  autoApprove: React.MutableRefObject<boolean>;
  resetToEmpty: () => void;
  loadCompleted: () => Promise<void>;
  cancelRun: () => void;
  running: boolean;
  // UI-фокус для тура
  deckSlide: number;
  setDeckSlide: (n: number) => void;
  focusId: string | null;
  focus: (id: string | null) => void;
  channel: Channel;
  setChannel: (c: Channel) => void;
  landedDest: DestinationCode;
  setLandedDest: (d: DestinationCode) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const v = useContext(AppContext);
  if (!v) throw new Error("useApp outside AppProvider");
  return v;
}

function draftToOrder(d: IntakeDraft): OrderRequest {
  return {
    ...DEMO_ORDER,
    id: `SF-${new Date().toISOString().slice(2, 10).replace(/-/g, "").slice(2)}-${Math.floor(100 + Math.random() * 900)}`,
    createdAt: new Date().toISOString(),
    client: { ...DEMO_ORDER.client, company: d.company },
    title: d.title,
    rawText: d.rawText,
    quantity: Math.max(1, Math.round(d.quantity)),
    targetPrice: d.targetPrice,
    destination: d.destination,
    urgency: d.urgency,
    services: d.services,
    category: d.category,
    incoterm: d.incoterm,
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AppMode>("prototype");
  const [theme, setTheme] = useState<Theme>("light");
  const [lang, setLang] = useState<UiLang>("ru");
  const [rates, setRates] = useState<RatesSnapshot>(SNAPSHOT_RATES);
  const [ratesStatus, setRatesStatus] = useState<RatesStatus>("loading");
  const [pricing, setPricing] = useState<PricingConfig>(DEFAULT_PRICING);
  const [displayCurrency, setDisplayCurrency] = useState<CurrencyCode>("KZT");
  const [intakeOpen, setIntakeOpen] = useState(false);
  const [draft, setDraft] = useState<IntakeDraft>(DEMO_DRAFT);
  const [wf, dispatch] = useReducer(appReducer, undefined, () => initialWorkflowState(null));
  const [running, setRunning] = useState(false);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [deckSlide, setDeckSlide] = useState(0);
  const [channel, setChannel] = useState<Channel>("wechat");
  const [landedDest, setLandedDest] = useState<DestinationCode>("KZ-ALA");

  const clockRef = useRef(new DemoClock());
  const abortRef = useRef(new AbortController());
  const approvalRef = useRef<(() => void) | null>(null);
  const autoApprove = useRef(false);
  const ratesRef = useRef(rates);
  ratesRef.current = rates;
  const orderRef = useRef<OrderRequest>(DEMO_ORDER);

  // Тема: системная по умолчанию, ручной выбор запоминается.
  useEffect(() => {
    let initial: Theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    try {
      const saved = localStorage.getItem("sinoflow-theme");
      if (saved === "dark" || saved === "light") initial = saved;
    } catch {}
    setTheme(initial);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
  }, [theme]);
  const toggleTheme = useCallback(() => {
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      try {
        localStorage.setItem("sinoflow-theme", next);
      } catch {}
      return next;
    });
  }, []);

  const refreshRates = useCallback(() => {
    setRatesStatus("loading");
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 6000);
    fetchLiveRates(ctrl.signal)
      .then((r) => {
        setRates(r);
        setRatesStatus("live");
      })
      .catch(() => {
        setRates(SNAPSHOT_RATES);
        setRatesStatus("fallback");
      })
      .finally(() => clearTimeout(timeout));
  }, []);
  useEffect(refreshRates, [refreshRates]);

  const emit = useCallback((e: WorkflowEvent) => dispatch(e), []);
  const setSnapshot = useCallback((state: WorkflowState) => dispatch({ type: "__replace", state }), []);

  const cancelRun = useCallback(() => {
    abortRef.current.abort();
    abortRef.current = new AbortController();
    approvalRef.current = null;
    setRunning(false);
  }, []);

  const awaitApproval = useCallback((_draft: ChatMessage) => {
    return new Promise<void>((resolve) => {
      approvalRef.current = resolve;
      if (autoApprove.current) {
        clockRef.current.sleep(2600, abortRef.current.signal).then(() => {
          approvalRef.current?.();
          approvalRef.current = null;
        }, () => {});
      }
    });
  }, []);

  const approve = useCallback(() => {
    approvalRef.current?.();
    approvalRef.current = null;
  }, []);

  const runStage = useCallback(
    async (stage: RunnableStage) => {
      setRunning(true);
      try {
        await runStageImpl(stage, {
          order: orderRef.current,
          clock: clockRef.current,
          signal: abortRef.current.signal,
          emit,
          rates: ratesRef.current.perUsd,
          awaitApproval,
        });
      } catch (e) {
        if (!(e instanceof AbortedError)) throw e;
      } finally {
        setRunning(false);
      }
    },
    [emit, awaitApproval],
  );

  const runAll = useCallback(async () => {
    for (const s of STAGE_ORDER) {
      if (abortRef.current.signal.aborted) return;
      await runStage(s);
    }
  }, [runStage]);

  const resetToEmpty = useCallback(() => {
    cancelRun();
    setSnapshot(initialWorkflowState(orderRef.current));
  }, [cancelRun]);

  const loadCompleted = useCallback(async () => {
    cancelRun();
    const s = await completedState(orderRef.current, ratesRef.current.perUsd);
    setSnapshot(s);
  }, [cancelRun]);

  // Стартовый экран — завершённый кейс, чтобы с первого кадра было видно, что делает продукт.
  useEffect(() => {
    void loadCompleted();
  }, [loadCompleted]);

  const openIntake = useCallback((d?: Partial<IntakeDraft>) => {
    if (d) setDraft((prev) => ({ ...prev, ...d }));
    setIntakeOpen(true);
  }, []);
  const patchDraft = useCallback((p: Partial<IntakeDraft>) => setDraft((prev) => ({ ...prev, ...p })), []);

  const submitIntake = useCallback(() => {
    const order = draftToOrder(draft);
    orderRef.current = order;
    cancelRun();
    setSnapshot(initialWorkflowState(order));
    setIntakeOpen(false);
    setLandedDest(order.destination);
    return order;
  }, [draft, cancelRun]);

  const value: AppContextValue = {
    mode, setMode, theme, toggleTheme, lang, setLang,
    rates, ratesStatus, refreshRates, pricing, setPricing, displayCurrency, setDisplayCurrency,
    intakeOpen, openIntake, closeIntake: () => setIntakeOpen(false), draft, patchDraft, submitIntake,
    wf, clock: clockRef.current, runStage, runAll, approve, autoApprove, resetToEmpty, loadCompleted, cancelRun, running,
    deckSlide, setDeckSlide, focusId, focus: setFocusId, channel, setChannel, landedDest, setLandedDest,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

type AppAction = WorkflowEvent | { type: "__replace"; state: WorkflowState };
function appReducer(state: WorkflowState, a: AppAction): WorkflowState {
  return a.type === "__replace" ? a.state : reduceWorkflow(state, a);
}
