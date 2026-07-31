export function uid() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function formatCurrency(n) {
  const num = Number(n) || 0;
  return num.toLocaleString("vi-VN") + " đ";
}

export function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d)) return "—";
  return d.toLocaleDateString("vi-VN");
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  if (isNaN(target)) return null;
  target.setHours(0, 0, 0, 0);
  return Math.round((target - today) / 86400000);
}

export function escapeHtml(str = "") {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

const VI_DIGITS = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
const VI_UNITS = ["", "nghìn", "triệu", "tỷ"];

function viThreeDigits(n, fullZero) {
  const h = Math.floor(n / 100);
  const t = Math.floor((n % 100) / 10);
  const u = n % 10;
  let out = "";
  if (h > 0 || fullZero) out += `${VI_DIGITS[h]} trăm `;
  if (t > 1) {
    out += `${VI_DIGITS[t]} mươi `;
    if (u === 1) out += "mốt ";
    else if (u === 5) out += "lăm ";
    else if (u > 0) out += `${VI_DIGITS[u]} `;
  } else if (t === 1) {
    out += "mười ";
    if (u === 5) out += "lăm ";
    else if (u > 0) out += `${VI_DIGITS[u]} `;
  } else if (t === 0 && u > 0) {
    if (h > 0 || fullZero) out += "lẻ ";
    out += `${VI_DIGITS[u]} `;
  }
  return out.trim();
}

// Vietnamese amount-in-words, as required on official contracts/quotes.
export function numberToWordsVi(amount) {
  const n = Math.round(Math.abs(Number(amount) || 0));
  if (n === 0) return "Không đồng";
  const groups = [];
  let rest = n;
  while (rest > 0) {
    groups.unshift(rest % 1000);
    rest = Math.floor(rest / 1000);
  }
  const parts = [];
  groups.forEach((g, idx) => {
    if (g === 0) return;
    const unitIdx = groups.length - 1 - idx;
    const fullZero = idx > 0;
    parts.push(`${viThreeDigits(g, fullZero)} ${VI_UNITS[unitIdx] || ""}`.trim());
  });
  const words = parts.join(" ").replace(/\s+/g, " ").trim();
  const capitalized = words.charAt(0).toUpperCase() + words.slice(1);
  return `${capitalized} đồng`;
}

const EN_ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const EN_TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
const EN_UNITS = ["", "Thousand", "Million", "Billion"];

function enThreeDigits(n) {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  let out = "";
  if (h > 0) out += `${EN_ONES[h]} Hundred `;
  if (rest >= 20) {
    out += EN_TENS[Math.floor(rest / 10)];
    if (rest % 10 > 0) out += `-${EN_ONES[rest % 10]}`;
    out += " ";
  } else if (rest > 0) {
    out += `${EN_ONES[rest]} `;
  }
  return out.trim();
}

// English amount-in-words, used for the EN print template.
export function numberToWordsEn(amount) {
  const n = Math.round(Math.abs(Number(amount) || 0));
  if (n === 0) return "Zero dong";
  const groups = [];
  let rest = n;
  while (rest > 0) {
    groups.unshift(rest % 1000);
    rest = Math.floor(rest / 1000);
  }
  const parts = [];
  groups.forEach((g, idx) => {
    if (g === 0) return;
    const unitIdx = groups.length - 1 - idx;
    parts.push(`${enThreeDigits(g)} ${EN_UNITS[unitIdx] || ""}`.trim());
  });
  return `${parts.join(" ").replace(/\s+/g, " ").trim()} dong`;
}
