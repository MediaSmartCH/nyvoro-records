import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { clearCachedAuthSessionSnapshot } from '../lib/auth-api';

const NativeRequest = globalThis.Request;

class PatchedRequest extends NativeRequest {
  constructor(input: RequestInfo | URL, init?: RequestInit) {
    // React Router in jsdom can pass an AbortSignal coming from another realm.
    // Dropping signal in tests avoids undici type mismatches during navigate().
    if (!init) {
      super(input);
      return;
    }

    const rest = { ...init };
    delete rest.signal;
    super(input, rest);
  }
}

globalThis.Request = PatchedRequest as typeof Request;

Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: () => {}
});

afterEach(() => {
  window.sessionStorage.clear();
  clearCachedAuthSessionSnapshot();
  cleanup();
});
