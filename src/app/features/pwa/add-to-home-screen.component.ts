import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { PwaService } from '../../core/services/pwa.service';

@Component({
  selector: 'app-add-to-home-screen',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (showPrompt()) {
      <div class="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50 animate-fade-in">
        <div class="glass-card p-4 shadow-xl">
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shrink-0">
              <i class="pi pi-mobile text-white text-lg"></i>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-surface-900 dark:text-white">
                Install Sellwin Admin
              </p>
              @if (pwa.isIOS()) {
                <p class="text-xs text-surface-600 dark:text-surface-400 mt-1">
                  Tap
                  <i class="pi pi-share-alt inline-block mx-0.5"></i>
                  then <strong>"Add to Home Screen"</strong>
                </p>
              } @else {
                <p class="text-xs text-surface-600 dark:text-surface-400 mt-1">
                  Add to home screen for quick access
                </p>
              }
            </div>
            <button (click)="dismiss()"
                    class="text-surface-400 hover:text-surface-600 shrink-0 -mt-1 -mr-1 p-1"
                    aria-label="Dismiss">
              <i class="pi pi-times text-sm"></i>
            </button>
          </div>
          @if (!pwa.isIOS()) {
            <div class="flex gap-2 mt-3">
              <button (click)="dismiss()"
                      class="flex-1 px-3 py-1.5 text-xs font-medium text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition">
                Not now
              </button>
              <button (click)="install()"
                      class="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition">
                Install
              </button>
            </div>
          }
        </div>
      </div>
    }
  `,
})
export class AddToHomeScreenComponent implements OnInit {
  pwa = inject(PwaService);
  private platformId = inject(PLATFORM_ID);

  showPrompt = signal(false);

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.pwa.isStandalone()) return;

    const dismissed = localStorage.getItem('a2hs-dismissed');
    if (dismissed) {
      const ts = parseInt(dismissed, 10);
      // Show again after 7 days
      if (Date.now() - ts < 7 * 24 * 60 * 60 * 1000) return;
    }

    // Wait briefly for beforeinstallprompt
    setTimeout(() => {
      if (this.pwa.shouldShowPrompt()) {
        this.showPrompt.set(true);
      }
    }, 3000);
  }

  async install(): Promise<void> {
    const result = await this.pwa.install();
    if (result === 'accepted') {
      this.showPrompt.set(false);
    }
  }

  dismiss(): void {
    this.showPrompt.set(false);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('a2hs-dismissed', Date.now().toString());
    }
  }
}
