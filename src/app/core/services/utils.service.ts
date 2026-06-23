import { Injectable } from '@angular/core';
import { whatsappConfig } from '../../../environments/environment';

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
}
