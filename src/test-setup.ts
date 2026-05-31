import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});

// jsdom 29 doesn't expose ImageData globally; provide a minimal stub for unit tests
if (typeof globalThis.ImageData === 'undefined') {
  class ImageDataStub {
    data: Uint8ClampedArray;
    width: number;
    height: number;
    constructor(widthOrData: number | Uint8ClampedArray, width?: number, height?: number) {
      if (typeof widthOrData === 'number') {
        this.width = widthOrData;
        this.height = width ?? widthOrData;
        this.data = new Uint8ClampedArray(this.width * this.height * 4);
      } else {
        this.data = new Uint8ClampedArray(widthOrData);
        this.width = width!;
        this.height = height ?? Math.floor(widthOrData.length / (width! * 4));
      }
    }
  }
  globalThis.ImageData = ImageDataStub as unknown as typeof ImageData;
}
