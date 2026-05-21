import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Anchor,
  ArrowUp,
  Bolt,
  Check,
  Disc3,
  Drill,
  Droplets,
  Hammer,
  HardHat,
  Plus,
  Ruler,
  ShoppingCart,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { CATALOG, BUNDLES, type Product } from "@/lib/catalog";
import { useCart } from "@/lib/cart";
import { VoiceButton } from "@/components/VoiceButton";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "comstruct — order C-materials in plain language" },
      { name: "description", content: "Chat-first ordering for construction foremen. Describe the job, get the right screws, PPE and consumables." },
    ],
  }),
});

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  suggestions?: string[];
};

const SUGGESTED_CHIPS = [
  "I need screws to fix gypsum board to a metal stud",
  "PPE pack for a new worker starting tomorrow",
  "I need to seal around a window — what do I need?",
  "Standard drywall kit for ~50 m² wall",
  "Concrete drilling — bits, plugs, dust mask",
];

type CategoryTileData = {
  label: string;
  icon: LucideIcon;
  prompt: string;
};

// C-material categories for foremen, distilled from McMaster-Carr's top-level
// taxonomy. Out-of-scope groups (raw materials, HVAC, plumbing, pipe & tubing,
// office, material handling) are intentionally omitted — those are A-materials
// or non-site categories. Icons from lucide-react (MIT).
const CATEGORY_TILES: CategoryTileData[] = [
  { label: "Fasteners",   icon: Bolt,     prompt: "Show me fasteners — screws, nuts, bolts, anchors" },
  { label: "Safety / PPE", icon: HardHat, prompt: "Show me safety gear and PPE" },
  { label: "Hand Tools",  icon: Hammer,   prompt: "Show me hand tools" },
  { label: "Power & Light", icon: Zap,    prompt: "Show me batteries, cables, and site lighting" },
  { label: "Sealing",     icon: Droplets, prompt: "Show me sealants, silicone, and adhesives" },
  { label: "Cut & Drill", icon: Drill,    prompt: "Show me drill bits, blades, and cutting tools" },
  { label: "Abrasives",   icon: Disc3,    prompt: "Show me sanding pads, discs, and abrasives" },
  { label: "Measuring",   icon: Ruler,    prompt: "Show me tape measures, levels, and layout tools" },
  { label: "Anchors",     icon: Anchor,   prompt: "Show me anchors, hooks, and suspending hardware" },
];

const THINKING_WORDS = [
  "Checking the catalog…",
  "Asking the procurement team…",
  "Looking up your project standards…",
  "Comparing suppliers…",
  "Tallying quantities…",
];

function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [thinkingWord, setThinkingWord] = useState(THINKING_WORDS[0]);
  const [recommendedIds, setRecommendedIds] = useState<number[]>([]);
  const [aMaterialFlag, setAMaterialFlag] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const cart = useCart();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const inConversation = messages.length > 0;

  // restore localStorage thread
  useEffect(() => {
    try {
      const saved = localStorage.getItem("comstruct-chat");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.messages) setMessages(parsed.messages);
        if (parsed.recommendedIds) setRecommendedIds(parsed.recommendedIds);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (messages.length === 0) return;
    localStorage.setItem(
      "comstruct-chat",
      JSON.stringify({ messages, recommendedIds }),
    );
  }, [messages, recommendedIds]);

  // focus input on load and after stream ends
  useEffect(() => {
    if (!streaming) inputRef.current?.focus();
  }, [streaming, inConversation]);

  // auto scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  const sortedProducts = useMemo(() => {
    const recSet = new Set(recommendedIds);
    const rec: Product[] = [];
    recommendedIds.forEach((id) => {
      const p = CATALOG.find((x) => x.id === id);
      if (p) rec.push(p);
    });
    const rest = CATALOG.filter((p) => !recSet.has(p.id));
    return [...rec, ...rest];
  }, [recommendedIds]);

  async function send(text: string) {
    if (!text.trim() || streaming) return;
    const userMsg: ChatMessage = { role: "user", content: text };
    const newHistory = [...messages, userMsg];
    setMessages([...newHistory, { role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);
    setThinkingWord(THINKING_WORDS[Math.floor(Math.random() * THINKING_WORDS.length)]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newHistory.map((m) => ({ role: m.role, content: m.content })),
          cart: cart.items,
        }),
      });
      if (!res.ok || !res.body) {
        const err = await res.text();
        toast.error(err || "Something went wrong");
        setStreaming(false);
        setMessages(newHistory); // drop empty assistant
        return;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n\n")) !== -1) {
          const chunk = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 2);
          if (!chunk.startsWith("data:")) continue;
          try {
            const evt = JSON.parse(chunk.slice(5).trim());
            handleEvent(evt);
          } catch {}
        }
      }
    } catch (e) {
      toast.error("Connection lost");
      console.error(e);
    } finally {
      setStreaming(false);
    }
  }

  function handleEvent(evt: { type: string; [k: string]: unknown }) {
    switch (evt.type) {
      case "delta":
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === "assistant") {
            next[next.length - 1] = { ...last, content: last.content + (evt.content as string) };
          }
          return next;
        });
        break;
      case "recommend":
        setRecommendedIds((prev) => {
          const ids = evt.productIds as number[];
          const set = new Set(prev);
          ids.forEach((i) => set.add(i));
          return [...prev, ...ids.filter((i) => !prev.includes(i))];
        });
        break;
      case "tool":
        handleTool(evt.name as string, evt.args as Record<string, unknown>);
        break;
      case "done":
        break;
    }
  }

  function handleTool(name: string, args: Record<string, unknown>) {
    if (name === "add_to_cart") {
      const p = CATALOG.find((x) => x.id === args.product_id);
      if (!p) return;
      const qty = (args.quantity as number) || p.packSize;
      cart.add({ productId: p.id, name: p.name, price: p.price, qty });
      toast.success(`Added ${qty}× ${p.name} to cart`);
    } else if (name === "add_bundle_to_cart") {
      const b = BUNDLES.find((x) => x.id === args.bundle_id);
      if (!b) return;
      b.productIds.forEach((id) => {
        const p = CATALOG.find((x) => x.id === id);
        if (p) cart.add({ productId: p.id, name: p.name, price: p.price, qty: p.packSize });
      });
      toast.success(`Added bundle: ${b.name}`);
    } else if (name === "flag_as_a_material") {
      setAMaterialFlag((args.what_they_asked_for as string) || "this item");
    }
  }

  // voice handled by <VoiceButton />; transcript is sent immediately

  function reset() {
    setMessages([]);
    setRecommendedIds([]);
    localStorage.removeItem("comstruct-chat");
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-3xl px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-md bg-brand text-brand-foreground grid place-items-center">
              <HardHat className="size-5" />
            </div>
            <div className="leading-tight">
              <div className="font-semibold text-sm">comstruct</div>
              <button
                onClick={reset}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                {inConversation ? "← new request" : "Project: Erlenmatt B3"}
              </button>
            </div>
          </div>
          <button
            onClick={() => setCartOpen(true)}
            className="relative inline-flex items-center gap-2 rounded-full border px-3 h-10 text-sm font-medium hover:bg-accent"
          >
            <ShoppingCart className="size-4" />
            <span>CHF {cart.subtotal.toFixed(2)}</span>
            {cart.count > 0 && (
              <span className="absolute -top-1 -right-1 size-5 rounded-full bg-brand text-brand-foreground text-[10px] font-bold grid place-items-center">
                {cart.count}
              </span>
            )}
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {!inConversation ? (
          <HeroView
            input={input}
            setInput={setInput}
            send={send}
            inputRef={inputRef}
          />
        ) : (
          <ConversationView
            messages={messages}
            streaming={streaming}
            thinkingWord={thinkingWord}
            scrollRef={scrollRef}
            sortedProducts={sortedProducts}
            recommendedIds={recommendedIds}
            onResetRecommendations={() => setRecommendedIds([])}
            onSuggestion={(s) => send(s)}
          />
        )}
      </main>

      {/* Sticky bottom bar in conversation mode: chat input + separate, distinct voice button */}
      {inConversation && (
        <div className="sticky bottom-0 z-30 border-t bg-background/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
          <div className="mx-auto max-w-3xl px-4 py-3 flex items-end gap-3">
            <div className="flex-1">
              <ChatInput
                value={input}
                onChange={setInput}
                onSend={() => send(input)}
                disabled={streaming}
                inputRef={inputRef}
                placeholder="Ask a follow-up…"
              />
            </div>
            <VoiceButton size="compact" onTranscript={(t) => send(t)} />
          </div>
        </div>
      )}

      {/* Approval banner */}
      {cart.subtotal > 200 && (
        <div className="fixed bottom-[88px] left-0 right-0 z-40 mx-auto max-w-3xl px-4">
          <div className="rounded-lg bg-brand text-brand-foreground px-4 py-3 shadow-lg flex items-center justify-between text-sm font-medium">
            <span>Subtotal CHF {cart.subtotal.toFixed(2)} — needs PM approval before dispatch.</span>
            <button
              className="ml-3 rounded-md bg-background/20 hover:bg-background/30 px-3 py-1.5 text-xs font-semibold"
              onClick={() => toast.success("Sent for PM approval")}
            >
              Send for approval
            </button>
          </div>
        </div>
      )}

      {/* A-material modal */}
      {aMaterialFlag && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 px-4">
          <div className="bg-card rounded-2xl shadow-xl max-w-sm w-full p-6">
            <h3 className="font-semibold text-lg">That's an A-material</h3>
            <p className="text-sm text-muted-foreground mt-2">
              "{aMaterialFlag}" is handled by your project manager through the main procurement flow. Want me to ping them?
            </p>
            <div className="mt-5 flex gap-2 justify-end">
              <button
                className="px-4 h-10 rounded-md text-sm font-medium hover:bg-accent"
                onClick={() => setAMaterialFlag(null)}
              >
                Never mind
              </button>
              <button
                className="px-4 h-10 rounded-md bg-brand text-brand-foreground text-sm font-semibold"
                onClick={() => {
                  toast.success("PM notified");
                  setAMaterialFlag(null);
                }}
              >
                Notify PM
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cart drawer */}
      {cartOpen && <CartDrawer onClose={() => setCartOpen(false)} />}
    </div>
  );
}

function HeroView({
  input,
  setInput,
  send,
  inputRef,
}: {
  input: string;
  setInput: (v: string) => void;
  send: (v: string) => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-center">
          What do you need on site?
        </h1>
        <p className="mt-3 text-center text-muted-foreground">
          Describe the job in your own words — speak it or type it.
        </p>

        {/* Primary voice CTA — visually distinct, separated from the chat bar */}
        <div className="mt-8 flex justify-center">
          <VoiceButton size="hero" onTranscript={(t) => send(t)} />
        </div>

        <div className="my-6 flex items-center gap-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          <div className="flex-1 h-px bg-border" />
          or type
          <div className="flex-1 h-px bg-border" />
        </div>

        <div>
          <ChatInput
            value={input}
            onChange={setInput}
            onSend={() => send(input)}
            disabled={false}
            inputRef={inputRef}
            placeholder="Describe the job…"
            big
          />
        </div>

        <div className="mt-6 -mx-4 px-4 overflow-x-auto">
          <div className="flex gap-2 min-w-min">
            {SUGGESTED_CHIPS.map((chip) => (
              <button
                key={chip}
                onClick={() => send(chip)}
                className="shrink-0 rounded-full border bg-card hover:bg-accent px-4 h-10 text-sm font-medium"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>


        <div className="mt-10">
          <div className="flex items-center gap-3 text-xs text-muted-foreground uppercase tracking-wide">
            <div className="flex-1 h-px bg-border" />
            or browse by category
            <div className="flex-1 h-px bg-border" />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {CATEGORY_TILES.map((c) => (
              <CategoryTile key={c.label} tile={c} onSelect={() => send(c.prompt)} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CategoryTile({
  tile,
  onSelect,
}: {
  tile: CategoryTileData;
  onSelect: () => void;
}) {
  const Icon = tile.icon;
  return (
    <button
      onClick={onSelect}
      className="group flex flex-col items-center justify-center gap-2 rounded-xl border bg-card p-4 aspect-square text-center transition-colors hover:bg-accent hover:border-brand/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
    >
      <span className="grid size-12 place-items-center rounded-lg bg-brand/10 text-brand transition-colors group-hover:bg-brand group-hover:text-brand-foreground">
        <Icon className="size-6" strokeWidth={2} />
      </span>
      <span className="text-xs font-semibold leading-tight">{tile.label}</span>
    </button>
  );
}

function ConversationView({
  messages,
  streaming,
  thinkingWord,
  scrollRef,
  sortedProducts,
  recommendedIds,
  onResetRecommendations,
  onSuggestion,
}: {
  messages: ChatMessage[];
  streaming: boolean;
  thinkingWord: string;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  sortedProducts: Product[];
  recommendedIds: number[];
  onResetRecommendations: () => void;
  onSuggestion: (s: string) => void;
}) {
  const recSet = new Set(recommendedIds);
  const lastAssistant = messages[messages.length - 1]?.role === "assistant" ? messages[messages.length - 1] : null;
  const isThinking = streaming && (!lastAssistant || lastAssistant.content === "");

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl px-4 py-6 space-y-4 pb-32">
        {messages.map((m, i) => (
          <MessageBubble key={i} msg={m} />
        ))}
        {isThinking && (
          <div className="text-sm text-muted-foreground italic flex items-center gap-2">
            <span className="size-2 rounded-full bg-brand animate-pulse" />
            {thinkingWord}
          </div>
        )}

        {/* suggestions */}
        {!streaming && lastAssistant && (
          <div className="flex flex-wrap gap-2 pt-1">
            <SuggestionButton onClick={() => onSuggestion("Add the bundle to cart")}>
              Add the bundle to cart
            </SuggestionButton>
            <SuggestionButton onClick={() => onSuggestion("Show me cheaper options")}>
              Show me cheaper options
            </SuggestionButton>
            <SuggestionButton onClick={() => onSuggestion("Show me alternative suppliers")}>
              Different brand
            </SuggestionButton>
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="border-t bg-muted/30">
        <div className="mx-auto max-w-3xl px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {recommendedIds.length > 0 ? "Recommended for this job" : "Catalog"}
            </h2>
            {recommendedIds.length > 0 && (
              <button
                onClick={onResetRecommendations}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Show all ({CATALOG.length})
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {sortedProducts.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                recommended={recSet.has(p.id)}
                dimmed={recommendedIds.length > 0 && !recSet.has(p.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-2.5 max-w-[80%] text-[15px]">
          {msg.content}
        </div>
      </div>
    );
  }
  return (
    <div className="flex">
      <div className="text-[15px] leading-relaxed whitespace-pre-wrap max-w-[90%]">
        {msg.content}
        {msg.content === "" && <span className="inline-block w-1 h-4 bg-foreground/40 animate-pulse" />}
      </div>
    </div>
  );
}

function SuggestionButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-full border bg-card hover:bg-accent px-3 h-9 text-sm font-medium"
    >
      {children}
    </button>
  );
}

function ChatInput({
  value,
  onChange,
  onSend,
  disabled,
  inputRef,
  placeholder,
  big,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  disabled: boolean;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  placeholder: string;
  big?: boolean;
}) {
  return (
    <div
      className={`relative flex items-end gap-2 rounded-2xl border bg-card shadow-sm focus-within:ring-2 focus-within:ring-brand/40 ${
        big ? "px-4 py-3" : "px-3 py-2"
      }`}
    >
      <textarea
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSend();
          }
        }}
        rows={1}
        placeholder={placeholder}
        className={`flex-1 resize-none bg-transparent outline-none placeholder:text-muted-foreground ${
          big ? "text-lg min-h-[40px]" : "text-base min-h-[28px]"
        }`}
        style={{ maxHeight: 160 }}
      />
      <button
        type="button"
        onClick={onSend}
        disabled={disabled || !value.trim()}
        className="shrink-0 size-11 grid place-items-center rounded-xl bg-brand text-brand-foreground disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label="Send"
      >
        <ArrowUp className="size-5" />
      </button>
    </div>
  );
}

function ProductCard({
  product,
  recommended,
  dimmed,
}: {
  product: Product;
  recommended: boolean;
  dimmed: boolean;
}) {
  const cart = useCart();
  const [justAdded, setJustAdded] = useState(false);
  const inCart = cart.items.find((i) => i.productId === product.id);

  function add() {
    cart.add({ productId: product.id, name: product.name, price: product.price, qty: product.packSize });
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  }

  return (
    <div
      className={`rounded-xl border bg-card overflow-hidden flex flex-col transition-opacity duration-300 ${
        dimmed ? "opacity-20 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="relative p-3 pb-2">
        <div className="absolute top-2 left-2 text-base" title={product.supplier}>
          {product.flag}
        </div>
        {recommended && (
          <div className="absolute top-2 right-2 bg-brand text-brand-foreground text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full">
            Pick
          </div>
        )}
        <div className="aspect-square bg-muted rounded-lg grid place-items-center text-3xl">
          📦
        </div>
      </div>
      <div className="px-3 pb-3 flex-1 flex flex-col">
        <div className="font-semibold text-sm leading-tight line-clamp-2">{product.name}</div>
        <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{product.spec}</div>
        <div className="mt-auto pt-3">
          {inCart ? (
            <div className="flex items-center justify-between rounded-lg border h-11 overflow-hidden">
              <button
                onClick={() => cart.setQty(product.id, inCart.qty - product.packSize)}
                className="w-11 h-full grid place-items-center hover:bg-accent text-lg font-semibold"
              >
                −
              </button>
              <span className="text-sm font-semibold">{inCart.qty}</span>
              <button
                onClick={() => cart.setQty(product.id, inCart.qty + product.packSize)}
                className="w-11 h-full grid place-items-center hover:bg-accent text-lg font-semibold"
              >
                +
              </button>
            </div>
          ) : (
            <button
              onClick={add}
              className="w-full h-11 flex items-stretch rounded-lg overflow-hidden bg-foreground text-background font-semibold text-sm"
            >
              <span className="flex-1 grid place-items-center">CHF {product.price.toFixed(2)}</span>
              <span className="w-12 grid place-items-center bg-brand text-brand-foreground">
                {justAdded ? <Check className="size-5" /> : <Plus className="size-5" />}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CartDrawer({ onClose }: { onClose: () => void }) {
  const cart = useCart();
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-background h-full flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-4 h-14 border-b">
          <h2 className="font-semibold">Cart ({cart.count})</h2>
          <button onClick={onClose} className="size-9 grid place-items-center rounded-md hover:bg-accent">
            <X className="size-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.items.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-12">Cart is empty</div>
          )}
          {cart.items.map((i) => (
            <div key={i.productId} className="flex items-start gap-3 border rounded-lg p-3">
              <div className="flex-1">
                <div className="font-medium text-sm">{i.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {i.qty} × CHF {i.price.toFixed(2)}
                </div>
              </div>
              <div className="font-semibold text-sm">CHF {(i.qty * i.price).toFixed(2)}</div>
              <button
                onClick={() => cart.remove(i.productId)}
                className="text-muted-foreground hover:text-destructive"
                aria-label="Remove"
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
        </div>
        <div className="border-t p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-semibold">CHF {cart.subtotal.toFixed(2)}</span>
          </div>
          <button
            disabled={cart.items.length === 0}
            onClick={() => {
              toast.success("Order submitted");
              cart.clear();
              onClose();
            }}
            className="w-full h-12 rounded-lg bg-brand text-brand-foreground font-semibold disabled:opacity-40"
          >
            {cart.subtotal > 200 ? "Send for PM approval" : "Submit order"}
          </button>
        </div>
      </div>
    </div>
  );
}

export type {};
