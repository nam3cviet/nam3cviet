export function isPdfFile(file) {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}

export function ocrLibsAvailable() {
  return typeof Tesseract !== "undefined";
}

async function renderPdfFirstPageToCanvas(file) {
  if (typeof pdfjsLib === "undefined") {
    throw new Error("Không tải được thư viện đọc PDF (pdf.js). Vui lòng kiểm tra kết nối Internet.");
  }
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 2.2 });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d");
  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas;
}

let ocrWorkerPromise = null;
function getOcrWorker() {
  if (!ocrWorkerPromise) {
    ocrWorkerPromise = Tesseract.createWorker("vie");
  }
  return ocrWorkerPromise;
}

export async function ocrFile(file) {
  if (!ocrLibsAvailable()) {
    throw new Error("Không tải được thư viện nhận diện văn bản (Tesseract). Vui lòng kiểm tra kết nối Internet rồi thử lại.");
  }
  const worker = await getOcrWorker();
  const source = isPdfFile(file) ? await renderPdfFirstPageToCanvas(file) : file;
  const { data } = await worker.recognize(source);
  return data.text || "";
}

function grab(text, patterns) {
  for (const re of patterns) {
    const m = text.match(re);
    if (m && m[1]) return m[1].trim().replace(/[\s.,;]+$/g, "").replace(/\s+/g, " ");
  }
  return "";
}

// Cuts a captured value off before a trailing label that OCR ran onto the same line
// (e.g. "NGUYỄN VĂN A Giới tính: Nam" -> "NGUYỄN VĂN A").
function trimTrailingLabels(value, labels) {
  if (!value) return value;
  let out = value;
  for (const label of labels) {
    const idx = out.search(new RegExp(`\\s+${label}\\b`, "i"));
    if (idx > -1) out = out.slice(0, idx);
  }
  return out.trim();
}

// Best-effort parser tuned to Vietnam's "Giấy chứng nhận đăng ký doanh nghiệp".
// OCR text is noisy, so this only pre-fills the review form — the user still checks it.
// Note: [ \t:]* (not [:\s]*) is used after labels so matching can't cross a newline
// and accidentally swallow the next line (which is how \s behaves by default).
export function parseBusinessLicenseText(text) {
  const norm = (text || "").replace(/\r/g, "");

  let company = grab(norm, [
    /Tên (?:công ty|doanh nghiệp)(?: viết bằng tiếng Việt)?[ \t:]*([^\n]{3,90})/i,
    /(CÔNG TY[^\n]{3,90})/i,
    /(DOANH NGHIỆP TƯ NHÂN[^\n]{3,90})/i,
    /(HỘ KINH DOANH[^\n]{3,90})/i,
  ]);
  company = trimTrailingLabels(company, ["Tên (?:công ty|giao dịch)", "Mã số"]);

  const taxCode = grab(norm, [
    /Mã số doanh nghiệp[ \t:]*([0-9][0-9\- ]{8,16}[0-9])/i,
    /Mã số thuế[ \t:]*([0-9][0-9\- ]{8,16}[0-9])/i,
  ]).replace(/\s+/g, "");

  let address = grab(norm, [
    /Địa chỉ trụ sở chính[ \t:]*([^\n]{5,160})/i,
    /Địa chỉ[ \t:]*([^\n]{5,160})/i,
  ]);
  address = trimTrailingLabels(address, ["Điện thoại", "Số điện thoại", "Email"]);

  let repName = grab(norm, [
    /Họ và tên[ \t:]*([^\n]{3,60})/i,
    /Người đại diện theo pháp luật(?: của công ty)?[ \t:]*([^\n]{3,60})/i,
  ]);
  repName = trimTrailingLabels(repName, ["Giới tính", "Quốc tịch", "Chức danh", "Sinh ngày"]);

  const repTitle = grab(norm, [
    /Chức danh[ \t:]*([^\n]{2,40})/i,
  ]);

  return { company, taxCode, address, repName, repTitle };
}
