import type {
  AdminCatalogArtist,
  AdminCatalogRelease,
  AdminCatalogSnapshot
} from '@nyvoro/shared-types';
import { buildApiUrl } from './auth-api';

type ApiBody = {
  status?: string;
  code?: string;
  message?: string;
  [key: string]: unknown;
};

type ApiResponse<TBody extends ApiBody> = {
  ok: boolean;
  status: number;
  body: TBody;
};

type AdminCatalogBody = ApiBody & {
  artists?: AdminCatalogArtist[];
  releases?: AdminCatalogRelease[];
};

async function parseResponseBody(response: Response): Promise<ApiBody> {
  return response.json().catch(() => ({}));
}

function buildNetworkErrorResponse<TBody extends ApiBody>(body: TBody): ApiResponse<TBody> {
  return {
    ok: false,
    status: 0,
    body
  };
}

export async function fetchAdminCatalog(): Promise<ApiResponse<AdminCatalogBody>> {
  let response: Response;

  try {
    response = await fetch(buildApiUrl('/api/v1/admin/catalog'), {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json'
      }
    });
  } catch {
    return buildNetworkErrorResponse({
      status: 'error',
      code: 'network_error',
      message: 'Network request failed.'
    });
  }

  const body = (await parseResponseBody(response)) as AdminCatalogBody;

  return {
    ok: response.ok,
    status: response.status,
    body
  };
}

export async function saveAdminCatalog(
  values: AdminCatalogSnapshot
): Promise<ApiResponse<AdminCatalogBody>> {
  let response: Response;

  try {
    response = await fetch(buildApiUrl('/api/v1/admin/catalog'), {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(values)
    });
  } catch {
    return buildNetworkErrorResponse({
      status: 'error',
      code: 'network_error',
      message: 'Network request failed.'
    });
  }

  const body = (await parseResponseBody(response)) as AdminCatalogBody;

  return {
    ok: response.ok,
    status: response.status,
    body
  };
}
