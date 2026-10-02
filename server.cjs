require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const XLSX = require("xlsx");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  }
);

const app = express();
const PORT = 3001;

/* =========================================================
   ADMIN LOGIN
========================================================= */

const ADMIN_ID = "admin";
const ADMIN_PASSWORD = "GymAdmin@2026";

/*
  Sessions are stored on the server.
  Restarting server.cjs logs everyone out.
*/
const sessions = new Map();

const SESSION_DURATION =
  8 * 60 * 60 * 1000; // 8 hours

/* =========================================================
   MIDDLEWARE
========================================================= */

app.use(
  cors({
    // Allow the Admin and Customer Vite dev servers on localhost.
    // Vite may use 5173, 5174, 5175, etc. depending on which port is free.
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      const allowed =
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
        origin === "https://cuboid-fitness-backend.vercel.app" ||
        origin === "https://customer-bot-sigma.vercel.app";

      if (allowed) {
        return callback(null, true);  
      }

      return callback(new Error("CORS origin not allowed"));
    },
    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],
  })
);

app.use(
  express.json({
    limit: "10mb",
  })
);

/* =========================================================
   AUTH HELPERS
========================================================= */

function createSession() {
  const token =
    crypto.randomBytes(32).toString("hex");

  sessions.set(token, {
    createdAt: Date.now(),
    expiresAt:
      Date.now() + SESSION_DURATION,
  });

  return token;
}

function isValidSession(token) {
  if (!token) {
    return false;
  }

  const session =
    sessions.get(token);

  if (!session) {
    return false;
  }

  if (
    Date.now() >=
    session.expiresAt
  ) {
    sessions.delete(token);
    return false;
  }

  return true;
}

function getTokenFromRequest(req) {
  const header =
    req.headers.authorization || "";

  if (!header.startsWith("Bearer ")) {
    return null;
  }

  return header
    .substring(7)
    .trim();
}

/* =========================================================
   AUTH MIDDLEWARE
========================================================= */

function requireAuth(
  req,
  res,
  next
) {
  const token =
    getTokenFromRequest(req);

  if (!isValidSession(token)) {
    return res.status(401).json({
      success: false,
      error:
        "Unauthorized. Please login again.",
      code: "AUTH_REQUIRED",
    });
  }

  req.authToken = token;

  next();
}

/* =========================================================
   LOGIN
========================================================= */

app.post(
  "/api/login",
  async (req, res) => {
    try {
      const {
        adminId,
        password,
      } = req.body || {};

      if (
        !adminId ||
        !password
      ) {
        return res.status(400).json({
          success: false,
          error:
            "Admin ID and password are required.",
        });
      }

      const idA = Buffer.from(
        String(adminId)
      );

      const idB = Buffer.from(
        String(ADMIN_ID)
      );

      const passwordA =
        Buffer.from(
          String(password)
        );

      const passwordB =
        Buffer.from(
          String(ADMIN_PASSWORD)
        );

      const idCorrect =
        idA.length ===
          idB.length &&
        crypto.timingSafeEqual(
          idA,
          idB
        );

      const passwordCorrect =
        passwordA.length ===
          passwordB.length &&
        crypto.timingSafeEqual(
          passwordA,
          passwordB
        );

      if (
        !idCorrect ||
        !passwordCorrect
      ) {
        return res.status(401).json({
          success: false,
          error:
            "Invalid Admin ID or password.",
        });
      }

      const token =
        createSession();

      return res.json({
        success: true,
        message:
          "Login successful.",
        token,
        expiresIn:
          SESSION_DURATION,
      });
    } catch (error) {
      console.error(
        "LOGIN ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        error:
          "Login failed.",
      });
    }
  }
);

/* =========================================================
   CHECK LOGIN
========================================================= */

app.get(
  "/api/auth/check",
  requireAuth,
  async (req, res) => {
    res.json({
      success: true,
      authenticated: true,
    });
  }
);

/* =========================================================
   LOGOUT
========================================================= */

app.post(
  "/api/logout",
  requireAuth,
  async (req, res) => {
    sessions.delete(
      req.authToken
    );

    res.json({
      success: true,
      message:
        "Logged out successfully.",
    });
  }
);

/* =========================================================
   MEMBER EXCEL FILE
========================================================= */

function getExcelPath() {
  // The member database is always members.xlsx.
  // Do not accidentally select daily exports or registration_requests.xlsx.
  return path.join(__dirname, "members.xlsx");
}

/* =========================================================
   MEMBER HEADERS
========================================================= */

const HEADERS = [
  "id",
  "memberId",
  "customerId",
  "gymId",
  "fingerprintId",
  "name",
  "phone",
  "plan",
  "joiningDate",
  "expiryDate",
  "planFee",
  "feeReceived",
  "paymentMethod",
  "paymentStatus",
  "paymentCompleted",
  "paymentAmount",
  "transactionId",
  "paymentDate",
  "status",
  "fingerprintAccess",
  "photo",
];

/* =========================================================
   NORMALIZE MEMBER
========================================================= */

function normalizeMember(row) {
  const member = {};

  for (const key of HEADERS) {
    member[key] =
      row[key] ?? "";
  }

  if (!String(member.transactionId || "").trim()) {
    member.transactionId = String(
      row.utr || row.paymentTransactionId || row.transaction_id || ""
    ).trim();
  }

  member.planFee =
    Number(member.planFee) || 0;

  member.feeReceived =
    Number(member.feeReceived) || 0;

  return member;
}

/* =========================================================
   READ MEMBERS
========================================================= */


function memberToDb(member) {
  return {
    id: String(member.id || "").trim(),
    member_id: String(member.memberId || member.id || "").trim(),
    customer_id: String(member.customerId || "").trim(),
    gym_id: String(member.gymId || "").trim(),
    fingerprint_id: String(member.fingerprintId || "").trim(),
    name: member.name ?? "",
    phone: member.phone ?? "",
    plan: member.plan ?? "",
    joining_date: member.joiningDate || null,
expiry_date: member.expiryDate || null,
    plan_fee: Number(member.planFee) || 0,
    fee_received: Number(member.feeReceived) || 0,
    payment_method: member.paymentMethod ?? "",
    payment_status: member.paymentStatus ?? "",
    payment_completed: Boolean(member.paymentCompleted),
    payment_amount: Number(member.paymentAmount) || 0,
    transaction_id: member.transactionId ?? "",
    payment_date: member.paymentDate || null,
    status: member.status ?? "",
    fingerprint_access: Boolean(member.fingerprintAccess),
    photo: member.photo ?? ""
  };
}

function dbToMember(row) {
  return normalizeMember({
    id: row.id,
    memberId: row.member_id,
    customerId: row.customer_id,
    gymId: row.gym_id,
    fingerprintId: row.fingerprint_id,
    name: row.name,
    phone: row.phone,
    plan: row.plan,
    joiningDate: row.joining_date,
    expiryDate: row.expiry_date,
    planFee: row.plan_fee,
    feeReceived: row.fee_received,
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    paymentCompleted: row.payment_completed,
    paymentAmount: row.payment_amount,
    transactionId: row.transaction_id,
    paymentDate: row.payment_date,
    status: row.status,
    fingerprintAccess: row.fingerprint_access,
    photo: row.photo
  });
}

function registrationRequestToDb(request) {
  return {
    request_id: String(request.requestId || "").trim(),
    member_id: String(request.memberId || "").trim(),
    customer_id: String(request.customerId || "").trim(),
    gym_id: String(request.gymId || "").trim(),
    fingerprint_id: String(request.fingerprintId || "").trim(),
    name: request.name ?? "",
    phone: request.phone ?? "",
    plan: request.plan ?? "",
    joining_date: request.joiningDate ?? "",
    photo: request.photo ?? "",
    payment_completed: Boolean(request.paymentCompleted),
    payment_status: request.paymentStatus ?? "",
    payment_method: request.paymentMethod ?? "",
    payment_amount: Number(request.paymentAmount) || 0,
    transaction_id: request.transactionId ?? "",
    payment_date: request.paymentDate ?? "",
    status: request.status ?? "",
    created_at: request.createdAt || null,
    reviewed_at: request.reviewedAt || null
  };
}

function dbToRegistrationRequest(row) {
  return normalizeRegistrationRequest({
    requestId: row.request_id,
    memberId: row.member_id,
    customerId: row.customer_id,
    gymId: row.gym_id,
    fingerprintId: row.fingerprint_id,
    name: row.name,
    phone: row.phone,
    plan: row.plan,
    joiningDate: row.joining_date,
    photo: row.photo,
    paymentCompleted: row.payment_completed,
    paymentStatus: row.payment_status,
    paymentMethod: row.payment_method,
    paymentAmount: row.payment_amount,
    transactionId: row.transaction_id,
    paymentDate: row.payment_date,
    status: row.status,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at
  });
}

function expiredMemberToDb(member) {
  const base = memberToDb(member);
  return {
    ...base,
    expired_at: member.expiredAt || null,
    expiration_reason: member.expirationReason || ""
  };
}

function dbToExpiredMember(row) {
  return {
    ...dbToMember(row),
    expiredAt: row.expired_at,
    expirationReason: row.expiration_reason
  };
}

function writeMembersExcelBackup(members) {
  const rows = members.map(member => {
    const row = {};
    for (const key of HEADERS) row[key] = member[key] ?? "";
    return row;
  });
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(rows, { header: HEADERS });
  XLSX.utils.book_append_sheet(workbook, sheet, "Members");
  XLSX.writeFile(workbook, getExcelPath());
}

function writeExpiredMembersExcelBackup(members) {
  const rows = members.map(member => {
    const row = {};
    for (const key of EXPIRED_MEMBER_HEADERS) row[key] = member[key] ?? "";
    return row;
  });
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(rows, { header: EXPIRED_MEMBER_HEADERS });
  XLSX.utils.book_append_sheet(workbook, sheet, "Expired Members");
  XLSX.writeFile(workbook, getExpiredMembersPath());
}

function writeRegistrationRequestsExcelBackup(requests) {
  const rows = requests.map(request => {
    const row = {};
    for (const key of REGISTRATION_REQUEST_HEADERS) row[key] = request[key] ?? "";
    return row;
  });
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(rows, { header: REGISTRATION_REQUEST_HEADERS });
  XLSX.utils.book_append_sheet(workbook, sheet, "Registration Requests");
  XLSX.writeFile(workbook, getRegistrationRequestsPath());
}

async function readMembers() {
  const { data, error } = await supabase
    .from("members")
    .select("*")
    .order("id", { ascending: true });

  if (error) throw error;

  return (data || []).map(dbToMember);
}

/* =========================================================
   WRITE MEMBERS
========================================================= */

async function writeMembers(members) {
  const normalized = (members || []).map(normalizeMember);
  const { data: existing, error: readError } = await supabase
    .from("members")
    .select("id");
  if (readError) throw readError;

  const incomingIds = new Set(normalized.map(m => String(m.id || "").trim()).filter(Boolean));

  for (const row of existing || []) {
    const id = String(row.id || "").trim();
    if (id && !incomingIds.has(id)) {
      const { error } = await supabase.from("members").delete().eq("id", id);
      if (error) throw error;
    }
  }

  if (normalized.length) {
    const { error } = await supabase
      .from("members")
      .upsert(normalized.map(memberToDb), { onConflict: "id" });
    if (error) throw error;
  }

  writeMembersExcelBackup(normalized);
}

/* =========================================================
   NEXT MEMBER ID
========================================================= */

function getNextMemberId(members, requests = []) {
  /*
    Permanent sequential member IDs.

    Existing members:
      1, 2, 3, ... 382

    New members:
      383, 384, 385, ...

    Existing IDs are NEVER reused.
  */

  let maxId = 0;

  for (const member of members) {
    const id = String(
      member.id || member.memberId || ""
    ).trim();

    if (/^\d+$/.test(id)) {
      const number = Number(id);

      if (Number.isFinite(number) && number > maxId) {
        maxId = number;
      }
    }
  }

  return String(maxId + 1);
}

/* =========================================================
   EXPIRED MEMBER ARCHIVE + AUTOMATIC ID REUSE
========================================================= */

function getExpiredMembersPath() {
  return path.join(__dirname, "expired_members.xlsx");
}

const EXPIRED_MEMBER_HEADERS = [
  ...HEADERS,
  "expiredAt",
  "expirationReason",
];

async function readExpiredMembers() {
  const { data, error } = await supabase
    .from("expired_members")
    .select("*")
    .order("expired_at", { ascending: false });

  if (error) throw error;
  return (data || []).map(dbToExpiredMember);
}

async function writeExpiredMembers(members) {
  const { data: existing, error: readError } = await supabase
    .from("expired_members")
    .select("archive_id");
  if (readError) throw readError;

  for (const row of existing || []) {
    const { error } = await supabase
      .from("expired_members")
      .delete()
      .eq("archive_id", row.archive_id);
    if (error) throw error;
  }

  if (members && members.length) {
    const { error } = await supabase
      .from("expired_members")
      .insert(members.map(expiredMemberToDb));
    if (error) throw error;
  }

  writeExpiredMembersExcelBackup(members || []);
}

/*
  Safely add calendar months without allowing dates such as
  31 January + 2 months to overflow into a later month.
*/
function addCalendarMonths(dateInput, months) {
  const source = new Date(dateInput);

  if (Number.isNaN(source.getTime())) {
    return new Date();
  }

  const year = source.getFullYear();
  const month = source.getMonth();
  const day = source.getDate();

  const target = new Date(
    year,
    month + months,
    1
  );

  const lastDayOfTargetMonth =
    new Date(
      target.getFullYear(),
      target.getMonth() + 1,
      0
    ).getDate();

  target.setDate(
    Math.min(day, lastDayOfTargetMonth)
  );

  target.setHours(0, 0, 0, 0);

  return target;
}

/*
  CORE MEMBERSHIP RULE:
  Membership duration depends on the selected plan.
  Monthly   = 1 month
  Quarterly = 3 months
  Half Year = 6 months
  Yearly    = 12 months
*/
const PLAN_MONTHS = {
  Monthly: 1,
  Quarterly: 3,
  "Half Year": 6,
  Yearly: 12,
};

function getPlanMonths(plan) {
  return PLAN_MONTHS[String(plan || "").trim()] || 0;
}

function getExpiryDateFromPlan(joiningDate, plan) {
  if (!joiningDate) return "";

  const months = getPlanMonths(plan);
  if (!months) return "";

  const date = addCalendarMonths(
    `${joiningDate}T00:00:00`,
    months
  );

  return date.toISOString().split("T")[0];
}

/*
  Move expired active members out of members.xlsx and into
  expired_members.xlsx.

  This is deliberately done on the server, not only in React,
  so the database state is actually changed even when nobody
  has the admin dashboard open.
*/
async function expireAndReleaseMemberIds() {
  try {
    const members = await readMembers();

    if (!members.length) {
      return {
        expiredCount: 0,
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayString = today.toISOString().split("T")[0];

    const activeMembers = [];
    const newlyExpired = [];

    for (const member of members) {
      const expiryRaw =
        String(member.expiryDate || "").trim();

      if (!/^\d{4}-\d{2}-\d{2}$/.test(expiryRaw)) {
        activeMembers.push(member);
        continue;
      }

      const expiryDate =
        new Date(`${expiryRaw}T00:00:00`);

      if (
        Number.isNaN(expiryDate.getTime()) ||
        expiryDate > today
      ) {
        activeMembers.push(member);
        continue;
      }

      newlyExpired.push({
        ...member,
        status: "Expired",
        fingerprintAccess: false,
        expiredAt: todayString,
        expirationReason:
          "Automatically expired after the membership plan duration",
      });
    }

    if (!newlyExpired.length) {
      return {
        expiredCount: 0,
      };
    }

    const archive = await readExpiredMembers();

    const archiveKeys = new Set(
      archive.map((member) =>
        [
          String(member.id || member.memberId || "").trim(),
          String(member.expiredAt || "").trim(),
        ].join("|")
      )
    );

    for (const member of newlyExpired) {
      const key = [
        String(member.id || member.memberId || "").trim(),
        String(member.expiredAt || "").trim(),
      ].join("|");

      if (!archiveKeys.has(key)) {
        archive.push(member);
      }
    }

    await writeExpiredMembers(archive);

    /*
      IMPORTANT:
      Expired members keep their original IDs in the archive.
      IDs are NEVER released or reused.

      New members always receive:
      MAX existing numeric ID + 1
    */
    await writeMembers([...activeMembers]);

    const expiredIds = newlyExpired.map((member) =>
      String(member.id || member.memberId || "").trim()
    );

    console.log(
      `AUTO EXPIRY: ${newlyExpired.length} member(s) archived. IDs preserved: ${expiredIds.join(", ")}`
    );

    return {
      expiredCount: newlyExpired.length,
    };
  } catch (error) {
    console.error(
      "AUTO EXPIRY ERROR:",
      error
    );

    return {
      expiredCount: 0,
    };
  }
}

/* =========================================================
   REGISTRATION REQUEST EXCEL
========================================================= */

function getRegistrationRequestsPath() {
  return path.join(
    __dirname,
    "registration_requests.xlsx"
  );
}

/* =========================================================
   REGISTRATION REQUEST HEADERS
========================================================= */

const REGISTRATION_REQUEST_HEADERS = [
  "requestId",
  "memberId",
  "customerId",
  "gymId",
  "fingerprintId",
  "name",
  "phone",
  "plan",
  "joiningDate",
  "photo",
  "paymentCompleted",
  "paymentStatus",
  "paymentMethod",
  "paymentAmount",
  "transactionId",
  "paymentDate",
  "status",
  "createdAt",
  "reviewedAt",
];

const PLAN_FEES = { Monthly: 1700, Quarterly: 4500, "Half Year": 8000, Yearly: 13999 };

function getPlanFee(plan) {
  return PLAN_FEES[String(plan || "").trim()] || 0;
}

function transactionIdAlreadyUsed(transactionId, members, requests) {
  const id = String(transactionId || "").trim().toLowerCase();
  if (!id) return false;
  return members.some(m => String(m.transactionId || "").trim().toLowerCase() === id) ||
    requests.some(r => String(r.transactionId || "").trim().toLowerCase() === id);
}

/* =========================================================
   NORMALIZE REGISTRATION REQUEST
========================================================= */

function normalizeRegistrationRequest(
  row
) {
  const request = {};

  for (
    const key of
      REGISTRATION_REQUEST_HEADERS
  ) {
    request[key] =
      row[key] ?? "";
  }

  if (!String(request.transactionId || "").trim()) {
    request.transactionId = String(
      row.utr || row.paymentTransactionId || row.transaction_id || ""
    ).trim();
  }

  return request;
}

/* =========================================================
   READ REGISTRATION REQUESTS
========================================================= */

async function readRegistrationRequests() {
  const { data, error } = await supabase
    .from("registration_requests")
    .select("*")
    .order("request_id", { ascending: true });

  if (error) throw error;
  return (data || []).map(dbToRegistrationRequest);
}

/* =========================================================
   WRITE REGISTRATION REQUESTS
========================================================= */

async function writeRegistrationRequests(requests) {
  const normalized = (requests || []).map(normalizeRegistrationRequest);
  const { data: existing, error: readError } = await supabase
    .from("registration_requests")
    .select("request_id");
  if (readError) throw readError;

  const incomingIds = new Set(normalized.map(r => String(r.requestId || "").trim()).filter(Boolean));

  for (const row of existing || []) {
    const id = String(row.request_id || "").trim();
    if (id && !incomingIds.has(id)) {
      const { error } = await supabase
        .from("registration_requests")
        .delete()
        .eq("request_id", id);
      if (error) throw error;
    }
  }

  if (normalized.length) {
    const { error } = await supabase
      .from("registration_requests")
      .upsert(normalized.map(registrationRequestToDb), { onConflict: "request_id" });
    if (error) throw error;
  }

  writeRegistrationRequestsExcelBackup(normalized);
}

/* =========================================================
   NEXT REGISTRATION REQUEST ID
========================================================= */

function getNextRegistrationRequestId(
  requests
) {
  let highest = 0;

  for (const request of requests) {
    const id =
      String(
        request.requestId || ""
      );

    const match =
      id.match(
        /^REQ-(\d+)$/i
      );

    if (match) {
      highest =
        Math.max(
          highest,
          Number(match[1])
        );
    }
  }

  return `REQ-${String(
    highest + 1
  ).padStart(5, "0")}`;
}

/* =========================================================
   TEST SERVER
========================================================= */

app.get(
  "/api/test",
  async (req, res) => {
    res.json({
      success: true,
      message:
        "Gym server is working",
    });
  }
);

/* =========================================================
   GET MEMBERS
   ðŸ”’ PROTECTED
========================================================= */

app.get(
  "/api/members",
  requireAuth,
  async (req, res) => {
    try {
      const members =
        await readMembers();

      res.json({
        success: true,
        members,
      });
    } catch (error) {
      console.error(
        "GET MEMBERS ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        error:
          error.message,
      });
    }
  }
);

/* =========================================================
   GET NEXT MEMBER ID
   ðŸ”’ PROTECTED
========================================================= */

app.get(
  "/api/next-member-id",
  requireAuth,
  async (req, res) => {
    try {
      await expireAndReleaseMemberIds();

      const members =
        await readMembers();

      const requests =
        await readRegistrationRequests();

      const id =
        getNextMemberId(
          members,
          requests
        );

      res.json({
        success: true,
        id,
      });
    } catch (error) {
      console.error(
        "NEXT ID ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        error:
          error.message,
      });
    }
  }
);

/* =========================================================
   ADD MEMBER
   ðŸ”’ PROTECTED
========================================================= */

app.post(
  "/api/members",
  requireAuth,
  async (req, res) => {
    try {
      await expireAndReleaseMemberIds();

      const members =
        await readMembers();

      const requests =
        await readRegistrationRequests();

      /*
        NEVER trust the ID from React.
        Server generates it.
      */

      const id =
        getNextMemberId(
          members,
          requests
        );

      const incoming =
        req.body || {};

      const member =
        normalizeMember({
          ...incoming,

          id,

          status:
            incoming.status ||
            "Active",

          fingerprintAccess:
            incoming.fingerprintAccess ||
            "false",
        });

      // The active members array was loaded above as `members`.
      // Add the new member to that array and save it.
      // Do NOT use `refreshedMembers` here; that variable only exists
      // in the registration-approval flow below.
      members.push(member);

      await writeMembers(
        members
      );

      res.status(201).json({
        success: true,
        message:
          "Member saved successfully",
        member,
        id,
      });
    } catch (error) {
      console.error(
        "POST MEMBER ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        error:
          error.message,
      });
    }
  }
);

/* =========================================================
   UPDATE MEMBER
   ðŸ”’ PROTECTED
========================================================= */

app.put(
  "/api/members/:id",
  requireAuth,
  async (req, res) => {
    try {
      const memberId =
        String(req.params.id || "").trim();

      if (!memberId) {
        return res.status(400).json({
          success: false,
          error: "Member ID is required.",
        });
      }

      await expireAndReleaseMemberIds();

      const members = await readMembers();

      const index =
        members.findIndex(
          (member) =>
            String(member.id || "").trim() ===
            memberId
        );

      if (index === -1) {
        return res.status(404).json({
          success: false,
          error:
            `Member ${memberId} not found.`,
        });
      }

      const current =
        members[index];

      const incoming =
        req.body || {};

      /*
        The member ID is immutable.
        Editing a profile must never steal or change another
        member's reusable ID.
      */
      const updated =
        normalizeMember({
          ...current,
          ...incoming,
          id: current.id,
          memberId: current.id,
          customerId: current.id,
          gymId: current.id,
          fingerprintId: current.id,
        });

      if (!String(updated.name || "").trim()) {
        return res.status(400).json({
          success: false,
          error: "Member name is required.",
        });
      }

      // Normalize phone input before validation.
      updated.phone = String(updated.phone ?? "")
        .replace(/\D/g, "")
        .slice(0, 10);

      if (
        updated.phone &&
        !/^\d{10}$/.test(updated.phone)
      ) {
        return res.status(400).json({
          success: false,
          error:
            "Phone number must contain exactly 10 digits.",
        });
      }

      /*
        If an admin changes the plan, recalculate expiry
        from the joining date using that plan's duration.
      */
      if (
        /^\d{4}-\d{2}-\d{2}$/.test(
          String(updated.joiningDate || "")
        )
      ) {
        const calculatedExpiry = getExpiryDateFromPlan(
          updated.joiningDate,
          updated.plan
        );

        if (calculatedExpiry) {
          updated.expiryDate = calculatedExpiry;
        }
      }

      updated.status =
        updated.expiryDate &&
        new Date(`${updated.expiryDate}T00:00:00`) <=
          new Date()
          ? "Expired"
          : "Active";

      members[index] =
        updated;

      await writeMembers(members);

      return res.json({
        success: true,
        message:
          "Member updated successfully.",
        member: updated,
      });
    } catch (error) {
      console.error(
        "UPDATE MEMBER ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        error:
          error.message ||
          "Failed to update member.",
      });
    }
  }
);

/* =========================================================
   DELETE MEMBER
   ðŸ”’ PROTECTED
========================================================= */

app.delete(
  "/api/members/:id",
  requireAuth,
  async (req, res) => {
    try {
      const memberId =
        String(
          req.params.id || ""
        ).trim();

      if (!memberId) {
        return res.status(400).json({
          success: false,
          error:
            "Member ID is required",
        });
      }

      const members =
        await readMembers();

      const index =
        members.findIndex(
          (member) =>
            String(
              member.id
            )
              .trim()
              .toLowerCase() ===
            memberId.toLowerCase()
        );

      if (index === -1) {
        return res.status(404).json({
          success: false,
          error:
            `Member ${memberId} not found`,
        });
      }

      const deletedMember =
        members[index];

      members.splice(
        index,
        1
      );

      await writeMembers(
        members
      );

      return res.json({
        success: true,
        message:
          `${memberId} deleted successfully`,
        member:
          deletedMember,
      });
    } catch (error) {
      console.error(
        "DELETE MEMBER ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        error:
          error.message ||
          "Failed to delete member",
      });
    }
  }
);

/* =========================================================
   MANUAL MEMBERSHIP RENEWAL
   ADMIN ONLY
========================================================= */

app.post(
  "/api/members/:id/renew",
  requireAuth,
  async (req, res) => {
    try {
      const memberId = String(req.params.id || "").trim();
      const incoming = req.body || {};
      const plan = String(incoming.plan || "Monthly").trim();

      const planMonths = {
        Monthly: 1,
        Quarterly: 3,
        "Half Year": 6,
        Yearly: 12,
      };

      if (!planMonths[plan]) {
        return res.status(400).json({
          success: false,
          error: "Invalid renewal plan.",
        });
      }

      const amount = Number(
        incoming.amount ?? incoming.feeReceived ?? 0
      );

      if (!Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({
          success: false,
          error: "Enter a valid renewal amount.",
        });
      }

      const paymentMethod =
        String(incoming.paymentMethod || "UPI").trim();

      const paymentDateRaw =
        String(incoming.paymentDate || "").trim();
      const transactionId =
        String(incoming.transactionId || incoming.utr || incoming.paymentTransactionId || "").trim();

      const paymentDate =
        /^\d{4}-\d{2}-\d{2}$/.test(paymentDateRaw)
          ? paymentDateRaw
          : new Date().toISOString().split("T")[0];

      const members = await readMembers();

      const index = members.findIndex(
        (member) =>
          String(member.id || "").trim().toLowerCase() ===
          memberId.toLowerCase()
      );

      if (index === -1) {
        return res.status(404).json({
          success: false,
          error: `Member ${memberId} not found.`,
        });
      }

      const member = members[index];
      const today = new Date(`${paymentDate}T00:00:00`);

      const expiryIsValid =
        /^\d{4}-\d{2}-\d{2}$/.test(
          String(member.expiryDate || "")
        );

      const currentExpiry = expiryIsValid
        ? new Date(`${member.expiryDate}T00:00:00`)
        : today;

      const baseDate =
        currentExpiry.getTime() > today.getTime()
          ? currentExpiry
          : today;

      const newExpiry = new Date(baseDate);
      newExpiry.setMonth(
        newExpiry.getMonth() + planMonths[plan]
      );

      member.plan = plan;
      member.expiryDate =
        newExpiry.toISOString().split("T")[0];
      member.planFee = amount;
      member.feeReceived = amount;
      member.paymentMethod = paymentMethod;
      member.paymentStatus = "Paid";
      member.transactionId = transactionId || member.transactionId || "";
      member.paymentDate = paymentDate;
      member.status = "Active";

      members[index] = member;
      await writeMembers(members);

      return res.json({
        success: true,
        message: "Membership renewed successfully.",
        member,
      });
    } catch (error) {
      console.error("RENEW MEMBERSHIP ERROR:", error);
      return res.status(500).json({
        success: false,
        error:
          error.message ||
          "Failed to renew membership.",
      });
    }
  }
);

/* =========================================================
   CUSTOMER REGISTRATION
   PUBLIC ENDPOINT

   IMPORTANT:
   This now creates a PENDING REQUEST.

   It does NOT create a member immediately.
========================================================= */

app.post(
  "/api/customer/register",
  async (req, res) => {
    try {
      const incoming =
        req.body || {};

      const name =
        String(
          incoming.name || ""
        ).trim();

      const phone =
        String(
          incoming.phone || ""
        ).replace(/\D/g, "");

      const plan =
        String(
          incoming.plan || ""
        ).trim();

      const photo =
        String(
          incoming.photo || ""
        ).trim();

      const transactionId = String(incoming.transactionId || incoming.utr || incoming.paymentTransactionId || "").trim().replace(/\s+/g, "");
      const paymentAmount = getPlanFee(plan);
      /*
        No permanent Membership/Gym/Fingerprint ID is accepted from
        the public registration form. The ID is assigned only when
        an admin approves the request.
      */
      const paymentStatus = "Submitted";
      const paymentMethod = "UPI";
      const paymentDate = String(incoming.paymentDate || "").trim();

      /* -----------------------------------------
         BASIC VALIDATION
      ----------------------------------------- */

      if (!name) {
        return res.status(400).json({
          success: false,
          error:
            "Name is required.",
        });
      }

      if (!phone) {
        return res.status(400).json({
          success: false,
          error:
            "Phone number is required.",
        });
      }

      if (
        !/^[0-9]{10}$/.test(
          phone
        )
      ) {
        return res.status(400).json({
          success: false,
          error:
            "Please enter a valid 10-digit mobile number.",
        });
      }

      if (!plan) {
        return res.status(400).json({
          success: false,
          error:
            "Please select a plan.",
        });
      }

      if (!paymentAmount) {
        return res.status(400).json({ success: false, error: "Invalid membership plan." });
      }

      // Permanent member ID is assigned on approval.

      if (transactionId.length < 6 || transactionId.length > 50) {
        return res.status(400).json({ success: false, error: "Valid UTR / Transaction ID is required after payment." });
      }

      /* -----------------------------------------
         CHECK EXISTING MEMBERS
      ----------------------------------------- */

      await expireAndReleaseMemberIds();

      await expireAndReleaseMemberIds();

      const members =
        await readMembers();

      const existingMember =
        members.find(
          (member) =>
            String(
              member.phone || ""
            ).trim() === phone
        );

      if (existingMember) {
        return res.status(409).json({
          success: false,
          error:
            "A member with this phone number already exists.",
          memberId:
            existingMember.id,
        });
      }

      /* -----------------------------------------
         READ REGISTRATION REQUESTS
      ----------------------------------------- */

      const requests =
        await readRegistrationRequests();
      const existingTransaction = requests.find((request) => String(request.transactionId || "").trim().toLowerCase() === transactionId.toLowerCase());
      const memberTransaction = members.find((member) => String(member.transactionId || "").trim().toLowerCase() === transactionId.toLowerCase());
      if (existingTransaction || memberTransaction) {
        return res.status(409).json({ success: false, error: "This UTR / Transaction ID has already been submitted." });
      }



      /* -----------------------------------------
         CHECK DUPLICATE PENDING REQUEST
      ----------------------------------------- */

      const existingRequest =
        requests.find(
          (request) =>
            String(
              request.phone || ""
            ).trim() === phone &&
            String(
              request.status || ""
            ).toLowerCase() ===
              "pending"
        );

      if (existingRequest) {
        return res.status(409).json({
          success: false,
          error:
            "A registration request for this phone number is already pending.",
          requestId:
            existingRequest.requestId,
        });
      }

      /* -----------------------------------------
         GENERATE REQUEST ID
      ----------------------------------------- */

      const requestId =
        getNextRegistrationRequestId(
          requests
        );

      /* -----------------------------------------
         JOINING DATE
      ----------------------------------------- */

      const joiningDate =
        new Date()
          .toISOString()
          .split("T")[0];

      /* -----------------------------------------
         CREATE REQUEST
      ----------------------------------------- */

      const request =
        normalizeRegistrationRequest({
          requestId,

          memberId: "",
          customerId: "",
          gymId: "",
          fingerprintId: "",

          name,

          phone,

          plan,

          joiningDate,

          photo,

          paymentCompleted: false,
          paymentStatus: "Submitted",
          paymentMethod: "UPI",
          paymentAmount,
          transactionId,
          paymentDate: paymentDate || joiningDate,

          status:
            "Pending",

          createdAt:
            new Date().toISOString(),

          reviewedAt:
            "",
        });

      /* -----------------------------------------
         SAVE REQUEST
      ----------------------------------------- */

      requests.push(request);

      await writeRegistrationRequests(
        requests
      );

      console.log(
        `NEW REGISTRATION REQUEST: ${requestId} - ${name}`
      );

      /* -----------------------------------------
         RESPONSE
      ----------------------------------------- */

      return res.status(201).json({
        success: true,

        message:
          "Registration request submitted. Waiting for admin approval.",

        request: {
          requestId:
            request.requestId,

          name:
            request.name,

          phone:
            request.phone,

          plan:
            request.plan,

          joiningDate:
            request.joiningDate,

          status:
            request.status,
        },
      });
    } catch (error) {
      console.error(
        "CUSTOMER REGISTRATION REQUEST ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        error:
          error.message ||
          "Registration request failed.",
      });
    }
  }
);

/* =========================================================
   OLD PUBLIC REGISTRATION
   KEPT FOR COMPATIBILITY

   IMPORTANT:
   It ALSO creates a pending request now.
========================================================= */

app.post(
  "/api/public/register",
  async (req, res) => {
    try {
      const incoming =
        req.body || {};

      const customerId =
        String(
          incoming.customerId || ""
        ).trim();

      const fingerprintId =
        String(
          incoming.fingerprintId || ""
        ).trim();

      const memberId = "";
      const gymId = "";
      const paymentCompleted = incoming.paymentCompleted === true || String(incoming.paymentCompleted || "").toLowerCase() === "yes";
      const paymentStatus = "Submitted";
      const paymentMethod = "UPI";
      const paymentDate = String(incoming.paymentDate || "").trim();

      const name =
        String(
          incoming.name || ""
        ).trim();

      const phone =
        String(
          incoming.phone || ""
        ).replace(/\D/g, "");

      const plan =
        String(
          incoming.plan ||
            "Monthly"
        ).trim();

      const paymentAmount = getPlanFee(plan);
      const transactionId = String(incoming.transactionId || incoming.utr || incoming.paymentTransactionId || "").trim().replace(/\s+/g, "");

      const photo =
        String(
          incoming.photo || ""
        ).trim();

      if (!name) {
        return res.status(400).json({
          success: false,
          error:
            "Name is required.",
        });
      }

      if (
        phone.length !== 10
      ) {
        return res.status(400).json({
          success: false,
          error:
            "Valid 10-digit phone number is required.",
        });
      }

      // Permanent ID is assigned only after admin approval.

      if (transactionId.length < 6 || transactionId.length > 50) {
        return res.status(400).json({ success: false, error: "Valid UTR / Transaction ID is required after payment." });
      }

      const members =
        await readMembers();

      const existingMember =
        members.find(
          (member) =>
            String(
              member.phone || ""
            ).trim() === phone
        );

      if (existingMember) {
        return res.status(409).json({
          success: false,
          error:
            "A member with this phone number already exists.",
          memberId:
            existingMember.id,
        });
      }

      const requests =
        await readRegistrationRequests();
      const existingTransaction = requests.find((request) => String(request.transactionId || "").trim().toLowerCase() === transactionId.toLowerCase());
      const memberTransaction = members.find((member) => String(member.transactionId || "").trim().toLowerCase() === transactionId.toLowerCase());
      if (existingTransaction || memberTransaction) {
        return res.status(409).json({ success: false, error: "This UTR / Transaction ID has already been submitted." });
      }



      const existingRequest =
        requests.find(
          (request) =>
            String(
              request.phone || ""
            ).trim() === phone &&
            String(
              request.status || ""
            ).toLowerCase() ===
              "pending"
        );

      if (existingRequest) {
        return res.status(409).json({
          success: false,
          error:
            "A registration request for this phone number is already pending.",
          requestId:
            existingRequest.requestId,
        });
      }

      const requestId =
        getNextRegistrationRequestId(
          requests
        );

      const joiningDate =
        new Date()
          .toISOString()
          .split("T")[0];

      const request =
        normalizeRegistrationRequest({
          requestId,

          memberId: "",
          customerId: "",
          gymId: "",
          fingerprintId: "",

          name,

          phone,

          plan,

          joiningDate,

          photo,

          paymentCompleted: true,
          paymentStatus,
          paymentMethod,
          paymentAmount,
          transactionId,
          paymentDate: paymentDate || joiningDate,

          status:
            "Pending",

          createdAt:
            new Date().toISOString(),

          reviewedAt:
            "",
        });

      requests.push(request);

      await writeRegistrationRequests(
        requests
      );

      console.log(
        `PUBLIC REGISTRATION REQUEST: ${requestId} - ${name}`
      );

      return res.status(201).json({
        success: true,

        message:
          "Registration request submitted. Waiting for admin approval.",

        request: {
          requestId:
            request.requestId,

          name:
            request.name,

          phone:
            request.phone,

          plan:
            request.plan,

          joiningDate:
            request.joiningDate,

          status:
            request.status,
        },
      });
    } catch (error) {
      console.error(
        "PUBLIC REGISTRATION ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        error:
          error.message ||
          "Registration failed.",
      });
    }
  }
);

/* =========================================================
   GET REGISTRATION REQUESTS
   ðŸ”’ ADMIN ONLY
========================================================= */

app.get(
  "/api/expired-members",
  requireAuth,
  async (req, res) => {
    try {
      await expireAndReleaseMemberIds();

      const members =
        (await readExpiredMembers()).sort(
          (a, b) =>
            String(b.expiredAt || "").localeCompare(
              String(a.expiredAt || "")
            )
        );

      return res.json({
        success: true,
        members,
      });
    } catch (error) {
      console.error(
        "GET EXPIRED MEMBERS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        error:
          error.message ||
          "Failed to load expired members.",
      });
    }
  }
);

app.get(
  "/api/registration-requests",
  requireAuth,
  async (req, res) => {
    try {
      const requests =
        (await readRegistrationRequests()).filter((request) => String(request.status || "").trim().toLowerCase() === "pending");

      res.json({
        success: true,
        requests,
      });
    } catch (error) {
      console.error(
        "GET REGISTRATION REQUESTS ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        error:
          error.message ||
          "Failed to load registration requests.",
      });
    }
  }
);

// getExpiryDateFromPlan is defined in the core membership rules above.

/* =========================================================
   APPROVE REGISTRATION REQUEST
   ðŸ”’ ADMIN ONLY

   Pending Request
        â†“
   members.xlsx
========================================================= */

app.post(
  "/api/registration-requests/:id/approve",
  requireAuth,
  async (req, res) => {
    try {
      const requestId =
        String(
          req.params.id || ""
        ).trim();

      if (!requestId) {
        return res.status(400).json({
          success: false,
          error:
            "Request ID is required.",
        });
      }

      const requests =
        await readRegistrationRequests();


      const requestIndex =
        requests.findIndex(
          (request) =>
            String(
              request.requestId
            )
              .trim()
              .toLowerCase() ===
            requestId.toLowerCase()
        );

      if (
        requestIndex === -1
      ) {
        return res.status(404).json({
          success: false,
          error:
            "Registration request not found.",
        });
      }

      const request =
        requests[requestIndex];

      /* -----------------------------------------
         PREVENT DOUBLE APPROVAL
      ----------------------------------------- */

      if (
        String(
          request.status
        ).toLowerCase() !==
        "pending"
      ) {
        return res.status(409).json({
          success: false,
          error:
            `Request is already ${request.status}.`,
        });
      }

      /* -----------------------------------------
         READ CURRENT MEMBERS
      ----------------------------------------- */

      const members =
        await readMembers();

      /* -----------------------------------------
         CHECK PHONE AGAIN
      ----------------------------------------- */

      const existingMember =
        members.find(
          (member) =>
            String(
              member.phone || ""
            ).trim() ===
            String(
              request.phone || ""
            ).trim()
        );

      if (existingMember) {
        return res.status(409).json({
          success: false,
          error:
            "A member with this phone number already exists.",
          memberId:
            existingMember.id,
        });
      }

      /* -----------------------------------------
         ASSIGN A PERMANENT ID ON APPROVAL
      ----------------------------------------- */

      await expireAndReleaseMemberIds();

      const refreshedMembers =
        await readMembers();

      const memberId =
        getNextMemberId(
          refreshedMembers,
          requests
        );

      /* -----------------------------------------
         CREATE MEMBER
      ----------------------------------------- */

      const member =
        normalizeMember({
          id:
            memberId,

          memberId,

          customerId:
            memberId,

          gymId:
            memberId,

          fingerprintId:
            memberId,

          name:
            request.name,

          phone:
            request.phone,

          plan:
            request.plan,

          joiningDate:
            (() => {
              const raw = String(
                request.joiningDate ||
                request.createdAt ||
                ""
              ).trim();

              if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
                return raw;
              }

              const parsed = raw ? new Date(raw) : new Date();

              return Number.isNaN(parsed.getTime())
                ? new Date().toISOString().split("T")[0]
                : parsed.toISOString().split("T")[0];
            })(),

          expiryDate:
            (() => {
              const raw = String(
                request.joiningDate ||
                request.createdAt ||
                ""
              ).trim();

              const parsed = raw ? new Date(raw) : new Date();

              const validJoining =
                /^\d{4}-\d{2}-\d{2}$/.test(raw)
                  ? raw
                  : Number.isNaN(parsed.getTime())
                    ? new Date().toISOString().split("T")[0]
                    : parsed.toISOString().split("T")[0];

              return getExpiryDateFromPlan(
                validJoining,
                request.plan
              );
            })(),

          planFee:
            Number(request.paymentAmount) || getPlanFee(request.plan),

          feeReceived:
            Number(request.paymentAmount) || getPlanFee(request.plan),

          paymentMethod:
            request.paymentMethod || "UPI",

          paymentStatus:
            "Paid",

          paymentCompleted:
            true,

          paymentAmount:
            Number(request.paymentAmount) || getPlanFee(request.plan),

          transactionId:
            String(request.transactionId || request.utr || request.paymentTransactionId || "").trim(),

          paymentDate:
            request.paymentDate || request.joiningDate || "",

          status:
            "Active",

          fingerprintAccess:
            "false",

          photo:
            request.photo,
        });

      /* -----------------------------------------
         ADD TO MEMBERS
      ----------------------------------------- */

      refreshedMembers.push(member);

      await writeMembers(
        refreshedMembers
      );

      /* -----------------------------------------
         CLEAR APPROVED REQUEST
         The member is now stored in members.xlsx.
         The pending request is removed permanently.
      ----------------------------------------- */

      requests.splice(
        requestIndex,
        1
      );

      await writeRegistrationRequests(
        requests
      );

      console.log(
        `REGISTRATION APPROVED + REQUEST REMOVED: ${request.requestId} -> ${member.id}`
      );

      return res.json({
        success: true,

        message:
          "Registration approved successfully.",

        member,

        request: {
          ...request,
          status: "Approved",
          reviewedAt:
            new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error(
        "APPROVE REGISTRATION ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        error:
          error.message ||
          "Failed to approve registration.",
      });
    }
  }
);

/* =========================================================
   REJECT REGISTRATION REQUEST
   ðŸ”’ ADMIN ONLY
========================================================= */

app.post(
  "/api/registration-requests/:id/reject",
  requireAuth,
  async (req, res) => {
    try {
      const requestId =
        String(
          req.params.id || ""
        ).trim();

      if (!requestId) {
        return res.status(400).json({
          success: false,
          error:
            "Request ID is required.",
        });
      }

      const requests =
        await readRegistrationRequests();


      const requestIndex =
        requests.findIndex(
          (request) =>
            String(
              request.requestId
            )
              .trim()
              .toLowerCase() ===
            requestId.toLowerCase()
        );

      if (
        requestIndex === -1
      ) {
        return res.status(404).json({
          success: false,
          error:
            "Registration request not found.",
        });
      }

      const request =
        requests[requestIndex];

      /* -----------------------------------------
         PREVENT DOUBLE REJECTION
      ----------------------------------------- */

      if (
        String(
          request.status
        ).toLowerCase() !==
        "pending"
      ) {
        return res.status(409).json({
          success: false,
          error:
            `Request is already ${request.status}.`,
        });
      }

      /* -----------------------------------------
         REMOVE REJECTED REQUEST
         Rejected registrations are not persisted.
      ----------------------------------------- */

      requests.splice(
        requestIndex,
        1
      );

      await writeRegistrationRequests(
        requests
      );

      console.log(
        `REGISTRATION REJECTED AND REMOVED: ${request.requestId}`
      );

      return res.json({
        success: true,

        message:
          "Registration rejected and removed.",

        request: {
          ...request,
          status: "Rejected",
          reviewedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error(
        "REJECT REGISTRATION ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        error:
          error.message ||
          "Failed to reject registration.",
      });
    }
  }
);

/* =========================================================
   DAILY EXCEL EXPORT
   Creates one dated snapshot every day.
========================================================= */

function getDailyExportDirectory() {
  const dir = path.join(__dirname, "daily_exports");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

async function createDailyExcelExport() {
  try {
    const members = await readMembers();
    const requests = await readRegistrationRequests();
    const today = new Date().toISOString().split("T")[0];
    const file = path.join(getDailyExportDirectory(), `gym_data_${today}.xlsx`);

    const workbook = XLSX.utils.book_new();

    const summary = [{
      exportDate: today,
      generatedAt: new Date().toISOString(),
      totalMembers: members.length,
      pendingRegistrations: requests.filter(r => String(r.status || "").toLowerCase() === "pending").length,
      firstMemberId: members.length ? String(members[0].memberId || members[0].id || "") : "",
    }];

    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summary), "Summary");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(members, { header: HEADERS }), "Members");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(requests, { header: REGISTRATION_REQUEST_HEADERS }), "Registration Requests");

    XLSX.writeFile(workbook, file);
    console.log(`DAILY EXCEL EXPORT: ${file}`);
  } catch (error) {
    console.error("DAILY EXCEL EXPORT ERROR:", error);
  }
}

function scheduleDailyExcelExport() {
  createDailyExcelExport().catch(error => console.error("DAILY EXCEL EXPORT ERROR:", error));

  const now = new Date();
  const next = new Date(now);
  next.setHours(23, 59, 59, 999);
  if (next <= now) next.setDate(next.getDate() + 1);

  setTimeout(() => {
    createDailyExcelExport().catch(error => console.error("DAILY EXCEL EXPORT ERROR:", error));
    setInterval(() => {
      createDailyExcelExport().catch(error => console.error("DAILY EXCEL EXPORT ERROR:", error));
    }, 24 * 60 * 60 * 1000);
  }, next.getTime() - now.getTime());
}

/* =========================================================
   CLEAN EXPIRED SESSIONS
========================================================= */

setInterval(() => {
  const now =
    Date.now();

  for (
    const [
      token,
      session,
    ] of sessions
  ) {
    if (
      now >=
      session.expiresAt
    ) {
      sessions.delete(
        token
      );
    }
  }
}, 30 * 60 * 1000);

/* =========================================================
   ROOT
========================================================= */

app.get(
  "/",
  async (req, res) => {
    res.json({
      success: true,
      message:
        "Gym Management Server is running.",
      server:
        `http://localhost:${PORT}`,
    });
  }
);

/* =========================================================
   START SERVER
========================================================= */

/*
  Membership expiry is a server-side database operation.
  Run immediately on startup, then every hour.
*/
expireAndReleaseMemberIds().catch(error => console.error("STARTUP EXPIRY ERROR:", error));
setInterval(
  () => expireAndReleaseMemberIds().catch(error => console.error("HOURLY EXPIRY ERROR:", error)),
  60 * 60 * 1000
);

scheduleDailyExcelExport();

app.listen(
  PORT,
  () => {
    console.log("");
    console.log(
      "======================================"
    );
    console.log(
      "       GYM SERVER STARTED"
    );
    console.log(
      "======================================"
    );
    console.log(
      `Server: http://localhost:${PORT}`
    );
    console.log(
      `Test:   http://localhost:${PORT}/api/test`
    );
    console.log(
      `Excel:  ${getExcelPath()}`
    );
    console.log(
      `Requests: ${getRegistrationRequestsPath()}`
    );
    console.log(
      "======================================"
    );
    console.log("");
  }
);









