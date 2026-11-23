import PDFDocument from 'pdfkit';
import { IShipment } from '../models/Shipment';
import { IOrder } from '../models/Order';

export function renderShippingLabelPDF(
  doc: PDFKit.PDFDocument,
  shipment: Partial<IShipment> | null | undefined,
  order: Partial<IOrder> | null | undefined
): void {
  // Header Box
  doc.rect(18, 18, 252, 40).fill('#004ac6');
  doc.fillColor('#FFFFFF').fontSize(14).font('Helvetica-Bold').text('SAMRAT FASHION EXPRESS', 24, 30);

  // AWB & Barcode representation
  const awb = shipment?.awbNumber || 'N/A';
  const carrier = String(shipment?.carrier || '').toUpperCase();
  const orderNumber = order?.orderNumber || 'N/A';

  const firstItem = order?.items && order.items.length > 0 ? order.items[0] : undefined;
  const itemSku = firstItem?.sku?.trim() || 'N/A';
  const itemColor = firstItem?.selectedColor?.trim() || 'N/A';
  const itemSize = firstItem?.selectedSize?.trim() || 'N/A';

  doc.fillColor('#000000').fontSize(10).font('Helvetica-Bold').text(`AWB: ${awb}`, 24, 66);
  doc.fontSize(8).font('Helvetica').text(`CARRIER: ${carrier}`, 24, 79);
  doc.fontSize(8).text(`ORDER NO: #${orderNumber}`, 24, 91);
  doc.fontSize(8).text(`SKU: ${itemSku} | ${itemColor} / ${itemSize}`, 24, 103);

  // Draw simulated Barcode Box
  doc.rect(24, 117, 240, 34).fill('#E5E7EB');
  doc.fillColor('#1F2937').fontSize(9).font('Helvetica-Bold').text(`||||| ||| ||||||| |||| |||||| |||||`, 34, 128);

  // Line Divider
  doc.moveTo(18, 159).lineTo(270, 159).strokeColor('#CCCCCC').stroke();

  // Ship To Address Box
  const shippingAddress = order?.shippingAddress;
  const fullName = shippingAddress?.fullName || 'N/A';
  const addressLine1 = shippingAddress?.addressLine1 || 'N/A';
  const addressLine2 = shippingAddress?.addressLine2 || '';
  const city = shippingAddress?.city || 'N/A';
  const state = shippingAddress?.state || 'N/A';
  const postalCode = shippingAddress?.postalCode || 'N/A';
  const phone = shippingAddress?.phone || 'N/A';
  const alternatePhone = shippingAddress?.alternatePhone || '';

  doc.fillColor('#000000').fontSize(10).font('Helvetica-Bold').text('SHIP TO:', 24, 167);
  doc.fontSize(10).font('Helvetica-Bold').text(fullName, 24, 180);
  doc.fontSize(9).font('Helvetica').text(addressLine1, 24, 194);
  let currentY = 206;
  if (addressLine2) {
    doc.text(addressLine2, 24, currentY);
    currentY += 12;
  }
  doc.text(`${city}, ${state} - ${postalCode}`, 24, currentY);
  currentY += 12;
  doc.text(`Phone: ${phone}${alternatePhone ? ` | Alt: ${alternatePhone}` : ''}`, 24, currentY);
  currentY += 18;

  // Line Divider
  doc.moveTo(18, currentY).lineTo(270, currentY).strokeColor('#CCCCCC').stroke();
  currentY += 10;

  // Payment Badge (COD or PREPAID)
  const isCod = order?.paymentStatus === 'PENDING' && (order?.total ?? 0) > 0;
  if (isCod) {
    doc.rect(24, currentY, 240, 36).fill('#FFF7ED');
    doc.fillColor('#C2410C').fontSize(12).font('Helvetica-Bold').text(`C.O.D. COLLECT: ₹${order?.total ?? 0}`, 34, currentY + 12);
  } else {
    doc.rect(24, currentY, 240, 36).fill('#ECFDF5');
    doc.fillColor('#047857').fontSize(12).font('Helvetica-Bold').text(`PREPAID - DO NOT COLLECT CASH`, 34, currentY + 12);
  }
  currentY += 46;

  // Return Address Footer
  doc.moveTo(18, currentY).lineTo(270, currentY).strokeColor('#CCCCCC').stroke();
  currentY += 10;
  doc.fillColor('#4B5563').fontSize(8).font('Helvetica-Bold').text('RETURN IF UNDELIVERED TO:', 24, currentY);
  doc.fontSize(7).font('Helvetica').text('Samrat Fashion Logistics Center', 24, currentY + 12);
  doc.text('Plot 404, Industrial Fashion Park, MIDC, Mumbai, MH - 400001', 24, currentY + 22);
}

export function generateShippingLabelPDFStream(shipment: IShipment, order: IOrder): PDFKit.PDFDocument {
  const doc = new PDFDocument({ size: [288, 432], margin: 18 }); // 4x6 inch thermal shipping label size
  renderShippingLabelPDF(doc, shipment, order);
  doc.end();
  return doc;
}

export function generateShippingLabelPDFBuffer(shipment: IShipment, order: IOrder): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: [288, 432], margin: 18 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      renderShippingLabelPDF(doc, shipment, order);
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
