import { test } from "node:test";
import assert from "node:assert";

test("llms.txt route returns 200 with valid markdown text and required metadata", async () => {
  // Test with production live catalog API
  process.env.NEXT_PUBLIC_API_URL = "https://samratfashion-tbec.onrender.com/api";
  const { GET } = await import("../app/llms.txt/route.ts");
  const response = await GET();
  assert.strictEqual(response.status, 200);

  const contentType = response.headers.get("content-type");
  assert.ok(contentType?.includes("text/plain"), `Expected text/plain, got: ${contentType}`);

  const text = await response.text();

  // Brand and description
  assert.ok(text.includes("# Samrat Fashion"));
  assert.ok(text.includes("Nehru jackets, coti, Modi jackets"));

  // Key Information
  assert.ok(text.includes("Pan-India delivery"));
  assert.ok(text.includes("Cash on Delivery (COD) is currently unavailable"));
  assert.ok(!text.includes("Cash on Delivery (COD) available"));
  assert.ok(text.includes("₹399"));
  assert.ok(text.includes("7-day easy returns"));
  assert.ok(text.includes("support@samratfashion.com"));
  assert.ok(text.includes("+91-62621-27724"));

  // Ordering requirement (no guest checkout)
  assert.ok(text.includes("Login is required for ordering") || text.includes("no guest checkout"));

  // Key Pages
  assert.ok(text.includes("https://samratfashion.netlify.app/shop"));
  assert.ok(text.includes("https://samratfashion.netlify.app/offers"));
  assert.ok(text.includes("https://samratfashion.netlify.app/support"));
  assert.ok(text.includes("https://samratfashion.netlify.app/shipping-returns"));
  assert.ok(text.includes("https://samratfashion.netlify.app/terms"));
  assert.ok(text.includes("https://samratfashion.netlify.app/privacy"));

  // Real live products
  assert.ok(text.includes("Classic Mandarin Collar Textured Nehru Jacket"));
  assert.ok(text.includes("https://samratfashion.netlify.app/shop/classic-mandarin-collar-textured-nehru-jacket"));
  assert.ok(text.includes("₹500"));
  assert.ok(text.includes("₹1,000")); // Nehru jacket has MRP

  assert.ok(text.includes("Classic 4-Pocket Safari Style Modi Jacket"));
  assert.ok(text.includes("https://samratfashion.netlify.app/shop/classic-4-pocket-safari-style-modi-jacket"));
  assert.ok(text.includes("₹400"));

  // Testing product must NOT be present
  assert.ok(!text.includes("Testing product"));
  assert.ok(!text.includes("testing-product"));
});

test("llms-full.txt route returns 200 with full product details, FAQs, and key pages", async () => {
  process.env.NEXT_PUBLIC_API_URL = "https://samratfashion-tbec.onrender.com/api";
  const { GET } = await import("../app/llms-full.txt/route.ts");
  const response = await GET();
  assert.strictEqual(response.status, 200);

  const contentType = response.headers.get("content-type");
  assert.ok(contentType?.includes("text/plain"), `Expected text/plain, got: ${contentType}`);

  const text = await response.text();

  // Brand and headers
  assert.ok(text.includes("# Samrat Fashion"));
  assert.ok(text.includes("## Key Information"));
  assert.ok(text.includes("## Key Pages & Navigation"));
  assert.ok(text.includes("## Full Product Catalog & Specifications"));

  // Both products with prices
  assert.ok(text.includes("Classic Mandarin Collar Textured Nehru Jacket"));
  assert.ok(text.includes("₹500"));
  assert.ok(text.includes("Classic 4-Pocket Safari Style Modi Jacket"));
  assert.ok(text.includes("₹400"));

  // FAQs and variant details
  assert.ok(text.includes("Frequently Asked Questions"));
  assert.ok(text.includes("How do I choose the right Nehru jacket size?"));
  assert.ok(text.includes("Variant Details"));

  // Key pages
  assert.ok(text.includes("https://samratfashion.netlify.app/shop"));
  assert.ok(text.includes("https://samratfashion.netlify.app/support"));

  // Testing product must NOT be present
  assert.ok(!text.includes("testing-product"));
});
