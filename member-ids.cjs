function getNextMemberId(members = []) {
  let maxId = 0;

  for (const member of members) {
    const id = String(member.id || member.memberId || "").trim();
    if (/^\d+$/.test(id)) {
      maxId = Math.max(maxId, Number(id));
    }
  }

  return String(maxId + 1);
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

module.exports = { getNextMemberId, sortMembersById };
