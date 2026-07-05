import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createSupabaseClient, createAdminClient } from "../_shared/supabase-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Security headers
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

async function listMapel(supabaseClient: any) {
  const { data, error } = await supabaseClient
    .from("mata_pelajarans")
    .select("*")
    .is("deleted_at", null)
    .order("nama", { ascending: true });
  if (error) throw error;
  return data;
}

async function getMapel(supabaseClient: any, id: string) {
  if (!isValidUUID(id)) {
    throw new Error("Invalid mapel ID format");
  }
  
  const { data, error } = await supabaseClient
    .from("mata_pelajarans")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();
  if (error) throw error;
  return data;
}

async function createMapel(supabaseClient: any, body: any) {
  // Required fields validation
  if (!body.kode || !body.nama) {
    throw new Error("kode and nama are required");
  }
  
  // Validate kode length
  if (body.kode && body.kode.length > 20) {
    throw new Error("kode must be at most 20 characters");
  }
  
  // Validate nama length
  if (body.nama && body.nama.length > 100) {
    throw new Error("nama must be at most 100 characters");
  }
  
  // Validate kelompok
  if (body.kelompok && !['A', 'B', 'C', 'D'].includes(body.kelompok)) {
    throw new Error("kelompok must be A, B, C, or D");
  }
  
  // Validate aktif
  if (body.aktif !== undefined && typeof body.aktif !== 'boolean') {
    throw new Error("aktif must be boolean");
  }

  const { data, error } = await supabaseClient
    .from("mata_pelajarans")
    .insert([{
      kode: body.kode,
      nama: body.nama,
      kelompok: body.kelompok,
      deskripsi: body.deskripsi,
      aktif: body.aktif ?? true
    }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function updateMapel(supabaseClient: any, id: string, body: any) {
  if (!isValidUUID(id)) {
    throw new Error("Invalid mapel ID format");
  }
  
  // Validate kelompok
  if (body.kelompok && !['A', 'B', 'C', 'D'].includes(body.kelompok)) {
    throw new Error("kelompok must be A, B, C, or D");
  }
  
  // Build update object
  const updateData: any = {};
  const fields = ['kode', 'nama', 'kelompok', 'deskripsi', 'aktif'];
  fields.forEach(field => {
    if (body[field] !== undefined) {
      updateData[field] = body[field];
    }
  });

  const { data, error } = await supabaseClient
    .from("mata_pelajarans")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function deleteMapel(supabaseClient: any, id: string, authUid: string) {
  if (!isValidUUID(id)) {
    throw new Error("Invalid mapel ID format");
  }
  
  const { data, error } = await supabaseClient
    .from("mata_pelajarans")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: authUid
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function getByKelompok(supabaseClient: any, kelompok: string) {
  // Validate kelompok
  if (!['A', 'B', 'C', 'D'].includes(kelompok)) {
    throw new Error("kelompok must be A, B, C, or D");
  }
  
  const { data, error } = await supabaseClient
    .from("mata_pelajarans")
    .select("*")
    .eq("kelompok", kelompok)
    .is("deleted_at", null)
    .order("nama", { ascending: true });
  if (error) throw error;
  return data;
}

// Authentication helper (uses admin client)
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

    const supabaseClient = createSupabaseClient(req);

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const method = req.method;

    // Auth check for write operations
    let user: any = null;
    const isWriteOperation = method === "POST" || method === "PUT" || method === "DELETE";
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

    let result;

    // GET/POST /mapel-api (RLS-aware)
    if (pathParts.length === 1 && pathParts[0] === "mapel-api") {
      if (method === "GET") {
        const kelompok = url.searchParams.get("kelompok");
        if (kelompok) {
          result = await getByKelompok(supabaseClient, kelompok);
        } else {
          result = await listMapel(supabaseClient);
        }
      } else if (method === "POST") {
        const body = await req.json();
        result = await createMapel(supabaseClient, body);
      } else {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
          status: 405,
          headers: { ...corsHeaders, ...securityHeaders, "Content-Type": "application/json" },
        });
      }
    }
    // GET/PUT/DELETE /mapel-api/:id
    else if (pathParts.length === 2 && pathParts[0] === "mapel-api") {
      const id = pathParts[1];
      if (method === "GET") {
        result = await getMapel(supabaseClient, id);
      } else if (method === "PUT") {
        const body = await req.json();
        result = await updateMapel(supabaseClient, id, body);
      } else if (method === "DELETE") {
        result = await deleteMapel(supabaseClient, id, user.id);
      } else {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
          status: 405,
          headers: { ...corsHeaders, ...securityHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
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
