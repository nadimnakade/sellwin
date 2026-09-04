import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ImageUploaderComponent } from './image-uploader.component';
import { ImageProcessingService, ProcessedImage } from '../../core/services/image-processing.service';

@Component({
  selector: 'app-image-upload-demo',
  standalone: true,
  imports: [CommonModule, ImageUploaderComponent],
  template: `
    <div class="page-container max-w-4xl">
      <div class="mb-6">
        <h1 class="page-title">Image Upload Demo</h1>
        <p class="text-surface-500 mt-1 text-sm">
          Upload up to 5 images. Each is resized client-side to 480×620 with HD quality.
        </p>
      </div>

      <div class="glass-card p-4 sm:p-6 mb-4">
        <h2 class="text-lg font-semibold text-surface-900 dark:text-white mb-4">Upload</h2>
        <app-image-uploader
          [maxImages]="5"
          [targetWidth]="480"
          [targetHeight]="620"
          [quality]="0.92"
          (imagesChange)="onImagesChange($event)">
        </app-image-uploader>
      </div>

      <div *ngIf="processedImages().length" class="glass-card p-4 sm:p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-surface-900 dark:text-white">
            Processed Output ({{ processedImages().length }})
          </h2>
          <button (click)="downloadAll()" class="btn-ghost text-sm" [disabled]="!processedImages().length">
            <i class="pi pi-download"></i> Download All
          </button>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-surface-200 dark:border-surface-700">
                <th class="text-left py-2 text-xs font-semibold text-surface-500 uppercase">Preview</th>
                <th class="text-left py-2 text-xs font-semibold text-surface-500 uppercase">Filename</th>
                <th class="text-right py-2 text-xs font-semibold text-surface-500 uppercase">Dimensions</th>
                <th class="text-right py-2 text-xs font-semibold text-surface-500 uppercase">Original</th>
                <th class="text-right py-2 text-xs font-semibold text-surface-500 uppercase">Processed</th>
                <th class="text-right py-2 text-xs font-semibold text-surface-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let img of processedImages()" class="border-b border-surface-100 dark:border-surface-800">
                <td class="py-2">
                  <img [src]="img.dataUrl" class="w-12 h-16 object-cover rounded border border-surface-200" />
                </td>
                <td class="py-2 text-surface-700 dark:text-surface-300 truncate max-w-[200px]">{{ img.filename }}</td>
                <td class="py-2 text-right text-surface-600">{{ img.width }}×{{ img.height }}</td>
                <td class="py-2 text-right text-surface-500">{{ formatBytes(img.originalSize) }}</td>
                <td class="py-2 text-right font-medium text-surface-900 dark:text-white">{{ formatBytes(img.processedSize) }}</td>
                <td class="py-2 text-right">
                  <button (click)="download(img)" class="text-primary-600 hover:text-primary-700 text-xs font-medium">
                    Download
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
})
export class ImageUploadDemoComponent {
  private imageService = inject(ImageProcessingService);
  processedImages = signal<ProcessedImage[]>([]);

  onImagesChange(images: ProcessedImage[]): void {
    this.processedImages.set(images);
  }

  formatBytes(bytes: number): string {
    return this.imageService.formatBytes(bytes);
  }

  download(img: ProcessedImage): void {
    const url = URL.createObjectURL(img.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = img.filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  downloadAll(): void {
    this.processedImages().forEach((img, i) => setTimeout(() => this.download(img), i * 200));
  }
}
