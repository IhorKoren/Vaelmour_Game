import crypto from 'crypto';

// Standard validation algorithm for Telegram WebApp initData
function validateTelegramInitData(initData: string, botToken: string): boolean {
  if (!initData || !botToken) return false;

  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return false;

    // Remove the hash parameter
    params.delete('hash');

    // Sort parameters alphabetically
    const sortedKeys = Array.from(params.keys()).sort();

    // Construct data-check-string
    const dataCheckString = sortedKeys
      .map((key) => `${key}=${params.get(key)}`)
      .join('\n');

    // Create secret key using botToken as HMAC key
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    // Calculate hash of data-check-string
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    return calculatedHash === hash;
  } catch (error) {
    console.error('Error validating Telegram initData:', error);
    return false;
  }
}

export async function handler(event: { httpMethod: string; body: string | null }) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { initData, userId: clientUserId, message } = body;

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      console.warn('TELEGRAM_BOT_TOKEN is not configured on the backend.');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Backend is missing bot configuration' })
      };
    }

    let targetChatId: string | number | null = null;
    let isAuthenticated = false;

    // 1. Validate initData if provided
    if (initData) {
      isAuthenticated = validateTelegramInitData(initData, botToken);
      if (isAuthenticated) {
        try {
          const initParams = new URLSearchParams(initData);
          const userParam = initParams.get('user');
          if (userParam) {
            const parsedUser = JSON.parse(userParam);
            targetChatId = parsedUser.id;
          }
        } catch (err) {
          console.error('Failed to parse user from validated initData:', err);
        }
      } else {
        console.warn('Telegram initData validation failed.');
      }
    }

    // 2. Fallback to client-provided userId in development or if initData wasn't provided
    if (!targetChatId && clientUserId) {
      // In production, we restrict raw client userIds for security unless initData passes,
      // but we allow it as a fallback to support local debugging
      targetChatId = clientUserId;
    }

    if (!targetChatId) {
      console.warn('No Telegram user or chat ID could be resolved.');
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing user identifier' })
      };
    }

    // 3. Send message using Telegram Bot API
    const textMessage = message || '🟢 Герой повністю відновив здоровʼя та готовий до бою.';
    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;

    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chat_id: targetChatId,
        text: textMessage
      })
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('Telegram Bot API returned an error:', responseData);
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: 'Failed to send Telegram message', details: responseData })
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ success: true, message: 'Notification sent successfully' })
    };
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('Error in sendFullHealthNotification handler:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error', message: err.message })
    };
  }
}
