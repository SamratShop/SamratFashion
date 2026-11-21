"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Star,
  Camera,
  ShieldCheck,
  CheckCircle2,
  PenLine,
  ArrowRight,
} from "lucide-react";
import { api } from "@/lib/api";

interface PublicReview {
  _id: string;
  rating: number;
  title?: string;
  body: string;
  photos: string[];
  isVerifiedPurchase: boolean;
  createdAt: string;
  userId?: {
    name: string;
  };
}

interface CustomerPhoto {
  url: string;
  rating: number;
  author: string;
  createdAt: string;
}

interface ReviewSummary {
  averageRating: number;
  totalReviews: number;
  histogram: Record<number, number>;
}

export default function ProductReviewsSection({ productId }: { productId: string }) {
  const router = useRouter();
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [summary, setSummary] = useState<ReviewSummary>({
    averageRating: 0,
    totalReviews: 0,
    histogram: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  });
  const [photos, setPhotos] = useState<CustomerPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hoverRating, setHoverRating] = useState<number>(0);

  useEffect(() => {
    async function fetchReviews() {
      setIsLoading(true);
      try {
        const res = await api.get(`/reviews/product/${productId}`);
        if (res.data?.success) {
          setReviews(res.data.data.reviews || []);
          setSummary(
            res.data.data.summary || {
              averageRating: 0,
              totalReviews: 0,
              histogram: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
            }
          );
          setPhotos(res.data.data.customerPhotos || []);
        }
      } catch (err) {
        console.error("Failed to load product reviews:", err);
      } finally {
        setIsLoading(false);
      }
    }
    if (productId) fetchReviews();
  }, [productId]);

  if (isLoading) {
    return (
      <section
        id="reviews"
        className="w-full mt-12 sm:mt-16 pt-10 sm:pt-14 border-t border-outline-variant/40 max-w-container-max mx-auto"
      >
        <div className="animate-pulse space-y-6">
          <div className="h-6 bg-surface-container rounded-md w-48" />
          <div className="h-32 bg-surface-container-low rounded-2xl w-full" />
        </div>
      </section>
    );
  }

  const { averageRating, totalReviews, histogram } = summary;

  return (
    <section
      id="reviews"
      className="w-full mt-12 sm:mt-16 pt-10 sm:pt-14 border-t border-outline-variant/40 max-w-container-max mx-auto"
    >
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-neutral-950" />
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-500 font-bold">
              VERIFIED BUYER FEEDBACK
            </span>
          </div>
          <h2 className="font-headline-lg text-2xl sm:text-3xl font-black text-on-surface uppercase tracking-tight">
            Customer Reviews &amp; Ratings
          </h2>
          <p className="font-body-md text-xs sm:text-sm text-on-surface-variant max-w-xl mt-1">
            Real impressions on fabric drape, tailored silhouette, and sizing from verified patrons.
          </p>
        </div>

        <Link
          href="/account/reviews"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border-2 border-neutral-900 bg-neutral-900 text-white font-mono text-xs uppercase font-bold tracking-wider hover:bg-neutral-800 transition-colors shrink-0 shadow-xs"
        >
          <PenLine className="w-3.5 h-3.5" />
          <span>Write a Review</span>
        </Link>
      </div>

      {/* Summary Bento Header (When reviews exist) */}
      {totalReviews > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 mb-10 bg-surface-container-lowest p-6 md:p-8 rounded-2xl border border-outline-variant/20 shadow-xs">
          {/* Left Rating Overview */}
          <div className="md:col-span-4 flex flex-col justify-center items-center text-center border-b md:border-b-0 md:border-r border-outline-variant/20 pb-6 md:pb-0 md:pr-6">
            <span className="font-display-lg text-5xl sm:text-6xl font-black text-on-surface tracking-tight">
              {averageRating > 0 ? averageRating.toFixed(1) : "0.0"}
            </span>
            <div className="flex items-center gap-1 my-2.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-5 h-5 ${
                    star <= Math.round(averageRating)
                      ? "fill-amber-400 text-amber-400"
                      : "text-neutral-300"
                  }`}
                />
              ))}
            </div>
            <p className="font-body-sm text-xs sm:text-sm text-on-surface-variant font-medium">
              Based on {totalReviews} verified {totalReviews === 1 ? "review" : "reviews"}
            </p>
          </div>

          {/* Right Star Histogram */}
          <div className="md:col-span-8 flex flex-col justify-center gap-2.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = histogram[star] || 0;
              const percentage = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;

              return (
                <div key={star} className="flex items-center gap-3 text-xs font-mono">
                  <span className="w-14 text-on-surface font-bold text-right">{star} Stars</span>
                  <div className="flex-1 h-2.5 bg-surface-container rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="w-14 text-on-surface-variant text-right font-medium">
                    {count} ({percentage}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Customer Photo Showcase Gallery */}
      {photos.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Camera className="w-4 h-4 text-primary" />
            <h3 className="font-headline-sm text-base font-bold text-on-surface">
              Customer Photos ({photos.length})
            </h3>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {photos.map((item, idx) => (
              <div
                key={idx}
                className="aspect-square rounded-xl overflow-hidden border border-outline-variant/30 group relative bg-surface-container-low cursor-pointer"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.url}
                  alt="Customer styling photo"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-end text-white text-[10px] font-mono">
                  <span className="font-bold truncate">{item.author}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Public Reviews List or Luxury Empty State */}
      {reviews.length === 0 ? (
        <div className="bg-gradient-to-b from-white via-surface-container-lowest to-surface-container-low/20 border border-outline-variant/30 rounded-3xl p-8 sm:p-12 shadow-xs">
          <div className="max-w-xl mx-auto text-center space-y-5">
            {/* Interactive Rating Selector */}
            <div className="inline-flex flex-col items-center gap-2">
              <div
                className="flex items-center gap-2 p-2.5 rounded-full bg-amber-50/80 border border-amber-200/60"
                onMouseLeave={() => setHoverRating(0)}
              >
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onMouseEnter={() => setHoverRating(s)}
                    onClick={() => router.push("/account/reviews")}
                    className="p-1 hover:scale-125 transition-transform cursor-pointer focus:outline-none"
                    aria-label={`Rate ${s} stars`}
                  >
                    <Star
                      className={`w-6 h-6 transition-colors duration-150 ${
                        s <= (hoverRating || 5)
                          ? "fill-amber-400 text-amber-400"
                          : "text-neutral-300"
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p className="font-mono text-[11px] text-amber-800 font-semibold tracking-wider">
                {hoverRating === 5
                  ? "★ Exceptional Fit & Finish (5/5)"
                  : hoverRating === 4
                  ? "★ Premium Quality & Comfort (4/5)"
                  : hoverRating === 3
                  ? "★ Satisfactory Standard Fit (3/5)"
                  : hoverRating === 2
                  ? "★ Below Expectations (2/5)"
                  : hoverRating === 1
                  ? "★ Needs Improvement (1/5)"
                  : "Rate this piece to guide other gentlemen"}
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-headline-sm text-xl sm:text-2xl font-black text-on-surface uppercase tracking-tight">
                Be the First to Review This Piece
              </h3>
              <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed max-w-lg mx-auto">
                Have you purchased or worn this Nehru jacket? Share your authentic feedback on chest sizing, collar posture, and fabric drape to guide fellow patrons.
              </p>
            </div>

            <div className="pt-1">
              <Link
                href="/account/reviews"
                className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-mono text-xs uppercase font-bold tracking-wider transition-all shadow-sm hover:shadow-md active:scale-95"
              >
                <PenLine className="w-4 h-4" />
                <span>Submit Your Verified Review</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <p className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider mt-2.5">
                Delivered purchase required for verified badge
              </p>
            </div>
          </div>

          {/* Sizing & Tailoring Assessment Strip */}
          <div className="mt-10 pt-8 border-t border-outline-variant/20 grid grid-cols-2 md:grid-cols-4 gap-3 text-center max-w-4xl mx-auto">
            <div className="p-3.5 rounded-xl bg-surface-container-low/60 border border-outline-variant/20">
              <p className="font-mono text-[10px] uppercase font-bold text-neutral-500">Fit Profile</p>
              <p className="font-bold text-xs sm:text-sm text-on-surface mt-0.5">True-to-Chest Tailored</p>
            </div>
            <div className="p-3.5 rounded-xl bg-surface-container-low/60 border border-outline-variant/20">
              <p className="font-mono text-[10px] uppercase font-bold text-neutral-500">Collar Structure</p>
              <p className="font-bold text-xs sm:text-sm text-on-surface mt-0.5">Reinforced Mandarin</p>
            </div>
            <div className="p-3.5 rounded-xl bg-surface-container-low/60 border border-outline-variant/20">
              <p className="font-mono text-[10px] uppercase font-bold text-neutral-500">Fabric Feel</p>
              <p className="font-bold text-xs sm:text-sm text-on-surface mt-0.5">Structured Textured Drape</p>
            </div>
            <div className="p-3.5 rounded-xl bg-surface-container-low/60 border border-outline-variant/20">
              <p className="font-mono text-[10px] uppercase font-bold text-neutral-500">Recommended For</p>
              <p className="font-bold text-xs sm:text-sm text-on-surface mt-0.5">Festive &amp; Formal Layering</p>
            </div>
          </div>

          {/* 3 Trust pillars in Bento Cards */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left max-w-4xl mx-auto">
            <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/25 shadow-2xs hover:border-neutral-900/30 transition-colors flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wide text-on-surface">100% Verified Orders</h4>
                <p className="text-[11px] text-on-surface-variant mt-0.5 leading-relaxed">
                  Only verified patrons with delivered purchases can publish reviews.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/25 shadow-2xs hover:border-neutral-900/30 transition-colors flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wide text-on-surface">True-to-Fit Guidance</h4>
                <p className="text-[11px] text-on-surface-variant mt-0.5 leading-relaxed">
                  Real chest and shoulder feedback helps the community find their ideal fit.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/25 shadow-2xs hover:border-neutral-900/30 transition-colors flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center shrink-0">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wide text-on-surface">Customer Lookbook</h4>
                <p className="text-[11px] text-on-surface-variant mt-0.5 leading-relaxed">
                  Upload styled fit photos to be highlighted across our editorial galleries.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((rev) => (
            <div
              key={rev._id}
              className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/20 shadow-xs space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-neutral-900 text-white font-mono text-xs font-bold flex items-center justify-center uppercase">
                    {(rev.userId?.name || "V")[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-on-surface text-sm">
                        {rev.userId?.name || "Verified Customer"}
                      </span>
                      {rev.isVerifiedPurchase && (
                        <span className="bg-emerald-50 text-emerald-800 border border-emerald-200/60 font-mono text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Verified Purchase</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <span className="text-xs text-neutral-400 font-mono">
                  {new Date(rev.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>

              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-3.5 h-3.5 ${
                      star <= rev.rating
                        ? "fill-amber-400 text-amber-400"
                        : "text-neutral-200"
                    }`}
                  />
                ))}
              </div>

              {rev.title && (
                <h4 className="font-bold text-sm sm:text-base text-on-surface">
                  {rev.title}
                </h4>
              )}
              <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
                {rev.body}
              </p>

              {rev.photos && rev.photos.length > 0 && (
                <div className="flex flex-wrap gap-2.5 pt-1">
                  {rev.photos.map((p, i) => (
                    <div
                      key={i}
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-outline-variant/40 bg-surface-container-low"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p} alt="Customer styling photo" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
