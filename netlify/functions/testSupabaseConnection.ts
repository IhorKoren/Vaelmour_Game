import { createClient } from '@supabase/supabase-js';

type NetlifyEvent = {
  httpMethod: string;
};

export async function handler(event: NetlifyEvent) {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: 'Missing Supabase environment variables',
        hasSupabaseUrl: Boolean(supabaseUrl),
        hasServiceRoleKey: Boolean(serviceRoleKey),
      }),
    };
  }

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data, error } = await supabase
      .from('players')
      .select('id, telegram_user_id, created_at')
      .limit(1);

    if (error) {
      console.error('[Supabase Test] Query failed:', error);

      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          error: 'Supabase query failed',
          details: error.message,
        }),
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        message: 'Supabase connection works',
        playersTableAccessible: true,
        sampleRows: data,
      }),
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));

    console.error('[Supabase Test] Unexpected error:', err);

    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: 'Unexpected error',
        message: err.message,
      }),
    };
  }
}
