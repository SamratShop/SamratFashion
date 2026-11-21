import { test } from "node:test";
import assert from "node:assert";
import {
  SITE_CONFIG,
  SITE_URL,
  GEO_METADATA_OTHER,
  getOrganizationJsonLd,
  getWebSiteJsonLd,
  getBreadcrumbJsonLd,
  getProductJsonLd,
  getCollectionPageJsonLd,
  getFaqPageJsonLd,
  getProductFaqs,
  getCategoryFaqs,
  getOffersFaqs,
  getAccountFaqs,
} from "../lib/seo.ts";

test("SITE_URL defaults to production Netlify domain and does not point to Vercel", () => {
  assert.strictEqual(SITE_URL, "https://samratfashion.netlify.app");
  assert.strictEqual(SITE_CONFIG.url, "https://samratfashion.netlify.app");
});

test("SITE_CONFIG contains valid geo targeting and Indian location properties", () => {
  assert.strictEqual(SITE_CONFIG.geo.country, "IN");
  assert.strictEqual(SITE_CONFIG.geo.region, "IN-MH");
  assert.strictEqual(SITE_CONFIG.geo.postalCode, "400001");
  assert.strictEqual(typeof SITE_CONFIG.geo.latitude, "number");
  assert.strictEqual(typeof SITE_CONFIG.geo.longitude, "number");
  assert.strictEqual(GEO_METADATA_OTHER["geo.region"], "IN-MH");
  assert.strictEqual(GEO_METADATA_OTHER["target-country"], "IN");
});

test("getOrganizationJsonLd produces valid Schema.org Organization & ClothingStore", () => {
  const jsonLd = getOrganizationJsonLd();
  assert.strictEqual(jsonLd["@context"], "https://schema.org");
  assert.deepStrictEqual(jsonLd["@type"], ["ClothingStore", "OnlineStore"]);
  assert.strictEqual(jsonLd.priceRange, "₹400 - ₹500");
  assert.strictEqual(jsonLd.currenciesAccepted, "INR");
  assert.strictEqual(jsonLd.address["@type"], "PostalAddress");
  assert.strictEqual(jsonLd.address.addressCountry, "IN");
  assert.strictEqual(jsonLd.geo["@type"], "GeoCoordinates");
  assert.strictEqual(jsonLd.hasMerchantReturnPolicy["@type"], "MerchantReturnPolicy");
  assert.strictEqual(jsonLd.shippingDetails["@type"], "OfferShippingDetails");
});

test("getWebSiteJsonLd produces Sitelinks SearchBox Schema", () => {
  const webSite = getWebSiteJsonLd();
  assert.strictEqual(webSite["@context"], "https://schema.org");
  assert.strictEqual(webSite["@type"], "WebSite");
  assert.strictEqual(webSite.potentialAction["@type"], "SearchAction");
  assert.ok(webSite.potentialAction.target.urlTemplate.includes("/shop?search="));
  const speakable = webSite.speakable as { "@type": string; cssSelector: string[] };
  assert.strictEqual(speakable["@type"], "SpeakableSpecification");
  assert.ok(speakable.cssSelector.includes("#homepage-main-heading"));
  assert.ok(speakable.cssSelector.includes("#shop-main-heading"));
});

test("getBreadcrumbJsonLd produces valid BreadcrumbList", () => {
  const breadcrumbs = getBreadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "Shop", url: "/shop" },
    { name: "Oversized Tee", url: "/shop/oversized-tee" },
  ]);
  assert.strictEqual(breadcrumbs["@type"], "BreadcrumbList");
  assert.strictEqual(breadcrumbs.itemListElement.length, 3);
  assert.strictEqual(breadcrumbs.itemListElement[0].position, 1);
  assert.strictEqual(breadcrumbs.itemListElement[0].name, "Home");
  assert.strictEqual(breadcrumbs.itemListElement[2].name, "Oversized Tee");
});

test("getProductJsonLd produces valid Product & Offer Schema", () => {
  const productSchema = getProductJsonLd({
    name: "Cyber Neon Oversized Tee",
    slug: "cyber-neon-oversized-tee",
    description: "240 GSM Heavyweight Streetwear Cotton T-Shirt",
    images: ["https://res.cloudinary.com/demo/image/upload/sample.jpg"],
    basePrice: 999,
    mrp: 1499,
    sku: "CYBER-NEON-M",
    categoryName: "Oversized Tees",
    averageRating: 4.8,
    reviewCount: 32,
    isAvailable: true,
  });

  assert.strictEqual(productSchema["@type"], "Product");
  assert.strictEqual(productSchema.name, "Cyber Neon Oversized Tee");
  assert.strictEqual(productSchema.sku, "CYBER-NEON-M");
  const author = productSchema.author as Record<string, unknown>;
  assert.strictEqual(author["@type"], "Organization");
  assert.strictEqual(author.url, SITE_URL);
  const speakable = productSchema.speakable as Record<string, unknown>;
  assert.strictEqual(speakable["@type"], "SpeakableSpecification");
  const offers = productSchema.offers as Record<string, unknown>;
  assert.strictEqual(offers["@type"], "Offer");
  assert.strictEqual(offers.priceCurrency, "INR");
  assert.strictEqual(offers.price, 999);
  assert.strictEqual(offers.availability, "https://schema.org/InStock");
  const seller = offers.seller as Record<string, unknown>;
  assert.strictEqual(seller["@type"], "Organization");
  assert.strictEqual(seller.url, SITE_URL);
  assert.strictEqual(seller.name, SITE_CONFIG.name);
  assert.ok(seller.logo);
  const aggRating = productSchema.aggregateRating as Record<string, unknown>;
  assert.strictEqual(aggRating["@type"], "AggregateRating");
  assert.strictEqual(aggRating.ratingValue, 4.8);
  assert.strictEqual(aggRating.reviewCount, 32);
});

test("getProductJsonLd strictly omits aggregateRating when reviewCount is 0", () => {
  const schema = getProductJsonLd({
    name: "Classic Mandarin Collar Textured Nehru Jacket",
    slug: "classic-mandarin-collar-textured-nehru-jacket",
    basePrice: 500,
    mrp: 1000,
    averageRating: 0,
    reviewCount: 0,
    isAvailable: true,
  });

  assert.strictEqual(schema["@type"], "Product");
  assert.strictEqual(schema.aggregateRating, undefined);
  const offers = schema.offers as Record<string, unknown>;
  assert.strictEqual(offers.availability, "https://schema.org/InStock");
});

test("getProductJsonLd sets OutOfStock when isAvailable is false", () => {
  const schema = getProductJsonLd({
    name: "Classic 4-Pocket Safari Style Modi Jacket",
    slug: "classic-4-pocket-safari-style-modi-jacket",
    basePrice: 400,
    isAvailable: false,
  });

  const offers = schema.offers as Record<string, unknown>;
  assert.strictEqual(offers.availability, "https://schema.org/OutOfStock");
});
test("getCollectionPageJsonLd produces valid CollectionPage Schema with Speakable specification", () => {
  const collection = getCollectionPageJsonLd("Coti Menswear Collection", "Browse coti drops", "/shop?category=coti");
  assert.strictEqual(collection["@type"], "CollectionPage");
  assert.strictEqual(collection.name, "Coti Menswear Collection");
  assert.ok(collection.url.includes("/shop?category=coti"));
  assert.strictEqual(collection.inLanguage, "en-IN");
  const speakable = collection.speakable as { "@type": string; cssSelector: string[] };
  assert.strictEqual(speakable["@type"], "SpeakableSpecification");
  assert.ok(Array.isArray(speakable.cssSelector));
  assert.ok(speakable.cssSelector.includes("#shop-main-heading"));
});

test("getCategoryFaqs provides structured FAQs for coti and default collections", () => {
  const cotiFaqs = getCategoryFaqs("coti");
  assert.strictEqual(cotiFaqs.length, 5);
  assert.strictEqual(cotiFaqs[0].q, "What is a coti in Indian menswear?");
  assert.ok(cotiFaqs[0].a.includes("structured Indian ethnic outerwear garment"));

  const defaultFaqs = getCategoryFaqs();
  assert.strictEqual(defaultFaqs.length, 5);
  assert.strictEqual(defaultFaqs[0].q, "What garments are included in the Samrat Fashion menswear collection?");
});

test("getOffersFaqs provides 5 structured FAQs for the offers and discounts page", () => {
  const offersFaqs = getOffersFaqs();
  assert.strictEqual(offersFaqs.length, 5);
  assert.strictEqual(offersFaqs[0].q, "How do I apply a discount code at Samrat Fashion?");
  assert.ok(offersFaqs[0].a.includes("Click any active voucher code"));
  assert.strictEqual(offersFaqs[1].q, "What is the minimum order value for complimentary delivery?");
  assert.ok(offersFaqs[1].a.includes("orders of ₹399 and above"));
});

test("getAccountFaqs provides 5 structured FAQs for the customer account hub", () => {
  const accountFaqs = getAccountFaqs();
  assert.strictEqual(accountFaqs.length, 5);
  assert.strictEqual(accountFaqs[0].q, "How do I track my Nehru jacket or menswear shipment?");
  assert.ok(accountFaqs[0].a.includes("Track Order"));
  assert.strictEqual(accountFaqs[1].q, "How do I exchange an item for a different size?");
  assert.ok(accountFaqs[1].a.includes("Request Size Exchange"));
});


test("getFaqPageJsonLd produces valid FAQPage Schema", () => {
  const faqs = [
    { q: "How long does shipping take?", a: "24-48 hours across India via Delhivery." },
    { q: "What is your return policy?", a: "7-day doorstep returns." },
  ];
  const faqSchema = getFaqPageJsonLd(faqs);
  assert.strictEqual(faqSchema["@type"], "FAQPage");
  assert.ok(faqSchema.description);
  const speakable = faqSchema.speakable as { "@type": string; cssSelector: string[] };
  assert.strictEqual(speakable["@type"], "SpeakableSpecification");
  assert.ok(speakable.cssSelector.includes(".faq-answer-snippet"));
  assert.strictEqual(faqSchema.mainEntity.length, 2);
  assert.strictEqual(faqSchema.mainEntity[0]["@type"], "Question");
  assert.strictEqual(faqSchema.mainEntity[0].text, "How long does shipping take?");
  assert.strictEqual(faqSchema.mainEntity[0].acceptedAnswer["@type"], "Answer");
});

test("getProductFaqs generates 5 PDP FAQs with dynamically derived sizes", () => {
  const productWithVariants = {
    variants: [
      { size: "S", color: "Warm White" },
      { size: "M", color: "Warm White" },
      { size: "L", color: "Warm White" },
      { size: "XL", color: "Warm White" },
    ],
  };
  const faqs = getProductFaqs(productWithVariants);
  assert.strictEqual(faqs.length, 5);
  assert.strictEqual(faqs[0].q, "How do I choose the right Nehru jacket size?");
  assert.ok(faqs[0].a.includes("(sizes S, M, L, XL)"));
  assert.ok(faqs[1].a.includes("7-day easy returns"));
  assert.ok(faqs[2].a.includes("Orders are dispatched within 24–48 hours"));
  assert.ok(faqs[3].a.includes("Cash on Delivery is currently unavailable"));
  assert.ok(faqs[4].a.includes("Dry clean recommended"));
});
