import '@testing-library/jest-dom'

// Stub canvas API used by QrCode component (qrcode lib calls getContext + createImageData)
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: () => ({
    clearRect: () => {},
    createImageData: (w: number, h: number) => ({
      data: new Uint8ClampedArray(w * h * 4),
      width: w,
      height: h,
    }),
    putImageData: () => {},
  }),
  writable: true,
  configurable: true,
})
