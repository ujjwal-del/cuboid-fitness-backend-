function getNextMemberId(members = [], requests = []) {
  let maxId = 0;

  const reserve = (value) => {
    const id = String(value ?? "").trim();
    if (/^\d+$/.test(id)) {
      maxId = Math.max(maxId, Number(id));
    }
  };

  for (const member of members) {
    reserve(member.id || member.memberId || member.member_id);
  }

  for (const request of requests) {
    reserve(request.memberId || request.member_id);
  }

  return String(maxId + 1);
}

function getNextFingerprintId(members = [], requests = []) {
  let maxId = 0;
  const usedIds = new Set();

  for (const record of [...members, ...requests]) {
    const fingerprintId = String(
      record.fingerprintId ?? record.fingerprint_id ?? ""
    ).trim();
    if (!fingerprintId) continue;
    usedIds.add(fingerprintId.toLowerCase());
    if (/^\d+$/.test(fingerprintId)) {
      maxId = Math.max(maxId, Number(fingerprintId));
    }
  }

  let nextId = maxId + 1;
  while (usedIds.has(String(nextId).toLowerCase())) nextId += 1;
  return String(nextId);
}

function sortMembersById(members = []) {
  return [...members].sort((left, right) => {
    const leftId = Number(left.id || left.memberId);
    const rightId = Number(right.id || right.memberId);
    const leftValid = Number.isFinite(leftId);
    const rightValid = Number.isFinite(rightId);
    if (leftValid && rightValid) return leftId - rightId;
    if (leftValid) return -1;
    if (rightValid) return 1;
    return String(left.id || left.memberId || "").localeCompare(String(right.id || right.memberId || ""));
  });
}

module.exports = { getNextMemberId, getNextFingerprintId, sortMembersById };
