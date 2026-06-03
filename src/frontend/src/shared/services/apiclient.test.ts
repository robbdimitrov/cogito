import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import APIClient from './apiclient';
import Session from './session';
import { httpMethod } from '@/shared/constants';

// Mock dependencies
vi.mock('./session', () => ({
  default: {
    reset: vi.fn(),
  },
}));

describe('APIClient', () => {
  let apiClient: APIClient;

  beforeEach(() => {
    apiClient = new APIClient();
    vi.stubGlobal('fetch', vi.fn());
    vi.stubGlobal('window', { location: { reload: vi.fn() } });
    
    // Reset cookies
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: '',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('request', () => {
    it('handles successful JSON response', async () => {
      const mockData = { id: 1, name: 'Test' };
      const mockResponse = {
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue(JSON.stringify(mockData)),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      const result = await apiClient.request('/api/users/1', httpMethod.get);

      expect(fetch).toHaveBeenCalledWith('/api/users/1', expect.objectContaining({
        method: httpMethod.get,
        credentials: 'include',
      }));
      expect(result).toEqual(mockData);
    });

    it('handles 204 No Content response', async () => {
      const mockResponse = {
        ok: true,
        status: 204,
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      const result = await apiClient.request('/api/posts/1', httpMethod.delete);

      expect(result).toBeUndefined();
    });

    it('handles 401 Unauthorized by resetting session', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      await expect(apiClient.request('/api/protected', httpMethod.get))
        .rejects.toThrow('Unauthorized');

      expect(Session.reset).toHaveBeenCalled();
      expect(window.location.reload).toHaveBeenCalled();
    });

    it('handles error response with JSON body', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        text: vi.fn().mockResolvedValue(JSON.stringify({ message: 'Invalid input' })),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      await expect(apiClient.request('/api/test', httpMethod.get))
        .rejects.toThrow('Invalid input');
    });

    it('includes CSRF token on mutating requests if present in cookies', async () => {
      document.cookie = '_csrf=mock-token';
      
      const mockResponse = {
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue('{}'),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      await apiClient.request('/api/posts', httpMethod.post, { content: 'test' });

      expect(fetch).toHaveBeenCalledWith('/api/posts', expect.objectContaining({
        method: httpMethod.post,
        headers: {
          'content-type': 'application/json',
          'X-CSRF-Token': 'mock-token',
        },
        body: JSON.stringify({ content: 'test' }),
      }));
    });

    it('fetches CSRF token if missing on mutating requests', async () => {
      // Setup fetch to first return CSRF token on /api/ call, then success
      vi.mocked(fetch)
        .mockImplementationOnce(async () => {
          document.cookie = '_csrf=fetched-token';
          return {} as Response;
        })
        .mockImplementationOnce(async () => {
          return {
            ok: true,
            status: 200,
            text: vi.fn().mockResolvedValue('{}'),
          } as any;
        });

      await apiClient.request('/api/posts', httpMethod.post, { content: 'test' });

      expect(fetch).toHaveBeenCalledTimes(2);
      expect(fetch).toHaveBeenNthCalledWith(1, '/api/', { credentials: 'include' });
      expect(fetch).toHaveBeenNthCalledWith(2, '/api/posts', expect.objectContaining({
        headers: expect.objectContaining({
          'X-CSRF-Token': 'fetched-token',
        }),
      }));
    });
  });
});
