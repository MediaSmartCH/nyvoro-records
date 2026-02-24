type TurnstileVerificationResult = {
  success: boolean;
  errors: string[];
};

export async function verifyTurnstileToken(input: {
  token: string;
  secretKey: string;
  verificationUrl: string;
  ipAddress?: string;
  bypass?: boolean;
}): Promise<TurnstileVerificationResult> {
  const { token, secretKey, verificationUrl, ipAddress, bypass } = input;

  if (bypass) {
    return { success: true, errors: [] };
  }

  const payload = new URLSearchParams({
    secret: secretKey,
    response: token,
    remoteip: ipAddress ?? ''
  });

  const response = await fetch(verificationUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: payload
  });

  if (!response.ok) {
    return {
      success: false,
      errors: [`verification_http_${response.status}`]
    };
  }

  const responseJson = (await response.json()) as {
    success?: boolean;
    'error-codes'?: string[];
  };

  return {
    success: Boolean(responseJson.success),
    errors: responseJson['error-codes'] ?? []
  };
}
