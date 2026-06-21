const nodemailer = require("nodemailer");
const pmPlanService = require("./pmPlan");

const alertLabels = {
  today: "ต้องทำวันนี้",
  upcoming: "ใกล้ถึงใน 7 วัน",
  overdue: "เลยกำหนด",
};

const shouldIncludeOverdueAlerts = () =>
  process.env.PM_ALERT_INCLUDE_OVERDUE === "true";

const getPreviewLimit = () => {
  const limit = Number(process.env.PM_ALERT_PREVIEW_LIMIT || 5);

  return Number.isInteger(limit) && limit > 0 ? limit : 5;
};

const formatDate = (date) => {
  if (!date) return "-";
  const [year, month, day] = new Date(date).toISOString().slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
};

const formatAlertDateTime = () => {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();
  const hour = String(now.getHours()).padStart(2, "0");
  const minute = String(now.getMinutes()).padStart(2, "0");

  return `${day}/${month}/${year} เวลา ${hour}:${minute}`;
};
  
const formatPlanDetails = (plan, index) => {
  const deviceName = plan.device?.deviceName || "-";
  const serialNumber = plan.device?.serialNumber || "-";
  const zoneCode = plan.device?.zone?.code || "-";
  const groupName = plan.device?.type?.group?.name || "-";
  const typeName = plan.device?.type?.name || "-";
  const countdownLabel =
    plan.countdownLabel ||
    pmPlanService.getCountdownLabel(plan.planDate, plan.status);

  return [
    `${index}. ${countdownLabel} | ${formatDate(plan.planDate)}`,
    `   ${deviceName} | Zone: ${zoneCode}`,
    `   SN: ${serialNumber} | ${groupName} / ${typeName}`,
  ].join("\n");
};

const addAlertSection = (lines, key, plans, options = {}) => {
  if (!plans.length) {
    return;
  }

  const limit = options.showAll ? plans.length : getPreviewLimit();
  const visiblePlans = plans.slice(0, limit);

  lines.push(`${alertLabels[key]} ${plans.length} รายการ`);
  lines.push(
    ...visiblePlans.map((plan, index) => formatPlanDetails(plan, index + 1))
  );

  if (plans.length > visiblePlans.length) {
    lines.push(`...และอีก ${plans.length - visiblePlans.length} รายการ`);
  }

  lines.push("");
};

const splitTextForLine = (text, maxLength = 4500) => {
  if (text.length <= maxLength) {
    return [text];
  }

  const chunks = [];
  let currentChunk = "";

  for (const line of text.split("\n")) {
    const nextChunk = currentChunk ? `${currentChunk}\n${line}` : line;

    if (nextChunk.length > maxLength) {
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      currentChunk = line;
    } else {
      currentChunk = nextChunk;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
};

const buildAlertMessage = (alerts, options = {}) => {
  const alertKeys = options.includeOverdue
    ? ["today", "upcoming", "overdue"]
    : ["today", "upcoming"];
  const total = alertKeys.reduce(
    (sum, key) => sum + (alerts[key]?.length || 0),
    0
  );

  if (total === 0) {
    return null;
  }

  const lines = [
    "PM System Alert",
    `ประจำวันที่ ${formatAlertDateTime()}`,
    "",
    "สรุปงาน PM",
    `- ${alertLabels.today}: ${alerts.today.length} รายการ`,
    `- ${alertLabels.upcoming}: ${alerts.upcoming.length} รายการ`,
    ...(options.includeOverdue
      ? [`- ${alertLabels.overdue}: ${alerts.overdue.length} รายการ`]
      : []),
    "",
  ];

  addAlertSection(lines, "today", alerts.today, { showAll: true });
  addAlertSection(lines, "upcoming", alerts.upcoming);

  if (options.includeOverdue) {
    addAlertSection(lines, "overdue", alerts.overdue);
  }

  lines.push("เปิด PM System > PM Plans เพื่อดูทั้งหมด");

  return lines.join("\n").trim();
};

const sendLineMessage = async (message) => {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const to = process.env.LINE_TO_ID;

  if (!token || !to) {
    return {
      enabled: false,
      sent: false,
      message: "LINE is not configured",
    };
  }

  const chunks = splitTextForLine(message);

  for (let index = 0; index < chunks.length; index += 5) {
    const response = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to,
        messages: chunks.slice(index, index + 5).map((text) => ({
          type: "text",
          text,
        })),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      const error = new Error(`LINE send failed: ${errorText}`);
      error.status = response.status;
      throw error;
    }
  }

  return {
    enabled: true,
    sent: true,
    message:
      chunks.length > 1
        ? `LINE alert sent (${chunks.length} messages)`
        : "LINE alert sent",
  };
};

const sendEmailMessage = async (subject, message) => {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.ALERT_EMAIL_FROM;
  const to = process.env.ALERT_EMAIL_TO;

  if (!host || !port || !from || !to) {
    return {
      enabled: false,
      sent: false,
      message: "Email is not configured",
    };
  }

  const transporter = nodemailer.createTransport({
    host,
    port: Number(port),
    secure: process.env.SMTP_SECURE === "true",
    auth: user && pass ? { user, pass } : undefined,
  });

  await transporter.sendMail({
    from,
    to,
    subject,
    text: message,
  });

  return {
    enabled: true,
    sent: true,
    message: "Email alert sent",
  };
};

exports.sendPMAlerts = async () => {
  const alerts = await pmPlanService.getAlerts();
  const includeOverdue = shouldIncludeOverdueAlerts();
  const message = buildAlertMessage(alerts, { includeOverdue });

  if (!message) {
    return {
      sent: false,
      message: "No PM alerts to send",
      alerts,
      skipped: {
        overdue: includeOverdue ? 0 : alerts.overdue.length,
      },
      channels: {},
    };
  }

  const channels = {};

  try {
    channels.line = await sendLineMessage(message);
  } catch (error) {
    channels.line = {
      enabled: true,
      sent: false,
      message: error.message,
    };
  }

  try {
    channels.email = await sendEmailMessage("PM System Alert", message);
  } catch (error) {
    channels.email = {
      enabled: true,
      sent: false,
      message: error.message,
    };
  }

  return {
    sent: channels.line.sent || channels.email.sent,
    message:
      channels.line.sent || channels.email.sent
        ? "PM alerts sent"
        : "PM alerts were not sent",
    alertText: message,
    alerts,
    skipped: {
      overdue: includeOverdue ? 0 : alerts.overdue.length,
    },
    channels,
  };
};
