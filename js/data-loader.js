/*
 * ===== 여기만 고치면 됩니다 (코드 지식 불필요) =====
 * 구글 스프레드시트를 "파일 > 공유 > 웹에 게시"로 CSV 게시한 뒤,
 * 그 게시 링크를 아래 3개 자리에 각각 붙여넣으세요.
 * 자세한 방법: /data-templates/사용가이드.md 참고
 */
// 아직 구글 스프레드시트를 연결하지 않았다면 아래 기본값(data-templates 폴더의 예시 CSV)이
// 그대로 사용됩니다. 스프레드시트를 "웹에 게시"한 뒤 그 링크로 바꾸면 그때부터는
// 스프레드시트 내용이 표시됩니다 (사용가이드.md 2~3단계 참고).
const CONFIG = {
  LECTURES_CSV_URL: "data-templates/강의이력.csv",
  CERTS_CSV_URL: "data-templates/자격사항.csv",
  REVIEWS_CSV_URL: "data-templates/후기.csv",
  CONTACT_EMAIL: "dhrdl5252@naver.com",
};

/* ---------- CSV 파서 (따옴표·쉼표 포함 셀 지원) ---------- */
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (c === '"' && next === '"') { field += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else { field += c; }
    } else {
      if (c === '"') { inQuotes = true; }
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else if (c === "\r") { /* skip */ }
      else { field += c; }
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }

  const header = (rows.shift() || []).map((h) => h.trim());
  return rows
    .filter((r) => r.some((cell) => cell.trim() !== ""))
    .map((r) => {
      const obj = {};
      header.forEach((key, idx) => { obj[key] = (r[idx] || "").trim(); });
      return obj;
    });
}

/* ---------- 구글 드라이브 공유 링크 → 이미지 표시용 링크 자동 변환 ---------- */
function toDisplayImageUrl(url) {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed) return "";

  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,      // https://drive.google.com/file/d/FILE_ID/view
    /[?&]id=([a-zA-Z0-9_-]+)/,          // https://drive.google.com/open?id=FILE_ID
    /\/d\/([a-zA-Z0-9_-]+)/,            // https://drive.google.com/d/FILE_ID
  ];
  for (const p of patterns) {
    const m = trimmed.match(p);
    if (m) return `https://lh3.googleusercontent.com/d/${m[1]}=w1000`;
  }
  return trimmed; // 드라이브 링크가 아니면 원본 URL 그대로 사용
}

function isPlaceholder(url) {
  return !url || url.startsWith("여기에_");
}

async function fetchCSV(url) {
  if (isPlaceholder(url)) return null;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const text = await res.text();
    return parseCSV(text);
  } catch (err) {
    console.warn("[data-loader] CSV 불러오기 실패:", url, err);
    return null;
  }
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function stateMessage(container, text) {
  container.innerHTML = `<p class="state-msg">${escapeHtml(text)}</p>`;
}

/* ---------- 강의이력 ---------- */
// 시트 컬럼: 순번, 기관명, 기간, 강의내용, 대표사례, 사진URL, 대표사진URL
// 대표사진URL은 홈페이지 '대표 강의' 카드에서만 사용되고, 강의 이력 전체보기 목록에는 쓰이지 않는다.
function lectureCardHtml(row, { showImage = false } = {}) {
  const img = showImage ? toDisplayImageUrl(row["대표사진URL"]) : "";
  const imgTag = img
    ? `<img class="thumb thumb-rep" src="${escapeHtml(img)}" alt="${escapeHtml(row["기관명"])} 강의 현장 사진" loading="lazy" onerror="this.style.display='none'">`
    : "";
  const period = (row["기간"] || "").trim();
  const tag = period ? `<span class="tag">${escapeHtml(period)}</span>` : "";
  return `
    <article class="card">
      ${imgTag}
      ${tag}
      <h3>${escapeHtml(row["기관명"] || "")}</h3>
      <p class="desc">${escapeHtml(row["강의내용"] || "")}</p>
    </article>`;
}

async function renderLectures({ highlightContainerId, fullContainerId, highlightCount = 4 } = {}) {
  const highlightEl = highlightContainerId && document.getElementById(highlightContainerId);
  const fullEl = fullContainerId && document.getElementById(fullContainerId);

  const rows = await fetchCSV(CONFIG.LECTURES_CSV_URL);

  if (!rows) {
    if (highlightEl) stateMessage(highlightEl, "강의 이력 스프레드시트가 아직 연결되지 않았습니다. data-loader.js의 LECTURES_CSV_URL을 설정해 주세요.");
    if (fullEl) stateMessage(fullEl, "강의 이력 스프레드시트가 아직 연결되지 않았습니다.");
    return;
  }
  if (rows.length === 0) {
    if (highlightEl) stateMessage(highlightEl, "등록된 강의 이력이 없습니다.");
    if (fullEl) stateMessage(fullEl, "등록된 강의 이력이 없습니다.");
    return;
  }

  if (highlightEl) {
    const picked = rows.filter((r) => (r["대표사례"] || "").trim().toUpperCase() === "Y");
    const list = (picked.length ? picked : rows).slice(0, highlightCount);
    highlightEl.innerHTML = list.map((row) => lectureCardHtml(row, { showImage: true })).join("");
  }
  if (fullEl) {
    fullEl.innerHTML = rows.map((row) => lectureCardHtml(row, { showImage: false })).join("");
  }
}

/* ---------- 자격사항 ---------- */
// 시트 컬럼: 순번, 자격증명, 취득년도, 발급기관
async function renderCerts(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const rows = await fetchCSV(CONFIG.CERTS_CSV_URL);

  if (!rows) { stateMessage(el, "자격사항 스프레드시트가 아직 연결되지 않았습니다."); return; }
  if (rows.length === 0) { stateMessage(el, "등록된 자격사항이 없습니다."); return; }

  el.innerHTML = rows
    .map(
      (r) => `
      <li>
        <span class="cert-name">${escapeHtml(r["자격증명"] || "")}</span>
        <span class="cert-meta">${escapeHtml(r["취득년도"] || "")} · ${escapeHtml(r["발급기관"] || "")}</span>
      </li>`
    )
    .join("");
}

/* ---------- 후기 ---------- */
// 시트 컬럼: 순번, 작성자, 구분, 내용, 사진URL, 날짜
function reviewCardHtml(row) {
  const img = toDisplayImageUrl(row["사진URL"]);
  const imgTag = img
    ? `<img class="thumb" src="${escapeHtml(img)}" alt="${escapeHtml(row["작성자"])} 관련 사진" loading="lazy" onerror="this.style.display='none'">`
    : "";
  const tag = row["구분"]
    ? `<span class="tag">${escapeHtml(row["구분"])}</span>`
    : "";
  return `
    <article class="card review-card">
      ${imgTag}
      ${tag}
      <span class="quote-mark">"</span>
      <p class="desc">${escapeHtml(row["내용"] || "")}</p>
      <p class="author">${escapeHtml(row["작성자"] || "")} ${row["날짜"] ? `<span class="period">· ${escapeHtml(row["날짜"])}</span>` : ""}</p>
    </article>`;
}

async function renderReviews(containerId, limit) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const rows = await fetchCSV(CONFIG.REVIEWS_CSV_URL);

  if (!rows) { stateMessage(el, "후기 스프레드시트가 아직 연결되지 않았습니다."); return; }
  if (rows.length === 0) { stateMessage(el, "등록된 후기가 없습니다."); return; }

  const list = limit ? rows.slice(0, limit) : rows;
  el.innerHTML = list.map(reviewCardHtml).join("");
}
