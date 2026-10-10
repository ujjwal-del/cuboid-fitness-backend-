const test = require("node:test");
const assert = require("node:assert/strict");
const { getNextMemberId, sortMembersById } = require("../member-ids.cjs");

test("a cleared member database starts Member and Fingerprint IDs at 1", () => {
  assert.equal(getNextMemberId([]), "1");
});

test("the next ID follows the highest numeric member ID", () => {
  assert.equal(getNextMemberId([{ id: "1" }, { memberId: "9" }, { id: "test" }]), "10");
});

test("members are displayed in numeric ascending ID order", () => {
  assert.deepEqual(sortMembersById([{ id: "10" }, { id: "2" }, { id: "1" }]).map((member) => member.id), ["1", "2", "10"]);
});
