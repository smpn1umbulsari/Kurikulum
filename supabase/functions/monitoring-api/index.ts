import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createSupabaseClient, createAdminClient } from "../_shared/supabase-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
};

// Rate limiter
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 100;
const RATE_WINDOW = 60000;

function checkRateLimit(clientId: string): { allowed: boolean; resetIn: number } {
  const now = Date.now();
  const record = rateLimitMap.get(clientId);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(clientId, { count: 1, resetTime: now + RATE_WINDOW });
    return { allowed: true, resetIn: 0 };
  }
  
  if (record.count >= RATE_LIMIT) {
    return { allowed: false, resetIn: Math.ceil((record.resetTime - now) / 1000) };
  }
  
  record.count++;
  return { allowed: true, resetIn: 0 };
}

function getClientId(req: Request): string {
  const authHeader = req.headers.get("Authorization");
  if (authHeader) return `auth_${authHeader.slice(-20)}`;
  return `ip_${req.headers.get("x-forwarded-for") || "unknown"}`;
}

// UUID validation
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function isValidUUID(id: string): boolean {
  return uuidRegex.test(id);
}

// Authentication helper (uses admin client for auth check)
async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    throw new Error("Unauthorized: No authorization header");
  }
  const token = authHeader.replace("Bearer ", "");
  const supabaseClient = createAdminClient();
  const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
  if (authError || !user) {
    throw new Error("Unauthorized: Invalid token");
  }
  return user;
}

// Get system health summary
async function getSystemHealth(supabaseClient: any) {
  // Get sync queue stats
  const { data: syncStats } = await supabaseClient
    .from("sync_queue")
    .select("status");

  const syncSummary = {
    total: (syncStats || []).length,
    pending: (syncStats || []).filter((s: any) => s.status === "PENDING").length,
    processing: (syncStats || []).filter((s: any) => s.status === "PROCESSING").length,
    failed: (syncStats || []).filter((s: any) => s.status === "FAILED").length,
    completed: (syncStats || []).filter((s: any) => s.status === "COMPLETED").length,
  };

  // Get conflict queue stats
  const { data: conflictStats } = await supabaseClient
    .from("conflict_queue")
    .select("resolved");

  const conflictSummary = {
    total: (conflictStats || []).length,
    unresolved: (conflictStats || []).filter((c: any) => !c.resolved).length,
    resolved: (conflictStats || []).filter((c: any) => c.resolved).length,
  };

  // Get device health stats
  const { data: deviceStats } = await supabaseClient
    .from("device_health")
    .select("status");

  const deviceSummary = {
    total: (deviceStats || []).length,
    healthy: (deviceStats || []).filter((d: any) => d.status === "HEALTHY").length,
    warning: (deviceStats || []).filter((d: any) => d.status === "WARNING").length,
    offline: (deviceStats || []).filter((d: any) => d.status === "OFFLINE").length,
  };

  // FIX: Database size estimate with try-catch (pg_database access restricted via API)
  let dbStats: any = null;
  try {
    const { data } = await supabaseClient
      .from("pg_database")
      .select("datname, pg_size_pretty(pg_database_size(datname))")
      .eq("datname", "postgres")
      .single();
    dbStats = data;
  } catch (e: any) {
    // pg_catalog access is restricted via PostgREST API
    // Return fallback info instead of crashing
    console.warn("System catalog access restricted:", e.message);
    dbStats = { 
      status: "RESTRICTED", 
      message: "Catalog access not allowed via API",
      note: "Use Supabase dashboard for database size metrics"
    };
  }

  return {
    timestamp: new Date().toISOString(),
    sync_queue: syncSummary,
    conflict_queue: conflictSummary,
    devices: deviceSummary,
    database: dbStats,
  };
}

// Get sync queue status
async function getSyncQueue(supabaseClient: any, params: URLSearchParams) {
  const page = parseInt(params.get("page") || "1");
  const limit = Math.min(parseInt(params.get("limit") || "20"), 100);
  const status = params.get("status");
  const offset = (page - 1) * limit;

  let query = supabaseClient
    .from("sync_queue")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    queue: data,
    pagination: {
      page,
      limit,
      total: count,
      total_pages: Math.ceil((count || 0) / limit),
    },
  };
}

// Get conflict queue
async function getConflictQueue(supabaseClient: any, params: URLSearchParams) {
  const page = parseInt(params.get("page") || "1");
  const limit = Math.min(parseInt(params.get("limit") || "20"), 100);
  const resolved = params.get("resolved");
  const offset = (page - 1) * limit;

  let query = supabaseClient
    .from("conflict_queue")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (resolved === "true") {
    query = query.eq("resolved", true);
  } else if (resolved === "false") {
    query = query.eq("resolved", false);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    conflicts: data,
    pagination: {
      page,
      limit,
      total: count,
      total_pages: Math.ceil((count || 0) / limit),
    },
  };
}

// Resolve conflict
async function resolveConflict(
  supabaseClient: any,
  conflictId: string,
  resolution: "local" | "cloud" | "merge",
  userId: string
) {
  if (!isValidUUID(conflictId)) {
    throw new Error("Invalid conflict_id format");
  }

  // Get conflict details
  const { data: conflict, error: conflictError } = await supabaseClient
    .from("conflict_queue")
    .select("*")
    .eq("id", conflictId)
    .single();
  
  if (conflictError) throw conflictError;

  if (conflict.resolved) {
    throw new Error("Conflict already resolved");
  }

  // Apply resolution
  try {
    let resolvedData: any;
    
    if (resolution === "local") {
      resolvedData = conflict.local_data;
    } else if (resolution === "cloud") {
      resolvedData = conflict.cloud_data;
    } else {
      // Merge - use cloud as base, merge local overrides
      resolvedData = { ...conflict.cloud_data, ...conflict.local_data };
    }

    // Update the actual record
    const { error: updateError } = await supabaseClient
      .from(conflict.table_name)
      .update(resolvedData)
      .eq("id", conflict.record_id);

    if (updateError) throw updateError;

    // Mark conflict as resolved
    const { error: resolveError } = await supabaseClient
      .from("conflict_queue")
      .update({
        resolved: true,
        resolved_by: userId,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", conflictId);

    if (resolveError) throw resolveError;

    return {
      conflict_id: conflictId,
      resolution,
      status: "RESOLVED",
      applied_data: resolvedData,
    };
  } catch (err: any) {
    throw new Error("Failed to resolve conflict: " + err.message);
  }
}

// Get device health list
async function getDeviceHealth(supabaseClient: any, params: URLSearchParams) {
  const page = parseInt(params.get("page") || "1");
  const limit = Math.min(parseInt(params.get("limit") || "20"), 100);
  const status = params.get("status");
  const offset = (page - 1) * limit;

  let query = supabaseClient
    .from("device_health")
    .select(`
      *,
      user:users(id, email)
    `, { count: "exact" })
    .order("last_sync_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    devices: data,
    pagination: {
      page,
      limit,
      total: count,
      total_pages: Math.ceil((count || 0) / limit),
    },
  };
}

// Update device health
async function updateDeviceHealth(
  supabaseClient: any,
  deviceId: string,
  healthData: any,
  userId: string
) {
  // Check if device exists
  const { data: existing } = await supabaseClient
    .from("device_health")
    .select("id")
    .eq("device_id", deviceId)
    .single();

  if (existing) {
    // Update
    const { data, error } = await supabaseClient
      .from("device_health")
      .update({
        ...healthData,
        last_sync_at: new Date().toISOString(),
      })
      .eq("device_id", deviceId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } else {
    // Create new
    const { data, error } = await supabaseClient
      .from("device_health")
      .insert({
        user_id: userId,
        device_id: deviceId,
        ...healthData,
        status: "HEALTHY",
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
}

// Get sync logs
async function getSyncLogs(supabaseClient: any, params: URLSearchParams) {
  const page = parseInt(params.get("page") || "1");
  const limit = Math.min(parseInt(params.get("limit") || "50"), 100);
  const tableName = params.get("table_name");
  const offset = (page - 1) * limit;

  let query = supabaseClient
    .from("sync_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (tableName) {
    query = query.eq("table_name", tableName);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    logs: data,
    pagination: {
      page,
      limit,
      total: count,
      total_pages: Math.ceil((count || 0) / limit),
    },
  };
}

// Retry failed sync items
async function retryFailedSync(supabaseClient: any) {
  // Get all failed items
  const { data: failedItems, error: fetchError } = await supabaseClient
    .from("sync_queue")
    .select("*")
    .eq("status", "FAILED")
    .lt("retry_count", 3);

  if (fetchError) throw fetchError;

  const retried: any[] = [];
  
  for (const item of failedItems || []) {
    try {
      // Reset status to PENDING
      await supabaseClient
        .from("sync_queue")
        .update({
          status: "PENDING",
          retry_count: item.retry_count + 1,
          last_error: null,
          next_retry_at: null,
        })
        .eq("id", item.id);

      retried.push({ id: item.id, status: "QUEUED" });
    } catch (err: any) {
      retried.push({ id: item.id, status: "FAILED", error: err.message });
    }
  }

  return {
    total_failed: (failedItems || []).length,
    retried: retried.length,
    items: retried,
  };
}

// HTTP Handler
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { ...corsHeaders, ...securityHeaders } });
  }

  try {
    // Rate limiting
    const clientId = getClientId(req);
    const rateCheck = checkRateLimit(clientId);
    if (!rateCheck.allowed) {
      return new Response(JSON.stringify({ 
        error: "Rate limit exceeded",
        retryAfter: rateCheck.resetIn
      }), {
        status: 429,
        headers: { 
          ...corsHeaders, 
          ...securityHeaders,
          "Content-Type": "application/json",
          "Retry-After": rateCheck.resetIn.toString()
        },
      });
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const method = req.method;
    
    // Use appropriate client based on operation type
    const isWriteOperation = method === "POST" || method === "PUT" || method === "DELETE";
    
    // Auth check for write operations
    let user: any = null;
    if (isWriteOperation) {
      try {
        user = await getAuthenticatedUser(req);
      } catch (authError: any) {
        return new Response(JSON.stringify({ error: authError.message }), {
          status: 401,
          headers: { ...corsHeaders, ...securityHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Write operations use admin client (monitoring admin actions need bypass RLS)
    // Read operations use user client (RLS-aware)
    const supabaseClient = isWriteOperation 
      ? createAdminClient() 
      : createSupabaseClient(req);

    let result: any;

    // Routes
    // GET /monitoring-api/health - System health (RLS-aware)
    if (pathParts.length === 2 && pathParts[0] === "monitoring-api" && pathParts[1] === "health" && method === "GET") {
      result = await getSystemHealth(supabaseClient);
    }
    // GET /monitoring-api/sync - Sync queue status
    else if (pathParts.length === 2 && pathParts[0] === "monitoring-api" && pathParts[1] === "sync" && method === "GET") {
      result = await getSyncQueue(supabaseClient, url.searchParams);
    }
    // POST /monitoring-api/sync/retry - Retry failed sync
    else if (pathParts.length === 3 && pathParts[0] === "monitoring-api" && pathParts[1] === "sync" && pathParts[2] === "retry" && method === "POST") {
      result = await retryFailedSync(supabaseClient);
    }
    // GET /monitoring-api/conflicts - Conflict queue
    else if (pathParts.length === 2 && pathParts[0] === "monitoring-api" && pathParts[1] === "conflicts" && method === "GET") {
      result = await getConflictQueue(supabaseClient, url.searchParams);
    }
    // POST /monitoring-api/conflicts/{id}/resolve - Resolve conflict
    else if (pathParts.length === 4 && pathParts[0] === "monitoring-api" && pathParts[1] === "conflicts" && pathParts[3] === "resolve" && method === "POST") {
      const conflictId = pathParts[2];
      const body = await req.json();
      result = await resolveConflict(supabaseClient, conflictId, body.resolution, user.id);
    }
    // GET /monitoring-api/devices - Device health list
    else if (pathParts.length === 2 && pathParts[0] === "monitoring-api" && pathParts[1] === "devices" && method === "GET") {
      result = await getDeviceHealth(supabaseClient, url.searchParams);
    }
    // POST /monitoring-api/devices - Update device health
    else if (pathParts.length === 2 && pathParts[0] === "monitoring-api" && pathParts[1] === "devices" && method === "POST") {
      const body = await req.json();
      result = await updateDeviceHealth(supabaseClient, body.device_id, body, user.id);
    }
    // GET /monitoring-api/logs - Sync logs
    else if (pathParts.length === 2 && pathParts[0] === "monitoring-api" && pathParts[1] === "logs" && method === "GET") {
      result = await getSyncLogs(supabaseClient, url.searchParams);
    }
    else {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { ...corsHeaders, ...securityHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ data: result }), {
      status: 200,
      headers: { ...corsHeaders, ...securityHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, ...securityHeaders, "Content-Type": "application/json" },
    });
  }
});
