import { NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();
  const checks: Record<string, any> = {
    supabaseConfigured: isSupabaseConfigured(),
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes('your_')),
    database: { status: 'unknown', latencyMs: 0 },
    storage: { status: 'unknown' },
  };

  let overallStatus = 'healthy';

  // 1. Check Supabase Database Connectivity & Latency
  if (checks.supabaseConfigured) {
    const dbStart = Date.now();
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true });

      const dbLatency = Date.now() - dbStart;
      if (error && !error.message.includes('permission')) {
        checks.database = { status: 'degraded', error: error.message, latencyMs: dbLatency };
        overallStatus = 'degraded';
      } else {
        checks.database = { status: 'ok', latencyMs: dbLatency };
      }
    } catch (dbErr: any) {
      checks.database = { status: 'unreachable', error: dbErr.message, latencyMs: Date.now() - dbStart };
      overallStatus = 'degraded';
    }
  } else {
    checks.database = { status: 'not_configured' };
    overallStatus = 'demo_mode';
  }

  // 2. Check Storage Service
  if (checks.supabaseConfigured) {
    try {
      const supabase = getSupabaseClient();
      const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
      if (!bucketError && Array.isArray(buckets)) {
        checks.storage = { status: 'ok', bucketsCount: buckets.length };
      } else {
        checks.storage = { status: 'restricted', note: bucketError?.message || 'listBuckets restricted' };
      }
    } catch (stErr: any) {
      checks.storage = { status: 'unreachable', error: stErr.message };
    }
  }

  const totalLatencyMs = Date.now() - startTime;
  const memory = process.memoryUsage();

  return NextResponse.json(
    {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      totalLatencyMs,
      checks,
      system: {
        nodeVersion: process.version,
        memoryUsageMb: {
          rss: Math.round(memory.rss / (1024 * 1024)),
          heapUsed: Math.round(memory.heapUsed / (1024 * 1024)),
          heapTotal: Math.round(memory.heapTotal / (1024 * 1024)),
        },
      },
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        Pragma: 'no-cache',
      },
    }
  );
}

