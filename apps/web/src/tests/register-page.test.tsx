import { fireEvent, render, waitFor } from '@testing-library/react';
import { RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createNyvoroMemoryRouter } from '../router';

function buildJsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('register page', () => {
  it('submits artist-only registration and hides admin account selection', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      buildJsonResponse(
        {
          status: 'ok',
          role: 'artist',
          email: 'new-artist@example.com'
        },
        201
      )
    );

    const router = createNyvoroMemoryRouter(['/en/register']);
    const { findByRole, findByLabelText, findByText, queryAllByRole } = render(
      <RouterProvider router={router} future={{ v7_startTransition: true }} />
    );

    expect(queryAllByRole('radio')).toHaveLength(0);

    fireEvent.change(await findByLabelText('Email'), {
      target: { value: 'new-artist@example.com' }
    });
    fireEvent.change(await findByLabelText('Password (minimum 12 characters)'), {
      target: { value: 'NewArtistStrongPass!2026' }
    });
    fireEvent.change(await findByLabelText('Confirm password'), {
      target: { value: 'NewArtistStrongPass!2026' }
    });

    fireEvent.click(await findByRole('button', { name: 'Create account' }));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/auth/register'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    const [, requestInit] = fetchSpy.mock.calls[0] ?? [];
    expect(requestInit && typeof requestInit === 'object' && 'body' in requestInit ? requestInit.body : '').toContain(
      '"role":"artist"'
    );
    expect(await findByText('Account created successfully. You can now sign in.')).toBeInTheDocument();
  });
});
