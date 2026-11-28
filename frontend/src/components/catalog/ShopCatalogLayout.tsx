"use client";

import { useState, useEffect, useRef, useCallback, useMemo, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import {
  SlidersHorizontal,
  X,
  ChevronDown,
  Minus,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { ProductCard, ProductCardProps } from "@/components/catalog/ProductCard";
import { CategoryItem, ThemeItem, getActiveCategories, getActiveThemes, filterStorefrontCategories } from "@/lib/catalog";

const ShopSidebarResizer = dynamic(
  () => import("@/components/catalog/ShopSidebarResizer").then((m) => m.ShopSidebarResizer),
  { ssr: false }
);

const ShopMobileFilterDrawer = dynamic(
  () => import("@/components/catalog/ShopMobileFilterDrawer").then((m) => m.ShopMobileFilterDrawer),
  { ssr: false }
);

const MIN_WIDTH = 220;
const MAX_WIDTH = 380;
const DEFAULT_WIDTH = 280;

const STORAGE_KEY_WIDTH = "threadvibe_shop_sidebar_width";
const STORAGE_KEY_COLLAPSED = "threadvibe_shop_sidebar_collapsed";

const SIZES = ["S", "M", "L", "XL", "2XL"];

interface ShopCatalogLayoutProps {
  products?: ProductCardProps[];
  total: number;
  currentSort: string;
  activeQuery: string;
  categories?: CategoryItem[];
  themes?: ThemeItem[];
  children?: React.ReactNode;
}

export function ShopCatalogLayout({
  products = [],
  total,
  currentSort,
  activeQuery,
  categories,
  themes,
  children,
}: ShopCatalogLayoutProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isPending, startTransition] = useTransition();

  // Optimistic / local filter state for immediate UI responsiveness (0ms feedback)
  const [optimisticCategory, setOptimisticCategory] = useState<string | null>(searchParams.get("category"));
  const [optimisticTheme, setOptimisticTheme] = useState<string | null>(searchParams.get("theme"));
  const [optimisticSize, setOptimisticSize] = useState<string | null>(searchParams.get("size"));
  const [optimisticMaxPrice, setOptimisticMaxPrice] = useState<string | null>(searchParams.get("maxPrice"));
  const [optimisticSort, setOptimisticSort] = useState<string | null>(searchParams.get("sort"));
  const [pendingAction, setPendingAction] = useState<{ key: string; value?: string | null } | null>(null);

  // Keep a ref to latest parameters so rapid clicks during in-flight transitions do not drop filters
  const latestParamsRef = useRef<URLSearchParams>(new URLSearchParams(searchParams.toString()));

  // Synchronize optimistic filters with searchParams whenever committed by Next.js router
  useEffect(() => {
    setOptimisticCategory(searchParams.get("category"));
    setOptimisticTheme(searchParams.get("theme"));
    setOptimisticSize(searchParams.get("size"));
    setOptimisticMaxPrice(searchParams.get("maxPrice"));
    setOptimisticSort(searchParams.get("sort"));
    setPendingAction(null);
    latestParamsRef.current = new URLSearchParams(searchParams.toString());
  }, [searchParams]);

  // Desktop sidebar resizable & collapsible state
  const [sidebarWidth, setSidebarWidth] = useState<number>(DEFAULT_WIDTH);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  // Mobile / Tablet drawer state (<1024px)
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false);

  // Search input state
  const [searchTerm, setSearchTerm] = useState(activeQuery);

  // Price slider / number input local state
  const currentMaxPrice = searchParams.get("maxPrice") || "";
  const [priceInput, setPriceInput] = useState<string>(currentMaxPrice);

  const [categoryList, setCategoryList] = useState<CategoryItem[]>(filterStorefrontCategories(categories || []));
  const [themeList, setThemeList] = useState<ThemeItem[]>(themes || []);
  const [loadingFilters, setLoadingFilters] = useState<boolean>(!categories || !themes);

  useEffect(() => {
    if (categories && themes) {
      return;
    }

    let isMounted = true;
    setLoadingFilters(true);
    Promise.all([getActiveCategories(), getActiveThemes()])
      .then(([cats, thms]) => {
        if (!isMounted) return;
        setCategoryList(filterStorefrontCategories(cats));
        setThemeList(thms);
        setLoadingFilters(false);
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        console.error("Failed to fetch filter options", err);
        setLoadingFilters(false);
      });

    return () => {
      isMounted = false;
    };
  }, [categories, themes]);

  const { rootCategories, childrenByParentId } = useMemo(() => {
    const roots: CategoryItem[] = [];
    const childrenMap = new Map<string, CategoryItem[]>();

    for (const cat of categoryList) {
      if (cat.parentCategory) {
        const parentId = typeof cat.parentCategory === "object" ? cat.parentCategory._id : cat.parentCategory;
        const existing = childrenMap.get(parentId) || [];
        existing.push(cat);
        childrenMap.set(parentId, existing);
      } else {
        roots.push(cat);
      }
    }

    roots.sort((a, b) => a.displayOrder - b.displayOrder);
    childrenMap.forEach((list) => list.sort((a, b) => a.displayOrder - b.displayOrder));

    return { rootCategories: roots, childrenByParentId: childrenMap };
  }, [categoryList]);

  const containerRef = useRef<HTMLDivElement>(null);
  // Synchronize price input when URL params change
  useEffect(() => {
    setPriceInput(searchParams.get("maxPrice") || "");
  }, [searchParams]);

  // Synchronize search input when activeQuery changes
  useEffect(() => {
    setSearchTerm(activeQuery);
  }, [activeQuery]);

  // Read saved user preferences from localStorage on mount
  useEffect(() => {
    try {
      const savedWidth = localStorage.getItem(STORAGE_KEY_WIDTH);
      if (savedWidth) {
        const parsed = Number(savedWidth);
        if (Number.isFinite(parsed) && parsed >= MIN_WIDTH && parsed <= MAX_WIDTH) {
          setSidebarWidth(parsed);
        }
      }

      const savedCollapsed = localStorage.getItem(STORAGE_KEY_COLLAPSED);
      if (savedCollapsed !== null) {
        setIsCollapsed(savedCollapsed === "true");
      }
    } catch {
      // Ignore localStorage failure in restricted contexts
    }
  }, []);

  // Compute active filters count
  // Compute active filters count using optimistic state for immediate badge updates
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (optimisticCategory) count++;
    if (optimisticTheme) count++;
    if (optimisticSize) count++;
    if (optimisticMaxPrice && optimisticMaxPrice.trim() !== "") count++;
    return count;
  }, [optimisticCategory, optimisticTheme, optimisticSize, optimisticMaxPrice]);

  // Generic filter update helper with optimistic feedback & transition
  const updateFilter = useCallback(
    (key: string, value: string | null) => {
      if (key === "category") setOptimisticCategory(value);
      if (key === "theme") setOptimisticTheme(value);
      if (key === "size") setOptimisticSize(value);
      if (key === "maxPrice") setOptimisticMaxPrice(value);
      if (key === "sort") setOptimisticSort(value);
      setPendingAction({ key, value });

      const nextParams = new URLSearchParams(latestParamsRef.current.toString());
      if (value) {
        nextParams.set(key, value);
      } else {
        nextParams.delete(key);
      }
      nextParams.delete("page");
      latestParamsRef.current = nextParams;

      startTransition(() => {
        const queryStr = nextParams.toString();
        router.push(queryStr ? `/shop?${queryStr}` : "/shop");
      });
    },
    [router]
  );

  // Reset all facet filters with optimistic feedback & transition
  const handleClearAll = useCallback(() => {
    setOptimisticCategory(null);
    setOptimisticTheme(null);
    setOptimisticSize(null);
    setOptimisticMaxPrice(null);
    setPriceInput("");
    setSearchTerm("");
    setPendingAction({ key: "all" });

    const nextParams = new URLSearchParams(latestParamsRef.current.toString());
    nextParams.delete("category");
    nextParams.delete("theme");
    nextParams.delete("size");
    nextParams.delete("maxPrice");
    nextParams.delete("search");
    nextParams.delete("q");
    nextParams.delete("page");
    latestParamsRef.current = nextParams;

    startTransition(() => {
      const queryStr = nextParams.toString();
      router.push(queryStr ? `/shop?${queryStr}` : "/shop");
    });
  }, [router]);

  // Desktop sidebar toggle with persistence
  const handleToggleSidebar = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY_COLLAPSED, next.toString());
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  }, []);

  // Search submission handlers
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPendingAction({ key: "search", value: searchTerm.trim() });
    const nextParams = new URLSearchParams(latestParamsRef.current.toString());
    if (searchTerm.trim()) {
      nextParams.set("search", searchTerm.trim());
      nextParams.delete("q");
    } else {
      nextParams.delete("search");
      nextParams.delete("q");
    }
    nextParams.delete("page");
    latestParamsRef.current = nextParams;

    startTransition(() => {
      const queryStr = nextParams.toString();
      router.push(queryStr ? `/shop?${queryStr}` : "/shop");
    });
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    setPendingAction({ key: "search", value: "" });
    const nextParams = new URLSearchParams(latestParamsRef.current.toString());
    nextParams.delete("search");
    nextParams.delete("q");
    nextParams.delete("page");
    latestParamsRef.current = nextParams;

    startTransition(() => {
      const queryStr = nextParams.toString();
      router.push(queryStr ? `/shop?${queryStr}` : "/shop");
    });
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setOptimisticSort(val || null);
    setPendingAction({ key: "sort", value: val });

    const nextParams = new URLSearchParams(latestParamsRef.current.toString());
    if (val) {
      nextParams.set("sort", val);
    } else {
      nextParams.delete("sort");
    }
    nextParams.delete("page");
    latestParamsRef.current = nextParams;

    startTransition(() => {
      const queryStr = nextParams.toString();
      router.push(queryStr ? `/shop?${queryStr}` : "/shop");
    });
  };

  const handlePriceCommit = (valStr: string) => {
    const trimmed = valStr.trim();
    if (!trimmed) {
      updateFilter("maxPrice", null);
      return;
    }
    const num = Number(trimmed);
    if (Number.isFinite(num) && num > 0) {
      updateFilter("maxPrice", Math.round(num).toString());
    }
  };

  // Shared Filter Groups Markup
  const renderFilterContent = () => (
    <div className="space-y-6">
      {/* Category Filter */}
      <div className="border-b border-outline-variant/15 pb-5">
        <h3 className="font-mono text-xs uppercase text-on-surface font-bold tracking-wider mb-3.5 flex justify-between items-center">
          <span>Category</span>
          <Minus className="w-3.5 h-3.5 text-on-surface-variant" />
        </h3>
        {loadingFilters ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-4 bg-surface-container animate-pulse rounded w-3/4" />
            ))}
          </div>
        ) : categoryList.length === 0 ? (
          <p className="text-xs text-neutral-400 italic">No categories available</p>
        ) : (
          <div className="space-y-2.5 font-body-sm text-xs text-on-surface-variant">
            {rootCategories.map((root) => {
              const isSelected = (optimisticCategory || "").toLowerCase() === root.slug.toLowerCase();
              const isPendingThis = isPending && pendingAction?.key === "category" && pendingAction?.value === root.slug;
              const children = childrenByParentId.get(root._id) || [];
              return (
                <div key={root._id} className="space-y-1.5">
                  <label className="flex items-center gap-3 cursor-pointer group select-none">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => updateFilter("category", e.target.checked ? root.slug : null)}
                      className="form-checkbox text-primary border-outline-variant/60 rounded focus:ring-primary h-4 w-4 transition-all accent-primary cursor-pointer"
                    />
                    <span className={`group-hover:text-primary transition-colors ${isSelected ? "font-bold text-on-surface" : ""}`}>
                      {root.name}
                    </span>
                    {isPendingThis && (
                      <Loader2 className="w-3 h-3 animate-spin text-primary ml-auto" />
                    )}
                    {!isPendingThis && typeof root.productCount === "number" && root.productCount > 0 && (
                      <span className="font-mono text-[10px] text-neutral-400 ml-auto">
                        ({root.productCount})
                      </span>
                    )}
                  </label>
                  {children.length > 0 && (
                    <div className="pl-6 space-y-1.5 border-l border-outline-variant/20 ml-2">
                      {children.map((child) => {
                        const isChildSelected = (optimisticCategory || "").toLowerCase() === child.slug.toLowerCase();
                        const isChildPendingThis = isPending && pendingAction?.key === "category" && pendingAction?.value === child.slug;
                        return (
                          <label key={child._id} className="flex items-center gap-2.5 cursor-pointer group select-none">
                            <input
                              type="checkbox"
                              checked={isChildSelected}
                              onChange={(e) => updateFilter("category", e.target.checked ? child.slug : null)}
                              className="form-checkbox text-primary border-outline-variant/60 rounded focus:ring-primary h-3.5 w-3.5 transition-all accent-primary cursor-pointer"
                            />
                            <span className={`group-hover:text-primary transition-colors text-[11px] ${isChildSelected ? "font-bold text-on-surface" : ""}`}>
                              {child.name}
                            </span>
                            {isChildPendingThis && (
                              <Loader2 className="w-2.5 h-2.5 animate-spin text-primary ml-auto" />
                            )}
                            {!isChildPendingThis && typeof child.productCount === "number" && child.productCount > 0 && (
                              <span className="font-mono text-[9px] text-neutral-400 ml-auto">
                                ({child.productCount})
                              </span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Capsule Theme Filter — only shown when active themes exist */}
      {(loadingFilters || themeList.length > 0) && (
        <div className="border-b border-outline-variant/15 pb-5">
          <h3 className="font-mono text-xs uppercase text-on-surface font-bold tracking-wider mb-3.5 flex justify-between items-center">
            <span>Capsule Drops</span>
            <Minus className="w-3.5 h-3.5 text-on-surface-variant" />
          </h3>
          {loadingFilters ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-4 bg-surface-container animate-pulse rounded w-2/3" />
              ))}
            </div>
          ) : (
            <div className="space-y-2 font-body-sm text-xs text-on-surface-variant">
              {themeList.map((theme) => {
                const isSelected = (optimisticTheme || "").toLowerCase() === theme.slug.toLowerCase();
                const isThemePendingThis = isPending && pendingAction?.key === "theme" && pendingAction?.value === theme.slug;
                return (
                  <label key={theme._id} className="flex items-center gap-3 cursor-pointer group select-none">
                    <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => updateFilter("theme", e.target.checked ? theme.slug : null)}
                    className="form-checkbox text-primary border-outline-variant/60 rounded focus:ring-primary h-4 w-4 transition-all accent-primary cursor-pointer"
                  />
                  <span className={`group-hover:text-primary transition-colors ${isSelected ? "font-bold text-on-surface" : ""}`}>
                    {theme.name}
                  </span>
                  {isThemePendingThis && (
                    <Loader2 className="w-3 h-3 animate-spin text-primary ml-auto" />
                  )}
                  {!isThemePendingThis && typeof theme.productCount === "number" && theme.productCount > 0 && (
                    <span className="font-mono text-[10px] text-neutral-400 ml-auto">
                      ({theme.productCount})
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        )}
        </div>
      )}

      {/* Max Price Filter */}
      <div className="border-b border-outline-variant/15 pb-5">
        <h3 className="font-mono text-xs uppercase text-on-surface font-bold tracking-wider mb-3.5 flex justify-between items-center">
          <span>Max Price</span>
          <Minus className="w-3.5 h-3.5 text-on-surface-variant" />
        </h3>
        <div className="space-y-2">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant font-mono text-xs font-bold">
              ₹
            </span>
            <input
              type="number"
              min="0"
              max="15000"
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              onBlur={(e) => handlePriceCommit(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.currentTarget.blur();
                }
              }}
              placeholder="e.g. 2499"
              aria-label="Filter by maximum price"
              className="w-full bg-surface-container-low text-on-surface placeholder:text-on-surface-variant border border-outline-variant/40 rounded-lg pl-7 pr-3 py-2 text-xs font-mono focus:border-primary focus:outline-none"
            />
          </div>
          {optimisticMaxPrice && (
            <button
              type="button"
              onClick={() => {
                setPriceInput("");
                updateFilter("maxPrice", null);
              }}
              className="font-mono text-[11px] text-primary hover:underline flex items-center gap-1 pt-0.5 active:scale-95 cursor-pointer"
            >
              Reset price cap
            </button>
          )}
        </div>
      </div>

      {/* Size Filter */}
      <div className="pb-2">
        <h3 className="font-mono text-xs uppercase text-on-surface font-bold tracking-wider mb-3.5 flex justify-between items-center">
          <span>Garment Size</span>
          <Minus className="w-3.5 h-3.5 text-on-surface-variant" />
        </h3>
        <div className="flex flex-wrap gap-2">
          {SIZES.map((size) => {
            const isSelected = optimisticSize === size;
            const isSizePendingThis = isPending && pendingAction?.key === "size" && pendingAction?.value === size;
            return (
              <button
                key={size}
                type="button"
                onClick={() => updateFilter("size", isSelected ? null : size)}
                className={`relative w-10 h-10 flex items-center justify-center border rounded-md font-mono text-xs transition-all active:scale-95 cursor-pointer ${
                  isSelected
                    ? "border-neutral-900 bg-neutral-900 text-white font-bold shadow-xs"
                    : "border-outline-variant/50 text-on-surface hover:border-neutral-900 bg-surface-container-lowest"
                }`}
              >
                <span>{size}</span>
                {isSizePendingThis && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-primary animate-ping" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ─── MENSWEAR COLLECTION SHORTCUTS ──────────────────────────── */}
      <div className="flex gap-2.5 overflow-x-auto hide-scrollbar py-2 sm:py-3 -mx-4 px-4 sm:mx-0 sm:px-0">
        <button
          type="button"
          onClick={() => updateFilter("category", null)}
          className={`shrink-0 px-4 py-2 rounded-md font-mono text-xs uppercase tracking-wider transition-all duration-150 active:scale-95 cursor-pointer flex items-center gap-1.5 ${
            !optimisticCategory
              ? "bg-neutral-900 text-white font-bold shadow-xs ring-1 ring-neutral-900"
              : "border border-outline-variant/60 bg-surface-container-lowest text-on-surface hover:border-neutral-900 hover:text-neutral-900"
          }`}
        >
          <span>ALL DROPS</span>
          {isPending && pendingAction?.key === "category" && !pendingAction?.value && (
            <Loader2 className="w-3 h-3 animate-spin text-primary shrink-0" />
          )}
        </button>
        {categoryList.map((cat) => {
          const isSelected = (optimisticCategory || "").toLowerCase() === cat.slug.toLowerCase();
          const isPendingThis = isPending && pendingAction?.key === "category" && pendingAction?.value === cat.slug;
          return (
            <button
              key={cat._id}
              type="button"
              onClick={() => updateFilter("category", isSelected ? null : cat.slug)}
              className={`shrink-0 px-4 py-2 rounded-md font-mono text-xs uppercase tracking-wider transition-all duration-150 active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                isSelected
                  ? "bg-neutral-900 text-white font-bold shadow-xs ring-1 ring-neutral-900"
                  : "border border-outline-variant/60 bg-surface-container-lowest text-on-surface hover:border-neutral-900 hover:text-neutral-900"
              }`}
            >
              <span>{cat.name}</span>
              {isPendingThis && (
                <Loader2 className="w-3 h-3 animate-spin text-primary shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {/* ─── TOP SHIMMER PROGRESS BAR (CSS transition/animation) ──────── */}
      {isPending && (
        <div
          role="progressbar"
          aria-label="Updating catalog drops"
          className="w-full bg-primary/15 rounded-full overflow-hidden relative h-[3px] transition-opacity duration-150 animate-pulse"
        >
          <div className="absolute top-0 bottom-0 bg-primary rounded-full w-2/5 animate-[pulse_1s_ease-in-out_infinite]" />
        </div>
      )}

      {/* ─── INTEGRATED TOOLBAR ────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between bg-surface-container-lowest p-3 sm:p-4 rounded-xl border border-outline-variant/20 shadow-xs gap-3">
          {/* Left: Filters Toggle + Search */}
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 sm:min-w-[240px] w-full sm:w-auto">
            {/* Filters Button (Opens drawer on <1024px; Toggles sidebar on ≥1024px) */}
            <button
              type="button"
              onClick={() => {
                if (window.innerWidth < 1024) {
                  setIsMobileDrawerOpen(true);
                } else {
                  handleToggleSidebar();
                }
              }}
              aria-label={isCollapsed ? "Expand filter sidebar" : "Collapse filter sidebar"}
              aria-expanded={!isCollapsed}
              aria-controls="shop-filter-sidebar"
              className={`flex items-center gap-2 px-3.5 py-2.5 min-h-[48px] rounded-lg font-mono text-xs font-bold transition-all border shrink-0 active:scale-95 cursor-pointer ${
                !isCollapsed || activeFiltersCount > 0
                  ? "bg-neutral-900 text-white border-neutral-900 shadow-xs"
                  : "bg-surface text-on-surface border-outline-variant/50 hover:border-neutral-900"
              }`}
            >
              {isCollapsed ? (
                <PanelLeftOpen className="w-4 h-4 text-inherit" />
              ) : (
                <PanelLeftClose className="w-4 h-4 text-inherit hidden lg:block" />
              )}
              <SlidersHorizontal className="w-4 h-4 lg:hidden" />
              <span>Filters</span>
              {isPending ? (
                <span className="flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-primary text-on-primary text-[10px] font-mono font-bold leading-none animate-pulse">
                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                </span>
              ) : activeFiltersCount > 0 ? (
                <span className="flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-primary text-on-primary text-[10px] font-mono font-bold leading-none">
                  {activeFiltersCount}
                </span>
              ) : null}
            </button>

            {/* Catalog Search Input */}
            <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search Nehru jackets..."
                className="w-full bg-surface-container-low text-on-surface placeholder:text-on-surface-variant border border-outline-variant/40 rounded-lg pl-9 pr-8 py-2 text-xs font-body-sm focus:outline-none focus:border-primary"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface p-0.5 active:scale-90 cursor-pointer"
                  aria-label="Clear search input"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </form>
          </div>

          {/* Right: Results Count + Sort Dropdown */}
          <div className="flex items-center gap-4 border-t sm:border-t-0 sm:border-l border-outline-variant/20 pt-2 sm:pt-0 sm:pl-4 justify-between sm:justify-end w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <span className="font-body-sm text-xs text-on-surface-variant whitespace-nowrap">
                {`Showing ${total} ${total === 1 ? "product" : "products"}${products.length > total ? ` (${products.length} colourways)` : ""}`}
              </span>
              {isPending && (
                <span className="inline-flex items-center gap-1 font-mono text-[10px] text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full font-bold">
                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  <span>Updating...</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-on-surface-variant uppercase hidden sm:inline">Sort:</span>
              <div className="relative">
                <select
                  value={optimisticSort ?? currentSort}
                  onChange={handleSortChange}
                  aria-label="Sort products by"
                  className="appearance-none bg-surface-container-low border border-outline-variant/40 rounded-lg pl-3 pr-8 py-2.5 min-h-[48px] text-xs font-mono text-on-surface focus:outline-none focus:border-primary cursor-pointer"
                >
                  <option value="">Featured</option>
                  <option value="-createdAt">Newest First</option>
                  <option value="basePrice">Price: Low to High</option>
                  <option value="-basePrice">Price: High to Low</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-on-surface-variant pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Active Filters Summary Strip */}
        {(activeFiltersCount > 0 || activeQuery) && (
          <div className="flex flex-wrap items-center gap-2 text-xs py-1">
            <div className="flex items-center gap-1.5 font-mono text-[11px] text-on-surface-variant uppercase font-bold">
              {isPending && <Loader2 className="w-3 h-3 text-primary animate-spin" />}
              <span>Active:</span>
            </div>
            {optimisticCategory && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-container-high text-on-surface font-mono text-[11px] border border-outline-variant/30">
                <span>
                  Category: {categoryList.find(c => c.slug.toLowerCase() === (optimisticCategory || "").toLowerCase())?.name || optimisticCategory}
                </span>
                <button
                  type="button"
                  onClick={() => updateFilter("category", null)}
                  className="hover:text-primary p-0.5 rounded transition-colors active:scale-90 cursor-pointer"
                  aria-label="Remove category filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {optimisticTheme && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-container-high text-on-surface font-mono text-[11px] border border-outline-variant/30">
                <span>
                  Drop: {themeList.find(t => t.slug.toLowerCase() === (optimisticTheme || "").toLowerCase())?.name || optimisticTheme}
                </span>
                <button
                  type="button"
                  onClick={() => updateFilter("theme", null)}
                  className="hover:text-primary p-0.5 rounded transition-colors active:scale-90 cursor-pointer"
                  aria-label="Remove drop theme filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {optimisticSize && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-container-high text-on-surface font-mono text-[11px] border border-outline-variant/30">
                <span>Size: {optimisticSize}</span>
                <button
                  type="button"
                  onClick={() => updateFilter("size", null)}
                  className="hover:text-primary p-0.5 rounded transition-colors active:scale-90 cursor-pointer"
                  aria-label="Remove size filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {optimisticMaxPrice && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-container-high text-on-surface font-mono text-[11px] border border-outline-variant/30">
                <span>Max: ₹{optimisticMaxPrice}</span>
                <button
                  type="button"
                  onClick={() => updateFilter("maxPrice", null)}
                  className="hover:text-primary p-0.5 rounded transition-colors active:scale-90 cursor-pointer"
                  aria-label="Remove price filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {activeQuery && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 text-primary border border-primary/20 font-mono text-[11px]">
                <span>Query: &quot;{activeQuery}&quot;</span>
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="hover:text-neutral-900 p-0.5 rounded transition-colors active:scale-90 cursor-pointer"
                  aria-label="Clear search query"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={handleClearAll}
              className="inline-flex items-center gap-1 font-mono text-[11px] text-primary hover:underline font-bold ml-1 active:scale-95 cursor-pointer"
            >
              <RotateCcw className={`w-3 h-3 ${isPending && pendingAction?.key === "all" ? "animate-spin" : ""}`} /> Clear All
            </button>
          </div>
        )}
      </div>

      {/* ─── MAIN CATALOG WORKSPACE ────────────────────────────────────── */}
      <div ref={containerRef} className="flex items-start w-full relative">
        {/* Desktop Sidebar (Rendered on ≥1024px; Collapsible & Resizable) */}
        <aside
          id="shop-filter-sidebar"
          style={{
            width: isCollapsed ? 0 : `${sidebarWidth}px`,
          }}
          className={`hidden lg:block shrink-0 transition-[width,opacity] duration-300 ease-out ${
            isCollapsed
              ? "w-0 opacity-0 pointer-events-none invisible overflow-hidden m-0 p-0"
              : "opacity-100 visible"
          }`}
        >
          <div
            style={{ width: `${sidebarWidth}px` }}
            className="p-6 bg-surface-container-lowest rounded-xl border border-outline-variant/20 shadow-xs space-y-6"
          >
            <div className="flex justify-between items-center border-b border-outline-variant/15 pb-3.5">
              <div className="flex items-center gap-2">
                <h2 className="font-headline-sm text-sm font-bold text-on-surface uppercase tracking-wider">
                  Filter Drops
                </h2>
                {isPending && (
                  <Loader2 className="w-3 h-3 text-primary animate-spin" />
                )}
              </div>
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="font-mono text-[11px] text-primary hover:underline font-bold active:scale-95 cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>

            {renderFilterContent()}
          </div>
        </aside>

        {/* Draggable Vertical Divider (Only active on desktop when expanded) */}
        {!isCollapsed && (
          <ShopSidebarResizer
            sidebarWidth={sidebarWidth}
            onWidthChange={setSidebarWidth}
            containerRef={containerRef}
          />
        )}

        {/* Product Grid Area (Expands into available horizontal space) */}
        <div
          className="flex-1 min-w-0 transition-all duration-300 relative"
          aria-busy={isPending}
        >
          {/* Floating Pending Indicator */}
          {isPending && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none transition-all duration-150">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neutral-900/95 text-white shadow-xl border border-neutral-700/60 backdrop-blur-md font-mono text-xs font-bold tracking-wider uppercase">
                <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                <span>Updating drops...</span>
              </div>
            </div>
          )}

          <div
            className={`transition-all duration-300 ${
              isPending ? "opacity-35 pointer-events-none select-none" : "opacity-100"
            }`}
          >
            {children ? (
              children
            ) : products.length > 0 ? (
              <div
                className={`grid gap-3 sm:gap-4 md:gap-6 ${
                  isCollapsed
                    ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
                    : "grid-cols-2 lg:grid-cols-3"
                }`}
              >
                {products.map((product, idx) => (
                  <ProductCard
                    key={product.cardKey || (product.selectedColor ? `${product._id}-${product.selectedColor}` : product._id)}
                    priority={idx < 3}
                    fetchPriority={idx === 0 ? "high" : "auto"}
                    {...product}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-12 text-center space-y-4 my-4">
                <p className="font-mono text-xs uppercase tracking-widest text-primary font-bold">
                  {optimisticCategory ? "COLLECTION COMING SOON" : "NO MATCHING PRODUCTS FOUND"}
                </p>
                <h3 className="font-headline-sm text-xl font-bold text-on-surface">
                  {optimisticCategory
                    ? "No products in this collection yet"
                    : "We couldn't find any products matching your filters."}
                </h3>
                <p className="text-xs text-on-surface-variant max-w-md mx-auto">
                  {optimisticCategory
                    ? "We are curating new tailored pieces for this collection. Explore our Nehru jackets and core menswear essentials below."
                    : "Try broadening your criteria, increasing max price, or reset filters to browse our full collection."}
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-neutral-900 text-white font-mono text-xs uppercase tracking-wider rounded-md font-bold hover:bg-neutral-800 active:scale-95 transition-all cursor-pointer shadow-sm"
                  >
                    {isPending && pendingAction?.key === "all" ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>RESETTING...</span>
                      </>
                    ) : (
                      <span>Browse all products</span>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Pagination / Progress Indicator */}
            {!children && products.length > 0 && products.length < total && (
              <div className="mt-16 flex flex-col items-center justify-center border-t border-outline-variant/20 pt-8">
                <p className="font-mono text-xs text-on-surface-variant mb-3 uppercase tracking-wider">
                  VIEWING {products.length} OF {total} PRODUCTS
                </p>
                <div className="w-48 h-1 bg-surface-container-high rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${(products.length / total) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── MOBILE & TABLET SLIDE-IN DRAWER (<1024px) ─────────────────── */}
      {isMobileDrawerOpen && (
        <ShopMobileFilterDrawer
          isOpen={isMobileDrawerOpen}
          onClose={() => setIsMobileDrawerOpen(false)}
          activeFiltersCount={activeFiltersCount}
          onClearAll={handleClearAll}
        >
          {renderFilterContent()}
        </ShopMobileFilterDrawer>
      )}
    </div>
  );
}
