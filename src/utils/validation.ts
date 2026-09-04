// Client-side mirror of the backend's `ipOrHostname` validation. The backend is
// still the source of truth (its errors are surfaced verbatim); this just gives
// immediate feedback in forms and rejects obvious mistakes before a round-trip.

const IPV4 =
  /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;

// A pragmatic IPv6 matcher (covers full, compressed `::`, and IPv4-mapped forms).
const IPV6 =
  /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|::(ffff(:0{1,4})?:)?((25[0-5]|(2[0-4]|1?\d)?\d)\.){3}(25[0-5]|(2[0-4]|1?\d)?\d))$/;

// DNS hostname: dot-separated labels, each 1–63 chars, alnum + internal hyphens,
// total ≤ 253. Single-label names (e.g. `localhost`) are allowed.
const HOSTNAME =
  /^(?=.{1,253}$)([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)(\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export function isValidIpOrHostname(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  if (/\s/.test(v)) return false; // no whitespace
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(v)) return false; // no scheme://
  if (v.includes('/')) return false; // no path
  if (IPV4.test(v) || IPV6.test(v)) return true;
  if (!HOSTNAME.test(v)) return false;
  // An all-numeric (dotted) string is a malformed IP, not a hostname — reject it
  // so a typo'd address like "300.1.1.1" isn't silently accepted as a DNS name.
  if (/^\d+(\.\d+)*$/.test(v)) return false;
  return true;
}

export function isValidEmail(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  if (/\s/.test(v)) return false;

  // Require a valid Gmail address only.
  const GMAIL_EMAIL =
    /^(?=.{1,254}$)(?=.{1,64}@)(?!.*\.\.)[A-Za-z0-9](?:[A-Za-z0-9._%+-]*[A-Za-z0-9])?@gmail\.com$/;

  return GMAIL_EMAIL.test(v);
}
