import { ProductCard, ProductCardProps } from "@/components/catalog/ProductCard";
import Link from "next/link";

interface ShopProductGridProps {
  products: ProductCardProps[];
  total: number;
  isCollapsed?: boolean;
}

export function ShopProductGrid({
  products,
  total,
  isCollapsed = false,
}: ShopProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-12 text-center space-y-4 my-4">
        <p className="font-mono text-xs uppercase tracking-widest text-primary font-bold">
          NO MATCHING PRODUCTS FOUND
        </p>
        <h3 className="font-headline-sm text-xl font-bold text-on-surface">
          We couldn&apos;t find any products matching your filters.
        </h3>
        <p className="text-xs text-on-surface-variant max-w-md mx-auto">
          Try broadening your criteria, increasing max price, or reset filters to browse our full collection.
        </p>
        <div className="pt-2">
          <Link
            href="/shop"
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-neutral-900 text-white font-mono text-xs uppercase tracking-wider rounded-md font-bold hover:bg-neutral-800 active:scale-95 transition-all cursor-pointer shadow-sm"
          >
            Browse all products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
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

      {/* Pagination / Progress Indicator */}
      {products.length > 0 && products.length < total && (
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
  );
}
