import { Injectable } from '@angular/core';

export interface ProcessedImage {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  originalSize: number;
  processedSize: number;
  filename: string;
  type: string;
}

export interface ImageProcessingOptions {
  targetWidth?: number;
  targetHeight?: number;
  quality?: number;
  mimeType?: string;
  fit?: 'cover' | 'contain';
  backgroundColor?: string;
}

const DEFAULT_OPTIONS: Required<ImageProcessingOptions> = {
  targetWidth: 480,
  targetHeight: 620,
  quality: 0.92,
  mimeType: 'image/jpeg',
  fit: 'cover',
  backgroundColor: '#ffffff',
};

@Injectable({ providedIn: 'root' })
export class ImageProcessingService {
  private readonly maxFileSize = 25 * 1024 * 1024;
  private readonly allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  validate(file: File): { valid: boolean; error?: string } {
    if (!this.allowedTypes.includes(file.type)) {
      return { valid: false, error: `Unsupported format. Use JPEG, PNG, or WebP.` };
    }
    if (file.size > this.maxFileSize) {
      return { valid: false, error: `File too large. Max ${this.maxFileSize / 1024 / 1024}MB.` };
    }
    return { valid: true };
  }

  async process(file: File, options?: ImageProcessingOptions): Promise<ProcessedImage> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const img = await this.loadImage(file);

    const { sx, sy, sw, sh, dw, dh } = this.calculateCrop(
      img.naturalWidth,
      img.naturalHeight,
      opts.targetWidth,
      opts.targetHeight,
      opts.fit
    );

    const canvas = document.createElement('canvas');
    canvas.width = opts.targetWidth;
    canvas.height = opts.targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context not available');

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    if (opts.mimeType === 'image/jpeg') {
      ctx.fillStyle = opts.backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);

    const blob = await this.canvasToBlob(canvas, opts.mimeType, opts.quality);
    const dataUrl = canvas.toDataURL(opts.mimeType, opts.quality);

    return {
      blob,
      dataUrl,
      width: opts.targetWidth,
      height: opts.targetHeight,
      originalSize: file.size,
      processedSize: blob.size,
      filename: this.buildFilename(file.name, opts.mimeType),
      type: opts.mimeType,
    };
  }

  async processMultiple(files: File[], options?: ImageProcessingOptions): Promise<ProcessedImage[]> {
    return Promise.all(files.map((file) => this.process(file, options)));
  }

  private loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };
      img.src = url;
    });
  }

  private calculateCrop(
    srcW: number,
    srcH: number,
    targetW: number,
    targetH: number,
    fit: 'cover' | 'contain'
  ) {
    const targetRatio = targetW / targetH;
    const sourceRatio = srcW / srcH;

    if (fit === 'cover') {
      let sw = srcW;
      let sh = srcH;
      let sx = 0;
      let sy = 0;

      if (sourceRatio > targetRatio) {
        sw = srcH * targetRatio;
        sx = (srcW - sw) / 2;
      } else if (sourceRatio < targetRatio) {
        sh = srcW / targetRatio;
        sy = (srcH - sh) / 2;
      }

      return { sx, sy, sw, sh, dw: targetW, dh: targetH };
    }

    return { sx: 0, sy: 0, sw: srcW, sh: srcH, dw: targetW, dh: targetH };
  }

  private canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to convert canvas to blob'));
        },
        mimeType,
        quality
      );
    });
  }

  private buildFilename(original: string, mimeType: string): string {
    const base = original.replace(/\.[^.]+$/, '');
    const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
    return `${base}_${DEFAULT_OPTIONS.targetWidth}x${DEFAULT_OPTIONS.targetHeight}.${ext}`;
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }
}
