export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") || "https://samratfashion.netlify.app";

export const SITE_CONFIG = {
  name: "Samrat Fashion",
  brandName: "Samrat Fashion",
  fullBrand: "Samrat Fashion",
  legalName: "Samrat Fashion",
  url: SITE_URL,
  description:
    "Shop tailored Indian menswear, classic 4-pocket Nehru jackets, and coti for festive & formal dressing. Express Pan-India delivery & secure Razorpay checkout.",
  defaultTitle: "Samrat Fashion | Premium Indian Menswear & Apparel",
  titleTemplate: "%s | Samrat Fashion",
  telephone: "+91-62621-27724",
  email: "support@samratfashion.com",
  geo: {
    region: "IN-MH",
    placename: "Mumbai, Maharashtra, India",
    latitude: 18.922,
    longitude: 72.8347,
    position: "18.9220;72.8347",
    icbm: "18.9220, 72.8347",
    postalCode: "400001",
    country: "IN",
    countryName: "India",
  },
  social: {
    instagram: "https://instagram.com/samratfashion",
    facebook: "https://facebook.com/samratfashion",
    twitter: "https://twitter.com/samratfashion",
  },
};

export const GEO_METADATA_OTHER = {
  "geo.region": SITE_CONFIG.geo.region,
  "geo.placename": SITE_CONFIG.geo.placename,
  "geo.position": SITE_CONFIG.geo.position,
  ICBM: SITE_CONFIG.geo.icbm,
  "target-country": SITE_CONFIG.geo.country,
  "revisit-after": "1 days",
  "rating": "general",
  "distribution": "global",
};

/**
 * Returns Schema.org JSON-LD for Organization & Local/Online Clothing Store.
 * Establishes Google Knowledge Graph entity and Indian geo-location trust.
 */
export function getOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": ["ClothingStore", "OnlineStore"],
    "@id": `${SITE_URL}/#organization`,
    name: SITE_CONFIG.name,
    alternateName: SITE_CONFIG.fullBrand,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    image: `${SITE_URL}/og-image.jpg`,
    description: SITE_CONFIG.description,
    telephone: SITE_CONFIG.telephone,
    email: SITE_CONFIG.email,
    // Live catalog range is ₹400 (Modi jacket) to ₹500 (Nehru jacket). Update this string if the catalog range changes.
    priceRange: "₹400 - ₹500",
    currenciesAccepted: "INR",
    paymentAccepted: "UPI, Credit Card, Debit Card, Net Banking, Wallets, Razorpay",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Samrat Fashion Distribution Hub",
      addressLocality: "Mumbai",
      addressRegion: "Maharashtra",
      postalCode: SITE_CONFIG.geo.postalCode,
      addressCountry: SITE_CONFIG.geo.country,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: SITE_CONFIG.geo.latitude,
      longitude: SITE_CONFIG.geo.longitude,
    },
    areaServed: {
      "@type": "Country",
      name: SITE_CONFIG.geo.countryName,
    },
    contactPoint: {
      "@type": "ContactPoint",
      telephone: SITE_CONFIG.telephone,
      contactType: "customer service",
      areaServed: SITE_CONFIG.geo.country,
      availableLanguage: ["en", "hi"],
    },
    hasMerchantReturnPolicy: {
      "@type": "MerchantReturnPolicy",
      applicableCountry: SITE_CONFIG.geo.country,
      returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
      merchantReturnDays: 7,
      returnMethod: "https://schema.org/ReturnByMail",
      returnFees: "https://schema.org/FreeReturn",
    },
    shippingDetails: {
      "@type": "OfferShippingDetails",
      shippingRate: {
        "@type": "MonetaryAmount",
        value: "0",
        currency: "INR",
      },
      shippingDestination: {
        "@type": "DefinedRegion",
        addressCountry: SITE_CONFIG.geo.country,
      },
      deliveryTime: {
        "@type": "ShippingDeliveryTime",
        handlingTime: {
          "@type": "QuantitativeValue",
          minValue: 1,
          maxValue: 2,
          unitCode: "d",
        },
        transitTime: {
          "@type": "QuantitativeValue",
          minValue: 2,
          maxValue: 5,
          unitCode: "d",
        },
      },
    },
    sameAs: [
      SITE_CONFIG.social.instagram,
      SITE_CONFIG.social.facebook,
      SITE_CONFIG.social.twitter,
    ],
  };
}

/**
 * Returns Schema.org JSON-LD for WebSite with Sitelinks SearchBox for Google Indexing.
 */
export function getWebSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: SITE_CONFIG.name,
    alternateName: SITE_CONFIG.brandName,
    description: SITE_CONFIG.description,
    inLanguage: "en-IN",
    publisher: {
      "@id": `${SITE_URL}/#organization`,
    },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/shop?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: [
        "#homepage-main-heading",
        "#homepage-lead-summary",
        "#shop-main-heading",
        "#coti-definition-text",
        "#pdp-main-heading",
        "#pdp-lead-summary",
        "#offers-main-heading",
        "#offers-lead-summary",
        "#account-main-heading",
        "#account-lead-summary",
        ".faq-answer-snippet",
      ],
    },
  };
}

/**
 * Returns Schema.org JSON-LD for BreadcrumbList.
 */
export function getBreadcrumbJsonLd(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url.startsWith("http") ? item.url : `${SITE_URL}${item.url.startsWith("/") ? "" : "/"}${item.url}`,
    })),
  };
}

export interface ProductJsonLdParams {
  name: string;
  slug: string;
  description?: string;
  images?: string[];
  basePrice: number;
  mrp?: number;
  sku?: string;
  categoryName?: string;
  averageRating?: number;
  reviewCount?: number;
  isAvailable?: boolean;
}

/**
 * Returns Schema.org JSON-LD for Product & Offers to qualify for Google Merchant & Rich Snippets.
 */
export function getProductJsonLd(product: ProductJsonLdParams) {
  const productUrl = `${SITE_URL}/shop/${product.slug}`;
  const cleanDescription = (product.description || product.name)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${productUrl}#product`,
    name: product.name,
    image: product.images && product.images.length > 0 ? product.images : [`${SITE_URL}/og-image.jpg`],
    description: cleanDescription,
    sku: product.sku || product.slug,
    mpn: product.sku || product.slug,
    brand: {
      "@type": "Brand",
      name: SITE_CONFIG.fullBrand,
    },
    author: {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_CONFIG.name,
      url: SITE_URL,
    },
    datePublished: "2026-01-15T00:00:00+05:30",
    dateModified: "2026-11-21T00:00:00+05:30",
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: ["#pdp-product-title", "#pdp-lead-summary", ".faq-answer-snippet"],
    },
    offers: {
      "@type": "Offer",
      "@id": `${productUrl}#offer`,
      url: productUrl,
      priceCurrency: "INR",
      price: product.basePrice,
      priceValidUntil: "2027-12-31",
      itemCondition: "https://schema.org/NewCondition",
      availability:
        product.isAvailable !== false
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      seller: {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_CONFIG.name,
        url: SITE_URL,
        logo: `${SITE_URL}/logo.png`,
        description: SITE_CONFIG.description,
        telephone: SITE_CONFIG.telephone,
        email: SITE_CONFIG.email,
        sameAs: [
          SITE_CONFIG.social.instagram,
          SITE_CONFIG.social.facebook,
          SITE_CONFIG.social.twitter,
        ],
        contactPoint: {
          "@type": "ContactPoint",
          telephone: SITE_CONFIG.telephone,
          contactType: "customer service",
          areaServed: SITE_CONFIG.geo.country,
          availableLanguage: ["en", "hi"],
        },
        address: {
          "@type": "PostalAddress",
          streetAddress: "Samrat Fashion Distribution Hub",
          addressLocality: "Mumbai",
          addressRegion: "Maharashtra",
          postalCode: SITE_CONFIG.geo.postalCode,
          addressCountry: SITE_CONFIG.geo.country,
        },
      },
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: SITE_CONFIG.geo.country,
        returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
        merchantReturnDays: 7,
        returnMethod: "https://schema.org/ReturnByMail",
        returnFees: "https://schema.org/FreeReturn",
      },
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingRate: {
          "@type": "MonetaryAmount",
          value: "0",
          currency: "INR",
        },
        shippingDestination: {
          "@type": "DefinedRegion",
          addressCountry: SITE_CONFIG.geo.country,
        },
      },
    },
  };

  if (product.categoryName) {
    schema.category = product.categoryName;
  }

  if (
    typeof product.averageRating === "number" &&
    product.averageRating > 0 &&
    typeof product.reviewCount === "number" &&
    product.reviewCount > 0
  ) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: product.averageRating,
      reviewCount: product.reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }

  return schema;
}

/**
 * Returns Schema.org JSON-LD for CollectionPage.
 */
export function getCollectionPageJsonLd(name: string, description: string, url: string) {
  const fullUrl = url.startsWith("http") ? url : `${SITE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${fullUrl}#collection`,
    name,
    description,
    url: fullUrl,
    inLanguage: "en-IN",
    isPartOf: {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: SITE_CONFIG.name,
      url: SITE_URL,
    },
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: [
        "#homepage-main-heading",
        "#homepage-lead-summary",
        "#shop-main-heading",
        "#coti-definition-text",
        "#pdp-main-heading",
        "#pdp-lead-summary",
        "#offers-main-heading",
        "#offers-lead-summary",
        "#account-main-heading",
        "#account-lead-summary",
        ".faq-answer-snippet",
      ],
    },
  };
}

/**
 * Returns curated FAQs for category/shop collection pages to power
 * FAQPage JSON-LD and on-page People Also Ask (PAA) answer snippets.
 */
export function getCategoryFaqs(categorySlug?: string): Array<{ q: string; a: string }> {
  const normalized = (categorySlug || "").toLowerCase();
  if (normalized === "coti" || normalized === "jackets") {
    return [
      {
        q: "What is a coti in Indian menswear?",
        a: "A coti (also known as a sleeveless Nehru jacket or Modi vest) is a structured Indian ethnic outerwear garment featuring a mandarin stand-up collar, button placket, and functional pocketing, designed to be layered over kurtas or shirts for weddings, festivals, and formal occasions.",
      },
      {
        q: "How do I choose the right size for a coti or Nehru jacket?",
        a: "Measure around the fullest part of your chest over a shirt or lightweight kurta. For a tailored slim fit, match your exact chest measurement (e.g., size 40 for a 40-inch chest). For comfortable layering over heavier festive garments, consider sizing up by one size.",
      },
      {
        q: "How should a coti be styled for Indian weddings and festivals?",
        a: "Pair your coti over a solid silk or linen kurta in ivory, off-white, or pastel tones. Fasten all front buttons leaving the bottom-most button unfastened for a natural drape, and accentuate the chest welt pocket with a folded contrast silk pocket square.",
      },
      {
        q: "What is the difference between a coti and a formal waistcoat?",
        a: "A coti features a stand-up mandarin collar (bandhgala) specifically structured for Indian ethnic attire, whereas a western waistcoat features a low V-neck or horseshoe cut engineered to sit beneath a suit jacket with a necktie.",
      },
      {
        q: "How long does shipping take and what is the return policy?",
        a: "All orders are dispatched within 24–48 hours with free express shipping across India on orders above ₹399. Samrat Fashion provides 7-day easy returns for unworn, unwashed garments with original tags intact. Submit a return from My Orders; after pickup and quality check the refund is credited within 5–7 business days and you can re-order the right size. For a direct size swap without re-ordering, raise a 'Size Exchange & Returns' support ticket and our team will arrange a manual exchange.",
      },
    ];
  }

  return [
    {
      q: "What garments are included in the Samrat Fashion menswear collection?",
      a: "Our collection features tailored 4-pocket Nehru jackets, coti, Modi vests, and festive Indian menswear handcrafted with breathable woven textures and structured bandhgala collars.",
    },
    {
      q: "How do I select the right garment size?",
      a: "Refer to the comprehensive Size Guide provided on each product and category page. We recommend selecting your exact chest size for a modern silhouette or sizing up if layering over thick kurtas.",
    },
    {
      q: "How fast is delivery across India?",
      a: "Orders are prepared and dispatched within 24 to 48 hours. Metro deliveries arrive within 3 to 5 business days, while non-metro locations take 4 to 7 business days via reliable express logistics.",
    },
    {
      q: "What payment methods are supported?",
      a: "We support 100% encrypted checkout via Razorpay, including UPI (Google Pay, PhonePe, Paytm, BHIM), major Credit and Debit cards (Visa, MasterCard, RuPay), and NetBanking.",
    },
    {
      q: "Can I exchange my jacket if it does not fit?",
      a: "7-day easy returns for unworn, unwashed garments with original tags intact. Submit a return from My Orders; after pickup and quality check the refund is credited within 5–7 business days and you can re-order the right size. For a direct size swap without re-ordering, raise a 'Size Exchange & Returns' support ticket and our team will arrange a manual exchange.",
    },
  ];
}

/**
 * Returns structured FAQs for the Offers, Discounts & Deals page.
 */
export function getOffersFaqs(): Array<{ q: string; a: string }> {
  return [
    {
      q: "How do I apply a discount code at Samrat Fashion?",
      a: "If a voucher code is shown on this Offers page, click it to copy it to your clipboard, add your chosen Nehru jackets or menswear to your cart, proceed to checkout, and paste the code into the coupon field for instant deduction before completing payment. If no code is shown, there is no active voucher right now — free shipping on orders ₹399 and above is automatic and needs no code.",
    },
    {
      q: "What is the minimum order value for complimentary delivery?",
      a: "Samrat Fashion provides automatic complimentary express delivery across India on all orders of ₹399 and above. Orders below ₹399 carry a flat ₹45 shipping fee. No coupon code is required as the free shipping rule applies automatically at checkout.",
    },
    {
      q: "Can I combine multiple discount coupons on a single order?",
      a: "Only one promotional coupon voucher can be redeemed per checkout order. However, coupon vouchers automatically stack with our free express delivery benefit on qualifying orders above ₹399.",
    },
    {
      q: "Can I return or exchange items purchased during a promotion or sale?",
      a: "Yes, our full 7-day easy returns policy applies to all promotional and discounted garments. Submit a return from My Orders; after pickup and quality check the refund is credited within 5–7 business days and you can re-order the right size. For a direct size swap without re-ordering, raise a 'Size Exchange & Returns' support ticket and our team will arrange a manual exchange.",
    },
    {
      q: "What payment methods qualify for promotional discounts?",
      a: "All 100% encrypted prepaid payment methods powered by Razorpay qualify for promotional discounts, including UPI (Google Pay, PhonePe, Paytm, BHIM), all major Credit and Debit cards (Visa, MasterCard, RuPay), and NetBanking.",
    },
  ];
}

/**
 * Returns structured FAQs for the Customer Account Hub page.
 */
export function getAccountFaqs(): Array<{ q: string; a: string }> {
  return [
    {
      q: "How do I track my Nehru jacket or menswear shipment?",
      a: "Navigate to My Orders in your Account Hub and select Track Order. You can view the live courier tracking number, shipment dispatch timestamp, transit milestones, and estimated delivery date across India.",
    },
    {
      q: "How do I exchange an item for a different size?",
      a: "7-day easy returns for unworn, unwashed garments with original tags intact. Submit a return from My Orders; after pickup and quality check the refund is credited within 5–7 business days and you can re-order the right size. For a direct size swap without re-ordering, raise a 'Size Exchange & Returns' support ticket and our team will arrange a manual exchange.",
    },
    {
      q: "Can I update my delivery address after placing an order?",
      a: "If your order has not yet been handed over to the courier partner (within 12–24 hours of placement), contact our Customer Support desk immediately to update the shipping pin code and delivery address.",
    },
    {
      q: "How do I download my invoice for accounting or tax purposes?",
      a: "Go to My Orders, select your completed purchase, and click Download Invoice to retrieve an official GST-compliant tax invoice detailing garment specifications, base price, and HSN codes.",
    },
    {
      q: "How is my personal account data protected?",
      a: "Samrat Fashion utilizes SSL/TLS encryption, secure session authentication, and PCI-DSS compliant Razorpay payment infrastructure. We never store debit/credit card numbers or UPI PINs on our servers.",
    },
  ];
}

/**
 * Returns Schema.org JSON-LD for FAQPage.
 */
export function getFaqPageJsonLd(faqs: Array<{ q: string; a: string }>, description?: string) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    description: description || "Frequently asked questions regarding sizing, tailoring, delivery, care, and returns for Samrat Fashion garments.",
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: [".faq-answer-snippet"],
    },
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      text: faq.q,
      answerCount: 1,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.a,
      },
    })),
  };
}

/**
 * Returns the standard 5 FAQs for product detail pages (PDP),
 * dynamically incorporating actual variant sizes for the product.
 * Each answer is tailored to a featured-snippet friendly 40-60 word length.
 */
export function getProductFaqs(product?: {
  variants?: Array<{ size?: string }>;
}): Array<{ q: string; a: string }> {
  const sizes = Array.from(
    new Set(
      (product?.variants || [])
        .map((v) => (v?.size || "").trim())
        .filter(Boolean)
    )
  );
  const sizeText = sizes.length > 0 ? ` (sizes ${sizes.join(", ")})` : "";

  return [
    {
      q: "How do I choose the right Nehru jacket size?",
      a: `To choose your ideal Nehru jacket size, measure around the fullest part of your chest over a shirt or lightweight kurta and consult our Size Guide${sizeText}. For a modern tailored silhouette, select your exact chest measurement; if you prefer comfortable layering over heavier festive garments, consider choosing one size up.`,
    },
    {
      q: "What is the return policy?",
      a: "7-day easy returns for unworn, unwashed garments with original tags intact. Submit a return from My Orders; after pickup and quality check the refund is credited within 5–7 business days and you can re-order the right size. For a direct size swap without re-ordering, raise a 'Size Exchange & Returns' support ticket and our team will arrange a manual exchange.",
    },
    {
      q: "How long does delivery take, and is shipping free?",
      a: "Orders are dispatched within 24–48 hours. Free express shipping on orders ₹399 and above; orders below that carry a flat ₹45 shipping fee. Metro delivery takes about 3–5 business days, non-metro 4–7 business days.",
    },
    {
      q: "What payment methods do you accept?",
      a: "We offer 100% encrypted prepaid checkout powered by Razorpay. We accept all major UPI applications (Google Pay, PhonePe, Paytm, BHIM), all credit and debit cards (Visa, MasterCard, RuPay), NetBanking, and mobile wallets. Cash on Delivery is currently unavailable to guarantee swift contactless express dispatch across India.",
    },
    {
      q: "How do I care for my Nehru jacket?",
      a: "Dry clean recommended to preserve the collar canvas fusing, shoulder posture, and textured weave of your Nehru jacket. Alternatively, gentle hand wash in cold water using mild liquid detergent is suitable. Always dry in shade and warm iron on the reverse side.",
    },
  ];
}
