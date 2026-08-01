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
  const viewport = page.getViewport({ scale: 3 });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d");
  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas;
}

async function loadImageFile(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Otsu's method: picks the grey-level threshold that best separates text from
// background, so it adapts to each document instead of using one fixed cutoff.
function otsuThreshold(histogram, totalPixels) {
  let sumAll = 0;
  for (let i = 0; i < 256; i++) sumAll += i * histogram[i];

  let sumBackground = 0;
  let weightBackground = 0;
  let maxVariance = 0;
  let threshold = 127;

  for (let t = 0; t < 256; t++) {
    weightBackground += histogram[t];
    if (weightBackground === 0) continue;
    const weightForeground = totalPixels - weightBackground;
    if (weightForeground === 0) break;

    sumBackground += t * histogram[t];
    const meanBackground = sumBackground / weightBackground;
    const meanForeground = (sumAll - sumBackground) / weightForeground;
    const variance = weightBackground * weightForeground * (meanBackground - meanForeground) ** 2;
    if (variance > maxVariance) {
      maxVariance = variance;
      threshold = t;
    }
  }
  return threshold;
}

// Upscales small scans, converts to greyscale, then binarizes with Otsu's method.
// Flat, high-contrast black-on-white text is what OCR engines read most reliably —
// this compensates for dim photos, uneven lighting and low-resolution scans.
export function preprocessForOcr(source) {
  const srcW = source.naturalWidth || source.width;
  const srcH = source.naturalHeight || source.height;
  const minWidth = 1800;
  const maxWidth = 2600;
  let scale = srcW < minWidth ? minWidth / srcW : 1;
  if (srcW * scale > maxWidth) scale = maxWidth / srcW;

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(srcW * scale);
  canvas.height = Math.round(srcH * scale);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;
  const grey = new Uint8ClampedArray(canvas.width * canvas.height);
  const histogram = new Array(256).fill(0);

  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const g = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    grey[p] = g;
    histogram[g]++;
  }

  const threshold = otsuThreshold(histogram, grey.length);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const v = grey[p] < threshold ? 0 : 255;
    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

let ocrWorkerPromise = null;
function getOcrWorker() {
  if (!ocrWorkerPromise) {
    ocrWorkerPromise = Tesseract.createWorker("vie+eng");
  }
  return ocrWorkerPromise;
}

export async function ocrFile(file) {
  if (!ocrLibsAvailable()) {
    throw new Error("Không tải được thư viện nhận diện văn bản (Tesseract). Vui lòng kiểm tra kết nối Internet rồi thử lại.");
  }
  const rawSource = isPdfFile(file) ? await renderPdfFirstPageToCanvas(file) : await loadImageFile(file);
  const processed = preprocessForOcr(rawSource);
  const worker = await getOcrWorker();
  const { data } = await worker.recognize(processed);
  return data.text || "";
}

/* ---------------- Parsing ---------------- */

// Strips Vietnamese diacritics (and folds đ/Đ -> d/D) so label matching survives
// OCR mistakes on accent marks — the most common source of misreads.
export function stripDiacritics(str) {
  return str
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

function cleanValue(str) {
  return (str || "").trim().replace(/^[\s:.\-–]+/, "").replace(/[\s.,;:\-–]+$/, "").replace(/\s+/g, " ");
}

// Cuts a captured value off before a trailing label OCR ran onto the same line
// (e.g. "NGUYỄN VĂN A Giới tính: Nam" -> "NGUYỄN VĂN A").
function trimTrailingLabels(value, labelsNorm) {
  if (!value) return value;
  const norm = stripDiacritics(value.toLowerCase());
  let cut = value.length;
  for (const label of labelsNorm) {
    const idx = norm.indexOf(label);
    if (idx > 0 && idx < cut) cut = idx;
  }
  return cleanValue(value.slice(0, cut));
}

// Finds a value for the given (diacritics-free, lowercase, comma-free) label
// variants — checking each variant across the *whole* document before trying the
// next, so a specific label ("tên công ty viết bằng tiếng Việt") always wins over
// a shorter one that's also a substring of it ("tên công ty", which also matches
// the "1. Tên công ty" section heading above it).
// When a line is only the label itself (section heading, no value after it), the
// next couple of lines are checked too — re-applying the same label if it repeats
// there ("Địa chỉ trụ sở chính" appears both as heading and as the data line in
// some templates), otherwise taking the plain line as the value.
function findLabelValue(lines, normLines, labelVariants, { startAt = 0, endAt = lines.length, maxLen = 160 } = {}) {
  for (const label of labelVariants) {
    for (let i = startAt; i < endAt; i++) {
      const idx = normLines[i].indexOf(label);
      if (idx === -1) continue;
      const sameLine = cleanValue(lines[i].slice(idx + label.length));
      if (sameLine.length >= 2) return sameLine.slice(0, maxLen);
      for (let j = i + 1; j < Math.min(i + 3, endAt); j++) {
        const repeatIdx = normLines[j].indexOf(label);
        if (repeatIdx > -1) {
          const v = cleanValue(lines[j].slice(repeatIdx + label.length));
          if (v.length >= 2) return v.slice(0, maxLen);
          continue;
        }
        const plain = cleanValue(lines[j]);
        if (plain.length >= 2) return plain.slice(0, maxLen);
      }
    }
  }
  return "";
}

function findSectionStart(normLines, labelVariants) {
  for (let i = 0; i < normLines.length; i++) {
    if (labelVariants.some((l) => normLines[i].includes(l))) return i;
  }
  return -1;
}

function findCompanyFallback(lines, normLines) {
  const prefixes = ["cong ty", "doanh nghiep tu nhan", "ho kinh doanh"];
  for (let i = 0; i < normLines.length; i++) {
    const norm = normLines[i].trim();
    if (prefixes.some((p) => norm.startsWith(p)) && lines[i].trim().length > 6) {
      return cleanValue(lines[i]);
    }
  }
  return "";
}

function extractDigitsAndDash(str) {
  const m = (str || "").match(/[0-9][0-9\- ]{7,17}[0-9]/);
  return m ? m[0].replace(/\s+/g, "") : "";
}

// Best-effort parser tuned to Vietnam's "Giấy chứng nhận đăng ký doanh nghiệp".
// OCR text is noisy, so this only pre-fills the review form — the user still checks it.
export function parseBusinessLicenseText(text) {
  const lines = (text || "").replace(/\r/g, "").split("\n");
  // Only case/diacritics are normalized here — normLines must stay the same length
  // and character-aligned with `lines`, since match indexes found in normLines are
  // used to slice the original `lines` strings below.
  const normLines = lines.map((l) => stripDiacritics(l.toLowerCase()));

  let company = findLabelValue(lines, normLines, ["ten cong ty viet bang tieng viet", "ten doanh nghiep viet bang tieng viet"]);
  if (!company) company = findCompanyFallback(lines, normLines);
  company = trimTrailingLabels(company, ["ten cong ty", "ten doanh nghiep", "ma so", "dia chi"]);

  const taxCodeRaw = findLabelValue(lines, normLines, ["ma so doanh nghiep", "ma so thue", "ma so dkkd"]);
  const taxCode = extractDigitsAndDash(taxCodeRaw);

  let address = findLabelValue(lines, normLines, ["dia chi tru so chinh", "dia chi kinh doanh"]);
  address = trimTrailingLabels(address, ["dien thoai", "so dien thoai", "email", "fax", "von dieu le"]);

  // Scope the representative's name/title search to the "Người đại diện theo pháp
  // luật" section specifically — GCNĐKDN forms also list an "owner" (chủ sở hữu)
  // with the same "Họ, chữ đệm và tên" field just above it, which is not the same
  // person on every certificate.
  const repSectionStart = findSectionStart(normLines, ["nguoi dai dien theo phap luat"]);
  const searchRange = repSectionStart > -1 ? { startAt: repSectionStart } : {};

  let repName = findLabelValue(lines, normLines, ["ho, chu dem va ten", "ho chu dem va ten", "ho va ten", "ho ten"], searchRange);
  repName = trimTrailingLabels(repName, ["gioi tinh", "quoc tich", "chuc danh", "ngay thang nam sinh", "sinh ngay", "dan toc"]);

  const repTitle = trimTrailingLabels(
    findLabelValue(lines, normLines, ["chuc danh"], searchRange),
    ["sinh ngay", "quoc tich"]
  );

  return { company, taxCode, address, repName, repTitle };
}
