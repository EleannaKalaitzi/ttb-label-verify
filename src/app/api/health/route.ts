/**
 * Health check — used by Railway's healthcheck and by an external keep-alive
 * ping (~every 8 min) that resets the App-Sleeping timer, so the first real
 * request never pays a cold-start penalty (which would violate the 5s budget).
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json({
    status: 'ok',
    mode: process.env.MOCK_EXTRACTION === '1' ? 'mock' : 'live',
    time: new Date().toISOString(),
  });
}
