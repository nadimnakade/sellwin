import { Component, EventEmitter, Input, Output, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { ImageProcessingService, ProcessedImage } from '../../core/services/image-processing.service';

interface UploadedItem {
  id: string;
  file: File;
  processed: ProcessedImage | null;
  status: 'processing' | 'done' | 'error';
  error?: string;
}

@Component({
  selector: 'app-image-uploader',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-3">
      <!-- Drop zone -->
      @if (!readonly && items().length < maxImages) {
        <div class="border-2 border-dashed border-surface-300 dark:border-surface-700 rounded-xl p-6 text-center cursor-pointer hover:border-primary-500 hover:bg-primary-50/30 dark:hover:bg-primary-900/10 transition"
             [class.border-primary-500]="isDragging()"
             [class.bg-primary-50]="isDragging()"
             (click)="fileInput.click()"
             (dragover)="onDragOver($event)"
             (dragleave)="onDragLeave($event)"
             (drop)="onDrop($event)">
          <i class="pi pi-cloud-upload text-3xl text-surface-400 mb-2 block"></i>
          <p class="text-sm font-medium text-surface-700 dark:text-surface-300">
            Drop images here or <span class="text-primary-600">browse</span>
          </p>
          <p class="text-xs text-surface-500 mt-1">
            {{ items().length }}/{{ maxImages }} uploaded · resized to {{ targetWidth }}×{{ targetHeight }}px
          </p>
          <p class="text-xs text-surface-400 mt-1">JPEG, PNG, WebP · up to 25MB each</p>
          <input #fileInput
                 type="file"
                 class="hidden"
                 [accept]="acceptTypes"
                 [multiple]="maxImages > 1"
                 (change)="onFileSelect($event)" />
        </div>
      }

      <!-- Limit reached note -->
      @if (!readonly && items().length >= maxImages) {
        <p class="text-xs text-surface-500 text-center">
          Maximum {{ maxImages }} images reached. Remove one to add more.
        </p>
      }

      <!-- Previews grid -->
      @if (items().length) {
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          @for (item of items(); track item.id) {
            <div class="relative group rounded-lg overflow-hidden border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900"
                 style="aspect-ratio: 480 / 620;">
              <!-- Image -->
              @if (item.status === 'done') {
                <img [src]="item.processed.dataUrl"
                     [alt]="item.file.name"
                     class="w-full h-full object-cover" />
              }

              <!-- Processing state -->
              @if (item.status === 'processing') {
                <div class="absolute inset-0 flex items-center justify-center bg-surface-100 dark:bg-surface-800">
                  <i class="pi pi-spin pi-spinner text-2xl text-primary-500"></i>
                </div>
              }

              <!-- Error state -->
              @if (item.status === 'error') {
                <div class="absolute inset-0 flex flex-col items-center justify-center bg-red-50 dark:bg-red-900/20 p-2 text-center">
                  <i class="pi pi-exclamation-triangle text-2xl text-red-500 mb-1"></i>
                  <p class="text-xs text-red-700 dark:text-red-300 line-clamp-2">{{ item.error }}</p>
                </div>
              }

              <!-- Overlay info -->
              @if (item.status === 'done') {
                <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition">
                  <p class="text-xs text-white truncate">{{ item.file.name }}</p>
                  <p class="text-xs text-white/80">
                    {{ item.processed.width }}×{{ item.processed.height }} · {{ formatBytes(item.processed.processedSize) }}
                  </p>
                </div>
              }

              <!-- Remove button -->
              @if (!readonly) {
                <button type="button"
                        (click)="remove(item.id)"
                        class="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition hover:bg-red-600"
                        title="Remove">
                  <i class="pi pi-times text-xs"></i>
                </button>
              }
            </div>
          }
        </div>
      }

      <!-- Error banner -->
      @if (errorMessage()) {
        <p class="text-xs text-red-600 flex items-center gap-1">
          <i class="pi pi-exclamation-circle"></i> {{ errorMessage() }}
        </p>
      }
    </div>
  `,
})
export class ImageUploaderComponent {
  private imageService = inject(ImageProcessingService);

  @Input() maxImages = 5;
  @Input() targetWidth = 480;
  @Input() targetHeight = 620;
  @Input() quality = 0.92;
  @Input() acceptTypes = 'image/jpeg,image/jpg,image/png,image/webp';
  @Input() readonly = false;

  @Output() imagesChange = new EventEmitter<ProcessedImage[]>();
  @Output() imageRemoved = new EventEmitter<ProcessedImage>();

  items = signal<UploadedItem[]>([]);
  isDragging = signal(false);
  errorMessage = signal<string>('');

  processedImages = computed<ProcessedImage[]>(() =>
    this.items()
      .filter((i): i is UploadedItem & { processed: ProcessedImage } => i.status === 'done' && i.processed !== null)
      .map((i) => i.processed)
  );

  constructor() {
    queueMicrotask(() => this.emitChanges());
  }

  formatBytes(bytes: number): string {
    return this.imageService.formatBytes(bytes);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
    const files = Array.from(event.dataTransfer?.files || []);
    this.processFiles(files);
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    this.processFiles(files);
    input.value = '';
  }

  remove(id: string): void {
    const item = this.items().find((i) => i.id === id);
    if (!item) return;

    this.items.update((list) => list.filter((i) => i.id !== id));
    this.errorMessage.set('');
    this.emitChanges();

    if (item.status === 'done') {
      this.imageRemoved.emit(item.processed);
    }
  }

  private async processFiles(files: File[]): Promise<void> {
    this.errorMessage.set('');

    const currentCount = this.items().length;
    const slotsLeft = this.maxImages - currentCount;

    if (slotsLeft <= 0) {
      this.errorMessage.set(`Maximum ${this.maxImages} images allowed.`);
      return;
    }

    const accepted = files.slice(0, slotsLeft);
    if (files.length > slotsLeft) {
      this.errorMessage.set(`Only ${slotsLeft} more image(s) allowed. Extra files ignored.`);
    }

    for (const file of accepted) {
      const validation = this.imageService.validate(file);
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      if (!validation.valid) {
        this.items.update((list) => [
          ...list,
          { id, file, processed: null as any, status: 'error', error: validation.error },
        ]);
        continue;
      }

      this.items.update((list) => [
        ...list,
        { id, file, processed: null as any, status: 'processing' },
      ]);

      try {
        const processed = await this.imageService.process(file, {
          targetWidth: this.targetWidth,
          targetHeight: this.targetHeight,
          quality: this.quality,
        });

        this.items.update((list) =>
          list.map((i) => (i.id === id ? { ...i, processed, status: 'done' } : i))
        );
        this.emitChanges();
      } catch (err: any) {
        this.items.update((list) =>
          list.map((i) => (i.id === id ? { ...i, status: 'error', error: err?.message || 'Processing failed' } : i))
        );
      }
    }
  }

  private emitChanges(): void {
    this.imagesChange.emit(this.processedImages());
  }
}
