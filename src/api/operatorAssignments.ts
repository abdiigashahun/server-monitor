import type { Server, Alert, AuthUser } from '../types';

const STORAGE_KEY = 'server_monitor_operator_assignments';

/**
 * Persisted mapping of serverId -> operatorUserIds (or emails).
 */
function loadAssignments(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveAssignments(map: Record<string, string[]>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Assigns one or more operators (by User ID or Email) to a specific server.
 */
export function setServerOperators(serverId: string, operatorIdsOrEmails: string[]): void {
  const map = loadAssignments();
  map[serverId] = Array.from(new Set(operatorIdsOrEmails.filter(Boolean)));
  saveAssignments(map);
}

/**
 * Gets the list of operator user IDs or emails assigned to a specific server.
 */
export function getServerOperators(serverId: string): string[] {
  const map = loadAssignments();
  return map[serverId] ?? [];
}

/**
 * Checks whether a server is assigned to a particular operator user.
 * - Administrators and Viewers have global access.
 * - Operators only have access if explicitly assigned or if they are the designated owner.
 */
export function isServerAssignedToUser(
  server: { id: string; owner?: string; parentServerId?: string | null } | null | undefined,
  user: AuthUser | null | undefined,
): boolean {
  if (!server || !user) return false;
  if (user.role === 'ADMIN' || user.role === 'VIEWER') return true;

  // For OPERATOR role, check explicit assignments
  const map = loadAssignments();
  const assigned = map[server.id] ?? [];

  const uid = user.id.toLowerCase();
  const uEmail = user.email.toLowerCase();
  const uName = user.name.toLowerCase();

  // Check if user's ID or email is in the assignment list
  const isDirectlyAssigned = assigned.some(
    (val) =>
      val.toLowerCase() === uid ||
      val.toLowerCase() === uEmail ||
      val.toLowerCase() === uName,
  );
  if (isDirectlyAssigned) return true;

  // Check if the server's owner field matches the user's email, ID, or name
  if (server.owner) {
    const ownerLower = server.owner.toLowerCase().trim();
    if (
      ownerLower === uEmail ||
      ownerLower === uid ||
      ownerLower === uName ||
      ownerLower.includes(uEmail) ||
      (uName.length > 2 && ownerLower.includes(uName))
    ) {
      return true;
    }
  }

  // Check if parent server is assigned
  if (server.parentServerId) {
    const parentAssigned = map[server.parentServerId] ?? [];
    if (
      parentAssigned.some(
        (val) =>
          val.toLowerCase() === uid ||
          val.toLowerCase() === uEmail ||
          val.toLowerCase() === uName,
      )
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Returns the list of all server IDs assigned to an operator.
 */
export function getOperatorAssignments(
  userId: string,
  userEmail?: string,
  userName?: string,
  knownServers?: Server[],
): string[] {
  const map = loadAssignments();
  const assignedIds = new Set<string>();

  const uid = userId.toLowerCase();
  const uEmail = userEmail?.toLowerCase();
  const uName = userName?.toLowerCase();

  // Search in localStorage mapping
  for (const [serverId, operators] of Object.entries(map)) {
    if (
      operators.some(
        (op) =>
          op.toLowerCase() === uid ||
          (uEmail && op.toLowerCase() === uEmail) ||
          (uName && op.toLowerCase() === uName),
      )
    ) {
      assignedIds.add(serverId);
    }
  }

  // Search in known servers if provided
  if (knownServers) {
    for (const s of knownServers) {
      if (s.owner) {
        const ownerLower = s.owner.toLowerCase();
        if (
          (uEmail && ownerLower === uEmail) ||
          ownerLower === uid ||
          (uName && ownerLower === uName) ||
          (uEmail && ownerLower.includes(uEmail))
        ) {
          assignedIds.add(s.id);
        }
      }
    }
  }

  return Array.from(assignedIds);
}

/**
 * Filters a server collection for the current user.
 */
export function filterServersForUser(servers: Server[], user: AuthUser | null | undefined): Server[] {
  if (!user || user.role === 'ADMIN' || user.role === 'VIEWER') {
    return servers;
  }
  return servers.filter((s) => isServerAssignedToUser(s, user));
}

/**
 * Filters an alerts collection for the current user based on assigned servers.
 */
export function filterAlertsForUser(
  alerts: Alert[],
  assignedServers: Server[],
  user: AuthUser | null | undefined,
): Alert[] {
  if (!user || user.role === 'ADMIN' || user.role === 'VIEWER') {
    return alerts;
  }
  const assignedServerIds = new Set(assignedServers.map((s) => s.id));
  return alerts.filter((a) => {
    const sId = a.serverId || a.server?.id;
    return Boolean(sId && assignedServerIds.has(sId));
  });
}
