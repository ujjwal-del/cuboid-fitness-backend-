import { useEffect, useMemo, useRef, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import {
  ArrowUpward,
  CameraAlt,
  CheckCircle,
  FitnessCenter,
  Payments,
  Person,
  Phone,
  Replay,
  ShieldOutlined,
} from "@mui/icons-material";

const API_URL = "http://localhost:3001";

const BOT_ANIMATIONS = `
  @keyframes botMessageIn {
    from { opacity: 0; transform: translateY(12px) scale(.98); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes botAvatarPulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(139,92,246,.18), 0 0 18px rgba(139,92,246,.12); }
    50% { box-shadow: 0 0 0 8px rgba(139,92,246,0), 0 0 32px rgba(139,92,246,.38); }
  }
  @keyframes botOrbFloat {
    0%, 100% { transform: translate3d(0,0,0) rotate(0deg); }
    50% { transform: translate3d(0,-12px,0) rotate(6deg); }
  }
  @keyframes botScan {
    0% { transform: translateX(-120%); opacity:0; }
    15% { opacity:1; }
    70% { opacity:1; }
    100% { transform: translateX(420%); opacity:0; }
  }
  @keyframes botDot {
    0%, 60%, 100% { transform: translateY(0); opacity:.35; }
    30% { transform: translateY(-4px); opacity:1; }
  }
  @keyframes botButtonGlow {
    0%, 100% { box-shadow: 0 8px 22px rgba(15,23,42,.06); }
    50% { box-shadow: 0 10px 30px rgba(99,102,241,.14); }
  }
  .bot-message { animation: botMessageIn .42s cubic-bezier(.2,.8,.2,1) both; }
  .bot-composer { position:relative; overflow:hidden; }
  .bot-composer:after {
    content:""; position:absolute; top:0; left:-35%; width:18%; height:100%;
    background:linear-gradient(90deg,transparent,rgba(139,92,246,.08),transparent);
    transform:skewX(-18deg); animation:botScan 6s linear infinite; pointer-events:none;
  }
  .bot-choice { animation:botButtonGlow 3.2s ease-in-out infinite; transition:transform .2s ease,border-color .2s ease,background .2s ease; }
  .bot-choice:hover { transform:translateY(-2px); }

@keyframes cuboidFloat { 0%,100%{transform:translate3d(0,0,0) rotateX(8deg) rotateY(-10deg)} 50%{transform:translate3d(0,-18px,0) rotateX(-4deg) rotateY(14deg)} }
@keyframes cuboidFloatAlt { 0%,100%{transform:translate3d(0,0,0) rotateX(-8deg) rotateY(12deg)} 50%{transform:translate3d(0,20px,0) rotateX(7deg) rotateY(-14deg)} }
@keyframes dumbbellFloat { 0%,100%{transform:translate3d(0,0,0) rotate(-7deg)} 50%{transform:translate3d(10px,-16px,0) rotate(7deg)} }
@keyframes dumbbellFloatAlt { 0%,100%{transform:translate3d(0,0,0) rotate(8deg)} 50%{transform:translate3d(-12px,14px,0) rotate(-8deg)} }
@keyframes neonPulse { 0%,100%{opacity:.25;transform:scale(1)} 50%{opacity:.55;transform:scale(1.08)} }
@keyframes gridDrift { 0%{transform:perspective(700px) rotateX(58deg) translate(0,120px)} 100%{transform:perspective(700px) rotateX(58deg) translate(48px,168px)} }
.cuboid-stage{position:relative;overflow:hidden;isolation:isolate;background:radial-gradient(circle at 15% 18%,rgba(124,58,237,.18),transparent 28%),radial-gradient(circle at 88% 82%,rgba(6,182,212,.13),transparent 30%),#070a10}
.cuboid-grid{position:absolute;inset:-120px;z-index:0;opacity:.2;background-image:linear-gradient(rgba(139,92,246,.15) 1px,transparent 1px),linear-gradient(90deg,rgba(6,182,212,.15) 1px,transparent 1px);background-size:48px 48px;transform:perspective(700px) rotateX(58deg) translateY(120px);transform-origin:center bottom;animation:gridDrift 18s linear infinite;pointer-events:none}
.cuboid-glow{position:absolute;width:380px;height:380px;border-radius:50%;filter:blur(90px);pointer-events:none;z-index:0;animation:neonPulse 6s ease-in-out infinite}
.cuboid-shape{position:absolute;width:92px;height:92px;border:1px solid rgba(167,139,250,.42);background:linear-gradient(135deg,rgba(124,58,237,.12),rgba(6,182,212,.06));box-shadow:0 0 30px rgba(124,58,237,.16),inset 0 0 30px rgba(6,182,212,.07);transform-style:preserve-3d;pointer-events:none;z-index:1}
.cuboid-shape::before,.cuboid-shape::after{content:"";position:absolute;inset:9px;border:1px solid rgba(6,182,212,.2)}
.cuboid-shape::after{inset:20px;border-color:rgba(167,139,250,.18)}
.dumbbell{position:absolute;width:120px;height:30px;z-index:1;pointer-events:none;opacity:.24;filter:drop-shadow(0 0 14px rgba(124,58,237,.5))}
.dumbbell .bar{position:absolute;left:25px;right:25px;top:12px;height:6px;border-radius:99px;background:linear-gradient(90deg,#7c3aed,#22d3ee)}
.dumbbell .plate{position:absolute;top:3px;width:16px;height:24px;border-radius:4px;background:linear-gradient(180deg,#a78bfa,#06b6d4);box-shadow:0 0 12px rgba(124,58,237,.38)}
.dumbbell .plate.p1{left:12px}.dumbbell .plate.p2{left:0;height:30px;top:0}.dumbbell .plate.p3{right:12px}.dumbbell .plate.p4{right:0;height:30px;top:0}
.cuboid-content{position:relative;z-index:3}
.cuboid-panel{background:rgba(13,17,26,.82)!important;border:1px solid rgba(148,163,184,.14)!important;box-shadow:0 20px 60px rgba(0,0,0,.32),inset 0 1px 0 rgba(255,255,255,.035)!important;backdrop-filter:blur(18px)}
.cuboid-composer{background:rgba(12,16,24,.9)!important;border-color:rgba(139,92,246,.28)!important;box-shadow:0 18px 55px rgba(0,0,0,.42),0 0 32px rgba(124,58,237,.08)!important;backdrop-filter:blur(20px)}

@media (max-width: 700px) {
  .cuboid-shape {
    opacity: .25;
    transform: scale(.65);
  }
  .dumbbell {
    opacity: .12;
    transform: scale(.62) !important;
  }
  .cuboid-grid {
    opacity: .11;
  }
}
`;

const PLANS = [
  {
    id: "Monthly",
    title: "Monthly",
    duration: "1 Month",
    description: "Flexible monthly membership",
  },
  {
    id: "Quarterly",
    title: "Quarterly",
    duration: "3 Months",
    description: "Great for consistent training",
  },
  {
    id: "Half Year",
    title: "Half Year",
    duration: "6 Months",
    description: "Long-term fitness commitment",
  },
  {
    id: "Yearly",
    title: "Yearly",
    duration: "12 Months",
    description: "Best value membership",
    popular: true,
  },
];

function getToday() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getExpiryDate(joiningDate, plan) {
  if (!joiningDate) return "";

  const date = new Date(`${joiningDate}T00:00:00`);

  const months = {
    Monthly: 1,
    Quarterly: 3,
    "Half Year": 6,
    Yearly: 12,
  };

  date.setMonth(date.getMonth() + (months[plan] || 1));

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(dateString) {
  if (!dateString) return "—";
  const parts = dateString.split("-");
  if (parts.length !== 3) return dateString;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export default function CustomerRegister() {
  const today = getToday();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    plan: "",
    joiningDate: today,
    transactionId: "",
    photo: "",
  });

  const [messages, setMessages] = useState([
    {
      id: 1,
      from: "bot",
      text: "Hi! 👋 Welcome to our gym.",
    },
    {
      id: 2,
      from: "bot",
      text: "I’ll help you register your membership. It will only take a minute.",
    },
    {
      id: 3,
      from: "bot",
      text: "First, what’s your full name?",
    },
  ]);

  const [input, setInput] = useState("");
  const [stage, setStage] = useState("name");
  const [typing, setTyping] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [requestId, setRequestId] = useState("");
  const [error, setError] = useState("");

  const bottomRef = useRef(null);

  const expiryDate = useMemo(
    () => getExpiryDate(form.joiningDate, form.plan),
    [form.joiningDate, form.plan]
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function addMessage(from, text) {
    setMessages((current) => [
      ...current,
      {
        id: Date.now() + Math.random(),
        from,
        text,
      },
    ]);
  }

  function updateForm(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
    setError("");
  }

  function handlePhoto(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Photo must be smaller than 5 MB.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const img = new Image();

      img.onload = () => {
        const maxSize = 420;
        let width = img.width;
        let height = img.height;

        if (width > height && width > maxSize) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else if (height >= width && height > maxSize) {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");

        if (!ctx) {
          setError("Could not process the photo. Please try again.");
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Keep the Base64 payload safely below Excel's 32,767-character
        // cell limit used by the registration-request workbook.
        const compressedPhoto = canvas.toDataURL("image/jpeg", 0.58);

        updateForm(
          "photo",
          compressedPhoto.length <= 30000 ? compressedPhoto : ""
        );

        addMessage("user", "📷 Profile photo added");
        addMessage(
          "bot",
          "Perfect. Your photo is ready. 👍"
        );
        setStage("transaction");
        addMessage(
          "bot",
          "Please enter the UTR / transaction ID for your membership payment."
        );
      };

      img.onerror = () => {
        setError("Could not process the photo. Please try another image.");
      };

      img.src = reader.result;
    };

    reader.readAsDataURL(file);
  }

  function submitName() {
    const name = input.trim();

    if (!name) {
      setError("Please enter your full name.");
      return;
    }

    updateForm("name", name);
    addMessage("user", name);
    setInput("");

    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      addMessage(
        "bot",
        `Nice to meet you, ${name.split(" ")[0]}! 😊 What’s your 10-digit mobile number?`
      );
      setStage("phone");
    }, 250);
  }

  function submitPhone() {
    const phone = input.replace(/\D/g, "");

    if (phone.length !== 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    updateForm("phone", phone);
    addMessage("user", phone);
    setInput("");

    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      addMessage(
        "bot",
        "Great. Now choose the membership that works best for you:"
      );
      setStage("plan");
    }, 250);
  }

  function selectPlan(plan) {
    updateForm("plan", plan.id);
    addMessage("user", `${plan.title} — ${plan.duration}`);

    const expiry = getExpiryDate(form.joiningDate, plan.id);

    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      addMessage(
        "bot",
        `Excellent choice! Your membership would run from ${formatDate(
          form.joiningDate
        )} to ${formatDate(expiry)}.`
      );
      addMessage(
        "bot",
        "Would you like to add a profile photo? It helps gym staff identify you quickly."
      );
      setStage("photo");
    }, 250);
  }

  function skipPhoto() {
    addMessage("user", "Skip photo");
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      addMessage(
        "bot",
        "No problem. Please enter the UTR / transaction ID for your membership payment."
      );
    }, 450);
    setStage("transaction");
  }

  function submitTransaction() {
    const transactionId = input.replace(/\s/g, "");
    if (transactionId.length < 6 || transactionId.length > 50) {
      setError("Please enter a valid UTR / transaction ID (6 to 50 characters).");
      return;
    }
    updateForm("transactionId", transactionId);
    addMessage("user", transactionId);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      addMessage("bot", "Please review your details below and confirm your registration.");
      setStage("confirm");
    }, 250);
  }

  function startOver() {
    setForm({
      name: "",
      phone: "",
      plan: "",
      joiningDate: today,
      transactionId: "",
      photo: "",
    });

    setMessages([
      {
        id: Date.now(),
        from: "bot",
        text: "Hi again! 👋 Let’s start a new registration.",
      },
      {
        id: Date.now() + 1,
        from: "bot",
        text: "What’s your full name?",
      },
    ]);

    setStage("name");
    setInput("");
    setTyping(false);
    setError("");
    setSuccess(false);
    setRequestId("");
  }

  async function submitRegistration() {
    if (!form.name.trim()) {
      setError("Name is missing.");
      return;
    }

    if (form.phone.length !== 10) {
      setError("Phone number is invalid.");
      return;
    }

    if (!form.plan) {
      setError("Please select a membership plan.");
      return;
    }

    if (String(form.transactionId || "").length < 6) {
      setError("Please enter a valid UTR / transaction ID.");
      setStage("transaction");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const member = {
        fingerprintId: "",
        name: form.name.trim(),
        phone: form.phone,
        plan: form.plan,
        transactionId: form.transactionId,
        joiningDate: form.joiningDate,
        expiryDate,
        planFee: 0,
        feeReceived: 0,
        paymentMethod: "",
        paymentStatus: "Pending",
        paymentDate: form.joiningDate,
        status: "Pending",
        fingerprintAccess: "Disabled",
        photo:
          form.photo && form.photo.length <= 30000
            ? form.photo
            : "",
      };

      const response = await fetch(
        `${API_URL}/api/public/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(member),
        }
      );

      if (!response.ok) {
        let message = "Registration failed.";

        try {
          const errorData = await response.json();
          message = errorData.error || message;
        } catch {
          message = `Server error: ${response.status}`;
        }

        throw new Error(message);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Registration failed.");
      }

      const newRequestId =
        data.request?.requestId ||
        data.requestId ||
        data.id ||
        "";

      setRequestId(newRequestId);
      addMessage(
        "user",
        "Yes, everything looks correct. Submit my registration."
      );

      setTimeout(() => {
        setSuccess(true);
      }, 250);
    } catch (err) {
      console.error("CUSTOMER REGISTER ERROR:", err);
      setError(
        err.message ||
          "Unable to connect to the gym server."
      );
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <>
        <style>{BOT_ANIMATIONS}</style>
        <Box
        sx={{
          minHeight: "100vh",
          bgcolor: "#f7f8fa",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: { xs: 1.5, sm: 3 },
        }}
      >
        <Paper
          elevation={0}
          sx={{
            width: "100%",
            maxWidth: 560,
            bgcolor: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 5,
            boxShadow: "0 24px 80px rgba(15,23,42,.10)",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              height: 7,
              bgcolor: "#111827",
            }}
          />

          <Box sx={{ p: { xs: 3, sm: 5 }, textAlign: "center" }}>
            <Box
              sx={{
                width: 76,
                height: 76,
                mx: "auto",
                borderRadius: "50%",
                bgcolor: "#ecfdf5",
                color: "#16a34a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CheckCircle sx={{ fontSize: 48 }} />
            </Box>

            <Typography
              sx={{
                mt: 2.5,
                fontSize: { xs: 28, sm: 34 },
                fontWeight: 900,
                letterSpacing: "-.7px",
                color: "#0f172a",
              }}
            >
              Registration submitted
            </Typography>

            <Typography
              sx={{
                mt: 1,
                color: "#64748b",
                lineHeight: 1.7,
                fontSize: 14,
              }}
            >
              Your request has been sent to the gym team. Your membership
              becomes active after admin approval.
            </Typography>

            <Box
              sx={{
                mt: 3,
                p: 2.5,
                bgcolor: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 3,
              }}
            >
              <Typography
                sx={{
                  fontSize: 10,
                  fontWeight: 900,
                  color: "#94a3b8",
                  letterSpacing: 1.4,
                }}
              >
                REQUEST ID
              </Typography>

              <Typography
                sx={{
                  mt: .7,
                  fontSize: 28,
                  fontWeight: 900,
                  letterSpacing: 1.5,
                  color: "#111827",
                }}
              >
                {requestId || "PENDING"}
              </Typography>

              <Chip
                label="Pending approval"
                size="small"
                sx={{
                  mt: 1.3,
                  bgcolor: "#fff7ed",
                  color: "#c2410c",
                  fontWeight: 800,
                }}
              />
            </Box>

            <Box
              sx={{
                mt: 2,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 1,
              }}
            >
              <Box
                sx={{
                  p: 1.7,
                  bgcolor: "#f8fafc",
                  borderRadius: 2.5,
                  textAlign: "left",
                }}
              >
                <Typography sx={{ fontSize: 10, color: "#94a3b8", fontWeight: 800 }}>
                  MEMBERSHIP
                </Typography>
                <Typography sx={{ mt: .4, fontWeight: 800, fontSize: 13 }}>
                  {form.plan}
                </Typography>
              </Box>

              <Box
                sx={{
                  p: 1.7,
                  bgcolor: "#f8fafc",
                  borderRadius: 2.5,
                  textAlign: "left",
                }}
              >
                <Typography sx={{ fontSize: 10, color: "#94a3b8", fontWeight: 800 }}>
                  EXPIRY
                </Typography>
                <Typography sx={{ mt: .4, fontWeight: 800, fontSize: 13 }}>
                  {formatDate(expiryDate)}
                </Typography>
              </Box>
            </Box>

            <Button
              fullWidth
              onClick={startOver}
              startIcon={<Replay />}
              sx={{
                mt: 2.5,
                py: 1.4,
                borderRadius: 2.5,
                bgcolor: "#111827",
                color: "#fff",
                fontWeight: 900,
                textTransform: "none",
                "&:hover": { bgcolor: "#1f2937" },
              }}
            >
              Start new registration
            </Button>
          </Box>
        </Paper>
        </Box>
      </>
    );
  }

  return (
    <>
      <style>{BOT_ANIMATIONS}</style>
      <Box
      className="cuboid-stage"
      sx={{
        minHeight: "100vh",
        bgcolor: "#070a10",
        color: "#0f172a",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box className="cuboid-grid" />
      <Box className="cuboid-glow" sx={{ top: -170, left: -160, bgcolor: "#7c3aed" }} />
      <Box className="cuboid-glow" sx={{ right: -180, bottom: -180, bgcolor: "#06b6d4", animationDelay: "1.8s" }} />

      <Box className="cuboid-shape" sx={{ top: "13%", left: "3%", animation: "cuboidFloat 8s ease-in-out infinite" }} />
      <Box className="cuboid-shape" sx={{ width: 66, height: 66, top: "54%", right: "4%", animation: "cuboidFloatAlt 10s ease-in-out infinite", animationDelay: "-2s" }} />
      <Box className="cuboid-shape" sx={{ width: 48, height: 48, bottom: "8%", left: "11%", animation: "cuboidFloatAlt 9s ease-in-out infinite", animationDelay: "-4s" }} />

      <Box className="dumbbell" sx={{ top: "25%", right: "7%", animation: "dumbbellFloat 7s ease-in-out infinite" }}>
        <Box className="bar" /><Box className="plate p1" /><Box className="plate p2" /><Box className="plate p3" /><Box className="plate p4" />
      </Box>

      <Box className="dumbbell" sx={{ bottom: "18%", left: "4%", animation: "dumbbellFloatAlt 8s ease-in-out infinite", transform: "scale(.72)" }}>
        <Box className="bar" /><Box className="plate p1" /><Box className="plate p2" /><Box className="plate p3" /><Box className="plate p4" />
      </Box>

      <Box className="cuboid-content">
      {/* Professional assistant header */}
      <Box
        sx={{
          height: { xs: 68, sm: 76 },
          bgcolor: "rgba(8,11,16,.88)",
          color: "#fff",
          px: { xs: 1.5, sm: 4 },
          display: "flex",
          position: "relative",
          zIndex: 5,
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 5px 24px rgba(0,0,0,.28)",
          borderBottom: "1px solid rgba(139,92,246,.16)",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.4 }}>
          <Avatar
            sx={{
              width: 40,
              height: 40,
              bgcolor: "#fff",
              color: "#0b0f14",
            }}
          >
            <FitnessCenter sx={{ fontSize: 20 }} />
          </Avatar>

          <Box>
            <Typography
              sx={{
                fontWeight: 900,
                fontSize: 14,
                letterSpacing: .4,
              }}
            >
              GYM
            </Typography>
            <Typography
              sx={{
                color: "#94a3b8",
                fontSize: 9,
                letterSpacing: 1.6,
                fontWeight: 800,
              }}
            >
              MEMBERSHIP ASSISTANT
            </Typography>
          </Box>
        </Box>

        <Chip
          icon={<ShieldOutlined sx={{ fontSize: 14 }} />}
          label="Secure"
          size="small"
          sx={{
            display: { xs: "none", sm: "flex" },
            bgcolor: "#14261d",
            color: "#86efac",
            fontWeight: 800,
          }}
        />
      </Box>

      {/* Animated bot environment */}
      <Box sx={{position:"fixed",inset:0,pointerEvents:"none",overflow:"hidden",opacity:.75}}>
        <Box sx={{position:"absolute",width:180,height:180,border:"1px solid rgba(139,92,246,.18)",transform:"rotate(45deg)",top:150,right:"10%",animation:"botOrbFloat 7s ease-in-out infinite"}}/>
        <Box sx={{position:"absolute",width:110,height:110,border:"1px solid rgba(34,211,238,.13)",transform:"rotate(45deg)",bottom:120,left:"8%",animation:"botOrbFloat 9s ease-in-out infinite reverse"}}/>
        <Box sx={{position:"absolute",width:420,height:420,borderRadius:"50%",background:"radial-gradient(circle,rgba(124,58,237,.09),transparent 68%)",filter:"blur(8px)",top:"22%",left:"50%",transform:"translateX(-50%)"}}/>
      </Box>

      {/* Conversation */}
      <Box
        sx={{
          flex: 1,
          width: "100%",
          maxWidth: 780,
          mx: "auto",
          display: "flex",
          flexDirection: "column",
          minHeight: "calc(100vh - 76px)",
          px: { xs: 1.25, sm: 2.5 },
        }}
      >
        <Box
          sx={{
            flex: 1,
            width: "100%",
            maxWidth: 760,
            mx: "auto",
            overflowY: "auto",
            py: { xs: 2.5, sm: 4 },
            px: { xs: .25, sm: 1 },
            scrollbarWidth: "thin",
          }}
        >
          {messages.map((message) => (
            <Box
              key={message.id}
              className="bot-message"
              sx={{
                display: "flex",
                justifyContent:
                  message.from === "user"
                    ? "flex-end"
                    : "flex-start",
                alignItems: "flex-end",
                gap: 1,
                mb: 1.7,
              }}
            >
              {message.from === "bot" && (
                <Avatar
                  sx={{
                    width: 34,
                    height: 34,
                    flexShrink: 0,
                    bgcolor: "#111827",
                    animation: "botAvatarPulse 2.8s ease-in-out infinite",
                    border: "1px solid rgba(167,139,250,.35)",
                  }}
                >
                  <FitnessCenter sx={{ fontSize: 16 }} />
                </Avatar>
              )}

              <Box
                sx={{
                  maxWidth: { xs: "86%", sm: "66%" },
                }}
              >
                <Box
                  sx={{
                    px: 1.8,
                    py: 1.35,
                    bgcolor:
                      message.from === "user"
                        ? "#111827"
                        : "#fff",
                    color:
                      message.from === "user"
                        ? "#fff"
                        : "#1e293b",
                    border:
                      message.from === "user"
                        ? "none"
                        : "1px solid #e5e7eb",
                    borderRadius:
                      message.from === "user"
                        ? "18px 18px 5px 18px"
                        : "18px 18px 18px 5px",
                    boxShadow:
                      message.from === "user"
                        ? "none"
                        : "0 3px 14px rgba(15,23,42,.045)",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: 14,
                      lineHeight: 1.65,
                      whiteSpace: "pre-line",
                    }}
                  >
                    {message.text}
                  </Typography>
                </Box>
              </Box>
            </Box>
          ))}

          {loading && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                color: "#64748b",
                px: .5,
                fontSize: 12,
              }}
            >
              <CircularProgress size={15} />
              Sending your registration request...
            </Box>
          )}

          {typing && (
            <Box className="bot-message" sx={{ display:"flex", alignItems:"flex-end", gap:1, mb:1.7 }}>
              <Avatar sx={{ width:34, height:34, bgcolor:"#111827", animation:"botAvatarPulse 2.8s ease-in-out infinite" }}>
                <FitnessCenter sx={{fontSize:16}}/>
              </Avatar>
              <Box sx={{px:1.8,py:1.25,bgcolor:"#fff",border:"1px solid #e5e7eb",borderRadius:"18px 18px 18px 5px",boxShadow:"0 3px 14px rgba(15,23,42,.045)"}}>
                <Stack direction="row" spacing={.45}>
                  {[0,1,2].map(i => <Box key={i} sx={{width:5,height:5,borderRadius:"50%",bgcolor:"#8b5cf6",animation:`botDot 1.1s ${i*.15}s ease-in-out infinite`}}/>)}
                </Stack>
              </Box>
            </Box>
          )}

          <div ref={bottomRef} />
        </Box>

        {error && (
          <Box
            sx={{
              mb: 1,
              p: 1.4,
              borderRadius: 2.5,
              bgcolor: "#fff1f2",
              border: "1px solid #fecdd3",
            }}
          >
            <Typography
              sx={{
                color: "#be123c",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {error}
            </Typography>
          </Box>
        )}

        {/* Smart response composer */}
        <Paper
          elevation={0}
          className="bot-composer"
          sx={{
            borderRadius: 3.5,
            border: "1px solid #dbe2ea",
            bgcolor: "#fff",
            p: 1,
            boxShadow: "0 12px 38px rgba(15,23,42,.075)",
          }}
        >
          {stage === "plan" && (
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={.8}
            >
              {PLANS.map((plan) => (
                <Button
                  key={plan.id}
                  className="bot-choice"
                  onClick={() => selectPlan(plan)}
                  variant="outlined"
                  sx={{
                    flex: 1,
                    minHeight: 58,
                    px: 1.4,
                    borderRadius: 2.5,
                    borderColor: "#e2e8f0",
                    color: "#111827",
                    textTransform: "none",
                    fontWeight: 800,
                    justifyContent: "space-between",
                    "&:hover": {
                      borderColor: "#111827",
                      bgcolor: "#f8fafc",
                    },
                  }}
                >
                  <Box sx={{ textAlign: "left" }}>
                    <Typography sx={{ fontWeight: 900, fontSize: 13 }}>
                      {plan.title}
                    </Typography>
                    <Typography sx={{ color: "#64748b", fontSize: 11 }}>
                      {plan.duration}
                    </Typography>
                  </Box>
                  {plan.popular && (
                    <Chip
                      label="Best"
                      size="small"
                      sx={{
                        ml: 1,
                        height: 21,
                        fontSize: 9,
                        fontWeight: 900,
                      }}
                    />
                  )}
                </Button>
              ))}
            </Stack>
          )}

          {stage === "photo" && (
            <Stack direction={{ xs: "column", sm: "row" }} spacing={.8}>
              <Button
                component="label"
                fullWidth
                startIcon={<CameraAlt />}
                sx={{
                  py: 1.35,
                  borderRadius: 2.5,
                  bgcolor: "#111827",
                  color: "#fff",
                  textTransform: "none",
                  fontWeight: 900,
                  "&:hover": { bgcolor: "#1f2937" },
                }}
              >
                Add profile photo
                <input
                  hidden
                  type="file"
                  accept="image/*"
                  onChange={handlePhoto}
                />
              </Button>

              <Button
                onClick={skipPhoto}
                sx={{
                  px: 2.5,
                  py: 1.35,
                  borderRadius: 2.5,
                  color: "#475569",
                  textTransform: "none",
                  fontWeight: 800,
                }}
              >
                Skip
              </Button>
            </Stack>
          )}

          {stage === "confirm" && (
            <Box>
              <Box
                sx={{
                  p: 1.7,
                  mb: 1,
                  borderRadius: 2.8,
                  bgcolor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                }}
              >
                <Typography
                  sx={{
                    fontSize: 9,
                    letterSpacing: 1.3,
                    color: "#94a3b8",
                    fontWeight: 900,
                  }}
                >
                  REGISTRATION SUMMARY
                </Typography>

                <Stack spacing={.75} sx={{ mt: 1.2 }}>
                  <Typography sx={{ fontWeight: 900, fontSize: 14 }}>
                    {form.name}
                  </Typography>
                  <Typography sx={{ color: "#64748b", fontSize: 12 }}>
                    📱 +91 {form.phone}
                  </Typography>
                  <Typography sx={{ color: "#64748b", fontSize: 12 }}>
                    🏋️ {form.plan}
                  </Typography>
                  <Typography sx={{ color: "#64748b", fontSize: 12 }}>
                    📅 {formatDate(form.joiningDate)} →{" "}
                    {formatDate(expiryDate)}
                  </Typography>
                </Stack>
              </Box>

              <Button
                fullWidth
                onClick={submitRegistration}
                disabled={loading}
                startIcon={
                  loading ? (
                    <CircularProgress size={17} color="inherit" />
                  ) : (
                    <CheckCircle />
                  )
                }
                sx={{
                  py: 1.45,
                  borderRadius: 2.5,
                  bgcolor: "#111827",
                  color: "#fff",
                  textTransform: "none",
                  fontWeight: 900,
                  "&:hover": { bgcolor: "#1f2937" },
                }}
              >
                {loading
                  ? "Submitting..."
                  : "Confirm & send request"}
              </Button>
            </Box>
          )}

          {(stage === "name" || stage === "phone" || stage === "transaction") && (
            <Box
              component="form"
              onSubmit={(event) => {
                event.preventDefault();
                if (stage === "name") submitName();
                else if (stage === "phone") submitPhone();
                else submitTransaction();
              }}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: .8,
              }}
            >
              {stage === "name" ? (
                <Person sx={{ ml: .8, color: "#94a3b8" }} />
              ) : stage === "phone" ? (
                <Phone sx={{ ml: .8, color: "#94a3b8" }} />
              ) : (
                <Payments sx={{ ml: .8, color: "#94a3b8" }} />
              )}

              <TextField
                fullWidth
                autoFocus
                variant="standard"
                value={input}
                onChange={(event) => {
                  setInput(event.target.value);
                  setError("");
                }}
                placeholder={
                  stage === "name"
                    ? "Type your full name..."
                    : stage === "phone"
                      ? "Type your 10-digit mobile number..."
                      : "Type your UTR / transaction ID..."
                }
                type={stage === "email" ? "email" : "text"}
                sx={{
                  px: .5,
                  "& input": {
                    py: 1.25,
                    fontSize: 14,
                  },
                }}
              />

              <IconButton
                type="submit"
                sx={{
                  width: 44,
                  height: 44,
                  bgcolor: "#111827",
                  color: "#fff",
                  "&:hover": { bgcolor: "#1f2937" },
                }}
              >
                <ArrowUpward sx={{ fontSize: 20 }} />
              </IconButton>
            </Box>
          )}
        </Paper>

        <Typography
          sx={{
            textAlign: "center",
            color: "#94a3b8",
            fontSize: 10.5,
            py: 1.3,
          }}
        >
          Secure registration · Your request is reviewed by the gym team
        </Typography>
      </Box>
      </Box>
    </Box>
    </>
  );
}
