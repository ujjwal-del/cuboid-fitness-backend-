export function parsePaymentDate(value) {
  const raw = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const date = new Date(`${raw}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function isSettledPayment(member) {
  const status = String(member?.paymentStatus || "").trim().toLowerCase();
  const completed = member?.paymentCompleted === true || String(member?.paymentCompleted).toLowerCase() === "true";
  return status === "paid" || status === "completed" || completed;
}

export function paymentAmount(member) {
  for (const value of [member?.feeReceived, member?.paymentAmount, member?.planFee]) {
    const amount = Number(value);
    if (Number.isFinite(amount) && amount > 0) return amount;
  }
  return 0;
}

export function settledPayments(members = []) {
  return members
    .map((member) => ({ ...member, paymentDateValue: parsePaymentDate(member.paymentDate), receivedAmount: paymentAmount(member) }))
    .filter((member) => isSettledPayment(member) && member.paymentDateValue && member.receivedAmount > 0)
    .sort((a, b) => b.paymentDateValue - a.paymentDateValue);
}

export function financialSummary(members = [], referenceDate = new Date()) {
  const payments = settledPayments(members);
  const monthlyPayments = payments.filter((payment) => payment.paymentDateValue.getMonth() === referenceDate.getMonth() && payment.paymentDateValue.getFullYear() === referenceDate.getFullYear());
  const monthlyIncoming = monthlyPayments.reduce((total, payment) => total + payment.receivedAmount, 0);
  const totalReceived = payments.reduce((total, payment) => total + payment.receivedAmount, 0);
  const outstanding = members.reduce((total, member) => {
    const due = Number(member?.planFee) || 0;
    return total + Math.max(0, due - paymentAmount(member));
  }, 0);
  return { payments, monthlyPayments, monthlyIncoming, totalReceived, outstanding };
}
