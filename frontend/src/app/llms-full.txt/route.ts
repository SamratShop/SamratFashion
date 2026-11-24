import { SITE_URL, getProductFaqs } from "../../lib/seo.ts";
import { serverFetch } from "../../lib/serverApi.ts";
import { api } from "../../lib/api.ts";

export const revalidate = 3600; // Cache for 1 hour

interface ProductVariant {
  size?: string;
  color?: string;
  hexCode?: string;
  sku?: string;
  stock?: number;
  additionalPrice?: number;
  isAvailable?: boolean;
}

interface CatalogProduct {
  _id?: string;
  name: string;
  slug: string;
  description?: string;
  basePrice: number;
  mrp?: number;
  discount?: number;
  status?: string;
  isAvailable?: boolean;
  fabric?: string;
  fit?: string;
  gender?: string;
  careInstructions?: string[];
  variants?: ProductVariant[];
}

interface CatalogApiResponse {
  success?: boolean;
  data?: {
    items?: CatalogProduct[];
    products?: CatalogProduct[];
  };
}

const FALLBACK_PRODUCTS: CatalogProduct[] = [
  {
    name: "Classic Mandarin Collar Textured Nehru Jacket",
    slug: "classic-mandarin-collar-textured-nehru-jacket",
    description:
      "Elevate your festive and formal wardrobe with the Samrat Fashion Classic Mandarin Collar Nehru Jacket. Crafted from a premium woven suiting fabric with a refined matte texture, this tailored sleeveless waistcoat offers sharp structure and effortless comfort. Key Features: Structured Bandhgala / Mandarin collar with 5-button front placket; Single chest welt pocket and two waist jetted pockets; Tailored fit designed for effortless layering over shirts or kurtas; Ideal for festive gatherings, weddings, and formal occasions; Dry clean recommended; warm iron on reverse.",
    basePrice: 500,
    mrp: 1000,
    status: "ACTIVE",
    fit: "TAILORED",
    gender: "MEN",
    careInstructions: ["Dry clean recommended", "Warm iron on reverse", "Dry in shade"],
    variants: [
      { size: "S", color: "Warm White", hexCode: "#FFFFFF", sku: "NEHRU-WHT-S", isAvailable: true },
      { size: "M", color: "Warm White", hexCode: "#FFFFFF", sku: "NEHRU-WHT-M", isAvailable: true },
      { size: "L", color: "Warm White", hexCode: "#FFFFFF", sku: "NEHRU-WHT-L", isAvailable: true },
      { size: "XL", color: "Warm White", hexCode: "#FFFFFF", sku: "NEHRU-WHT-XL", isAvailable: true },
      { size: "2XL", color: "Warm White", hexCode: "#FFFFFF", sku: "NEHRU-WHT-2XL", isAvailable: true },
      { size: "S", color: "Midnight Black", hexCode: "#000000", sku: "NEHRU-BLK-S", isAvailable: true },
      { size: "M", color: "Midnight Black", hexCode: "#000000", sku: "NEHRU-BLK-M", isAvailable: true },
      { size: "L", color: "Midnight Black", hexCode: "#000000", sku: "NEHRU-BLK-L", isAvailable: true },
      { size: "XL", color: "Midnight Black", hexCode: "#000000", sku: "NEHRU-BLK-XL", isAvailable: true },
      { size: "2XL", color: "Midnight Black", hexCode: "#000000", sku: "NEHRU-BLK-2XL", isAvailable: true },
      { size: "S", color: "Navy Blue", hexCode: "#000080", sku: "NEHRU-NVY-S", isAvailable: true },
      { size: "M", color: "Navy Blue", hexCode: "#000080", sku: "NEHRU-NVY-M", isAvailable: true },
      { size: "L", color: "Navy Blue", hexCode: "#000080", sku: "NEHRU-NVY-L", isAvailable: true },
      { size: "XL", color: "Navy Blue", hexCode: "#000080", sku: "NEHRU-NVY-XL", isAvailable: true },
      { size: "2XL", color: "Navy Blue", hexCode: "#000080", sku: "NEHRU-NVY-2XL", isAvailable: true },
      { size: "S", color: "Royal Maroon", hexCode: "#800000", sku: "NEHRU-MRN-S", isAvailable: true },
      { size: "M", color: "Royal Maroon", hexCode: "#800000", sku: "NEHRU-MRN-M", isAvailable: true },
      { size: "L", color: "Royal Maroon", hexCode: "#800000", sku: "NEHRU-MRN-L", isAvailable: true },
      { size: "XL", color: "Royal Maroon", hexCode: "#800000", sku: "NEHRU-MRN-XL", isAvailable: true },
      { size: "2XL", color: "Royal Maroon", hexCode: "#800000", sku: "NEHRU-MRN-2XL", isAvailable: true },
    ],
  },
  {
    name: "Classic 4-Pocket Safari Style Modi Jacket",
    slug: "classic-4-pocket-safari-style-modi-jacket",
    description:
      "Elevate your ethnic and smart-casual wardrobe with this tailored 4-pocket Mandarin collar Nehru jacket. Crafted from a structured, breathable matte-finish fabric, this sleeveless waistcoat blends classic Indian heritage with a sharp, modern utility silhouette featuring four functional pleated flap pockets with button closures (two chest, two waist). Fit: Tailored slim-regular fit designed for effortless layering over shirts or kurtas. Occasion: Ideal for festive gatherings, weddings, formal office wear, and smart-casual outings. Care Instructions: Dry clean recommended; steam iron on low heat.",
    basePrice: 400,
    mrp: 800,
    status: "ACTIVE",
    fit: "REGULAR",
    gender: "UNISEX",
    careInstructions: ["Dry clean recommended", "Steam iron on low heat", "Dry in shade"],
    variants: [
      { size: "S", color: "Steel Grey", hexCode: "#767675", sku: "CLASSIC4-STE-S", isAvailable: true },
      { size: "M", color: "Steel Grey", hexCode: "#767675", sku: "CLASSIC4-STE-M", isAvailable: true },
      { size: "L", color: "Steel Grey", hexCode: "#767675", sku: "CLASSIC4-STE-L", isAvailable: true },
      { size: "XL", color: "Steel Grey", hexCode: "#767675", sku: "CLASSIC4-STE-XL", isAvailable: true },
      { size: "S", color: "Camel Tan", hexCode: "#9E7B47", sku: "CLASSIC4-CAM-S", isAvailable: true },
      { size: "M", color: "Camel Tan", hexCode: "#9E7B47", sku: "CLASSIC4-CAM-M", isAvailable: true },
      { size: "L", color: "Camel Tan", hexCode: "#9E7B47", sku: "CLASSIC4-CAM-L", isAvailable: true },
      { size: "XL", color: "Camel Tan", hexCode: "#9E7B47", sku: "CLASSIC4-CAM-XL", isAvailable: true },
      { size: "S", color: "Navy Blue", hexCode: "#000080", sku: "CLASSIC4-NVY-S", isAvailable: true },
      { size: "M", color: "Navy Blue", hexCode: "#000080", sku: "CLASSIC4-NVY-M", isAvailable: true },
      { size: "L", color: "Navy Blue", hexCode: "#000080", sku: "CLASSIC4-NVY-L", isAvailable: true },
      { size: "XL", color: "Navy Blue", hexCode: "#000080", sku: "CLASSIC4-NVY-XL", isAvailable: true },
      { size: "S", color: "Cream", hexCode: "#D5C3A5", sku: "CLASSIC4-CRE-S", isAvailable: true },
      { size: "M", color: "Cream", hexCode: "#D5C3A5", sku: "CLASSIC4-CRE-M", isAvailable: true },
      { size: "L", color: "Cream", hexCode: "#D5C3A5", sku: "CLASSIC4-CRE-L", isAvailable: true },
      { size: "XL", color: "Cream", hexCode: "#D5C3A5", sku: "CLASSIC4-CRE-XL", isAvailable: true },
      { size: "S", color: "Coffee Brown", hexCode: "#6D542E", sku: "CLASSIC4-COF-S", isAvailable: true },
      { size: "M", color: "Coffee Brown", hexCode: "#6D542E", sku: "CLASSIC4-COF-M", isAvailable: true },
      { size: "L", color: "Coffee Brown", hexCode: "#6D542E", sku: "CLASSIC4-COF-L", isAvailable: true },
      { size: "XL", color: "Coffee Brown", hexCode: "#6D542E", sku: "CLASSIC4-COF-XL", isAvailable: true },
    ],
  },
];

async function getLiveProducts(): Promise<CatalogProduct[]> {
  try {
    const cached = await serverFetch<CatalogApiResponse>("/catalog/products?limit=100", {
      revalidate: 3600,
    });
    const items = cached?.data?.items || cached?.data?.products;
    if (Array.isArray(items) && items.length > 0) {
      return items;
    }
  } catch (error) {
    console.warn("serverFetch failed in llms-full.txt:", error);
  }

  try {
    const res = await api.get("/catalog/products?limit=100");
    const items = res.data?.data?.items || res.data?.data?.products;
    if (Array.isArray(items) && items.length > 0) {
      return items;
    }
  } catch (error) {
    console.warn("api.get failed in llms-full.txt:", error);
  }

  return FALLBACK_PRODUCTS;
}

export async function GET() {
  const products = await getLiveProducts();
  const baseUrl = SITE_URL;

  // Filter out internal testing products and inactive items
  const activeProducts = products.filter(
    (p) =>
      Boolean(p.slug) &&
      p.status === "ACTIVE" &&
      p.slug !== "testing-product" &&
      !p.slug.startsWith("test-") &&
      !p.name.toLowerCase().includes("testing")
  );

  const productList = activeProducts.length > 0 ? activeProducts : FALLBACK_PRODUCTS;

  const productSections = productList
    .map((p) => {
      const productUrl = `${baseUrl}/shop/${p.slug}`;
      const priceStr = `₹${p.basePrice.toLocaleString("en-IN")}`;
      const mrpStr =
        typeof p.mrp === "number" && p.mrp > p.basePrice
          ? `₹${p.mrp.toLocaleString("en-IN")}`
          : null;

      const variants = Array.isArray(p.variants) ? p.variants : [];
      const uniqueSizes = Array.from(
        new Set(variants.map((v) => (v.size || "").trim()).filter(Boolean))
      );
      const uniqueColors = Array.from(
        new Set(variants.map((v) => (v.color || "").trim()).filter(Boolean))
      );

      const lines = [
        `### ${p.name}`,
        `- URL: ${productUrl}`,
        `- Price: ${priceStr}`,
      ];

      if (mrpStr) {
        lines.push(`- MRP: ${mrpStr}`);
      }

      lines.push(`- Availability: In Stock (Express Dispatch within 24–48 hours)`);

      if (p.fit) {
        lines.push(`- Fit: ${p.fit}`);
      }

      if (uniqueSizes.length > 0) {
        lines.push(`- Sizes: ${uniqueSizes.join(", ")}`);
      }

      if (uniqueColors.length > 0) {
        lines.push(`- Colourways: ${uniqueColors.join(", ")}`);
      }

      if (p.description) {
        const cleanDesc = p.description
          .replace(/<[^>]*>/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        if (cleanDesc) {
          lines.push(`- Description: ${cleanDesc}`);
        }
      }

      if (Array.isArray(p.careInstructions) && p.careInstructions.length > 0) {
        lines.push(`- Care Instructions: ${p.careInstructions.join("; ")}`);
      }

      // Variant inventory breakdown
      if (variants.length > 0) {
        lines.push(`- Variant Details:`);
        variants.forEach((v) => {
          const vColor = v.color || "Standard";
          const vSize = v.size || "Standard";
          const vSku = v.sku ? ` (${v.sku})` : "";
          const vPrice = v.additionalPrice ? ` +₹${v.additionalPrice}` : "";
          lines.push(`  * ${vColor} / Size ${vSize}${vSku}${vPrice}`);
        });
      }

      // Per-product FAQs
      const faqs = getProductFaqs(p);
      if (faqs && faqs.length > 0) {
        lines.push(`- Frequently Asked Questions:`);
        faqs.forEach((faq) => {
          lines.push(`  * Q: ${faq.q}`);
          lines.push(`    A: ${faq.a}`);
        });
      }

      return lines.join("\n");
    })
    .join("\n\n");

  const body = `# Samrat Fashion — Comprehensive Product & Store Catalog

> Contemporary Indian menswear crafted for festive, formal, and everyday dressing — structured Nehru jackets, coti, and wardrobe essentials with express Pan-India delivery.

## Key Information
- Brand: Samrat Fashion
- Category: Contemporary Indian Menswear (Nehru jackets, coti, Modi jackets, tailored ethnic wear)
- Delivery: Pan-India express delivery available across all major pincodes (24–48h dispatch)
- Payment: Prepaid online only via Razorpay (UPI, Credit/Debit Cards, Net Banking, Wallets). Cash on Delivery (COD) is currently unavailable to guarantee swift contactless express dispatch across India.
- Shipping: Free express shipping on all orders ₹399 and above; flat ₹45 on orders below ₹399.
- Returns & Exchanges: 7-day easy returns policy for unworn, unwashed garments with original tags intact. Direct size exchanges available via Support tickets.
- Ordering Requirement: Account login is required for placing orders (no guest checkout).
- Customer Support: support@samratfashion.com | +91-62621-27724 (Mon–Sat 10:00 AM – 7:00 PM IST)

## Key Pages & Navigation
- Shop All: ${baseUrl}/shop
- Special Offers & Discounts: ${baseUrl}/offers
- Customer Support Hub: ${baseUrl}/support
- Shipping, Tracking & Delivery: ${baseUrl}/shipping-returns
- Terms of Service: ${baseUrl}/terms
- Privacy Policy: ${baseUrl}/privacy
- Order Tracking: ${baseUrl}/track
- Customer Account: ${baseUrl}/account

## Full Product Catalog & Specifications
${productSections}
`;

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
