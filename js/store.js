import { uid } from "./utils.js";
import { syncCreate, syncUpdate, syncDelete, syncSettings } from "./auth.js";

const KEYS = {
  clients: "cms_clients",
  contracts: "cms_contracts",
  quotes: "cms_quotes",
  settings: "cms_settings",
  seq: "cms_seq",
};

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.error("Lỗi đọc dữ liệu", key, e);
    return fallback;
  }
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

const defaultSettings = {
  companyName: "Công ty TNHH Dịch Vụ Tư Vấn Doanh Nghiệp Việt",
  companyAddress: "Số 15, ngõ 12 phố Phan Đình Giót, phường Phương Liệt, TP. Hà Nội",
  companyPhone: "0966 863 672 / 0842 001 236",
  companyEmail: "sales@vietconsulting.org",
  companyTaxCode: "0109499676",
  repName: "Lê Thị Thắm",
  repTitle: "Giám đốc",
  bankAccountName: "CÔNG TY TNHH DỊCH VỤ TƯ VẤN DOANH NGHIỆP VIỆT",
  bankAccountNumber: "510108386",
  bankName: "MB Bank – Ngân hàng Quân đội – chi nhánh Thanh Xuân",
  reminderDays: 30,
};

export const Store = {
  // Clients
  getClients() { return load(KEYS.clients, []); },
  saveClients(list) { save(KEYS.clients, list); },
  addClient(data) {
    const list = this.getClients();
    const item = { id: uid(), createdAt: new Date().toISOString(), ...data };
    list.push(item);
    this.saveClients(list);
    syncCreate("clients", item);
    return item;
  },
  updateClient(id, patch) {
    const list = this.getClients();
    const idx = list.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...patch };
    this.saveClients(list);
    syncUpdate("clients", id, list[idx]);
    return list[idx];
  },
  deleteClient(id) {
    this.saveClients(this.getClients().filter((c) => c.id !== id));
    syncDelete("clients", id);
  },
  getClient(id) { return this.getClients().find((c) => c.id === id) || null; },

  // Contracts
  getContracts() { return load(KEYS.contracts, []); },
  saveContracts(list) { save(KEYS.contracts, list); },
  addContract(data) {
    const list = this.getContracts();
    const item = { id: uid(), payments: [], createdAt: new Date().toISOString(), ...data };
    list.push(item);
    this.saveContracts(list);
    syncCreate("contracts", item);
    return item;
  },
  updateContract(id, patch) {
    const list = this.getContracts();
    const idx = list.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...patch };
    this.saveContracts(list);
    syncUpdate("contracts", id, list[idx]);
    return list[idx];
  },
  deleteContract(id) {
    this.saveContracts(this.getContracts().filter((c) => c.id !== id));
    syncDelete("contracts", id);
  },
  getContract(id) { return this.getContracts().find((c) => c.id === id) || null; },

  // Quotes
  getQuotes() { return load(KEYS.quotes, []); },
  saveQuotes(list) { save(KEYS.quotes, list); },
  addQuote(data) {
    const list = this.getQuotes();
    const item = { id: uid(), createdAt: new Date().toISOString(), ...data };
    list.push(item);
    this.saveQuotes(list);
    syncCreate("quotes", item);
    return item;
  },
  updateQuote(id, patch) {
    const list = this.getQuotes();
    const idx = list.findIndex((q) => q.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...patch };
    this.saveQuotes(list);
    syncUpdate("quotes", id, list[idx]);
    return list[idx];
  },
  deleteQuote(id) {
    this.saveQuotes(this.getQuotes().filter((q) => q.id !== id));
    syncDelete("quotes", id);
  },
  getQuote(id) { return this.getQuotes().find((q) => q.id === id) || null; },

  // Settings
  getSettings() { return { ...defaultSettings, ...load(KEYS.settings, {}) }; },
  saveSettings(data) {
    const merged = { ...this.getSettings(), ...data };
    save(KEYS.settings, merged);
    syncSettings(merged);
    return merged;
  },

  // Auto document codes, e.g. HD-2026-001
  nextCode(prefix) {
    const seq = load(KEYS.seq, {});
    const year = new Date().getFullYear();
    const key = `${prefix}-${year}`;
    const next = (seq[key] || 0) + 1;
    seq[key] = next;
    save(KEYS.seq, seq);
    return `${prefix}-${year}-${String(next).padStart(3, "0")}`;
  },

  // Overwrites local data with what the server sent on login. Uses the plain
  // list savers (not add/update/delete), so this never re-triggers a sync
  // call back to the server it just came from.
  replaceAllFromServer({ clients, contracts, quotes, settings }) {
    if (clients) this.saveClients(clients);
    if (contracts) this.saveContracts(contracts);
    if (quotes) this.saveQuotes(quotes);
    if (settings) save(KEYS.settings, { ...defaultSettings, ...settings });
  },

  // Backup / restore
  exportAll() {
    return {
      clients: this.getClients(),
      contracts: this.getContracts(),
      quotes: this.getQuotes(),
      settings: this.getSettings(),
      exportedAt: new Date().toISOString(),
    };
  },
  importAll(data) {
    if (data.clients) this.saveClients(data.clients);
    if (data.contracts) this.saveContracts(data.contracts);
    if (data.quotes) this.saveQuotes(data.quotes);
    if (data.settings) this.saveSettings(data.settings);
  },
  clearAll() {
    Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
  },
};
