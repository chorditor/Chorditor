// ───────────────────────────────────────────────────────────
// send-push : FCM v1 로 단일 토큰에 푸시 발송 (테스트/수동 발송용)
//   입력(POST JSON): { token, title, body, data? }
//   배포:  supabase functions deploy send-push --no-verify-jwt
//   시크릿: supabase secrets set FIREBASE_SERVICE_ACCOUNT="$(cat service-account.json)"
// ───────────────────────────────────────────────────────────

import { loadServiceAccount, getAccessToken, fcmSend } from '../_shared/fcm.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('POST only', { status: 405 });
  try {
    const { token, title, body, data } = await req.json();
    if (!token || !title) {
      return new Response(JSON.stringify({ error: 'token, title required' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }
    const sa = loadServiceAccount();
    const accessToken = await getAccessToken(sa);
    const result = await fcmSend(sa, accessToken, token, title, body || '', data || {});
    return new Response(JSON.stringify(result), {
      status: result.ok ? 200 : 502,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
});
