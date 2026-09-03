import type { Server, AuthUser } from '../types';

/**
 * Soft UI check for operator access to a server.
 * The backend already scopes list/detail endpoints for OPERATOR;
 * this mirrors assignment fields for client-side empty/restricted states.
 */
export function isServerAssignedToUser(
  server: {
    id: string;
    owner?: string;
    operatorEmail?: string | null;
    operatorUserId?: string | null;
    parentServerId?: string | null;
  } | null | undefined,
  user: AuthUser | null | undefined,
): boolean {
  if (!server || !user) return false;
  if (user.role === 'ADMIN' || user.role === 'VIEWER') return true;

  const uid = user.id.toLowerCase();
  const uEmail = user.email.toLowerCase();

  if (server.operatorUserId && server.operatorUserId.toLowerCase() === uid) return true;
  if (server.operatorEmail && server.operatorEmail.toLowerCase() === uEmail) return true;

  // Legacy fallback: free-text owner sometimes held the operator email.
  if (server.owner) {
    const ownerLower = server.owner.toLowerCase().trim();
    if (ownerLower === uEmail || ownerLower === uid) return true;
  }

  return false;
}

/** @deprecated Backend scopes OPERATOR lists; kept as identity for gradual call-site cleanup. */
export function filterServersForUser(servers: Server[], _user: AuthUser | null | undefined): Server[] {
  return servers;
}
