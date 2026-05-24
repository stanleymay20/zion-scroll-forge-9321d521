import { legacyApiCall } from "@/lib/legacyApi";
/**
 * CDN Integration Service
 * Manages static asset delivery through CDN
 */

interface CDNConfig {
  baseUrl: string;
  enabled: boolean;
  regions: string[];
  cacheControl: string;
}

interface AssetOptions {
  version?: string;
  region?: string;
  quality?: number;
  format?: string;
}

class CDNIntegration {
  private config: CDNConfig;
  private assetManifest: Map<string, string> = new Map();

  constructor() {
    this.config = {
      baseUrl: import.meta.env.VITE_CDN_URL || '',
      enabled: import.meta.env.VITE_CDN_ENABLED === 'true',
      regions: (import.meta.env.VITE_CDN_REGIONS || 'us-east-1').split(','),
      cacheControl: 'public, max-age=31536000, immutable',
    };

    this.loadAssetManifest();
  }

  /**
   * Load asset manifest for cache busting
   */
  private async loadAssetManifest() {
    try {
      if (import.meta.env.PROD) {
        const response = await fetch('/asset-manifest.json');
        if (!response.ok) return;
        const manifest = await response.json();
        Object.entries(manifest).forEach(([key, value]) => {
          this.assetManifest.set(key, value as string);
        });
      }
    } catch (error) {
      console.warn('Failed to load asset manifest:', error);
    }
  }

  /**
   * Get CDN URL for an asset
   */
  getAssetUrl(path: string, options: AssetOptions = {}): string {
    if (!this.config.enabled || !this.config.baseUrl) {
      return this.getLocalAssetUrl(path, options);
    }

    // Get versioned path from manifest
    const versionedPath = this.assetManifest.get(path) || path;

    // Build CDN URL
    const url = new URL(versionedPath, this.config.baseUrl);

    // Add optimization parameters
    if (options.quality) {
      url.searchParams.set('q', options.quality.toString());
    }
    if (options.format) {
      url.searchParams.set('f', options.format);
    }
    if (options.version) {
      url.searchParams.set('v', options.version);
    }

    return url.toString();
  }

  /**
   * Get local asset URL (fallback)
   */
  private getLocalAssetUrl(path: string, options: AssetOptions = {}): string {
    const versionedPath = this.assetManifest.get(path) || path;
    return versionedPath.startsWith('/') ? versionedPath : `/${versionedPath}`;
  }

  /**
   * Preconnect to CDN
   */
  preconnect() {
    if (!this.config.enabled || !this.config.baseUrl) return;

    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = this.config.baseUrl;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);

    // DNS prefetch as fallback
    const dnsPrefetch = document.createElement('link');
    dnsPrefetch.rel = 'dns-prefetch';
    dnsPrefetch.href = this.config.baseUrl;
    document.head.appendChild(dnsPrefetch);
  }

  /**
   * Prefetch critical assets
   */
  prefetchAssets(assets: string[]) {
    assets.forEach((asset) => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = this.getAssetUrl(asset);
      link.as = this.getAssetType(asset);
      document.head.appendChild(link);
    });
  }

  /**
   * Preload critical assets
   */
  preloadAssets(assets: string[]) {
    assets.forEach((asset) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = this.getAssetUrl(asset);
      link.as = this.getAssetType(asset);
      
      // Add crossorigin for fonts
      if (asset.match(/\.(woff2?|ttf|otf|eot)$/)) {
        link.crossOrigin = 'anonymous';
      }
      
      document.head.appendChild(link);
    });
  }

  /**
   * Get asset type for preload/prefetch
   */
  private getAssetType(path: string): string {
    if (path.match(/\.(js|mjs)$/)) return 'script';
    if (path.match(/\.css$/)) return 'style';
    if (path.match(/\.(woff2?|ttf|otf|eot)$/)) return 'font';
    if (path.match(/\.(png|jpg|jpeg|gif|svg|webp|avif)$/)) return 'image';
    if (path.match(/\.(mp4|webm|ogg)$/)) return 'video';
    if (path.match(/\.(mp3|wav|ogg)$/)) return 'audio';
    return 'fetch';
  }

  /**
   * Get optimal region based on user location
   */
  async getOptimalRegion(): Promise<string> {
    try {
      // Use geolocation API or IP-based detection
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      const userRegion = data.region_code;

      // Map to CDN region
      const regionMap: Record<string, string> = {
        'US-EAST': 'us-east-1',
        'US-WEST': 'us-west-1',
        'EU': 'eu-west-1',
        'ASIA': 'ap-southeast-1',
      };

      return regionMap[userRegion] || this.config.regions[0];
    } catch (error) {
      console.warn('Failed to detect optimal region:', error);
      return this.config.regions[0];
    }
  }

  /**
   * Purge CDN cache for specific assets
   */
  async purgeCache(paths: string[]): Promise<void> {
    if (!this.config.enabled) return;

    try {
      await legacyApiCall('/api/cdn/purge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths }),
      });
    } catch (error) {
      console.error('Failed to purge CDN cache:', error);
    }
  }

  /**
   * Get CDN statistics
   */
  async getStats(): Promise<{
    bandwidth: number;
    requests: number;
    cacheHitRate: number;
  }> {
    try {
      const response = await legacyApiCall('/api/cdn/stats');
      return await response.json();
    } catch (error) {
      console.error('Failed to get CDN stats:', error);
      return { bandwidth: 0, requests: 0, cacheHitRate: 0 };
    }
  }

  /**
   * Check if CDN is available
   */
  async checkAvailability(): Promise<boolean> {
    if (!this.config.enabled || !this.config.baseUrl) return false;

    try {
      const response = await fetch(`${this.config.baseUrl}/health`, {
        method: 'HEAD',
        cache: 'no-cache',
      });
      return response.ok;
    } catch (error) {
      console.error('CDN availability check failed:', error);
      return false;
    }
  }
}

export const cdnIntegration = new CDNIntegration();

/**
 * React hook for CDN assets
 */
export function useCDNAsset(path: string, options: AssetOptions = {}) {
  return cdnIntegration.getAssetUrl(path, options);
}

/**
 * Initialize CDN on app start
 */
export function initializeCDN() {
  cdnIntegration.preconnect();
}
