(() => {
  "use strict";

  const PAGE_SIZE = 50;
  const FAV_STORAGE_KEY = "jianbaosearch_favorites_v1";

  const state = {
    allItems: [],
    filteredItems: [],
    meta: null,
    query: "",
    tier: "all",
    status: "active",
    sort: "relevance",
    favOnly: false,
    favorites: new Set(),
    page: 1,
    activeItem: null,
  };

  // DOM elements
  const el = {
    searchInput: document.getElementById("searchInput"),
    clearSearchBtn: document.getElementById("clearSearchBtn"),
    tierFilters: document.getElementById("tierFilters"),
    favFilterBtn: document.getElementById("favFilterBtn"),
    favCountBadge: document.getElementById("favCountBadge"),
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
    const status = state.status;
    const favOnly = state.favOnly;

    const matched = [];

    for (let i = 0; i < state.allItems.length; i++) {
      const item = state.allItems[i];

      if (favOnly && !state.favorites.has(item.c)) continue;
      if (tier !== "all" && getItemTier(item.c) !== tier) continue;

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
    const headers = ["診療項目代碼", "健保支付點數", "生效起日", "生效迄日", "英文項目名稱", "中文項目名稱", "備註"];
    const escapeCsv = (val) => `"${String(val ?? "").replace(/"/g, '""')}"`;
    const lines = [
      headers.map(escapeCsv).join(","),
      ...state.filteredItems.map((item) =>
        [item.c, item.p, item.s, item.e, item.en, item.zh, item.n].map(escapeCsv).join(",")
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
      state.status = "active";
      state.favOnly = false;
      state.sort = "relevance";
      el.statusFilter.value = "active";
      el.sortSelect.value = "relevance";
      el.favFilterBtn.classList.remove("active");
      el.favFilterBtn.setAttribute("aria-pressed", "false");
      el.tierFilters.querySelectorAll(".chip").forEach((c) => {
        c.classList.toggle("active", c.dataset.tier === "all");
      });
      applyFilters();
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
      // Precompute lowercase search string for instant filtering
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        it._search = `${it.c}\t${it.zh}\t${it.en}\t${it.n}`.toLowerCase();
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
