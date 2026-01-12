/**
 * Rate Limiting Utility
 * Simple in-memory rate limiter for API routes
 */

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

// In-memory store (use Redis in production for multi-instance)
const rateLimitStore = new Map<string, RateLimitEntry>();

export interface RateLimitConfig {
    windowMs: number;      // Time window in milliseconds
    maxRequests: number;   // Max requests per window
}

// Default configs for different endpoints
export const RATE_LIMITS = {
    // Strict limit for expensive operations
    launch: { windowMs: 60000, maxRequests: 3 },      // 3 per minute
    shield: { windowMs: 60000, maxRequests: 5 },      // 5 per minute
    withdraw: { windowMs: 60000, maxRequests: 10 },   // 10 per minute

    // Moderate limit for funding
    fund: { windowMs: 60000, maxRequests: 10 },       // 10 per minute
    reclaim: { windowMs: 60000, maxRequests: 5 },     // 5 per minute

    // Relaxed limit for read operations
    balance: { windowMs: 10000, maxRequests: 20 },    // 20 per 10 seconds
    status: { windowMs: 10000, maxRequests: 30 },     // 30 per 10 seconds
} as const;

/**
 * Check if request should be rate limited
 * @returns { allowed: boolean, remaining: number, resetIn: number }
 */
export function checkRateLimit(
    identifier: string,
    config: RateLimitConfig
): { allowed: boolean; remaining: number; resetIn: number } {
    const now = Date.now();
    const key = identifier;

    const entry = rateLimitStore.get(key);

    // Clean up expired entries periodically
    if (Math.random() < 0.01) {
        cleanupExpiredEntries();
    }

    if (!entry || now > entry.resetTime) {
        // New window
        rateLimitStore.set(key, {
            count: 1,
            resetTime: now + config.windowMs,
        });
        return {
            allowed: true,
            remaining: config.maxRequests - 1,
            resetIn: config.windowMs,
        };
    }

    if (entry.count >= config.maxRequests) {
        // Rate limited
        return {
            allowed: false,
            remaining: 0,
            resetIn: entry.resetTime - now,
        };
    }

    // Increment count
    entry.count++;
    return {
        allowed: true,
        remaining: config.maxRequests - entry.count,
        resetIn: entry.resetTime - now,
    };
}

/**
 * Get client identifier from request
 */
export function getClientIdentifier(request: Request): string {
    // Try to get real IP from headers (behind proxy)
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }

    const realIp = request.headers.get('x-real-ip');
    if (realIp) {
        return realIp;
    }

    // Fallback
    return 'unknown';
}

/**
 * Create rate limit response with proper headers
 */
export function createRateLimitResponse(resetIn: number): Response {
    return new Response(
        JSON.stringify({
            error: 'Too many requests',
            message: 'Please wait before making another request',
            retryAfter: Math.ceil(resetIn / 1000),
        }),
        {
            status: 429,
            headers: {
                'Content-Type': 'application/json',
                'Retry-After': String(Math.ceil(resetIn / 1000)),
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': String(Date.now() + resetIn),
            },
        }
    );
}

/**
 * Add rate limit headers to response
 */
export function addRateLimitHeaders(
    response: Response,
    remaining: number,
    resetIn: number
): Response {
    const headers = new Headers(response.headers);
    headers.set('X-RateLimit-Remaining', String(remaining));
    headers.set('X-RateLimit-Reset', String(Date.now() + resetIn));

    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
    });
}

function cleanupExpiredEntries(): void {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
        if (now > entry.resetTime) {
            rateLimitStore.delete(key);
        }
    }
}
