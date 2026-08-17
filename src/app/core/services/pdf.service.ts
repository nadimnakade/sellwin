import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import { OrderDetail, OrderItem } from '../interfaces';

export interface PdfConfig {
  title: string;
  orderNumber: string;
  dateCreated: string;
  total: number;
  customer: OrderDetail['customer'];
  products: OrderItem[];
  /** Optional second column info (Order Info block) */
  orderInfo?: { label: string; value: string; color?: [number, number, number] }[];
  /** Summary lines above grand total */
  summaryLines?: { label: string; value: string; color?: [number, number, number] }[];
  filename: string;
}

@Injectable({ providedIn: 'root' })
export class PdfService {
  private readonly font = 'helvetica';
  private readonly dark: [number, number, number] = [23, 23, 23];
  private readonly gray: [number, number, number] = [100, 100, 100];
  private readonly lightBg: [number, number, number] = [250, 250, 250];
  private readonly border: [number, number, number] = [230, 230, 230];
  private readonly primaryColor: [number, number, number] = [37, 99, 235];
  private readonly successColor: [number, number, number] = [34, 197, 94];

  private buildPdf(config: PdfConfig): jsPDF {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageW = 210;
    const margin = 15;
    const contentW = pageW - margin * 2;
    let y = margin;

    const formatDate = (dateStr: string): string => {
      if (!dateStr) return '-';
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
        ', ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    };

    const formatPrice = (price: number): string => {
      return `Rs ${price.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    };

    // ── HEADER ──────────────────────────────────────────
    const drawHeader = (): void => {
      y = margin;

      // Store name
      pdf.setFont(this.font, 'bold');
      pdf.setFontSize(22);
      pdf.setTextColor(...this.primaryColor);
      pdf.text('SELLWIN', margin, y + 7);

      pdf.setFont(this.font, 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(...this.gray);
      pdf.text('Wholesale Mobile Accessories', margin, y + 13);

      // Total amount under company name
      pdf.setFont(this.font, 'bold');
      pdf.setFontSize(12);
      pdf.setTextColor(...this.dark);
      pdf.text(formatPrice(config.total), margin, y + 20);

      // Title on right
      pdf.setFont(this.font, 'bold');
      pdf.setFontSize(16);
      pdf.setTextColor(...this.dark);
      pdf.text(config.title, pageW - margin, y + 7, { align: 'right' });

      pdf.setFont(this.font, 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(...this.gray);
      pdf.text(`#${config.orderNumber}`, pageW - margin, y + 13, { align: 'right' });
      pdf.setFontSize(9);
      pdf.text(formatDate(config.dateCreated), pageW - margin, y + 18, { align: 'right' });

      y += 27;

      // Divider
      pdf.setDrawColor(...this.border);
      pdf.setLineWidth(0.5);
      pdf.line(margin, y, pageW - margin, y);
      y += 8;

      // Two-column layout
      const col2X = margin + 95;

      // Left: Customer Details
      pdf.setFont(this.font, 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(...this.dark);
      pdf.text('CUSTOMER DETAILS', margin, y);

      pdf.setFont(this.font, 'normal');
      pdf.setFontSize(9);
      let leftY = y + 6;

      if (config.customer?.name) {
        pdf.setTextColor(...this.dark);
        pdf.text(config.customer.name, margin, leftY);
        leftY += 5;
      }
      if (config.customer?.email) {
        pdf.setTextColor(...this.gray);
        pdf.text(`Email: ${config.customer.email}`, margin, leftY);
        leftY += 5;
      }
      if (config.customer?.mobile) {
        pdf.setTextColor(...this.gray);
        pdf.text(`Phone: ${config.customer.mobile}`, margin, leftY);
        leftY += 5;
      }

      // Right: Order Info (if provided)
      let rightY = y + 6;
      if (config.orderInfo && config.orderInfo.length) {
        pdf.setFont(this.font, 'bold');
        pdf.setFontSize(9);
        pdf.setTextColor(...this.dark);
        pdf.text('ORDER INFO', col2X, y);

        pdf.setFont(this.font, 'normal');
        pdf.setFontSize(9);
        for (const info of config.orderInfo) {
          pdf.setTextColor(...this.gray);
          pdf.text(`${info.label}: `, col2X, rightY);
          pdf.setTextColor(...(info.color || this.dark));
          pdf.setFont(this.font, 'bold');
          pdf.text(info.value, col2X + 20, rightY);
          pdf.setFont(this.font, 'normal');
          rightY += 5;
        }
      }

      y = Math.max(leftY, rightY) + 5;
    };

    // ── TABLE HEADER ────────────────────────────────────
    const drawTableHeader = (): void => {
      pdf.setFillColor(30, 30, 30);
      pdf.rect(margin, y, contentW, 9, 'F');

      pdf.setFont(this.font, 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(255, 255, 255);

      pdf.text('PRODUCT', margin + 3, y + 6);
      pdf.text('PRICE', margin + 120, y + 6, { align: 'right' });
      pdf.text('QTY', margin + 145, y + 6, { align: 'center' });
      pdf.text('TOTAL', contentW + margin - 3, y + 6, { align: 'right' });

      y += 9;
    };

    // ── TABLE ROW ───────────────────────────────────────
    const drawRow = (item: OrderItem, index: number): number => {
      const rowH = 22;

      if (index % 2 === 1) {
        pdf.setFillColor(...this.lightBg);
        pdf.rect(margin, y, contentW, rowH, 'F');
      }

      pdf.setDrawColor(...this.border);
      pdf.setLineWidth(0.3);
      pdf.line(margin, y + rowH, margin + contentW, y + rowH);

      // Image
      if (item.imageBase64) {
        try {
          const fmt = item.imageBase64.startsWith('data:image/png') ? 'PNG' :
            item.imageBase64.startsWith('data:image/webp') ? 'WEBP' : 'JPEG';
          pdf.addImage(item.imageBase64, fmt, margin + 3, y + 4, 15, 15, undefined, 'FAST');
        } catch (e) {
          console.error('PDF image error:', e);
        }
      }

      // Product name
      pdf.setFont(this.font, 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(...this.dark);
      const nameLines = pdf.splitTextToSize(item.name, 68);
      pdf.text(nameLines.slice(0, 2), margin + 22, y + 7);

      // Price (unit)
      pdf.setFont(this.font, 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(...this.gray);
      pdf.text(formatPrice(item.price), margin + 120, y + 12, { align: 'right' });

      // Quantity
      pdf.setFont(this.font, 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(...this.dark);
      pdf.text(String(item.quantity), margin + 145, y + 12, { align: 'center' });

      // Line total
      const lineTotal = item.subtotal || item.price * item.quantity;
      pdf.setFont(this.font, 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(...this.dark);
      pdf.text(formatPrice(lineTotal), contentW + margin - 3, y + 12, { align: 'right' });

      return rowH;
    };

    // ── SUMMARY ─────────────────────────────────────────
    const drawSummary = (): void => {
      y += 10;
      const summaryX = contentW + margin - 70;

      pdf.setDrawColor(...this.dark);
      pdf.setLineWidth(0.5);
      pdf.line(summaryX, y, contentW + margin, y);
      y += 8;

      // Extra summary lines
      if (config.summaryLines) {
        for (const line of config.summaryLines) {
          pdf.setFont(this.font, 'normal');
          pdf.setFontSize(9);
          pdf.setTextColor(...this.gray);
          pdf.text(line.label, summaryX, y);
          pdf.setTextColor(...(line.color || this.dark));
          pdf.text(line.value, contentW + margin - 3, y, { align: 'right' });
          y += 6;
        }
      }

      // Items count
      pdf.setFont(this.font, 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(...this.gray);
      pdf.text('Total Items:', summaryX, y);
      pdf.setTextColor(...this.dark);
      pdf.text(String(config.products.length), contentW + margin - 3, y, { align: 'right' });
      y += 10;

      // Grand Total
      pdf.setFont(this.font, 'bold');
      pdf.setFontSize(13);
      pdf.setTextColor(...this.dark);
      pdf.text('TOTAL:', summaryX, y);
      pdf.setFontSize(14);
      pdf.setTextColor(...this.primaryColor);
      pdf.text(formatPrice(config.total), contentW + margin - 3, y, { align: 'right' });
      y += 10;

      pdf.setDrawColor(...this.dark);
      pdf.setLineWidth(0.5);
      pdf.line(summaryX, y, contentW + margin, y);
    };

    // ── FOOTER ──────────────────────────────────────────
    const drawFooter = (): void => {
      y += 15;
      pdf.setFont(this.font, 'italic');
      pdf.setFontSize(9);
      pdf.setTextColor(...this.gray);
      pdf.text('Thank you for your business!', pageW / 2, y, { align: 'center' });
      y += 5;
      pdf.text('For queries, contact us via WhatsApp or call.', pageW / 2, y, { align: 'center' });
    };

    const checkPage = (needed: number): void => {
      if (y + needed > 270) {
        pdf.addPage();
        y = margin;
        drawTableHeader();
      }
    };

    // ── BUILD ───────────────────────────────────────────
    drawHeader();
    drawTableHeader();

    config.products.forEach((item, i) => {
      checkPage(25);
      const rh = drawRow(item, i);
      y += rh;
    });

    checkPage(60);
    drawSummary();
    drawFooter();

    return pdf;
  }

  generate(config: PdfConfig): void {
    const pdf = this.buildPdf(config);
    pdf.save(config.filename);
  }

  generateBlob(config: PdfConfig): Blob {
    const pdf = this.buildPdf(config);
    return pdf.output('blob');
  }
}
