/**
 * Input Validation Utilities
 * Validates and sanitizes user inputs for security
 */

import { PublicKey } from '@solana/web3.js';

// Validation result type
export interface ValidationResult {
    valid: boolean;
    error?: string;
    sanitized?: unknown;
}

/**
 * Validate Solana public key
 */
export function validatePublicKey(input: unknown): ValidationResult {
    if (typeof input !== 'string') {
        return { valid: false, error: 'Public key must be a string' };
    }

    const trimmed = input.trim();

    if (trimmed.length < 32 || trimmed.length > 44) {
        return { valid: false, error: 'Invalid public key length' };
    }

    try {
        const pubkey = new PublicKey(trimmed);
        return { valid: true, sanitized: pubkey.toBase58() };
    } catch {
        return { valid: false, error: 'Invalid public key format' };
    }
}

/**
 * Validate SOL amount
 */
export function validateSolAmount(
    input: unknown,
    min: number = 0.001,
    max: number = 1000
): ValidationResult {
    if (typeof input !== 'number' && typeof input !== 'string') {
        return { valid: false, error: 'Amount must be a number' };
    }

    const amount = typeof input === 'string' ? parseFloat(input) : input;

    if (isNaN(amount)) {
        return { valid: false, error: 'Invalid amount format' };
    }

    if (amount < min) {
        return { valid: false, error: `Amount must be at least ${min} SOL` };
    }

    if (amount > max) {
        return { valid: false, error: `Amount cannot exceed ${max} SOL` };
    }

    // Round to 9 decimal places (Solana precision)
    const sanitized = Math.round(amount * 1e9) / 1e9;
    return { valid: true, sanitized };
}

/**
 * Validate wallet count
 */
export function validateWalletCount(
    input: unknown,
    min: number = 1,
    max: number = 50
): ValidationResult {
    if (typeof input !== 'number' && typeof input !== 'string') {
        return { valid: false, error: 'Wallet count must be a number' };
    }

    const count = typeof input === 'string' ? parseInt(input, 10) : input;

    if (isNaN(count) || !Number.isInteger(count)) {
        return { valid: false, error: 'Wallet count must be an integer' };
    }

    if (count < min) {
        return { valid: false, error: `Minimum ${min} wallet(s) required` };
    }

    if (count > max) {
        return { valid: false, error: `Maximum ${max} wallets allowed` };
    }

    return { valid: true, sanitized: count };
}

/**
 * Validate token name
 */
export function validateTokenName(input: unknown): ValidationResult {
    if (typeof input !== 'string') {
        return { valid: false, error: 'Token name must be a string' };
    }

    const trimmed = input.trim();

    if (trimmed.length < 1) {
        return { valid: false, error: 'Token name is required' };
    }

    if (trimmed.length > 32) {
        return { valid: false, error: 'Token name cannot exceed 32 characters' };
    }

    // Only allow alphanumeric, spaces, and common symbols
    if (!/^[a-zA-Z0-9\s\-_\.]+$/.test(trimmed)) {
        return { valid: false, error: 'Token name contains invalid characters' };
    }

    return { valid: true, sanitized: trimmed };
}

/**
 * Validate token symbol
 */
export function validateTokenSymbol(input: unknown): ValidationResult {
    if (typeof input !== 'string') {
        return { valid: false, error: 'Token symbol must be a string' };
    }

    const trimmed = input.trim().toUpperCase();

    if (trimmed.length < 1) {
        return { valid: false, error: 'Token symbol is required' };
    }

    if (trimmed.length > 10) {
        return { valid: false, error: 'Token symbol cannot exceed 10 characters' };
    }

    // Only allow alphanumeric
    if (!/^[A-Z0-9]+$/.test(trimmed)) {
        return { valid: false, error: 'Token symbol must be alphanumeric' };
    }

    return { valid: true, sanitized: trimmed };
}

/**
 * Validate URL
 */
export function validateUrl(input: unknown, required: boolean = false): ValidationResult {
    if (input === undefined || input === null || input === '') {
        if (required) {
            return { valid: false, error: 'URL is required' };
        }
        return { valid: true, sanitized: '' };
    }

    if (typeof input !== 'string') {
        return { valid: false, error: 'URL must be a string' };
    }

    const trimmed = input.trim();

    if (trimmed.length > 500) {
        return { valid: false, error: 'URL is too long' };
    }

    try {
        const url = new URL(trimmed);
        if (!['http:', 'https:'].includes(url.protocol)) {
            return { valid: false, error: 'URL must use http or https' };
        }
        return { valid: true, sanitized: trimmed };
    } catch {
        return { valid: false, error: 'Invalid URL format' };
    }
}

/**
 * Validate slippage percentage
 */
export function validateSlippage(
    input: unknown,
    min: number = 0.1,
    max: number = 50
): ValidationResult {
    if (typeof input !== 'number' && typeof input !== 'string') {
        return { valid: false, error: 'Slippage must be a number' };
    }

    const slippage = typeof input === 'string' ? parseFloat(input) : input;

    if (isNaN(slippage)) {
        return { valid: false, error: 'Invalid slippage format' };
    }

    if (slippage < min) {
        return { valid: false, error: `Slippage must be at least ${min}%` };
    }

    if (slippage > max) {
        return { valid: false, error: `Slippage cannot exceed ${max}%` };
    }

    return { valid: true, sanitized: slippage };
}

/**
 * Validate burner wallet array
 */
export function validateBurnerWallets(input: unknown): ValidationResult {
    if (!Array.isArray(input)) {
        return { valid: false, error: 'Wallets must be an array' };
    }

    if (input.length === 0) {
        return { valid: false, error: 'At least one wallet is required' };
    }

    if (input.length > 50) {
        return { valid: false, error: 'Maximum 50 wallets allowed' };
    }

    const sanitized = [];
    for (let i = 0; i < input.length; i++) {
        const wallet = input[i];

        if (!wallet || typeof wallet !== 'object') {
            return { valid: false, error: `Invalid wallet at index ${i}` };
        }

        // Validate public key
        const pkResult = validatePublicKey(wallet.publicKey);
        if (!pkResult.valid) {
            return { valid: false, error: `Wallet ${i}: ${pkResult.error}` };
        }

        // Validate secret key exists and is proper format
        if (!wallet.secretKey) {
            return { valid: false, error: `Wallet ${i}: Missing secret key` };
        }

        sanitized.push({
            publicKey: pkResult.sanitized,
            secretKey: wallet.secretKey,
            index: i,
        });
    }

    return { valid: true, sanitized };
}

/**
 * Validate privacy method
 */
export function validatePrivacyMethod(input: unknown): ValidationResult {
    const validMethods = ['none', 'privacy-cash', 'shadowwire'];

    if (typeof input !== 'string') {
        return { valid: false, error: 'Privacy method must be a string' };
    }

    const trimmed = input.trim().toLowerCase();

    if (!validMethods.includes(trimmed)) {
        return { valid: false, error: `Invalid privacy method. Must be one of: ${validMethods.join(', ')}` };
    }

    return { valid: true, sanitized: trimmed };
}

/**
 * Create validation error response
 */
export function createValidationErrorResponse(error: string): Response {
    return new Response(
        JSON.stringify({
            error: 'Validation Error',
            message: error,
        }),
        {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        }
    );
}
