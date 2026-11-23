import zlib from 'zlib';
import { NimbusPostLogisticsProvider, formatLabelItemName, shortenProductName } from '../services/logistics/NimbusPostLogisticsProvider';
import { nimbusPostClient, NimbusPostCreateShipmentRequest } from '../services/logistics/NimbusPostClient';
import { generateShippingLabelPDFBuffer } from '../utils/pdfLabelGenerator';
import { CreateShipmentParams } from '../services/logistics/ILogisticsProvider';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(condition: boolean, desc: string, details?: string): void {
  if (condition) {
    console.log(`  ✅ PASS: ${desc}`);
    passed++;
  } else {
    const msg = details ? `${desc} — ${details}` : desc;
    failures.push(msg);
    console.error(`  ❌ FAIL: ${msg}`);
    failed++;
  }
}

function extractPdfText(buf: Buffer): string {
  const rawStr = buf.toString('binary');
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match: RegExpExecArray | null;
  let extracted = '';

  while ((match = streamRegex.exec(rawStr)) !== null) {
    try {
      const streamBuf = Buffer.from(match[1], 'binary');
      const decompressed = zlib.inflateSync(streamBuf).toString('utf-8');
      extracted += decompressed + '\n';
    } catch {
      // Uncompressed stream or alternate dictionary
    }
  }

  // Extract all text chunks inside TJ arrays ([ <hex> offset <hex> ... ] TJ)
  const tjRegex = /\[(.*?)\]\s*TJ/g;
  let tjMatch: RegExpExecArray | null;
  const chunks: string[] = [];

  while ((tjMatch = tjRegex.exec(extracted)) !== null) {
    const inner = tjMatch[1];
    const textPieces: string[] = [];
    const hexRegex = /<([0-9a-fA-F]+)>/g;
    let hexMatch: RegExpExecArray | null;
    while ((hexMatch = hexRegex.exec(inner)) !== null) {
      textPieces.push(Buffer.from(hexMatch[1], 'hex').toString('utf-8'));
    }
    chunks.push(textPieces.join(''));
  }

  return chunks.join('\n');
}

async function runTests(): Promise<void> {
  console.log('\n===============================================================');
  console.log('SHIPPING LABEL & LOGISTICS VARIANT/SKU/PHONE VERIFICATION SUITE');
  console.log('===============================================================\n');

  // -------------------------------------------------------------------------
  // TEST GROUP 1: NimbusPost createShipment Payload Capture & Assertion
  // -------------------------------------------------------------------------
  console.log('[TEST GROUP 1: NIMBUSPOST CREATESHIPMENT PAYLOAD CAPTURE]');

  const provider = new NimbusPostLogisticsProvider();
  let capturedPayload: NimbusPostCreateShipmentRequest | null = null;

  // Mock getPrimaryWarehouseId & createShipment on nimbusPostClient
  const origGetWarehouse = nimbusPostClient.getPrimaryWarehouseId;
  const origCreateShipment = nimbusPostClient.createShipment;

  nimbusPostClient.getPrimaryWarehouseId = async () => 'WH-TEST-001';
  nimbusPostClient.createShipment = async (payload: NimbusPostCreateShipmentRequest) => {
    capturedPayload = JSON.parse(JSON.stringify(payload));
    return {
      success: true,
      data: {
        booking: {
          awb: 'TEST-AWB-236454103010875',
          courier_name: 'Delhivery Surface',
          order_status: 'booked',
          label_url: 'https://api-v2.nimbuspost.com/labels/test-label.pdf'
        }
      }
    };
  };

  const testParams: CreateShipmentParams = {
    orderId: '60d5ec49f1b2c8b1f8e4e1a1',
    orderNumber: 'SF-2026-468851',
    recipient: {
      fullName: 'Mukesh Maurya',
      phone: '+91 98765 43210',
      addressLine1: 'Alambagh Market Road',
      addressLine2: 'Near Krishna Nagar',
      city: 'Lucknow',
      state: 'Uttar Pradesh',
      postalCode: '226005',
      country: 'India'
    },
    items: [
      {
        productName: 'Classic Mandarin Collar Textured Nehru Jacket',
        sku: 'CLASSICM-NAV-XL',
        selectedColor: 'Navy Blue',
        selectedSize: 'XL',
        quantity: 1,
        unitPrice: 500
      }
    ],
    codAmount: 0
  };

  await provider.createShipment(testParams);

  check(capturedPayload !== null, '1.1 NimbusPost createShipment was invoked and payload captured');
  check(
    (capturedPayload as any)?.items?.[0]?.sku === 'CLASSICM-NAV-XL',
    '1.2 Payload contains items[0].sku matching order SKU',
    `got: ${(capturedPayload as any)?.items?.[0]?.sku}`
  );
  check(
    (capturedPayload as any)?.items?.[0]?.name?.includes('Navy Blue / XL'),
    '1.3 Payload items[0].name contains variant (Colour / Size)',
    `got: ${(capturedPayload as any)?.items?.[0]?.name}`
  );
  check(
    (capturedPayload as any)?.items?.[0]?.name === 'Nehru Jacket - Navy Blue / XL',
    '1.4 Payload items[0].name derived cleanly without mid-word truncation',
    `got: ${(capturedPayload as any)?.items?.[0]?.name}`
  );
  check(
    (capturedPayload as any)?.shipping_address?.phone === 9876543210,
    '1.5 Payload shipping_address.phone is 10-digit clean number (not fallback 9999999999)',
    `got: ${(capturedPayload as any)?.shipping_address?.phone}`
  );
  check(
    (capturedPayload as any)?.warehouse_id === 'WH-TEST-001',
    '1.6 Payload sends only warehouse_id (no injected warehouse address string)',
    `got: ${(capturedPayload as any)?.warehouse_id}`
  );

  const testParamsModi: CreateShipmentParams = {
    orderId: '60d5ec49f1b2c8b1f8e4e1a3',
    orderNumber: 'SF-2026-468854',
    recipient: {
      fullName: 'Vikram Singh',
      phone: '+91 91234 56789',
      addressLine1: 'Civil Lines',
      city: 'Kanpur',
      state: 'Uttar Pradesh',
      postalCode: '208001',
      country: 'India'
    },
    items: [
      {
        productName: 'Classic 4-Pocket Safari Style Modi Jacket',
        sku: 'CLASSIC-MODI-GRY-M',
        selectedColor: 'Steel Grey',
        selectedSize: 'M',
        quantity: 1,
        unitPrice: 400
      }
    ],
    codAmount: 0
  };

  await provider.createShipment(testParamsModi);

  check(
    (capturedPayload as any)?.items?.[0]?.name === 'Modi Jacket - Steel Grey / M',
    '1.7 Payload items[0].name for Modi Jacket derived cleanly without mid-word truncation',
    `got: ${(capturedPayload as any)?.items?.[0]?.name}`
  );

  // -------------------------------------------------------------------------
  // TEST GROUP 2: Omission of SKU when missing (no invented or SKU-RETURN placeholder)
  // -------------------------------------------------------------------------
  console.log('\n[TEST GROUP 2: SKU OMISSION WHEN NOT PRESENT]');

  const testParamsNoSku: CreateShipmentParams = {
    orderId: '60d5ec49f1b2c8b1f8e4e1a2',
    orderNumber: 'SF-2026-468852',
    recipient: {
      fullName: 'Rahul Sharma',
      phone: '9123456780',
      addressLine1: 'Civil Lines',
      city: 'Prayagraj',
      state: 'Uttar Pradesh',
      postalCode: '211001',
      country: 'India'
    },
    items: [
      {
        productName: 'Casual Cotton Shirt',
        // sku is deliberately omitted/undefined
        selectedColor: 'White',
        selectedSize: 'M',
        quantity: 1,
        unitPrice: 799
      }
    ],
    codAmount: 0
  };

  await provider.createShipment(testParamsNoSku);

  check(
    (capturedPayload as any)?.items?.[0]?.sku === undefined,
    '2.1 When SKU is missing from order item, items[0].sku is omitted (undefined, not placeholder)',
    `got: ${(capturedPayload as any)?.items?.[0]?.sku}`
  );
  check(
    (capturedPayload as any)?.items?.[0]?.name?.includes('White / M'),
    '2.2 Variant Colour/Size still present when SKU is missing',
    `got: ${(capturedPayload as any)?.items?.[0]?.name}`
  );

  // Restore mocks
  nimbusPostClient.getPrimaryWarehouseId = origGetWarehouse;
  nimbusPostClient.createShipment = origCreateShipment;

  // -------------------------------------------------------------------------
  // TEST GROUP 3: Local Fallback Shipping Label PDF Rendering
  // -------------------------------------------------------------------------
  console.log('\n[TEST GROUP 3: LOCAL FALLBACK SHIPPING LABEL PDF RENDERING]');

  const mockShipment = {
    awbNumber: '236454103010875',
    carrier: 'DELHIVERY SURFACE'
  };

  const mockOrderWithVariant: any = {
    orderNumber: 'SF-2026-468851',
    paymentStatus: 'PAID',
    total: 500,
    shippingAddress: {
      fullName: 'Mukesh Maurya',
      addressLine1: 'Alambagh Market Road',
      addressLine2: 'Near Krishna Nagar',
      city: 'Lucknow',
      state: 'Uttar Pradesh',
      postalCode: '226005',
      phone: '9876543210'
    },
    items: [
      {
        productName: 'Classic Mandarin Collar Textured Nehru Jacket',
        sku: 'CLASSICM-NAV-XL',
        selectedColor: 'Navy Blue',
        selectedSize: 'XL',
        quantity: 1,
        unitPrice: 500
      }
    ]
  };

  const pdfBuffer = await generateShippingLabelPDFBuffer(mockShipment as any, mockOrderWithVariant);

  check(pdfBuffer.length > 0, '3.1 PDF buffer generated');
  check(pdfBuffer.subarray(0, 4).toString() === '%PDF', '3.2 PDF buffer starts with %PDF magic header');

  const pdfText = extractPdfText(pdfBuffer);

  check(pdfText.includes('CLASSICM-NAV-XL'), '3.3 Fallback PDF contains variant SKU (CLASSICM-NAV-XL)');
  check(pdfText.includes('Navy Blue / XL'), '3.4 Fallback PDF contains Colour and Size (Navy Blue / XL)');
  check(pdfText.includes('9876543210'), '3.5 Fallback PDF contains consignee Phone (9876543210)');
  check(pdfText.includes('236454103010875'), '3.6 Fallback PDF contains AWB (236454103010875)');
  check(pdfText.includes('SF-2026-468851'), '3.7 Fallback PDF contains Order Number (SF-2026-468851)');
  check(pdfText.includes('PREPAID - DO NOT COLLECT CASH'), '3.8 Fallback PDF contains PREPAID badge');

  // -------------------------------------------------------------------------
  // TEST GROUP 4: Fallback Label Graceful Fallbacks (Missing Variant / Phone)
  // -------------------------------------------------------------------------
  console.log('\n[TEST GROUP 4: FALLBACK LABEL WITH MISSING OPTIONAL FIELDS]');

  const mockOrderMissingFields: any = {
    orderNumber: 'SF-2026-468853',
    paymentStatus: 'PENDING',
    total: 1200,
    shippingAddress: {
      fullName: 'Anonymous Customer',
      addressLine1: 'Main Market',
      city: 'Varanasi',
      state: 'Uttar Pradesh',
      postalCode: '221001'
      // phone intentionally omitted
    },
    items: [
      {
        productName: 'Generic T-Shirt',
        quantity: 1,
        unitPrice: 1200
        // sku, selectedColor, selectedSize intentionally omitted
      }
    ]
  };

  const pdfBufferMissing = await generateShippingLabelPDFBuffer(mockShipment as any, mockOrderMissingFields);
  const pdfTextMissing = extractPdfText(pdfBufferMissing);

  check(pdfTextMissing.includes('SKU: N/A | N/A / N/A'), '4.1 Gracefully renders SKU: N/A | N/A / N/A when variant fields omitted');
  check(pdfTextMissing.includes('Phone: N/A'), '4.2 Gracefully renders Phone: N/A when phone omitted');
  check(pdfTextMissing.includes('C.O.D. COLLECT:') && pdfTextMissing.includes('1200'), '4.3 Correctly renders COD badge when paymentStatus is PENDING');

  // -------------------------------------------------------------------------
  // TEST GROUP 5: Item Name Shortening & Variant Formatting Helpers
  // -------------------------------------------------------------------------
  console.log('\n[TEST GROUP 5: LABEL ITEM NAME FORMATTING]');

  const short1 = shortenProductName('Classic Mandarin Collar Textured Nehru Jacket', 20);
  check(short1 === 'Nehru Jacket', '5.0 shortenProductName strips prefix within length limit', `got: ${short1}`);

  const name1 = formatLabelItemName('Classic Mandarin Collar Textured Nehru Jacket', 'Navy Blue', 'XL', 35);
  check(name1 === 'Nehru Jacket - Navy Blue / XL', '5.1 Strips marketing prefix to yield "Nehru Jacket - Navy Blue / XL"', `got: ${name1}`);

  const nameModi = formatLabelItemName('Classic 4-Pocket Safari Style Modi Jacket', 'Steel Grey', 'M', 35);
  check(nameModi === 'Modi Jacket - Steel Grey / M', '5.2 Strips safari/pocket prefix to yield "Modi Jacket - Steel Grey / M"', `got: ${nameModi}`);

  const name2 = formatLabelItemName('ThreadVibe Heavyweight Oversized Tee', 'Black', 'L', 35);
  check(name2 === 'Oversized Tee - Black / L', '5.3 Strips ThreadVibe Heavyweight prefix', `got: ${name2}`);

  const name3 = formatLabelItemName('Classic Unisex Crewneck T-Shirt', 'White', 'M', 35);
  check(name3 === 'Crewneck T-Shirt - White / M', '5.4 Strips Classic Unisex prefix', `got: ${name3}`);

  const name4 = formatLabelItemName('Very Long Custom Fashion Garment Designed For Men In Winter Seasons', 'Red', 'S', 35);
  check(name4.length <= 35, '5.5 Enforces max length <= 35 characters for very long product names', `len: ${name4.length}, got: ${name4}`);
  check(!name4.endsWith(' '), '5.6 Does not leave trailing space before suffix');

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.error('\nFailures:\n' + failures.join('\n'));
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test runner failure:', err);
  process.exit(1);
});
