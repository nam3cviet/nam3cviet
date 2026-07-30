import { uid } from "./utils.js";

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
  companyName: "",
  companyAddress: "",
  companyPhone: "",
  companyEmail: "",
  companyTaxCode: "",
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
    return item;
  },
  updateClient(id, patch) {
    const list = this.getClients();
    const idx = list.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...patch };
    this.saveClients(list);
    return list[idx];
  },
  deleteClient(id) {
    this.saveClients(this.getClients().filter((c) => c.id !== id));
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
    return item;
  },
  updateContract(id, patch) {
    const list = this.getContracts();
    const idx = list.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...patch };
    this.saveContracts(list);
    return list[idx];
  },
  deleteContract(id) {
    this.saveContracts(this.getContracts().filter((c) => c.id !== id));
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
    return item;
  },
  updateQuote(id, patch) {
    const list = this.getQuotes();
    const idx = list.findIndex((q) => q.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...patch };
    this.saveQuotes(list);
    return list[idx];
  },
  deleteQuote(id) {
    this.saveQuotes(this.getQuotes().filter((q) => q.id !== id));
  },
  getQuote(id) { return this.getQuotes().find((q) => q.id === id) || null; },

  // Settings
  getSettings() { return { ...defaultSettings, ...load(KEYS.settings, {}) }; },
  saveSettings(data) { save(KEYS.settings, { ...this.getSettings(), ...data }); },

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
