// Security utilities for SIKAD v4.0
// Rate limiting and RLS helpers

// Simple in-memory rate limiter
// For production, use Redis or Supabase's built-in rate limiting
class RateLimiter {
  private requests: Map<string, { count: number; resetTime: number }> = new Map();
  
  constructor(
    private maxRequests: number = 100,
    private windowMs: number = 60000 // 1 minute
  ) {}
  
  check(clientId: string): { allowed: boolean; remaining: number; resetIn: number } {
    const now = Date.now();
    const record = this.requests.get(clientId);
    
    // Clean up expired records
    if (record && now > record.resetTime) {
      this.requests.delete(clientId);
    }
    
    const current = this.requests.get(clientId);
    
    if (!current) {
      this.requests.set(clientId, { count: 1, resetTime: now + this.windowMs });
      return { allowed: true, remaining: this.maxRequests - 1, resetIn: this.windowMs };
    }
    
    if (current.count >= this.maxRequests) {
      return { 
        allowed: false, 
        remaining: 0, 
        resetIn: Math.ceil((current.resetTime - now) / 1000) 
      };
    }
    
    current.count++;
    return { 
      allowed: true, 
      remaining: this.maxRequests - current.count, 
      resetIn: Math.ceil((current.resetTime - now) / 1000) 
    };
  }
  
  // Get client identifier from request
  getClientId(req: Request): string {
    // Try to get user ID from auth header
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      // Use token hash as identifier
      return `auth_${this.hashString(authHeader)}`;
    }
    
    // Fallback to IP
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
    return `ip_${ip}`;
  }
  
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
}

// Default rate limiter instances
export const defaultRateLimiter = new RateLimiter(100, 60000); // 100 req/min
export const strictRateLimiter = new RateLimiter(10, 60000);  // 10 req/min for sensitive ops

// Check rate limit and return response if exceeded
export function checkRateLimit(
  req: Request, 
  limiter: RateLimiter = defaultRateLimiter
): Response | null {
  const clientId = limiter.getClientId(req);
  const result = limiter.check(clientId);
  
  if (!result.allowed) {
    return new Response(JSON.stringify({
      error: "Rate limit exceeded",
      retryAfter: result.resetIn
    }), {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": result.resetIn.toString(),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": result.resetIn.toString()
      }
    });
  }
  
  return null;
}

// User roles
export enum UserRole {
  ADMIN = "ADMIN",
  GURU = "GURU",
  WALI_KELAS = "WALI_KELAS",
  SISWA = "SISWA",
  ORANG_TUA = "ORANG_TUA"
}

// Permission definitions
export const PERMISSIONS = {
  // Guru operations
  "guru:create": [UserRole.ADMIN],
  "guru:read": [UserRole.ADMIN, UserRole.GURU],
  "guru:update": [UserRole.ADMIN],
  "guru:delete": [UserRole.ADMIN],
  
  // Siswa operations
  "siswa:create": [UserRole.ADMIN, UserRole.GURU],
  "siswa:read": [UserRole.ADMIN, UserRole.GURU, UserRole.WALI_KELAS, UserRole.ORANG_TUA],
  "siswa:update": [UserRole.ADMIN, UserRole.GURU],
  "siswa:delete": [UserRole.ADMIN],
  
  // Assessment operations
  "assessment:create": [UserRole.ADMIN, UserRole.GURU],
  "assessment:read": [UserRole.ADMIN, UserRole.GURU, UserRole.SISWA, UserRole.ORANG_TUA],
  "assessment:update": [UserRole.ADMIN, UserRole.GURU],
  "assessment:publish": [UserRole.ADMIN, UserRole.GURU],
  "assessment:delete": [UserRole.ADMIN],
  
  // Attendance operations
  "attendance:create": [UserRole.ADMIN, UserRole.GURU],
  "attendance:read": [UserRole.ADMIN, UserRole.GURU, UserRole.WALI_KELAS, UserRole.SISWA, UserRole.ORANG_TUA],
  "attendance:update": [UserRole.ADMIN, UserRole.GURU],
  
  // Rapor operations
  "rapor:read": [UserRole.ADMIN, UserRole.GURU, UserRole.WALI_KELAS, UserRole.SISWA, UserRole.ORANG_TUA],
  "rapor:write": [UserRole.ADMIN, UserRole.GURU, UserRole.WALI_KELAS]
};

// Check if user has permission
export function hasPermission(userRole: UserRole, permission: string): boolean {
  const allowedRoles = PERMISSIONS[permission as keyof typeof PERMISSIONS];
  if (!allowedRoles) return false;
  return allowedRoles.includes(userRole);
}

// Get user role from JWT token (simplified - in production, decode JWT properly)
export function getUserRoleFromToken(user: any): UserRole {
  // In a real implementation, you'd decode the JWT and extract the role claim
  // For now, we'll assume the role is stored in user metadata
  const role = user?.user_metadata?.role || user?.role || UserRole.GURU;
  
  if (Object.values(UserRole).includes(role as UserRole)) {
    return role as UserRole;
  }
  
  return UserRole.GURU; // Default role
}

// Create unauthorized response
export function unauthorizedResponse(message: string = "Unauthorized"): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 401,
    headers: { "Content-Type": "application/json" }
  });
}

// Create forbidden response
export function forbiddenResponse(message: string = "Forbidden"): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 403,
    headers: { "Content-Type": "application/json" }
  });
}

// Create bad request response
export function badRequestResponse(message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 400,
    headers: { "Content-Type": "application/json" }
  });
}

// Validate request body is JSON
export async function parseRequestBody<T>(req: Request): Promise<T> {
  try {
    return await req.json();
  } catch {
    throw new Error("Invalid JSON body");
  }
}

// Security headers to add to all responses
export const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Referrer-Policy": "strict-origin-when-cross-origin"
};

// Add security headers to response
export function addSecurityHeaders(response: Response): Response {
  const newHeaders = new Headers(response.headers);
  for (const [key, value] of Object.entries(securityHeaders)) {
    newHeaders.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  });
}
