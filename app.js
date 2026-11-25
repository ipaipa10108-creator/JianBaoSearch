(() => {
  "use strict";

  const PAGE_SIZE = 50;
  const FAV_STORAGE_KEY = "jianbaosearch_favorites_v1";
  const THEME_STORAGE_KEY = "jianbaosearch_theme_v1";
  const FONT_STORAGE_KEY = "jianbaosearch_font_size_v1";
  const AI_CONFIG_STORAGE_KEY = "jianbaosearch_ai_config_v1";
  const AI_HISTORY_STORAGE_KEY = "jianbaosearch_ai_history_v1";
  const DEFAULT_FONT_SIZE = 15;
  const MIN_FONT_SIZE = 13;
  const MAX_FONT_SIZE = 22;

  const state = {
    mode: "nhi",
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
    icdCm: {
      loaded: false,
      loading: false,
      i9: {},
      i11: {},
      rows: [],
      filtered: [],
      query: "",
      only11: "all",
      page: 1,
    },
    icdPcs: {
      loaded: false,
      loading: false,
      i9: {},
      rows: [],
      filtered: [],
      query: "",
      onlyNhi: "all",
      page: 1,
    },
    ai: {
      enabled: false,
      searching: false,
      config: {
        activeProvider: "gemini",
        recentModels: [],
        providers: {
          gemini: { apiKey: "", model: "gemini-2.5-flash" },
          openrouter: { apiKey: "", model: "google/gemini-2.0-flash-exp:free" },
          openai: { apiKey: "", model: "gpt-4o-mini" },
          custom: { apiKey: "", model: "", baseUrl: "" },
        },
      },
      history: [],
      activeHistoryId: null,
      cachedModels: {
        gemini: [],
        openrouter: [],
        openai: ["gpt-4o-mini", "gpt-4.1-mini", "gpt-4o"],
        custom: [],
      },
    },
  };

  // DOM elements
  const el = {
    modeSelect: document.getElementById("modeSelect"),
    nhiView: document.getElementById("nhiView"),
    icdCmView: document.getElementById("icdCmView"),
    icdPcsView: document.getElementById("icdPcsView"),
    aiSearchView: document.getElementById("aiSearchView"),
    aiHistoryHeaderBtn: document.getElementById("aiHistoryHeaderBtn"),
    aiHistoryCountBadge: document.getElementById("aiHistoryCountBadge"),
    settingsModalBtn: document.getElementById("settingsModalBtn"),
    settingsModal: document.getElementById("settingsModal"),
    closeSettingsBtn: document.getElementById("closeSettingsBtn"),
    aiProviderSelect: document.getElementById("aiProviderSelect"),
    aiBaseUrlField: document.getElementById("aiBaseUrlField"),
    aiBaseUrlInput: document.getElementById("aiBaseUrlInput"),
    aiApiKeyInput: document.getElementById("aiApiKeyInput"),
    toggleApiKeyVisBtn: document.getElementById("toggleApiKeyVisBtn"),
    fetchFreeModelsBtn: document.getElementById("fetchFreeModelsBtn"),
    aiModelSelect: document.getElementById("aiModelSelect"),
    aiCustomModelInput: document.getElementById("aiCustomModelInput"),
    aiModelFetchStatus: document.getElementById("aiModelFetchStatus"),
    saveAiSettingsBtn: document.getElementById("saveAiSettingsBtn"),
    exportSettingsBtn: document.getElementById("exportSettingsBtn"),
    importSettingsInput: document.getElementById("importSettingsInput"),
    aiSearchCheckbox: document.getElementById("aiSearchCheckbox"),
    aiActiveModelHint: document.getElementById("aiActiveModelHint"),
    aiSearchSubmitBtn: document.getElementById("aiSearchSubmitBtn"),
    aiQuickConfigBtn: document.getElementById("aiQuickConfigBtn"),
    aiPromptInput: document.getElementById("aiPromptInput"),
    aiRunBtn: document.getElementById("aiRunBtn"),
    aiAllowClarifyCheckbox: document.getElementById("aiAllowClarifyCheckbox"),
    aiCurrentModelBadge: document.getElementById("aiCurrentModelBadge"),
    aiRecentModelsMenu: document.getElementById("aiRecentModelsMenu"),
    aiHistoryList: document.getElementById("aiHistoryList"),
    aiClearHistoryBtn: document.getElementById("aiClearHistoryBtn"),
    aiLoadingState: document.getElementById("aiLoadingState"),
    aiLoadingText: document.getElementById("aiLoadingText"),
    aiProgressBar: document.getElementById("aiProgressBar"),
    aiLoadingMeta: document.getElementById("aiLoadingMeta"),
    aiEmptyState: document.getElementById("aiEmptyState"),
    aiResultsContent: document.getElementById("aiResultsContent"),
    aiFloatingQuickBar: document.getElementById("aiFloatingQuickBar"),
    aiQuickHistoryBtn: document.getElementById("aiQuickHistoryBtn"),
    aiQuickExplainBtn: document.getElementById("aiQuickExplainBtn"),
    aiQuickChatBtn: document.getElementById("aiQuickChatBtn"),
    icdCmInput: document.getElementById("icdCmInput"),
    icdCmClearBtn: document.getElementById("icdCmClearBtn"),
    icdCmExamples: document.getElementById("icdCmExamples"),
    icdCmOnly11: document.getElementById("icdCmOnly11"),
    icdCmSummary: document.getElementById("icdCmSummary"),
    icdCmLoading: document.getElementById("icdCmLoading"),
    icdCmResults: document.getElementById("icdCmResults"),
    icdCmPageTop: document.getElementById("icdCmPageTop"),
    icdCmPageBottom: document.getElementById("icdCmPageBottom"),
    icdPcsInput: document.getElementById("icdPcsInput"),
    icdPcsClearBtn: document.getElementById("icdPcsClearBtn"),
    icdPcsExamples: document.getElementById("icdPcsExamples"),
    icdPcsOnlyNhi: document.getElementById("icdPcsOnlyNhi"),
    icdPcsSummary: document.getElementById("icdPcsSummary"),
    icdPcsLoading: document.getElementById("icdPcsLoading"),
    icdPcsResults: document.getElementById("icdPcsResults"),
    icdPcsPageTop: document.getElementById("icdPcsPageTop"),
    icdPcsPageBottom: document.getElementById("icdPcsPageBottom"),
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

  function downloadCsv(filename, headers, rows) {
    const escapeCsv = (val) => `"${String(val ?? "").replace(/"/g, '""')}"`;
    const lines = [
      headers.map(escapeCsv).join(","),
      ...rows.map((r) => r.map(escapeCsv).join(",")),
    ];
    const bom = "\uFEFF";
    const blob = new Blob([bom + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`已匯出 ${rows.length} 筆 CSV`);
  }

  function exportFilteredCsv() {
    if (state.mode === "icd-cm") {
      const list = state.icdCm.filtered.slice(0, 5000);
      if (!list.length) return showToast("目前沒有可匯出的 ICD 診斷資料");
      const { i9, i11 } = state.icdCm;
      downloadCsv(
        `ICD診斷對照_${TODAY_STR}.csv`,
        ["ICD-9-CM", "ICD-9中文", "ICD-9英文", "ICD-10-CM", "ICD-10中文", "ICD-10英文", "ICD-11代碼", "ICD-11英文"],
        list.map((r) => {
          const d9 = i9[r[0]] || ["", ""];
          const c11s = r[4] || [];
          const t11s = c11s.map((c) => i11[c] || "").filter(Boolean);
          return [r[0], d9[0], d9[1], r[1], r[2], r[3], c11s.join("; "), t11s.join("; ")];
        })
      );
      return;
    }

    if (state.mode === "icd-pcs") {
      const list = state.icdPcs.filtered.slice(0, 5000);
      if (!list.length) return showToast("目前沒有可匯出的 ICD-10-PCS 資料");
      const { i9 } = state.icdPcs;
      downloadCsv(
        `ICD10PCS處置對照_${TODAY_STR}.csv`,
        ["ICD-10-PCS", "PCS中文", "PCS英文", "ICD-9處置碼", "ICD-9中文", "ICD-9英文", "對應健保醫令碼"],
        list.map((r) => {
          const d9 = i9[r[0]] || ["", ""];
          return [r[1], r[2], r[3], r[0], d9[0], d9[1], (r[4] || []).join("; ")];
        })
      );
      return;
    }

    if (!state.filteredItems.length) {
      showToast("目前沒有可匯出的資料");
      return;
    }
    downloadCsv(
      `健保支付標準查詢_${TODAY_STR}.csv`,
      ["診療項目代碼", "部章節", "健保支付點數", "生效起日", "生效迄日", "英文項目名稱", "中文項目名稱", "備註"],
      state.filteredItems.map((item) => [item.c, item._section.label, item.p, item.s, item.e, item.en, item.zh, item.n])
    );
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
        if (!el.settingsModal.classList.contains("hidden")) el.settingsModal.classList.add("hidden");
      } else if (
        e.key === "/" &&
        !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || "") &&
        el.detailModal.classList.contains("hidden") &&
        el.settingsModal.classList.contains("hidden")
      ) {
        e.preventDefault();
        el.searchInput.focus();
      }
    });

    bindIcdEvents();
  }

  function renderSimplePagination(topEl, bottomEl, page, totalPages) {
    if (totalPages <= 1) {
      topEl.innerHTML = "";
      bottomEl.innerHTML = "";
      return;
    }
    const pages = [1];
    if (page > 3) pages.push("...");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push("...");
    if (totalPages > 1) pages.push(totalPages);

    const html = [
      `<button type="button" class="page-btn" data-page="${page - 1}" ${page <= 1 ? "disabled" : ""}>上一頁</button>`,
      ...pages.map((num) =>
        num === "..."
          ? `<span style="padding:0 4px;color:var(--text-muted)">…</span>`
          : `<button type="button" class="page-btn ${num === page ? "active" : ""}" data-page="${num}">${num}</button>`
      ),
      `<button type="button" class="page-btn" data-page="${page + 1}" ${page >= totalPages ? "disabled" : ""}>下一頁</button>`,
    ].join("");

    topEl.innerHTML = `<span style="font-size:0.82rem;color:var(--text-muted)">第 ${page} / ${totalPages} 頁</span>`;
    bottomEl.innerHTML = html;
  }

  function switchMode(mode) {
    state.mode = mode;
    if (el.modeSelect && el.modeSelect.value !== mode) {
      el.modeSelect.value = mode;
    }
    el.nhiView.classList.toggle("hidden", mode !== "nhi");
    el.icdCmView.classList.toggle("hidden", mode !== "icd-cm");
    el.icdPcsView.classList.toggle("hidden", mode !== "icd-pcs");
    el.aiSearchView.classList.toggle("hidden", mode !== "ai");

    if (mode === "icd-cm" && !state.icdCm.loaded && !state.icdCm.loading) {
      loadIcdCm();
    } else if (mode === "icd-pcs" && !state.icdPcs.loaded && !state.icdPcs.loading) {
      loadIcdPcs();
    } else if (mode === "ai") {
      renderAiHistory();
    }
    updateAiFloatingBar();
  }

  async function loadIcdCm() {
    state.icdCm.loading = true;
    el.icdCmLoading.classList.remove("hidden");
    el.icdCmSummary.textContent = "正在載入 ICD-9 / ICD-10-CM / ICD-11 對照資料...";
    try {
      const res = await fetch("data/icd-cm.json");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      state.icdCm.i9 = data.i9 || {};
      state.icdCm.i11 = data.i11 || {};
      const rows = data.rows || [];
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const d9 = state.icdCm.i9[r[0]] || ["", ""];
        const c11s = r[4] || [];
        const t11s = c11s.map((c) => state.icdCm.i11[c] || "").join(" ");
        r._search = `${r[0]}\t${d9[0]}\t${d9[1]}\t${r[1]}\t${r[2]}\t${r[3]}\t${c11s.join(" ")}\t${t11s}`.toLowerCase();
      }
      state.icdCm.rows = rows;
      state.icdCm.loaded = true;
      filterIcdCm();
    } catch (err) {
      el.icdCmSummary.textContent = `載入失敗：${err.message}`;
    } finally {
      state.icdCm.loading = false;
      el.icdCmLoading.classList.add("hidden");
    }
  }

  function filterIcdCm() {
    if (!state.icdCm.loaded) return;
    const terms = parseQueryTerms(state.icdCm.query);
    const only11 = state.icdCm.only11 === "has11";
    const rows = state.icdCm.rows;
    const matched = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (only11 && (!r[4] || r[4].length === 0)) continue;
      if (terms.length > 0) {
        const hay = r._search;
        let ok = true;
        for (let t = 0; t < terms.length; t++) {
          if (!hay.includes(terms[t])) {
            ok = false;
            break;
          }
        }
        if (!ok) continue;
      }
      matched.push(r);
    }

    if (terms.length > 0) {
      const first = terms[0];
      matched.sort((a, b) => {
        const aExact =
          a[1].toLowerCase() === first ||
          a[0].toLowerCase() === first ||
          (a[4] && a[4].some((c) => c.toLowerCase() === first))
            ? 0
            : a[1].toLowerCase().startsWith(first) || a[0].toLowerCase().startsWith(first)
            ? 1
            : 2;
        const bExact =
          b[1].toLowerCase() === first ||
          b[0].toLowerCase() === first ||
          (b[4] && b[4].some((c) => c.toLowerCase() === first))
            ? 0
            : b[1].toLowerCase().startsWith(first) || b[0].toLowerCase().startsWith(first)
            ? 1
            : 2;
        return aExact - bExact;
      });
    }

    state.icdCm.filtered = matched;
    state.icdCm.page = 1;
    renderIcdCm();
  }

  function renderIcdCm() {
    const list = state.icdCm.filtered;
    const total = list.length;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (state.icdCm.page > totalPages) state.icdCm.page = totalPages;

    const startIdx = (state.icdCm.page - 1) * PAGE_SIZE;
    const endIdx = Math.min(startIdx + PAGE_SIZE, total);
    const pageRows = list.slice(startIdx, endIdx);
    const terms = parseQueryTerms(state.icdCm.query);
    const { i9, i11 } = state.icdCm;

    if (total === 0) {
      el.icdCmSummary.innerHTML = `共找到 <strong>0</strong> 筆 ICD 診斷對應資料`;
      el.icdCmResults.innerHTML = `<div class="state-card"><h2>找不到符合條件的診斷編碼</h2><p>請嘗試其他 ICD-9 / ICD-10 / ICD-11 代碼或中英文病名關鍵字。</p></div>`;
      el.icdCmPageTop.innerHTML = "";
      el.icdCmPageBottom.innerHTML = "";
      return;
    }

    el.icdCmSummary.innerHTML = `共 <strong>${total.toLocaleString("zh-TW")}</strong> 筆對應資料（顯示第 ${startIdx + 1}–${endIdx} 筆）`;

    el.icdCmResults.innerHTML = pageRows
      .map((r) => {
        const d9 = i9[r[0]] || ["", ""];
        const c11s = r[4] || [];
        const icd11Html = c11s.length
          ? `<div class="icd-11-list">${c11s
              .map(
                (c11) => `
                  <div class="icd-11-item">
                    <div><button type="button" class="icd-code-btn icd11" data-copy-icd="${escapeHtml(c11)}" title="複製 ICD-11 代碼">${highlightText(c11, terms)}</button></div>
                    <div class="icd-en">${highlightText(i11[c11] || "", terms)}</div>
                  </div>
                `
              )
              .join("")}</div>`
          : `<div class="icd-en">尚無直接 ICD-11 對照</div>`;

        return `
          <article class="icd-card">
            <div class="icd-cols">
              <div class="icd-col">
                <div class="icd-col-header">
                  <span class="icd-ver-label">ICD-9-CM</span>
                  <button type="button" class="icd-code-btn icd9" data-copy-icd="${escapeHtml(r[0])}" title="複製 ICD-9 代碼">${highlightText(r[0] || "-", terms)}</button>
                </div>
                <div class="icd-zh">${highlightText(d9[0] || "(無中文名稱)", terms)}</div>
                <div class="icd-en">${highlightText(d9[1] || "", terms)}</div>
              </div>
              <div class="icd-col">
                <div class="icd-col-header">
                  <span class="icd-ver-label">ICD-10-CM</span>
                  <button type="button" class="icd-code-btn icd10" data-copy-icd="${escapeHtml(r[1])}" title="複製 ICD-10 代碼">${highlightText(r[1] || "-", terms)}</button>
                </div>
                <div class="icd-zh">${highlightText(r[2] || "(無中文名稱)", terms)}</div>
                <div class="icd-en">${highlightText(r[3] || "", terms)}</div>
              </div>
              <div class="icd-col">
                <div class="icd-col-header">
                  <span class="icd-ver-label">ICD-11 (WHO)</span>
                </div>
                ${icd11Html}
              </div>
            </div>
          </article>
        `;
      })
      .join("");

    renderSimplePagination(el.icdCmPageTop, el.icdCmPageBottom, state.icdCm.page, totalPages);
  }

  async function loadIcdPcs() {
    state.icdPcs.loading = true;
    el.icdPcsLoading.classList.remove("hidden");
    el.icdPcsSummary.textContent = "正在載入 ICD-10-PCS 處置編碼資料...";
    try {
      const res = await fetch("data/icd-pcs.json");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      state.icdPcs.i9 = data.i9 || {};
      const rows = data.rows || [];
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const d9 = state.icdPcs.i9[r[0]] || ["", ""];
        const nhis = (r[4] || []).join(" ");
        r._search = `${r[0]}\t${d9[0]}\t${d9[1]}\t${r[1]}\t${r[2]}\t${r[3]}\t${nhis}`.toLowerCase();
      }
      state.icdPcs.rows = rows;
      state.icdPcs.loaded = true;
      filterIcdPcs();
    } catch (err) {
      el.icdPcsSummary.textContent = `載入失敗：${err.message}`;
    } finally {
      state.icdPcs.loading = false;
      el.icdPcsLoading.classList.add("hidden");
    }
  }

  function filterIcdPcs() {
    if (!state.icdPcs.loaded) return;
    const terms = parseQueryTerms(state.icdPcs.query);
    const onlyNhi = state.icdPcs.onlyNhi === "hasNhi";
    const rows = state.icdPcs.rows;
    const matched = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (onlyNhi && (!r[4] || r[4].length === 0)) continue;
      if (terms.length > 0) {
        const hay = r._search;
        let ok = true;
        for (let t = 0; t < terms.length; t++) {
          if (!hay.includes(terms[t])) {
            ok = false;
            break;
          }
        }
        if (!ok) continue;
      }
      matched.push(r);
    }

    if (terms.length > 0) {
      const first = terms[0];
      matched.sort((a, b) => {
        const aExact = a[1].toLowerCase() === first || a[0].toLowerCase() === first ? 0 : a[1].toLowerCase().startsWith(first) || a[0].toLowerCase().startsWith(first) ? 1 : 2;
        const bExact = b[1].toLowerCase() === first || b[0].toLowerCase() === first ? 0 : b[1].toLowerCase().startsWith(first) || b[0].toLowerCase().startsWith(first) ? 1 : 2;
        return aExact - bExact;
      });
    }

    state.icdPcs.filtered = matched;
    state.icdPcs.page = 1;
    renderIcdPcs();
  }

  function renderIcdPcs() {
    const list = state.icdPcs.filtered;
    const total = list.length;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (state.icdPcs.page > totalPages) state.icdPcs.page = totalPages;

    const startIdx = (state.icdPcs.page - 1) * PAGE_SIZE;
    const endIdx = Math.min(startIdx + PAGE_SIZE, total);
    const pageRows = list.slice(startIdx, endIdx);
    const terms = parseQueryTerms(state.icdPcs.query);
    const { i9 } = state.icdPcs;

    if (total === 0) {
      el.icdPcsSummary.innerHTML = `共找到 <strong>0</strong> 筆 ICD-10-PCS 處置編碼`;
      el.icdPcsResults.innerHTML = `<div class="state-card"><h2>找不到符合條件的處置編碼</h2><p>請嘗試其他 ICD-10-PCS、ICD-9 處置碼或中英文處置關鍵字。</p></div>`;
      el.icdPcsPageTop.innerHTML = "";
      el.icdPcsPageBottom.innerHTML = "";
      return;
    }

    el.icdPcsSummary.innerHTML = `共 <strong>${total.toLocaleString("zh-TW")}</strong> 筆處置編碼（顯示第 ${startIdx + 1}–${endIdx} 筆）`;

    el.icdPcsResults.innerHTML = pageRows
      .map((r) => {
        const d9 = i9[r[0]] || ["", ""];
        const nhis = r[4] || [];
        const nhiHtml = nhis.length
          ? `<div class="nhi-link-list">
               <span>對應健保醫令：</span>
               ${nhis.map((code) => `<button type="button" class="nhi-jump-btn" data-jump-nhi="${escapeHtml(code)}" title="前往查詢健保點數與規範">${highlightText(code, terms)}</button>`).join("")}
             </div>`
          : "";

        return `
          <article class="icd-card">
            <div class="icd-cols icd-cols-2">
              <div class="icd-col">
                <div class="icd-col-header">
                  <span class="icd-ver-label">ICD-10-PCS 處置編碼</span>
                  <button type="button" class="icd-code-btn icd10" data-copy-icd="${escapeHtml(r[1])}" title="複製 ICD-10-PCS 代碼">${highlightText(r[1] || "-", terms)}</button>
                </div>
                <div class="icd-zh">${highlightText(r[2] || "(無中文名稱)", terms)}</div>
                <div class="icd-en">${highlightText(r[3] || "", terms)}</div>
              </div>
              <div class="icd-col">
                <div class="icd-col-header">
                  <span class="icd-ver-label">對應 ICD-9-CM 處置</span>
                  <button type="button" class="icd-code-btn icd9" data-copy-icd="${escapeHtml(r[0])}" title="複製 ICD-9 處置碼">${highlightText(r[0] || "-", terms)}</button>
                </div>
                <div class="icd-zh">${highlightText(d9[0] || "(無中文名稱)", terms)}</div>
                <div class="icd-en">${highlightText(d9[1] || "", terms)}</div>
              </div>
            </div>
            ${nhiHtml}
          </article>
        `;
      })
      .join("");

    renderSimplePagination(el.icdPcsPageTop, el.icdPcsPageBottom, state.icdPcs.page, totalPages);
  }

  function bindIcdEvents() {
    el.modeSelect.addEventListener("change", () => {
      switchMode(el.modeSelect.value);
    });

    // ICD-CM events
    let cmTimer = null;
    el.icdCmInput.addEventListener("input", () => {
      const val = el.icdCmInput.value;
      el.icdCmClearBtn.classList.toggle("hidden", !val);
      clearTimeout(cmTimer);
      cmTimer = setTimeout(() => {
        state.icdCm.query = val;
        filterIcdCm();
      }, 140);
    });

    el.icdCmClearBtn.addEventListener("click", () => {
      el.icdCmInput.value = "";
      el.icdCmClearBtn.classList.add("hidden");
      state.icdCm.query = "";
      filterIcdCm();
      el.icdCmInput.focus();
    });

    el.icdCmExamples.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-example]");
      if (!btn) return;
      el.icdCmInput.value = btn.dataset.example;
      el.icdCmClearBtn.classList.remove("hidden");
      state.icdCm.query = btn.dataset.example;
      filterIcdCm();
    });

    el.icdCmOnly11.addEventListener("change", () => {
      state.icdCm.only11 = el.icdCmOnly11.value;
      filterIcdCm();
    });

    el.icdCmResults.addEventListener("click", (e) => {
      const copyBtn = e.target.closest("[data-copy-icd]");
      if (copyBtn) {
        copyText(copyBtn.dataset.copyIcd, `編碼 ${copyBtn.dataset.copyIcd}`);
      }
    });

    el.icdCmPageBottom.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-page]");
      if (!btn || btn.disabled) return;
      state.icdCm.page = Number(btn.dataset.page);
      renderIcdCm();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    // ICD-PCS events
    let pcsTimer = null;
    el.icdPcsInput.addEventListener("input", () => {
      const val = el.icdPcsInput.value;
      el.icdPcsClearBtn.classList.toggle("hidden", !val);
      clearTimeout(pcsTimer);
      pcsTimer = setTimeout(() => {
        state.icdPcs.query = val;
        filterIcdPcs();
      }, 140);
    });

    el.icdPcsClearBtn.addEventListener("click", () => {
      el.icdPcsInput.value = "";
      el.icdPcsClearBtn.classList.add("hidden");
      state.icdPcs.query = "";
      filterIcdPcs();
      el.icdPcsInput.focus();
    });

    el.icdPcsExamples.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-example]");
      if (!btn) return;
      el.icdPcsInput.value = btn.dataset.example;
      el.icdPcsClearBtn.classList.remove("hidden");
      state.icdPcs.query = btn.dataset.example;
      filterIcdPcs();
    });

    el.icdPcsOnlyNhi.addEventListener("change", () => {
      state.icdPcs.onlyNhi = el.icdPcsOnlyNhi.value;
      filterIcdPcs();
    });

    el.icdPcsResults.addEventListener("click", (e) => {
      const copyBtn = e.target.closest("[data-copy-icd]");
      if (copyBtn) {
        copyText(copyBtn.dataset.copyIcd, `處置碼 ${copyBtn.dataset.copyIcd}`);
        return;
      }
      const jumpBtn = e.target.closest("[data-jump-nhi]");
      if (jumpBtn) {
        const code = jumpBtn.dataset.jumpNhi;
        switchMode("nhi");
        el.searchInput.value = code;
        el.clearSearchBtn.classList.remove("hidden");
        state.query = code;
        applyFilters();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });

    el.icdPcsPageBottom.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-page]");
      if (!btn || btn.disabled) return;
      state.icdPcs.page = Number(btn.dataset.page);
      renderIcdPcs();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    bindAiAndSettingsEvents();
  }

  // ==================== AI Settings, Free Models & Import/Export ====================
  const DEFAULT_MODELS = {
    gemini: ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-flash"],
    openrouter: [
      "google/gemini-2.0-flash-exp:free",
      "meta-llama/llama-3.3-70b-instruct:free",
      "qwen/qwen-2.5-72b-instruct:free",
      "deepseek/deepseek-chat-v3-0324:free",
    ],
    openai: ["gpt-4o-mini", "gpt-4.1-mini", "gpt-4o"],
    custom: [],
  };

  function getActiveAiProviderCfg() {
    const p = state.ai.config.activeProvider || "gemini";
    return {
      provider: p,
      ...(state.ai.config.providers[p] || { apiKey: "", model: "", baseUrl: "" }),
    };
  }

  function updateAiStatusBadges() {
    const { provider, apiKey, model } = getActiveAiProviderCfg();
    const providerLabels = { gemini: "Gemini", openrouter: "OpenRouter", openai: "OpenAI", custom: "Custom" };
    const pName = providerLabels[provider] || provider;
    const configured = Boolean(apiKey && model);

    el.aiCurrentModelBadge.textContent = configured ? `${pName} · ${model}` : `${pName}（未設定 API Key）`;
    el.aiActiveModelHint.textContent = configured
      ? `（目前：${pName} / ${model} — 按 Enter 或點「送出 AI 查詢」）`
      : "（請先於右上角⚙設定 API Key）";
    el.aiHistoryCountBadge.textContent = String(state.ai.history.length);
  }

  function recordRecentModel(provider, model) {
    if (!provider || !model) return;
    if (!Array.isArray(state.ai.config.recentModels)) state.ai.config.recentModels = [];
    const list = state.ai.config.recentModels.filter((x) => !(x.provider === provider && x.model === model));
    list.unshift({ provider, model });
    state.ai.config.recentModels = list.slice(0, 10);
  }

  function renderRecentModelsMenu() {
    if (!el.aiRecentModelsMenu) return;
    const providerLabels = { gemini: "Gemini", openrouter: "OpenRouter", openai: "OpenAI", custom: "Custom" };
    const active = getActiveAiProviderCfg();
    const list = Array.isArray(state.ai.config.recentModels) ? [...state.ai.config.recentModels] : [];

    // Ensure any configured provider+model is also available to switch
    for (const p of ["gemini", "openrouter", "openai", "custom"]) {
      const cfg = state.ai.config.providers[p];
      if (cfg && cfg.apiKey && cfg.model && !list.some((x) => x.provider === p && x.model === cfg.model)) {
        list.push({ provider: p, model: cfg.model });
      }
    }

    if (!list.length) {
      el.aiRecentModelsMenu.innerHTML = `<div class="model-popover-hint">尚無最近使用模型，請點擊上方齒輪 ⚙ 設定 API Key 與模型。</div>`;
      return;
    }

    el.aiRecentModelsMenu.innerHTML =
      list
        .map((item) => {
          const isCurrent = item.provider === active.provider && item.model === active.model;
          const pName = providerLabels[item.provider] || item.provider;
          return `<button type="button" class="model-popover-item ${isCurrent ? "active" : ""}" role="option" aria-selected="${isCurrent}" data-quick-provider="${escapeHtml(item.provider)}" data-quick-model="${escapeHtml(item.model)}">${escapeHtml(pName)} · ${escapeHtml(item.model)}</button>`;
        })
        .join("") +
      `<div class="model-popover-hint">如需修改 API Key 或搜尋其他模型，請點擊上方齒輪 ⚙</div>`;
  }

  function loadAiState() {
    try {
      const rawCfg = localStorage.getItem(AI_CONFIG_STORAGE_KEY);
      if (rawCfg) {
        const parsed = JSON.parse(rawCfg);
        if (parsed && parsed.providers) {
          state.ai.config.activeProvider = parsed.activeProvider || "gemini";
          state.ai.config.recentModels = Array.isArray(parsed.recentModels) ? parsed.recentModels : [];
          for (const key of ["gemini", "openrouter", "openai", "custom"]) {
            if (parsed.providers[key]) {
              state.ai.config.providers[key] = {
                ...state.ai.config.providers[key],
                ...parsed.providers[key],
              };
            }
          }
        }
      }
      const rawHist = localStorage.getItem(AI_HISTORY_STORAGE_KEY);
      if (rawHist) {
        const arr = JSON.parse(rawHist);
        if (Array.isArray(arr)) state.ai.history = arr;
      }
    } catch {
      // ignore corrupted storage
    }
    const active = getActiveAiProviderCfg();
    if (active.apiKey && active.model) {
      recordRecentModel(active.provider, active.model);
    }
    updateAiStatusBadges();
    renderAiHistory();
  }

  function saveAiConfig() {
    try {
      localStorage.setItem(AI_CONFIG_STORAGE_KEY, JSON.stringify(state.ai.config));
    } catch {}
    updateAiStatusBadges();
  }

  function saveAiHistory() {
    try {
      localStorage.setItem(AI_HISTORY_STORAGE_KEY, JSON.stringify(state.ai.history.slice(0, 50)));
    } catch {}
    updateAiStatusBadges();
  }

  function populateSettingsForm(provider) {
    const p = provider || state.ai.config.activeProvider || "gemini";
    const cfg = state.ai.config.providers[p] || { apiKey: "", model: "", baseUrl: "" };

    el.aiProviderSelect.value = p;
    el.aiApiKeyInput.value = cfg.apiKey || "";
    el.aiBaseUrlField.style.display = p === "custom" || p === "openai" ? "block" : "none";
    el.aiBaseUrlInput.value = cfg.baseUrl || (p === "openai" ? "https://api.openai.com/v1" : "");

    const showFetchBtn = p === "gemini" || p === "openrouter" || p === "openai" || p === "custom";
    el.fetchFreeModelsBtn.style.display = showFetchBtn ? "inline-flex" : "none";
    el.fetchFreeModelsBtn.textContent = p === "gemini" || p === "openrouter" ? "自動搜尋 Free Model" : "拉取模型清單";

    const cached = state.ai.cachedModels[p] && state.ai.cachedModels[p].length ? state.ai.cachedModels[p] : DEFAULT_MODELS[p] || [];
    const options = [...cached];
    if (cfg.model && !options.includes(cfg.model)) options.unshift(cfg.model);

    el.aiModelSelect.innerHTML = options.length
      ? options.map((m) => `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`).join("")
      : `<option value="">請手動輸入或點擊搜尋模型</option>`;
    if (cfg.model) el.aiModelSelect.value = cfg.model;
    el.aiCustomModelInput.value = cfg.model || "";
    el.aiModelFetchStatus.textContent = "";
  }

  async function fetchFreeModels() {
    const p = el.aiProviderSelect.value;
    const key = el.aiApiKeyInput.value.trim();
    el.fetchFreeModelsBtn.disabled = true;
    el.aiModelFetchStatus.textContent = "正在搜尋可用模型清單...";

    try {
      let models = [];
      if (p === "openrouter") {
        const res = await fetch("https://openrouter.ai/api/v1/models");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        models = (data.data || [])
          .filter((m) => {
            const pr = m.pricing || {};
            return m.id.endsWith(":free") || (String(pr.prompt) === "0" && String(pr.completion) === "0");
          })
          .map((m) => m.id)
          .sort();
        el.aiModelFetchStatus.textContent = `已找到 ${models.length} 個 OpenRouter 免費模型！`;
      } else if (p === "gemini") {
        if (!key) throw new Error("Gemini 需先填入 API Key 才能查詢可用模型清單");
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        models = (data.models || [])
          .filter((m) => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes("generateContent"))
          .map((m) => m.name.replace(/^models\//, ""))
          .filter((id) => /flash|pro|gemma/i.test(id))
          .sort((a, b) => (a.includes("flash") === b.includes("flash") ? a.localeCompare(b) : a.includes("flash") ? -1 : 1));
        el.aiModelFetchStatus.textContent = `已找到 ${models.length} 個 Gemini 可用模型（含免費額度 Flash 系列）！`;
      } else {
        if (!key) throw new Error("需先填入 API Key 才能拉取模型清單");
        const base = (el.aiBaseUrlInput.value.trim() || "https://api.openai.com/v1").replace(/\/+$/, "");
        const res = await fetch(`${base}/models`, {
          headers: { Authorization: `Bearer ${key}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        models = (data.data || []).map((m) => m.id).sort();
        el.aiModelFetchStatus.textContent = `已找到 ${models.length} 個可用模型！`;
      }

      if (models.length) {
        state.ai.cachedModels[p] = models;
        el.aiModelSelect.innerHTML = models.map((m) => `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`).join("");
        el.aiCustomModelInput.value = models[0];
      }
    } catch (err) {
      el.aiModelFetchStatus.textContent = `搜尋失敗：${err.message}`;
    } finally {
      el.fetchFreeModelsBtn.disabled = false;
    }
  }

  const AI_FOCUSED_PERSONA = [
    "【核心角色與專業準則】",
    "你是台灣健保支付標準、國際疾病分類編碼（ICD-9-CM / ICD-10-CM / ICD-11 / ICD-10-PCS）與醫療險理賠要件客觀評估顧問。",
    "1. 診斷與編碼精準性：必須嚴格依據臨床描述給予正確的 ICD 診斷碼、ICD-10-PCS 處置碼及台灣健保支付標準對應關鍵字。",
    "2. 客觀理賠要件檢視：針對健保部章節（例如第二部第二章第七節 2-2-7「手術」與第六節 2-2-6「治療處置」、第三部牙科手術 3-3-4-3、住院必要性、病理/影像佐證等），客觀說明該診斷或處置與常見保險條款要件的符合情形及應完備之客觀病歷紀錄。",
    "3. 醫學倫理紅線（嚴禁扭曲診斷）：絕對禁止為了迎合保險理賠或提高給付而建議醫師/病患更改、誇大、隱匿或扭曲真實醫療診斷或手術紀錄；若現行處置屬於健保 2-2-6 處置而非 2-2-7 手術，須誠實說明其本質差異與客觀醫療事實。",
  ].join("\n");

  async function callAiRequest(messages, expectJson = false) {
    const { provider, apiKey, model, baseUrl } = getActiveAiProviderCfg();
    if (!apiKey) throw new Error("尚未設定 API Key，請點擊右上角齒輪圖示進行設定。");
    if (!model) throw new Error("尚未選擇 AI 模型，請先至設定視窗選擇模型。");

    if (provider === "gemini") {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const systemMsg = messages.find((m) => m.role === "system")?.content || "";
      const contents = messages
        .filter((m) => m.role !== "system")
        .map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        }));
      const body = {
        contents,
        generationConfig: expectJson ? { temperature: 0.2, responseMimeType: "application/json" } : { temperature: 0.3 },
      };
      if (systemMsg) {
        body.systemInstruction = { parts: [{ text: systemMsg }] };
      }
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`Gemini API 錯誤 (${res.status}): ${errBody.slice(0, 180)}`);
      }
      const data = await res.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    }

    const endpoint =
      provider === "openrouter"
        ? "https://openrouter.ai/api/v1/chat/completions"
        : `${(baseUrl || "https://api.openai.com/v1").replace(/\/+$/, "")}/chat/completions`;
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    };
    if (provider === "openrouter") {
      headers["HTTP-Referer"] = window.location.origin;
      headers["X-Title"] = "JianBaoSearch";
    }
    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        temperature: expectJson ? 0.2 : 0.3,
        messages,
      }),
    });
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`API 錯誤 (${res.status}): ${errBody.slice(0, 180)}`);
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content || "";
  }

  function parseAiJsonSafe(rawText, userQuery) {
    const noThink = String(rawText || "")
      .replace(/<think>[\s\S]*?<\/think>/gi, "")
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    const firstBrace = noThink.indexOf("{");
    const lastBrace = noThink.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const candidate = noThink.slice(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(candidate);
      } catch {
        try {
          const fixed = candidate.replace(/,\s*([}\]])/g, "$1");
          return JSON.parse(fixed);
        } catch {
          // fall through to graceful text extraction
        }
      }
    }

    // Graceful fallback if free model returned plain text instead of strict JSON
    const icd10Codes = [...new Set(noThink.match(/\b[A-TV-Z][0-9]{2}(?:\.[0-9A-Z]{1,4})?\b/g) || [])].slice(0, 6);
    const nhiCodes = [...new Set(noThink.match(/\b[0-9]{5}[A-Z]\b/g) || [])].slice(0, 6);
    const pcsCodes = [...new Set(noThink.match(/\b[0-9A-HJ-NP-Z]{7}\b/g) || [])].slice(0, 6);
    const kws = userQuery.split(/[\s,，、；;]+/).filter((w) => w.length >= 2).slice(0, 4);

    return {
      needsClarification: false,
      clarifyingQuestions: [],
      clinicalSummary: noThink.slice(0, 600) || `已完成「${userQuery}」之文字解析。`,
      nhiKeywords: kws,
      nhiCodes,
      icdKeywords: kws,
      icd10Codes,
      pcsKeywords: kws,
      pcsCodes,
      whyListed: {
        nhi: "模型本次以純文字回覆，系統已自動擷取關鍵字與代碼比對健保支付標準。",
        icd: "系統已從回覆與查詢語句中比對對應的 ICD 診斷編碼。",
        pcs: "系統已從回覆與查詢語句中比對對應的 ICD-10-PCS 處置編碼。",
      },
      nextCriteriaAndProgression: [
        "建議確認實際病歷記載、影像／病理報告及手術途徑，以核對正確編碼與健保部章節。",
      ],
    };
  }

  function detectQueryScope(userQuery) {
    const q = String(userQuery || "");
    const hasProc = /手術|切除|支架|置放|植入|引流|縫合|內視鏡|腹腔鏡|導管|切片|穿刺|震波|雷射|放療|化療|處置|洗腎|透析|清創|拔牙|麻醉|健保|點數|2-2-7|227|2-2-6|226|PCS/i.test(q);
    const hasDx = /病|炎|癌|瘤|症|骨折|出血|栓塞|梗塞|衰竭|感染|潰瘍|結石|ICD|診斷/i.test(q);
    if (hasProc && !hasDx) return { scope: "proc", label: "鎖定範圍：健保支付標準 + ICD-10-PCS 處置" };
    if (hasDx && !hasProc) return { scope: "dx", label: "鎖定範圍：ICD 診斷 + 相關健保檢查/處置" };
    return { scope: "all", label: "鎖定範圍：健保支付標準 + ICD 診斷 + ICD 處置" };
  }

  async function callAiApi(userQuery, allowClarify = true) {
    const scopeInfo = detectQueryScope(userQuery);
    const clarifyRule = allowClarify
      ? "【反問機制（已啟用）】若查詢條件過於簡略且缺少決定編碼或 2-2-7/2-2-6 認定的關鍵資訊（如門診/住院、術式途徑、部位分期），請設 needsClarification=true 並於 clarifyingQuestions 給 1~3 個簡短問題；若已足夠則設 false。"
      : "【反問機制（已關閉）】請務必設 needsClarification=false，直接給完整候選。";

    const systemPrompt = [
      AI_FOCUSED_PERSONA,
      "",
      `【查詢範圍】${scopeInfo.label}。請精簡回覆以加快速度（每段說明限 1~2 句重點，nhiKeywords 必須是 2~4 字的短詞如 "支架"、"頸動脈"、"動脈瘤"、"血管"，切勿寫成一整句）。`,
      clarifyRule,
      "",
      "只回傳單一 JSON（不要 ```json）：",
      "{",
      '  "needsClarification": false,',
      '  "clarifyingQuestions": [],',
      '  "clinicalSummary": "2句內臨床與申報判讀摘要",',
      '  "nhiKeywords": ["3到5個2~4字中文短詞，利於比對台灣健保2-2-6/2-2-7/2-2-2項目"],',
      '  "nhiCodes": ["已知健保代碼"],',
      '  "icdKeywords": ["2到4個中英文疾病短詞"],',
      '  "icd10Codes": ["可能ICD-10-CM代碼"],',
      '  "pcsKeywords": ["2到4個中英文處置短詞"],',
      '  "pcsCodes": ["可能ICD-10-PCS代碼"],',
      '  "whyListed": {',
      '    "nhi": "1~2句說明為何列這些健保項目與2-2-7/2-2-6差異",',
      '    "icd": "1~2句說明為何列這些ICD診斷",',
      '    "pcs": "1~2句說明為何列這些PCS處置"',
      "  },",
      '  "nextCriteriaAndProgression": [',
      '    "診斷/分期需確認之客觀檢查或病理要件",',
      '    "處置/保險理賠要件重點（不為理賠扭曲診斷）"',
      "  ]",
      "}",
    ].join("\n");

    const rawText = await callAiRequest(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userQuery },
      ],
      true
    );

    return parseAiJsonSafe(rawText, userQuery);
  }

  async function callAiFollowUp(entry, followUpQuestion) {
    const contextSummary = [
      `【原始查詢】${entry.query}`,
      `【判讀摘要】${entry.clinicalSummary}`,
      `【已列健保支付標準】${(entry.nhiHits || []).slice(0, 6).map((x) => `${x.c} ${x.zh}(${x.sec})`).join("；") || "無"}`,
      `【已列ICD診斷】${(entry.cmHits || []).slice(0, 6).map((x) => `ICD10:${x.i10} ${x.zh10} / ICD9:${x.i9}`).join("；") || "無"}`,
      `【已列ICD-10-PCS處置】${(entry.pcsHits || []).slice(0, 6).map((x) => `${x.pcs} ${x.zhPcs}`).join("；") || "無"}`,
    ].join("\n");

    const systemPrompt = [
      AI_FOCUSED_PERSONA,
      "",
      "請以繁體中文簡潔、結構化回答使用者的後續追問。針對診斷碼正確性、健保部章節（如 2-2-7 vs 2-2-6）、保險理賠要件符合度、病歷應記載的客觀事實以及疾病/處置後續發展提供專業解答；切勿建議為了保險理賠而扭曲或偽造診斷。",
      "",
      "本次查詢上下文：",
      contextSummary,
    ].join("\n");

    const messages = [{ role: "system", content: systemPrompt }];
    const historyMsgs = Array.isArray(entry.followUps) ? entry.followUps : [];
    for (const m of historyMsgs.slice(-10)) {
      messages.push({ role: m.role, content: m.content });
    }
    messages.push({ role: "user", content: followUpQuestion });

    return await callAiRequest(messages, false);
  }

  function extractMedicalTokens(texts) {
    const stopWords = new Set(["治療", "手術", "處置", "檢查", "使用", "合併", "進行", "裝設", "相關", "可能", "需要", "一般", "其他"]);
    const tokens = new Set();
    for (const raw of texts) {
      const s = String(raw || "").trim().toLowerCase();
      if (!s) continue;
      for (const seg of s.split(/[\s,，、；;（）()\/\-－]+/)) {
        if (!seg) continue;
        if (seg.length >= 2 && seg.length <= 6 && !stopWords.has(seg)) {
          tokens.add(seg);
        }
        // Extract 2-char and 3-char CJK medical sub-terms from longer phrases
        const cjkRuns = seg.match(/[\u4e00-\u9fff]{2,}/g) || [];
        for (const run of cjkRuns) {
          if (run.length <= 4 && !stopWords.has(run)) tokens.add(run);
          if (run.length >= 3) {
            for (let i = 0; i <= run.length - 2; i++) {
              const bi = run.slice(i, i + 2);
              if (!stopWords.has(bi)) tokens.add(bi);
            }
          }
          if (run.length >= 4) {
            for (let i = 0; i <= run.length - 3; i++) {
              const tri = run.slice(i, i + 3);
              if (!stopWords.has(tri)) tokens.add(tri);
            }
          }
        }
      }
    }
    return [...tokens];
  }

  function matchLocalNhi(aiPlan, rawQuery = "", pcsHits = []) {
    const codes = new Set((aiPlan.nhiCodes || []).map((c) => String(c).trim().toUpperCase()));
    const pcsLinkedCodes = new Set();
    for (const p of pcsHits || []) {
      for (const c of p.nhi || []) {
        pcsLinkedCodes.add(String(c).trim().toUpperCase());
      }
    }

    const kws = (aiPlan.nhiKeywords || []).map((k) => String(k).trim().toLowerCase()).filter(Boolean);
    const tokens = extractMedicalTokens([...kws, ...(aiPlan.pcsKeywords || []), rawQuery]);
    const scored = [];

    for (let i = 0; i < state.allItems.length; i++) {
      const it = state.allItems[i];
      const codeUpper = it.c.toUpperCase();
      const zhLower = (it.zh || "").toLowerCase();
      let score = 0;

      if (codes.has(codeUpper)) score += 120;
      if (pcsLinkedCodes.has(codeUpper)) score += 75;

      for (const kw of kws) {
        const parts = kw.split(/\s+/).filter(Boolean);
        if (parts.length && parts.every((p) => it._search.includes(p))) {
          score += zhLower.includes(kw) ? 35 : 18;
        }
      }

      if (tokens.length) {
        let tokenHits = 0;
        for (const tk of tokens) {
          if (zhLower.includes(tk)) {
            score += tk.length >= 3 ? 14 : 9;
            tokenHits++;
          } else if (it._search.includes(tk)) {
            score += 3;
          }
        }
        if (tokenHits >= 2) score += 15;
      }

      if (score > 0) {
        const secGroup = it._section ? it._section.group : "";
        if (secGroup === "手術" || secGroup === "治療處置" || secGroup === "放射線診療") {
          score += 8;
        }
        if (isItemActive(it)) score += 3;
        scored.push({ item: it, score });
      }
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 12).map((s) => ({
      c: s.item.c,
      zh: s.item.zh,
      en: s.item.en,
      p: s.item.p,
      sec: s.item._section.label,
    }));
  }

  function matchLocalIcdCm(aiPlan) {
    const codes = new Set((aiPlan.icd10Codes || []).map((c) => String(c).trim().toUpperCase()));
    const kws = (aiPlan.icdKeywords || []).map((k) => String(k).trim().toLowerCase()).filter(Boolean);
    const { rows, i9, i11 } = state.icdCm;
    const scored = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      let score = 0;
      const c10 = (r[1] || "").toUpperCase();
      if (codes.has(c10)) score += 100;
      else if ([...codes].some((c) => c10.startsWith(c))) score += 40;

      for (const kw of kws) {
        const parts = kw.split(/\s+/).filter(Boolean);
        if (parts.length && parts.every((p) => r._search.includes(p))) {
          score += (r[2] || "").toLowerCase().includes(kw) ? 20 : 10;
        }
      }
      if (score > 0 && r[4] && r[4].length) score += 3;
      if (score > 0) scored.push({ r, score });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 12).map(({ r }) => {
      const d9 = i9[r[0]] || ["", ""];
      const c11s = r[4] || [];
      return {
        i9: r[0],
        zh9: d9[0],
        en9: d9[1],
        i10: r[1],
        zh10: r[2],
        en10: r[3],
        i11: c11s.map((c) => ({ code: c, title: i11[c] || "" })),
      };
    });
  }

  function matchLocalIcdPcs(aiPlan) {
    const codes = new Set((aiPlan.pcsCodes || []).map((c) => String(c).trim().toUpperCase()));
    const kws = (aiPlan.pcsKeywords || []).map((k) => String(k).trim().toLowerCase()).filter(Boolean);
    const { rows, i9 } = state.icdPcs;
    const scored = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      let score = 0;
      const pcs = (r[1] || "").toUpperCase();
      if (codes.has(pcs)) score += 100;
      else if ([...codes].some((c) => pcs.startsWith(c.slice(0, 4)))) score += 35;

      for (const kw of kws) {
        const parts = kw.split(/\s+/).filter(Boolean);
        if (parts.length && parts.every((p) => r._search.includes(p))) {
          score += (r[2] || "").toLowerCase().includes(kw) ? 20 : 10;
        }
      }
      if (score > 0 && r[4] && r[4].length) score += 5;
      if (score > 0) scored.push({ r, score });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 12).map(({ r }) => {
      const d9 = i9[r[0]] || ["", ""];
      return {
        i9: r[0],
        zh9: d9[0],
        en9: d9[1],
        pcs: r[1],
        zhPcs: r[2],
        enPcs: r[3],
        nhi: r[4] || [],
      };
    });
  }

  let aiProgressTimer = null;

  function stopAiProgressTimer() {
    if (aiProgressTimer) {
      clearInterval(aiProgressTimer);
      aiProgressTimer = null;
    }
  }

  function startAiProgressUi(startedAt, stepText, percent) {
    el.aiEmptyState.classList.add("hidden");
    el.aiResultsContent.classList.add("hidden");
    el.aiLoadingState.classList.remove("hidden");
    el.aiLoadingText.textContent = stepText;
    if (el.aiProgressBar) el.aiProgressBar.style.width = `${percent}%`;

    const updateTimerText = () => {
      const sec = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
      if (el.aiLoadingMeta) {
        el.aiLoadingMeta.textContent = `已耗時 ${sec} 秒 · 您可先切換其他分頁或離開畫面，完成後會自動儲存於歷史紀錄`;
      }
    };
    updateTimerText();
    stopAiProgressTimer();
    aiProgressTimer = setInterval(updateTimerText, 1000);
  }

  async function runAiSearch(queryText, options = {}) {
    const q = (queryText || "").trim();
    if (!q) {
      showToast("請輸入查詢內容");
      return;
    }
    const { apiKey, model, provider } = getActiveAiProviderCfg();
    if (!apiKey || !model) {
      showToast("請先設定 AI API Key 與模型");
      populateSettingsForm();
      el.settingsModal.classList.remove("hidden");
      return;
    }

    const allowClarify =
      typeof options.allowClarify === "boolean"
        ? options.allowClarify
        : Boolean(el.aiAllowClarifyCheckbox ? el.aiAllowClarifyCheckbox.checked : true);

    switchMode("ai");
    el.aiPromptInput.value = q;

    const startedAt = Date.now();
    const entry = options.existingEntry || {
      id: `${startedAt}_${Math.random().toString(36).slice(2, 7)}`,
      query: q,
      timestamp: new Date().toLocaleString("zh-TW", { hour12: false }),
      provider,
      model,
      status: "pending",
      startedAt,
      clinicalSummary: "",
      clarifyingQuestions: [],
      whyListed: {},
      nextCriteriaAndProgression: [],
      followUps: [],
      nhiHits: [],
      cmHits: [],
      pcsHits: [],
      errorMessage: "",
    };

    entry.query = q;
    entry.provider = provider;
    entry.model = model;
    entry.status = "pending";
    entry.startedAt = startedAt;
    entry.errorMessage = "";

    if (!options.existingEntry) {
      state.ai.history.unshift(entry);
      if (state.ai.history.length > 50) state.ai.history.pop();
    }
    state.ai.activeHistoryId = entry.id;
    saveAiHistory();
    renderAiHistory();

    startAiProgressUi(startedAt, "步驟 1/3：正在載入本機健保與 ICD 資料庫...", 22);

    try {
      const dbPromise = Promise.all([
        state.icdCm.loaded ? Promise.resolve() : loadIcdCm(),
        state.icdPcs.loaded ? Promise.resolve() : loadIcdPcs(),
      ]);

      if (state.ai.activeHistoryId === entry.id) {
        startAiProgressUi(startedAt, `步驟 2/3：已送出至 ${model}，等待 AI 分析回覆...`, 55);
      }

      const [aiPlan] = await Promise.all([callAiApi(q, allowClarify), dbPromise]);

      if (allowClarify && aiPlan.needsClarification && Array.isArray(aiPlan.clarifyingQuestions) && aiPlan.clarifyingQuestions.length > 0) {
        entry.status = "clarify";
        entry.clinicalSummary = aiPlan.clinicalSummary || "為提供更精準的健保支付標準與 ICD 編碼，請補充以下關鍵資訊：";
        entry.clarifyingQuestions = aiPlan.clarifyingQuestions;
        saveAiHistory();
        renderAiHistory();
        if (state.ai.activeHistoryId === entry.id) {
          stopAiProgressTimer();
          renderAiResult(entry);
        }
        showToast("AI 需要您補充幾個必要條件");
        return;
      }

      if (state.ai.activeHistoryId === entry.id) {
        startAiProgressUi(startedAt, "步驟 3/3：正在比對健保支付標準與 ICD 資料庫...", 88);
      }

      entry.pcsHits = matchLocalIcdPcs(aiPlan);
      entry.nhiHits = matchLocalNhi(aiPlan, q, entry.pcsHits);
      entry.cmHits = matchLocalIcdCm(aiPlan);
      entry.clinicalSummary = aiPlan.clinicalSummary || "";
      entry.whyListed = aiPlan.whyListed || {};
      entry.nextCriteriaAndProgression = aiPlan.nextCriteriaAndProgression || [];
      entry.clarifyingQuestions = [];
      entry.status = "done";
      entry.waitingResume = false;
      entry.retryCount = 0;

      saveAiHistory();
      renderAiHistory();
      if (state.ai.activeHistoryId === entry.id) {
        stopAiProgressTimer();
        renderAiResult(entry);
      }
      showToast(`AI 查詢完成：「${q.slice(0, 14)}${q.length > 14 ? "…" : ""}」`);
    } catch (err) {
      const msg = err?.message || "未知錯誤";
      const isNetworkAbort = /failed to fetch|load failed|networkerror|network request failed|abort/i.test(msg);
      const retries = Number(entry.retryCount || 0);

      // Mobile browsers often suspend/abort fetch when switching to another app.
      // Automatically queue for seamless resume as soon as the user returns to this tab.
      if (isNetworkAbort && retries < 2) {
        entry.status = "pending";
        entry.waitingResume = true;
        entry.retryCount = retries + 1;
        entry.allowClarifyOnResume = allowClarify;
        saveAiHistory();
        renderAiHistory();
        if (document.visibilityState === "visible") {
          setTimeout(() => {
            if (entry.waitingResume) {
              entry.waitingResume = false;
              runAiSearch(entry.query, { existingEntry: entry, allowClarify: entry.allowClarifyOnResume });
            }
          }, 900);
        }
        return;
      }

      entry.status = "error";
      entry.waitingResume = false;
      entry.errorMessage = isNetworkAbort ? "切換 App 導致瀏覽器中斷連線，請點下方「重新查詢」繼續。" : msg;
      saveAiHistory();
      renderAiHistory();
      if (state.ai.activeHistoryId === entry.id) {
        stopAiProgressTimer();
        renderAiResult(entry);
      }
      showToast(`AI 查詢失敗：${entry.errorMessage.slice(0, 40)}`);
    }
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    const toResume = state.ai.history.find((h) => h.waitingResume && h.status === "pending");
    if (toResume) {
      toResume.waitingResume = false;
      showToast("回到畫面，自動續傳先前中斷的 AI 查詢...");
      runAiSearch(toResume.query, { existingEntry: toResume, allowClarify: toResume.allowClarifyOnResume });
    }
  });

  function scrollToAiSection(target) {
    if (target === "history") {
      const historyPanel = document.querySelector(".ai-history-panel");
      if (historyPanel) {
        historyPanel.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      return;
    }
    if (target === "explain") {
      const explainEl = document.getElementById("aiExplainSection");
      if (explainEl) {
        explainEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      return;
    }
    if (target === "chat") {
      const chatEl = document.getElementById("aiChatSection");
      if (chatEl) {
        chatEl.scrollIntoView({ behavior: "smooth", block: "start" });
        const inputEl = document.getElementById("aiFollowUpInput");
        if (inputEl) {
          setTimeout(() => inputEl.focus({ preventScroll: true }), 350);
        }
      }
    }
  }

  function updateAiFloatingBar() {
    if (!el.aiFloatingQuickBar) return;
    const isAiMode = state.mode === "ai";
    const hasResultVisible = el.aiResultsContent && !el.aiResultsContent.classList.contains("hidden");
    const hasExplainOrChat = Boolean(document.getElementById("aiExplainSection") || document.getElementById("aiChatSection"));
    const scrolledDown = window.scrollY > 220;
    const shouldShow = isAiMode && hasResultVisible && hasExplainOrChat && scrolledDown;
    el.aiFloatingQuickBar.classList.toggle("hidden", !shouldShow);
  }

  function renderAiHistory() {
    const list = state.ai.history;
    if (!list.length) {
      el.aiHistoryList.innerHTML = `<p class="ai-empty-hint">尚無 AI 查詢紀錄</p>`;
      return;
    }
    el.aiHistoryList.innerHTML = list
      .map((h) => {
        let statusTag = "";
        let metaText = `${escapeHtml(h.timestamp)} · 健保${(h.nhiHits || []).length} / 診斷${(h.cmHits || []).length} / 處置${(h.pcsHits || []).length}`;
        const isDone = !h.status || h.status === "done";
        if (h.status === "pending") {
          statusTag = `<span class="ai-status-pill pending">查詢中</span>`;
          metaText = `${escapeHtml(h.timestamp)} · 背景處理中...`;
        } else if (h.status === "clarify") {
          statusTag = `<span class="ai-status-pill clarify">待補充</span>`;
          metaText = `${escapeHtml(h.timestamp)} · AI 反問 ${(h.clarifyingQuestions || []).length} 個問題`;
        } else if (h.status === "error") {
          statusTag = `<span class="ai-status-pill error">失敗</span>`;
          metaText = `${escapeHtml(h.timestamp)} · 點擊可重試`;
        }
        const actionsHtml = isDone
          ? `<div class="ai-history-actions">
              <button type="button" class="ai-history-action-btn" data-hist-action="explain" data-hist-id="${escapeHtml(h.id)}">顯示判斷原因</button>
              <button type="button" class="ai-history-action-btn primary" data-hist-action="chat" data-hist-id="${escapeHtml(h.id)}">繼續對話</button>
            </div>`
          : "";
        return `
      <div class="ai-history-item ${h.id === state.ai.activeHistoryId ? "active" : ""}" data-hist-id="${escapeHtml(h.id)}">
        <button type="button" class="ai-history-del" data-del-hist="${escapeHtml(h.id)}" title="刪除此筆紀錄" aria-label="刪除">✕</button>
        <div class="ai-history-query">${statusTag}${escapeHtml(h.query)}</div>
        <div class="ai-history-meta">${metaText}</div>
        ${actionsHtml}
      </div>
    `;
      })
      .join("");
  }

  function renderAiResult(entry) {
    if (!entry) return;
    stopAiProgressTimer();

    if (entry.status === "pending") {
      startAiProgressUi(entry.startedAt || Date.now(), `背景查詢中（${entry.model}），等待 AI 回覆...`, 60);
      return;
    }

    el.aiEmptyState.classList.add("hidden");
    el.aiLoadingState.classList.add("hidden");
    el.aiResultsContent.classList.remove("hidden");

    if (entry.status === "error") {
      el.aiResultsContent.innerHTML = `
        <div class="state-card">
          <h2 style="color:var(--rose)">AI 查詢失敗</h2>
          <p>${escapeHtml(entry.errorMessage || "連線逾時或模型回傳異常")}</p>
          <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
            <button type="button" class="btn btn-primary" data-retry-hist="${escapeHtml(entry.id)}">重新查詢</button>
            <button type="button" class="btn btn-secondary" data-del-current-hist="${escapeHtml(entry.id)}">刪除此筆紀錄</button>
          </div>
        </div>
      `;
      return;
    }

    if (entry.status === "clarify") {
      const qs = (entry.clarifyingQuestions || []).map((q) => `<li>${escapeHtml(q)}</li>`).join("");
      el.aiResultsContent.innerHTML = `
        <div class="ai-clarify-card">
          <div class="label-row" style="margin-bottom:8px">
            <h3>AI 需要補充以下資訊以精準判斷（${escapeHtml(entry.model)}）</h3>
            <button type="button" class="btn btn-ghost btn-sm" data-del-current-hist="${escapeHtml(entry.id)}" style="color:var(--rose)">刪除此筆</button>
          </div>
          <p style="margin:0 0 8px;font-size:0.86rem;color:var(--text-secondary)">${escapeHtml(entry.clinicalSummary || "")}</p>
          <ol class="ai-clarify-list">${qs}</ol>
          <div class="ai-chat-form">
            <input type="text" id="aiClarifyAnswerInput" class="text-input" placeholder="請輸入補充說明（例如：住院手術、腹腔鏡微創、初次診斷...）" autocomplete="off" />
            <button type="button" class="btn btn-primary" data-submit-clarify="${escapeHtml(entry.id)}">送出補充並查詢</button>
            <button type="button" class="btn btn-secondary" data-skip-clarify="${escapeHtml(entry.id)}">略過反問直接查</button>
          </div>
        </div>
      `;
      return;
    }

    const nhiHtml = entry.nhiHits.length
      ? entry.nhiHits
          .map(
            (it) => `
          <article class="item-card" data-ai-nhi="${escapeHtml(it.c)}">
            <div class="card-top">
              <div class="card-top-left">
                <span class="code-badge">${escapeHtml(it.c)}</span>
                <button type="button" class="icd-code-btn" data-copy-ai="${escapeHtml(it.c)}">複製</button>
              </div>
              <div><span class="points-val">${formatPoints(it.p)}</span><span class="points-unit">點</span></div>
            </div>
            <div class="card-zh">${escapeHtml(it.zh)}</div>
            ${it.en ? `<div class="card-en">${escapeHtml(it.en)}</div>` : ""}
            <div class="card-section-row"><span class="section-tag">${escapeHtml(it.sec)}</span></div>
          </article>
        `
          )
          .join("")
      : `<p class="ai-empty-hint">未比對到直接符合的健保支付標準項目</p>`;

    const cmHtml = entry.cmHits.length
      ? entry.cmHits
          .map(
            (r) => `
          <article class="icd-card">
            <div class="icd-cols">
              <div class="icd-col">
                <div class="icd-col-header"><span class="icd-ver-label">ICD-9-CM</span><button type="button" class="icd-code-btn icd9" data-copy-ai="${escapeHtml(r.i9)}">${escapeHtml(r.i9)}</button></div>
                <div class="icd-zh">${escapeHtml(r.zh9 || "(無中文)")}</div>
                <div class="icd-en">${escapeHtml(r.en9 || "")}</div>
              </div>
              <div class="icd-col">
                <div class="icd-col-header"><span class="icd-ver-label">ICD-10-CM</span><button type="button" class="icd-code-btn icd10" data-copy-ai="${escapeHtml(r.i10)}">${escapeHtml(r.i10)}</button></div>
                <div class="icd-zh">${escapeHtml(r.zh10 || "(無中文)")}</div>
                <div class="icd-en">${escapeHtml(r.en10 || "")}</div>
              </div>
              <div class="icd-col">
                <div class="icd-col-header"><span class="icd-ver-label">ICD-11 (WHO)</span></div>
                ${
                  r.i11 && r.i11.length
                    ? r.i11
                        .map(
                          (x) =>
                            `<div class="icd-11-item"><div><button type="button" class="icd-code-btn icd11" data-copy-ai="${escapeHtml(x.code)}">${escapeHtml(x.code)}</button></div><div class="icd-en">${escapeHtml(x.title)}</div></div>`
                        )
                        .join("")
                    : `<div class="icd-en">尚無直接 ICD-11 對照</div>`
                }
              </div>
            </div>
          </article>
        `
          )
          .join("")
      : `<p class="ai-empty-hint">未比對到直接符合的 ICD 診斷編碼</p>`;

    const pcsHtml = entry.pcsHits.length
      ? entry.pcsHits
          .map(
            (r) => `
          <article class="icd-card">
            <div class="icd-cols icd-cols-2">
              <div class="icd-col">
                <div class="icd-col-header"><span class="icd-ver-label">ICD-10-PCS</span><button type="button" class="icd-code-btn icd10" data-copy-ai="${escapeHtml(r.pcs)}">${escapeHtml(r.pcs)}</button></div>
                <div class="icd-zh">${escapeHtml(r.zhPcs || "(無中文)")}</div>
                <div class="icd-en">${escapeHtml(r.enPcs || "")}</div>
              </div>
              <div class="icd-col">
                <div class="icd-col-header"><span class="icd-ver-label">ICD-9 處置</span><button type="button" class="icd-code-btn icd9" data-copy-ai="${escapeHtml(r.i9)}">${escapeHtml(r.i9)}</button></div>
                <div class="icd-zh">${escapeHtml(r.zh9 || "(無中文)")}</div>
                <div class="icd-en">${escapeHtml(r.en9 || "")}</div>
              </div>
            </div>
            ${
              r.nhi && r.nhi.length
                ? `<div class="nhi-link-list"><span>對應健保醫令：</span>${r.nhi
                    .map((c) => `<button type="button" class="nhi-jump-btn" data-jump-nhi="${escapeHtml(c)}">${escapeHtml(c)}</button>`)
                    .join("")}</div>`
                : ""
            }
          </article>
        `
          )
          .join("")
      : `<p class="ai-empty-hint">未比對到直接符合的 ICD-10-PCS 處置編碼</p>`;

    const why = entry.whyListed || {};
    const prog = entry.nextCriteriaAndProgression;
    const progHtml = Array.isArray(prog) && prog.length
      ? `<ul class="ai-explain-list">${prog.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
      : `<p>${escapeHtml(typeof prog === "string" && prog ? prog : "請視臨床檢查、病理報告及實際手術/處置紀錄，依客觀事實評估後續病程與申報歸屬。")}</p>`;

    const followUps = Array.isArray(entry.followUps) ? entry.followUps : [];
    const chatHtml = followUps.length
      ? followUps
          .map(
            (m) => `
          <div class="ai-chat-msg ${m.role === "user" ? "user" : "assistant"}">
            <span class="ai-chat-role">${m.role === "user" ? "您的提問" : "AI 編碼與要件顧問"}</span>
            ${escapeHtml(m.content)}
          </div>
        `
          )
          .join("")
      : `<p class="ai-empty-hint">可於下方繼續追問：例如「此術式是否符合健保 2-2-7 手術？」、「病歷需具備哪些客觀佐證？」或「若後續併發感染如何編碼？」</p>`;

    el.aiResultsContent.innerHTML = `
      <div class="ai-summary-card">
        <div class="label-row" style="margin-bottom:8px">
          <h3 style="margin:0">AI 臨床與申報判讀摘要（${escapeHtml(entry.model)}）</h3>
          <button type="button" class="btn btn-ghost btn-sm" data-del-current-hist="${escapeHtml(entry.id)}" style="color:var(--rose)">刪除此筆紀錄</button>
        </div>
        <p>${escapeHtml(entry.clinicalSummary || entry.query)}</p>
      </div>
      <div class="ai-group-title"><span>健保支付標準候選</span><span class="ai-group-count">${entry.nhiHits.length} 筆</span></div>
      <div class="icd-grid">${nhiHtml}</div>
      <div class="ai-group-title"><span>ICD-9 / ICD-10 / ICD-11 診斷候選</span><span class="ai-group-count">${entry.cmHits.length} 筆</span></div>
      <div class="icd-grid">${cmHtml}</div>
      <div class="ai-group-title"><span>ICD-10-PCS 處置編碼候選</span><span class="ai-group-count">${entry.pcsHits.length} 筆</span></div>
      <div class="icd-grid">${pcsHtml}</div>

      <section id="aiExplainSection" class="ai-explain-card" aria-label="AI 選碼說明與可能發展">
        <h3>AI 編碼依據說明與後續要件／可能發展</h3>
        <div class="ai-integrity-banner">判讀原則：嚴格依據臨床事實給予正確診斷與處置編碼，客觀檢視健保部章節及保險理賠要件，絕不為迎合理賠而扭曲診斷。</div>
        <div class="ai-explain-grid">
          <div class="ai-explain-block">
            <h4>為何列出這些「健保支付標準」</h4>
            <p>${escapeHtml(why.nhi || "依據臨床處置與檢查項目關鍵字比對現行健保給付項目，供核對部章節（如 2-2-7 手術或 2-2-6 治療處置）與支付點數。")}</p>
          </div>
          <div class="ai-explain-block">
            <h4>為何列出這些「ICD 診斷編碼」</h4>
            <p>${escapeHtml(why.icd || "依據真實臨床病況比對對應的 ICD-10-CM、ICD-9-CM 與 WHO ICD-11 診斷分類。")}</p>
          </div>
          <div class="ai-explain-block">
            <h4>為何列出這些「ICD-10-PCS 處置編碼」</h4>
            <p>${escapeHtml(why.pcs || "依據實際施作術式部位、手術途徑（開放/內視鏡/經皮）與處置目的比對對應的 PCS 處置編碼。")}</p>
          </div>
          <div class="ai-explain-block">
            <h4>疾病、處置、診斷後續要件與可能發展</h4>
            ${progHtml}
          </div>
        </div>
      </section>

      <section id="aiChatSection" class="ai-chat-card" aria-label="繼續與 AI 對話">
        <h3>繼續對話（深入確認診斷、處置要件與理賠規範）</h3>
        <div class="ai-chat-messages" id="aiChatMessages">${chatHtml}</div>
        <div class="ai-chat-form">
          <input type="text" id="aiFollowUpInput" class="text-input" placeholder="針對本次結果繼續提問（例如：若屬門診處置而非住院手術，2-2-7 與病歷紀錄要注意什麼？）" autocomplete="off" />
          <button type="button" id="aiFollowUpSendBtn" class="btn btn-primary" data-followup-id="${escapeHtml(entry.id)}">送出追問</button>
        </div>
      </section>
    `;

    const chatBox = document.getElementById("aiChatMessages");
    if (chatBox) chatBox.scrollTop = chatBox.scrollHeight;
    updateAiFloatingBar();
  }

  function exportAllSettings() {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      preferences: {
        theme: state.theme,
        fontSize: state.fontSize,
      },
      favorites: [...state.favorites],
      aiConfig: state.ai.config,
      aiHistory: state.ai.history,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `JianBaoSearch_設定備份_${TODAY_STR}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("已匯出完整設定與歷史備份");
  }

  function importAllSettings(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result || "{}"));
        if (data.preferences) {
          if (data.preferences.theme) applyTheme(data.preferences.theme);
          if (data.preferences.fontSize) applyFontSize(data.preferences.fontSize);
        }
        if (Array.isArray(data.favorites)) {
          state.favorites = new Set(data.favorites);
          saveFavorites();
          renderResults();
        }
        if (data.aiConfig && data.aiConfig.providers) {
          state.ai.config = data.aiConfig;
          saveAiConfig();
          populateSettingsForm();
        }
        if (Array.isArray(data.aiHistory)) {
          state.ai.history = data.aiHistory;
          saveAiHistory();
          renderAiHistory();
        }
        showToast("已成功匯入設定、API Key、星號收藏與 AI 歷史紀錄");
      } catch (err) {
        showToast(`匯入失敗：JSON 格式錯誤 (${err.message})`);
      }
    };
    reader.readAsText(file, "utf-8");
  }

  function bindAiAndSettingsEvents() {
    el.aiHistoryHeaderBtn.addEventListener("click", () => switchMode("ai"));

    const openSettings = () => {
      populateSettingsForm();
      el.settingsModal.classList.remove("hidden");
    };
    el.settingsModalBtn.addEventListener("click", openSettings);
    el.aiQuickConfigBtn.addEventListener("click", openSettings);

    // Quick-switch recent models when tapping the current model badge
    const closeModelPopover = () => {
      if (!el.aiRecentModelsMenu) return;
      el.aiRecentModelsMenu.classList.add("hidden");
      el.aiCurrentModelBadge.setAttribute("aria-expanded", "false");
    };

    el.aiCurrentModelBadge.addEventListener("click", (e) => {
      e.stopPropagation();
      const willOpen = el.aiRecentModelsMenu.classList.contains("hidden");
      if (willOpen) {
        renderRecentModelsMenu();
        el.aiRecentModelsMenu.classList.remove("hidden");
        el.aiCurrentModelBadge.setAttribute("aria-expanded", "true");
      } else {
        closeModelPopover();
      }
    });

    el.aiRecentModelsMenu.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-quick-provider]");
      if (!btn) return;
      const p = btn.dataset.quickProvider;
      const m = btn.dataset.quickModel;
      state.ai.config.activeProvider = p;
      if (!state.ai.config.providers[p]) state.ai.config.providers[p] = { apiKey: "", model: m, baseUrl: "" };
      state.ai.config.providers[p].model = m;
      recordRecentModel(p, m);
      saveAiConfig();
      closeModelPopover();
      showToast(`已切換模型：${m}`);
    });

    document.addEventListener("click", (e) => {
      if (!el.aiRecentModelsMenu.classList.contains("hidden") && !e.target.closest(".model-switch-wrap")) {
        closeModelPopover();
      }
    });

    el.closeSettingsBtn.addEventListener("click", () => el.settingsModal.classList.add("hidden"));
    el.settingsModal.addEventListener("click", (e) => {
      if (e.target === el.settingsModal) el.settingsModal.classList.add("hidden");
    });

    el.aiProviderSelect.addEventListener("change", () => {
      populateSettingsForm(el.aiProviderSelect.value);
    });

    el.aiModelSelect.addEventListener("change", () => {
      el.aiCustomModelInput.value = el.aiModelSelect.value;
    });

    el.toggleApiKeyVisBtn.addEventListener("click", () => {
      const isPwd = el.aiApiKeyInput.type === "password";
      el.aiApiKeyInput.type = isPwd ? "text" : "password";
      el.toggleApiKeyVisBtn.textContent = isPwd ? "隱藏" : "顯示";
    });

    el.fetchFreeModelsBtn.addEventListener("click", fetchFreeModels);

    el.saveAiSettingsBtn.addEventListener("click", () => {
      const p = el.aiProviderSelect.value;
      const key = el.aiApiKeyInput.value.trim();
      const model = el.aiCustomModelInput.value.trim() || el.aiModelSelect.value;
      const baseUrl = el.aiBaseUrlInput.value.trim();

      state.ai.config.activeProvider = p;
      state.ai.config.providers[p] = { apiKey: key, model, baseUrl };
      if (model) recordRecentModel(p, model);
      saveAiConfig();
      el.settingsModal.classList.add("hidden");
      showToast(`已儲存 ${p} 設定 (${model || "無模型"})`);
    });

    el.exportSettingsBtn.addEventListener("click", exportAllSettings);
    el.importSettingsInput.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      importAllSettings(file);
      e.target.value = "";
    });

    // Main screen AI checkbox
    el.aiSearchCheckbox.addEventListener("change", () => {
      state.ai.enabled = el.aiSearchCheckbox.checked;
      el.aiSearchSubmitBtn.classList.toggle("hidden", !state.ai.enabled);
      if (state.ai.enabled) {
        el.searchInput.placeholder = "【AI 搜尋模式】輸入自然語言，例如：急性膽囊炎做腹腔鏡切除術，按 Enter 跨庫查詢";
      } else {
        el.searchInput.placeholder = "輸入代碼、中文/英文名稱、部章節或備註關鍵字（多關鍵字請用空格分隔，例如：超音波 腹部、2-2-7）";
      }
    });

    el.searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && state.ai.enabled) {
        e.preventDefault();
        runAiSearch(el.searchInput.value);
      }
    });

    el.aiSearchSubmitBtn.addEventListener("click", () => {
      runAiSearch(el.searchInput.value);
    });

    // AI dedicated page events
    el.aiRunBtn.addEventListener("click", () => runAiSearch(el.aiPromptInput.value));
    el.aiPromptInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        runAiSearch(el.aiPromptInput.value);
      }
    });

    document.querySelectorAll(".ai-example-chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        el.aiPromptInput.value = btn.dataset.aiExample;
        runAiSearch(btn.dataset.aiExample);
      });
    });

    el.aiClearHistoryBtn.addEventListener("click", () => {
      state.ai.history = [];
      state.ai.activeHistoryId = null;
      saveAiHistory();
      renderAiHistory();
      el.aiResultsContent.classList.add("hidden");
      el.aiEmptyState.classList.remove("hidden");
      updateAiFloatingBar();
      showToast("已清空 AI 查詢歷史");
    });

    const deleteAiHistoryById = (id) => {
      state.ai.history = state.ai.history.filter((h) => h.id !== id);
      if (state.ai.activeHistoryId === id) {
        state.ai.activeHistoryId = null;
        el.aiResultsContent.classList.add("hidden");
        el.aiEmptyState.classList.remove("hidden");
        updateAiFloatingBar();
      }
      saveAiHistory();
      renderAiHistory();
      showToast("已刪除此筆 AI 查詢紀錄");
    };

    el.aiHistoryList.addEventListener("click", (e) => {
      const delBtn = e.target.closest("[data-del-hist]");
      if (delBtn) {
        e.stopPropagation();
        deleteAiHistoryById(delBtn.dataset.delHist);
        return;
      }
      const actionBtn = e.target.closest("[data-hist-action]");
      if (actionBtn) {
        e.stopPropagation();
        const action = actionBtn.dataset.histAction;
        const histId = actionBtn.dataset.histId;
        const entry = state.ai.history.find((h) => h.id === histId);
        if (entry) {
          state.ai.activeHistoryId = entry.id;
          el.aiPromptInput.value = entry.query;
          renderAiHistory();
          renderAiResult(entry);
          requestAnimationFrame(() => scrollToAiSection(action));
        }
        return;
      }
      const itemEl = e.target.closest("[data-hist-id]");
      if (itemEl) {
        const entry = state.ai.history.find((h) => h.id === itemEl.dataset.histId);
        if (entry) {
          state.ai.activeHistoryId = entry.id;
          el.aiPromptInput.value = entry.query;
          renderAiHistory();
          renderAiResult(entry);
        }
      }
    });

    const handleFollowUpSubmit = async (entryId) => {
      const entry = state.ai.history.find((h) => h.id === entryId);
      const inputEl = document.getElementById("aiFollowUpInput");
      const sendBtn = document.getElementById("aiFollowUpSendBtn");
      if (!entry || !inputEl) return;

      const q = inputEl.value.trim();
      if (!q) {
        showToast("請輸入追問內容");
        return;
      }

      if (!Array.isArray(entry.followUps)) entry.followUps = [];
      entry.followUps.push({ role: "user", content: q });
      inputEl.value = "";
      if (sendBtn) {
        sendBtn.disabled = true;
        sendBtn.textContent = "思考中...";
      }
      renderAiResult(entry);

      const nextSendBtn = document.getElementById("aiFollowUpSendBtn");
      const nextInputEl = document.getElementById("aiFollowUpInput");
      if (nextSendBtn) {
        nextSendBtn.disabled = true;
        nextSendBtn.textContent = "思考中...";
      }
      if (nextInputEl) nextInputEl.disabled = true;

      try {
        const reply = await callAiFollowUp(entry, q);
        entry.followUps.push({ role: "assistant", content: reply.trim() });
        saveAiHistory();
        renderAiResult(entry);
      } catch (err) {
        entry.followUps.push({ role: "assistant", content: `追問失敗：${err.message}` });
        saveAiHistory();
        renderAiResult(entry);
      }
    };

    const handleClarifySubmit = (entryId) => {
      const entry = state.ai.history.find((h) => h.id === entryId);
      const inputEl = document.getElementById("aiClarifyAnswerInput");
      if (!entry || !inputEl) return;
      const ans = inputEl.value.trim();
      if (!ans) {
        showToast("請輸入補充條件，或點選「略過反問直接查」");
        return;
      }
      const refinedQuery = `${entry.query}（補充條件：${ans}）`;
      runAiSearch(refinedQuery, { existingEntry: entry, allowClarify: false });
    };

    el.aiResultsContent.addEventListener("click", (e) => {
      const retryBtn = e.target.closest("[data-retry-hist]");
      if (retryBtn) {
        e.stopPropagation();
        const entry = state.ai.history.find((h) => h.id === retryBtn.dataset.retryHist);
        if (entry) runAiSearch(entry.query, { existingEntry: entry });
        return;
      }
      const submitClarifyBtn = e.target.closest("[data-submit-clarify]");
      if (submitClarifyBtn) {
        e.stopPropagation();
        handleClarifySubmit(submitClarifyBtn.dataset.submitClarify);
        return;
      }
      const skipClarifyBtn = e.target.closest("[data-skip-clarify]");
      if (skipClarifyBtn) {
        e.stopPropagation();
        const entry = state.ai.history.find((h) => h.id === skipClarifyBtn.dataset.skipClarify);
        if (entry) runAiSearch(entry.query, { existingEntry: entry, allowClarify: false });
        return;
      }
      const followBtn = e.target.closest("[data-followup-id]");
      if (followBtn) {
        e.stopPropagation();
        handleFollowUpSubmit(followBtn.dataset.followupId);
        return;
      }
      const delCurrentBtn = e.target.closest("[data-del-current-hist]");
      if (delCurrentBtn) {
        e.stopPropagation();
        deleteAiHistoryById(delCurrentBtn.dataset.delCurrentHist);
        return;
      }
      const copyBtn = e.target.closest("[data-copy-ai]");
      if (copyBtn) {
        e.stopPropagation();
        copyText(copyBtn.dataset.copyAi, `代碼 ${copyBtn.dataset.copyAi}`);
        return;
      }
      const jumpBtn = e.target.closest("[data-jump-nhi]");
      if (jumpBtn) {
        e.stopPropagation();
        const code = (jumpBtn.dataset.jumpNhi || "").trim();
        const matched = state.allItems.find((x) => x.c === code || x.c.toUpperCase() === code.toUpperCase());
        if (matched) {
          openDetail(matched.c);
        } else {
          showToast(`現行健保支付標準中查無醫令 ${code}（可能已停用或更名）`);
        }
        return;
      }
      const nhiCard = e.target.closest("[data-ai-nhi]");
      if (nhiCard) {
        openDetail(nhiCard.dataset.aiNhi);
      }
    });

    if (el.aiQuickHistoryBtn) {
      el.aiQuickHistoryBtn.addEventListener("click", () => scrollToAiSection("history"));
    }
    if (el.aiQuickExplainBtn) {
      el.aiQuickExplainBtn.addEventListener("click", () => scrollToAiSection("explain"));
    }
    if (el.aiQuickChatBtn) {
      el.aiQuickChatBtn.addEventListener("click", () => scrollToAiSection("chat"));
    }

    window.addEventListener("scroll", updateAiFloatingBar, { passive: true });

    el.aiResultsContent.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && e.target && e.target.id === "aiFollowUpInput") {
        e.preventDefault();
        const sendBtn = document.getElementById("aiFollowUpSendBtn");
        if (sendBtn && sendBtn.dataset.followupId) {
          handleFollowUpSubmit(sendBtn.dataset.followupId);
        }
      } else if (e.key === "Enter" && e.target && e.target.id === "aiClarifyAnswerInput") {
        e.preventDefault();
        const submitBtn = el.aiResultsContent.querySelector("[data-submit-clarify]");
        if (submitBtn && submitBtn.dataset.submitClarify) {
          handleClarifySubmit(submitBtn.dataset.submitClarify);
        }
      }
    });
  }

  function registerServiceWorker() {
    if ("serviceWorker" in navigator && window.location.protocol.startsWith("http")) {
      navigator.serviceWorker.register("sw.js").catch(() => {
        // ignore SW registration failure in restricted contexts
      });
    }
  }

  async function init() {
    loadPreferences();
    loadFavorites();
    loadAiState();
    bindEvents();
    registerServiceWorker();

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
