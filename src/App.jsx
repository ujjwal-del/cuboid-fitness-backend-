import { useEffect, useMemo, useState } from "react";

import {
  AppBar,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  MenuItem as MuiMenuItem,
  TextField,
  Toolbar,
  Typography,
} from "@mui/material";

import {
  Dashboard as DashboardIcon,
  People,
  Payments,
  AccountBalanceWallet,
  Settings,
  Search,
  PersonAdd,
  Warning,
  CheckCircle,
  Cancel,
  PhotoCamera,
  Delete as DeleteIcon,
  Logout,
  Visibility,
  VisibilityOff,
  Lock,
  WhatsApp,
  Send,
  SelectAll,
  ClearAll,
  Message,
    PendingActions,
  ThumbUp,
  ThumbDown,
  TrendingUp,
  TrendingDown,
  CalendarMonth,
  NotificationsNone,
  MoreHoriz,
  Close,
  Email,
  Phone,
  EventAvailable,
  MonetizationOn,
  GroupAdd,
  FitnessCenter,
  ArrowUpward,
  ChevronRight,
  BarChart,
  PieChart,
  Edit,
  Save,
} from "@mui/icons-material";


const drawerWidth = 240;

const API_URL = "http://localhost:3001";
const PLAN_FEES = { Monthly: 1700, Quarterly: 4500, "Half Year": 8000, Yearly: 13999 };
const getPlanFee = (plan) => PLAN_FEES[plan] || 0;

/* =========================================================
   AUTH STORAGE
========================================================= */

function getStoredToken() {
  return localStorage.getItem("gym_admin_token");
}

function storeToken(token) {
  localStorage.setItem("gym_admin_token", token);
}

function removeToken() {
  localStorage.removeItem("gym_admin_token");
}

/* =========================================================
   AUTHENTICATED FETCH
========================================================= */

async function authFetch(url, options = {}) {
  const token = getStoredToken();

  const headers = {
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return fetch(url, {
    ...options,
    headers,
  });
}

/* =========================================================
   EXPIRY DATE
========================================================= */

function getExpiryDate(joiningDate, plan) {
  if (!joiningDate) return "";

  // Membership duration is determined by the selected plan:
  // Monthly = 1 month
  // Quarterly = 3 months
  // Half Year = 6 months
  // Yearly = 12 months
  const planMonths = {
    Monthly: 1,
    Quarterly: 3,
    "Half Year": 6,
    Yearly: 12,
  };

  const monthsToAdd = planMonths[plan] || 1;

  // Use local calendar components so changing either the
  // joining date OR plan immediately produces the correct expiry.
  const [year, month, day] = String(joiningDate)
    .split("-")
    .map(Number);

  if (!year || !month || !day) return "";

  // Start on the first day of the target month, then clamp the
  // original day to the last valid day of that target month.
  const target = new Date(
    year,
    month - 1 + monthsToAdd,
    1
  );

  const lastDay = new Date(
    target.getFullYear(),
    target.getMonth() + 1,
    0
  ).getDate();

  target.setDate(Math.min(day, lastDay));

  return [
    target.getFullYear(),
    String(target.getMonth() + 1).padStart(2, "0"),
    String(target.getDate()).padStart(2, "0"),
  ].join("-");
}

/* =========================================================
   FORMAT JOINING DATE
========================================================= */

function formatDisplayDate(dateString) {
  if (!dateString) return "—";

  const date = new Date(`${dateString}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/* =========================================================
   FORMAT PHONE FOR WHATSAPP
========================================================= */

function getWhatsAppNumber(phone) {
  if (!phone) return "";

  let number = String(phone).replace(/\D/g, "");

  /*
    India numbers:
    9876543210
    919876543210
  */

  if (number.length === 10) {
    number = `91${number}`;
  }

  return number;
}

/* =========================================================
   REPLACE MESSAGE VARIABLES
========================================================= */

function prepareWhatsAppMessage(message, member) {
  return message
    .replace(/\{name\}/gi, member.name || "")
    .replace(/\{id\}/gi, member.id || "")
    .replace(/\{phone\}/gi, member.phone || "")
    .replace(/\{plan\}/gi, member.plan || "")
    .replace(/\{expiry\}/gi, member.expiryDate || "");
}

/* =========================================================
   MAIN APP
========================================================= */

function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(false);

  useEffect(() => {
  async function checkLogin() {
    const token = getStoredToken();

    if (!token) {
      setAuthenticated(false);
      setCheckingAuth(false);
      return;
    }

    try {
      const response = await authFetch(
        `${API_URL}/api/auth/check`
      );

      if (response.ok) {
        setAuthenticated(true);
      } else {
        removeToken();
        setAuthenticated(false);
      }
    } catch (error) {
      console.error("AUTH CHECK ERROR:", error);
      removeToken();
      setAuthenticated(false);
    } finally {
      setCheckingAuth(false);
    }
  }

  checkLogin();
}, []);

  if (checkingAuth) {
    return <LoadingScreen />;
  }

  if (!authenticated) {
    return (
      <LoginScreen
        onLogin={() => setAuthenticated(true)}
      />
    );
  }

  return (
    <GymDashboard
      onLogout={() => {
        setAuthenticated(false);
      }}
    />
  );
}

/* =========================================================
   LOGIN SCREEN
========================================================= */

function LoginScreen({ onLogin }) {
  const [adminId, setAdminId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    setError("");

    if (!adminId.trim()) {
      setError("Please enter Admin ID.");
      return;
    }

    if (!password) {
      setError("Please enter password.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          adminId: adminId.trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Invalid login.");
      }

      storeToken(data.token);
      setPassword("");
      onLogin();
    } catch (error) {
      console.error("LOGIN ERROR:", error);

      setError(
        error.message || "Login failed."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(event) {
    if (event.key === "Enter") {
      handleLogin();
    }
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "#050505",
        px: 2,
      }}
    >
      <Card
        sx={{
          width: "100%",
          maxWidth: 430,
          borderRadius: 4,
          boxShadow:
            "0 15px 50px rgba(0,0,0,0.12)",
        }}
      >
        <CardContent sx={{ p: 5 }}>
          <Box
            sx={{
              textAlign: "center",
              mb: 4,
            }}
          >
            <Avatar
              sx={{
                width: 75,
                height: 75,
                mx: "auto",
                mb: 2,
                bgcolor: "#FFD000",
              }}
            >
              <Lock fontSize="large" />
            </Avatar>

            <Typography
              variant="h4"
              fontWeight="bold"
            >
              GYM ADMIN
            </Typography>

            <Typography
              color="text.secondary"
              sx={{ mt: 1 }}
            >
              Admin Login
            </Typography>
          </Box>

          <TextField
            fullWidth
            label="Admin ID"
            value={adminId}
            onChange={(e) =>
              setAdminId(e.target.value)
            }
            onKeyDown={handleKeyDown}
            autoFocus
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Password"
            type={
              showPassword
                ? "text"
                : "password"
            }
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            onKeyDown={handleKeyDown}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() =>
                      setShowPassword(
                        (value) => !value
                      )
                    }
                    edge="end"
                  >
                    {showPassword ? (
                      <VisibilityOff />
                    ) : (
                      <Visibility />
                    )}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          {error && (
            <Box
              sx={{
                mt: 2,
                p: 1.5,
                borderRadius: 2,
                bgcolor: "#ffebee",
                color: "#c62828",
              }}
            >
              <Typography variant="body2">
                {error}
              </Typography>
            </Box>
          )}

          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={handleLogin}
            disabled={loading}
            sx={{
              mt: 3,
              py: 1.5,
              borderRadius: 2,
              textTransform: "none",
              fontSize: 16,
              fontWeight: "bold",
            }}
          >
            {loading
              ? "Logging in..."
              : "Login"}
          </Button>

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: "block",
              textAlign: "center",
              mt: 3,
            }}
          >
            Authorized gym administrators only.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}

/* =========================================================
   LOADING
========================================================= */

function LoadingScreen() {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "#050505",
      }}
    >
      <Typography
        variant="h6"
        color="text.secondary"
      >
        Checking login...
      </Typography>
    </Box>
  );
}

/* =========================================================
   GYM DASHBOARD
========================================================= */

function GymDashboard({ onLogout }) {
  const getLocalToday = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const [today, setToday] = useState(getLocalToday);

  useEffect(() => {
    const updateToday = () => setToday(getLocalToday());
    const timer = setInterval(updateToday, 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const [page, setPage] =
    useState("Dashboard");

  const [members, setMembers] =
    useState([]);
    const [registrationRequests, setRegistrationRequests] = useState([]);
  const [expiredMembers, setExpiredMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [openEditMember, setOpenEditMember] = useState(false);
  const [savingEditMember, setSavingEditMember] = useState(false);
  const [editMemberForm, setEditMemberForm] = useState({
    memberId: "", name: "", phone: "", plan: "Monthly", joiningDate: "",
    expiryDate: "", planFee: "0", feeReceived: "0", paymentMethod: "",
    paymentStatus: "Pending", paymentCompleted: false, paymentDate: "", transactionId: "", paymentAmount: "0",
    status: "Active", fingerprintAccess: "Disabled",
  });

  const [openRenewMember, setOpenRenewMember] =
    useState(false);

  const [renewForm, setRenewForm] = useState({
    plan: "Monthly",
    amount: "1700",
    paymentMethod: "UPI",
    paymentDate: today,
  });

  const [search, setSearch] =
    useState("");

  const [openAddMember, setOpenAddMember] =
    useState(false);

  const [nextMemberId, setNextMemberId] =
    useState("GYM-00001");

  const [form, setForm] = useState({
    fingerprintId: "",
    name: "",
    phone: "",
    plan: "Monthly",
    joiningDate: today,
    planFee: "1700",
    feeReceived: "1700",
    paymentMethod: "UPI",
    paymentStatus: "Paid",
    photo: "",
  });

  /* =======================================================
     WHATSAPP STATE
  ======================================================= */

  const [selectedWhatsAppMembers, setSelectedWhatsAppMembers] =
    useState([]);

  const [whatsappMessage, setWhatsappMessage] =
    useState(
      "Hello {name},\n\nYour gym membership ({id}) will expire on {expiry}.\n\nPlease contact the gym for renewal.\n\nThank you!"
    );

  const [whatsappFilter, setWhatsappFilter] =
    useState("All");

  /* =======================================================
     LOAD MEMBERS
  ======================================================= */

  async function loadMembers() {
    try {
      const response = await authFetch(
        `${API_URL}/api/members`
      );

      if (response.status === 401) {
        handleSessionExpired();
        return;
      }

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Failed to load members"
        );
      }

      setMembers(data.members || []);
    } catch (error) {
      console.error(
        "LOAD MEMBERS ERROR:",
        error
      );

      alert(
        "Could not load members.\n\nMake sure server.cjs is running."
      );
    }
  }


  async function loadRegistrationRequests() {
    try {
      const response = await authFetch(
        `${API_URL}/api/registration-requests`
      );

      if (response.status === 401) {
        handleSessionExpired();
        return;
      }

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Failed to load registration requests"
        );
      }

      setRegistrationRequests(data.requests || []);
    } catch (error) {
      console.error("LOAD REGISTRATION REQUESTS ERROR:", error);
      alert(`Could not load registration requests.\n\n${error.message}`);
    }
  }

  async function loadExpiredMembers() {
    try {
      const response = await authFetch(
        `${API_URL}/api/expired-members`
      );

      if (response.status === 401) {
        handleSessionExpired();
        return;
      }

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
          "Failed to load expired members"
        );
      }

      setExpiredMembers(
        data.members || []
      );
    } catch (error) {
      console.error(
        "LOAD EXPIRED MEMBERS ERROR:",
        error
      );
    }
  }

  async function approveRegistrationRequest(request) {
    try {
      const requestId = request.requestId;

      if (!requestId) {
        throw new Error("Registration requestId is missing.");
      }

      const response = await authFetch(
        `${API_URL}/api/registration-requests/${encodeURIComponent(
          requestId
        )}/approve`,
        { method: "POST" }
      );

      if (response.status === 401) {
        handleSessionExpired();
        return;
      }

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Failed to approve registration"
        );
      }

      await loadRegistrationRequests();
      await loadMembers();
      await loadExpiredMembers();
      await loadNextMemberId();

      alert(`${request.name} approved successfully.`);
    } catch (error) {
      console.error("APPROVE REGISTRATION ERROR:", error);
      alert(`Could not approve registration.\n\n${error.message}`);
    }
  }

  async function rejectRegistrationRequest(request) {
    const confirmed = window.confirm(
      `Reject this registration?\n\n` +
      `Name: ${request.name}\n` +
      `Phone: ${request.phone}`
    );

    if (!confirmed) return;

    try {
      const requestId = request.requestId;

      if (!requestId) {
        throw new Error("Registration requestId is missing.");
      }

      const response = await authFetch(
        `${API_URL}/api/registration-requests/${encodeURIComponent(
          requestId
        )}/reject`,
        { method: "POST" }
      );

      if (response.status === 401) {
        handleSessionExpired();
        return;
      }

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Failed to reject registration"
        );
      }

      await loadRegistrationRequests();
      alert(`${request.name}'s registration rejected.`);
    } catch (error) {
      console.error("REJECT REGISTRATION ERROR:", error);
      alert(`Could not reject registration.\n\n${error.message}`);
    }
  }

  /* =======================================================
     LOAD NEXT MEMBER ID
  ======================================================= */

  async function loadNextMemberId() {
    try {
      const response = await authFetch(
        `${API_URL}/api/next-member-id`
      );

      if (response.status === 401) {
        handleSessionExpired();
        return;
      }

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Failed to get next member ID"
        );
      }

      setNextMemberId(data.id);
    } catch (error) {
      console.error(
        "NEXT ID ERROR:",
        error
      );
    }
  }

  /* =======================================================
     SESSION EXPIRED
  ======================================================= */

  function handleSessionExpired() {
    removeToken();

    alert(
      "Your admin session has expired. Please login again."
    );

    onLogout();
  }

  /* =======================================================
     LOGOUT
  ======================================================= */

  async function handleLogout() {
    const confirmed = window.confirm(
      "Are you sure you want to logout?"
    );

    if (!confirmed) return;

    try {
      await authFetch(
        `${API_URL}/api/logout`,
        {
          method: "POST",
        }
      );
    } catch (error) {
      console.error(
        "LOGOUT ERROR:",
        error
      );
    }

    removeToken();
    onLogout();
  }

  /* =======================================================
     INITIAL LOAD
  ======================================================= */
useEffect(() => {
  let mounted = true;

  // Load only the essential data first.
  loadMembers();

  // Secondary data loads after the main member list.
  const backgroundTimer = setTimeout(() => {
    if (!mounted) return;

    loadRegistrationRequests();
    loadExpiredMembers();
  }, 300);

  // Refresh in the background every 60 seconds.
  const refreshTimer = setInterval(() => {
    if (!mounted) return;

    loadMembers();

    setTimeout(() => {
      if (mounted) loadRegistrationRequests();
    }, 500);

    setTimeout(() => {
      if (mounted) loadExpiredMembers();
    }, 1000);
  }, 60 * 1000);

  return () => {
    mounted = false;
    clearTimeout(backgroundTimer);
    clearInterval(refreshTimer);
  };
}, []);
  /* =======================================================
     EXPIRY DATE
  ======================================================= */

  const expiryDate = getExpiryDate(
    form.joiningDate,
    form.plan
  );

  /* =======================================================
     MEMBER STATUS
  ======================================================= */

  const membersWithCorrectStatus = useMemo(() => {
    const todayDate = new Date(
      `${today}T00:00:00`
    );

    return members.map((member) => {
      if (!member.expiryDate) {
        return {
          ...member,
          status:
            member.status || "Active",
        };
      }

      const expiry = new Date(
        `${member.expiryDate}T00:00:00`
      );

      return {
        ...member,
        status:
          expiry < todayDate
            ? "Expired"
            : "Active",
      };
    });
  }, [members, today]);

  /* =======================================================
     SEARCH
  ======================================================= */

  const filteredMembers = useMemo(() => {
    const value = search
      .trim()
      .toLowerCase();

    if (!value) {
      return membersWithCorrectStatus;
    }

    return membersWithCorrectStatus.filter(
      (member) =>
        String(member.id || "")
          .toLowerCase()
          .includes(value) ||
        String(member.name || "")
          .toLowerCase()
          .includes(value) ||
        String(member.phone || "")
          .toLowerCase()
          .includes(value) ||
        String(member.fingerprintId || "")
          .toLowerCase()
          .includes(value)
    );
  }, [
    membersWithCorrectStatus,
    search,
  ]);

  /* =======================================================
     STATISTICS
  ======================================================= */

  const activeMembers =
    membersWithCorrectStatus.filter(
      (member) =>
        member.status === "Active"
    ).length;

  const expiredMembersCount =
    membersWithCorrectStatus.filter(
      (member) =>
        member.status === "Expired"
    ).length;

  const expiringSoonList =
    membersWithCorrectStatus.filter(
      (member) => {
        if (
          !member.expiryDate ||
          member.status === "Expired"
        ) {
          return false;
        }

        const todayDate = new Date(
          `${today}T00:00:00`
        );

        const expiry = new Date(
          `${member.expiryDate}T00:00:00`
        );

        const difference =
          (expiry - todayDate) /
          (1000 * 60 * 60 * 24);

        return (
          difference >= 0 &&
          difference <= 3
        );
      }
    );

  const expiringSoon =
    expiringSoonList.length;

  const expiredMemberList =
    expiredMembers;

  /* =======================================================
     WHATSAPP MEMBERS
  ======================================================= */

  const whatsappMembers = useMemo(() => {
    if (whatsappFilter === "Expired") {
      return membersWithCorrectStatus.filter(
        (member) =>
          member.status === "Expired"
      );
    }

    if (whatsappFilter === "Expiring") {
      return membersWithCorrectStatus.filter(
        (member) =>
          expiringSoonList.some(
            (item) =>
              item.id === member.id
          )
      );
    }

    if (whatsappFilter === "Active") {
      return membersWithCorrectStatus.filter(
        (member) =>
          member.status === "Active"
      );
    }

    return membersWithCorrectStatus;
  }, [
    whatsappFilter,
    membersWithCorrectStatus,
    expiringSoonList,
  ]);

  /* =======================================================
     WHATSAPP SELECT
  ======================================================= */

  function toggleWhatsAppMember(memberId) {
    setSelectedWhatsAppMembers(
      (current) => {
        if (current.includes(memberId)) {
          return current.filter(
            (id) => id !== memberId
          );
        }

        return [...current, memberId];
      }
    );
  }

  function selectAllWhatsApp() {
    setSelectedWhatsAppMembers(
      whatsappMembers.map(
        (member) => member.id
      )
    );
  }

  function clearWhatsAppSelection() {
    setSelectedWhatsAppMembers([]);
  }

  function isWhatsAppSelected(memberId) {
    return selectedWhatsAppMembers.includes(
      memberId
    );
  }

  /* =======================================================
     SEND WHATSAPP
  ======================================================= */

  function sendWhatsAppMessage(member) {
    const number = getWhatsAppNumber(
      member.phone
    );

    if (!number) {
      alert(
        `${member.name} does not have a valid phone number.`
      );
      return;
    }

    const message =
      prepareWhatsAppMessage(
        whatsappMessage,
        member
      );

    const url =
      `https://wa.me/${number}?text=` +
      encodeURIComponent(message);

    window.open(
      url,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function sendToSelectedWhatsApp() {
    const selected = membersWithCorrectStatus.filter(
      (member) =>
        selectedWhatsAppMembers.includes(member.id)
    );

    if (selected.length === 0) {
      alert("Please select at least one member.");
      return;
    }

    if (!whatsappMessage.trim()) {
      alert("Please write a WhatsApp message.");
      return;
    }

    const validMembers = selected.filter(
      (member) =>
        member.phone &&
        String(member.phone).trim()
    );

    const invalidCount =
      selected.length - validMembers.length;

    if (validMembers.length === 0) {
      alert(
        "None of the selected members have a phone number."
      );
      return;
    }

    const confirmed = window.confirm(
      `Send WhatsApp message to ${validMembers.length} member(s)?` +
      (invalidCount > 0
        ? `\n\n${invalidCount} member(s) will be skipped because they have no phone number.`
        : "")
    );

    if (!confirmed) return;

    let index = 0;

    const sendNext = () => {
      if (index >= validMembers.length) {
        alert(
          `WhatsApp batch completed.\n\n` +
          `Processed: ${validMembers.length}` +
          (invalidCount > 0
            ? `\nSkipped: ${invalidCount}`
            : "")
        );
        return;
      }

      const member = validMembers[index];

      sendWhatsAppMessage(member);

      index++;

      setTimeout(sendNext, 1000);
    };

    sendNext();
  }

  /* =======================================================
     FORM UPDATE
  ======================================================= */

  function updateForm(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  /* =======================================================
     PHOTO
  ======================================================= */

  function handlePhoto(event) {
    const file =
      event.target.files?.[0];

    if (!file) return;

    const reader =
      new FileReader();

    reader.onload = () => {
      updateForm(
        "photo",
        reader.result
      );
    };

    reader.readAsDataURL(file);
  }

  /* =======================================================
     RESET FORM
  ======================================================= */

  function resetForm() {
    setForm({
      fingerprintId: "",
      name: "",
      phone: "",
      plan: "Monthly",
      joiningDate: today,
      planFee: "1000",
      feeReceived: "1000",
      paymentMethod: "UPI",
      paymentStatus: "Paid",
      photo: "",
    });
  }

  /* =======================================================
     OPEN ADD MEMBER
  ======================================================= */

  async function openAddMemberDialog() {
    await loadNextMemberId();

    resetForm();

    setOpenAddMember(true);
  }

  /* =======================================================
     REGISTER MEMBER
  ======================================================= */

  async function handleRegister() {
    if (!form.name.trim()) {
      alert(
        "Please enter the member name."
      );
      return;
    }

    if (!form.phone.trim()) {
      alert(
        "Please enter the phone number."
      );
      return;
    }

    const newMember = {
      fingerprintId:
        form.fingerprintId,

      name:
        form.name.trim(),

      phone:
        form.phone.trim(),

      plan:
        form.plan,

      joiningDate:
        form.joiningDate,

      expiryDate,

      planFee:
        Number(form.planFee) || 0,

      feeReceived:
        Number(form.feeReceived) || 0,

      paymentMethod:
        form.paymentMethod,

      paymentStatus:
        form.paymentStatus,

      paymentDate:
        form.joiningDate,

      status: "Active",

      fingerprintAccess:
        "Disabled",

      photo:
        form.photo || "",
    };

    try {
      const response = await authFetch(
        `${API_URL}/api/members`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(
            newMember
          ),
        }
      );

      if (response.status === 401) {
        handleSessionExpired();
        return;
      }

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
            "Failed to save member"
        );
      }

      await loadMembers();
      await loadNextMemberId();

      setOpenAddMember(false);

      resetForm();

      setPage("Members");

      alert(
        `${data.id} registered successfully!`
      );
    } catch (error) {
      console.error(
        "REGISTER ERROR:",
        error
      );

      alert(
        `Could not save member.\n\n${error.message}`
      );
    }
  }

  /* =======================================================
     EDIT MEMBER
  ======================================================= */

  function openMemberEditor(member) {
    if (!member) return;
    setEditMemberForm({
      memberId: String(member.id || member.memberId || member.fingerprintId || ""),
      name: member.name || "", phone: member.phone || "", plan: member.plan || "Monthly",
      joiningDate: member.joiningDate || "", expiryDate: member.expiryDate || "",
      planFee: String(member.planFee ?? 0), feeReceived: String(member.feeReceived ?? 0),
      paymentMethod: member.paymentMethod || "", paymentStatus: member.paymentStatus || "Pending", transactionId: member.transactionId || member.utr || member.paymentTransactionId || "", paymentAmount: String(member.paymentAmount ?? member.planFee ?? 0),
      paymentCompleted: member.paymentCompleted === true || String(member.paymentCompleted).toLowerCase() === "true",
      paymentDate: member.paymentDate || "", status: member.status || "Active",
      fingerprintAccess: member.fingerprintAccess || "Disabled",
    });
    setOpenEditMember(true);
  }

  function updateEditMemberForm(field, value) {
    setEditMemberForm((current) => ({ ...current, [field]: value }));
  }

  async function handleUpdateMember() {
    if (!selectedMember) return;
    if (!/^\d+$/.test(String(editMemberForm.memberId || "").trim())) {
      alert("Member / Gym / Fingerprint ID must contain numbers only."); return;
    }
    if (!editMemberForm.name.trim()) { alert("Please enter the member name."); return; }
    const normalizedPhone = String(editMemberForm.phone ?? "")
      .replace(/\D/g, "")
      .slice(0, 10);

    if (normalizedPhone && !/^\d{10}$/.test(normalizedPhone)) {
      alert("Phone number must contain exactly 10 digits."); return;
    }

    const payload = {
      ...editMemberForm,
      phone: normalizedPhone,
    };

    setSavingEditMember(true);
    try {
      const response = await authFetch(
        `${API_URL}/api/members/${encodeURIComponent(selectedMember.id)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (response.status === 401) { handleSessionExpired(); return; }
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Failed to update member.");
      setSelectedMember(data.member);
      setOpenEditMember(false);
      await loadMembers();
      await loadNextMemberId();
    } catch (error) {
      console.error("UPDATE MEMBER ERROR:", error);
      alert(`Could not update member.\n\n${error.message}`);
    } finally { setSavingEditMember(false); }
  }

  /* =======================================================
     DELETE MEMBER
  ======================================================= */

  async function handleDeleteMember(
    member
  ) {
    const confirmed =
      window.confirm(
        `Are you sure you want to delete this member?\n\n` +
          `Member ID: ${member.id}\n` +
          `Name: ${member.name}\n\n` +
          `This will permanently remove the member from Excel.`
      );

    if (!confirmed) return;

    try {
      const response =
        await authFetch(
          `${API_URL}/api/members/${encodeURIComponent(
            member.id
          )}`,
          {
            method: "DELETE",
          }
        );

      if (response.status === 401) {
        handleSessionExpired();
        return;
      }

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
            "Failed to delete member"
        );
      }

      setSelectedWhatsAppMembers(
        (current) =>
          current.filter(
            (id) =>
              id !== member.id
          )
      );

      await loadMembers();
      await loadNextMemberId();

      alert(
        `${member.id} deleted successfully.`
      );
    } catch (error) {
      console.error(
        "DELETE MEMBER ERROR:",
        error
      );

      alert(
        `Could not delete member.\n\n${error.message}`
      );
    }
  }

  /* =======================================================
     MANUAL MEMBERSHIP RENEWAL
  ======================================================= */

  async function handleRenewMembership() {
    if (!selectedMember) return;

    const amount = Number(renewForm.amount) || 0;

    if (amount <= 0) {
      alert("Please enter the renewal amount.");
      return;
    }

    try {
      const response = await authFetch(
        `${API_URL}/api/members/${encodeURIComponent(
          selectedMember.id
        )}/renew`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            plan: renewForm.plan,
            amount,
            paymentMethod: renewForm.paymentMethod,
            paymentDate:
              renewForm.paymentDate || today,
          }),
        }
      );

      if (response.status === 401) {
        handleSessionExpired();
        return;
      }

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Failed to renew membership."
        );
      }

      setSelectedMember(data.member);
      setOpenRenewMember(false);

      await loadMembers();

      alert(
        `${data.member.id} renewed successfully until ${data.member.expiryDate}.`
      );
    } catch (error) {
      console.error(
        "RENEW MEMBERSHIP ERROR:",
        error
      );

      alert(
        `Could not renew membership.\n\n${error.message}`
      );
    }
  }

  /* =======================================================
     PLAN CHANGE
  ======================================================= */

  function handlePlanChange(plan) {
    const fees = {
      Monthly: "1700",
      Quarterly: "4500",
      "Half Year": "8000",
      Yearly: "13999",
    };

    setForm((current) => ({
      ...current,
      plan,
      planFee:
        fees[plan] || "0",
      feeReceived:
        fees[plan] || "0",
    }));
  }

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const normalizePlanName = (value) => {
  const p = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

  if (
    p === "monthly" ||
    p === "month" ||
    p === "1 month"
  ) {
    return "Monthly";
  }

  if (
    p === "quarterly" ||
    p === "quarter" ||
    p === "3 months" ||
    p === "3 month"
  ) {
    return "Quarterly";
  }

  if (
    p === "half year" ||
    p === "half-year" ||
    p === "half yearly" ||
    p === "halfyear" ||
    p === "6 months" ||
    p === "6 month"
  ) {
    return "Half Year";
  }

  if (
    p === "yearly" ||
    p === "year" ||
    p === "annual" ||
    p === "12 months" ||
    p === "12 month"
  ) {
    return "Yearly";
  }

  return String(value || "").trim();
};

const planStats = [
  "Monthly",
  "Quarterly",
  "Half Year",
  "Yearly",
].map((plan) => ({
  plan,
  count: membersWithCorrectStatus.filter(
    (member) =>
      normalizePlanName(member.plan) === plan
  ).length,
}));

  const newThisMonth = membersWithCorrectStatus.filter((member) => {
    if (!member.joiningDate) return false;
    const d = new Date(`${member.joiningDate}T00:00:00`);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).length;

  const monthlyRevenue = membersWithCorrectStatus.reduce((sum, member) => {
    const d = member.paymentDate ? new Date(`${member.paymentDate}T00:00:00`) : null;
    if (!d || Number.isNaN(d.getTime())) return sum;
    if (d.getMonth() !== currentMonth || d.getFullYear() !== currentYear) return sum;
    return sum + (Number(member.feeReceived) || 0);
  }, 0);

  const maxPlanCount = Math.max(1, ...planStats.map((item) => item.count));

  /* =======================================================
     CUBOID FITNESS ${String.fromCharCode(0x2014)} COMMAND CENTER
  ======================================================= */

  return (
    <Box
      className="cuboid-app"
      sx={{
        minHeight: "100vh",
        width: "100%",
        bgcolor: "#050812",
        color: "#f5f5f5",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "row",
      }}
    >
      <style>{`
        @keyframes cuboidFloat { 0%,100%{transform:translateY(0) rotate(0deg)} 50%{transform:translateY(-14px) rotate(5deg)} }
        @keyframes cuboidPulse { 0%,100%{opacity:.35;box-shadow:0 0 18px rgba(255,208,0,.14)} 50%{opacity:1;box-shadow:0 0 38px rgba(255,208,0,.52)} }
        @keyframes cuboidScan { 0%{transform:translateX(-110%)} 100%{transform:translateX(500%)} }
        @keyframes cuboidRise { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes cuboidGlow { 0%,100%{filter:drop-shadow(0 0 5px rgba(255,208,0,.12))} 50%{filter:drop-shadow(0 0 16px rgba(255,208,0,.48))} }
        .cuboid-card{position:relative;overflow:hidden;animation:none}
        .cuboid-card:after{content:none}
        .cuboid-hover{transition:border-color .15s ease}
        .cuboid-hover:hover{transform:translateY(-4px);border-color:rgba(255,208,0,.70)!important;box-shadow:0 18px 45px rgba(0,0,0,.28),0 0 30px rgba(255,208,0,.12)!important}
        .cuboid-grid{background-image:linear-gradient(rgba(255,208,0,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,208,0,.035) 1px,transparent 1px);background-size:38px 38px}
        .cuboid-app .MuiCard-root{background:#0a0a0a!important;color:#f5f5f5;border-color:#292929!important}
        .cuboid-app .MuiCardContent-root{color:#f5f5f5}
        .cuboid-app .MuiTableCell-root{color:#f5f5f5;border-color:#292929}
        .cuboid-app .MuiDialog-paper{
          background:#0b0b0b;
          opacity:1 !important;
        }

        /* Modal content stays fully opaque; only the backdrop separates
           the modal from the dashboard. */
        .cuboid-app .MuiDialog-paper,
        .cuboid-app .MuiDialog-paper * {
          opacity:1;
        }

        .MuiBackdrop-root {
          background-color: rgba(0,0,0,.18) !important;
        }
      
      
        /* =========================================================
           CUBOID FITNESS ${String.fromCharCode(0x2014)} INDUSTRY GYM VISUAL LAYER
           Visual only. No layout/API/functionality changes.
        ========================================================= */
        .cuboid-app {
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .cuboid-app .MuiTypography-root,
        .cuboid-app .MuiButton-root,
        .cuboid-app .MuiInputBase-root,
        .cuboid-app .MuiInputLabel-root,
        .cuboid-app .MuiTableCell-root,
        .cuboid-app .MuiChip-label,
        .cuboid-app .MuiListItemText-root {
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        /* White glyphs/symbols across the dark admin UI. */
        .cuboid-app .MuiSvgIcon-root {
          color: #ffffff;
        }

        .cuboid-app .MuiInputAdornment-root,
        .cuboid-app .MuiInputAdornment-root .MuiSvgIcon-root {
          color: #ffffff !important;
        }

        .cuboid-app .MuiIconButton-root {
          color: #ffffff;
        }

        .cuboid-app .MuiOutlinedInput-root .MuiSvgIcon-root,
        .cuboid-app .MuiSelect-icon {
          color: #ffffff !important;
        }

        .cuboid-app .MuiFormControlLabel-label {
          color: #ffffff !important;
        }

        /* 3D ambient gym environment */
        .cuboid-3d-gym-layer {
          position: fixed;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
          z-index: 0;
          perspective: 1200px;
        }

        .cuboid-3d-ring {
          position: absolute;
          border: 1px solid rgba(255,208,0,.18);
          border-radius: 50%;
          transform-style: preserve-3d;
          box-shadow:
            0 0 26px rgba(255,208,0,.10),
            inset 0 0 26px rgba(255,208,0,.025);
          animation: cuboid3dRing 12s ease-in-out infinite;
        }

        .cuboid-3d-ring.r1 {
          width: 360px;
          height: 160px;
          top: 12%;
          right: -90px;
          transform: rotateX(70deg) rotateZ(16deg);
        }

        .cuboid-3d-ring.r2 {
          width: 260px;
          height: 110px;
          left: -60px;
          bottom: 12%;
          transform: rotateX(68deg) rotateZ(-18deg);
          animation-delay: -4s;
        }

        .cuboid-3d-cube {
          position: absolute;
          width: 104px;
          height: 104px;
          border: 1px solid rgba(255,208,0,.24);
          background: linear-gradient(145deg, rgba(124, 58, 237, .06), rgba(255,208,0,.025));
          box-shadow:
            0 0 38px rgba(124, 58, 237, .10),
            inset 0 0 24px rgba(255,208,0,.035);
          transform-style: preserve-3d;
          animation: cuboid3dCube 11s ease-in-out infinite;
        }

        .cuboid-3d-cube:before,
        .cuboid-3d-cube:after {
          content: "";
          position: absolute;
          inset: 13px;
          border: 1px solid rgba(255,208,0,.15);
        }

        .cuboid-3d-cube:after {
          inset: 29px;
          border-color: rgba(255,208,0,.16);
        }

        .cuboid-3d-cube.c1 {
          top: 25%;
          left: 7%;
        }

        .cuboid-3d-cube.c2 {
          width: 76px;
          height: 76px;
          right: 7%;
          bottom: 24%;
          animation-delay: -5s;
        }

        .cuboid-3d-dumbbell {
          position: absolute;
          width: 170px;
          height: 50px;
          transform-style: preserve-3d;
          filter: drop-shadow(0 0 20px rgba(255,208,0,.18));
          animation: cuboid3dDumbbell 8s ease-in-out infinite;
        }

        .cuboid-3d-dumbbell .shaft {
          position: absolute;
          left: 34px;
          right: 34px;
          top: 22px;
          height: 7px;
          border-radius: 999px;
          background: linear-gradient(90deg, #7c3aed, #22d3ee, #7c3aed);
          box-shadow: 0 0 18px rgba(34, 211, 238, .18);
        }

        .cuboid-3d-dumbbell .plate {
          position: absolute;
          top: 10px;
          width: 22px;
          height: 30px;
          border-radius: 5px;
          background: linear-gradient(180deg, #a78bfa, #22d3ee);
          border: 1px solid rgba(255,255,255,.18);
          box-shadow: 0 0 15px rgba(124,58,237,.22);
        }

        .cuboid-3d-dumbbell .p1 { left: 13px; }
        .cuboid-3d-dumbbell .p2 { left: 0; top: 5px; height: 40px; }
        .cuboid-3d-dumbbell .p3 { right: 13px; }
        .cuboid-3d-dumbbell .p4 { right: 0; top: 5px; height: 40px; }

        .cuboid-3d-dumbbell.d1 {
          top: 30%;
          right: 11%;
        }

        .cuboid-3d-dumbbell.d2 {
          bottom: 18%;
          left: 9%;
          transform: scale(.72) rotateY(180deg);
          animation-delay: -3s;
        }

        .cuboid-scanline {
          position: absolute;
          top: 8%;
          left: -25%;
          width: 18%;
          height: 84%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255,255,255,.025),
            rgba(34,211,238,.05),
            transparent
          );
          transform: skewX(-18deg);
          animation: cuboid3dScan 9s linear infinite;
        }

        @keyframes cuboidBrandAdmin {
          0%,100% { transform: translateY(0); filter: drop-shadow(0 0 0 rgba(139,92,246,0)); }
          50% { transform: translateY(-1px); filter: drop-shadow(0 0 10px rgba(139,92,246,.38)); }
        }

        @keyframes cuboid3dRing {
          0%,100% { transform: rotateX(70deg) rotateZ(16deg) translate3d(0,0,0); opacity:.45; }
          50% { transform: rotateX(63deg) rotateZ(28deg) translate3d(0,-18px,0); opacity:.8; }
        }

        @keyframes cuboid3dCube {
          0%,100% {
            transform: perspective(700px) rotateX(10deg) rotateY(-16deg) translate3d(0,0,0);
          }
          50% {
            transform: perspective(700px) rotateX(-8deg) rotateY(18deg) translate3d(0,-22px,16px);
          }
        }

        @keyframes cuboid3dDumbbell {
          0%,100% {
            transform: perspective(700px) rotateX(9deg) rotateY(-18deg) rotateZ(-4deg) translate3d(0,0,0);
          }
          50% {
            transform: perspective(700px) rotateX(-8deg) rotateY(18deg) rotateZ(4deg) translate3d(10px,-16px,24px);
          }
        }

        @keyframes cuboid3dScan {
          0% { transform: translateX(-120%) skewX(-18deg); }
          100% { transform: translateX(760%) skewX(-18deg); }
        }

        /* Dark glass surfaces with crisp white content. */
        .cuboid-app .cuboid-card {
          color: #ffffff;
          background: linear-gradient(145deg, rgba(11,18,32,.94), rgba(8,14,24,.88)) !important;
          border-color: rgba(148,163,184,.15) !important;
          backdrop-filter: none;
        }

        .cuboid-app .cuboid-card .MuiTypography-root {
          color: #ffffff;
        }

        .cuboid-app .cuboid-card .MuiTypography-root[style*="color"],
        .cuboid-app .cuboid-card .MuiTypography-colorTextSecondary {
          color: rgba(255,255,255,.68) !important;
        }

        /* Add Member dialog: every symbol and text is white. */
        .cuboid-app .MuiDialog-paper {
          color: #ffffff;
        }

        .cuboid-app .MuiDialog-paper .MuiTypography-root,
        .cuboid-app .MuiDialog-paper .MuiInputLabel-root,
        .cuboid-app .MuiDialog-paper .MuiInputBase-input,
        .cuboid-app .MuiDialog-paper .MuiSelect-select,
        .cuboid-app .MuiDialog-paper .MuiFormControlLabel-label,
        .cuboid-app .MuiDialog-paper .MuiButton-root,
        .cuboid-app .MuiDialog-paper .MuiSvgIcon-root,
        .cuboid-app .MuiDialog-paper .MuiInputAdornment-root {
          color: #ffffff !important;
        }

        /* ADD MEMBER ${String.fromCharCode(0x2014)} consistent dark fields */
        .cuboid-app .MuiDialog-paper .MuiTextField-root .MuiInputBase-root {
          background: #0a101c !important;
          color: #ffffff !important;
        }

        .cuboid-app .MuiDialog-paper .MuiTextField-root .MuiInputBase-input {
          color: #ffffff !important;
          -webkit-text-fill-color: #ffffff !important;
          caret-color: #ffffff !important;
          background: transparent !important;
        }

        .cuboid-app .MuiDialog-paper .MuiTextField-root .MuiInputLabel-root {
          color: rgba(255,255,255,.72) !important;
        }

        .cuboid-app .MuiDialog-paper .MuiTextField-root .MuiInputLabel-root.Mui-focused {
          color: #a78bfa !important;
        }

        .cuboid-app .MuiDialog-paper .MuiTextField-root .MuiOutlinedInput-notchedOutline {
          border-color: #334155 !important;
        }

        .cuboid-app .MuiDialog-paper .MuiTextField-root .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline {
          border-color: #64748b !important;
        }

        .cuboid-app .MuiDialog-paper .MuiTextField-root .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline {
          border-color: #8b5cf6 !important;
          border-width: 2px !important;
        }

        .cuboid-app .MuiDialog-paper .MuiTextField-root .MuiSelect-select {
          color: #ffffff !important;
        }

        .cuboid-app .MuiDialog-paper .MuiTextField-root .MuiSelect-icon {
          color: #ffffff !important;
        }

        .cuboid-app .MuiDialog-paper .MuiTextField-root .MuiInputBase-input::placeholder {
          color: rgba(255,255,255,.55) !important;
          opacity: 1 !important;
        }

        .cuboid-app .MuiDialog-paper .MuiTextField-root .MuiOutlinedInput-root.Mui-disabled {
          background: #111827 !important;
          opacity: 1 !important;
        }

        .cuboid-app .MuiDialog-paper .MuiTextField-root .MuiOutlinedInput-root.Mui-disabled .MuiInputBase-input {
          color: #cbd5e1 !important;
          -webkit-text-fill-color: #cbd5e1 !important;
          opacity: 1 !important;
        }

        .cuboid-app .MuiDialog-paper .MuiInputBase-input::placeholder {
          color: rgba(255,255,255,.62) !important;
          opacity: 1;
        }

        .cuboid-app .MuiDialog-paper .MuiOutlinedInput-notchedOutline {
          border-color: rgba(148,163,184,.26) !important;
        }

        .cuboid-app .MuiDialog-paper .MuiButton-outlined {
          color: #ffffff !important;
          border-color: rgba(255,255,255,.30) !important;
        }

        .cuboid-app .MuiDialog-paper .MuiInputAdornment-root {
          color: #ffffff !important;
        }

      
        /* =========================================================
           CUBOID FITNESS ${String.fromCharCode(0x2014)} CONSISTENT SECTION TYPOGRAPHY
           Same white font/icon language across WhatsApp and every section.
        ========================================================= */
        .cuboid-app {
          color: #ffffff;
        }

        .cuboid-app main,
        .cuboid-app main .MuiTypography-root,
        .cuboid-app main .MuiButton-root,
        .cuboid-app main .MuiListItemText-root,
        .cuboid-app main .MuiTableCell-root,
        .cuboid-app main .MuiInputBase-root,
        .cuboid-app main .MuiInputBase-input,
        .cuboid-app main .MuiSelect-select,
        .cuboid-app main .MuiInputLabel-root,
        .cuboid-app main .MuiFormHelperText-root {
          color: #ffffff;
        }

        .cuboid-app main .MuiSvgIcon-root,
        .cuboid-app main .MuiInputAdornment-root,
        .cuboid-app main .MuiInputAdornment-root .MuiSvgIcon-root,
        .cuboid-app main .MuiIconButton-root {
          color: #ffffff !important;
        }

        .cuboid-app main .MuiInputBase-input::placeholder {
          color: rgba(255,255,255,.62) !important;
          opacity: 1;
        }

        .cuboid-app main .MuiInputLabel-root.Mui-focused {
          color: #ffffff !important;
        }

        .cuboid-app main .MuiOutlinedInput-notchedOutline {
          border-color: rgba(148,163,184,.24);
        }

        /* Secondary copy is the same soft-white used on the WhatsApp section. */
        .cuboid-app main .cuboid-secondary,
        .cuboid-app main .MuiTypography-root.cuboid-secondary {
          color: rgba(255,255,255,.68) !important;
        }

        /* Neutral text helpers that were using the old slate palette. */
        .cuboid-app main .text-secondary,
        .cuboid-app main .section-secondary {
          color: rgba(255,255,255,.68) !important;
        }

        /* Keep semantic status/accent colors where the UI deliberately needs them. */
        .cuboid-app main .status-success { color:#4ade80 !important; }
        .cuboid-app main .status-warning { color:#fb923c !important; }
        .cuboid-app main .status-danger { color:#fb7185 !important; }
        .cuboid-app main .status-accent { color:#a78bfa !important; }
        .cuboid-app main .status-cyan { color:#67e8f9 !important; }

      
        /* =========================================================
           WHATSAPP ${String.fromCharCode(0x2014)} INDUSTRY LEVEL DARK GLASS SYSTEM
        ========================================================= */
        .cuboid-whatsapp {
          position: relative;
          isolation: isolate;
          padding: 4px;
          border-radius: 24px;
          background:
            radial-gradient(circle at 88% 8%, rgba(37,211,102,.12), transparent 28%),
            radial-gradient(circle at 8% 92%, rgba(124,58,237,.12), transparent 30%),
            linear-gradient(145deg, rgba(7,15,22,.96), rgba(5,10,16,.92));
          border: 1px solid rgba(37,211,102,.16);
          box-shadow:
            0 28px 80px rgba(0,0,0,.30),
            inset 0 1px 0 rgba(255,255,255,.03);
          overflow: hidden;
        }

        .cuboid-whatsapp:before {
          content: "";
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,.022) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.022) 1px, transparent 1px);
          background-size: 34px 34px;
          opacity: .42;
          mask-image: linear-gradient(to bottom, black, transparent 78%);
          pointer-events: none;
        }

        .cuboid-whatsapp:after {
          content: "";
          position: absolute;
          top: -40%;
          left: -20%;
          width: 22%;
          height: 180%;
          transform: rotate(18deg);
          background: linear-gradient(90deg, transparent, rgba(37,211,102,.065), transparent);
          animation: cuboidWhatsappScan 8s linear infinite;
          pointer-events: none;
        }

        .cuboid-whatsapp > * {
          position: relative;
          z-index: 1;
        }

        .cuboid-whatsapp-header {
          display:flex;
          align-items:center;
          gap:12px;
          margin-bottom:18px;
        }

        .cuboid-whatsapp-icon {
          width:44px;
          height:44px;
          border-radius:14px;
          display:grid;
          place-items:center;
          color:#25d366 !important;
          background:linear-gradient(145deg, rgba(37,211,102,.18), rgba(37,211,102,.05));
          border:1px solid rgba(37,211,102,.24);
          box-shadow:0 0 24px rgba(37,211,102,.12);
          animation:cuboidWhatsappPulse 3.5s ease-in-out infinite;
        }

        .cuboid-whatsapp-title {
          font-weight:950 !important;
          letter-spacing:-.4px !important;
          color:#ffffff !important;
        }

        .cuboid-whatsapp-subtitle {
          color:rgba(255,255,255,.66) !important;
          font-size:12px !important;
        }

        .cuboid-whatsapp-card {
          position:relative;
          overflow:hidden;
          background:linear-gradient(145deg, rgba(12,21,29,.94), rgba(7,14,21,.92)) !important;
          border:1px solid rgba(148,163,184,.14) !important;
          border-radius:18px !important;
          color:#ffffff !important;
          box-shadow:0 18px 46px rgba(0,0,0,.24) !important;
          backdrop-filter:blur(18px);
        }

        .cuboid-whatsapp-card:after {
          content:"";
          position:absolute;
          inset:0;
          pointer-events:none;
          background:linear-gradient(130deg, transparent 0 46%, rgba(255,255,255,.025) 50%, transparent 54%);
          background-size:220% 100%;
          animation:cuboidWhatsappSheen 8s ease-in-out infinite;
        }

        .cuboid-whatsapp .MuiCardContent-root {
          position:relative;
          z-index:1;
        }

        .cuboid-whatsapp .MuiTypography-root,
        .cuboid-whatsapp .MuiTableCell-root,
        .cuboid-whatsapp .MuiButton-root,
        .cuboid-whatsapp .MuiInputBase-input,
        .cuboid-whatsapp .MuiSelect-select,
        .cuboid-whatsapp .MuiInputLabel-root,
        .cuboid-whatsapp .MuiFormHelperText-root,
        .cuboid-whatsapp .MuiChip-label {
          color:#ffffff !important;
        }

        .cuboid-whatsapp .MuiInputLabel-root {
          color:rgba(255,255,255,.76) !important;
        }

        .cuboid-whatsapp .MuiInputLabel-root.Mui-focused {
          color:#ffffff !important;
        }

        .cuboid-whatsapp .MuiInputBase-input::placeholder {
          color:rgba(255,255,255,.48) !important;
          opacity:1;
        }

        .cuboid-whatsapp .MuiOutlinedInput-notchedOutline {
          border-color:rgba(148,163,184,.24) !important;
        }

        .cuboid-whatsapp .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline {
          border-color:rgba(37,211,102,.30) !important;
        }

        .cuboid-whatsapp .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline {
          border-color:rgba(37,211,102,.54) !important;
          box-shadow:0 0 0 3px rgba(37,211,102,.06);
        }

        .cuboid-whatsapp .MuiSvgIcon-root {
          color:#ffffff !important;
        }

        .cuboid-whatsapp .MuiCheckbox-root {
          color:rgba(255,255,255,.48) !important;
        }

        .cuboid-whatsapp .MuiCheckbox-root.Mui-checked {
          color:#25d366 !important;
        }

        .cuboid-whatsapp .MuiButton-outlined {
          color:#ffffff !important;
          border-color:rgba(255,255,255,.22) !important;
          background:rgba(255,255,255,.02) !important;
        }

        .cuboid-whatsapp .MuiButton-outlined:hover {
          border-color:rgba(37,211,102,.42) !important;
          background:rgba(37,211,102,.06) !important;
        }

        .cuboid-whatsapp .whatsapp-member-head {
          background:rgba(255,255,255,.035);
          border-bottom:1px solid rgba(148,163,184,.12);
          color:#ffffff;
        }

        .cuboid-whatsapp .whatsapp-member-row {
          background:rgba(7,15,22,.74);
          border-bottom:1px solid rgba(148,163,184,.08);
          transition:background .18s ease, transform .18s ease;
        }

        .cuboid-whatsapp .whatsapp-member-row:hover {
          background:rgba(37,211,102,.045);
        }

        .cuboid-whatsapp .whatsapp-member-row.is-selected {
          background:linear-gradient(90deg, rgba(37,211,102,.09), rgba(37,211,102,.025)) !important;
          box-shadow:inset 3px 0 0 #25d366;
        }

        .cuboid-whatsapp .whatsapp-table-shell {
          border:1px solid rgba(148,163,184,.14);
          border-radius:14px;
          overflow:hidden;
          background:rgba(3,8,13,.72);
          box-shadow:inset 0 1px 0 rgba(255,255,255,.025);
        }

        .cuboid-whatsapp .whatsapp-variable {
          background:rgba(37,211,102,.08) !important;
          color:#ffffff !important;
          border:1px solid rgba(37,211,102,.18) !important;
        }

        .cuboid-whatsapp .whatsapp-send {
          background:linear-gradient(135deg,#16a34a,#25d366) !important;
          color:#ffffff !important;
          box-shadow:0 12px 30px rgba(37,211,102,.18) !important;
          border-radius:12px !important;
        }

        .cuboid-whatsapp .whatsapp-send:hover {
          background:linear-gradient(135deg,#15803d,#20bd5d) !important;
          box-shadow:0 16px 34px rgba(37,211,102,.24) !important;
        }

        .cuboid-whatsapp .whatsapp-single {
          color:#ffffff !important;
          border-color:rgba(37,211,102,.32) !important;
          background:rgba(37,211,102,.055) !important;
        }

        .cuboid-whatsapp .whatsapp-single:hover {
          border-color:rgba(37,211,102,.58) !important;
          background:rgba(37,211,102,.11) !important;
        }

        @keyframes cuboidWhatsappPulse {
          0%,100% { transform:translateY(0); box-shadow:0 0 0 rgba(37,211,102,0); }
          50% { transform:translateY(-2px); box-shadow:0 0 28px rgba(37,211,102,.16); }
        }

        @keyframes cuboidWhatsappScan {
          from { transform:translateX(-120%) rotate(18deg); }
          to { transform:translateX(650%) rotate(18deg); }
        }

        @keyframes cuboidWhatsappSheen {
          0%,55%,100% { background-position:200% 0; }
          75% { background-position:-40% 0; }
        }

        @media (max-width:900px) {
          .cuboid-whatsapp {
            border-radius:18px;
            padding:2px;
          }
        }

      `}</style>

      {/* Ambient cuboid scene */}
      <Box sx={{ position:"fixed", inset:0, pointerEvents:"none", opacity:.8 }}>
        <Box className="cuboid-grid" sx={{ position:"absolute", inset:0, opacity:.35 }} />
        <Box sx={{ position:"absolute", top:90, right:7, width:320, height:320, borderRadius:"50%", background:"radial-gradient(circle, rgba(124,58,237,.20), transparent 65%)", filter:"blur(8px)" }} />
        <Box sx={{ position:"absolute", bottom:-120, left:100, width:420, height:420, borderRadius:"50%", background:"radial-gradient(circle, rgba(14,165,233,.12), transparent 65%)", filter:"blur(10px)" }} />
        <Box sx={{ position:"absolute", top:100, right:80, width:82, height:82, border:"1px solid rgba(255,208,0,.52)", transform:"rotate(45deg)", animation:"cuboidFloat 5s ease-in-out infinite", boxShadow:"0 0 30px rgba(139,92,246,.16)" }} />
        <Box sx={{ position:"absolute", top:138, right:118, width:82, height:82, border:"1px solid rgba(56,189,248,.28)", transform:"rotate(45deg)", animation:"cuboidFloat 6s ease-in-out infinite reverse" }} />
      </Box>

      {/* Top bar */}
      <AppBar
        position="fixed"
        sx={{
          width:`calc(100% - ${drawerWidth}px)`, ml:`${drawerWidth}px`, bgcolor:"rgba(5,8,18,.82)", color:"#fff",
          backdropFilter:"blur(18px)", borderBottom:"1px solid #182235", boxShadow:"none", zIndex:1201,
        }}
      >
        <Toolbar sx={{ minHeight:"72px!important", justifyContent:"space-between", gap:2 }}>
          <Box sx={{ display:"flex", alignItems:"center", gap:1.5, flex:1 }}>
            <Box sx={{ width:38,height:38,borderRadius:2,border:"1px solid #6d4aff",display:"grid",placeItems:"center",background:"linear-gradient(145deg,#17122d,#0a0a0a)",boxShadow:"0 0 22px rgba(124,58,237,.22)" }}>
              <FitnessCenter sx={{ fontSize:19,color:"#a78bfa" }} />
            </Box>
            <Box sx={{ display:{xs:"none",md:"block"}, maxWidth:440, flex:1 }}>
              <TextField fullWidth size="small" placeholder="Search members, plans, payments..." InputProps={{ startAdornment:<InputAdornment position="start"><Search sx={{color:"#64748b"}}/></InputAdornment> }} sx={{"& .MuiOutlinedInput-root":{bgcolor:"#0a0a0a",borderRadius:2.5,color:"#f5f5f5","& fieldset":{borderColor:"#1f2a3a"},"&:hover fieldset":{borderColor:"#4c3a8a"}}}} />
            </Box>
            <Box sx={{display:{xs:"block",md:"none"}}}><Typography fontWeight={900}>CUBOID FITNESS</Typography></Box>
          </Box>
          <Box sx={{display:"flex",alignItems:"center",gap:1}}>
            <IconButton sx={{color:"#94a3b8"}}><NotificationsNone/></IconButton>
            <Box sx={{display:{xs:"none",sm:"block"},textAlign:"right",mr:1}}>
              <Typography sx={{fontSize:12,fontWeight:800}}>Admin Control</Typography>
              <Typography sx={{fontSize:10,color:"#64748b"}}>{new Date(`${today}T00:00:00`).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}).toUpperCase()}</Typography>
            </Box>
            <Avatar sx={{width:38,height:38,bgcolor:"#17122d",color:"#c4b5fd",border:"1px solid #6d4aff"}}>A</Avatar>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <Drawer variant="permanent" sx={{width:drawerWidth,flexShrink:0,"& .MuiDrawer-paper":{width:drawerWidth,boxSizing:"border-box",bgcolor:"#070b14",color:"#fff",borderRight:"1px solid #182235",overflow:"hidden"}}}>
        <Toolbar sx={{minHeight:"72px!important",px:2.2}}>
          <Box
  sx={{
    display: "flex",
    alignItems: "center",
    width: "100%",
  }}
>
  <Box
    component="img"
    src="/cuboid-logo.jpeg"
    alt="Cuboid Fitness"
    sx={{
      width: 175,
      height: 55,
      objectFit: "contain",
      objectPosition: "left center",
      display: "block",
    }}
  />
</Box>
        </Toolbar>
        <List sx={{px:1.2,pt:1}}>
          <SidebarItem icon={<DashboardIcon/>} text="Dashboard" active={page==="Dashboard"} onClick={()=>setPage("Dashboard")} />
          <SidebarItem icon={<People/>} text="Members" active={page==="Members"} onClick={()=>setPage("Members")} />
          <SidebarItem icon={<PendingActions/>} text={`Approvals${registrationRequests.filter(r=>r.status==="Pending").length?` (${registrationRequests.filter(r=>r.status==="Pending").length})`:""}`} active={page==="Approvals"} onClick={()=>{setPage("Approvals");loadRegistrationRequests();}} />
          <SidebarItem icon={<Cancel/>} text="Expired Members" active={page==="Expired Members"} onClick={()=>setPage("Expired Members")} />
          <SidebarItem icon={<Warning/>} text="Expiring Soon" active={page==="Expiring Soon"} onClick={()=>setPage("Expiring Soon")} />
          <SidebarItem icon={<WhatsApp/>} text="WhatsApp" active={page==="WhatsApp"} onClick={()=>setPage("WhatsApp")} />
          <SidebarItem icon={<Payments/>} text="Payments" active={page==="Payments"} onClick={()=>setPage("Payments")} />
          <SidebarItem icon={<AccountBalanceWallet/>} text="Financial Analysis" active={page==="Financial Analysis"} onClick={()=>setPage("Financial Analysis")} />
          <SidebarItem icon={<Settings/>} text="Settings" active={page==="Settings"} onClick={()=>setPage("Settings")} />
        </List>
        <Box sx={{mt:"auto",p:1.5}}>
          <Box sx={{p:1.5,borderRadius:3,border:"1px solid #1f2a3a",bgcolor:"#0a0a0a"}}>
            <Typography sx={{fontSize:9,color:"#64748b",letterSpacing:1.4,fontWeight:900}}>SYSTEM STATUS</Typography>
            <Box sx={{display:"flex",alignItems:"center",gap:1,mt:1}}><Box sx={{width:7,height:7,borderRadius:"50%",bgcolor:"#22c55e",boxShadow:"0 0 10px #22c55e"}}/><Typography sx={{fontSize:12,fontWeight:800}}>All systems operational</Typography></Box>
          </Box>
          <Button fullWidth startIcon={<Logout/>} onClick={handleLogout} sx={{mt:1.2,color:"#64748b",justifyContent:"flex-start",textTransform:"none"}}>Logout</Button>
        </Box>
      </Drawer>

      <Box
        component="main"
        className="cuboid-main-content"
        sx={{
          flexGrow: 1,
          width: 0,
          minWidth: 0,
          overflowX: "hidden",
          p: { xs: 2, md: 3.5 },
          mt: 9,
          position: "relative",
          zIndex: 1,
          boxSizing: "border-box",
        }}
      >
        {page === "Dashboard" && (
          <Box>
            <Box sx={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",gap:2,mb:3,flexWrap:"wrap"}}>
              <Box>
                <Typography sx={{fontSize:{xs:26,md:34},fontWeight:950,letterSpacing:"-1px"}}>Command Center</Typography>
                <Typography sx={{color:"#64748b",mt:.5,fontSize:13}}>Live intelligence for Cuboid Fitness operations.</Typography>
              </Box>
              <Chip icon={<EventAvailable sx={{fontSize:16}}/>} label={`Today Â· ${new Date(`${today}T00:00:00`).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}`} sx={{bgcolor:"#0a0a0a",color:"#a78bfa",border:"1px solid #2b2250",fontWeight:800}} />
            </Box>

            {/* KPI row */}
            <Grid container spacing={2} sx={{ width: "100%", boxSizing: "border-box", alignItems: "stretch" }}>
              {[
                ["TOTAL MEMBERS",members.length,People,"#a78bfa","+12.5%", "vs last month"],
                ["ACTIVE MEMBERS",activeMembers,CheckCircle,"#22d3ee","+8.3%","vs last month"],
                ["NEW THIS MONTH",newThisMonth,GroupAdd,"#38bdf8","+15.7%","new joins"],
                ["EXPIRING SOON",expiringSoon,Warning,"#fb923c","3 days","attention"],
                ["MONTHLY REVENUE",`${String.fromCharCode(0x20B9)}${monthlyRevenue.toLocaleString("en-IN")}`,MonetizationOn,"#34d399","Live","received"],
              ].map(([title,value,Icon,accent,delta,note],i)=>(
                <Grid item xs={12} sm={6} lg={2.4} key={title} sx={{ minWidth: 0, boxSizing: "border-box" }}>
                  <Box className="cuboid-card cuboid-hover" sx={{height:"100%",boxSizing:"border-box",p:2,borderRadius:3,bgcolor:"rgba(11,18,32,.88)",border:"1px solid #292929",boxShadow:"0 14px 40px rgba(0,0,0,.20)"}}>
                    <Box sx={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                      <Typography sx={{fontSize:9,color:"#64748b",letterSpacing:1.2,fontWeight:900}}>{title}</Typography>
                      <Box sx={{width:36,height:36,borderRadius:2,border:`1px solid ${accent}55`,display:"grid",placeItems:"center",color:accent,bgcolor:`${accent}10`}}><Icon sx={{fontSize:18}}/></Box>
                    </Box>
                    <Typography sx={{fontSize:28,fontWeight:950,mt:1.5,letterSpacing:"-.8px"}}>{value}</Typography>
                    <Box sx={{display:"flex",alignItems:"center",gap:.5,mt:.8}}><TrendingUp sx={{fontSize:13,color:accent}}/><Typography sx={{fontSize:10,color:accent,fontWeight:800}}>{delta}</Typography><Typography sx={{fontSize:10,color:"#64748b"}}>{note}</Typography></Box>
                  </Box>
                </Grid>
              ))}
            </Grid>

            {/* Analytics */}
            <Grid container spacing={2} sx={{ mt: .2, width: "100%", boxSizing: "border-box", alignItems: "stretch" }}>
              <Grid item xs={12} lg={7} sx={{ minWidth: 0, boxSizing: "border-box" }}>
                <Box className="cuboid-card" sx={{p:2.2,borderRadius:3,bgcolor:"rgba(11,18,32,.88)",border:"1px solid #292929",height:"100%",boxSizing:"border-box"}}>
                  <Box sx={{display:"flex",justifyContent:"space-between",alignItems:"center",mb:2}}><Box><Typography sx={{fontWeight:900,fontSize:14}}>Member Growth</Typography><Typography sx={{fontSize:10,color:"#64748b",mt:.3}}>Active member trajectory</Typography></Box><Chip label="LIVE" size="small" sx={{height:22,bgcolor:"#14261d",color:"#4ade80",fontSize:9,fontWeight:900}}/></Box>
                  <Box sx={{height:220,position:"relative",display:"flex",alignItems:"flex-end",gap:1.2,px:1,overflow:"hidden"}}>
                    {(() => {
                      const monthKeys = [];
                      const nowDate = new Date(`${today}T00:00:00`);
                      for (let offset = 11; offset >= 0; offset--) {
                        const d = new Date(nowDate);
                        d.setMonth(d.getMonth() - offset);
                        monthKeys.push({
                          month: d.getMonth(),
                          year: d.getFullYear(),
                        });
                      }

                      const monthlyCounts = monthKeys.map(({ month, year }) =>
                        members.filter((member) => {
                          if (!member.joiningDate) return false;
                          const joined = new Date(`${member.joiningDate}T00:00:00`);
                          return (
                            joined.getMonth() === month &&
                            joined.getFullYear() === year
                          );
                        }).length
                      );

                      const maxCount = Math.max(1, ...monthlyCounts);

                      return monthlyCounts.map((count, i) => {
                        const height = Math.max(
                          count === 0 ? 4 : 10,
                          Math.round((count / maxCount) * 100)
                        );

                        return (
                          <Box
                            key={`${monthKeys[i].year}-${monthKeys[i].month}-${i}`}
                            sx={{
                              flex: 1,
                              height: `${height}%`,
                              maxWidth: 34,
                              borderRadius: "7px 7px 2px 2px",
                              background: `linear-gradient(180deg, ${i % 2 ? "#22d3ee" : "#8b5cf6"}, rgba(139,92,246,.08))`,
                              border: `1px solid ${i % 2 ? "#22d3ee" : "#8b5cf6"}55`,
                              animation: `cuboidRise ${.35 + i * .05}s ease both`,
                              boxShadow: "0 0 16px rgba(139,92,246,.08)",
                              position: "relative",
                            }}
                          >
                            <Typography
                              sx={{
                                position: "absolute",
                                top: -20,
                                left: "50%",
                                transform: "translateX(-50%)",
                                fontSize: 8,
                                color: "rgba(255,255,255,.68)",
                                opacity: count ? 1 : 0,
                              }}
                            >
                              {count}
                            </Typography>
                          </Box>
                        );
                      });
                    })()}
                    <Box sx={{position:"absolute",left:0,right:0,bottom:0,borderBottom:"1px solid #243043"}}/>
                  </Box>
                  <Box sx={{display:"flex",justifyContent:"space-between",color:"#475569",fontSize:9,mt:1}}>{["SEP","OCT","NOV","DEC","JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG"].map(x=><span key={x}>{x}</span>)}</Box>
                </Box>
              </Grid>

              <Grid item xs={12} md={6} lg={2.5} sx={{ minWidth: 0, boxSizing: "border-box" }}>
                <Box className="cuboid-card" sx={{p:2.2,borderRadius:3,bgcolor:"rgba(11,18,32,.88)",border:"1px solid #292929",height:"100%",boxSizing:"border-box"}}>
                  <Typography sx={{fontWeight:900,fontSize:14}}>Plan Mix</Typography><Typography sx={{fontSize:10,color:"#64748b",mt:.3}}>Current members</Typography>
                  <Box sx={{width:140,height:140,mx:"auto",my:2,borderRadius:"50%",background:"conic-gradient(#8b5cf6 0 42%, #22d3ee 42% 70%, #38bdf8 70% 88%, #f59e0b 88% 100%)",display:"grid",placeItems:"center",position:"relative",animation:"cuboidPulse 4s ease-in-out infinite"}}><Box sx={{width:96,height:96,borderRadius:"50%",bgcolor:"#0a0a0a",display:"grid",placeItems:"center",textAlign:"center"}}><Typography sx={{fontSize:28,fontWeight:950,lineHeight:1}}>{members.length}</Typography><Typography sx={{fontSize:10,color:"#94a3b8",fontWeight:800,mt:.5}}>MEMBERS</Typography></Box></Box>
                  <Stack spacing={1}>{planStats.map((x,i)=><Box key={x.plan} sx={{display:"flex",alignItems:"center",gap:1}}><Box sx={{width:7,height:7,borderRadius:"50%",bgcolor:["#8b5cf6","#22d3ee","#38bdf8","#f59e0b"][i]}}/><Typography sx={{fontSize:10,flex:1,color:"#94a3b8"}}>{x.plan}</Typography><Typography sx={{fontSize:10,fontWeight:900}}>{x.count}</Typography></Box>)}</Stack>
                </Box>
              </Grid>

              <Grid item xs={12} md={6} lg={2.5} sx={{ minWidth: 0, boxSizing: "border-box" }}>
                <Box className="cuboid-card" sx={{p:2.2,borderRadius:3,bgcolor:"rgba(11,18,32,.88)",border:"1px solid #292929",height:"100%",boxSizing:"border-box"}}>
                  <Typography sx={{fontWeight:900,fontSize:14}}>Operations Pulse</Typography><Typography sx={{fontSize:10,color:"#64748b",mt:.3}}>Today at a glance</Typography>
                  <Stack spacing={1.5} sx={{mt:2}}>
                    {[["New registrations",newThisMonth,GroupAdd,"#a78bfa"],["Active members",activeMembers,CheckCircle,"#22c55e"],["Expiring soon",expiringSoon,Warning,"#fb923c"],["Revenue received",`${String.fromCharCode(0x20B9)}${monthlyRevenue.toLocaleString("en-IN")}`,MonetizationOn,"#34d399"]].map(([label,val,Icon,c],i)=><Box key={label} sx={{display:"flex",alignItems:"center",gap:1.1,p:1.1,borderRadius:2,bgcolor:"#0a101c",border:"1px solid #172236"}}><Box sx={{width:30,height:30,borderRadius:1.7,bgcolor:`${c}12`,color:c,display:"grid",placeItems:"center"}}><Icon sx={{fontSize:15}}/></Box><Box sx={{flex:1}}><Typography sx={{fontSize:9,color:"#64748b"}}>{label}</Typography><Typography sx={{fontSize:14,fontWeight:900}}>{val}</Typography></Box></Box>)}
                  </Stack>
                </Box>
              </Grid>
            </Grid>

            {/* Members */}
            <Box sx={{mt:2}}>
              <MembersCard members={filteredMembers} search={search} setSearch={setSearch} onAdd={openAddMemberDialog} onDelete={handleDeleteMember} onMemberClick={setSelectedMember} />
            </Box>
          </Box>
        )}

        {page === "Members" && <MembersCard members={filteredMembers} search={search} setSearch={setSearch} onAdd={openAddMemberDialog} onDelete={handleDeleteMember} onMemberClick={setSelectedMember} />}
        {page === "Approvals" && <RegistrationApprovals requests={registrationRequests} onApprove={approveRegistrationRequest} onReject={rejectRegistrationRequest} />}
        {page === "Expired Members" && <ExpiredMembersCard members={expiredMemberList} search={search} setSearch={setSearch} onDelete={handleDeleteMember} />}
        {page === "Expiring Soon" && <ExpiringSoonCard members={expiringSoonList} onDelete={handleDeleteMember} />}
        {page === "WhatsApp" && <WhatsAppPage members={whatsappMembers} selectedMembers={selectedWhatsAppMembers} message={whatsappMessage} filter={whatsappFilter} setFilter={setWhatsappFilter} setMessage={setWhatsappMessage} onToggle={toggleWhatsAppMember} onSelectAll={selectAllWhatsApp} onClearAll={clearWhatsAppSelection} onSend={sendToSelectedWhatsApp} onSendSingle={sendWhatsAppMessage} />}
        {page === "Payments" && <PaymentsPage members={members} />}
        {page === "Financial Analysis" && <FinancialAnalysis members={members} />}
        {page === "Settings" && <Section title="Settings">Gym settings and fingerprint configuration will be added here.</Section>}
      </Box>

      {/* Member profile drawer */}
      <Drawer anchor="right" open={Boolean(selectedMember)} onClose={()=>setSelectedMember(null)} PaperProps={{sx:{width:{xs:"100%",sm:430},bgcolor:"#070b14",color:"#f5f5f5",borderLeft:"1px solid #27324a",boxShadow:"-20px 0 70px rgba(0,0,0,.55)"}}}>
        {selectedMember && <Box sx={{height:"100%",display:"flex",flexDirection:"column"}}>
          <Box sx={{p:2.2,borderBottom:"1px solid #1b2638",display:"flex",justifyContent:"space-between",alignItems:"center"}}><Box><Typography sx={{fontSize:10,color:"#8b5cf6",letterSpacing:1.5,fontWeight:900}}>MEMBER PROFILE</Typography><Typography sx={{fontSize:19,fontWeight:950,mt:.4}}>{selectedMember.name}</Typography></Box><IconButton onClick={()=>setSelectedMember(null)} sx={{color:"#94a3b8"}}><Close/></IconButton></Box>
          <Box sx={{p:2.5,overflowY:"auto",flex:1}}>
            <Box sx={{p:2,borderRadius:3,border:"1px solid #2b2250",background:"radial-gradient(circle at 50% 0%,rgba(255,208,0,.14),transparent 55%),#0a0a0a",textAlign:"center",position:"relative",overflow:"hidden"}}>
              <Box sx={{position:"absolute",width:130,height:130,border:"1px solid #8b5cf655",transform:"rotate(45deg)",left:"calc(50% - 65px)",top:8,animation:"cuboidFloat 5s ease-in-out infinite"}}/>
              <Avatar src={selectedMember.photo || undefined} sx={{width:130,height:130,mx:"auto",border:"3px solid #8b5cf6",boxShadow:"0 0 34px rgba(139,92,246,.35)",bgcolor:"#111827",position:"relative"}}>{!selectedMember.photo && <People sx={{fontSize:55,color:"#64748b"}}/>}</Avatar>
              <Typography sx={{fontSize:20,fontWeight:950,mt:2}}>{selectedMember.name}</Typography>
              <Chip label={selectedMember.status || "Active"} size="small" sx={{mt:1,bgcolor:selectedMember.status==="Expired"?"#2a1116":"#10261b",color:selectedMember.status==="Expired"?"#fb7185":"#4ade80",fontWeight:900}}/>
            </Box>

            <Grid container spacing={1.2} sx={{mt:1.5}}>
              {[["MEMBER ID",selectedMember.id,BarChart],["FINGERPRINT ID",selectedMember.fingerprintId || selectedMember.id,People],["PLAN",selectedMember.plan,FitnessCenter],["JOINING",selectedMember.joiningDate,CalendarMonth],["EXPIRY",selectedMember.expiryDate,EventAvailable],["PHONE",selectedMember.phone,Phone],["EMAIL",selectedMember.email || "Not added",Email]].map(([label,value,Icon])=><Grid item xs={6} key={label}><Box sx={{p:1.5,borderRadius:2.5,bgcolor:"#0a0a0a",border:"1px solid #182235"}}><Typography sx={{fontSize:8,color:"#64748b",letterSpacing:1,fontWeight:900}}>{label}</Typography><Typography sx={{fontSize:12,fontWeight:850,mt:.5,wordBreak:"break-word"}}>{value || "—"}</Typography></Box></Grid>)}
            </Grid>

            <Box sx={{mt:1.5,p:1.7,borderRadius:2.5,bgcolor:"#0a0a0a",border:"1px solid #182235"}}>
              <Typography sx={{fontSize:9,color:"#64748b",letterSpacing:1.2,fontWeight:900}}>PAYMENT SNAPSHOT</Typography>
              <Box sx={{display:"flex",justifyContent:"space-between",mt:1.2}}><Typography sx={{fontSize:12,color:"#94a3b8"}}>Plan fee</Typography><Typography sx={{fontWeight:900}}>${String.fromCharCode(0x20B9)}{Number(selectedMember.planFee||0).toLocaleString("en-IN")}</Typography></Box>
              <Box sx={{display:"flex",justifyContent:"space-between",mt:.8}}><Typography sx={{fontSize:12,color:"#94a3b8"}}>Received</Typography><Typography sx={{fontWeight:900,color:"#34d399"}}>${String.fromCharCode(0x20B9)}{Number(selectedMember.feeReceived||0).toLocaleString("en-IN")}</Typography></Box>
              <Box sx={{display:"flex",justifyContent:"space-between",mt:.8}}><Typography sx={{fontSize:12,color:"#94a3b8"}}>Method</Typography><Typography sx={{fontWeight:900}}>{selectedMember.paymentMethod || "—"}</Typography></Box>
               <Box sx={{display:"flex",justifyContent:"space-between",mt:.8,gap:2}}><Typography sx={{fontSize:12,color:"#94a3b8"}}>Payment Status</Typography><Chip size="small" label={selectedMember.paymentStatus || "Pending"} color={selectedMember.paymentStatus === "Paid" ? "success" : "warning"} /></Box>
               <Box sx={{display:"flex",justifyContent:"space-between",mt:.8,gap:2}}><Typography sx={{fontSize:12,color:"#94a3b8"}}>Transaction ID</Typography><Typography sx={{fontWeight:900,fontSize:11,wordBreak:"break-all",textAlign:"right"}}>{selectedMember.transactionId || selectedMember.utr || selectedMember.paymentTransactionId || "NOT STORED"}</Typography></Box>
            </Box>

            <Button
              fullWidth
              variant="outlined"
              startIcon={<Edit />}
              onClick={() => openMemberEditor(selectedMember)}
              sx={{mt:1.5,py:1.1,borderRadius:2.2,color:"#c4b5fd",borderColor:"#4c3a8a",fontWeight:900,textTransform:"none","&:hover":{borderColor:"#8b5cf6",bgcolor:"#14102a"}}}
            >
              Edit Member Details
            </Button>

            <Button
              fullWidth
              variant="contained"
              onClick={() => {
                setRenewForm({
                  plan: "Monthly",
                  amount: "1700",
                  paymentMethod:
                    selectedMember.paymentMethod || "UPI",
                  paymentDate: today,
                });
                setOpenRenewMember(true);
              }}
              sx={{
                mt: 1.5,
                py: 1.1,
                borderRadius: 2.2,
                bgcolor: "#7c3aed",
                color: "#ffffff",
                fontWeight: 900,
                textTransform: "none",
                "&:hover": {
                  bgcolor: "#6d28d9",
                },
              }}
            >
              Renew Membership
            </Button>

            <Box sx={{mt:1.5,p:1.7,borderRadius:2.5,bgcolor:"#0a0a0a",border:"1px solid #182235"}}>
              <Typography sx={{fontSize:9,color:"#64748b",letterSpacing:1.2,fontWeight:900}}>MEMBERSHIP HEALTH</Typography>
              <Box sx={{mt:1.5,height:8,bgcolor:"#172236",borderRadius:99,overflow:"hidden"}}><Box sx={{height:"100%",width:selectedMember.status==="Expired"?"100%":"72%",background:"linear-gradient(90deg,#8b5cf6,#22d3ee)",borderRadius:99}}/></Box>
              <Typography sx={{fontSize:10,color:"#64748b",mt:.8}}>{selectedMember.status==="Expired"?"Membership expired":"Membership currently active"}</Typography>
            </Box>
          </Box>
        </Box>}
      </Drawer>

      {/* ===================================================
          RENEW MEMBERSHIP DIALOG
      =================================================== */}

      <Dialog
        open={openRenewMember}
        onClose={() => setOpenRenewMember(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            bgcolor: "#0b111b",
            color: "#ffffff",
            border:
              "1px solid rgba(167,139,250,.28)",
            borderRadius: 4,
          },
        }}
      >
        <DialogTitle
          sx={{
            borderBottom:
              "1px solid rgba(148,163,184,.14)",
            color: "#ffffff",
          }}
        >
          <Typography variant="h6" fontWeight={900}>
            Renew Membership
          </Typography>

          <Typography
            variant="body2"
            sx={{
              mt: 0.5,
              color: "rgba(255,255,255,.68)",
            }}
          >
            {selectedMember?.name || "Member"} Â·{" "}
            {selectedMember?.id || ""}
          </Typography>
        </DialogTitle>

        <DialogContent
          dividers
          sx={{
            borderColor:
              "rgba(148,163,184,.14)",

            "& .MuiTextField-root": {
              "& .MuiInputBase-root": {
                color: "#ffffff",
                bgcolor: "#0e1724",
              },

              "& .MuiInputBase-input": {
                color: "#ffffff",
              },

              "& .MuiInputLabel-root": {
                color: "#ffffff",
              },

              "& .MuiInputLabel-root.Mui-focused": {
                color: "#ffffff",
              },

              "& .MuiOutlinedInput-notchedOutline": {
                borderColor:
                  "rgba(148,163,184,.24)",
              },

              "& .MuiSelect-select": {
                color: "#ffffff",
              },

              "& .MuiSelect-icon": {
                color: "#ffffff",
              },

              "& .MuiInputAdornment-root": {
                color: "#ffffff",
              },
            },
          }}
        >
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="Renewal Plan"
                value={renewForm.plan}
                onChange={(event) => {
                  const plan = event.target.value;

                  const fees = {
                    Monthly: "1700",
                    Quarterly: "4500",
                    "Half Year": "8000",
                    Yearly: "13999",
                  };

                  setRenewForm((current) => ({
                    ...current,
                    plan,
                    amount:
                      fees[plan] || "0",
                  }));
                }}
              >
                <MuiMenuItem value="Monthly">
                  Monthly
                </MuiMenuItem>

                <MuiMenuItem value="Quarterly">
                  Quarterly
                </MuiMenuItem>

                <MuiMenuItem value="Half Year">
                  Half Year
                </MuiMenuItem>

                <MuiMenuItem value="Yearly">
                  Yearly
                </MuiMenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Amount Received"
                value={renewForm.amount}
                onChange={(event) =>
                  setRenewForm((current) => ({
                    ...current,
                    amount: event.target.value,
                  }))
                }
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      ${String.fromCharCode(0x20B9)}
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="Payment Method"
                value={renewForm.paymentMethod}
                onChange={(event) =>
                  setRenewForm((current) => ({
                    ...current,
                    paymentMethod:
                      event.target.value,
                  }))
                }
              >
                <MuiMenuItem value="UPI">
                  UPI
                </MuiMenuItem>

                <MuiMenuItem value="Cash">
                  Cash
                </MuiMenuItem>

                <MuiMenuItem value="Card">
                  Card
                </MuiMenuItem>

                <MuiMenuItem value="Bank Transfer">
                  Bank Transfer
                </MuiMenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="Payment Date"
                value={renewForm.paymentDate}
                onChange={(event) =>
                  setRenewForm((current) => ({
                    ...current,
                    paymentDate:
                      event.target.value,
                  }))
                }
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>
          </Grid>

          <Box
            sx={{
              mt: 2,
              p: 1.5,
              borderRadius: 2,
              bgcolor:
                "rgba(124,58,237,.08)",
              border:
                "1px solid rgba(167,139,250,.20)",
            }}
          >
            <Typography
              sx={{
                fontSize: 11,
                color:
                  "rgba(255,255,255,.68)",
              }}
            >
              Current expiry
            </Typography>

            <Typography
              sx={{
                mt: 0.3,
                fontWeight: 900,
                color: "#ffffff",
              }}
            >
              {formatDisplayDate(
                selectedMember?.expiryDate
              )}
            </Typography>

            <Typography
              sx={{
                mt: 0.7,
                fontSize: 10,
                color:
                  "rgba(255,255,255,.55)",
              }}
            >
              For an active membership, the new plan is
              added after the current expiry. For an
              expired membership, the new term starts
              from the payment date.
            </Typography>
          </Box>
        </DialogContent>

        <DialogActions
          sx={{
            p: 2,
            borderTop:
              "1px solid rgba(148,163,184,.14)",
            bgcolor: "#0b111b",
          }}
        >
          <Button
            onClick={() => setOpenRenewMember(false)}
            sx={{
              color: "#ffffff",
              textTransform: "none",
            }}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={handleRenewMembership}
            sx={{
              bgcolor: "#7c3aed",
              color: "#ffffff",
              fontWeight: 900,
              textTransform: "none",
              "&:hover": {
                bgcolor: "#6d28d9",
              },
            }}
          >
            Confirm Renewal
          </Button>
        </DialogActions>
      </Dialog>

      {/* ADD MEMBER ICON CONTRAST */}
      <style>{`
        .cuboid-app .MuiDialog-paper .MuiSvgIcon-root { color: #ffffff; }
        .cuboid-app .MuiDialog-paper .MuiInputAdornment-root,
        .cuboid-app .MuiDialog-paper .MuiInputAdornment-root .MuiSvgIcon-root { color: #ffffff !important; }
      `}</style>

      {/* ===================================================
          EDIT MEMBER DIALOG
      =================================================== */}
      <Dialog open={openEditMember} onClose={() => !savingEditMember && setOpenEditMember(false)} fullWidth maxWidth="md"
        PaperProps={{sx:{bgcolor:"#ffffff",color:"#f5f5f5",border:"1px solid rgba(129,92,246,.35)",borderRadius:4}}}>
        <DialogTitle sx={{color:"#fff",borderBottom:"1px solid #1f2a3a"}}>
          <Typography sx={{fontWeight:950,fontSize:20}}>Edit Member Details</Typography>
          <Typography sx={{color:"#94a3b8",fontSize:12,mt:.5}}>Member ID, Gym ID and Fingerprint ID use the same value.</Typography>
        </DialogTitle>
        <DialogContent dividers sx={{borderColor:"#1f2a3a",pt:2.5}}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}><TextField fullWidth label="Member / Gym / Fingerprint ID" value={editMemberForm.memberId} onChange={(e)=>updateEditMemberForm("memberId",e.target.value.replace(/\D/g,""))}/></Grid>
            <Grid item xs={12} md={6}><TextField fullWidth label="Name" value={editMemberForm.name} onChange={(e)=>updateEditMemberForm("name",e.target.value)}/></Grid>
            <Grid item xs={12} md={6}><TextField fullWidth label="Phone" value={editMemberForm.phone} onChange={(e)=>updateEditMemberForm("phone",e.target.value.replace(/\D/g,"").slice(0,10))}/></Grid>
            <Grid item xs={12} md={6}><TextField select fullWidth label="Plan" value={editMemberForm.plan} onChange={(e)=>updateEditMemberForm("plan",e.target.value)}>{["Monthly","Quarterly","Half Year","Yearly"].map((v)=><MuiMenuItem key={v} value={v}>{v}</MuiMenuItem>)}</TextField></Grid>
            <Grid item xs={12} md={6}><TextField fullWidth type="date" label="Joining Date" InputLabelProps={{shrink:true}} value={editMemberForm.joiningDate} onChange={(e)=>updateEditMemberForm("joiningDate",e.target.value)}/></Grid>
            <Grid item xs={12} md={6}><TextField fullWidth type="date" label="Expiry Date" InputLabelProps={{shrink:true}} value={editMemberForm.expiryDate} onChange={(e)=>updateEditMemberForm("expiryDate",e.target.value)}/></Grid>
            <Grid item xs={12} md={4}><TextField fullWidth type="number" label="Plan Fee" value={editMemberForm.planFee} onChange={(e)=>updateEditMemberForm("planFee",e.target.value)}/></Grid>
            <Grid item xs={12} md={4}><TextField fullWidth type="number" label="Fee Received" value={editMemberForm.feeReceived} onChange={(e)=>updateEditMemberForm("feeReceived",e.target.value)}/></Grid>
            <Grid item xs={12} md={4}><TextField fullWidth label="Payment Method" value={editMemberForm.paymentMethod} onChange={(e)=>updateEditMemberForm("paymentMethod",e.target.value)}/></Grid>
            <Grid item xs={12} md={4}><TextField fullWidth label="Transaction / UTR ID" value={editMemberForm.transactionId} onChange={(e)=>updateEditMemberForm("transactionId",e.target.value.trim())}/></Grid>
             <Grid item xs={12} md={4}><TextField select fullWidth label="Payment Status" value={editMemberForm.paymentStatus} onChange={(e)=>updateEditMemberForm("paymentStatus",e.target.value)}><MuiMenuItem value="Paid">Paid</MuiMenuItem><MuiMenuItem value="Pending">Pending</MuiMenuItem></TextField></Grid>
            <Grid item xs={12} md={4}><TextField fullWidth type="date" label="Payment Date" InputLabelProps={{shrink:true}} value={editMemberForm.paymentDate} onChange={(e)=>updateEditMemberForm("paymentDate",e.target.value)}/></Grid>
            <Grid item xs={12} md={4}><TextField select fullWidth label="Status" value={editMemberForm.status} onChange={(e)=>updateEditMemberForm("status",e.target.value)}><MuiMenuItem value="Active">Active</MuiMenuItem><MuiMenuItem value="Pending">Pending</MuiMenuItem><MuiMenuItem value="Expired">Expired</MuiMenuItem></TextField></Grid>
            <Grid item xs={12} md={6}>
  <TextField
    select
    fullWidth
    label="Fingerprint Access"
    value={editMemberForm.fingerprintAccess}
    onChange={(e) =>
      updateEditMemberForm("fingerprintAccess", e.target.value)
    }
    sx={{
      "& .MuiInputBase-root": {
        backgroundColor: "#0a101c",
      },
      "& .MuiSelect-select": {
        color:
          editMemberForm.fingerprintAccess === "Enabled"
            ? "#22c55e"
            : "#ef4444",
        fontWeight: 900,
      },
      "& .MuiInputLabel-root": {
        color: "#ffffff",
      },
      "& .MuiInputLabel-root.Mui-focused": {
        color: "#FFD000",
      },
      "& .MuiOutlinedInput-notchedOutline": {
        borderColor:
          editMemberForm.fingerprintAccess === "Enabled"
            ? "#22c55e"
            : "#ef4444",
      },
      "&:hover .MuiOutlinedInput-notchedOutline": {
        borderColor: "#FFD000",
      },
      "& .MuiSelect-icon": {
        color: "#ffffff !important",
      },
    }}
  >
    <MuiMenuItem
      value="Enabled"
      sx={{
        color: "#22c55e",
        fontWeight: 900,
        backgroundColor: "#07140d",
        "&:hover": {
          backgroundColor: "#0d2b18",
        },
        "&.Mui-selected": {
          backgroundColor: "#123d21",
        },
      }}
    >
      â— Enabled
    </MuiMenuItem>

    <MuiMenuItem
      value="Disabled"
      sx={{
        color: "#ef4444",
        fontWeight: 900,
        backgroundColor: "#170909",
        "&:hover": {
          backgroundColor: "#321010",
        },
        "&.Mui-selected": {
          backgroundColor: "#461515",
        },
      }}
    >
      â— Disabled
    </MuiMenuItem>
  </TextField>
</Grid>
            <Grid item xs={12} md={6}><FormControlLabel control={<Checkbox checked={editMemberForm.paymentCompleted} onChange={(e)=>updateEditMemberForm("paymentCompleted",e.target.checked)}/>} label="Payment completed"/></Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{p:2,borderTop:"1px solid #1f2a3a"}}>
          <Button onClick={()=>setOpenEditMember(false)} disabled={savingEditMember} sx={{color:"#94a3b8",textTransform:"none"}}>Cancel</Button>
          <Button variant="contained" startIcon={savingEditMember?<CircularProgress size={17} color="inherit"/>:<Save/>} onClick={handleUpdateMember} disabled={savingEditMember} sx={{bgcolor:"#7c3aed",fontWeight:900,textTransform:"none","&:hover":{bgcolor:"#6d28d9"}}}>{savingEditMember?"Saving...":"Save Changes"}</Button>
        </DialogActions>
      </Dialog>

      {/* ===================================================
          ADD MEMBER DIALOG
      =================================================== */}

      <Dialog
        open={openAddMember}
        onClose={() =>
          setOpenAddMember(false)
        }
        fullWidth
        maxWidth="md"
        PaperProps={{
          sx: {
            bgcolor: "#ffffff",
            color: "#111111",
            border: "1px solid rgba(129, 92, 246, .35)",
            borderRadius: 4,
            boxShadow: "0 30px 100px rgba(0,0,0,.65)",
          },
        }}
      >
        <DialogTitle
          sx={{
            borderBottom: "1px solid #d1d5db",
            color: "#111111",
            "& .MuiTypography-root": {
              color: "#111111",
            },
          }}
        >
          <Typography
            variant="h5"
            fontWeight="bold"
          >
            Add New Member
          </Typography>

          <Typography
            color="text.secondary"
            variant="body2"
          >
            Member ID:{" "}
            {nextMemberId}
          </Typography>
        </DialogTitle>

        <DialogContent
          dividers
          sx={{
            bgcolor: "#ffffff",
            color: "#111111",
            borderColor: "#d1d5db",
            "& .MuiTextField-root": {
              "& .MuiInputBase-root": {
                color: "#111111",
                bgcolor: "#ffffff",
              },
              "& .MuiInputBase-input": {
                color: "#111111",
                WebkitTextFillColor: "#111111",
                caretColor: "#111111",
              },
              "& .MuiInputBase-input::placeholder": {
                color: "#6b7280",
                opacity: 1,
              },
              "& .MuiInputLabel-root": {
                color: "#111111",
                fontWeight: 700,
              },
              "& .MuiInputLabel-root.Mui-focused": {
                color: "#111111",
              },
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: "#9ca3af",
              },
              "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline": {
                borderColor: "#374151",
              },
              "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
                borderColor: "#111111",
                borderWidth: "2px",
              },
              "& .MuiSelect-select": {
                color: "#111111",
              },
              "& .MuiSelect-icon": {
                color: "#111111",
              },
              "& .MuiInputAdornment-root": {
                color: "#111111",
              },
              "& .MuiInputAdornment-root *": {
                color: "#111111",
              },
              "& .MuiSvgIcon-root": {
                color: "#111111",
              },
              "& .MuiOutlinedInput-root.Mui-disabled": {
                bgcolor: "#f3f4f6",
                opacity: 1,
              },
              "& .MuiOutlinedInput-root.Mui-disabled .MuiInputBase-input": {
                color: "#111111 !important",
                WebkitTextFillColor: "#111111 !important",
                opacity: 1,
              },
              "& .MuiInputLabel-root.Mui-disabled": {
                color: "#374151 !important",
              },
              "& .MuiFormHelperText-root": {
                color: "#4b5563 !important",
              },
              "& input::-webkit-calendar-picker-indicator": {
                filter: "brightness(0)",
                opacity: 0.85,
              },
            },
            "& .MuiFormControlLabel-label": {
              color: "#111111",
            },
            "& .MuiTypography-root": {
              color: "#111111",
            },
            "& .MuiSvgIcon-root": {
              color: "#111111",
            },
          }}
        >
          {/* PHOTO */}

          <Box
            sx={{
              mb: 3,
              textAlign: "center",
            }}
          >
            {form.photo ? (
              <Avatar
                src={form.photo}
                sx={{
                  width: 110,
                  height: 110,
                  mx: "auto",
                }}
              />
            ) : (
              <Avatar
                sx={{
                  width: 110,
                  height: 110,
                  mx: "auto",
                  bgcolor: "#e3f2fd",
                  color: "#030c16",
                }}
              >
                <PhotoCamera fontSize="large" />
              </Avatar>
            )}

            <Button
              component="label"
              variant="outlined"
              sx={{
                mt: 2,
                color: "#ffffff",
                borderColor: "rgba(234, 239, 240, 0.28)",
                "&:hover": {
                  borderColor: "#ffffff",
                  bgcolor: "rgba(195, 217, 217, 0.04)",
                },
                "& .MuiSvgIcon-root": {
                  color: "#ffffff",
                },
              }}
              startIcon={<PhotoCamera sx={{ color: "#ffffff" }} />}
            >
              Upload Photo

              <input
                hidden
                type="file"
                accept="image/*"
                onChange={
                  handlePhoto
                }
              />
            </Button>
          </Box>

          <Grid
            container
            spacing={2}
          >
            <Grid
              item
              xs={12}
              md={6}
            >
              <TextField
                fullWidth
                label="Fingerprint ID"
                placeholder="Example: 1025"
                value={
                  form.fingerprintId
                }
                onChange={(e) =>
                  updateForm(
                    "fingerprintId",
                    e.target.value
                  )
                }
              />
            </Grid>

            <Grid
              item
              xs={12}
              md={6}
            >
              <TextField
                fullWidth
                label="Member ID"
                value={
                  nextMemberId
                }
                disabled
              />
            </Grid>

            <Grid
              item
              xs={12}
              md={6}
            >
              <TextField
                fullWidth
                required
                label="Name"
                value={
                  form.name
                }
                onChange={(e) =>
                  updateForm(
                    "name",
                    e.target.value
                  )
                }
              />
            </Grid>

            <Grid
              item
              xs={12}
              md={6}
            >
              <TextField
                fullWidth
                required
                label="Phone"
                value={
                  form.phone
                }
                onChange={(e) =>
                  updateForm(
                    "phone",
                    e.target.value
                  )
                }
              />
            </Grid>

            <Grid
              item
              xs={12}
              md={6}
            >
              <TextField
                select
                fullWidth
                label="Plan"
                value={
                  form.plan
                }
                onChange={(e) =>
                  handlePlanChange(
                    e.target.value
                  )
                }
              >
                <MuiMenuItem value="Monthly">
                  Monthly
                </MuiMenuItem>

                <MuiMenuItem value="Quarterly">
                  Quarterly
                </MuiMenuItem>

                <MuiMenuItem value="Half Year">
                  Half Year
                </MuiMenuItem>

                <MuiMenuItem value="Yearly">
                  Yearly
                </MuiMenuItem>
              </TextField>
            </Grid>

            <Grid
              item
              xs={12}
              md={6}
            >
              <TextField
                fullWidth
                type="date"
                label="Joining Date"
                InputLabelProps={{
                  shrink: true,
                }}
                value={
                  form.joiningDate
                }
                onChange={(e) =>
                  updateForm(
                    "joiningDate",
                    e.target.value
                  )
                }
              />
              <Typography
                sx={{
                  mt: 0.6,
                  ml: 0.5,
                  fontSize: 11,
                  color: "rgba(255,255,255,.55)",
                }}
              >
                Expiry updates automatically according to the selected plan.
              </Typography>
            </Grid>

            <Grid
              item
              xs={12}
              md={6}
            >
              <TextField
                fullWidth
                type="date"
                label="Expiry Date"
                InputLabelProps={{
                  shrink: true,
                }}
                value={expiryDate}
                disabled
                helperText="Automatic: joining date + selected plan duration"
              />
            </Grid>

            <Grid
              item
              xs={12}
              md={6}
            >
              <TextField
                fullWidth
                type="number"
                label="Plan Fee"
                value={
                  form.planFee
                }
                onChange={(e) =>
                  updateForm(
                    "planFee",
                    e.target.value
                  )
                }
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      ${String.fromCharCode(0x20B9)}
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid
              item
              xs={12}
              md={6}
            >
              <TextField
                fullWidth
                type="number"
                label="Fee Received"
                value={
                  form.feeReceived
                }
                onChange={(e) =>
                  updateForm(
                    "feeReceived",
                    e.target.value
                  )
                }
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      ${String.fromCharCode(0x20B9)}
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid
              item
              xs={12}
              md={6}
            >
              <TextField
                select
                fullWidth
                label="Payment Method"
                value={
                  form.paymentMethod
                }
                onChange={(e) =>
                  updateForm(
                    "paymentMethod",
                    e.target.value
                  )
                }
              >
                <MuiMenuItem value="UPI">
                  UPI
                </MuiMenuItem>

                <MuiMenuItem value="Cash">
                  Cash
                </MuiMenuItem>

                <MuiMenuItem value="Card">
                  Card
                </MuiMenuItem>

                <MuiMenuItem value="Bank Transfer">
                  Bank Transfer
                </MuiMenuItem>
              </TextField>
            </Grid>

            <Grid
              item
              xs={12}
              md={6}
            >
              <TextField
                select
                fullWidth
                label="Payment Status"
                value={
                  form.paymentStatus
                }
                onChange={(e) =>
                  updateForm(
                    "paymentStatus",
                    e.target.value
                  )
                }
              >
                <MuiMenuItem value="Paid">
                  Paid
                </MuiMenuItem>

                <MuiMenuItem value="Partial">
                  Partial
                </MuiMenuItem>

                <MuiMenuItem value="Pending">
                  Pending
                </MuiMenuItem>
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 2, borderTop: "1px solid #d1d5db", bgcolor: "#ffffff" }}>
          <Button
            onClick={() =>
              setOpenAddMember(false)
            }
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={
              handleRegister
            }
            sx={{
              bgcolor: "#7c3aed",
              color: "#ffffff",
              fontWeight: 900,
              textTransform: "none",
              "&:hover": { bgcolor: "#6d28d9" },
              "& .MuiSvgIcon-root": { color: "#ffffff" },
            }}
            startIcon={<PersonAdd sx={{ color: "#ffffff" }} />}
          >
            Register Member
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

/* =========================================================
   WHATSAPP PAGE
========================================================= */

function WhatsAppPage({
  members,
  selectedMembers,
  message,
  filter,
  setFilter,
  setMessage,
  onToggle,
  onSelectAll,
  onClearAll,
  onSend,
  onSendSingle,
}) {
  const allSelected =
    members.length > 0 &&
    members.every((member) =>
      selectedMembers.includes(
        member.id
      )
    );

  return (
    <Box className="cuboid-whatsapp">
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h4"
          fontWeight="bold"
        >
          WhatsApp Messages
        </Typography>

        <Typography
          color="text.secondary"
          sx={{ mt: 0.5 }}
        >
          Select multiple members and
          send personalized WhatsApp
          messages.
        </Typography>
      </Box>

      <Grid
        container
        spacing={3}
      >
        {/* =================================================
            MESSAGE BOX
        ================================================= */}

        <Grid
          item
          xs={12}
          md={5}
        >
          <Card
            className="cuboid-whatsapp-card"
            sx={{
              borderRadius: 3,
              height: "100%",
            }}
          >
            <CardContent>
              <Box className="cuboid-whatsapp-header">
                <Box className="cuboid-whatsapp-icon">
                  <Message />
                </Box>
                <Box>
                  <Typography className="cuboid-whatsapp-title" variant="h6" fontWeight="bold">
                    Write Message
                  </Typography>
                  <Typography className="cuboid-whatsapp-subtitle">
                    Compose and send personalized member communication
                  </Typography>
                </Box>
              </Box>

              <TextField
                fullWidth
                multiline
                minRows={12}
                label="WhatsApp Message"
                placeholder="Write your message..."
                value={message}
                onChange={(e) =>
                  setMessage(
                    e.target.value
                  )
                }
              />

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  mt: 2,
                  mb: 2,
                }}
              >
                Available variables:
              </Typography>

              <Box
                sx={{
                  display: "flex",
                  gap: 1,
                  flexWrap: "wrap",
                  mb: 3,
                }}
              >
                <Chip className="whatsapp-variable"
                  label="{name}"
                  size="small"
                />

                <Chip className="whatsapp-variable"
                  label="{id}"
                  size="small"
                />

                <Chip className="whatsapp-variable"
                  label="{phone}"
                  size="small"
                />

                <Chip className="whatsapp-variable"
                  label="{plan}"
                  size="small"
                />

                <Chip className="whatsapp-variable"
                  label="{expiry}"
                  size="small"
                />
              </Box>

              <Button
                className="whatsapp-send"
                fullWidth
                variant="contained"
                size="large"
                startIcon={<WhatsApp />}
                disabled={
                  selectedMembers.length ===
                  0
                }
                onClick={onSend}
                sx={{
                  py: 1.5,
                  textTransform:
                    "none",
                  fontWeight: "bold",
                }}
              >
                Send to{" "}
                {selectedMembers.length}{" "}
                Selected
              </Button>

              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  display: "block",
                  mt: 2,
                }}
              >
                WhatsApp Web/App will open
                for the selected members.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* =================================================
            MEMBER SELECTOR
        ================================================= */}

        <Grid
          item
          xs={12}
          md={7}
        >
          <Card
            className="cuboid-whatsapp-card"
            sx={{
              borderRadius: 3,
            }}
          >
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "center",
                  gap: 2,
                  flexWrap: "wrap",
                  mb: 2,
                }}
              >
                <Box>
                  <Typography
                    className="cuboid-whatsapp-title"
                    variant="h6"
                    fontWeight="bold"
                  >
                    Select Members
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                  >
                    {
                      selectedMembers.length
                    }{" "}
                    selected
                  </Typography>
                </Box>

                <TextField
                  select
                  size="small"
                  label="Filter"
                  value={filter}
                  onChange={(e) =>
                    setFilter(
                      e.target.value
                    )
                  }
                  sx={{
                    minWidth: 160,
                  }}
                >
                  <MuiMenuItem value="All">
                    All Members
                  </MuiMenuItem>

                  <MuiMenuItem value="Active">
                    Active
                  </MuiMenuItem>

                  <MuiMenuItem value="Expiring">
                    Expiring Soon
                  </MuiMenuItem>

                  <MuiMenuItem value="Expired">
                    Expired
                  </MuiMenuItem>
                </TextField>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  gap: 1,
                  mb: 2,
                }}
              >
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={
                    <SelectAll />
                  }
                  onClick={
                    onSelectAll
                  }
                  disabled={
                    members.length === 0
                  }
                >
                  Select All
                </Button>

                <Button
                  size="small"
                  variant="outlined"
                  color="inherit"
                  startIcon={
                    <ClearAll />
                  }
                  onClick={
                    onClearAll
                  }
                >
                  Clear
                </Button>
              </Box>

              <Box
                className="whatsapp-table-shell"
                sx={{
                  borderRadius: 2,
                  overflow: "hidden",
                }}
              >
                {members.length === 0 ? (
                  <Box
                    sx={{
                      textAlign:
                        "center",
                      py: 6,
                    }}
                  >
                    <Typography
                      color="text.secondary"
                    >
                      No members found.
                    </Typography>
                  </Box>
                ) : (
                  <>
                    <Box
                      className="whatsapp-member-head"
                      sx={{
                        display:
                          "grid",
                        gridTemplateColumns:
                          "50px 1fr 130px 120px 110px",
                        gap: 1,
                        alignItems:
                          "center",
                        px: 2,
                        py: 1.5,
                        bgcolor:
                          "#f8fafc",
                        borderBottom:
                          "1px solid #f5f5f5",
                        fontWeight:
                          "bold",
                        fontSize: 13,
                      }}
                    >
                      <Checkbox
                        checked={
                          allSelected
                        }
                        onChange={() => {
                          if (
                            allSelected
                          ) {
                            onClearAll();
                          } else {
                            onSelectAll();
                          }
                        }}
                      />

                      <span>
                        Member
                      </span>

                      <span>
                        Phone
                      </span>

                      <span>
                        Status
                      </span>

                      <span>
                        Action
                      </span>
                    </Box>

                    {members.map(
                      (member) => {
                        const selected =
                          selectedMembers.includes(
                            member.id
                          );

                        return (
                          <Box
                            key={
                              member.id
                            }
                            className={`whatsapp-member-row${selected ? " is-selected" : ""}`}
                            sx={{
                              display:
                                "grid",
                              gridTemplateColumns:
                                "50px 1fr 130px 120px 110px",
                              gap: 1,
                              alignItems:
                                "center",
                              px: 2,
                              py: 1.5,
                              borderBottom:
                                "1px solid #eee",
                              
                            }}
                          >
                            <Checkbox
                              checked={
                                selected
                              }
                              onChange={() =>
                                onToggle(
                                  member.id
                                )
                              }
                            />

                            <Box>
                              <Typography
                                fontWeight="600"
                              >
                                {
                                  member.name
                                }
                              </Typography>

                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {
                                  member.id
                                }
                              </Typography>
                            </Box>

                            <Typography
                              variant="body2"
                            >
                              {
                                member.phone
                              }
                            </Typography>

                            <Chip
                              label={
                                member.status
                              }
                              size="small"
                              color={
                                member.status ===
                                "Active"
                                  ? "success"
                                  : "error"
                              }
                            />

                            <Button
                              className="whatsapp-single"
                              size="small"
                              variant="outlined"
                              startIcon={
                                <WhatsApp />
                              }
                              onClick={() =>
                                onSendSingle(
                                  member
                                )
                              }
                              sx={{
                                textTransform:
                                  "none",
                              }}
                            >
                              Send
                            </Button>
                          </Box>
                        );
                      }
                    )}
                  </>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

/* =========================================================
   MEMBERS CARD
========================================================= */

function MembersCard({
  members,
  search,
  setSearch,
  onAdd,
  onDelete,
  onMemberClick,
}) {

  function exportMembersExcel() {
    const headers = [
      "Member ID",
      "Fingerprint ID",
      "Name",
      "Phone",
      "Email",
      "Plan",
      "Joining Date",
      "Payment Date",
      "Expiry Date",
      "Status",
      "Amount",
    ];

    const rows = members.map((member) => [
      member.id || "",
      member.fingerprintId || "",
      member.name || "",
      member.phone || "",
      member.email || "",
      member.plan || "",
      member.joiningDate || "",
      member.paymentDate || "",
      member.expiryDate || "",
      member.status || "",
      member.amount || "",
    ]);

    const csv = [
      headers,
      ...rows,
    ]
      .map((row) =>
        row.map((value) =>
          '"' + String(value).replace(/"/g, '""') + '"'
        ).join(",")
      )
      .join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download =
      "gym_members_" +
      new Date().toISOString().slice(0, 10) +
      ".csv";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }
  return (
    <Box className="cuboid-card" sx={{ borderRadius:3, bgcolor:"rgba(11,18,32,.88)", border:"1px solid #292929", overflow:"hidden" }}>
      <Box sx={{p:{xs:1.8,sm:2.2},display:"flex",justifyContent:"space-between",alignItems:"center",gap:2,flexWrap:"wrap",borderBottom:"1px solid #1b2638"}}>
        <Box><Typography sx={{fontWeight:950,fontSize:15}}>Member Directory</Typography><Typography sx={{fontSize:10,color:"#64748b",mt:.3}}>{members.length} members Â· Click a member to open full profile</Typography></Box>
        <Box sx={{display:"flex",gap:1,alignItems:"center",flexWrap:"wrap"}}>
          <TextField size="small" placeholder="Search members..." value={search} onChange={(e)=>setSearch(e.target.value)} InputProps={{startAdornment:<InputAdornment position="start"><Search sx={{color:"#64748b"}}/></InputAdornment>}} sx={{minWidth:{xs:180,sm:240},"& .MuiOutlinedInput-root":{bgcolor:"#0a101c",color:"#f5f5f5","& fieldset":{borderColor:"#243043"}}}} />
          <Button
  variant="outlined"
  onClick={exportMembersExcel}
  sx={{
    textTransform: "none",
    fontWeight: 900,
    borderRadius: 2,
    borderColor: "#7c3aed",
    color: "#a78bfa",
    "&:hover": {
      borderColor: "#a78bfa",
      bgcolor: "rgba(124,58,237,.10)"
    }
  }}
>
  Export Excel
</Button>

<Button
  variant="contained"
  startIcon={<PersonAdd/>}
  onClick={onAdd}
  sx={{
    textTransform: "none",
    fontWeight: 900,
    bgcolor: "#7c3aed",
    borderRadius: 2,
    "&:hover": {
      bgcolor: "#6d28d9"
    }
  }}
>
  Add Member
</Button>
        </Box>
      </Box>
      <MemberTable members={members} onDelete={onDelete} onMemberClick={onMemberClick}/>
    </Box>
  );
}

/* =========================================================
   EXPIRED MEMBERS
========================================================= */

function ExpiredMembersCard({
  members,
  search,
  setSearch,
  onDelete,
}) {
  const filtered = members.filter(
    (member) => {
      const value = search
        .trim()
        .toLowerCase();

      if (!value) return true;

      return (
        String(member.id || "")
          .toLowerCase()
          .includes(value) ||
        String(member.name || "")
          .toLowerCase()
          .includes(value) ||
        String(member.phone || "")
          .toLowerCase()
          .includes(value)
      );
    }
  );

  return (
    <Card
      sx={{
        mt: 1,
        borderRadius: 3,
      }}
    >
      <CardContent>
        <Box
          sx={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            mb: 3,
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <Box>
            <Typography
              variant="h5"
              fontWeight="600"
            >
              Expired Members
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.5 }}
            >
              Members whose membership
              expiry date has passed.
            </Typography>
          </Box>

          <TextField
            size="small"
            placeholder="Search expired members..."
            value={search}
            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        {filtered.length === 0 ? (
          <EmptyState
            title="No expired members"
            text="Everyone currently has an active membership."
          />
        ) : (
          <MemberTable
            members={filtered}
            onDelete={onDelete}
          />
        )}
      </CardContent>
    </Card>
  );
}

/* =========================================================
   EXPIRING SOON
========================================================= */

function ExpiringSoonCard({
  members,
  onDelete,
}) {
  return (
    <Card
      sx={{
        mt: 1,
        borderRadius: 3,
      }}
    >
      <CardContent>
        <Typography
          variant="h5"
          fontWeight="600"
        >
          Expiring in Next 3 Days
        </Typography>

        <Typography
          color="text.secondary"
          sx={{
            mt: 0.5,
            mb: 3,
          }}
        >
          Members whose membership will
          expire within the next 3 days.
        </Typography>

        {members.length === 0 ? (
          <EmptyState
            title="No memberships expiring soon"
            text="There are no memberships expiring in the next 3 days."
          />
        ) : (
          <MemberTable
            members={members}
            onDelete={onDelete}
          />
        )}
      </CardContent>
    </Card>
  );
}

/* =========================================================
   MEMBER TABLE
========================================================= */

function MemberTable({ members, onDelete, onMemberClick }) {
  const sortedMembers = [...members].sort((a, b) => {
    const aId = Number(a.id);
    const bId = Number(b.id);

    if (Number.isFinite(aId) && Number.isFinite(bId)) {
      return aId - bId;
    }

    if (Number.isFinite(aId)) return -1;
    if (Number.isFinite(bId)) return 1;

    return String(a.id || "").localeCompare(
      String(b.id || ""),
      undefined,
      { numeric: true }
    );
  });

  return (
    <Box sx={{overflowX:"auto"}}>
      <Box sx={{minWidth:900}}>
        <Box sx={{display:"grid",gridTemplateColumns:"95px 1.15fr 105px 105px 120px 120px 95px 95px",gap:1,px:2,py:1.3,color:"#64748b",fontSize:9,fontWeight:900,letterSpacing:1,textTransform:"uppercase",borderBottom:"1px solid #182235"}}>
          <span>Member ID</span>
          <span>Member</span>
          <span>Fingerprint</span>
          <span>Plan</span>
          <span>Joining Date</span>
          <span>Expiry</span>
          <span>Status</span>
          <span>Actions</span>
        </Box>

        {sortedMembers.length === 0 ? (
          <Box sx={{textAlign:"center",py:7,color:"#64748b"}}>
            <Typography sx={{color:"#64748b"}}>
              No members found.
            </Typography>
          </Box>
        ) : (
          sortedMembers.map((member, i) => (
            <Box
              key={member.id}
              className="cuboid-hover"
              onClick={() => onMemberClick?.(member)}
              sx={{
                display:"grid",
                gridTemplateColumns:"95px 1.15fr 105px 105px 120px 120px 95px 95px",
                gap:1,
                alignItems:"center",
                px:2,
                py:1.45,
                borderBottom:"1px solid #111a29",
                cursor:"pointer",
                animation:`cuboidRise ${.12+i*.05}s ease both`
              }}
            >
              <Typography sx={{fontSize:10,color:"#8b5cf6",fontWeight:900}}>
                {member.id}
              </Typography>

              <Box sx={{display:"flex",alignItems:"center",gap:1.2}}>
                <Avatar
                  sx={{
                    width:30,
                    height:30,
                    fontSize:11,
                    fontWeight:900,
                    bgcolor:"#172033",
                    color:"#c4b5fd"
                  }}
                >
                  {String(member.name || "?").charAt(0).toUpperCase()}
                </Avatar>
                <Box>
                  <Typography sx={{fontSize:11,fontWeight:800,color:"#f1f5f9"}}>
                    {member.name}
                  </Typography>
                  <Typography sx={{fontSize:9,color:"#64748b"}}>
                    {member.phone || "—"}
                  </Typography>
                </Box>
              </Box>

              <Typography sx={{fontSize:10,color:"#cbd5e1"}}>
                {member.fingerprintId || "—"}
              </Typography>

              <Typography sx={{fontSize:10,color:"#cbd5e1"}}>
                {member.plan || "—"}
              </Typography>

              <Typography sx={{fontSize:10,color:"#94a3b8"}}>
                {member.joiningDate || "—"}
              </Typography>

              <Typography sx={{fontSize:10,color:"#94a3b8"}}>
                {member.expiryDate || "—"}
              </Typography>

              <Typography sx={{fontSize:9,fontWeight:900,color:"#22c55e"}}>
                {member.status || "Active"}
              </Typography>

              <Box sx={{display:"flex",gap:.5}}>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMemberClick?.(member);
                  }}
                >
                  <Edit sx={{fontSize:15}} />
                </IconButton>

                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete?.(member);
                  }}
                >
                  <DeleteIcon sx={{fontSize:15}} />
                </IconButton>
              </Box>
            </Box>
          ))
        )}
      </Box>
    </Box>
  );
}
function EmptyState({
  title,
  text,
}) {
  return (
    <Box
      sx={{
        textAlign: "center",
        py: 8,
      }}
    >
      <CheckCircle
        sx={{
          fontSize: 50,
          color: "success.main",
        }}
      />

      <Typography
        variant="h6"
        sx={{ mt: 1 }}
      >
        {title}
      </Typography>

      <Typography color="text.secondary">
        {text}
      </Typography>
    </Box>
  );
}

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
  title,
  value,
  icon,
}) {
  return (
    <Grid
      item
      xs={12}
      sm={6}
      md={3}
    >
      <Card
        sx={{
          borderRadius: 3,
          height: "100%",
        }}
      >
        <CardContent>
          <Box
            sx={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems: "center",
            }}
          >
            <Box>
              <Typography
                color="text.secondary"
                variant="body2"
              >
                {title}
              </Typography>

              <Typography
                variant="h4"
                fontWeight="bold"
                sx={{ mt: 1 }}
              >
                {value}
              </Typography>
            </Box>

            <Avatar
              sx={{
                bgcolor: "#e3f2fd",
                color: "#FFD000",
              }}
            >
              {icon}
            </Avatar>
          </Box>
        </CardContent>
      </Card>
    </Grid>
  );
}

/* =========================================================
   SIDEBAR ITEM
========================================================= */

function SidebarItem({
  icon,
  text,
  active,
  onClick,
}) {
  return (
    <ListItemButton
      onClick={onClick}
      sx={{
        borderRadius: 2,
        mb: 0.5,
        bgcolor: active
          ? "#FFD000"
          : "transparent",
        "&:hover": {
          bgcolor: active
            ? "#FFD000"
            : "#1f2937",
        },
      }}
    >
      <ListItemIcon
        sx={{
          color: "white",
          minWidth: 42,
        }}
      >
        {icon}
      </ListItemIcon>

      <ListItemText
        primary={text}
      />
    </ListItemButton>
  );
}

/* =========================================================
   SECTION
========================================================= */

function Section({
  title,
  children,
}) {
  return (
    <Card
      sx={{
        p: 4,
        borderRadius: 3,
      }}
    >
      <Typography
        variant="h5"
        fontWeight="bold"
      >
        {title}
      </Typography>

      <Typography
        className="cuboid-secondary"
        sx={{ mt: 1 }}
      >
        {children}
      </Typography>
    </Card>
  );
}
/* =========================================================
   FINANCIAL ANALYSIS
   CURRENT MONTH INCOMING MONEY
========================================================= */

function PaymentsPage({ members }) {
  const records = [...members].sort((a,b) => String(b.paymentDate || "").localeCompare(String(a.paymentDate || "")));
  return (
    <Box>
      <Typography variant="h5" fontWeight="bold">Payments</Typography>
      <Typography color="text.secondary" sx={{mt:.5,mb:3}}>All member payment records, including UTR / transaction IDs.</Typography>
      <Card sx={{borderRadius:3}}>
        <CardContent>
          {records.length === 0 ? (
            <Typography color="text.secondary">No payment records yet.</Typography>
          ) : records.map((member) => (
            <Box key={member.id} sx={{p:2,mb:1.2,border:"1px solid #e2e8f0",borderRadius:2.5}}>
              <Stack direction={{xs:"column",md:"row"}} spacing={2} justifyContent="space-between">
                <Box>
                  <Typography fontWeight={900}>{member.name} Â· Member {member.id}</Typography>
                  <Typography variant="body2" color="text.secondary">Plan: {member.plan} Â· Date: {member.paymentDate || "—"}</Typography>
                  <Typography variant="body2" color="text.secondary">Method: {member.paymentMethod || "—"} Â· UTR: {member.transactionId || "—"}</Typography>
                </Box>
                <Box sx={{textAlign:{xs:"left",md:"right"}}}>
                  <Typography fontWeight={950}>${String.fromCharCode(0x20B9)}{Number(member.feeReceived || member.planFee || 0).toLocaleString("en-IN")}</Typography>
                  <Chip size="small" label={member.paymentStatus || "Pending"} color={member.paymentStatus === "Paid" ? "success" : "warning"} sx={{mt:.5}}/>
                </Box>
              </Stack>
            </Box>
          ))}
        </CardContent>
      </Card>
    </Box>
  );
}

function FinancialAnalysis({ members }) {
  const now = new Date();

  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const monthName = now.toLocaleString(
    "en-IN",
    {
      month: "long",
    }
  );

  const monthlyPayments = members.filter(
    (member) => {
      if (!member.paymentDate) {
        return false;
      }

      const paymentDate = new Date(
        `${member.paymentDate}T00:00:00`
      );

      return (
        paymentDate.getMonth() ===
          currentMonth &&
        paymentDate.getFullYear() ===
          currentYear
      );
    }
  );

  const monthlyIncoming =
    monthlyPayments.reduce(
      (total, member) => {
        return (
          total +
          (Number(
            member.feeReceived
          ) || 0)
        );
      },
      0
    );

  return (
    <Box>
      <Typography
        variant="h5"
        fontWeight="bold"
      >
        Financial Analysis
      </Typography>

      <Typography
        color="text.secondary"
        sx={{
          mt: 0.5,
          mb: 3,
        }}
      >
        Incoming money for{" "}
        {monthName} {currentYear}
      </Typography>

      <Grid
        container
        spacing={3}
      >

        {/* TOTAL INCOMING */}

        <Grid
          item
          xs={12}
          md={6}
        >
          <Card
            sx={{
              borderRadius: 3,
            }}
          >
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "center",
                }}
              >
                <Box>
                  <Typography
                    color="text.secondary"
                    variant="body2"
                  >
                    Monthly Incoming Money
                  </Typography>

                  <Typography
                    variant="h3"
                    fontWeight="bold"
                    sx={{
                      mt: 1,
                    }}
                  >
                    ${String.fromCharCode(0x20B9)}
                    {monthlyIncoming.toLocaleString(
                      "en-IN"
                    )}
                  </Typography>

                  <Typography
                    color="text.secondary"
                    sx={{
                      mt: 1,
                    }}
                  >
                    {monthName}{" "}
                    {currentYear}
                  </Typography>
                </Box>

                <Avatar
                  sx={{
                    width: 60,
                    height: 60,
                    bgcolor:
                      "#e8f5e9",
                    color:
                      "#2e7d32",
                  }}
                >
                  <AccountBalanceWallet />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* PAYMENT COUNT */}

        <Grid
          item
          xs={12}
          md={6}
        >
          <Card
            sx={{
              borderRadius: 3,
            }}
          >
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "center",
                }}
              >
                <Box>
                  <Typography
                    color="text.secondary"
                    variant="body2"
                  >
                    Payments Received
                  </Typography>

                  <Typography
                    variant="h3"
                    fontWeight="bold"
                    sx={{
                      mt: 1,
                    }}
                  >
                    {
                      monthlyPayments.length
                    }
                  </Typography>

                  <Typography
                    color="text.secondary"
                    sx={{
                      mt: 1,
                    }}
                  >
                    Payments this month
                  </Typography>
                </Box>

                <Avatar
                  sx={{
                    width: 60,
                    height: 60,
                    bgcolor:
                      "#e3f2fd",
                    color:
                      "#FFD000",
                  }}
                >
                  <Payments />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

      </Grid>

      {/* PAYMENT LIST */}

      <Card
        sx={{
          mt: 4,
          borderRadius: 3,
        }}
      >
        <CardContent>

          <Typography
            variant="h6"
            fontWeight="600"
            sx={{
              mb: 3,
            }}
          >
            {monthName}{" "}
            {currentYear} ${String.fromCharCode(0x2014)} Incoming Payments
          </Typography>

          {monthlyPayments.length === 0 ? (
            <Box
              sx={{
                textAlign: "center",
                py: 6,
              }}
            >
              <Typography
                color="text.secondary"
              >
                No incoming payments
                recorded this month.
              </Typography>
            </Box>
          ) : (
            <>
              {/* TABLE HEADER */}

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns:
                    "120px 1fr 140px 140px 120px",
                  gap: 2,
                  px: 2,
                  pb: 1,
                  color:
                    "text.secondary",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                <span>Member ID</span>
                <span>Member</span>
                <span>Payment Date</span>
                <span>Method</span>
                <span>Amount</span>
              </Box>

              {/* PAYMENTS */}

              {monthlyPayments.map(
                (member) => (
                  <Box
                    key={member.id}
                    sx={{
                      display: "grid",
                      gridTemplateColumns:
                        "120px 1fr 140px 140px 120px",
                      alignItems:
                        "center",
                      p: 2,
                      borderTop:
                        "1px solid #eee",
                      gap: 2,
                    }}
                  >
                    <Typography
                      fontWeight="600"
                    >
                      {member.id}
                    </Typography>

                    <Box>
                      <Typography>
                        {member.name}
                      </Typography>

                      <Typography
                        variant="caption"
                        color="text.secondary"
                      >
                        {member.phone}
                      </Typography>
                    </Box>

                    <Typography>
                      {
                        member.paymentDate
                      }
                    </Typography>

                    <Chip
                      label={
                        member.paymentMethod ||
                        "N/A"
                      }
                      size="small"
                    />

                    <Typography
                      fontWeight="bold"
                    >
                      ${String.fromCharCode(0x20B9)}
                      {(
                        Number(
                          member.feeReceived
                        ) || 0
                      ).toLocaleString(
                        "en-IN"
                      )}
                    </Typography>
                  </Box>
                )
              )}

              {/* TOTAL */}

              <Box
                sx={{
                  display: "flex",
                  justifyContent:
                    "flex-end",
                  mt: 3,
                  pt: 2,
                  borderTop:
                    "2px solid #ddd",
                }}
              >
                <Typography
                  variant="h6"
                  fontWeight="bold"
                >
                  Total Incoming: ${String.fromCharCode(0x20B9)}
                  {monthlyIncoming.toLocaleString(
                    "en-IN"
                  )}
                </Typography>
              </Box>
            </>
          )}

        </CardContent>
      </Card>
    </Box>
  );
}
function RegistrationApprovals({
  requests,
  onApprove,
  onReject,
}) {
  return (
    <Box>
      <Typography
        variant="h5"
        fontWeight="bold"
        sx={{ mb: 1 }}
      >
        Registration Approvals
      </Typography>

      <Typography
        color="text.secondary"
        sx={{ mb: 3 }}
      >
        Review pending member registrations.
      </Typography>

      <Card
        sx={{
          borderRadius: 3,
        }}
      >
        <CardContent>
          {requests.length === 0 ? (
            <Box
              sx={{
                textAlign: "center",
                py: 6,
              }}
            >
              <CheckCircle
                sx={{
                  fontSize: 50,
                  color: "success.main",
                }}
              />

              <Typography
                variant="h6"
                sx={{ mt: 1 }}
              >
                No pending registrations
              </Typography>

              <Typography color="text.secondary">
                There are no registration requests
                waiting for approval.
              </Typography>
            </Box>
          ) : (
            <>
              {requests.map((request) => (
                <Card
                  key={request.id}
                  variant="outlined"
                  sx={{
                    mb: 2,
                    borderRadius: 2,
                  }}
                >
                  <CardContent>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 2,
                        flexWrap: "wrap",
                      }}
                    >
                      <Box>
                        <Typography
                          variant="h6"
                          fontWeight="bold"
                        >
                          {request.name}
                        </Typography>

                        <Typography color="text.secondary">
                          Phone: {request.phone}
                        </Typography>

                        {request.plan && (
                          <Typography color="text.secondary">
                            Plan: {request.plan}
                          </Typography>
                        )}

                        {request.joiningDate && (
                          <Typography color="text.secondary">
                            Joining Date:{" "}
                            {request.joiningDate}
                          </Typography>
                        )}
                      </Box>

                      <Box sx={{mt:1}}>
                        <Typography color="text.secondary">Membership / Gym / Fingerprint ID: {request.memberId || request.fingerprintId || "—"}</Typography>
                        <Typography color="text.secondary" sx={{fontWeight:800}}>Payment: ${String.fromCharCode(0x20B9)}{Number(request.paymentAmount || 0).toLocaleString("en-IN")} Â· {request.paymentStatus || "Submitted"}</Typography>
                        <Typography color="text.secondary" sx={{fontWeight:800}}>
  UTR / Transaction ID: {request.transactionId || request.utr || request.paymentTransactionId || "NOT STORED"}
</Typography>
                      </Box>

                      <Chip
                        label="Pending"
                        color="warning"
                      />
                    </Box>

                    <Box
                      sx={{
                        display: "flex",
                        gap: 1,
                        mt: 3,
                      }}
                    >
                      <Button
                        variant="contained"
                        color="success"
                        startIcon={<ThumbUp />}
                        onClick={() =>
                          onApprove(request)
                        }
                      >
                        Approve
                      </Button>

                      <Button
                        variant="outlined"
                        color="error"
                        startIcon={<ThumbDown />}
                        onClick={() =>
                          onReject(request)
                        }
                      >
                        Reject
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

export default App;   









