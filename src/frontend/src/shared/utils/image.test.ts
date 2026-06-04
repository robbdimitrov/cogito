import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resizeImageForUpload } from './image';

describe('resizeImageForUpload', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    
    // Mock URL methods
    global.URL.createObjectURL = vi.fn(() => 'mock-url');
    global.URL.revokeObjectURL = vi.fn();

    // Mock Image class
    global.Image = class {
      onload: () => void = () => {};
      onerror: () => void = () => {};
      width: number = 2000;
      height: number = 1000;
      private _src: string = '';
      
      set src(val: string) {
        this._src = val;
        setTimeout(() => this.onload(), 0);
      }
      get src() {
        return this._src;
      }
    } as any;

    // Mock Canvas context
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      drawImage: vi.fn(),
      fillStyle: '',
    }) as any);

    // Mock Canvas toBlob
    HTMLCanvasElement.prototype.toBlob = vi.fn(function(this: any, callback: BlobCallback, _type?: string, quality?: any) {
      // Base size is area of canvas in bytes.
      // At 1600x800 this is 1,280,000 bytes (~1.28MB).
      // Multiplied by quality (0.88 to start), it is ~1,126,400 bytes.
      // Max size is 900 * 1024 = 921,600 bytes.
      // So it will drop quality, and if needed scale down until it's under 921,600.
      const blobSize = this.width * this.height * (quality || 1);
      const blob = new Blob([''], { type: 'image/jpeg' });
      Object.defineProperty(blob, 'size', { value: blobSize });
      
      setTimeout(() => callback(blob), 0);
    });
  });

  it('throws error for unsupported format', async () => {
    const file = new File([''], 'test.txt', { type: 'text/plain' });
    await expect(resizeImageForUpload(file)).rejects.toThrow('Unsupported image format');
  });

  it('returns original file if under 900KB', async () => {
    const file = new File(['a'.repeat(100 * 1024)], 'test.jpg', { type: 'image/jpeg' });
    const result = await resizeImageForUpload(file);
    expect(result).toBe(file);
  });

  it('resizes and compresses file larger than 900KB', async () => {
    // Create a mock large file
    const file = new File(['a'.repeat(2000 * 1024)], 'large.png', { type: 'image/png' });
    const result = await resizeImageForUpload(file);
    expect(result).not.toBe(file);
    expect(result.size).toBeLessThanOrEqual(900 * 1024);
    expect(result.type).toBe('image/jpeg');
    expect(result.name).toBe('large.jpeg');
  });
  
  it('throws error if canvas context fails', async () => {
    HTMLCanvasElement.prototype.getContext = vi.fn(() => null);
    const file = new File(['a'.repeat(2000 * 1024)], 'large.jpg', { type: 'image/jpeg' });
    await expect(resizeImageForUpload(file)).rejects.toThrow('Failed to get canvas context');
  });

  it('throws error if image fails to load', async () => {
    global.Image = class {
      onload: () => void = () => {};
      onerror: () => void = () => {};
      private _src: string = '';
      
      set src(val: string) {
        this._src = val;
        setTimeout(() => this.onerror(), 0);
      }
      get src() {
        return this._src;
      }
    } as any;
    const file = new File(['a'.repeat(2000 * 1024)], 'large.jpg', { type: 'image/jpeg' });
    await expect(resizeImageForUpload(file)).rejects.toThrow('Failed to load image');
  });
});
