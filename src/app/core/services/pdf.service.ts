import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import { OrderDetail, OrderItem } from '../interfaces';
import { SELLWIN_LOGO_URL } from '../constants/sellwin-logo';

type PdfColor = [number, number, number];

export interface PdfConfig {
  title: string;
  orderNumber: string;
  dateCreated: string;
  total: number;
  customer: OrderDetail['customer'];
  products: OrderItem[];
  orderInfo?: { label: string; value: string; color?: PdfColor }[];
  summaryLines?: { label: string; value: string; color?: PdfColor }[];
  addresses?: { label: string; lines: string[] }[];
  note?: string;
  filename: string;
}

export function buildPdfAddresses(order: OrderDetail): { label: string; lines: string[] }[] {
  const toLines = (address: OrderDetail['billing']): string[] => {
    const recipient = [address.firstName, address.lastName].filter(Boolean).join(' ');
    const street = [address.address1, address.address2].filter(Boolean).join(', ');
    const locality = [address.city, address.state, address.postcode, address.country].filter(Boolean).join(', ');
    return [address.company, recipient, street, locality].filter(Boolean);
  };
  const blocks = [{ label: 'BILL TO', lines: toLines(order.billing) }];
  const shippingLines = toLines(order.shipping);
  if (shippingLines.length) blocks.push({ label: 'SHIP TO', lines: shippingLines });
  return blocks;
}

@Injectable({ providedIn: 'root' })
export class PdfService {
  private logoDataUrl = '';
  private readonly font = 'helvetica';
  private readonly ink: PdfColor = [15, 23, 42];
  private readonly slate: PdfColor = [71, 85, 105];
  private readonly muted: PdfColor = [148, 163, 184];
  private readonly line: PdfColor = [226, 232, 240];
  private readonly surface: PdfColor = [248, 250, 252];
  private readonly primary: PdfColor = [37, 99, 235];

  constructor() {
    // Start caching the logo as soon as the PDF service is created so synchronous
    // blob generation can include it after the initial application load.
    void this.ensureLogoLoaded();
  }

  private buildPdf(config: PdfConfig): jsPDF {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 210;
    const margin = 14;
    const contentWidth = pageWidth - margin * 2;
    const footerTop = 282;
    let y = margin;

    const formatDate = (value: string): string => {
      if (!value) return 'Not available';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return value;
      return `${date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
    };
    const formatPrice = (value: number): string => `Rs ${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
    const totalQuantity = config.products.reduce((sum, product) => sum + Number(product.quantity || 0), 0);
    const setFont = (style: 'normal' | 'bold' | 'italic', size: number, color: PdfColor): void => {
      pdf.setFont(this.font, style);
      pdf.setFontSize(size + 0.5);
      pdf.setTextColor(...color);
    };

    const drawBrand = (compact = false): void => {
      const markSize = compact ? 9 : 13;
      if (this.logoDataUrl) {
        pdf.addImage(this.logoDataUrl, 'PNG', margin, y, markSize, markSize, undefined, 'FAST');
      } else {
        pdf.setFillColor(...this.primary);
        pdf.roundedRect(margin, y, markSize, markSize, 2.5, 2.5, 'F');
        setFont('bold', compact ? 8 : 11, [255, 255, 255]);
        pdf.text('S', margin + markSize / 2, y + markSize * 0.69, { align: 'center' });
      }
      setFont('bold', compact ? 13 : 20, this.ink);
      pdf.text('SELLWIN', margin + markSize + 4, y + (compact ? 6.5 : 7.5));
      if (!compact) {
        setFont('normal', 8, this.slate);
        pdf.text('Wholesale Mobile Accessories', margin + markSize + 4, y + 12);
      }
    };

    const drawFirstPageHeader = (): void => {
      y = margin;
      drawBrand();
      setFont('bold', 17, this.ink);
      pdf.text(config.title, pageWidth - margin, y + 6, { align: 'right' });
      setFont('bold', 10, this.primary);
      pdf.text(`#${config.orderNumber}`, pageWidth - margin, y + 12, { align: 'right' });
      setFont('normal', 8, this.slate);
      pdf.text(formatDate(config.dateCreated), pageWidth - margin, y + 17, { align: 'right' });
      y += 24;
      pdf.setFillColor(...this.primary);
      pdf.roundedRect(margin, y, contentWidth, 19, 3, 3, 'F');
      setFont('normal', 8, [219, 234, 254]);
      pdf.text('TOTAL AMOUNT', margin + 6, y + 7);
      setFont('bold', 16, [255, 255, 255]);
      pdf.text(formatPrice(config.total), margin + 6, y + 14);
      setFont('normal', 8, [219, 234, 254]);
      pdf.text(`${config.products.length} line items  |  ${totalQuantity} total units`, pageWidth - margin - 6, y + 11, { align: 'right' });
      y += 25;
    };

    const drawInfoCards = (): void => {
      const cards: { label: string; lines: string[] }[] = [{
        label: 'CUSTOMER',
        lines: [config.customer?.name, config.customer?.mobile, config.customer?.email].filter(Boolean),
      }];
      (config.addresses || []).forEach((address) => {
        const lines = address.lines.filter(Boolean);
        if (lines.length) cards.push({ label: address.label, lines });
      });
      const gap = 4;
      const width = (contentWidth - gap * (cards.length - 1)) / cards.length;
      // Address lines may wrap inside narrow three-column cards, so reserve enough
      // vertical space to keep the complete Bill To and Ship To addresses visible.
      const height = cards.length > 1 ? 46 : 34;
      cards.forEach((card, index) => {
        const x = margin + index * (width + gap);
        pdf.setFillColor(...this.surface);
        pdf.setDrawColor(...this.line);
        pdf.roundedRect(x, y, width, height, 2.5, 2.5, 'FD');
        setFont('bold', 7.5, this.primary);
        pdf.text(card.label, x + 4, y + 6);
        let lineY = y + 12;
        card.lines.slice(0, 4).forEach((line, lineIndex) => {
          setFont(lineIndex === 0 ? 'bold' : 'normal', 8, lineIndex === 0 ? this.ink : this.slate);
          const wrapped = pdf.splitTextToSize(line, width - 8).slice(0, 2);
          pdf.text(wrapped, x + 4, lineY);
          lineY += wrapped.length * 3.7 + 0.7;
        });
      });
      y += height + 5;

      if (config.orderInfo?.length) {
        pdf.setDrawColor(...this.line);
        pdf.roundedRect(margin, y, contentWidth, 12, 2, 2, 'S');
        const columnWidth = contentWidth / config.orderInfo.length;
        config.orderInfo.forEach((info, index) => {
          const x = margin + index * columnWidth + 4;
          setFont('normal', 7, this.slate);
          pdf.text(info.label.toUpperCase(), x, y + 4.5);
          setFont('bold', 8.5, info.color || this.ink);
          pdf.text(info.value || '-', x, y + 9);
        });
        y += 18;
      } else {
        y += 2;
      }
    };

    const drawContinuationHeader = (): void => {
      y = margin;
      drawBrand(true);
      setFont('bold', 9, this.ink);
      pdf.text(`${config.title}  #${config.orderNumber}`, pageWidth - margin, y + 6, { align: 'right' });
      y += 15;
      pdf.setDrawColor(...this.line);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 5;
    };

    const drawTableHeader = (): void => {
      pdf.setFillColor(...this.ink);
      pdf.roundedRect(margin, y, contentWidth, 9, 1.5, 1.5, 'F');
      pdf.setDrawColor(148, 163, 184);
      pdf.setLineWidth(0.5);
      pdf.roundedRect(margin, y, contentWidth, 9, 1.5, 1.5, 'S');
      setFont('bold', 7.5, [255, 255, 255]);
      pdf.text('#', margin + 3, y + 5.8);
      pdf.text('PRODUCT', margin + 13, y + 5.8);
      pdf.text('QTY', margin + 128, y + 5.8, { align: 'center' });
      pdf.text('UNIT PRICE', margin + 148, y + 5.8, { align: 'right' });
      pdf.text('AMOUNT', pageWidth - margin - 3, y + 5.8, { align: 'right' });
      pdf.setDrawColor(71, 85, 105);
      pdf.setLineWidth(0.35);
      [margin + 8, margin + 116, margin + 136, margin + 157].forEach((x) => {
        pdf.line(x, y + 1, x, y + 8);
      });
      y += 9;
    };

    const addProductImage = (item: OrderItem, index: number, rowY: number): void => {
      const imageSize = 20;
      const image = item.imageBase64 || (item.image?.startsWith('data:image/') ? item.image : '');
      if (image) {
        try {
          const format = image.startsWith('data:image/png') ? 'PNG' : image.startsWith('data:image/webp') ? 'WEBP' : 'JPEG';
          pdf.addImage(image, format, margin + 13, rowY + 3, imageSize, imageSize, undefined, 'FAST');
          return;
        } catch { /* Fall through to placeholder. */ }
      }
      pdf.setFillColor(226, 232, 240);
      pdf.roundedRect(margin + 13, rowY + 3, imageSize, imageSize, 2, 2, 'F');
      setFont('bold', 7.5, this.slate);
      pdf.text(String(index + 1), margin + 23, rowY + 14, { align: 'center' });
    };

    const drawProductRow = (item: OrderItem, index: number): void => {
      // Product cell runs from margin + 34 to margin + 116; keep text inside
      // that bordered cell instead of allowing it to overlap Qty.
      const productTextWidth = 78;
      const nameLines = pdf.splitTextToSize(item.name || 'Unnamed product', productTextWidth);
      const modelLines = item.model ? pdf.splitTextToSize(`Model: ${item.model}`, productTextWidth) : [];
      const rowHeight = Math.max(26, 8 + (nameLines.length + modelLines.length) * 4.2 + (item.sku ? 3.5 : 0), 26);
      if (y + rowHeight > footerTop - 5) {
        pdf.addPage();
        drawContinuationHeader();
        drawTableHeader();
      }
      if (index % 2 === 1) {
        pdf.setFillColor(...this.surface);
        pdf.rect(margin, y, contentWidth, rowHeight, 'F');
      }
      addProductImage(item, index, y);
      setFont('normal', 7.5, this.slate);
      pdf.text(String(index + 1), margin + 4.5, y + 12.5, { align: 'center' });
      setFont('bold', 8.5, this.ink);
      pdf.text(nameLines, margin + 34, y + 8);
      let detailY = y + 8 + nameLines.length * 4.2;
      if (modelLines.length) {
        setFont('normal', 7, this.slate);
        pdf.text(modelLines, margin + 34, detailY);
        detailY += modelLines.length * 4.2;
      }
      if (item.sku) {
        setFont('normal', 7, this.muted);
        pdf.text(`SKU: ${item.sku}`, margin + 34, detailY);
      }
      setFont('normal', 8, this.slate);
      const valueY = y + Math.max(12.5, rowHeight / 2 + 2.5);
      pdf.text(String(item.quantity), margin + 128, valueY, { align: 'center' });
      setFont('bold', 8.5, this.ink);
      pdf.text(formatPrice(item.price), margin + 148, valueY, { align: 'right' });
      pdf.text(formatPrice(item.subtotal || item.price * item.quantity), pageWidth - margin - 3, valueY, { align: 'right' });
      pdf.setDrawColor(...this.line);
      pdf.setLineWidth(0.5);
      pdf.rect(margin, y, contentWidth, rowHeight, 'S');
      // Strong, consistent column separators for a professional invoice grid.
      pdf.setDrawColor(203, 213, 225);
      [margin + 8, margin + 116, margin + 136, margin + 157].forEach((x) => {
        pdf.line(x, y, x, y + rowHeight);
      });
      y += rowHeight;
    };

    const ensureSpace = (height: number): void => {
      if (y + height > footerTop - 5) {
        pdf.addPage();
        drawContinuationHeader();
      }
    };

    const drawSummary = (): void => {
      const lines = config.summaryLines || [];
      const height = 24 + lines.length * 6;
      ensureSpace(height + (config.note ? 22 : 0));
      y += 7;
      const width = 78;
      const x = pageWidth - margin - width;
      pdf.setFillColor(...this.surface);
      pdf.setDrawColor(...this.line);
      pdf.roundedRect(x, y, width, height, 3, 3, 'FD');
      let rowY = y + 7;
      lines.forEach((line) => {
        setFont('normal', 8, this.slate);
        pdf.text(line.label.replace(/:$/, ''), x + 5, rowY);
        setFont('bold', 8, line.color || this.ink);
        pdf.text(line.value, x + width - 5, rowY, { align: 'right' });
        rowY += 6;
      });
      setFont('normal', 8, this.slate);
      pdf.text('Total units', x + 5, rowY);
      setFont('bold', 8, this.ink);
      pdf.text(String(totalQuantity), x + width - 5, rowY, { align: 'right' });
      rowY += 7;
      pdf.setDrawColor(...this.line);
      pdf.line(x + 5, rowY - 3, x + width - 5, rowY - 3);
      setFont('bold', 10, this.ink);
      pdf.text('TOTAL', x + 5, rowY + 2);
      setFont('bold', 12, this.primary);
      pdf.text(formatPrice(config.total), x + width - 5, rowY + 2, { align: 'right' });

      if (config.note) {
        setFont('bold', 7.5, this.primary);
        pdf.text('CUSTOMER NOTE', margin, y + 6);
        setFont('normal', 8, this.slate);
        pdf.text(pdf.splitTextToSize(config.note, contentWidth - width - 14).slice(0, 4), margin, y + 12);
      }
      y += height;
    };

    const addPageFooters = (): void => {
      const pages = pdf.getNumberOfPages();
      for (let page = 1; page <= pages; page += 1) {
        pdf.setPage(page);
        pdf.setDrawColor(...this.line);
        pdf.line(margin, footerTop, pageWidth - margin, footerTop);
        setFont('normal', 7.5, this.slate);
        pdf.text('Thank you for choosing Sellwin.', margin, footerTop + 5);
        pdf.text(`Generated ${formatDate(new Date().toISOString())}`, pageWidth / 2, footerTop + 5, { align: 'center' });
        pdf.text(`Page ${page} of ${pages}`, pageWidth - margin, footerTop + 5, { align: 'right' });
      }
    };

    drawFirstPageHeader();
    drawInfoCards();
    drawTableHeader();
    config.products.forEach(drawProductRow);
    drawSummary();
    addPageFooters();
    return pdf;
  }

  generate(config: PdfConfig): void {
    void this.ensureLogoLoaded().then(() => this.buildPdf(config).save(config.filename));
  }

  generateBlob(config: PdfConfig): Blob {
    return this.buildPdf(config).output('blob');
  }

  private async ensureLogoLoaded(): Promise<void> {
    if (this.logoDataUrl) return;
    try {
      const response = await fetch(SELLWIN_LOGO_URL);
      if (!response.ok) return;
      const blob = await response.blob();
      this.logoDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });
    } catch {
      // Keep the built-in fallback mark if the remote logo is unavailable.
    }
  }
}
