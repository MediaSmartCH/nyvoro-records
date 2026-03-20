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

function fillContactForm(form: {
  getByLabelText: (label: string) => HTMLElement;
}) {
  fireEvent.change(form.getByLabelText('Full name'), { target: { value: 'Alex Rivera' } });
  fireEvent.change(form.getByLabelText('Email'), {
    target: { value: 'alex.rivera@example.com' }
  });
  fireEvent.change(form.getByLabelText('Subject'), { target: { value: 'Partnership request' } });
  fireEvent.change(form.getByLabelText('Message'), {
    target: {
      value:
        'Hello Nyvoro team, I would like to discuss a potential collaboration for an upcoming event.'
    }
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('contact page', () => {
  it('renders and submits the contact form successfully', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      buildJsonResponse(
        {
          status: 'ok',
          messageId: 'contact_msg_1'
        },
        201
      )
    );

    const router = createNyvoroMemoryRouter(['/en/contact']);
    const { findByRole, findByText, getByLabelText } = render(
      <RouterProvider router={router} future={{ v7_startTransition: true }} />
    );

    fillContactForm({ getByLabelText });

    const submitButton = await findByRole('button', { name: 'Send message' });
    await waitFor(() => {
      expect(submitButton).toBeEnabled();
    });
    fireEvent.click(submitButton);

    expect(await findByText('Message sent successfully.')).toBeInTheDocument();
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/contact-messages'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('shows a localized validation error when API rejects payload', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      buildJsonResponse(
        {
          status: 'error',
          code: 'validation_error'
        },
        400
      )
    );

    const router = createNyvoroMemoryRouter(['/en/contact']);
    const { findByRole, findByText, getByLabelText } = render(
      <RouterProvider router={router} future={{ v7_startTransition: true }} />
    );

    fillContactForm({ getByLabelText });

    const submitButton = await findByRole('button', { name: 'Send message' });
    await waitFor(() => {
      expect(submitButton).toBeEnabled();
    });
    fireEvent.click(submitButton);

    expect(await findByText('Please check your inputs and try again.')).toBeInTheDocument();
  });
});
