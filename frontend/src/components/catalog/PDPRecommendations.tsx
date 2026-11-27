import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import { ProductCard, ProductCardProps } from "@/components/catalog/ProductCard";

interface PDPRecommendationsProps {
  recommendations: ProductCardProps[];
  recommendationTitle: string;
  productName: string;
}

export function PDPRecommendations({
  recommendations,
  recommendationTitle,
  productName,
}: PDPRecommendationsProps) {
  if (!recommendations || recommendations.length === 0) return null;

  return (
    <section
      aria-label="Complete The Look recommendations"
      className="max-w-container-max mx-auto w-full pt-12 pb-16 border-t border-outline-variant/30"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="font-mono text-xs uppercase tracking-wider font-bold text-primary">
              Curated Pairing
            </span>
          </div>
          <h2 className="font-headline-lg text-2xl sm:text-3xl font-black text-on-surface uppercase tracking-tight">
            {recommendationTitle || "Complete The Look"}
          </h2>
          <p className="font-body-md text-xs sm:text-sm text-on-surface-variant max-w-xl mt-1">
            Handpicked garments engineered to complement the {productName}.
          </p>
        </div>

        <Link
          href="/shop"
          className="inline-flex items-center gap-2 font-mono text-xs uppercase font-bold text-neutral-800 hover:text-neutral-950 hover:underline tracking-wider"
        >
          <span>Explore Entire Catalog</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Product Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        {recommendations.map((recProduct) => (
          <ProductCard
            key={recProduct._id}
            _id={recProduct._id}
            slug={recProduct.slug}
            name={recProduct.name}
            images={recProduct.images}
            basePrice={recProduct.basePrice}
            mrp={recProduct.mrp}
            discount={recProduct.discount}
            averageRating={recProduct.averageRating}
            reviewCount={recProduct.reviewCount}
            isNewArrival={recProduct.isNewArrival}
            isBestSeller={recProduct.isBestSeller}
            freeDelivery={recProduct.freeDelivery}
            tags={recProduct.tags}
            variants={recProduct.variants}
          />
        ))}
      </div>
    </section>
  );
}

export default PDPRecommendations;

