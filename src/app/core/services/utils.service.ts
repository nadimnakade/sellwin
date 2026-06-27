import { Injectable } from '@angular/core';
import { whatsappConfig } from '../../../environments/environment';
import { OrderDetail } from '../interfaces';

@Injectable({ providedIn: 'root' })
export class UtilsService {
  getWhatsAppUrl(mobile: string, message?: string): string {
    const code = whatsappConfig.countryCode;
    const cleanMobile = mobile.replace(/[^0-9]/g, '');
    const text = message ? encodeURIComponent(message) : encodeURIComponent(whatsappConfig.followUpMessage);
    return `${whatsappConfig.baseUrl}/${code}${cleanMobile}?text=${text}`;
  }

  openWhatsApp(mobile: string, message?: string): void {
    window.open(this.getWhatsAppUrl(mobile, message), '_blank');
  }

  exportToCsv(data: any[], filename: string): void {
    if (!data.length) return;

    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map((row) =>
        headers.map((h) => {
          const val = row[h]?.toString() || '';
          return val.includes(',') ? `"${val}"` : val;
        }).join(','),
      ),
    ];

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  }

  formatDate(date: string): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      pending: 'status-pending',
      processing: 'status-processing',
      completed: 'status-completed',
      'on-hold': 'status-on-hold',
      cancelled: 'status-cancelled',
      refunded: 'status-cancelled',
      failed: 'status-cancelled',
    };
    return map[status] || 'status-pending';
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      pending: 'Pending',
      processing: 'Processing',
      completed: 'Completed',
      'on-hold': 'On Hold',
      cancelled: 'Cancelled',
      refunded: 'Refunded',
      failed: 'Failed',
      active: 'Active',
      abandoned: 'Abandoned',
      converted: 'Converted',
    };
    return map[status] || status;
  }

  downloadOrderPdf(order: OrderDetail): void {
    const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=1100,height=800');
    if (!printWindow) return;

    printWindow.document.open();
    printWindow.document.write(this.buildOrderPdfHtml(order));
    printWindow.document.close();

    const print = () => {
      printWindow.document.title = `Order-${order.orderNumber}.pdf`;
      printWindow.focus();
      printWindow.print();
    };

    printWindow.onload = print;
    setTimeout(print, 600);
  }

  private buildOrderPdfHtml(order: OrderDetail): string {
    const orderDate = this.formatDate(order.dateCreated);
    const rows = order.products.map((item) => `
      <tr>
        <td>
          <div class="product">
            ${item.image ? `<img src="${this.escapeHtml(item.image)}" alt="${this.escapeHtml(item.name)}">` : '<div class="image-fallback">No image</div>'}
            <div>
              <div class="product-title">${this.escapeHtml(item.name)}</div>
              <div class="muted">Product ID: ${item.productId}</div>
            </div>
          </div>
        </td>
        <td>${this.escapeHtml(item.sku || 'N/A')}</td>
        <td>${this.formatCurrency(item.price)}</td>
        <td>${item.quantity}</td>
        <td>${this.formatCurrency(item.subtotal)}</td>
      </tr>
    `).join('');

    return `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Order-${this.escapeHtml(order.orderNumber)}.pdf</title>
          <style>
            *{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#111827;margin:0;background:#fff;padding:28px}.header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #111827;padding-bottom:18px;margin-bottom:20px}.brand{display:flex;align-items:center;gap:12px}.logo{width:54px;height:54px;border-radius:14px;background:#0f172a;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:20px}.brand h1{margin:0;font-size:26px}.meta{text-align:right}.meta h2{margin:0 0 8px;font-size:20px}.muted{color:#64748b;font-size:12px}.summary{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:20px}.box{border:1px solid #e5e7eb;border-radius:10px;padding:14px;min-height:96px}.box-title{font-size:11px;color:#64748b;text-transform:uppercase;font-weight:700;margin-bottom:8px}.box strong{display:block;margin-bottom:4px}table{width:100%;border-collapse:collapse}thead{background:#f8fafc}th{font-size:11px;text-transform:uppercase;color:#64748b;text-align:left;padding:12px;border-bottom:1px solid #e5e7eb}td{padding:12px;border-bottom:1px solid #e5e7eb;vertical-align:middle}th:nth-child(n+2),td:nth-child(n+2){text-align:right}.product{display:flex;align-items:center;gap:12px}.product img,.image-fallback{width:58px;height:58px;border-radius:8px;border:1px solid #e5e7eb;object-fit:cover}.image-fallback{display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:10px}.product-title{font-weight:700}.totals{width:320px;margin:20px 0 0 auto}.line{display:flex;justify-content:space-between;padding:7px 0}.grand{border-top:2px solid #111827;margin-top:8px;padding-top:12px;font-size:20px;font-weight:800}.footer{margin-top:28px;text-align:center;color:#64748b;font-size:11px}@media print{body{padding:0}.box,.product{break-inside:avoid}thead{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
          </style>
        </head>
        <body>
          <div class="header">
            <div class="brand">
              <div class="logo">SW</div>
              <div>
                <h1>Sellwin</h1>
                <div class="muted">Order invoice / summary</div>
              </div>
            </div>
            <div class="meta">
              <h2>Order #${this.escapeHtml(order.orderNumber)}</h2>
              <div><strong>Date:</strong> ${this.escapeHtml(orderDate)}</div>
              <div><strong>Status:</strong> ${this.escapeHtml(this.getStatusLabel(order.status))}</div>
            </div>
          </div>

          <div class="summary">
            <div class="box">
              <div class="box-title">Customer</div>
              <strong>${this.escapeHtml(order.customer.name)}</strong>
              <div>${this.escapeHtml(order.customer.mobile || 'N/A')}</div>
              <div>${this.escapeHtml(order.customer.email || 'N/A')}</div>
            </div>
            <div class="box">
              <div class="box-title">Payment</div>
              <strong>${this.escapeHtml(order.paymentMethod || 'N/A')}</strong>
              <div class="muted">Paid: ${this.escapeHtml(order.datePaid ? this.formatDate(order.datePaid) : 'N/A')}</div>
            </div>
            <div class="box">
              <div class="box-title">Shipping</div>
              <div>${this.escapeHtml(this.formatAddress(order.shipping.address1 ? order.shipping : order.billing) || 'Same as billing')}</div>
            </div>
          </div>

          <table>
            <thead><tr><th>Title</th><th>SKU</th><th>Price</th><th>Qty</th><th>Total</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>

          <div class="totals">
            <div class="line"><span>Subtotal</span><span>${this.formatCurrency(order.subtotal)}</span></div>
            <div class="line"><span>Discount</span><span>-${this.formatCurrency(order.discountTotal)}</span></div>
            <div class="line"><span>Tax</span><span>${this.formatCurrency(order.taxTotal)}</span></div>
            <div class="line"><span>Shipping</span><span>${this.formatCurrency(order.shippingTotal)}</span></div>
            <div class="line grand"><span>Total</span><span>${this.formatCurrency(order.total)}</span></div>
          </div>

          <div class="footer">Generated by Sellwin on ${this.escapeHtml(this.formatDate(new Date().toISOString()))}</div>
        </body>
      </html>`;
  }

  private formatAddress(address: any): string {
    return [address.address1, address.address2, address.city, address.state, address.postcode, address.country]
      .filter(Boolean)
      .join(', ');
  }

  private escapeHtml(value: string): string {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
