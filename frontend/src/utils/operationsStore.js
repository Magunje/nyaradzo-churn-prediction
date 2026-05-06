const CLAIMS_KEY = "nyaradzo-claims";
const REMINDERS_KEY = "nyaradzo-payment-reminders";

function readJson(key, fallback) {
  const raw = localStorage.getItem(key);
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getClaims() {
  return readJson(CLAIMS_KEY, []);
}

export function createClaim(payload) {
  const claims = getClaims();
  const claim = {
    id: `CLM-${String(Date.now()).slice(-8)}`,
    ...payload,
    status: "Pending",
    filedAt: new Date().toISOString(),
  };
  writeJson(CLAIMS_KEY, [claim, ...claims]);
  return claim;
}

export function updateClaimStatus(id, status) {
  const updated = getClaims().map((claim) => (claim.id === id ? { ...claim, status } : claim));
  writeJson(CLAIMS_KEY, updated);
}

export function getReminderState() {
  return readJson(REMINDERS_KEY, {});
}

export function markReminderSent(policyholderId) {
  const reminders = getReminderState();
  reminders[policyholderId] = {
    status: "Reminder Sent",
    updatedAt: new Date().toISOString(),
  };
  writeJson(REMINDERS_KEY, reminders);
}
