import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { CATALOG } from "./catalog";
import type { CartItem } from "./cart";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

/** Action taken when a checkout matches (or fails) a rule. */
export type CheckoutAction = "auto_dispatch" | "requires_approval";

/**
 * Custom rule structure. Evaluation is intentionally NOT implemented yet —
 * we ship the shape so the UI and persistence work; the rule engine lands
 * in a follow-up.
 */
export type CustomRule = {
  id: string;
  name: string;
  enabled: boolean;
  /** Free-form condition placeholder. Concrete predicates come later. */
  when: {
    description?: string;
    supplierIn?: string[];
    categoryIn?: string[];
    minSubtotal?: number;
    maxSubtotal?: number;
  };
  action: CheckoutAction;
};

export type BudgetSettings = {
  /** Global budget cap per order, in CHF. Orders above this need approval. */
  globalBudget: number;
  /** Optional per-category cap. Empty string means "no override". */
  perCategory: Record<string, number | null>;
  /** Custom rules. Structure-only for now. */
  customRules: CustomRule[];
};

export type RuleHit = {
  /** Stable id of the offending check. */
  code:
    | "global_budget_exceeded"
    | "category_budget_exceeded"
    | "custom_rule_matched";
  message: string;
  /** Optional details for the UI. */
  category?: string;
  amount?: number;
  limit?: number;
  ruleId?: string;
};

export type CheckoutDecision = {
  action: CheckoutAction;
  hits: RuleHit[];
  /** Subtotals broken down by category, for display. */
  byCategory: Record<string, number>;
  subtotal: number;
};

/* -------------------------------------------------------------------------- */
/* Defaults                                                                   */
/* -------------------------------------------------------------------------- */

export const ALL_CATEGORIES = Array.from(
  new Set(CATALOG.map((p) => p.category)),
).sort();

const DEFAULTS: BudgetSettings = {
  globalBudget: 1000,
  perCategory: Object.fromEntries(ALL_CATEGORIES.map((c) => [c, null])),
  customRules: [],
};

const KEY = "comstruct-budget-v1";

function loadFromStorage(): BudgetSettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<BudgetSettings>;
    // Merge so new categories show up after catalog changes
    const perCategory: Record<string, number | null> = {
      ...DEFAULTS.perCategory,
      ...(parsed.perCategory ?? {}),
    };
    return {
      globalBudget: parsed.globalBudget ?? DEFAULTS.globalBudget,
      perCategory,
      customRules: parsed.customRules ?? [],
    };
  } catch {
    return DEFAULTS;
  }
}

/* -------------------------------------------------------------------------- */
/* Evaluation                                                                 */
/* -------------------------------------------------------------------------- */

function categoryFor(productId: number): string {
  return CATALOG.find((p) => p.id === productId)?.category ?? "Other";
}

export function evaluateCheckout(
  items: CartItem[],
  settings: BudgetSettings,
): CheckoutDecision {
  const byCategory: Record<string, number> = {};
  let subtotal = 0;
  for (const it of items) {
    const cat = categoryFor(it.productId);
    const line = it.qty * it.price;
    byCategory[cat] = (byCategory[cat] ?? 0) + line;
    subtotal += line;
  }

  const hits: RuleHit[] = [];

  if (subtotal > settings.globalBudget) {
    hits.push({
      code: "global_budget_exceeded",
      message: `Order exceeds the CHF ${settings.globalBudget.toFixed(0)} budget.`,
      amount: subtotal,
      limit: settings.globalBudget,
    });
  }

  for (const [cat, total] of Object.entries(byCategory)) {
    const cap = settings.perCategory[cat];
    if (typeof cap === "number" && total > cap) {
      hits.push({
        code: "category_budget_exceeded",
        message: `${cat} exceeds its CHF ${cap.toFixed(0)} cap (CHF ${total.toFixed(2)}).`,
        category: cat,
        amount: total,
        limit: cap,
      });
    }
  }

  // Custom rules are structured but not yet evaluated. Their definitions are
  // persisted so the rule engine can wire in later without a UI change.

  return {
    action: hits.length > 0 ? "requires_approval" : "auto_dispatch",
    hits,
    byCategory,
    subtotal,
  };
}

/* -------------------------------------------------------------------------- */
/* Context                                                                    */
/* -------------------------------------------------------------------------- */

type BudgetCtx = {
  settings: BudgetSettings;
  setGlobalBudget: (n: number) => void;
  setCategoryBudget: (category: string, n: number | null) => void;
  addCustomRule: (rule: Omit<CustomRule, "id">) => void;
  updateCustomRule: (id: string, patch: Partial<CustomRule>) => void;
  removeCustomRule: (id: string) => void;
  reset: () => void;
};

const Ctx = createContext<BudgetCtx | null>(null);

export function BudgetProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<BudgetSettings>(loadFromStorage);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(KEY, JSON.stringify(settings));
    }
  }, [settings]);

  const setGlobalBudget = useCallback((n: number) => {
    setSettings((s) => ({ ...s, globalBudget: Math.max(0, n) }));
  }, []);

  const setCategoryBudget = useCallback(
    (category: string, n: number | null) => {
      setSettings((s) => ({
        ...s,
        perCategory: { ...s.perCategory, [category]: n },
      }));
    },
    [],
  );

  const addCustomRule: BudgetCtx["addCustomRule"] = useCallback((rule) => {
    setSettings((s) => ({
      ...s,
      customRules: [
        ...s.customRules,
        { ...rule, id: crypto.randomUUID() },
      ],
    }));
  }, []);

  const updateCustomRule: BudgetCtx["updateCustomRule"] = useCallback(
    (id, patch) => {
      setSettings((s) => ({
        ...s,
        customRules: s.customRules.map((r) =>
          r.id === id ? { ...r, ...patch } : r,
        ),
      }));
    },
    [],
  );

  const removeCustomRule = useCallback((id: string) => {
    setSettings((s) => ({
      ...s,
      customRules: s.customRules.filter((r) => r.id !== id),
    }));
  }, []);

  const reset = useCallback(() => setSettings(DEFAULTS), []);

  const value = useMemo<BudgetCtx>(
    () => ({
      settings,
      setGlobalBudget,
      setCategoryBudget,
      addCustomRule,
      updateCustomRule,
      removeCustomRule,
      reset,
    }),
    [
      settings,
      setGlobalBudget,
      setCategoryBudget,
      addCustomRule,
      updateCustomRule,
      removeCustomRule,
      reset,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBudget() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useBudget outside BudgetProvider");
  return c;
}

/** Convenience: evaluate the current cart against current settings. */
export function useCheckoutDecision(items: CartItem[]): CheckoutDecision {
  const { settings } = useBudget();
  return useMemo(() => evaluateCheckout(items, settings), [items, settings]);
}
