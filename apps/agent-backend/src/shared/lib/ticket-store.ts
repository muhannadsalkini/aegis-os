/**
 * ==========================================
 * One-Time WebSocket Ticket Store
 * ==========================================
 *
 * Implements the ticket-based WebSocket authentication pattern.
 *
 * Why tickets instead of JWT in the query string?
 * - Query strings appear in server logs, browser history, and proxy logs.
 * - A JWT in a URL is a credential leak waiting to happen.
 *
 * Flow:
 *   1. Client calls POST /voice/ticket with Authorization: Bearer <jwt>
 *   2. Server validates JWT (via JWKS) and issues a short-lived ticket UUID
 *   3. Client opens WebSocket with ?ticket=<uuid>
 *   4. Server calls consume() — ticket is deleted immediately (single-use)
 *   5. If ticket is missing, expired, or already used → close WS with 4401
 */

import { randomUUID } from 'crypto';

interface TicketData {
  userId: string;
  email?: string;
  expiresAt: number; // ms since epoch
}

const TICKET_TTL_MS = 30_000;       // 30 seconds
const PURGE_INTERVAL_MS = 60_000;   // purge expired tickets every 60 seconds

class TicketStore {
  private readonly store = new Map<string, TicketData>();
  private purgeTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Start background purge loop so the map doesn't grow unboundedly
    this.purgeTimer = setInterval(() => this.purgeExpired(), PURGE_INTERVAL_MS);

    // Allow Node to exit even if the interval is still running
    if (this.purgeTimer.unref) {
      this.purgeTimer.unref();
    }
  }

  /**
   * Create a new one-time ticket for the given user.
   * Returns the ticket string (a UUID v4).
   */
  create(userId: string, email?: string): string {
    const ticket = randomUUID();
    this.store.set(ticket, {
      userId,
      email,
      expiresAt: Date.now() + TICKET_TTL_MS,
    });
    return ticket;
  }

  /**
   * Consume a ticket — validates it and **immediately deletes** it.
   * Returns the ticket data on success, or null if invalid / expired.
   *
   * Single-use: calling consume() twice on the same ticket always returns
   * null on the second call, making replay attacks impossible.
   */
  consume(ticket: string): TicketData | null {
    const data = this.store.get(ticket);

    if (!data) return null;

    // Always delete first — prevents TOCTOU race conditions
    this.store.delete(ticket);

    if (Date.now() > data.expiresAt) return null;

    return data;
  }

  /** Remove all expired entries from the store. */
  private purgeExpired(): void {
    const now = Date.now();
    for (const [ticket, data] of this.store) {
      if (now > data.expiresAt) {
        this.store.delete(ticket);
      }
    }
  }

  /** Current number of live (possibly expired) tickets — useful for monitoring. */
  get size(): number {
    return this.store.size;
  }

  /** Tear down the background purge timer (call during graceful shutdown). */
  destroy(): void {
    if (this.purgeTimer !== null) {
      clearInterval(this.purgeTimer);
      this.purgeTimer = null;
    }
    this.store.clear();
  }
}

/**
 * Singleton instance — shared across the entire process.
 * Import `ticketStore` wherever you need to create or consume tickets.
 */
export const ticketStore = new TicketStore();
