import test from "node:test";
import assert from "node:assert/strict";
import { financialSummary, isSettledPayment, parsePaymentDate } from "./financials.js";

test("only settled, dated payments count as income", () => {
  const summary = financialSummary([
    { id: "1", paymentStatus: "Paid", paymentDate: "2026-10-01", feeReceived: 1700, planFee: 1700 },
    { id: "2", paymentStatus: "Pending", paymentDate: "2026-10-02", feeReceived: 4500, planFee: 4500 },
    { id: "3", paymentCompleted: true, paymentDate: "2026-10-03", paymentAmount: 8000, planFee: 8000 },
    { id: "4", paymentStatus: "Paid", paymentDate: "not-a-date", feeReceived: 1000, planFee: 1000 },
  ], new Date("2026-10-10T00:00:00"));
  assert.equal(summary.monthlyIncoming, 9700);
  assert.equal(summary.monthlyPayments.length, 2);
  assert.equal(summary.totalReceived, 9700);
});

test("payment date and settlement checks reject invalid values", () => {
  assert.equal(parsePaymentDate("2026/10/10"), null);
  assert.equal(isSettledPayment({ paymentStatus: "Pending" }), false);
  assert.equal(isSettledPayment({ paymentStatus: "Paid" }), true);
});
