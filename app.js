(() => {
  "use strict";

  const PAGE_SIZE = 50;
  const FAV_STORAGE_KEY = "jianbaosearch_favorites_v1";
  const THEME_STORAGE_KEY = "jianbaosearch_theme_v1";
  const FONT_STORAGE_KEY = "jianbaosearch_font_size_v1";
  const DEFAULT_FONT_SIZE = 15;
  const MIN_FONT_SIZE = 13;
  const MAX_FONT_SIZE = 22;

  const state = {
    allItems: [],
    filteredItems: [],
    meta: null,
    query: "",
    tier: "all",
    section: "all",
    status: "active",
    sort: "relevance",
    favOnly: false,
    favorites: new Set(),
    page: 1,
    activeItem: null,
    theme: "light",
    fontSize: DEFAULT_FONT_SIZE,
  };

  // DOM elements
  const el = {
    searchInput: document.getElementById("searchInput"),
    clearSearchBtn: document.getElementById("clearSearchBtn"),
    tierFilters: document.getElementById("tierFilters"),
    favFilterBtn: document.getElementById("favFilterBtn"),
    favCountBadge: document.getElementById("favCountBadge"),
    sectionFilter: document.getElementById("sectionFilter"),
    statusFilter: document.getElementById("statusFilter"),
    sortSelect: document.getElementById("sortSelect"),
    resultsSummary: document.getElementById("resultsSummary"),
    loadingState: document.getElementById("loadingState"),
    emptyState: document.getElementById("emptyState"),
    resetFiltersBtn: document.getElementById("resetFiltersBtn"),
    tableContainer: document.getElementById("tableContainer"),
    tableBody: document.getElementById("tableBody"),
    cardList: document.getElementById("cardList"),
    paginationTop: document.getElementById("paginationTop"),
    paginationBottom: document.getElementById("paginationBottom"),
    metaUpdatedDate: document.getElementById("metaUpdatedDate"),
    metaTotalCount: document.getElementById("metaTotalCount"),
    fontDecBtn: document.getElementById("fontDecBtn"),
    fontIncBtn: document.getElementById("fontIncBtn"),
    fontSizeLabel: document.getElementById("fontSizeLabel"),
    themeToggleBtn: document.getElementById("themeToggleBtn"),
    themeIcon: document.getElementById("themeIcon"),
    themeText: document.getElementById("themeText"),
    exportCsvBtn: document.getElementById("exportCsvBtn"),
    infoModalBtn: document.getElementById("infoModalBtn"),
    infoModal: document.getElementById("infoModal"),
    closeInfoBtn: document.getElementById("closeInfoBtn"),
    infoSourceModified: document.getElementById("infoSourceModified"),
    infoSyncedAt: document.getElementById("infoSyncedAt"),
    infoTotalCount: document.getElementById("infoTotalCount"),
    detailModal: document.getElementById("detailModal"),
    closeDetailBtn: document.getElementById("closeDetailBtn"),
    detailCode: document.getElementById("detailCode"),
    detailTierPill: document.getElementById("detailTierPill"),
    detailTitle: document.getElementById("detailTitle"),
    detailEnTitle: document.getElementById("detailEnTitle"),
    detailPoints: document.getElementById("detailPoints"),
    detailStartDate: document.getElementById("detailStartDate"),
    detailEndDate: document.getElementById("detailEndDate"),
    detailSection: document.getElementById("detailSection"),
    detailTierDesc: document.getElementById("detailTierDesc"),
    detailNote: document.getElementById("detailNote"),
    detailFavBtn: document.getElementById("detailFavBtn"),
    detailFavText: document.getElementById("detailFavText"),
    detailCopyCodeBtn: document.getElementById("detailCopyCodeBtn"),
    detailCopyAllBtn: document.getElementById("detailCopyAllBtn"),
    toast: document.getElementById("toast"),
  };

  function getTodayYYYYMMDD() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}${m}${d}`;
  }

  const TODAY_STR = getTodayYYYYMMDD();

  function isItemActive(item) {
    const s = item.s || "00000000";
    const e = item.e || "99999999";
    return s <= TODAY_STR && TODAY_STR <= e;
  }

  function getItemTier(code) {
    if (!code) return "other";
    if (code.startsWith("P")) return "P";
    const last = code.slice(-1).toUpperCase();
    if (last === "A" || last === "B" || last === "C") return last;
    return "other";
  }

  function getTierInfo(code) {
    const tier = getItemTier(code);
    switch (tier) {
      case "C":
        return { label: "表別 C｜含基層診所", desc: "各級特約醫事服務機構（含基層診所、地區醫院、區域醫院、醫學中心）皆可申報。" };
      case "B":
        return { label: "表別 B｜醫院層級", desc: "限地區醫院、區域醫院及醫學中心申報。" };
      case "A":
        return { label: "表別 A｜醫學中心/區域", desc: "限醫學中心或區域醫院申報。" };
      case "P":
        return { label: "專案 P｜給付改善/試辦", desc: "屬全民健康保險醫療給付改善方案、品質獎勵或試辦計畫項目。" };
      default:
        return { label: "其他類別", desc: "屬牙科、中醫、論病例計酬或特定專章項目。" };
    }
  }

  const SURGERY_SUBSECTIONS = {
    62: "手術-皮膚",
    63: "手術-乳房",
    64: "手術-筋骨",
    65: "手術-呼吸器",
    66: "手術-呼吸器",
    67: "手術-胸腔",
    68: "手術-心臟及血管",
    69: "手術-心臟及血管",
    70: "手術-造血與淋巴系統",
    71: "手術-消化器",
    72: "手術-消化器",
    73: "手術-消化器",
    74: "手術-消化器",
    75: "手術-消化器",
    76: "手術-泌尿系統",
    77: "手術-泌尿系統",
    78: "手術-泌尿系統",
    79: "手術-男性生殖系統",
    80: "手術-女性生殖系統",
    81: "手術-女性生殖系統",
    82: "手術-內分泌系統",
    83: "手術-神經外科",
    84: "手術-聽器",
    85: "手術-視器",
    86: "手術-視器",
    87: "手術-視器",
    88: "手術-小兒外科/器官移植",
  };

  function getSectionInfo(code) {
    if (!code) return { group: "其他", label: "其他項目", short: "" };
    const upper = code.toUpperCase();

    // 預防保健 / 國健署篩檢短代碼 (如 20, 21, 31, 3A, 5A, 81, 91, 95, I1001C, L1001C)
    if (upper.length <= 3 && !/^[ABCDE]\d{2}/.test(upper)) {
      return { group: "預防保健", label: "預防保健及篩檢補助項目", short: "預防保健" };
    }
    if (/^[IL]\d{4}/.test(upper)) {
      return { group: "預防保健", label: "預防保健及篩檢補助項目", short: "預防保健" };
    }

    // 中醫 (A01~, B71~, C01~, D01~, E01~)
    if (/^[ABCDE]\d{2,3}/.test(upper)) {
      const ch = upper[0];
      const map = {
        A: "第四部第一章 中醫門診診察費",
        B: "第四部第三章 檢驗檢查費",
        C: "第四部第二章 藥費/特定疾病",
        D: "第四部第四章 針灸治療處置費",
        E: "第四部第五章 傷科治療處置費",
      };
      return { group: "中醫", label: map[ch] || "第四部 中醫", short: "第四部 中醫" };
    }

    // 品質支付 / 專案計畫 (Pxxxx, Qxxxx, Txxxx)
    if (/^[PQT]/.test(upper)) {
      return { group: "品質支付", label: "第八部 品質支付服務 / 試辦計畫", short: "品質支付" };
    }

    // 住院膳食費 (Fxxxx, Gxxxx) & 門診藥費 (MA1~)
    if (/^[FG]\d{4}/.test(upper)) {
      return { group: "基本診療", label: "第二部第一章第四節 膳食費", short: "2-1-4 膳食費" };
    }
    if (/^MA/.test(upper)) {
      return { group: "基本診療", label: "第二部第一章第五節 藥事服務費", short: "2-1-5 藥事服務" };
    }

    // 達文西 / 機器人輔助手術 (N20xxx)
    if (/^N\d+/.test(upper)) {
      return { group: "手術", label: "第二部第二章第七節 手術-機器人輔助微創手術", short: "2-2-7" };
    }

    // 復健專用代碼 OT1 / ST1
    if (/^(OT|ST)\d+/.test(upper)) {
      return { group: "復健治療", label: "第二部第二章第四節 復健治療", short: "2-2-4" };
    }

    const prefix2 = parseInt(upper.slice(0, 2), 10);
    if (!Number.isFinite(prefix2)) {
      return { group: "其他", label: "其他診療項目", short: "" };
    }

    if (prefix2 === 0 || prefix2 === 1) {
      return { group: "基本診療", label: "第二部第一章第一節 門診/急診診察費", short: "2-1-1" };
    }
    if (prefix2 === 2) {
      return { group: "基本診療", label: "第二部第一章第二節 住院及急診觀察床診察費", short: "2-1-2" };
    }
    if (prefix2 === 3 || prefix2 === 4) {
      return { group: "基本診療", label: "第二部第一章第三節 病房費", short: "2-1-3" };
    }
    if (prefix2 === 5) {
      if (upper.startsWith("053") || upper.startsWith("054")) {
        return { group: "基本診療", label: "第五部 居家照護及安寧療護", short: "第五部" };
      }
      return { group: "基本診療", label: "第二部第一章第四節 管灌飲食費 / 第五節 藥事服務費", short: "2-1-4/5" };
    }
    if (prefix2 >= 6 && prefix2 <= 30) {
      return { group: "檢查", label: "第二部第二章第一節 檢查", short: "2-2-1" };
    }
    if (prefix2 >= 32 && prefix2 <= 37) {
      return { group: "放射線診療", label: "第二部第二章第二節 放射線診療", short: "2-2-2" };
    }
    if (prefix2 === 39) {
      return { group: "注射", label: "第二部第二章第三節 注射", short: "2-2-3" };
    }
    if (prefix2 >= 42 && prefix2 <= 44) {
      return { group: "復健治療", label: "第二部第二章第四節 復健治療", short: "2-2-4" };
    }
    if (prefix2 === 45) {
      return { group: "精神醫療", label: "第二部第二章第五節 精神醫療治療費", short: "2-2-5" };
    }
    if (prefix2 >= 47 && prefix2 <= 61) {
      return { group: "治療處置", label: "第二部第二章第六節 治療處置", short: "2-2-6" };
    }
    if (prefix2 >= 62 && prefix2 <= 88) {
      const sub = SURGERY_SUBSECTIONS[prefix2] || "手術";
      return { group: "手術", label: `第二部第二章第七節 ${sub}`, short: "2-2-7" };
    }
    if (prefix2 >= 89 && prefix2 <= 92) {
      const dentalMap = {
        89: "第三部第三章第一節 牙體復形",
        90: "第三部第三章第二節 根管治療",
        91: "第三部第三章第三節 牙周病學",
        92: "第三部第三章第四節 口腔顎面外科",
      };
      return { group: "牙醫", label: dentalMap[prefix2] || "第三部 牙醫", short: "第三部 牙醫" };
    }
    if (prefix2 === 93 || prefix2 === 94) {
      return { group: "麻醉/輸血/石膏", label: "第二部第二章第八節 輸血及骨髓移植", short: "2-2-8" };
    }
    if (prefix2 === 95) {
      return { group: "麻醉/輸血/石膏", label: "第二部第二章第九節 石膏繃帶", short: "2-2-9" };
    }
    if (prefix2 === 96) {
      if (upper === "96001C" || upper === "96000C") {
        return { group: "牙醫", label: "第三部第四章 牙科麻醉費", short: "牙科麻醉" };
      }
      return { group: "麻醉/輸血/石膏", label: "第二部第二章第十節 麻醉費", short: "2-2-10" };
    }
    if (prefix2 >= 97 && prefix2 <= 99) {
      return { group: "其他", label: "第六部 論病例計酬", short: "第六部" };
    }

    return { group: "其他", label: "其他診療項目", short: "" };
  }

  function applyTheme(theme) {
    state.theme = theme === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", state.theme);
    if (state.theme === "dark") {
      el.themeIcon.textContent = "☀️";
      el.themeText.textContent = "明亮";
      el.themeToggleBtn.setAttribute("aria-pressed", "true");
    } else {
      el.themeIcon.textContent = "🌙";
      el.themeText.textContent = "暗色";
      el.themeToggleBtn.setAttribute("aria-pressed", "false");
    }
    try {
      localStorage.setItem(THEME_STORAGE_KEY, state.theme);
    } catch {}
  }

  function applyFontSize(size) {
    const clamped = Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, Number(size) || DEFAULT_FONT_SIZE));
    state.fontSize = clamped;
    document.documentElement.style.setProperty("--base-font-size", `${clamped}px`);
    const pct = Math.round((clamped / DEFAULT_FONT_SIZE) * 100);
    el.fontSizeLabel.textContent = `${pct}%`;
    el.fontDecBtn.disabled = clamped <= MIN_FONT_SIZE;
    el.fontIncBtn.disabled = clamped >= MAX_FONT_SIZE;
    try {
      localStorage.setItem(FONT_STORAGE_KEY, String(clamped));
    } catch {}
  }

  function loadPreferences() {
    let savedTheme = null;
    let savedFont = null;
    try {
      savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
      savedFont = localStorage.getItem(FONT_STORAGE_KEY);
    } catch {}

    if (savedTheme === "dark" || savedTheme === "light") {
      applyTheme(savedTheme);
    } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      applyTheme("dark");
    } else {
      applyTheme("light");
    }

    applyFontSize(savedFont ? Number(savedFont) : DEFAULT_FONT_SIZE);
  }

  function formatDate(yyyymmdd) {
    if (!yyyymmdd || yyyymmdd.length !== 8) return yyyymmdd || "-";
    if (yyyymmdd === "29101231") return "2910/12/31 (現行)";
    return `${yyyymmdd.slice(0, 4)}/${yyyymmdd.slice(4, 6)}/${yyyymmdd.slice(6, 8)}`;
  }

  function formatPoints(p) {
    const num = Number(p);
    if (Number.isFinite(num)) return num.toLocaleString("zh-TW");
    return String(p ?? "0");
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function highlightText(text, terms) {
    if (!text) return "";
    const escaped = escapeHtml(text);
    if (!terms.length) return escaped;
    const pattern = terms.map((t) => escapeRegExp(escapeHtml(t))).join("|");
    if (!pattern) return escaped;
    const regex = new RegExp(`(${pattern})`, "gi");
    return escaped.replace(regex, "<mark>$1</mark>");
  }

  function formatNoteText(note) {
    if (!note) return "無備註說明。";
    // Add line breaks before numbered clauses like 1. 2. 3. or (1) (2) when inline
    return note
      .replace(/([^\n])(\s*(?:\d+\.|（\d+）|\(\d+\)))/g, "$1\n$2")
      .trim();
  }

  function loadFavorites() {
    try {
      const raw = localStorage.getItem(FAV_STORAGE_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          state.favorites = new Set(arr);
        }
      }
    } catch {
      state.favorites = new Set();
    }
    updateFavBadge();
  }

  function saveFavorites() {
    try {
      localStorage.setItem(FAV_STORAGE_KEY, JSON.stringify([...state.favorites]));
    } catch {
      // Ignore storage quota errors
    }
    updateFavBadge();
  }

  function updateFavBadge() {
    el.favCountBadge.textContent = String(state.favorites.size);
  }

  function toggleFavorite(code) {
    if (state.favorites.has(code)) {
      state.favorites.delete(code);
      showToast(`已將 ${code} 移出常用收藏`);
    } else {
      state.favorites.add(code);
      showToast(`已將 ${code} 加入常用收藏`);
    }
    saveFavorites();
    if (state.favOnly) {
      applyFilters();
    } else {
      renderResults();
    }
    if (state.activeItem && state.activeItem.c === code) {
      updateDetailFavButton();
    }
  }

  let toastTimer = null;
  function showToast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.remove("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.toast.classList.add("hidden");
    }, 2200);
  }

  function copyText(text, label) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        () => showToast(`已複製${label}`),
        () => fallbackCopy(text, label)
      );
    } else {
      fallbackCopy(text, label);
    }
  }

  function fallbackCopy(text, label) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      showToast(`已複製${label}`);
    } catch {
      showToast("複製失敗，請手動複製");
    }
    document.body.removeChild(ta);
  }

  function parseQueryTerms(q) {
    return q
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
  }

  function applyFilters() {
    const terms = parseQueryTerms(state.query);
    const tier = state.tier;
    const section = state.section;
    const status = state.status;
    const favOnly = state.favOnly;

    const matched = [];

    for (let i = 0; i < state.allItems.length; i++) {
      const item = state.allItems[i];

      if (favOnly && !state.favorites.has(item.c)) continue;
      if (tier !== "all" && getItemTier(item.c) !== tier) continue;
      if (section !== "all" && item._section.group !== section) continue;

      if (status === "active" && !isItemActive(item)) continue;
      if (status === "inactive" && isItemActive(item)) continue;

      if (terms.length > 0) {
        const hay = item._search;
        let ok = true;
        for (let t = 0; t < terms.length; t++) {
          if (!hay.includes(terms[t])) {
            ok = false;
            break;
          }
        }
        if (!ok) continue;
      }

      matched.push(item);
    }

    // Sorting
    if (state.sort === "relevance" && terms.length > 0) {
      const firstTerm = terms[0];
      matched.sort((a, b) => {
        const aCodeExact = a.c.toLowerCase() === firstTerm ? 0 : a.c.toLowerCase().startsWith(firstTerm) ? 1 : 2;
        const bCodeExact = b.c.toLowerCase() === firstTerm ? 0 : b.c.toLowerCase().startsWith(firstTerm) ? 1 : 2;
        if (aCodeExact !== bCodeExact) return aCodeExact - bCodeExact;
        return a.c.localeCompare(b.c);
      });
    } else if (state.sort === "code_asc") {
      matched.sort((a, b) => a.c.localeCompare(b.c));
    } else if (state.sort === "points_desc") {
      matched.sort((a, b) => (Number(b.p) || 0) - (Number(a.p) || 0));
    } else if (state.sort === "points_asc") {
      matched.sort((a, b) => (Number(a.p) || 0) - (Number(b.p) || 0));
    } else if (state.sort === "date_desc") {
      matched.sort((a, b) => (b.s || "").localeCompare(a.s || ""));
    }

    state.filteredItems = matched;
    state.page = 1;
    renderResults();
  }

  function renderResults() {
    const total = state.filteredItems.length;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (state.page > totalPages) state.page = totalPages;

    const startIdx = (state.page - 1) * PAGE_SIZE;
    const endIdx = Math.min(startIdx + PAGE_SIZE, total);
    const pageItems = state.filteredItems.slice(startIdx, endIdx);
    const terms = parseQueryTerms(state.query);

    el.loadingState.classList.add("hidden");

    if (total === 0) {
      el.tableContainer.classList.add("hidden");
      el.cardList.classList.add("hidden");
      el.emptyState.classList.remove("hidden");
      el.resultsSummary.innerHTML = `共找到 <strong>0</strong> 筆符合條件的項目`;
      el.paginationTop.innerHTML = "";
      el.paginationBottom.innerHTML = "";
      return;
    }

    el.emptyState.classList.add("hidden");
    el.tableContainer.classList.remove("hidden");
    el.cardList.classList.remove("hidden");

    el.resultsSummary.innerHTML = `共 <strong>${total.toLocaleString("zh-TW")}</strong> 筆項目（顯示第 ${startIdx + 1}–${endIdx} 筆）`;

    // Render Desktop Table Rows
    const rowsHtml = pageItems
      .map((item) => {
        const isFav = state.favorites.has(item.c);
        const active = isItemActive(item);
        const zhHtml = highlightText(item.zh, terms);
        const enHtml = item.en ? `<div class="name-en">${highlightText(item.en, terms)}</div>` : "";
        const secHtml = `<div class="section-tag">${highlightText(item._section.label, terms)}</div>`;
        const codeHtml = highlightText(item.c, terms);
        const hasNote = Boolean(item.n && item.n.trim());

        return `
          <tr data-code="${escapeHtml(item.c)}">
            <td class="col-fav">
              <button type="button" class="fav-btn ${isFav ? "is-fav" : ""}" data-fav="${escapeHtml(item.c)}" aria-label="${isFav ? "移除收藏" : "加入收藏"}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              </button>
            </td>
            <td class="col-code">
              <div class="code-cell">
                <span class="code-badge">${codeHtml}</span>
                <button type="button" class="copy-mini" data-copy="${escapeHtml(item.c)}" title="複製代碼">複製</button>
              </div>
            </td>
            <td class="col-name">
              <div class="name-zh">${zhHtml}</div>
              ${enHtml}
              ${secHtml}
            </td>
            <td class="col-points">
              <span class="points-val">${formatPoints(item.p)}</span><span class="points-unit">點</span>
            </td>
            <td class="col-dates">
              <div class="date-range">
                <span class="status-dot ${active ? "active" : "inactive"}" title="${active ? "現行有效" : "非現行"}"></span>${formatDate(item.s)}
              </div>
              <div class="date-range" style="padding-left:12px; color:var(--text-muted)">~ ${formatDate(item.e)}</div>
            </td>
            <td class="col-note">
              ${hasNote ? `<span class="note-pill">查看備註</span>` : `<span class="note-empty">—</span>`}
            </td>
          </tr>
        `;
      })
      .join("");

    el.tableBody.innerHTML = rowsHtml;

    // Render Mobile Cards
    const cardsHtml = pageItems
      .map((item) => {
        const isFav = state.favorites.has(item.c);
        const active = isItemActive(item);
        const zhHtml = highlightText(item.zh, terms);
        const enHtml = item.en ? `<div class="card-en">${highlightText(item.en, terms)}</div>` : "";
        const secHtml = `<div class="card-section-row"><span class="section-tag">${highlightText(item._section.label, terms)}</span></div>`;
        const codeHtml = highlightText(item.c, terms);

        return `
          <article class="item-card" data-code="${escapeHtml(item.c)}">
            <div class="card-top">
              <div class="card-top-left">
                <span class="code-badge">${codeHtml}</span>
                <button type="button" class="fav-btn ${isFav ? "is-fav" : ""}" data-fav="${escapeHtml(item.c)}" aria-label="${isFav ? "移除收藏" : "加入收藏"}">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                </button>
              </div>
              <div>
                <span class="points-val">${formatPoints(item.p)}</span><span class="points-unit">點</span>
              </div>
            </div>
            <div class="card-zh">${zhHtml}</div>
            ${enHtml}
            ${secHtml}
            <div class="card-bottom">
              <span><span class="status-dot ${active ? "active" : "inactive"}"></span>${formatDate(item.s)} ~ ${formatDate(item.e)}</span>
              ${item.n ? `<span class="note-pill">有備註</span>` : ""}
            </div>
          </article>
        `;
      })
      .join("");

    el.cardList.innerHTML = cardsHtml;
    renderPagination(totalPages);
  }

  function renderPagination(totalPages) {
    if (totalPages <= 1) {
      el.paginationTop.innerHTML = "";
      el.paginationBottom.innerHTML = "";
      return;
    }

    const p = state.page;
    const pages = [];
    pages.push(1);
    if (p > 3) pages.push("...");
    for (let i = Math.max(2, p - 1); i <= Math.min(totalPages - 1, p + 1); i++) {
      pages.push(i);
    }
    if (p < totalPages - 2) pages.push("...");
    if (totalPages > 1) pages.push(totalPages);

    const html = [
      `<button type="button" class="page-btn" data-page="${p - 1}" ${p <= 1 ? "disabled" : ""}>上一頁</button>`,
      ...pages.map((num) =>
        num === "..."
          ? `<span style="padding:0 4px;color:var(--text-muted)">…</span>`
          : `<button type="button" class="page-btn ${num === p ? "active" : ""}" data-page="${num}">${num}</button>`
      ),
      `<button type="button" class="page-btn" data-page="${p + 1}" ${p >= totalPages ? "disabled" : ""}>下一頁</button>`,
    ].join("");

    el.paginationTop.innerHTML = `<span style="font-size:0.82rem;color:var(--text-muted)">第 ${p} / ${totalPages} 頁</span>`;
    el.paginationBottom.innerHTML = html;
  }

  function openDetail(code) {
    const item = state.allItems.find((x) => x.c === code);
    if (!item) return;
    state.activeItem = item;

    const tierInfo = getTierInfo(item.c);
    el.detailCode.textContent = item.c;
    el.detailTierPill.textContent = tierInfo.label;
    el.detailTitle.textContent = item.zh || "(無中文名稱)";
    el.detailEnTitle.textContent = item.en || "";
    el.detailEnTitle.classList.toggle("hidden", !item.en);
    el.detailPoints.textContent = `${formatPoints(item.p)} 點`;
    el.detailStartDate.textContent = formatDate(item.s);
    el.detailEndDate.textContent = formatDate(item.e);
    el.detailSection.textContent = item._section.label;
    el.detailTierDesc.textContent = tierInfo.desc;
    el.detailNote.textContent = formatNoteText(item.n);

    updateDetailFavButton();
    el.detailModal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }

  function updateDetailFavButton() {
    if (!state.activeItem) return;
    const isFav = state.favorites.has(state.activeItem.c);
    el.detailFavText.textContent = isFav ? "已加入常用" : "加入常用";
    el.detailFavBtn.classList.toggle("btn-primary", isFav);
    el.detailFavBtn.classList.toggle("btn-secondary", !isFav);
  }

  function closeDetail() {
    el.detailModal.classList.add("hidden");
    document.body.style.overflow = "";
    state.activeItem = null;
  }

  function exportFilteredCsv() {
    if (!state.filteredItems.length) {
      showToast("目前沒有可匯出的資料");
      return;
    }
    const headers = ["診療項目代碼", "部章節", "健保支付點數", "生效起日", "生效迄日", "英文項目名稱", "中文項目名稱", "備註"];
    const escapeCsv = (val) => `"${String(val ?? "").replace(/"/g, '""')}"`;
    const lines = [
      headers.map(escapeCsv).join(","),
      ...state.filteredItems.map((item) =>
        [item.c, item._section.label, item.p, item.s, item.e, item.en, item.zh, item.n].map(escapeCsv).join(",")
      ),
    ];
    const bom = "\uFEFF";
    const blob = new Blob([bom + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `健保支付標準查詢_${TODAY_STR}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`已匯出 ${state.filteredItems.length} 筆 CSV`);
  }

  function bindEvents() {
    let searchTimer = null;
    el.searchInput.addEventListener("input", () => {
      const val = el.searchInput.value;
      el.clearSearchBtn.classList.toggle("hidden", !val);
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        state.query = val;
        applyFilters();
      }, 120);
    });

    el.clearSearchBtn.addEventListener("click", () => {
      el.searchInput.value = "";
      el.clearSearchBtn.classList.add("hidden");
      state.query = "";
      applyFilters();
      el.searchInput.focus();
    });

    el.tierFilters.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-tier]");
      if (!btn) return;
      el.tierFilters.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
      btn.classList.add("active");
      state.tier = btn.dataset.tier;
      applyFilters();
    });

    el.favFilterBtn.addEventListener("click", () => {
      state.favOnly = !state.favOnly;
      el.favFilterBtn.classList.toggle("active", state.favOnly);
      el.favFilterBtn.setAttribute("aria-pressed", String(state.favOnly));
      applyFilters();
    });

    el.sectionFilter.addEventListener("change", () => {
      state.section = el.sectionFilter.value;
      applyFilters();
    });

    el.statusFilter.addEventListener("change", () => {
      state.status = el.statusFilter.value;
      applyFilters();
    });

    el.sortSelect.addEventListener("change", () => {
      state.sort = el.sortSelect.value;
      applyFilters();
    });

    el.resetFiltersBtn.addEventListener("click", () => {
      el.searchInput.value = "";
      el.clearSearchBtn.classList.add("hidden");
      state.query = "";
      state.tier = "all";
      state.section = "all";
      state.status = "active";
      state.favOnly = false;
      state.sort = "relevance";
      el.sectionFilter.value = "all";
      el.statusFilter.value = "active";
      el.sortSelect.value = "relevance";
      el.favFilterBtn.classList.remove("active");
      el.favFilterBtn.setAttribute("aria-pressed", "false");
      el.tierFilters.querySelectorAll(".chip").forEach((c) => {
        c.classList.toggle("active", c.dataset.tier === "all");
      });
      applyFilters();
    });

    // Theme & Font Size controls
    el.themeToggleBtn.addEventListener("click", () => {
      applyTheme(state.theme === "dark" ? "light" : "dark");
    });

    el.fontDecBtn.addEventListener("click", () => {
      applyFontSize(state.fontSize - 1);
    });

    el.fontIncBtn.addEventListener("click", () => {
      applyFontSize(state.fontSize + 1);
    });

    // Delegate table & card clicks
    const handleListClick = (e) => {
      const favBtn = e.target.closest("[data-fav]");
      if (favBtn) {
        e.stopPropagation();
        toggleFavorite(favBtn.dataset.fav);
        return;
      }
      const copyBtn = e.target.closest("[data-copy]");
      if (copyBtn) {
        e.stopPropagation();
        copyText(copyBtn.dataset.copy, `代碼 ${copyBtn.dataset.copy}`);
        return;
      }
      const row = e.target.closest("[data-code]");
      if (row) {
        openDetail(row.dataset.code);
      }
    };

    el.tableBody.addEventListener("click", handleListClick);
    el.cardList.addEventListener("click", handleListClick);

    el.paginationBottom.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-page]");
      if (!btn || btn.disabled) return;
      state.page = Number(btn.dataset.page);
      renderResults();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    // Detail modal events
    el.closeDetailBtn.addEventListener("click", closeDetail);
    el.detailModal.addEventListener("click", (e) => {
      if (e.target === el.detailModal) closeDetail();
    });

    el.detailFavBtn.addEventListener("click", () => {
      if (state.activeItem) toggleFavorite(state.activeItem.c);
    });

    el.detailCopyCodeBtn.addEventListener("click", () => {
      if (state.activeItem) copyText(state.activeItem.c, `代碼 ${state.activeItem.c}`);
    });

    el.detailCopyAllBtn.addEventListener("click", () => {
      if (!state.activeItem) return;
      const it = state.activeItem;
      const text = [
        `診療項目代碼：${it.c}`,
        `部章節：${it._section.label}`,
        `中文項目名稱：${it.zh}`,
        it.en ? `英文項目名稱：${it.en}` : null,
        `健保支付點數：${formatPoints(it.p)} 點`,
        `生效期間：${formatDate(it.s)} ~ ${formatDate(it.e)}`,
        it.n ? `備註：${it.n}` : null,
      ]
        .filter(Boolean)
        .join("\n");
      copyText(text, "完整項目資訊");
    });

    // Info modal events
    el.infoModalBtn.addEventListener("click", () => {
      el.infoModal.classList.remove("hidden");
    });
    el.closeInfoBtn.addEventListener("click", () => {
      el.infoModal.classList.add("hidden");
    });
    el.infoModal.addEventListener("click", (e) => {
      if (e.target === el.infoModal) el.infoModal.classList.add("hidden");
    });

    el.exportCsvBtn.addEventListener("click", exportFilteredCsv);

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (!el.detailModal.classList.contains("hidden")) closeDetail();
        if (!el.infoModal.classList.contains("hidden")) el.infoModal.classList.add("hidden");
      } else if (e.key === "/" && document.activeElement !== el.searchInput && el.detailModal.classList.contains("hidden")) {
        e.preventDefault();
        el.searchInput.focus();
      }
    });
  }

  async function init() {
    loadPreferences();
    loadFavorites();
    bindEvents();

    try {
      const [metaRes, dataRes] = await Promise.all([
        fetch("data/meta.json", { cache: "no-cache" }),
        fetch("data/fee-schedule.json", { cache: "no-cache" }),
      ]);

      if (!dataRes.ok) throw new Error(`HTTP ${dataRes.status}`);

      if (metaRes.ok) {
        state.meta = await metaRes.json();
        const modDate = (state.meta.sourceModifiedDate || "").slice(0, 10) || "-";
        el.metaUpdatedDate.textContent = modDate;
        el.metaTotalCount.textContent = `${Number(state.meta.totalCount || 0).toLocaleString("zh-TW")} 項`;
        el.infoSourceModified.textContent = state.meta.sourceModifiedDate || "-";
        el.infoSyncedAt.textContent = state.meta.updatedAt || "-";
        el.infoTotalCount.textContent = `${Number(state.meta.totalCount || 0).toLocaleString("zh-TW")} 項`;
      }

      const items = await dataRes.json();
      // Precompute section & lowercase search string for instant filtering
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        it._section = getSectionInfo(it.c);
        it._search = `${it.c}\t${it.zh}\t${it.en}\t${it.n}\t${it._section.label}\t${it._section.short}`.toLowerCase();
      }
      state.allItems = items;
      applyFilters();
    } catch (err) {
      el.loadingState.innerHTML = `
        <p style="color:var(--rose);font-weight:600;">載入資料失敗</p>
        <p style="font-size:0.86rem;">請確認是否透過網站伺服器開啟此頁面（而非直接雙擊 HTML 檔案）。錯誤：${escapeHtml(err.message)}</p>
      `;
    }
  }

  init();
})();
