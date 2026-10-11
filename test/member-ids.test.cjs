const test = require("node:test");
const assert = require("node:assert/strict");
const {
  getNextMemberId,
  getNextFingerprintId,
  sortMembersById,
} = require("../member-ids.cjs");

test("a cleared member database starts member IDs at 1", () => {
  assert.equal(getNextMemberId([]), "1");
});

test("the next ID follows the highest numeric member ID", () => {
  assert.equal(getNextMemberId([{ id: "1" }, { memberId: "9" }, { id: "test" }]), "10");
});

test("numeric IDs reserved on pending requests are not reassigned", () => {
  assert.equal(
    getNextMemberId(
      [{ id: "9" }],
      [{ requestId: "REQ-00010", memberId: "12" }]
    ),
    "13"
  );
});

test("member ID sequence is independent from fingerprint IDs", () => {
  assert.equal(
    getNextMemberId([{ id: "8", member_id: "18", fingerprint_id: "1400" }]),
    "9"
  );
});

test("database-shaped member and request fields reserve their numeric IDs", () => {
  assert.equal(
    getNextMemberId(
      [{ id: "8", member_id: "18", fingerprint_id: "2700" }],
      [{ member_id: "35", fingerprint_id: "3100" }]
    ),
    "36"
  );
});

test("fingerprint IDs have their own sequence and include pending reservations", () => {
  assert.equal(
    getNextFingerprintId(
      [{ id: "383", fingerprint_id: "5738" }],
      [{ fingerprint_id: "6000" }]
    ),
    "6001"
  );
});

test("members are displayed in numeric ascending ID order", () => {
  assert.deepEqual(sortMembersById([{ id: "10" }, { id: "2" }, { id: "1" }]).map((member) => member.id), ["1", "2", "10"]);
});
