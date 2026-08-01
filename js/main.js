import { Store } from "./store.js";
import { uid, formatCurrency, formatDate, todayISO, daysUntil, escapeHtml, numberToWordsVi, numberToWordsEn } from "./utils.js";
import { drawBarChart, drawDonutChart } from "./charts.js";
import { LANGS, t } from "./i18n.js";

const STATUS_CONTRACT = {
  draft: { label: "Nháp", color: "#64748b" },
  active: { label: "Đang thực hiện", color: "#2563eb" },
  completed: { label: "Hoàn thành", color: "#16a34a" },
  cancelled: { label: "Đã hủy", color: "#dc2626" },
};

const STATUS_QUOTE = {
  draft: { label: "Nháp", color: "#64748b" },
  sent: { label: "Đã gửi", color: "#2563eb" },
  accepted: { label: "Chấp nhận", color: "#16a34a" },
  rejected: { label: "Từ chối", color: "#dc2626" },
  converted: { label: "Đã thành HĐ", color: "#7c3aed" },
};

const state = {
  view: "dashboard",
  contractSearch: "",
  contractStatus: "all",
  clientSearch: "",
  quoteSearch: "",
  quoteStatus: "all",
  reportYear: new Date().getFullYear(),
};

/* ---------------- Navigation ---------------- */
function setView(view) {
  state.view = view;
  document.querySelectorAll(".nav-item").forEach((b) => b.classList.toggle("active", b.dataset.view === view));
  document.querySelectorAll(".view").forEach((v) => v.classList.toggle("active", v.id === `view-${view}`));
  renderCurrentView();
}

function renderCurrentView() {
  switch (state.view) {
    case "dashboard": return renderDashboard();
    case "contracts": return renderContracts();
    case "clients": return renderClients();
    case "quotes": return renderQuotes();
    case "reports": return renderReports();
    case "settings": return renderSettings();
  }
}

document.querySelectorAll(".nav-item").forEach((btn) => {
  btn.addEventListener("click", () => setView(btn.dataset.view));
});

/* ---------------- Modal helper ---------------- */
const modalRoot = document.getElementById("modal-root");
let escListener = null;

function closeModal() {
  modalRoot.innerHTML = "";
  if (escListener) { document.removeEventListener("keydown", escListener); escListener = null; }
}

function openModal({ title, bodyHtml, footerHtml = "", onMount, wide = false }) {
  modalRoot.innerHTML = `
    <div class="modal-overlay">
      <div class="modal-dialog ${wide ? "wide" : ""}">
        <div class="modal-header">
          <h3>${title}</h3>
          <button class="icon-btn" data-close>&times;</button>
        </div>
        <div class="modal-body">${bodyHtml}</div>
        ${footerHtml ? `<div class="modal-footer">${footerHtml}</div>` : ""}
      </div>
    </div>`;
  const overlay = modalRoot.querySelector(".modal-overlay");
  overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });
  modalRoot.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", closeModal));
  escListener = (e) => { if (e.key === "Escape") closeModal(); };
  document.addEventListener("keydown", escListener);
  if (onMount) onMount(modalRoot.querySelector(".modal-dialog"));
}

/* ---------------- Language picker ---------------- */
function pickLanguageThen(onPick) {
  openModal({
    title: "Chọn ngôn ngữ in / Select print language",
    bodyHtml: `
      <div class="lang-grid">
        ${LANGS.map((l) => `<button type="button" class="btn lang-btn" data-lang="${l.code}">${l.name}</button>`).join("")}
      </div>
      <p class="hint" style="margin-top:12px">Nội dung do bạn tự nhập (mô tả, ghi chú...) sẽ giữ nguyên ngôn ngữ đã nhập; chỉ nhãn/điều khoản chuẩn được dịch.</p>
    `,
    footerHtml: `<button class="btn" data-close>Hủy</button>`,
    onMount: () => {
      modalRoot.querySelectorAll("[data-lang]").forEach((b) => b.addEventListener("click", () => {
        const lang = b.dataset.lang;
        closeModal();
        onPick(lang);
      }));
    },
  });
}

/* ---------------- Shared helpers ---------------- */
function clientOptions(selectedId) {
  const clients = Store.getClients().slice().sort((a, b) => a.name.localeCompare(b.name, "vi"));
  if (clients.length === 0) return `<option value="">— Chưa có khách hàng —</option>`;
  return clients.map((c) => `<option value="${c.id}" ${c.id === selectedId ? "selected" : ""}>${escapeHtml(c.name)}${c.company ? ` (${escapeHtml(c.company)})` : ""}</option>`).join("");
}

function statCard(label, value, tone) {
  return `<div class="stat-card tone-${tone}"><div class="stat-label">${label}</div><div class="stat-value">${value}</div></div>`;
}

function monthLabels() { return Array.from({ length: 12 }, (_, i) => `T${i + 1}`); }

function monthlyRevenue(contracts, year) {
  const arr = new Array(12).fill(0);
  contracts.forEach((c) => (c.payments || []).forEach((p) => {
    if (p.paidDate) {
      const d = new Date(p.paidDate);
      if (d.getFullYear() === year) arr[d.getMonth()] += Number(p.amount || 0);
    }
  }));
  return arr;
}

function quoteTotal(q) {
  const sub = (q.items || []).reduce((s, i) => s + Number(i.quantity || 0) * Number(i.unitPrice || 0), 0);
  const discount = sub * (Number(q.discountPct || 0) / 100);
  const afterDiscount = sub - discount;
  const tax = afterDiscount * (Number(q.taxPct || 0) / 100);
  return { sub, discount, tax, total: afterDiscount + tax };
}

/* ================= DASHBOARD ================= */
function renderDashboard() {
  const el = document.getElementById("view-dashboard");
  const contracts = Store.getContracts();
  const settings = Store.getSettings();

  const activeContracts = contracts.filter((c) => c.status === "active");
  const totalValue = contracts.filter((c) => c.status !== "cancelled").reduce((s, c) => s + Number(c.value || 0), 0);
  const totalPaid = contracts.reduce((s, c) => s + (c.payments || []).filter((p) => p.paidDate).reduce((s2, p) => s2 + Number(p.amount || 0), 0), 0);
  const totalOutstanding = Math.max(0, totalValue - totalPaid);

  const expiringSoon = activeContracts
    .filter((c) => { const d = daysUntil(c.endDate); return d !== null && d >= 0 && d <= (settings.reminderDays || 30); })
    .sort((a, b) => daysUntil(a.endDate) - daysUntil(b.endDate));
  const overdueContracts = activeContracts.filter((c) => { const d = daysUntil(c.endDate); return d !== null && d < 0; });

  const overduePayments = [];
  contracts.forEach((c) => (c.payments || []).forEach((p) => {
    if (!p.paidDate && p.dueDate && daysUntil(p.dueDate) < 0) overduePayments.push({ contract: c, payment: p });
  }));

  el.innerHTML = `
    <div class="page-header"><h2>Tổng quan</h2><p class="muted">Tình hình hợp đồng tư vấn của bạn.</p></div>
    <div class="stat-grid">
      ${statCard("Tổng hợp đồng", contracts.length, "blue")}
      ${statCard("Đang thực hiện", activeContracts.length, "indigo")}
      ${statCard("Tổng giá trị", formatCurrency(totalValue), "green")}
      ${statCard("Đã thu", formatCurrency(totalPaid), "teal")}
      ${statCard("Còn phải thu", formatCurrency(totalOutstanding), "amber")}
      ${statCard("Sắp / đã hết hạn", expiringSoon.length + overdueContracts.length, "red")}
    </div>
    <div class="grid-2">
      <div class="card">
        <h3>Doanh thu theo tháng (${new Date().getFullYear()})</h3>
        <canvas id="chart-revenue" height="220"></canvas>
      </div>
      <div class="card">
        <h3>Hợp đồng theo trạng thái</h3>
        <canvas id="chart-status" height="220"></canvas>
      </div>
    </div>
    <div class="grid-2">
      <div class="card">
        <h3>⏰ Hợp đồng sắp / đã hết hạn</h3>
        ${renderAlertList([...expiringSoon.map((c) => alertRowContract(c, false)), ...overdueContracts.map((c) => alertRowContract(c, true))])}
      </div>
      <div class="card">
        <h3>💸 Thanh toán quá hạn</h3>
        ${renderAlertList(overduePayments.map(({ contract, payment }) => alertRowPayment(contract, payment)))}
      </div>
    </div>
  `;

  drawBarChart(document.getElementById("chart-revenue"), monthLabels(), monthlyRevenue(contracts, new Date().getFullYear()), { formatValue: (v) => (v / 1e6).toFixed(0) + "tr" });
  drawDonutChart(document.getElementById("chart-status"), Object.entries(STATUS_CONTRACT).map(([key, meta]) => ({ label: meta.label, value: contracts.filter((c) => c.status === key).length, color: meta.color })));
}

function renderAlertList(rows) {
  if (rows.length === 0) return `<p class="empty">Không có cảnh báo nào 🎉</p>`;
  return `<ul class="alert-list">${rows.join("")}</ul>`;
}

function alertRowContract(c, overdue) {
  const d = daysUntil(c.endDate);
  const client = Store.getClient(c.clientId);
  return `<li class="alert-item ${overdue ? "danger" : "warning"}">
    <div><strong>${escapeHtml(c.code)}</strong> — ${escapeHtml(client ? client.name : "")}
    <div class="muted small">${escapeHtml(c.title || "")}</div></div>
    <span class="badge ${overdue ? "badge-red" : "badge-amber"}">${overdue ? `Quá hạn ${Math.abs(d)} ngày` : `Còn ${d} ngày`}</span>
  </li>`;
}

function alertRowPayment(contract, payment) {
  const client = Store.getClient(contract.clientId);
  const d = daysUntil(payment.dueDate);
  return `<li class="alert-item danger">
    <div><strong>${escapeHtml(contract.code)}</strong> — ${escapeHtml(client ? client.name : "")}
    <div class="muted small">Đợt thanh toán ${formatCurrency(payment.amount)}</div></div>
    <span class="badge badge-red">Quá hạn ${Math.abs(d)} ngày</span>
  </li>`;
}

/* ================= CONTRACTS ================= */
function renderContracts() {
  const el = document.getElementById("view-contracts");
  el.innerHTML = `
    <div class="page-header row">
      <div><h2>Hợp đồng</h2><p class="muted">Quản lý toàn bộ hợp đồng tư vấn</p></div>
      <button class="btn btn-primary" id="btn-add-contract">+ Thêm hợp đồng</button>
    </div>
    <div class="toolbar">
      <input type="text" id="contract-search" placeholder="Tìm theo mã, tiêu đề, khách hàng..." value="${escapeHtml(state.contractSearch)}" />
      <select id="contract-status-filter">
        <option value="all">Tất cả trạng thái</option>
        ${Object.entries(STATUS_CONTRACT).map(([k, m]) => `<option value="${k}" ${state.contractStatus === k ? "selected" : ""}>${m.label}</option>`).join("")}
      </select>
    </div>
    <div class="table-wrap"><table class="data-table">
      <thead><tr><th>Mã HĐ</th><th>Khách hàng</th><th>Tiêu đề</th><th>Giá trị</th><th>Bắt đầu</th><th>Kết thúc</th><th>Trạng thái</th><th>Thu / Còn lại</th><th></th></tr></thead>
      <tbody id="contracts-tbody"></tbody>
    </table></div>
  `;
  document.getElementById("btn-add-contract").addEventListener("click", () => openContractForm());
  document.getElementById("contract-search").addEventListener("input", (e) => { state.contractSearch = e.target.value; renderContractsTable(); });
  document.getElementById("contract-status-filter").addEventListener("change", (e) => { state.contractStatus = e.target.value; renderContractsTable(); });
  renderContractsTable();
}

function renderContractsTable() {
  const tbody = document.getElementById("contracts-tbody");
  if (!tbody) return;
  let contracts = Store.getContracts();
  const q = state.contractSearch.trim().toLowerCase();
  contracts = contracts.filter((c) => {
    const client = Store.getClient(c.clientId);
    const hay = `${c.code} ${c.title} ${client ? client.name : ""}`.toLowerCase();
    const matchQ = !q || hay.includes(q);
    const matchStatus = state.contractStatus === "all" || c.status === state.contractStatus;
    return matchQ && matchStatus;
  });
  contracts.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

  if (contracts.length === 0) { tbody.innerHTML = `<tr><td colspan="9" class="empty">Chưa có hợp đồng nào phù hợp</td></tr>`; return; }

  tbody.innerHTML = contracts.map((c) => {
    const client = Store.getClient(c.clientId);
    const paid = (c.payments || []).filter((p) => p.paidDate).reduce((s, p) => s + Number(p.amount || 0), 0);
    const remain = Math.max(0, Number(c.value || 0) - paid);
    const d = daysUntil(c.endDate);
    const meta = STATUS_CONTRACT[c.status] || { label: c.status, color: "#64748b" };
    let statusBadge = `<span class="badge" style="background:${meta.color}22;color:${meta.color}">${meta.label}</span>`;
    if (c.status === "active" && d !== null && d < 0) statusBadge += ` <span class="badge badge-red">Quá hạn</span>`;
    else if (c.status === "active" && d !== null && d <= 30) statusBadge += ` <span class="badge badge-amber">Còn ${d} ngày</span>`;
    return `<tr>
      <td>${escapeHtml(c.code)}</td>
      <td>${escapeHtml(client ? client.name : "—")}</td>
      <td>${escapeHtml(c.title || "")}</td>
      <td>${formatCurrency(c.value)}</td>
      <td>${formatDate(c.startDate)}</td>
      <td>${formatDate(c.endDate)}</td>
      <td>${statusBadge}</td>
      <td>${formatCurrency(paid)} / <span class="muted">${formatCurrency(remain)}</span></td>
      <td class="actions">
        <button class="icon-btn" data-view-id="${c.id}" title="Xem chi tiết">👁</button>
        <button class="icon-btn" data-print-id="${c.id}" title="In hợp đồng">🖨</button>
        <button class="icon-btn" data-edit-id="${c.id}" title="Sửa">✎</button>
        <button class="icon-btn danger" data-del-id="${c.id}" title="Xóa">🗑</button>
      </td>
    </tr>`;
  }).join("");

  tbody.querySelectorAll("[data-view-id]").forEach((b) => b.addEventListener("click", () => openContractDetail(b.dataset.viewId)));
  tbody.querySelectorAll("[data-print-id]").forEach((b) => b.addEventListener("click", () => pickLanguageThen((lang) => printContract(b.dataset.printId, lang))));
  tbody.querySelectorAll("[data-edit-id]").forEach((b) => b.addEventListener("click", () => openContractForm(b.dataset.editId)));
  tbody.querySelectorAll("[data-del-id]").forEach((b) => b.addEventListener("click", () => {
    if (confirm("Xóa hợp đồng này? Hành động không thể hoàn tác.")) { Store.deleteContract(b.dataset.delId); renderContractsTable(); }
  }));
}

function openContractForm(id, prefill, onSaved) {
  const editing = id ? Store.getContract(id) : null;
  const data = editing || prefill || {};
  openModal({
    title: editing ? "Sửa hợp đồng" : "Thêm hợp đồng",
    wide: true,
    bodyHtml: `
      <form id="contract-form" class="form-grid">
        <label>Khách hàng
          <select name="clientId" required>${clientOptions(data.clientId)}</select>
        </label>
        <label>Tiêu đề hợp đồng
          <input name="title" required value="${escapeHtml(data.title || "")}" placeholder="VD: Tư vấn chiến lược kinh doanh Q3" />
        </label>
        <label class="col-span-2">Mô tả / phạm vi công việc
          <textarea name="description" rows="2">${escapeHtml(data.description || "")}</textarea>
        </label>
        <label class="col-span-2">Địa điểm thực hiện (tùy chọn)
          <input name="location" value="${escapeHtml(data.location || "")}" placeholder="Để trống nếu thực hiện tại địa chỉ khách hàng" />
        </label>
        <label>Ngày ký
          <input type="date" name="signDate" value="${data.signDate || todayISO()}" />
        </label>
        <label>Ngày bắt đầu
          <input type="date" name="startDate" value="${data.startDate || todayISO()}" required />
        </label>
        <label>Ngày kết thúc
          <input type="date" name="endDate" value="${data.endDate || ""}" required />
        </label>
        <label>Giá trị hợp đồng (đ)
          <input type="number" name="value" min="0" step="1000" value="${data.value ?? ""}" required />
        </label>
        <label>Trạng thái
          <select name="status">${Object.entries(STATUS_CONTRACT).map(([k, m]) => `<option value="${k}" ${data.status ? (data.status === k ? "selected" : "") : (k === "draft" ? "selected" : "")}>${m.label}</option>`).join("")}</select>
        </label>
        <label class="col-span-2">Ghi chú
          <textarea name="note" rows="2">${escapeHtml(data.note || "")}</textarea>
        </label>
      </form>
      ${Store.getClients().length === 0 ? '<p class="hint">Bạn chưa có khách hàng nào. Hãy vào mục Khách hàng để thêm trước.</p>' : ""}
    `,
    footerHtml: `<button class="btn" data-close>Hủy</button><button class="btn btn-primary" id="contract-save">${editing ? "Lưu thay đổi" : "Tạo hợp đồng"}</button>`,
    onMount: () => {
      document.getElementById("contract-save").addEventListener("click", () => {
        const form = document.getElementById("contract-form");
        if (!form.reportValidity()) return;
        const payload = Object.fromEntries(new FormData(form).entries());
        payload.value = Number(payload.value);
        let saved;
        if (editing) {
          saved = Store.updateContract(editing.id, payload);
        } else {
          payload.code = Store.nextCode("HD");
          payload.payments = prefill?.payments || [];
          saved = Store.addContract(payload);
        }
        closeModal();
        if (onSaved) onSaved(saved);
        renderCurrentView();
      });
    },
  });
}

function openContractDetail(id) {
  const c = Store.getContract(id);
  if (!c) return;
  const client = Store.getClient(c.clientId);
  const paid = (c.payments || []).filter((p) => p.paidDate).reduce((s, p) => s + Number(p.amount || 0), 0);
  const remain = Math.max(0, Number(c.value || 0) - paid);
  openModal({
    title: `Chi tiết hợp đồng ${c.code}`,
    wide: true,
    bodyHtml: `
      <div class="detail-grid">
        <div><span class="muted">Khách hàng</span><div>${escapeHtml(client ? client.name : "—")}${client?.company ? ` (${escapeHtml(client.company)})` : ""}</div></div>
        <div><span class="muted">Trạng thái</span><div>${STATUS_CONTRACT[c.status]?.label || c.status}</div></div>
        <div><span class="muted">Ngày ký</span><div>${formatDate(c.signDate)}</div></div>
        <div><span class="muted">Thời hạn</span><div>${formatDate(c.startDate)} — ${formatDate(c.endDate)}</div></div>
        <div><span class="muted">Giá trị</span><div>${formatCurrency(c.value)}</div></div>
        <div><span class="muted">Đã thu / Còn lại</span><div>${formatCurrency(paid)} / ${formatCurrency(remain)}</div></div>
      </div>
      ${c.description ? `<p><span class="muted">Mô tả:</span> ${escapeHtml(c.description)}</p>` : ""}
      ${c.note ? `<p><span class="muted">Ghi chú:</span> ${escapeHtml(c.note)}</p>` : ""}
      <div class="row" style="margin-top:16px;align-items:center;">
        <h4 style="margin:0">Lịch thanh toán</h4>
        <button class="btn btn-sm" id="btn-add-payment">+ Thêm đợt thanh toán</button>
      </div>
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>Hạn thanh toán</th><th>Số tiền</th><th>Trạng thái</th><th>Ngày thu</th><th></th></tr></thead>
        <tbody id="payments-tbody"></tbody>
      </table></div>
    `,
    footerHtml: `<button class="btn" data-close>Đóng</button><button class="btn btn-primary" id="btn-print-contract">🖨 In hợp đồng</button>`,
    onMount: () => {
      renderPaymentsTbody(c.id);
      document.getElementById("btn-add-payment").addEventListener("click", () => openPaymentForm(c.id));
      document.getElementById("btn-print-contract").addEventListener("click", () => pickLanguageThen((lang) => printContract(c.id, lang)));
    },
  });
}

function renderPaymentsTbody(contractId) {
  const c = Store.getContract(contractId);
  const tbody = document.getElementById("payments-tbody");
  if (!tbody || !c) return;
  const payments = (c.payments || []).slice().sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));
  if (payments.length === 0) { tbody.innerHTML = `<tr><td colspan="5" class="empty">Chưa có đợt thanh toán nào</td></tr>`; return; }
  tbody.innerHTML = payments.map((p) => {
    const overdue = !p.paidDate && p.dueDate && daysUntil(p.dueDate) < 0;
    const status = p.paidDate ? `<span class="badge badge-green">Đã thu</span>` : overdue ? `<span class="badge badge-red">Quá hạn</span>` : `<span class="badge badge-amber">Chưa thu</span>`;
    return `<tr>
      <td>${formatDate(p.dueDate)}</td>
      <td>${formatCurrency(p.amount)}</td>
      <td>${status}</td>
      <td>${formatDate(p.paidDate)}</td>
      <td class="actions">
        ${!p.paidDate ? `<button class="icon-btn" data-mark-paid="${p.id}" title="Đánh dấu đã thu">✔</button>` : ""}
        <button class="icon-btn danger" data-del-payment="${p.id}" title="Xóa">🗑</button>
      </td>
    </tr>`;
  }).join("");

  tbody.querySelectorAll("[data-mark-paid]").forEach((b) => b.addEventListener("click", () => {
    const c2 = Store.getContract(contractId);
    const payments2 = c2.payments.map((p) => (p.id === b.dataset.markPaid ? { ...p, paidDate: todayISO() } : p));
    Store.updateContract(contractId, { payments: payments2 });
    renderPaymentsTbody(contractId);
    if (state.view === "contracts") renderContractsTable();
  }));
  tbody.querySelectorAll("[data-del-payment]").forEach((b) => b.addEventListener("click", () => {
    if (!confirm("Xóa đợt thanh toán này?")) return;
    const c2 = Store.getContract(contractId);
    Store.updateContract(contractId, { payments: c2.payments.filter((p) => p.id !== b.dataset.delPayment) });
    renderPaymentsTbody(contractId);
    if (state.view === "contracts") renderContractsTable();
  }));
}

function openPaymentForm(contractId) {
  openModal({
    title: "Thêm đợt thanh toán",
    bodyHtml: `
      <form id="payment-form" class="form-grid">
        <label>Hạn thanh toán
          <input type="date" name="dueDate" value="${todayISO()}" required />
        </label>
        <label>Số tiền (đ)
          <input type="number" name="amount" min="0" step="1000" required />
        </label>
        <label class="col-span-2">Ghi chú
          <input name="note" />
        </label>
        <label class="col-span-2"><input type="checkbox" name="paidNow" style="width:auto" /> Đã thu ngay hôm nay</label>
      </form>
    `,
    footerHtml: `<button class="btn" data-close>Hủy</button><button class="btn btn-primary" id="payment-save">Lưu</button>`,
    onMount: () => {
      document.getElementById("payment-save").addEventListener("click", () => {
        const form = document.getElementById("payment-form");
        if (!form.reportValidity()) return;
        const fd = new FormData(form);
        const c = Store.getContract(contractId);
        const payment = {
          id: uid(),
          dueDate: fd.get("dueDate"),
          amount: Number(fd.get("amount")),
          note: fd.get("note") || "",
          paidDate: fd.get("paidNow") ? todayISO() : null,
        };
        Store.updateContract(contractId, { payments: [...(c.payments || []), payment] });
        closeModal();
        openContractDetail(contractId);
      });
    },
  });
}

/* ================= CLIENTS ================= */
function renderClients() {
  const el = document.getElementById("view-clients");
  el.innerHTML = `
    <div class="page-header row">
      <div><h2>Khách hàng</h2><p class="muted">Danh sách khách hàng sử dụng dịch vụ tư vấn</p></div>
      <button class="btn btn-primary" id="btn-add-client">+ Thêm khách hàng</button>
    </div>
    <div class="toolbar">
      <input type="text" id="client-search" placeholder="Tìm theo tên, công ty, SĐT, email..." value="${escapeHtml(state.clientSearch)}" />
    </div>
    <div class="table-wrap"><table class="data-table">
      <thead><tr><th>Tên</th><th>Công ty</th><th>SĐT</th><th>Email</th><th>Số HĐ</th><th>Tổng giá trị</th><th></th></tr></thead>
      <tbody id="clients-tbody"></tbody>
    </table></div>
  `;
  document.getElementById("btn-add-client").addEventListener("click", () => openClientForm());
  document.getElementById("client-search").addEventListener("input", (e) => { state.clientSearch = e.target.value; renderClientsTable(); });
  renderClientsTable();
}

function renderClientsTable() {
  const tbody = document.getElementById("clients-tbody");
  if (!tbody) return;
  let clients = Store.getClients();
  const q = state.clientSearch.trim().toLowerCase();
  if (q) clients = clients.filter((c) => `${c.name} ${c.company || ""} ${c.phone || ""} ${c.email || ""}`.toLowerCase().includes(q));
  clients.sort((a, b) => a.name.localeCompare(b.name, "vi"));

  if (clients.length === 0) { tbody.innerHTML = `<tr><td colspan="7" class="empty">Chưa có khách hàng nào</td></tr>`; return; }

  const contracts = Store.getContracts();
  const quotes = Store.getQuotes();
  tbody.innerHTML = clients.map((c) => {
    const cs = contracts.filter((k) => k.clientId === c.id);
    const total = cs.reduce((s, k) => s + Number(k.value || 0), 0);
    return `<tr>
      <td>${escapeHtml(c.name)}</td>
      <td>${escapeHtml(c.company || "—")}</td>
      <td>${escapeHtml(c.phone || "—")}</td>
      <td>${escapeHtml(c.email || "—")}</td>
      <td>${cs.length}</td>
      <td>${formatCurrency(total)}</td>
      <td class="actions">
        <button class="icon-btn" data-edit-id="${c.id}" title="Sửa">✎</button>
        <button class="icon-btn danger" data-del-id="${c.id}" title="Xóa">🗑</button>
      </td>
    </tr>`;
  }).join("");

  tbody.querySelectorAll("[data-edit-id]").forEach((b) => b.addEventListener("click", () => openClientForm(b.dataset.editId)));
  tbody.querySelectorAll("[data-del-id]").forEach((b) => b.addEventListener("click", () => {
    const used = contracts.some((k) => k.clientId === b.dataset.delId) || quotes.some((qt) => qt.clientId === b.dataset.delId);
    if (used) { alert("Không thể xóa: khách hàng đang có hợp đồng hoặc báo giá liên quan."); return; }
    if (confirm("Xóa khách hàng này?")) { Store.deleteClient(b.dataset.delId); renderClientsTable(); }
  }));
}

function openClientForm(id) {
  const editing = id ? Store.getClient(id) : null;
  const data = editing || {};
  openModal({
    title: editing ? "Sửa khách hàng" : "Thêm khách hàng",
    bodyHtml: `
      <form id="client-form" class="form-grid">
        <label>Họ tên / Người liên hệ
          <input name="name" required value="${escapeHtml(data.name || "")}" />
        </label>
        <label>Công ty
          <input name="company" value="${escapeHtml(data.company || "")}" />
        </label>
        <label>Số điện thoại
          <input name="phone" value="${escapeHtml(data.phone || "")}" />
        </label>
        <label>Email
          <input type="email" name="email" value="${escapeHtml(data.email || "")}" />
        </label>
        <label>Mã số thuế
          <input name="taxCode" value="${escapeHtml(data.taxCode || "")}" />
        </label>
        <label>Số lao động (nếu có)
          <input type="number" min="0" name="employeeCount" value="${escapeHtml(data.employeeCount || "")}" />
        </label>
        <label class="col-span-2">Địa chỉ
          <input name="address" value="${escapeHtml(data.address || "")}" />
        </label>
        <label>Người đại diện (dùng khi lập hợp đồng)
          <input name="repName" value="${escapeHtml(data.repName || "")}" placeholder="VD: Ông Nguyễn Văn A" />
        </label>
        <label>Chức danh người đại diện
          <input name="repTitle" value="${escapeHtml(data.repTitle || "")}" placeholder="VD: Giám đốc" />
        </label>
        <label class="col-span-2">Ghi chú
          <textarea name="note" rows="2">${escapeHtml(data.note || "")}</textarea>
        </label>
      </form>
    `,
    footerHtml: `<button class="btn" data-close>Hủy</button><button class="btn btn-primary" id="client-save">${editing ? "Lưu thay đổi" : "Thêm khách hàng"}</button>`,
    onMount: () => {
      document.getElementById("client-save").addEventListener("click", () => {
        const form = document.getElementById("client-form");
        if (!form.reportValidity()) return;
        const payload = Object.fromEntries(new FormData(form).entries());
        if (editing) Store.updateClient(editing.id, payload); else Store.addClient(payload);
        closeModal();
        renderCurrentView();
      });
    },
  });
}

/* ================= QUOTES ================= */
function renderQuotes() {
  const el = document.getElementById("view-quotes");
  el.innerHTML = `
    <div class="page-header row">
      <div><h2>Báo giá</h2><p class="muted">Lập báo giá dịch vụ tư vấn gửi khách hàng</p></div>
      <button class="btn btn-primary" id="btn-add-quote">+ Tạo báo giá</button>
    </div>
    <div class="toolbar">
      <input type="text" id="quote-search" placeholder="Tìm theo mã, khách hàng..." value="${escapeHtml(state.quoteSearch)}" />
      <select id="quote-status-filter">
        <option value="all">Tất cả trạng thái</option>
        ${Object.entries(STATUS_QUOTE).map(([k, m]) => `<option value="${k}" ${state.quoteStatus === k ? "selected" : ""}>${m.label}</option>`).join("")}
      </select>
    </div>
    <div class="table-wrap"><table class="data-table">
      <thead><tr><th>Mã BG</th><th>Khách hàng</th><th>Ngày</th><th>Hiệu lực đến</th><th>Tổng tiền</th><th>Trạng thái</th><th></th></tr></thead>
      <tbody id="quotes-tbody"></tbody>
    </table></div>
  `;
  document.getElementById("btn-add-quote").addEventListener("click", () => openQuoteForm());
  document.getElementById("quote-search").addEventListener("input", (e) => { state.quoteSearch = e.target.value; renderQuotesTable(); });
  document.getElementById("quote-status-filter").addEventListener("change", (e) => { state.quoteStatus = e.target.value; renderQuotesTable(); });
  renderQuotesTable();
}

function renderQuotesTable() {
  const tbody = document.getElementById("quotes-tbody");
  if (!tbody) return;
  let quotes = Store.getQuotes();
  const q = state.quoteSearch.trim().toLowerCase();
  quotes = quotes.filter((qt) => {
    const client = Store.getClient(qt.clientId);
    const hay = `${qt.code} ${client ? client.name : ""}`.toLowerCase();
    const matchQ = !q || hay.includes(q);
    const matchStatus = state.quoteStatus === "all" || qt.status === state.quoteStatus;
    return matchQ && matchStatus;
  });
  quotes.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

  if (quotes.length === 0) { tbody.innerHTML = `<tr><td colspan="7" class="empty">Chưa có báo giá nào</td></tr>`; return; }

  tbody.innerHTML = quotes.map((qt) => {
    const client = Store.getClient(qt.clientId);
    const { total } = quoteTotal(qt);
    const meta = STATUS_QUOTE[qt.status] || { label: qt.status, color: "#64748b" };
    return `<tr>
      <td>${escapeHtml(qt.code)}</td>
      <td>${escapeHtml(client ? client.name : "—")}</td>
      <td>${formatDate(qt.date)}</td>
      <td>${formatDate(qt.validUntil)}</td>
      <td>${formatCurrency(total)}</td>
      <td><span class="badge" style="background:${meta.color}22;color:${meta.color}">${meta.label}</span></td>
      <td class="actions">
        <button class="icon-btn" data-print-id="${qt.id}" title="In / Xem">🖨</button>
        <button class="icon-btn" data-edit-id="${qt.id}" title="Sửa">✎</button>
        ${qt.status !== "converted" ? `<button class="icon-btn" data-convert-id="${qt.id}" title="Chuyển thành hợp đồng">➜</button>` : ""}
        <button class="icon-btn danger" data-del-id="${qt.id}" title="Xóa">🗑</button>
      </td>
    </tr>`;
  }).join("");

  tbody.querySelectorAll("[data-print-id]").forEach((b) => b.addEventListener("click", () => pickLanguageThen((lang) => printQuote(b.dataset.printId, lang))));
  tbody.querySelectorAll("[data-edit-id]").forEach((b) => b.addEventListener("click", () => openQuoteForm(b.dataset.editId)));
  tbody.querySelectorAll("[data-convert-id]").forEach((b) => b.addEventListener("click", () => convertQuoteToContract(b.dataset.convertId)));
  tbody.querySelectorAll("[data-del-id]").forEach((b) => b.addEventListener("click", () => {
    if (confirm("Xóa báo giá này?")) { Store.deleteQuote(b.dataset.delId); renderQuotesTable(); }
  }));
}

function openQuoteForm(id) {
  const editing = id ? Store.getQuote(id) : null;
  const data = editing || { items: [{ description: "", unit: "gói", quantity: 1, unitPrice: 0 }], taxPct: 10 };

  openModal({
    title: editing ? "Sửa báo giá" : "Tạo báo giá",
    wide: true,
    bodyHtml: `
      <form id="quote-form" class="form-grid">
        <label>Khách hàng
          <select name="clientId" required>${clientOptions(data.clientId)}</select>
        </label>
        <label>Trạng thái
          <select name="status">${Object.entries(STATUS_QUOTE).filter(([k]) => k !== "converted").map(([k, m]) => `<option value="${k}" ${data.status ? (data.status === k ? "selected" : "") : (k === "draft" ? "selected" : "")}>${m.label}</option>`).join("")}</select>
        </label>
        <label>Ngày báo giá
          <input type="date" name="date" value="${data.date || todayISO()}" />
        </label>
        <label>Hiệu lực đến
          <input type="date" name="validUntil" value="${data.validUntil || ""}" />
        </label>
        <label>Phạm vi (tùy chọn)
          <input name="scope" value="${escapeHtml(data.scope || "")}" placeholder="VD: Tư vấn trọn gói" />
        </label>
        <label>Thời gian thực hiện dự kiến (tùy chọn)
          <input name="duration" value="${escapeHtml(data.duration || "")}" placeholder="VD: 1 tháng" />
        </label>
        <div class="col-span-2">
          <div class="row" style="align-items:center;"><h4 style="margin:8px 0">Hạng mục dịch vụ</h4><button type="button" class="btn btn-sm" id="btn-add-item">+ Thêm dòng</button></div>
          <div class="table-wrap"><table class="data-table">
            <thead><tr><th>Mô tả</th><th>ĐVT</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th><th></th></tr></thead>
            <tbody id="items-tbody"></tbody>
          </table></div>
        </div>
        <label>Chiết khấu (%)
          <input type="number" name="discountPct" min="0" max="100" value="${data.discountPct || 0}" />
        </label>
        <label>Thuế VAT (%)
          <input type="number" name="taxPct" min="0" max="100" value="${data.taxPct ?? 10}" />
        </label>
        <div class="col-span-2" id="quote-total-line"></div>
        <label class="col-span-2">Điều khoản thanh toán (tùy chọn)
          <textarea name="paymentTerms" rows="2" placeholder="VD: Thanh toán 50% khi ký hợp đồng, 50% còn lại khi nghiệm thu.">${escapeHtml(data.paymentTerms || "")}</textarea>
        </label>
        <label class="col-span-2">Ghi chú
          <textarea name="note" rows="2">${escapeHtml(data.note || "")}</textarea>
        </label>
      </form>
      ${Store.getClients().length === 0 ? '<p class="hint">Bạn chưa có khách hàng nào. Hãy vào mục Khách hàng để thêm trước.</p>' : ""}
    `,
    footerHtml: `<button class="btn" data-close>Hủy</button><button class="btn btn-primary" id="quote-save">${editing ? "Lưu thay đổi" : "Tạo báo giá"}</button>`,
    onMount: () => {
      let items = (data.items || []).map((i) => ({ ...i }));
      const tbody = document.getElementById("items-tbody");
      const form = document.getElementById("quote-form");

      function renderItems() {
        tbody.innerHTML = items.map((it, idx) => `
          <tr>
            <td><input data-idx="${idx}" data-field="description" value="${escapeHtml(it.description || "")}" placeholder="Mô tả dịch vụ" /></td>
            <td><input data-idx="${idx}" data-field="unit" value="${escapeHtml(it.unit || "")}" style="width:70px" /></td>
            <td><input type="number" min="0" data-idx="${idx}" data-field="quantity" value="${it.quantity ?? 1}" style="width:64px" /></td>
            <td><input type="number" min="0" step="1000" data-idx="${idx}" data-field="unitPrice" value="${it.unitPrice ?? 0}" style="width:120px" /></td>
            <td class="line-total">${formatCurrency(Number(it.quantity || 0) * Number(it.unitPrice || 0))}</td>
            <td><button type="button" class="icon-btn danger" data-remove="${idx}">🗑</button></td>
          </tr>`).join("");
        tbody.querySelectorAll("input").forEach((inp) => inp.addEventListener("input", (e) => {
          const idx = Number(e.target.dataset.idx);
          const field = e.target.dataset.field;
          items[idx][field] = (field === "quantity" || field === "unitPrice") ? Number(e.target.value) : e.target.value;
          const row = e.target.closest("tr");
          row.querySelector(".line-total").textContent = formatCurrency(Number(items[idx].quantity || 0) * Number(items[idx].unitPrice || 0));
          updateTotals();
        }));
        tbody.querySelectorAll("[data-remove]").forEach((b) => b.addEventListener("click", () => {
          items.splice(Number(b.dataset.remove), 1);
          if (items.length === 0) items.push({ description: "", unit: "gói", quantity: 1, unitPrice: 0 });
          renderItems();
          updateTotals();
        }));
      }

      function updateTotals() {
        const discountPct = Number(form.discountPct.value || 0);
        const taxPct = Number(form.taxPct.value || 0);
        const sub = items.reduce((s, i) => s + Number(i.quantity || 0) * Number(i.unitPrice || 0), 0);
        const discount = (sub * discountPct) / 100;
        const afterDiscount = sub - discount;
        const tax = (afterDiscount * taxPct) / 100;
        const total = afterDiscount + tax;
        document.getElementById("quote-total-line").innerHTML = `
          <div class="totals-box">
            <div><span>Tạm tính</span><span>${formatCurrency(sub)}</span></div>
            <div><span>Chiết khấu</span><span>-${formatCurrency(discount)}</span></div>
            <div><span>VAT</span><span>${formatCurrency(tax)}</span></div>
            <div class="grand"><span>Tổng cộng</span><span>${formatCurrency(total)}</span></div>
          </div>`;
      }

      renderItems();
      updateTotals();
      document.getElementById("btn-add-item").addEventListener("click", () => {
        items.push({ description: "", unit: "gói", quantity: 1, unitPrice: 0 });
        renderItems();
        updateTotals();
      });
      form.discountPct.addEventListener("input", updateTotals);
      form.taxPct.addEventListener("input", updateTotals);

      document.getElementById("quote-save").addEventListener("click", () => {
        if (!form.reportValidity()) return;
        const payload = Object.fromEntries(new FormData(form).entries());
        payload.discountPct = Number(payload.discountPct || 0);
        payload.taxPct = Number(payload.taxPct || 0);
        payload.items = items.filter((i) => i.description);
        if (editing) Store.updateQuote(editing.id, payload);
        else { payload.code = Store.nextCode("BG"); Store.addQuote(payload); }
        closeModal();
        renderCurrentView();
      });
    },
  });
}

function convertQuoteToContract(id) {
  const q = Store.getQuote(id);
  if (!q) return;
  const { total } = quoteTotal(q);
  closeModal();
  openContractForm(null, {
    clientId: q.clientId,
    title: `Hợp đồng theo báo giá ${q.code}`,
    description: (q.items || []).map((i) => `- ${i.description} (SL ${i.quantity} x ${formatCurrency(i.unitPrice)})`).join("\n"),
    value: Math.round(total),
  }, () => {
    Store.updateQuote(id, { status: "converted" });
    if (state.view === "quotes") renderQuotesTable();
  });
}

function printDocWindow(title, innerHtml) {
  const win = window.open("", "_blank", "width=900,height=1000");
  if (!win) { alert("Trình duyệt đã chặn cửa sổ in. Vui lòng cho phép popup."); return null; }
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${escapeHtml(title)}</title>
    <style>
      *{box-sizing:border-box;}
      body{font-family:Arial,Helvetica,sans-serif;color:#1e293b;padding:32px;max-width:800px;margin:auto;line-height:1.5;}
      h1{font-size:20px;margin:0;}
      h2{font-size:14.5px;margin:22px 0 8px;text-transform:uppercase;letter-spacing:.02em;border-bottom:1px solid #cbd5e1;padding-bottom:4px;}
      .muted{color:#64748b;}
      table{width:100%;border-collapse:collapse;margin-top:10px;}
      th,td{border:1px solid #cbd5e1;padding:8px;font-size:12.5px;text-align:left;vertical-align:top;}
      th{background:#f1f5f9;}
      .right{text-align:right;}
      .center{text-align:center;}
      .totals{width:300px;margin-left:auto;margin-top:12px;}
      .totals div{display:flex;justify-content:space-between;padding:4px 0;font-size:13px;}
      .grand{font-weight:bold;border-top:1px solid #334155;margin-top:4px;padding-top:8px !important;font-size:14.5px;}
      .header{display:flex;justify-content:space-between;border-bottom:2px solid #1e293b;padding-bottom:12px;margin-bottom:16px;gap:16px;}
      .info-line{margin:2px 0;font-size:12.5px;}
      .sign-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:32px;text-align:center;}
      .sign-grid .sign-title{font-weight:bold;}
      .sign-grid .sign-space{height:70px;}
      ul{margin:6px 0;padding-left:20px;}
      li{margin:3px 0;font-size:12.5px;}
      p{font-size:12.5px;}
      .center-title{text-align:center;}
      .disclaimer{margin-top:32px;font-size:11px;color:#94a3b8;font-style:italic;}
      .party-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:10px;}
      .party-grid>div{border:1px solid #cbd5e1;border-radius:6px;padding:10px 12px;}
      @media (max-width: 640px) {
        body{padding:18px;}
        .header{flex-direction:column;}
        .header .right{text-align:left;}
        th,td{padding:5px;font-size:11.5px;}
        .totals{width:100%;}
        .party-grid{grid-template-columns:1fr;gap:14px;}
        .sign-grid{grid-template-columns:1fr;gap:28px;}
      }
      @media print {
        body{padding:0;max-width:none;}
        @page { margin: 16mm; }
      }
    </style></head><body>${innerHtml}</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
  return win;
}

function printQuote(id, lang = "vi") {
  const q = Store.getQuote(id);
  if (!q) return;
  const client = Store.getClient(q.clientId);
  const settings = Store.getSettings();
  const { sub, discount, tax, total } = quoteTotal(q);
  const T = (key) => t(lang, key);
  const tf = (key, ...args) => t(lang, key)(...args);
  const clientName = client ? (client.company || client.name) : "";

  const infoRows = [];
  infoRows.push(`<div class="info-line"><strong>${T("companyNameLabel")}:</strong> ${escapeHtml(clientName)}</div>`);
  if (client?.address) infoRows.push(`<div class="info-line"><strong>${T("addressLabel")}:</strong> ${escapeHtml(client.address)}</div>`);
  if (client?.employeeCount) infoRows.push(`<div class="info-line"><strong>${T("employeeCountLabel")}:</strong> ${escapeHtml(String(client.employeeCount))}</div>`);
  if (q.scope) infoRows.push(`<div class="info-line"><strong>${T("scopeLabel")}:</strong> ${escapeHtml(q.scope)}</div>`);
  if (q.duration) infoRows.push(`<div class="info-line"><strong>${T("durationLabel")}:</strong> ${escapeHtml(q.duration)}</div>`);

  const itemsRows = (q.items || []).map((it, idx) => `<tr><td>${idx + 1}</td><td>${escapeHtml(it.description)}</td><td>${escapeHtml(it.unit || "")}</td><td class="center">${it.quantity}</td><td class="right">${formatCurrency(it.unitPrice)}</td><td class="right">${formatCurrency(it.quantity * it.unitPrice)}</td></tr>`).join("");
  const vatNote = (q.taxPct && q.taxPct > 0) ? tf("vatIncludedNote", q.taxPct) : T("vatExcludedNote");

  const html = `
    <div class="header">
      <div>
        <h1>${escapeHtml(settings.companyName || T("companyFallback"))}</h1>
        <div class="muted">${escapeHtml(settings.companyAddress || "")}</div>
        <div class="muted">${settings.companyPhone ? `${T("phoneLabel")}: ${escapeHtml(settings.companyPhone)}` : ""}${settings.companyEmail ? " · " + escapeHtml(settings.companyEmail) : ""}</div>
        ${settings.companyTaxCode ? `<div class="muted">${T("taxCodeLabel")}: ${escapeHtml(settings.companyTaxCode)}</div>` : ""}
      </div>
      <div class="right">
        <h1>${T("quoteTitle")}</h1>
        <div class="muted">${T("numberLabel")}: ${escapeHtml(q.code)}</div>
        <div class="muted">${T("dateLabel")}: ${formatDate(q.date)}</div>
      </div>
    </div>
    <p>${escapeHtml(tf("quoteGreeting", clientName))}</p>
    <p>${escapeHtml(T("quoteIntro"))}</p>

    <h2>${T("quoteClientInfoTitle")}</h2>
    ${infoRows.join("")}

    <h2>${T("quotePriceTitle")}</h2>
    <table>
      <thead><tr><th>${T("colIndex")}</th><th>${T("colDesc")}</th><th>${T("colUnit")}</th><th>${T("colQty")}</th><th class="right">${T("colUnitPrice")}</th><th class="right">${T("colLineTotal")}</th></tr></thead>
      <tbody>${itemsRows}</tbody>
    </table>
    <div class="totals">
      <div><span>${T("subtotalLabel")}</span><span>${formatCurrency(sub)}</span></div>
      ${q.discountPct ? `<div><span>${T("discountLabel")} (${q.discountPct}%)</span><span>-${formatCurrency(discount)}</span></div>` : ""}
      <div><span>${T("vatLabel")} (${q.taxPct || 0}%)</span><span>${formatCurrency(tax)}</span></div>
      <div class="grand"><span>${T("totalLabel")}</span><span>${formatCurrency(total)}</span></div>
    </div>
    <p class="muted">${escapeHtml(vatNote)}</p>
    ${q.validUntil ? `<p class="muted">${escapeHtml(tf("validUntilNote", formatDate(q.validUntil)))}</p>` : ""}

    <h2>${T("paymentTitle")}</h2>
    <p>${escapeHtml(q.paymentTerms || T("paymentDefault"))}</p>

    ${q.note ? `<h2>${T("noteTitle")}</h2><p>${escapeHtml(q.note)}</p>` : ""}

    <h2>${T("confirmTitle")}</h2>
    <div class="sign-grid">
      <div>
        <div class="sign-title">${T("confirmedByLabel")}</div>
        <div class="muted">${escapeHtml(clientName)}</div>
        <div class="sign-space"></div>
        <div class="muted">${T("signPlaceholder")}</div>
      </div>
      <div>
        <div class="sign-title">${T("preparedByLabel")}</div>
        <div class="muted">${formatDate(q.date)}</div>
        <div class="sign-space"></div>
        <div>${escapeHtml(settings.repName || "")}</div>
      </div>
    </div>

    <p class="muted center" style="margin-top:32px">${escapeHtml(T("quoteThanks"))}</p>
    ${lang !== "vi" ? `<p class="disclaimer">${escapeHtml(T("translationDisclaimer"))}</p>` : ""}
  `;
  printDocWindow(`${T("quoteTitle")} ${q.code}`, html);
}

function printContract(id, lang = "vi") {
  const c = Store.getContract(id);
  if (!c) return;
  const client = Store.getClient(c.clientId);
  const settings = Store.getSettings();
  const T = (key) => t(lang, key);
  const tf = (key, ...args) => t(lang, key)(...args);
  const list = (key) => t(lang, key) || [];

  const partyA = {
    name: client ? (client.company || client.name) : "",
    repName: client?.repName || "",
    repTitle: client?.repTitle || "",
    address: client?.address || "",
    phone: client?.phone || "",
    taxCode: client?.taxCode || "",
  };
  const partyB = {
    name: settings.companyName || "",
    repName: settings.repName || "",
    repTitle: settings.repTitle || "",
    address: settings.companyAddress || "",
    phone: settings.companyPhone || "",
    taxCode: settings.companyTaxCode || "",
  };
  const partyInfoHtml = (party) => `
    <div class="info-line"><strong>${escapeHtml(party.name)}</strong></div>
    <div class="info-line">${T("representativeLabel")}: ${escapeHtml(party.repName)}${party.repTitle ? ` — ${T("positionLabel")}: ${escapeHtml(party.repTitle)}` : ""}</div>
    <div class="info-line">${T("addressLabel")}: ${escapeHtml(party.address)}</div>
    <div class="info-line">${T("phoneLabel")}: ${escapeHtml(party.phone)}</div>
    <div class="info-line">${T("taxCodeLabel")}: ${escapeHtml(party.taxCode)}</div>
  `;

  const amountWords = lang === "en" ? numberToWordsEn(c.value) : (lang === "vi" ? numberToWordsVi(c.value) : null);

  const payments = (c.payments || []).slice().sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));
  const scheduleHtml = payments.length > 0
    ? `<ul>${payments.map((p, idx) => `<li>${escapeHtml(tf("installmentLine", idx + 1, formatCurrency(p.amount), p.dueDate ? formatDate(p.dueDate) : ""))}</li>`).join("")}</ul>`
    : `<p>${escapeHtml(T("noScheduleNote"))}</p>`;

  const html = `
    <div class="center-title">
      <div><strong>${T("nationTitle")}</strong></div>
      <div>${T("motto")}</div>
      <div>-----------------</div>
    </div>
    <h1 class="center-title" style="margin-top:20px">${T("contractDocTitle")}</h1>
    <p class="center-title muted">${T("numberLabel")}: ${escapeHtml(c.code)}</p>

    <p>${T("legalIntro")}</p>
    <ul>${list("legalBasis").map((b) => `<li>${escapeHtml(b)}</li>`).join("")}</ul>
    <p>${T("todayLinePrefix")} ${formatDate(c.signDate || c.createdAt)}, ${T("todayLineSuffix")}</p>

    <div class="party-grid">
      <div><strong>${T("partyALabel")}</strong>${partyInfoHtml(partyA)}</div>
      <div><strong>${T("partyBLabel")}</strong>${partyInfoHtml(partyB)}</div>
    </div>

    <p style="margin-top:16px">${T("agreementLine")}</p>

    <h2>${T("article1Title")}</h2>
    <p>${escapeHtml(tf("article1Body"))}</p>
    ${c.description ? `<p>${escapeHtml(c.description).replace(/\n/g, "<br/>")}</p>` : ""}
    ${c.location ? `<p><strong>${T("locationLabel")}:</strong> ${escapeHtml(c.location)}</p>` : ""}

    <h2>${T("article2Title")}</h2>
    <table>
      <thead><tr><th>STT</th><th>${T("colContent")}</th><th class="right">${T("colCost")}</th></tr></thead>
      <tbody><tr><td>1</td><td>${escapeHtml(c.title || "")}</td><td class="right">${formatCurrency(c.value)}</td></tr></tbody>
    </table>
    <p><strong>${T("totalCostLabel")}:</strong> ${formatCurrency(c.value)}</p>
    ${amountWords ? `<p><strong>${T("inWordsLabel")}:</strong> ${escapeHtml(amountWords)}</p>` : ""}

    <h2>${T("article3Title")}</h2>
    <p>${T("paymentMethodLine")}</p>
    <p>${T("accountNameLabel")}: ${escapeHtml(settings.bankAccountName || "")}</p>
    <p>${T("accountNumberLabel")}: ${escapeHtml(settings.bankAccountNumber || "")}</p>
    <p>${T("bankLabel")}: ${escapeHtml(settings.bankName || "")}</p>
    <p>${T("currencyLabel")}: ${T("currencyValue")}</p>
    <p><strong>${T("scheduleLabel")}:</strong></p>
    ${scheduleHtml}
    <p>${T("invoiceLine")}</p>

    <h2>${T("article4Title")}</h2>
    <p><strong>${T("respATitle")}</strong></p>
    <ul>${list("respA").map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul>
    <p><strong>${T("respBTitle")}</strong></p>
    <ul>${list("respB").map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul>

    <h2>${T("article5Title")}</h2>
    <ul>${list("article5Body").map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul>

    <h2>${T("article6Title")}</h2>
    <p>${T("article6a")}</p>
    <p>${T("article6b")}</p>
    <p>${T("article6c")}</p>

    <h2>${T("article7Title")}</h2>
    <p>${T("article7Body")}</p>

    <h2>${T("article8Title")}</h2>
    <ul>${list("article8Body").map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul>

    <div class="sign-grid">
      <div><div class="sign-title">${T("sigA")}</div><div class="muted">${T("sigNote")}</div><div class="sign-space"></div></div>
      <div><div class="sign-title">${T("sigB")}</div><div class="muted">${T("sigNote")}</div><div class="sign-space"></div></div>
    </div>

    ${lang !== "vi" ? `<p class="disclaimer">${escapeHtml(T("translationDisclaimer"))}</p>` : ""}
  `;
  printDocWindow(`${T("contractDocTitle")} ${c.code}`, html);
}

/* ================= REPORTS ================= */
function renderReports() {
  const el = document.getElementById("view-reports");
  const contracts = Store.getContracts();
  const years = Array.from(new Set(contracts.map((c) => new Date(c.startDate || c.createdAt).getFullYear()).filter((y) => !isNaN(y))));
  if (!years.includes(state.reportYear)) years.push(state.reportYear);
  years.sort((a, b) => b - a);

  const totalValue = contracts.filter((c) => c.status !== "cancelled").reduce((s, c) => s + Number(c.value || 0), 0);
  const totalPaid = contracts.reduce((s, c) => s + (c.payments || []).filter((p) => p.paidDate).reduce((s2, p) => s2 + Number(p.amount || 0), 0), 0);
  const avgValue = contracts.length ? totalValue / contracts.length : 0;

  const clients = Store.getClients();
  const topClients = clients.map((cl) => {
    const cs = contracts.filter((c) => c.clientId === cl.id);
    return { client: cl, count: cs.length, total: cs.reduce((s, c) => s + Number(c.value || 0), 0) };
  }).filter((x) => x.count > 0).sort((a, b) => b.total - a.total).slice(0, 8);

  el.innerHTML = `
    <div class="page-header row">
      <div><h2>Báo cáo</h2><p class="muted">Thống kê doanh thu và hợp đồng</p></div>
      <select id="report-year">${years.map((y) => `<option value="${y}" ${y === state.reportYear ? "selected" : ""}>${y}</option>`).join("")}</select>
    </div>
    <div class="stat-grid">
      ${statCard("Tổng giá trị hợp đồng", formatCurrency(totalValue), "blue")}
      ${statCard("Tổng đã thu", formatCurrency(totalPaid), "green")}
      ${statCard("Giá trị TB / hợp đồng", formatCurrency(avgValue), "indigo")}
      ${statCard("Tổng số hợp đồng", contracts.length, "teal")}
    </div>
    <div class="card">
      <h3>Doanh thu theo tháng (${state.reportYear})</h3>
      <canvas id="chart-report-revenue" height="240"></canvas>
    </div>
    <div class="grid-2">
      <div class="card">
        <h3>Phân bổ trạng thái hợp đồng</h3>
        <canvas id="chart-report-status" height="220"></canvas>
      </div>
      <div class="card">
        <h3>Khách hàng theo giá trị</h3>
        <table class="data-table">
          <thead><tr><th>Khách hàng</th><th>Số HĐ</th><th>Tổng giá trị</th></tr></thead>
          <tbody>${topClients.length ? topClients.map((x) => `<tr><td>${escapeHtml(x.client.name)}</td><td>${x.count}</td><td>${formatCurrency(x.total)}</td></tr>`).join("") : `<tr><td colspan="3" class="empty">Chưa có dữ liệu</td></tr>`}</tbody>
        </table>
      </div>
    </div>
  `;
  document.getElementById("report-year").addEventListener("change", (e) => { state.reportYear = Number(e.target.value); renderReports(); });
  drawBarChart(document.getElementById("chart-report-revenue"), monthLabels(), monthlyRevenue(contracts, state.reportYear), { formatValue: (v) => (v / 1e6).toFixed(0) + "tr" });
  drawDonutChart(document.getElementById("chart-report-status"), Object.entries(STATUS_CONTRACT).map(([key, meta]) => ({ label: meta.label, value: contracts.filter((c) => c.status === key).length, color: meta.color })));
}

/* ================= SETTINGS ================= */
function renderSettings() {
  const el = document.getElementById("view-settings");
  const s = Store.getSettings();
  el.innerHTML = `
    <div class="page-header"><h2>Cài đặt</h2><p class="muted">Thông tin công ty và tùy chọn hệ thống</p></div>
    <div class="card">
      <h3>Thông tin công ty (hiển thị trên báo giá)</h3>
      <form id="settings-form" class="form-grid">
        <label>Tên công ty <input name="companyName" value="${escapeHtml(s.companyName)}" /></label>
        <label>Mã số thuế <input name="companyTaxCode" value="${escapeHtml(s.companyTaxCode)}" /></label>
        <label class="col-span-2">Địa chỉ <input name="companyAddress" value="${escapeHtml(s.companyAddress)}" /></label>
        <label>Điện thoại <input name="companyPhone" value="${escapeHtml(s.companyPhone)}" /></label>
        <label>Email <input type="email" name="companyEmail" value="${escapeHtml(s.companyEmail)}" /></label>
        <label>Người đại diện <input name="repName" value="${escapeHtml(s.repName || "")}" /></label>
        <label>Chức danh người đại diện <input name="repTitle" value="${escapeHtml(s.repTitle || "")}" /></label>
        <label>Số ngày cảnh báo sắp hết hạn <input type="number" min="1" name="reminderDays" value="${s.reminderDays}" /></label>
      </form>
      <button class="btn btn-primary" id="settings-save" style="margin-top:12px">Lưu cài đặt</button>
    </div>
    <div class="card">
      <h3>Thông tin ngân hàng (hiển thị trên hợp đồng)</h3>
      <form id="bank-form" class="form-grid">
        <label class="col-span-2">Chủ tài khoản <input name="bankAccountName" value="${escapeHtml(s.bankAccountName || "")}" /></label>
        <label>Số tài khoản <input name="bankAccountNumber" value="${escapeHtml(s.bankAccountNumber || "")}" /></label>
        <label>Ngân hàng <input name="bankName" value="${escapeHtml(s.bankName || "")}" /></label>
      </form>
      <button class="btn btn-primary" id="bank-save" style="margin-top:12px">Lưu thông tin ngân hàng</button>
    </div>
    <div class="card">
      <h3>Dữ liệu</h3>
      <p class="muted">Dữ liệu được lưu ngay trên trình duyệt này (localStorage). Hãy sao lưu định kỳ để tránh mất dữ liệu.</p>
      <div class="row" style="gap:8px">
        <button class="btn" id="btn-export">⬇ Xuất dữ liệu (JSON)</button>
        <label class="btn" style="cursor:pointer">⬆ Nhập dữ liệu
          <input type="file" id="btn-import" accept="application/json" style="display:none" />
        </label>
        <button class="btn danger" id="btn-clear">🗑 Xóa toàn bộ dữ liệu</button>
      </div>
    </div>
  `;

  document.getElementById("settings-save").addEventListener("click", () => {
    const form = document.getElementById("settings-form");
    const payload = Object.fromEntries(new FormData(form).entries());
    payload.reminderDays = Number(payload.reminderDays) || 30;
    Store.saveSettings(payload);
    alert("Đã lưu cài đặt.");
  });

  document.getElementById("bank-save").addEventListener("click", () => {
    const form = document.getElementById("bank-form");
    const payload = Object.fromEntries(new FormData(form).entries());
    Store.saveSettings(payload);
    alert("Đã lưu thông tin ngân hàng.");
  });

  document.getElementById("btn-export").addEventListener("click", () => {
    const data = Store.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `hop-dong-tu-van-backup-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  document.getElementById("btn-import").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (confirm("Nhập dữ liệu sẽ ghi đè dữ liệu hiện tại. Tiếp tục?")) {
          Store.importAll(data);
          alert("Nhập dữ liệu thành công.");
          renderCurrentView();
        }
      } catch (err) {
        alert("File không hợp lệ.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  });

  document.getElementById("btn-clear").addEventListener("click", () => {
    if (confirm("Xóa toàn bộ dữ liệu? Hành động này không thể hoàn tác.")) {
      Store.clearAll();
      renderCurrentView();
    }
  });
}

/* ---------------- Init ---------------- */
renderCurrentView();
