(() => {
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  let items = [];
  let search = "";
  let activePage = "home";
  let activeItemName = "";
  let activeEntry = null;
  let activeSubpageId = "";
  let unlockedBadges = new Set();
  let unmatchedUnlockIds = [];
  let unlockedItems = new Set();
  let badgeCatalog = [...(window.INVENTORY_BADGE_CATALOG || [])];
  let amethystBadgeIds = new Set();
  let wikiPages = {};
  const localDraft = ["localhost", "127.0.0.1", "::1"].includes(location.hostname);
  const wikiPagesKey = "inventoryWikiItemPagesV1";
  const questGuideKey = "inventoryWikiQuestGuideV1";
  const wikiDraftKey = "inventoryWikiDraftV1";
  let wikiDocument = { version: 1, sections: [], itemPages: {}, sectionPages: {}, sectionIcons: {}, questGuide: "" };
  const progressKeys = new Set(["inventoryBadgeCatalogV1", "inventoryPrivateBadgeCatalogV1", "inventoryBadgesUnlockedV1", "ownedItemsV2"]);

  function readJson(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value ?? fallback;
    } catch { return fallback; }
  }

  function normalizeWikiDocument(value) {
    if (!value || typeof value !== "object" || !Array.isArray(value.sections)) return { version: 1, sections: [], itemPages: {}, sectionPages: {}, sectionIcons: {}, questGuide: "" };
    const sections = value.sections.filter(section => section && typeof section.id === "string" && typeof section.title === "string" && Array.isArray(section.pages)).map(section => ({
      id: section.id,
      title: section.title.slice(0, 80),
      pages: section.pages.filter(page => page && typeof page.id === "string" && typeof page.title === "string" && typeof page.content === "string").map(page => ({ id: page.id, title: page.title.slice(0, 90), content: page.content }))
    }));
    return {
      version: 1,
      sections,
      itemPages: value.itemPages && typeof value.itemPages === "object" && !Array.isArray(value.itemPages) ? value.itemPages : {},
      sectionPages: value.sectionPages && typeof value.sectionPages === "object" && !Array.isArray(value.sectionPages) ? value.sectionPages : {},
      sectionIcons: value.sectionIcons && typeof value.sectionIcons === "object" && !Array.isArray(value.sectionIcons) ? value.sectionIcons : {},
      questGuide: typeof value.questGuide === "string" ? value.questGuide : ""
    };
  }

  function loadWikiDocument() {
    const local = localDraft ? readJson(wikiDraftKey, null) : null;
    wikiDocument = normalizeWikiDocument(local || window.INVENTORY_WIKI_CONTENT || {});
    if (localDraft) {
      const legacyPages = readJson(wikiPagesKey, null);
      const legacyQuest = readJson(questGuideKey, null);
      if (legacyPages && Object.keys(wikiDocument.itemPages).length === 0) wikiDocument.itemPages = legacyPages;
      if (typeof legacyQuest === "string" && !wikiDocument.questGuide) wikiDocument.questGuide = legacyQuest;
    }
  }

  function saveWikiDraft() {
    if (!localDraft) return false;
    try {
      localStorage.setItem(wikiDraftKey, JSON.stringify(wikiDocument));
      return true;
    } catch { return false; }
  }

  const editingWikiPages = new Set();
  const unsavedWikiPages = new Set();

  function renderCustomSections() {
    document.querySelectorAll("[data-custom-wiki-section]").forEach(node => node.remove());
    document.querySelectorAll("[data-custom-wiki-nav]").forEach(node => node.remove());
    const nav = $("#wikiNav"), anchor = $("#addSectionSidebar");
    for (const [sectionIndex, section] of wikiDocument.sections.entries()) {
      const button = document.createElement("button");
      button.className = `nav-button ${activePage === `custom:${section.id}` ? "active" : ""}`;
      button.dataset.section = `custom:${section.id}`; button.dataset.customWikiNav = "true"; button.dataset.sectionLabel = section.title;
      button.innerHTML = `${wikiDocument.sectionIcons?.[`custom:${section.id}`] ? `<img class="wiki-nav-icon" src="${esc(wikiDocument.sectionIcons[`custom:${section.id}`])}" alt="">` : ""}<span>${esc(section.title)}</span>`;
      nav.insertBefore(button, anchor);
      const view = document.createElement("section");
      view.className = `wiki-section ${activePage === `custom:${section.id}` ? "active" : ""}`;
      view.dataset.page = `custom:${section.id}`; view.dataset.customWikiSection = "true";
      const sectionTools = localDraft ? `<span class="article-edit-links"><button type="button" data-custom-edit-title="${esc(section.id)}">edit</button><button type="button" data-section-shift="${sectionIndex}:up" ${sectionIndex === 0 ? "disabled" : ""}>move up</button><button type="button" data-section-shift="${sectionIndex}:down" ${sectionIndex === wikiDocument.sections.length - 1 ? "disabled" : ""}>move down</button><button type="button" data-section-remove="${esc(section.id)}">remove section</button></span>` : "";
      const pages = section.pages.map((page,index) => {
        const editing = editingWikiPages.has(page.id);
        return `<article class="wiki-page-article"><h2>${esc(page.title || "untitled page")} ${localDraft ? `<span class="article-edit-links"><button type="button" data-edit-page="${esc(section.id)}:${esc(page.id)}">edit</button><button type="button" data-page-shift="${esc(section.id)}:${index}:up" ${index === 0 ? "disabled" : ""}>move up</button><button type="button" data-page-shift="${esc(section.id)}:${index}:down" ${index === section.pages.length - 1 ? "disabled" : ""}>move down</button><button type="button" data-page-remove="${esc(section.id)}:${esc(page.id)}">remove</button></span>` : ""}</h2><div class="wiki-prose custom-page-rendered" ${editing ? "hidden" : ""}>${renderMarkdown(page.content)}</div>${localDraft ? `<form class="wiki-editor inline-wiki-editor" data-custom-page-form="${esc(section.id)}:${esc(page.id)}" ${editing ? "" : "hidden"}><label>page title<input name="title" maxlength="90" required value="${esc(page.title)}"></label><label>page content<textarea name="content" rows="14">${esc(page.content)}</textarea></label><div class="editor-actions"><button type="button" data-page-images="${esc(page.id)}">choose image files</button><input id="customWikiImages-${esc(page.id)}" type="file" accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml" multiple hidden><button type="button" data-page-preview="${esc(page.id)}">preview</button><button type="submit">save page</button><button type="button" data-cancel-page="${esc(page.id)}">cancel</button></div><div class="wiki-prose editor-preview" data-page-preview-box="${esc(page.id)}" hidden></div><p class="markdown-help">markdown supports headings, lists, code blocks, images, and item, badge, and rarity preview links</p></form>` : ""}</article>`;
      }).join("") || '<p class="muted">this section has no pages yet</p>';
      view.innerHTML = `<div class="page-heading"><p class="eyebrow">wiki section</p><h1>${wikiDocument.sectionIcons?.[`custom:${section.id}`] ? `<img class="wiki-heading-icon" src="${esc(wikiDocument.sectionIcons[`custom:${section.id}`])}" alt="">` : ""}${esc(section.title)} ${sectionTools}${localDraft ? `<button type="button" class="section-icon-button" data-choose-section-icon="custom:${esc(section.id)}">${wikiDocument.sectionIcons?.[`custom:${section.id}`] ? "change icon" : "set icon"}</button><input type="file" accept="image/*" data-section-icon-input="custom:${esc(section.id)}" hidden>` : ""}</h1><div class="inline-title-editor" data-section-title-editor="${esc(section.id)}" hidden><input maxlength="80" value="${esc(section.title)}" aria-label="section title"><button type="button" data-save-section-title="${esc(section.id)}">save title</button><button type="button" data-cancel-section-title="${esc(section.id)}">cancel</button></div>${localDraft ? `<button type="button" class="article-edit-link" data-add-page="${esc(section.id)}">add page</button>` : ""}</div><div class="custom-wiki-pages">${pages}</div>`;
      $("#wikiContent").insertBefore(view, $("#emptySearch"));
    }
    renderBuiltinSectionIconControls();
  }

  function renderBuiltinSectionIconControls() {
    for (const button of document.querySelectorAll("#wikiNav .nav-button[data-section]:not([data-custom-wiki-nav])")) {
      const key = button.dataset.section;
      if (key === "addSectionSidebar") continue;
      button.dataset.sectionLabel ||= button.textContent.trim();
      const label = button.dataset.sectionLabel;
      const icon = wikiDocument.sectionIcons?.[key] || "";
      button.innerHTML = `${icon ? `<img class="wiki-nav-icon" src="${esc(icon)}" alt="">` : ""}<span>${esc(label)}</span>`;
      const page = [...document.querySelectorAll(".wiki-section")].find(section => section.dataset.page === key);
      const heading = page?.querySelector(".page-heading h1, .hero h1");
      if (!heading) continue;
      let image = heading.querySelector(":scope > .wiki-heading-icon");
      if (!image) { image = document.createElement("img"); image.className = "wiki-heading-icon"; image.alt = ""; heading.prepend(image); }
      image.hidden = !icon;
      if (icon) image.src = icon;
      if (localDraft && !heading.querySelector("[data-choose-section-icon]")) {
        const choose = document.createElement("button");
        choose.type = "button"; choose.className = "section-icon-button"; choose.dataset.chooseSectionIcon = key; choose.textContent = icon ? "change icon" : "set icon";
        const input = document.createElement("input"); input.type = "file"; input.accept = "image/*"; input.hidden = true; input.dataset.sectionIconInput = key;
        heading.append(choose, input);
      } else if (localDraft) {
        const choose = heading.querySelector("[data-choose-section-icon]"); if (choose) choose.textContent = icon ? "change icon" : "set icon";
      }
    }
  }

  const editingBuiltinPages = new Set();
  const unsavedBuiltinPages = new Set();

  function renderEntryPage(sectionKey, containerId) {
    const root = $(containerId);
    if (!root) return;
    const entry = activeEntry?.sectionKey === sectionKey ? activeEntry : null;
    const browse = $(`#${sectionKey}BrowseView`);
    if (browse) browse.hidden = Boolean(entry);
    root.hidden = !entry;
    if (!entry) return;
    const pageKey = `${sectionKey}/${entry.id}`;
    const extras = entry.details || "";
    const lockedSecret = sectionKey === "badges" && isSecretBadge(entry.data) && !unlockedBadges.has(entry.data.id);
    let summary = "";
    if (sectionKey === "badges") {
      const badge = entry.data;
      summary = `<p>${lockedSecret ? "description and unlock method hidden" : esc(badge.description || "no description")}</p>${lockedSecret ? "" : `<p><strong>obtain:</strong> ${esc(requirement(badge))}</p>`}`;
    }
    if (sectionKey === "events") summary = `<p>${esc(entry.data.items.join(", "))}</p>${entry.data.theme ? `<p>theme preset: ${esc(entry.data.theme)}${entry.data.themeColor ? ` · ${esc(entry.data.themeColor)}` : ""}</p>` : ""}`;
    if (sectionKey === "rarities") summary = `<p>${esc(entry.data)}</p>`;
    if (sectionKey === "currencies") summary = `<p>${esc(entry.data.description)}</p><img class="currency-article-image" src="${esc(entry.data.image)}" alt="">`;
    root.innerHTML = `<button type="button" class="back-to-items entry-back" data-close-entry="${sectionKey}">← ${sectionKey}</button><article class="entry-article"><p class="eyebrow">${sectionKey === "badges" ? (lockedSecret ? "secret badge" : "badge") : sectionKey === "events" ? "event" : sectionKey === "rarities" ? "arena rarity" : "account resource"}</p><h1>${esc(entry.title)}</h1>${extras}${summary}</article><section class="entry-pages"><h2>wiki pages</h2><div id="activeEntryWikiPages"></div></section>`;
    renderBuiltinWikiPages(pageKey, "#activeEntryWikiPages");
  }

  function openEntry(sectionKey, id) {
    if (sectionKey === "rarities") {
      const entry = rarityEntries().find(([name]) => name === id);
      if (!entry) return;
      activeEntry = { sectionKey, id, title: entry[0], data: entry[1] };
    } else if (sectionKey === "events") {
      const entry = (window.INVENTORY_EVENT_CATALOG || []).find(event => String(event.id || event.name) === id);
      if (!entry) return;
      const start = new Date(entry.start).getTime(), end = new Date(entry.end).getTime(), now = Date.now();
      activeEntry = { sectionKey, id, title: entry.name, data: entry, details: `<p class="event-date">${esc(new Date(entry.start).toLocaleString())} – ${esc(new Date(entry.end).toLocaleString())} · ${now < start ? "upcoming" : now <= end ? "live" : "ended"}</p>` };
    } else if (sectionKey === "badges") {
      const entry = badgeCatalog.find(badge => badge.id === id);
      if (!entry) return;
      activeEntry = { sectionKey, id, title: entry.name, data: entry };
    } else if (sectionKey === "currencies") {
      const entries = { ap: { title: "amethyst points", description: "ap is used for daily quest refreshes and other inventory actions", image: "WikiAssets/APBalance.png" }, mp: { title: "mission points", description: "mp comes from missions and is used for selected upgrades and refreshes", image: "WikiAssets/MPBalance.png" }, stardust: { title: "stardust", description: "stardust is a separate resource used for item imbues", image: "Stardust_icon.png" } };
      if (!entries[id]) return;
      activeEntry = { sectionKey, id, title: entries[id].title, data: entries[id] };
    }
    renderAll();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderBuiltinWikiPages(sectionKey, containerId) {
    const root = $(containerId);
    if (!root) return;
    const pages = Array.isArray(wikiDocument.sectionPages?.[sectionKey]) ? wikiDocument.sectionPages[sectionKey] : [];
    root.innerHTML = `${localDraft ? `<button type="button" class="article-edit-link builtin-add-page" data-builtin-add="${sectionKey}">add wiki page</button>` : ""}${pages.map((page,index) => {
      const editing = editingBuiltinPages.has(page.id);
      return `<article class="wiki-page-article"><h2>${esc(page.title || "untitled page")} ${localDraft ? `<span class="article-edit-links"><button type="button" data-builtin-edit="${sectionKey}:${esc(page.id)}">edit</button><button type="button" data-builtin-shift="${sectionKey}:${index}:up" ${index === 0 ? "disabled" : ""}>move up</button><button type="button" data-builtin-shift="${sectionKey}:${index}:down" ${index === pages.length - 1 ? "disabled" : ""}>move down</button><button type="button" data-builtin-remove="${sectionKey}:${esc(page.id)}">remove</button></span>` : ""}</h2><div class="wiki-prose custom-page-rendered" ${editing ? "hidden" : ""}>${renderMarkdown(page.content)}</div>${localDraft ? `<form class="wiki-editor inline-wiki-editor" data-builtin-form="${sectionKey}:${esc(page.id)}" ${editing ? "" : "hidden"}><label>page title<input name="title" maxlength="90" required value="${esc(page.title)}"></label><label>page content<textarea name="content" rows="14">${esc(page.content)}</textarea></label><div class="editor-actions"><button type="button" data-builtin-images="${esc(page.id)}">choose image files</button><input id="builtinWikiImages-${esc(page.id)}" type="file" accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml" multiple hidden><button type="button" data-builtin-preview="${esc(page.id)}">preview</button><button type="submit">save page</button><button type="button" data-builtin-cancel="${esc(page.id)}">cancel</button></div><div class="wiki-prose editor-preview" data-builtin-preview-box="${esc(page.id)}" hidden></div><p class="markdown-help">markdown supports headings, lists, code blocks, images, and item, badge, and rarity preview links</p></form>` : ""}</article>`;
    }).join("")}`;
  }

  function addBuiltinWikiPage(sectionKey) {
    if (!localDraft) return;
    wikiDocument.sectionPages ||= {};
    wikiDocument.sectionPages[sectionKey] ||= [];
    const page = { id: `page-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, title: "new page", content: "" };
    wikiDocument.sectionPages[sectionKey].push(page); editingBuiltinPages.add(page.id); unsavedBuiltinPages.add(page.id);
    markWikiDraftSaved("new article page added");
    requestAnimationFrame(() => $(`[data-builtin-form="${sectionKey}:${page.id}"] input[name="title"]`)?.focus());
  }

  function syncProgress() {
    const publicCatalog = localDraft ? readJson("inventoryBadgeCatalogV1", window.INVENTORY_BADGE_CATALOG || []) : (window.INVENTORY_BADGE_CATALOG || []);
    const privateCatalog = localDraft ? readJson("inventoryPrivateBadgeCatalogV1", []) : [];
    amethystBadgeIds = new Set((Array.isArray(privateCatalog) ? privateCatalog : []).filter(badge => badge?.id).map(badge => badge.id));
    const allBadges = [...(Array.isArray(publicCatalog) ? publicCatalog : []), ...(Array.isArray(privateCatalog) ? privateCatalog : [])];
    badgeCatalog = [...new Map(allBadges.filter(badge => badge?.id && badge?.name).map(badge => [badge.id, badge])).values()];
    const unlockedList = readJson("inventoryBadgesUnlockedV1", []);
    const ownedList = readJson("ownedItemsV2", []);
    unlockedBadges = new Set((Array.isArray(unlockedList) ? unlockedList : []).filter(value => typeof value === "string"));
    unlockedItems = new Set((Array.isArray(ownedList) ? ownedList : []).filter(value => typeof value === "string").map(value => value.toLowerCase()));
    let hasProgress = false;
    try { hasProgress = localStorage.getItem("inventoryBadgesUnlockedV1") !== null || localStorage.getItem("ownedItemsV2") !== null; } catch {}
    const savedPages = localDraft ? readJson(wikiPagesKey, wikiDocument.itemPages) : wikiDocument.itemPages;
    wikiPages = savedPages && typeof savedPages === "object" && !Array.isArray(savedPages) ? savedPages : {};
    const matchedUnlockedCount = badgeCatalog.filter(badge => unlockedBadges.has(badge.id)).length;
    const unlockedSecretCount = badgeCatalog.filter(badge => isSecretBadge(badge) && unlockedBadges.has(badge.id)).length;
    const knownBadgeIds = new Set(badgeCatalog.map(badge => badge.id));
    unmatchedUnlockIds = [...unlockedBadges].filter(id => !knownBadgeIds.has(id));
    $("#syncSummary").textContent = hasProgress
      ? `v3 progress linked · ${matchedUnlockedCount}/${badgeCatalog.length} unlocked · ${unlockedItems.size} items · ${unlockedSecretCount} secret unlocked`
      : "no progress found here · sync v3 or import a save";
    const unmatchedButton = $("#unmatchedUnlockHelp");
    unmatchedButton.hidden = !hasProgress || unmatchedUnlockIds.length === 0;
    unmatchedButton.textContent = `${unmatchedUnlockIds.length} unmatched unlock${unmatchedUnlockIds.length === 1 ? "" : "s"}`;
    unmatchedButton.setAttribute("aria-label", `show ${unmatchedUnlockIds.length} unmatched badge unlock${unmatchedUnlockIds.length === 1 ? "" : "s"}`);
    $("#badgeCount").textContent = badgeCatalog.length;
    $("#badgePrivacyNote").textContent = localDraft
      ? "amethyst badges are visible only in this local browser · locked secret descriptions and unlock methods stay hidden"
      : "amethyst badges stay in the local version · locked secret descriptions and unlock methods stay hidden";
    if (activePage === "badges") renderBadges();
    if (activePage === "currencies") renderEntryPage("currencies", "#currencyEntryPage");
    if (activePage === "itemPage") renderItemPage();
    if (activePage === "quests") renderQuestGuide();
    if (activePage === "items") renderItems();
  }

  function isSecretBadge(badge) {
    return badge?.visibility === "secret" || badge?.secret === true;
  }

  function isAmethystBadge(badge) {
    const badgeName = String(badge?.name || "").toLowerCase();
    const itemName = String(badge?.condition?.itemName || "").toLowerCase();
    return badge?.collection === "amethyst"
      || amethystBadgeIds.has(badge?.id)
      || badgeName.includes("amethyst")
      || itemName.includes("amethyst");
  }

  function go(page) {
    activePage = page;
    document.querySelectorAll(".wiki-section").forEach(section => section.classList.toggle("active", section.dataset.page === page));
    document.querySelectorAll(".nav-button").forEach(button => button.classList.toggle("active", button.dataset.section === page));
    window.scrollTo({ top: 0, behavior: "smooth" });
    renderAll();
  }

  function openItemPage(name) {
    if (!items.some(item => item.name.trim().toLowerCase() === String(name).trim().toLowerCase())) return;
    activeItemName = name;
    activeSubpageId = "";
    go("itemPage");
    renderItemPage(true);
  }

  function previewLink(type, target, label) {
    return `<button type="button" class="wiki-link entity-link" data-preview-type="${esc(type)}" data-preview-target="${esc(target)}">${esc(label || target)}</button>`;
  }

  function safeImageUrl(value) {
    const source = String(value || "").trim();
    if (/^data:image\/(?:png|jpeg|gif|webp|svg\+xml);base64,[a-z0-9+/=\s]+$/i.test(source)) return source.replace(/\s/g, "");
    try {
      const url = new URL(source, location.href);
      return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch { return ""; }
  }

  function safeWebUrl(value) {
    try {
      const url = new URL(String(value || "").trim(), location.href);
      return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch { return ""; }
  }

  function renderInlineMarkdown(source) {
    const savedHtml = [];
    const keep = html => `\uE000${savedHtml.push(html) - 1}\uE001`;
    let value = String(source || "");
    value = value.replace(/`([^`]+)`/g, (_, code) => keep(`<code>${esc(code)}</code>`));
    value = value.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, rawTarget) => {
      const urlPart = rawTarget.trim().replace(/\s+"[^"]*"$/, "");
      const title = rawTarget.trim().match(/\s+"([^"]*)"$/)?.[1] || "";
      const url = safeImageUrl(urlPart);
      if (!url) return esc(alt || "image unavailable");
      return keep(`<figure class="wiki-image"><img src="${esc(url)}" alt="${esc(alt)}" loading="lazy"${title ? ` title="${esc(title)}"` : ""}>${alt ? `<figcaption>${esc(alt)}</figcaption>` : ""}</figure>`);
    });
    value = value.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, rawTarget) => {
      const rawHref = rawTarget.trim().replace(/\s+"[^"]*"$/, "");
      const title = rawTarget.trim().match(/\s+"([^"]*)"$/)?.[1] || "";
      const entity = rawHref.match(/^(item|badge|rarity):(.+)$/i);
      if (entity) return keep(previewLink(entity[1].toLowerCase(), entity[2].trim(), label));
      const href = safeWebUrl(rawHref);
      if (!href) return esc(label);
      return keep(`<a class="wiki-external-link" href="${esc(href)}" target="_blank" rel="noopener noreferrer"${title ? ` title="${esc(title)}"` : ""}>${esc(label)}</a>`);
    });
    value = value.replace(/\[\[([^\]]+)\]\]/g, (_, rawTarget) => {
      const [targetPart, label] = rawTarget.split("|");
      const typed = targetPart.trim().match(/^(item|badge|rarity):(.+)$/i);
      return keep(typed
        ? previewLink(typed[1].toLowerCase(), typed[2].trim(), (label || typed[2]).trim())
        : previewLink("item", targetPart.trim(), (label || targetPart).trim()));
    });
    value = esc(value)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/__(.+?)__/g, "<strong>$1</strong>")
      .replace(/~~(.+?)~~/g, "<del>$1</del>")
      .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>")
      .replace(/(^|[^_])_([^_\n]+)_(?!_)/g, "$1<em>$2</em>");
    return value.replace(/\uE000(\d+)\uE001/g, (_, index) => savedHtml[Number(index)] || "");
  }

  function renderMarkdown(source) {
    const lines = String(source || "").replace(/\r\n?/g, "\n").split("\n");
    const blocks = [];
    let index = 0;
    const startsBlock = line => /^(\s*```|\s{0,3}#{1,6}\s|\s{0,3}(?:[-*_]){3,}\s*$|\s*>\s?|\s*(?:[-+*]|\d+\.)\s+)/.test(line);
    while (index < lines.length) {
      const line = lines[index];
      if (!line.trim()) { index++; continue; }
      if (/^\s*!\[[^\]]*\]\([^)]+\)\s*$/.test(line)) {
        const images = [];
        while (index < lines.length) {
          if (/^\s*!\[[^\]]*\]\([^)]+\)\s*$/.test(lines[index])) images.push(renderInlineMarkdown(lines[index++].trim()));
          else if (!lines[index].trim() && /^\s*!\[[^\]]*\]\([^)]+\)\s*$/.test(lines[index + 1] || "")) index++;
          else break;
        }
        blocks.push(`<div class="wiki-image-row">${images.join("")}</div>`); continue;
      }
      const fence = line.match(/^\s*```([\w-]*)\s*$/);
      if (fence) {
        index++;
        const code = [];
        while (index < lines.length && !/^\s*```\s*$/.test(lines[index])) code.push(lines[index++]);
        if (index < lines.length) index++;
        blocks.push(`<pre><code${fence[1] ? ` class="language-${esc(fence[1])}"` : ""}>${esc(code.join("\n"))}</code></pre>`);
        continue;
      }
      const heading = line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
      if (heading) { blocks.push(`<h${heading[1].length}>${renderInlineMarkdown(heading[2])}</h${heading[1].length}>`); index++; continue; }
      if (/^\s{0,3}(?:[-*_]){3,}\s*$/.test(line)) { blocks.push("<hr>"); index++; continue; }
      if (/^\s*>/.test(line)) {
        const quote = [];
        while (index < lines.length && /^\s*>/.test(lines[index])) quote.push(lines[index++].replace(/^\s*>\s?/, ""));
        blocks.push(`<blockquote>${quote.map(part => `<p>${renderInlineMarkdown(part)}</p>`).join("")}</blockquote>`);
        continue;
      }
      const listMatch = line.match(/^\s*((?:[-+*])|(?:\d+\.))\s+(.+)$/);
      if (listMatch) {
        const ordered = /^\d/.test(listMatch[1]);
        const tag = ordered ? "ol" : "ul";
        const entries = [];
        while (index < lines.length) {
          const match = lines[index].match(/^\s*((?:[-+*])|(?:\d+\.))\s+(.+)$/);
          if (!match || /^\d/.test(match[1]) !== ordered) break;
          entries.push(`<li>${renderInlineMarkdown(match[2])}</li>`);
          index++;
        }
        blocks.push(`<${tag}>${entries.join("")}</${tag}>`);
        continue;
      }
      const paragraph = [];
      while (index < lines.length && lines[index].trim() && !(paragraph.length && startsBlock(lines[index]))) paragraph.push(lines[index++]);
      blocks.push(`<p>${paragraph.map(part => renderInlineMarkdown(part)).join("<br>")}</p>`);
    }
    return blocks.join("");
  }

  function rarityForLink(name) {
    const query = String(name || "").trim().toLowerCase();
    return rarityEntries().map(([title, description]) => ({ title, description }))
      .find(entry => entry.title.toLowerCase() === query || entry.title.toLowerCase().split(/,\s*|\s+and\s+/).includes(query));
  }

  function openWikiPreview(type, target) {
    const title = $("#wikiPreviewTitle");
    const kind = $("#wikiPreviewKind");
    const body = $("#wikiPreviewBody");
    const actions = $("#wikiPreviewActions");
    actions.innerHTML = "";
    if (type === "item") {
      const item = items.find(entry => entry.name.trim().toLowerCase() === String(target).trim().toLowerCase());
      if (!item) return;
      title.textContent = item.name;
      kind.textContent = "item preview";
      const image = safeImageUrl(item.image);
      body.innerHTML = `<article class="preview-entity item-preview">${image ? `<img src="${esc(image)}" alt="${esc(item.name)}">` : ""}<div><p>${esc(item.description || "no description in the catalog")}</p><div class="tag-row"><span class="tag">rarity ${esc(item.rarity || "unrated")}</span><span class="tag">damage ${esc(item.damage || "0")}</span><span class="tag">max level ${esc(item.max_level || "0")}</span><span class="tag">${unlockedItems.has(item.name.toLowerCase()) ? "unlocked in v3" : "not unlocked in v3"}</span></div></div></article>`;
      actions.innerHTML = `<button type="button" data-preview-open-item="${esc(item.name)}">open item wiki</button>`;
    } else if (type === "badge") {
      const badge = badgeCatalog.find(entry => String(entry.id).toLowerCase() === String(target).trim().toLowerCase() || entry.name.trim().toLowerCase() === String(target).trim().toLowerCase());
      if (!badge) return;
      const secret = isSecretBadge(badge);
      const unlocked = unlockedBadges.has(badge.id);
      title.textContent = badge.name;
      kind.textContent = secret ? `secret badge · ${unlocked ? "unlocked" : "locked"}` : `badge · ${unlocked ? "unlocked" : "locked"}`;
      const badgeIcon = safeImageUrl(badge.icon);
      body.innerHTML = secret && !unlocked
        ? `<article class="preview-entity"><p class="secret-placeholder">description and unlock method hidden</p></article>`
        : `<article class="preview-entity">${badgeIcon ? `<img class="badge-preview-icon" src="${esc(badgeIcon)}" alt="">` : ""}<p>${esc(badge.description || "no description")}</p><p><strong>obtain:</strong> ${esc(requirement(badge))}</p>${badge.rewards ? `<p><strong>reward:</strong> ${esc([badge.rewards.ap && `${badge.rewards.ap} ap`, badge.rewards.mp && `${badge.rewards.mp} mp`, badge.rewards.stardust && `${badge.rewards.stardust} stardust`, badge.rewards.item && `item ${badge.rewards.item}`].filter(Boolean).join(" · ") || "configured reward")}</p>` : ""}</article>`;
    } else if (type === "rarity") {
      const rarity = rarityForLink(target);
      if (!rarity) return;
      title.textContent = rarity.title;
      kind.textContent = "arena rarity preview";
      body.innerHTML = `<article class="preview-entity"><p>${esc(rarity.description)}</p></article>`;
    } else return;
    $("#wikiPreviewDialog").showModal();
  }

  function setMarkdownPreview(show) {
    const editor = $("#wikiSubpageText");
    const preview = $("#wikiEditorPreview");
    const toggle = $("#toggleMarkdownPreview");
    preview.hidden = !show;
    editor.hidden = show;
    toggle.setAttribute("aria-pressed", String(show));
    toggle.textContent = show ? "edit" : "preview";
    if (show) preview.innerHTML = renderMarkdown(editor.value);
  }

  function renderQuestGuide() {
    const content = localDraft ? readJson(questGuideKey, wikiDocument.questGuide) : wikiDocument.questGuide;
    const markdown = typeof content === "string" ? content : "";
    $("#questGuideContent").innerHTML = markdown.trim()
      ? renderMarkdown(markdown)
      : `<p class="muted">this page is empty · choose edit the whole page to write your quest guide</p>`;
    $("#questGuideMarkdown").value = markdown;
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error(`could not read ${file.name}`));
      reader.readAsDataURL(file);
    });
  }

  async function wikiImageDataUrl(file) {
    const directData = () => readFileAsDataUrl(file);
    if (/image\/svg\+xml/i.test(file.type)) {
      if (file.size > 500_000) throw new Error(`${file.name} is too large to embed as an svg`);
      return directData();
    }
    if (/image\/gif/i.test(file.type) && file.size <= 900_000) return directData();
    if (typeof createImageBitmap !== "function") {
      if (file.size > 900_000) throw new Error(`${file.name} cannot be resized in this browser`);
      return directData();
    }
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 1400 / bitmap.width, 1400 / bitmap.height);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      let blob = await new Promise(resolve => canvas.toBlob(resolve, "image/webp", 0.82));
      if (blob?.size > 900_000) blob = await new Promise(resolve => canvas.toBlob(resolve, "image/webp", 0.68));
      if (!blob || blob.size > 1_000_000) throw new Error(`${file.name} is still too large after resizing`);
      return await readFileAsDataUrl(blob);
    } catch (error) {
      if (error instanceof Error && /too large|cannot be resized/.test(error.message)) throw error;
      throw new Error(`${file.name} could not be resized for the wiki`);
    }
  }

  async function sectionIconDataUrl(file) {
    if (!file.type.startsWith("image/")) throw new Error("choose an image file for the section icon");
    if (/image\/svg\+xml/i.test(file.type)) {
      if (file.size > 250_000) throw new Error(`${file.name} is too large to use as a section icon`);
      return readFileAsDataUrl(file);
    }
    if (typeof createImageBitmap !== "function") return wikiImageDataUrl(file);
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 128 / bitmap.width, 128 / bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/webp", 0.86));
    if (!blob || blob.size > 100_000) throw new Error(`${file.name} could not be saved as a compact icon`);
    return readFileAsDataUrl(blob);
  }

  function insertWikiImages(files, textareaTarget = "#wikiSubpageText", statusTarget = "#wikiSaveStatus") {
    const textarea = typeof textareaTarget === "string" ? $(textareaTarget) : textareaTarget;
    const status = typeof statusTarget === "string" ? $(statusTarget) : statusTarget;
    if (!textarea || !status) return;
    const selectedFiles = [...files].filter(file => /^image\/(?:png|jpeg|gif|webp|avif|svg\+xml)$/i.test(file.type));
    if (!selectedFiles.length) {
      status.textContent = "choose png, jpg, gif, webp, avif, or svg image files";
      return;
    }
    status.textContent = "preparing selected images…";
    Promise.all(selectedFiles.map(async file => {
      const dataUrl = await wikiImageDataUrl(file);
      const alt = file.name.replace(/\.[^.]+$/, "").replace(/[\[\]\r\n]/g, " ").trim() || "image";
      return `![${alt}](${dataUrl})`;
    })).then(images => {
      const start = textarea.selectionStart ?? textarea.value.length;
      const end = textarea.selectionEnd ?? start;
      const prefix = start > 0 && !textarea.value.slice(0, start).endsWith("\n") ? "\n\n" : "";
      const suffix = end < textarea.value.length && !textarea.value.slice(end).startsWith("\n") ? "\n\n" : "";
      const insertion = `${prefix}${images.join("\n\n")}${suffix}`;
      textarea.setRangeText(insertion, start, end, "end");
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      textarea.focus();
      status.textContent = `${images.length} image${images.length === 1 ? "" : "s"} added · save the page to keep them`;
    }).catch(error => {
      status.textContent = error.message || "could not add those images";
    });
  }

  async function readApiJson(response) {
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.toLowerCase().includes("application/json")) {
      const body = await response.text();
      if ([404, 405, 501].includes(response.status)) throw new Error("this server does not provide the editor api · run python serve.py from the project folder");
      if (/<!doctype\s+html|<html/i.test(body)) throw new Error("the editor server returned an html error · restart it with python serve.py from the project folder");
      throw new Error("the editor api returned an unreadable response");
    }
    try { return await response.json(); }
    catch { throw new Error("the editor api returned invalid json"); }
  }

  function renderItemPage(resetEditor = false) {
    const item = items.find(entry => entry.name.trim().toLowerCase() === activeItemName.trim().toLowerCase());
    if (!item) return;
    const owned = unlockedItems.has(item.name.toLowerCase());
    const family = familyFor(item);
    const images = `<img src="${esc(item.image)}" alt="" loading="lazy">`;
    const itemPages = Array.isArray(wikiPages[item.name.toLowerCase()]) ? wikiPages[item.name.toLowerCase()] : [];
    const activeSubpage = itemPages.find(page => page.id === activeSubpageId);
    const displayName = family ? family.id === "crucibles" ? "Crucible" : family.id === "electric-hammer" ? "Electric Hammer" : "Stormlander" : item.name;
    const itemFacts = [["variant", item.name], ["rarity", item.rarity || "unrated"], ["damage", item.damage || "0"], ["maximum level", item.max_level || "0"], ["protection", item.protection || "0"], ...(item.artifact_power && item.artifact_power !== "0" ? [["artifact power", item.artifact_power]] : []), ...(item.event ? [["event", item.event]] : [])];
    $("#itemArticle").innerHTML = `<h1 class="article-title">${esc(displayName)}</h1><article class="item-article"><aside class="item-infobox"><h2>${esc(displayName)}</h2>${images}<table>${itemFacts.map(([label, value]) => `<tr><th>${esc(label)}</th><td>${esc(value)}</td></tr>`).join("")}<tr><th>v3 status</th><td>${owned ? "unlocked" : "locked"}</td></tr></table></aside><div class="item-article-head"><p class="article-lead">${esc(item.description || "no description in the catalog")}</p></div></article>`;
    $("#wikiSubpageList").innerHTML = itemPages.length ? itemPages.map(page => `<button type="button" class="subpage-link ${page.id === activeSubpageId ? "active" : ""}" data-open-subpage="${esc(page.id)}">${esc(page.title)}</button>`).join("") : `<p class="muted">no pages for this item yet</p>`;
    $("#wikiSubpageContent").innerHTML = activeSubpage ? `<article class="article-card"><span class="card-kicker">${esc(item.name)} wiki page</span><h2>${esc(activeSubpage.title)}</h2><div class="wiki-prose">${renderMarkdown(activeSubpage.content)}</div></article>` : `<p class="muted">choose a page or add one for this item</p>`;
    if (resetEditor) {
      $("#wikiEditorHeading").textContent = activeSubpage ? "edit wiki page" : "add a wiki page";
      $("#wikiSubpageTitle").value = activeSubpage?.title || "";
      $("#wikiSubpageText").value = activeSubpage?.content || "";
    }
  }

  function parseCsv(text) {
    const rows = [];
    let row = [], field = "", quoted = false;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (quoted && char === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (char === '"') quoted = !quoted;
      else if (char === "," && !quoted) { row.push(field.trim()); field = ""; }
      else if (char === "\n" && !quoted) { row.push(field.trim().replace(/\r$/, "")); rows.push(row); row = []; field = ""; }
      else field += char;
    }
    if (field || row.length) { row.push(field.trim().replace(/\r$/, "")); rows.push(row); }
    const headers = (rows.shift() || []).map(value => value.replace(/^\uFEFF/, "").toLowerCase());
    return rows.filter(values => values.some(Boolean)).map(values => Object.fromEntries(headers.map((key, i) => [key, values[i] || ""])));
  }

  function parseShowItemArguments(source) {
    const open = source.indexOf("showItem(") + "showItem(".length;
    const close = source.lastIndexOf(")");
    if (open < "showItem(".length || close < open) return [];
    const values = [];
    let value = "", quote = "", escaped = false;
    for (const char of source.slice(open, close)) {
      if (escaped) { value += char; escaped = false; }
      else if (char === "\\") { value += char; escaped = true; }
      else if (quote && char === quote) { value += char; quote = ""; }
      else if (!quote && (char === "'" || char === '"')) { value += char; quote = char; }
      else if (!quote && char === ",") { values.push(value.trim()); value = ""; }
      else value += char;
    }
    values.push(value.trim());
    return values.map(value => {
      if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) {
        return value.slice(1, -1).replace(/\\(['"\\])/g, "$1");
      }
      return value;
    });
  }

  function parseBaseItems(html) {
    const page = new DOMParser().parseFromString(html, "text/html");
    return [...page.querySelectorAll(".items .item[onclick]")].map(card => {
      const args = parseShowItemArguments(card.getAttribute("onclick") || "");
      if (args.length < 9) return null;
      return {
        name: args[0], image: card.querySelector("img")?.getAttribute("src") || "",
        damage: args[1], rarity: args[2], max_level: args[3], protection: args[4],
        artifact_power: args[5], seasonal: args[6], seasonal_level: args[7],
        description: args[8], event: "", soul_usage: ""
      };
    }).filter(item => item?.name && item.image);
  }

  function mergeItems(baseItems, catalogItems) {
    const merged = new Map();
    for (const item of baseItems) merged.set(item.name.trim().toLowerCase(), item);
    for (const item of catalogItems) {
      if (item.name) merged.set(item.name.trim().toLowerCase(), { ...merged.get(item.name.trim().toLowerCase()), ...item });
    }
    return [...merged.values()];
  }

  const itemFamilies = [
    { id: "crucibles", names: ["crucible", "blue crucible", "brown crucible", "yellow crucible", "white crucible", "gray crucible"], preferred: "crucible" },
    { id: "electric-hammer", names: ["electric hammer v1", "electric hammer v2"], preferred: "electric hammer v2" },
    { id: "stormlander", names: ["stormlander", "stormlander v2"], preferred: "stormlander v2" }
  ];

  function familyFor(item) {
    const name = String(item.name).trim().toLowerCase();
    return itemFamilies.find(family => family.names.includes(name));
  }

  function isArtifact(item) {
    return artifactNames.has(String(item.name).trim().toLowerCase());
  }

  const artifactNames = new Set(["corrupted beacon", "corrupted beacon (mcdii)", "void stabilizer", "ghost cloak", "updraft tome", "thundering quiver", "flaming quiver", "lightning rod", "lightning rod (mcdii)", "golden crown", "firework arrow (mcdii)"]);

  function renderItemCard(variants, selectedName) {
    const item = variants.find(entry => entry.name.trim().toLowerCase() === String(selectedName).trim().toLowerCase()) || variants[0];
    const selector = variants.length > 1 ? `<label class="variant-picker"><span>variant</span><select data-variant-family="${esc(familyFor(item)?.id || "")}">${variants.map(variant => `<option value="${esc(variant.name)}" ${variant.name === item.name ? "selected" : ""}>${esc(variant.name)}</option>`).join("")}</select></label>` : "";
    const family = familyFor(item);
    const heading = family ? ({ crucibles: "Crucible", "electric-hammer": "Electric Hammer", stormlander: "Stormlander" })[family.id] : item.name;
    const owned = unlockedItems.has(item.name.toLowerCase());
    return `<article class="item-card"><div class="item-top"><img src="${esc(item.image)}" alt="" loading="lazy"><div><h2>${esc(heading)}</h2><p>${esc(item.rarity || "unrated")}${/true|yes|1/i.test(item.seasonal) ? " · seasonal" : ""}</p></div></div>${selector}<p class="item-description">${esc(item.description || "no description in the catalog")}</p><div class="tag-row"><span class="tag">${owned ? "unlocked in v3" : "not unlocked"}</span><span class="tag">damage ${esc(item.damage || "0")}</span><span class="tag">max level ${esc(item.max_level || "0")}</span><span class="tag">protection ${esc(item.protection || "0")}</span>${item.artifact_power && item.artifact_power !== "0" ? `<span class="tag">artifact power ${esc(item.artifact_power)}</span>` : ""}${item.soul_usage && item.soul_usage !== "None" ? `<span class="tag">souls ${esc(item.soul_usage)}</span>` : ""}${item.event ? `<span class="tag">event ${esc(item.event)}</span>` : ""}</div><button class="open-item-page" type="button" data-open-item="${esc(item.name)}">open item wiki</button></article>`;
  }

  function rarityEntries() {
    return [
      ["common", "base catalog damage with no extra arena multiplier"],
      ["rare and epic", "base catalog damage with no extra arena multiplier"],
      ["magma, flamed", "×1.2 damage and a fire effect that burns for 3 seconds"],
      ["gravity", "pulls nearby enemies toward the hit point"],
      ["shadow", "×1.1 damage and briefly puts the player in ghost mode"],
      ["void", "×1.2 damage and damage over time for 3 seconds"],
      ["void+", "×1.35 damage and stronger damage over time for 7 seconds"],
      ["dominance", "×8 weapon damage and a large area hit"],
      ["frozen", "×1.2 damage and applies freezing for 4 seconds"],
      ["electric", "×1.15 damage with visible lightning and chain damage"],
      ["divine, mystical", "×2.5 weapon damage"],
      ["special", "×1.5 weapon damage"],
      ["unique, seasonal, mythical", "no extra rarity multiplier in the arena"]
    ];
  }

  function requirement(badge) {
    const c = badge.condition || {};
    const amount = Number(c.amount) || 1;
    const labels = {
      item: `unlock ${c.itemName || "the required item"}`,
      "item-unlock": `newly unlock ${amount} items`,
      "event-item-unlock": `newly unlock ${amount} event items`,
      "daily-quests": `complete ${amount} daily quests`,
      "event-quest": `complete ${amount} event quests`,
      "weekly-win": `win ${amount} weekly challenges`,
      "arena-kill": `defeat ${amount} arena enemies`,
      "normal-badges": `complete ${amount} normal badges`,
      "secret-badges": `unlock ${amount} secret badges`,
      "secret-amethyst": `unlock ${amount} secret amethyst badges`,
      "secret-amethyst-badges": `unlock ${amount} secret amethyst badges`,
      "all-normal-badges": "complete all normal badges",
      "all-secret-badges": "complete all secret badges",
      "all-badges": "complete the other badges",
      "badges-unlocked": `unlock ${amount} badges`,
      "reality-visit": `change realities ${amount} times`,
      enchant: `apply ${amount} enchants`,
      ap: `reach ${amount} ap`,
      mp: `reach ${amount} mp`,
      seasonal: `unlock ${amount} seasonal items`,
      action: `complete the custom action ${amount} times`,
      "editor-action": `complete the editor action ${amount} times`,
      "custom-code": "meet its custom code requirement"
    };
    return labels[c.type] || (c.type ? `requirement: ${c.type}` : "requirement not configured");
  }

  function renderItems() {
    const kind = $("#itemType").value;
    const groups = new Map();
    for (const item of items) {
      const family = familyFor(item);
      const key = family?.id || item.name.trim().toLowerCase();
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    }
    const visibleGroups = [...groups.values()].filter(variants => {
      const family = familyFor(variants[0]);
      const matches = variants.filter(item => !search || Object.values(item).join(" ").toLowerCase().includes(search));
      if (!matches.length) return false;
      const artifact = isArtifact(variants[0]);
      if (kind === "artifacts" && !artifact) return false;
      if (kind === "weapons" && artifact) return false;
      if (kind === "seasonal" && !variants.some(item => /true|yes|1/i.test(item.seasonal))) return false;
      variants._matchesSearch = matches;
      variants._preferredName = family?.preferred;
      return true;
    });
    const variantCount = visibleGroups.reduce((total, group) => total + group.length, 0);
    $("#itemResults").textContent = `${visibleGroups.length} entries · ${variantCount} items`;
    $("#itemGrid").innerHTML = visibleGroups.map(variants => {
      const preferred = variants.find(item => item.name.trim().toLowerCase() === String(variants._preferredName).toLowerCase()) || variants._matchesSearch[0] || variants[0];
      return renderItemCard(variants, preferred.name);
    }).join("");
  }

  function renderRarities() {
    $("#rarityGrid").innerHTML = rarityEntries().map(([name, text]) => `<article tabindex="0" role="button" class="article-card wiki-entry-card" data-open-entry="rarities:${esc(name)}"><span class="card-kicker">arena rarity</span><h2>${esc(name)}</h2><p>${esc(text)}</p><span class="entry-open-hint">open article →</span></article>`).join("");
    renderEntryPage("rarities", "#rarityEntryPage");
  }

  function renderEvents() {
    const now = Date.now();
    const events = (window.INVENTORY_EVENT_CATALOG || []).filter(event => `${event.name} ${event.items.join(" ")}`.toLowerCase().includes(search));
    $("#eventGrid").innerHTML = events.map(event => {
      const start = new Date(event.start).getTime(), end = new Date(event.end).getTime();
      const state = now < start ? "upcoming" : now <= end ? "live" : "ended";
      const dates = `${new Date(event.start).toLocaleString()} – ${new Date(event.end).toLocaleString()}`;
      return `<article tabindex="0" role="button" class="article-card wiki-entry-card" data-open-entry="events:${esc(event.id || event.name)}"><span class="card-kicker">${state} event</span><h2>${esc(event.name)}</h2><p class="event-date">${esc(dates)}</p><p>featured items</p><div class="tag-row">${event.items.map(name => `<span class="tag">${esc(name)}</span>`).join("")}</div>${event.theme ? `<p>theme preset: ${esc(event.theme)}${event.themeColor ? ` · ${esc(event.themeColor)}` : ""}</p>` : ""}<span class="entry-open-hint">open article →</span></article>`;
    }).join("");
    if (!events.length) $("#eventGrid").innerHTML = `<div class="empty-state">no matching events</div>`;
    renderEntryPage("events", "#eventEntryPage");
  }

  function renderBadges() {
    const kind = $("#badgeType").value;
    const badges = badgeCatalog.filter(badge => {
      const secret = isSecretBadge(badge);
      const amethyst = isAmethystBadge(badge);
      const unlocked = unlockedBadges.has(badge.id);
      if (kind === "secret" && (amethyst || !secret)) return false;
      if (kind === "normal" && (amethyst || secret)) return false;
      if (kind === "amethyst" && (!amethyst || secret)) return false;
      if (kind === "secret-amethyst" && (!amethyst || !secret)) return false;
      const searchable = `${badge.name} ${secret && !unlocked ? "" : `${badge.description} ${requirement(badge)}`}`;
      return searchable.toLowerCase().includes(search);
    });
    $("#badgeResults").textContent = `${badges.length} shown`;
    $("#badgeGrid").innerHTML = badges.map(badge => {
      const secret = isSecretBadge(badge);
      const amethyst = isAmethystBadge(badge);
      const unlocked = unlockedBadges.has(badge.id);
      if (secret && !unlocked) return `<article tabindex="0" role="button" class="article-card badge-secret wiki-entry-card" data-open-entry="badges:${esc(badge.id)}"><span class="card-kicker">${amethyst ? "secret amethyst badge" : "secret badge"} · locked</span><h2>${esc(badge.name)}</h2><p class="secret-placeholder">description and unlock method hidden</p><span class="entry-open-hint">open article →</span></article>`;
      const label = secret ? `${amethyst ? "secret amethyst badge" : "secret badge"} · unlocked` : `${amethyst ? "amethyst badge" : "badge"} · ${unlocked ? "unlocked" : "locked"}`;
      return `<article tabindex="0" role="button" class="article-card ${secret ? "badge-secret is-unlocked" : ""} wiki-entry-card" data-open-entry="badges:${esc(badge.id)}"><span class="card-kicker">${label}</span><h2>${esc(badge.name)}</h2><p>${esc(badge.description || "no description")}</p><p><strong>obtain:</strong> ${esc(requirement(badge))}</p>${badge.rewards ? `<p><strong>reward:</strong> ${esc([badge.rewards.ap && `${badge.rewards.ap} ap`, badge.rewards.mp && `${badge.rewards.mp} mp`, badge.rewards.stardust && `${badge.rewards.stardust} stardust`, badge.rewards.item && `item ${badge.rewards.item}`].filter(Boolean).join(" · ") || "configured reward")}</p>` : ""}<span class="entry-open-hint">open article →</span></article>`;
    }).join("");
    renderEntryPage("badges", "#badgeEntryPage");
  }

  function renderAll() {
    if (activePage === "items") renderItems();
    if (activePage === "rarities") renderRarities();
    if (activePage === "events") renderEvents();
    if (activePage === "badges") renderBadges();
    if (activePage === "currencies") renderEntryPage("currencies", "#currencyEntryPage");
    if (activePage === "quests") renderQuestGuide();
    if (activePage === "itemPage") renderItemPage();
    const searchable = [...document.querySelectorAll(".wiki-section.active .item-card, .wiki-section.active .article-card, .wiki-section.active .feature-tile, .wiki-section.active .currency-card")];
    searchable.forEach(card => { card.hidden = Boolean(search) && !card.textContent.toLowerCase().includes(search); });
    const hasEntries = searchable.some(card => !card.hidden);
    $("#emptySearch").hidden = !search || hasEntries;
  }

  function markWikiDraftSaved(message = "local wiki draft saved") {
    $("#wikiAuthorStatus").textContent = saveWikiDraft() ? message : "could not save the local draft, download a backup";
    renderCustomSections();
    renderAll();
  }

  function downloadWiki() {
    const blob = new Blob([JSON.stringify(wikiDocument, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "wiki-content.json";
    link.click();
    URL.revokeObjectURL(link.href);
    $("#wikiAuthorStatus").textContent = "wiki export downloaded";
  }

  function safeWikiFile(value) {
    if (!value || typeof value !== "object" || value.version !== 1 || !Array.isArray(value.sections)) throw new Error("choose a wiki export file with version 1");
    return normalizeWikiDocument(value);
  }



  $("#wikiNav").addEventListener("click", event => {
    const button = event.target.closest("[data-section]");
    if (button) go(button.dataset.section);
  });
  document.querySelectorAll("[data-go]").forEach(button => button.addEventListener("click", () => go(button.dataset.go)));
  $("#wikiAuthorTools").hidden = !localDraft;
  document.documentElement.dataset.localWiki = String(localDraft);
  document.querySelectorAll(".local-only").forEach(node => { node.hidden = !localDraft; });
  function addCustomWikiSection() {
    if (!localDraft) return;
    const section = { id: `section-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, title: "new section", pages: [] };
    wikiDocument.sections.push(section);
    markWikiDraftSaved("new section added to the local wiki");
    go(`custom:${section.id}`);
    const titleEditor = $(".wiki-section.active [data-section-title-editor]");
    if (titleEditor) { titleEditor.hidden = false; titleEditor.querySelector("input")?.focus(); }
  }
  $("#addSectionSidebar").addEventListener("click", addCustomWikiSection);
  $("#wikiContent").addEventListener("click", event => {
    const openEntryButton = event.target.closest("[data-open-entry]");
    if (openEntryButton) { const [sectionKey, ...entryId] = openEntryButton.dataset.openEntry.split(":"); openEntry(sectionKey, entryId.join(":")); return; }
    const closeEntryButton = event.target.closest("[data-close-entry]");
    if (closeEntryButton) { activeEntry = null; renderAll(); return; }
    const chooseSectionIcon = event.target.closest("[data-choose-section-icon]");
    if (chooseSectionIcon) { chooseSectionIcon.parentElement.querySelector("[data-section-icon-input]")?.click(); return; }
    if (!localDraft) return;
    const builtinAdd = event.target.closest("[data-builtin-add]");
    if (builtinAdd) { addBuiltinWikiPage(builtinAdd.dataset.builtinAdd); return; }
    const builtinEdit = event.target.closest("[data-builtin-edit]");
    if (builtinEdit) {
      const [sectionKey, pageId] = builtinEdit.dataset.builtinEdit.split(":"); editingBuiltinPages.add(pageId);
      if (activeEntry) renderEntryPage(activeEntry.sectionKey, `#${activeEntry.sectionKey === "badges" ? "badge" : activeEntry.sectionKey === "events" ? "event" : activeEntry.sectionKey === "currencies" ? "currency" : "rarity"}EntryPage`);
      requestAnimationFrame(() => $(`[data-builtin-form="${sectionKey}:${pageId}"] textarea`)?.focus()); return;
    }
    const builtinCancel = event.target.closest("[data-builtin-cancel]");
    if (builtinCancel) {
      const pageId = builtinCancel.dataset.builtinCancel; editingBuiltinPages.delete(pageId);
      for (const [key,pages] of Object.entries(wikiDocument.sectionPages || {})) if (unsavedBuiltinPages.has(pageId)) wikiDocument.sectionPages[key] = pages.filter(page => page.id !== pageId);
      if (unsavedBuiltinPages.delete(pageId)) markWikiDraftSaved("new page discarded"); else { renderBuiltinWikiPagesForAll(); }
      return;
    }
    const builtinImages = event.target.closest("[data-builtin-images]");
    if (builtinImages) { $(`#builtinWikiImages-${builtinImages.dataset.builtinImages}`)?.click(); return; }
    const builtinPreview = event.target.closest("[data-builtin-preview]");
    if (builtinPreview) {
      const form = builtinPreview.closest("form"), preview = form.querySelector("[data-builtin-preview-box]"); preview.hidden = !preview.hidden;
      if (!preview.hidden) preview.innerHTML = renderMarkdown(form.elements.content.value); builtinPreview.textContent = preview.hidden ? "preview" : "edit"; return;
    }
    const builtinRemove = event.target.closest("[data-builtin-remove]");
    if (builtinRemove) {
      const [sectionKey,pageId] = builtinRemove.dataset.builtinRemove.split(":");
      const page = wikiDocument.sectionPages?.[sectionKey]?.find(entry => entry.id === pageId);
      if (!page || !confirm(`remove page “${page.title}” from the local draft?`)) return;
      wikiDocument.sectionPages[sectionKey] = wikiDocument.sectionPages[sectionKey].filter(entry => entry.id !== pageId); markWikiDraftSaved("wiki page removed"); return;
    }
    const builtinShift = event.target.closest("[data-builtin-shift]");
    if (builtinShift) {
      const [sectionKey,indexText,direction] = builtinShift.dataset.builtinShift.split(":"), pages = wikiDocument.sectionPages?.[sectionKey] || [], index = Number(indexText), target = index + (direction === "up" ? -1 : 1);
      if (target < 0 || target >= pages.length) return; [pages[index],pages[target]] = [pages[target],pages[index]]; markWikiDraftSaved("wiki page order saved"); return;
    }
    const addPage = event.target.closest("[data-add-page]");
    if (addPage) {
      const section = wikiDocument.sections.find(entry => entry.id === addPage.dataset.addPage);
      if (!section) return;
      const page = { id: `page-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, title: "new page", content: "" };
      section.pages.push(page); editingWikiPages.add(page.id); unsavedWikiPages.add(page.id);
      markWikiDraftSaved("new article page added");
      requestAnimationFrame(() => $(`[data-custom-page-form="${section.id}:${page.id}"] input[name="title"]`)?.focus());
      return;
    }
    const editPage = event.target.closest("[data-edit-page]");
    if (editPage) {
      const [sectionId, pageId] = editPage.dataset.editPage.split(":"); editingWikiPages.add(pageId); renderCustomSections();
      requestAnimationFrame(() => $(`[data-custom-page-form="${sectionId}:${pageId}"] textarea`)?.focus()); return;
    }
    const cancelPage = event.target.closest("[data-cancel-page]");
    if (cancelPage) {
      const pageId = cancelPage.dataset.cancelPage; editingWikiPages.delete(pageId);
      if (unsavedWikiPages.delete(pageId)) {
        for (const section of wikiDocument.sections) section.pages = section.pages.filter(page => page.id !== pageId);
        markWikiDraftSaved("new page discarded");
      } else renderCustomSections();
      return;
    }
    const imageButton = event.target.closest("[data-page-images]");
    if (imageButton) { $(`#customWikiImages-${imageButton.dataset.pageImages}`)?.click(); return; }
    const previewButton = event.target.closest("[data-page-preview]");
    if (previewButton) {
      const form = previewButton.closest("form"), preview = form.querySelector("[data-page-preview-box]");
      preview.hidden = !preview.hidden;
      if (!preview.hidden) preview.innerHTML = renderMarkdown(form.elements.content.value);
      previewButton.textContent = preview.hidden ? "preview" : "edit"; return;
    }
    const editTitle = event.target.closest("[data-custom-edit-title]");
    if (editTitle) { $(`[data-section-title-editor="${editTitle.dataset.customEditTitle}"]`).hidden = false; return; }
    const cancelTitle = event.target.closest("[data-cancel-section-title]");
    if (cancelTitle) { $(`[data-section-title-editor="${cancelTitle.dataset.cancelSectionTitle}"]`).hidden = true; return; }
    const saveTitle = event.target.closest("[data-save-section-title]");
    if (saveTitle) {
      const section = wikiDocument.sections.find(entry => entry.id === saveTitle.dataset.saveSectionTitle), title = saveTitle.parentElement.querySelector("input").value.trim();
      if (!section || !title) return; section.title = title; markWikiDraftSaved("section title saved"); return;
    }
    const removeSection = event.target.closest("[data-section-remove]");
    if (removeSection) {
      const section = wikiDocument.sections.find(entry => entry.id === removeSection.dataset.sectionRemove);
      if (!section || !confirm(`remove section “${section.title}” and all its pages from the local draft?`)) return;
      wikiDocument.sections = wikiDocument.sections.filter(entry => entry.id !== section.id); markWikiDraftSaved("section removed from the local wiki"); go("home"); return;
    }
    const shiftSection = event.target.closest("[data-section-shift]");
    if (shiftSection) {
      const [indexText, direction] = shiftSection.dataset.sectionShift.split(":"), index = Number(indexText), target = index + (direction === "up" ? -1 : 1);
      if (target < 0 || target >= wikiDocument.sections.length) return;
      [wikiDocument.sections[index], wikiDocument.sections[target]] = [wikiDocument.sections[target], wikiDocument.sections[index]]; markWikiDraftSaved("wiki section order saved"); return;
    }
    const removePage = event.target.closest("[data-page-remove]");
    if (removePage) {
      const [sectionId, pageId] = removePage.dataset.pageRemove.split(":"), section = wikiDocument.sections.find(entry => entry.id === sectionId), page = section?.pages.find(entry => entry.id === pageId);
      if (!page || !confirm(`remove page “${page.title}” from the local draft?`)) return;
      section.pages = section.pages.filter(entry => entry.id !== pageId); editingWikiPages.delete(pageId); markWikiDraftSaved("wiki page removed"); return;
    }
    const shiftPage = event.target.closest("[data-page-shift]");
    if (shiftPage) {
      const [sectionId, indexText, direction] = shiftPage.dataset.pageShift.split(":"), section = wikiDocument.sections.find(entry => entry.id === sectionId), index = Number(indexText), target = index + (direction === "up" ? -1 : 1);
      if (!section || target < 0 || target >= section.pages.length) return;
      [section.pages[index], section.pages[target]] = [section.pages[target], section.pages[index]]; markWikiDraftSaved("wiki page order saved");
    }
  });
  $("#wikiContent").addEventListener("keydown", event => {
    const card = event.target.closest("[data-open-entry]");
    if (card && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); card.click(); }
  });
  function renderBuiltinWikiPagesForAll() {
    if (!activeEntry) return;
    const prefix = activeEntry.sectionKey === "badges" ? "badge" : activeEntry.sectionKey === "events" ? "event" : activeEntry.sectionKey === "currencies" ? "currency" : "rarity";
    renderEntryPage(activeEntry.sectionKey, `#${prefix}EntryPage`);
  }
  $("#wikiContent").addEventListener("submit", event => {
    const builtinForm = event.target.closest("[data-builtin-form]");
    if (builtinForm && localDraft) {
      event.preventDefault(); const [sectionKey,pageId] = builtinForm.dataset.builtinForm.split(":");
      const page = wikiDocument.sectionPages?.[sectionKey]?.find(entry => entry.id === pageId); if (!page) return;
      page.title = builtinForm.elements.title.value.trim(); page.content = builtinForm.elements.content.value;
      editingBuiltinPages.delete(pageId); unsavedBuiltinPages.delete(pageId); markWikiDraftSaved("wiki page saved in this browser"); return;
    }
    const form = event.target.closest("[data-custom-page-form]"); if (!form || !localDraft) return; event.preventDefault();
    const [sectionId, pageId] = form.dataset.customPageForm.split(":"), section = wikiDocument.sections.find(entry => entry.id === sectionId), page = section?.pages.find(entry => entry.id === pageId);
    if (!page) return; page.title = form.elements.title.value.trim(); page.content = form.elements.content.value; editingWikiPages.delete(pageId); unsavedWikiPages.delete(pageId); markWikiDraftSaved("wiki page saved in this browser");
  });
  $("#wikiContent").addEventListener("input", event => {
    const builtinForm = event.target.closest("[data-builtin-form]");
    if (builtinForm) { const preview = builtinForm.querySelector("[data-builtin-preview-box]"); if (!preview.hidden) preview.innerHTML = renderMarkdown(builtinForm.elements.content.value); return; }
    const form = event.target.closest("[data-custom-page-form]"); if (!form) return;
    const preview = form.querySelector("[data-page-preview-box]"); if (!preview.hidden) preview.innerHTML = renderMarkdown(form.elements.content.value);
  });
  $("#wikiContent").addEventListener("change", event => {
    const input = event.target.closest("[id^='customWikiImages-'], [id^='builtinWikiImages-']"); if (!input || !localDraft) return;
    const textarea = input.closest("form")?.querySelector('textarea[name="content"]');
    if (textarea) insertWikiImages(input.files || [], textarea, "#wikiAuthorStatus"); input.value = "";
  });
  $("#wikiContent").addEventListener("change", async event => {
    const input = event.target.closest("[data-section-icon-input]");
    if (!input || !localDraft || !input.files?.[0]) return;
    const status = $("#wikiAuthorStatus");
    try {
      status.textContent = "saving section icon locally…";
      wikiDocument.sectionIcons ||= {};
      wikiDocument.sectionIcons[input.dataset.sectionIconInput] = await sectionIconDataUrl(input.files[0]);
      markWikiDraftSaved("section icon saved locally");
    } catch (error) { status.textContent = error.message || "could not save section icon"; }
    input.value = "";
  });
  $("#wikiContent").addEventListener("click", event => {
    const button = event.target.closest("[data-preview-type]"); if (button) openWikiPreview(button.dataset.previewType, button.dataset.previewTarget);
  });
  $("#exportWiki").addEventListener("click", () => { if (localDraft) downloadWiki(); });
  $("#importWiki").addEventListener("click", () => { if (localDraft) $("#wikiImportFile").click(); });
  $("#wikiImportFile").addEventListener("change", async event => {
    const file = event.target.files?.[0];
    if (!file || !localDraft) return;
    try {
      wikiDocument = safeWikiFile(JSON.parse(await file.text()));
      markWikiDraftSaved("wiki file imported and saved locally");
    } catch (error) { $("#wikiAuthorStatus").textContent = error.message || "could not import wiki file"; }
    event.target.value = "";
  });
  $("#publishWiki").addEventListener("click", async () => {
    if (!localDraft) return;
    if (!confirm("publish the saved wiki pages to github? this creates a commit and pushes wiki-content.json to the current branch")) return;
    $("#wikiAuthorStatus").textContent = "publishing wiki pages to github…";
    try {
      const response = await fetch("/api/publish-wiki", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ wiki: wikiDocument }) });
      const result = await readApiJson(response);
      if (!response.ok) throw new Error(result.error || "wiki publish failed");
      $("#wikiAuthorStatus").textContent = result.message;
    } catch (error) { $("#wikiAuthorStatus").textContent = error.message || "could not publish wiki"; }
  });
  $("#wikiSearch").addEventListener("input", event => { search = event.target.value.trim().toLowerCase(); renderAll(); });
  $("#wikiSearch").addEventListener("input", event => { $("#wikiTopSearch").value = event.target.value; });
  $("#wikiTopSearch").addEventListener("input", event => {
    $("#wikiSearch").value = event.target.value;
    search = event.target.value.trim().toLowerCase();
    renderAll();
  });
  $("#syncProgress").addEventListener("click", syncProgress);
  $("#unmatchedUnlockHelp").addEventListener("click", () => {
    $("#unmatchedUnlockList").innerHTML = unmatchedUnlockIds.map(id => {
      const possibleId = id.replace(/^amethyst-/, "");
      const possibleMatch = possibleId !== id ? badgeCatalog.find(badge => badge.id === possibleId) : null;
      return `<li><code>${esc(id)}</code>${possibleMatch ? `<span>possible current match: ${esc(possibleMatch.name.toLowerCase())}</span>` : ""}</li>`;
    }).join("");
    $("#unmatchedUnlockDialog").showModal();
  });
  $("#closeUnmatchedUnlocks").addEventListener("click", () => $("#unmatchedUnlockDialog").close());
  $("#importProgress").addEventListener("click", () => $("#progressFile").click());
  $("#progressFile").addEventListener("change", async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const envelope = JSON.parse(await file.text());
      if (envelope?.format !== "inventory-ui-save" || envelope?.version !== 1 || !envelope.data || typeof envelope.data !== "object") {
        throw new Error("choose an inventory save file from v3");
      }
      const badgeIds = envelope.data.inventoryBadgesUnlockedV1;
      const itemNames = envelope.data.ownedItemsV2;
      if (!Array.isArray(badgeIds) || !Array.isArray(itemNames) || badgeIds.some(value => typeof value !== "string") || itemNames.some(value => typeof value !== "string")) {
        throw new Error("this save does not contain a valid badge and item progress list");
      }
      localStorage.setItem("inventoryBadgesUnlockedV1", JSON.stringify([...new Set(badgeIds)]));
      localStorage.setItem("ownedItemsV2", JSON.stringify([...new Set(itemNames)]));
      syncProgress();
      const matchedUnlockedCount = badgeCatalog.filter(badge => unlockedBadges.has(badge.id)).length;
      $("#syncSummary").textContent = `save progress imported · ${matchedUnlockedCount}/${badgeCatalog.length} unlocked · ${unlockedItems.size} items · ${badgeCatalog.filter(badge => isSecretBadge(badge) && unlockedBadges.has(badge.id)).length} secret unlocked`;
    } catch (error) {
      $("#syncSummary").textContent = error.message || "could not import this save";
    } finally {
      event.target.value = "";
    }
  });
  window.addEventListener("storage", event => {
    if (progressKeys.has(event.key) || event.key === wikiPagesKey || event.key === null) syncProgress();
  });
  $("#itemType").addEventListener("change", renderItems);
  $("#itemGrid").addEventListener("click", event => {
    const button = event.target.closest("[data-open-item]");
    if (button) openItemPage(button.dataset.openItem);
  });
  $("#itemGrid").addEventListener("change", event => {
    const selector = event.target.closest("[data-variant-family]");
    if (!selector) return;
    const family = itemFamilies.find(entry => entry.id === selector.dataset.variantFamily);
    const card = selector.closest(".item-card");
    if (!family || !card) return;
    const variants = items.filter(item => family.names.includes(item.name.trim().toLowerCase()));
    card.outerHTML = renderItemCard(variants, selector.value);
  });
  $("#badgeType").addEventListener("change", renderBadges);
  $("#backToItems").addEventListener("click", () => go("items"));
  $("#newWikiSubpage").addEventListener("click", () => {
    if (!localDraft) return;
    activeSubpageId = "";
    $("#wikiSaveStatus").textContent = "";
    setMarkdownPreview(false);
    renderItemPage(true);
    $("#wikiSubpageTitle").focus();
  });
  $("#wikiSubpageList").addEventListener("click", event => {
    const button = event.target.closest("[data-open-subpage]");
    if (!button) return;
    activeSubpageId = button.dataset.openSubpage;
    $("#wikiSaveStatus").textContent = "";
    setMarkdownPreview(false);
    renderItemPage(true);
  });
  $("#wikiSubpageContent").addEventListener("click", event => {
    const button = event.target.closest("[data-preview-type]");
    if (button) openWikiPreview(button.dataset.previewType, button.dataset.previewTarget);
  });
  $("#wikiEditorPreview").addEventListener("click", event => {
    const button = event.target.closest("[data-preview-type]");
    if (button) openWikiPreview(button.dataset.previewType, button.dataset.previewTarget);
  });
  $("#wikiPreviewActions").addEventListener("click", event => {
    const button = event.target.closest("[data-preview-open-item]");
    if (!button) return;
    $("#wikiPreviewDialog").close();
    openItemPage(button.dataset.previewOpenItem);
  });
  $("#closeWikiPreview").addEventListener("click", () => $("#wikiPreviewDialog").close());
  $("#editQuestGuide").addEventListener("click", () => {
    if (!localDraft) return;
    $("#questGuideForm").hidden = false;
    $("#questGuideMarkdown").value = readJson(questGuideKey, "") || "";
    $("#questGuideSaveStatus").textContent = "saved in this browser only";
    $("#questGuideMarkdown").focus();
  });
  $("#cancelQuestWikiEdit").addEventListener("click", () => {
    $("#questGuideForm").hidden = true;
    $("#questGuidePreview").hidden = true;
    $("#questGuideMarkdown").hidden = false;
    $("#toggleQuestWikiPreview").textContent = "preview";
    $("#toggleQuestWikiPreview").setAttribute("aria-pressed", "false");
  });
  $("#toggleQuestWikiPreview").addEventListener("click", () => {
    const preview = $("#questGuidePreview");
    const show = preview.hidden;
    preview.hidden = !show;
    $("#questGuideMarkdown").hidden = show;
    $("#toggleQuestWikiPreview").textContent = show ? "edit" : "preview";
    $("#toggleQuestWikiPreview").setAttribute("aria-pressed", String(show));
    if (show) preview.innerHTML = renderMarkdown($("#questGuideMarkdown").value);
  });
  $("#questGuideMarkdown").addEventListener("input", () => {
    if (!$("#questGuidePreview").hidden) $("#questGuidePreview").innerHTML = renderMarkdown($("#questGuideMarkdown").value);
  });
  $("#chooseQuestWikiImages").addEventListener("click", () => $("#questWikiImageFiles").click());
  $("#questWikiImageFiles").addEventListener("change", event => {
    if (!localDraft) return;
    insertWikiImages(event.target.files || [], "#questGuideMarkdown", "#questGuideSaveStatus");
    event.target.value = "";
  });
  $("#questGuideForm").addEventListener("submit", event => {
    event.preventDefault();
    if (!localDraft) return;
    try {
      wikiDocument.questGuide = $("#questGuideMarkdown").value;
      saveWikiDraft();
      localStorage.setItem(questGuideKey, JSON.stringify(wikiDocument.questGuide));
      $("#questGuideSaveStatus").textContent = "quest page saved in this browser";
      $("#questGuideForm").hidden = true;
      $("#questGuidePreview").hidden = true;
      $("#questGuideMarkdown").hidden = false;
      $("#toggleQuestWikiPreview").textContent = "preview";
      $("#toggleQuestWikiPreview").setAttribute("aria-pressed", "false");
      renderQuestGuide();
    } catch {
      $("#questGuideSaveStatus").textContent = "could not save this page in browser storage";
    }
  });
  $("#questGuideContent").addEventListener("click", event => {
    const button = event.target.closest("[data-preview-type]");
    if (button) openWikiPreview(button.dataset.previewType, button.dataset.previewTarget);
  });
  $("#questGuidePreview").addEventListener("click", event => {
    const button = event.target.closest("[data-preview-type]");
    if (button) openWikiPreview(button.dataset.previewType, button.dataset.previewTarget);
  });
  window.addEventListener("storage", event => {
    if (event.key === questGuideKey || event.key === null) renderQuestGuide();
  });
  $("#toggleMarkdownPreview").addEventListener("click", () => setMarkdownPreview($("#wikiEditorPreview").hidden));
  $("#chooseWikiImages").addEventListener("click", () => $("#wikiImageFiles").click());
  $("#wikiImageFiles").addEventListener("change", event => {
    if (!localDraft) return;
    insertWikiImages(event.target.files || []);
    event.target.value = "";
  });
  $("#wikiSubpageText").addEventListener("input", () => {
    if (!$("#wikiEditorPreview").hidden) $("#wikiEditorPreview").innerHTML = renderMarkdown($("#wikiSubpageText").value);
  });
  $("#wikiSubpageForm").addEventListener("submit", event => {
    event.preventDefault();
    if (!localDraft) return;
    const item = items.find(entry => entry.name.trim().toLowerCase() === activeItemName.trim().toLowerCase());
    if (!item) return;
    const key = item.name.toLowerCase();
    const pages = Array.isArray(wikiPages[key]) ? [...wikiPages[key]] : [];
    const page = {
      id: activeSubpageId || `wiki-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: $("#wikiSubpageTitle").value.trim(),
      content: $("#wikiSubpageText").value
    };
    const existingIndex = pages.findIndex(entry => entry.id === page.id);
    if (existingIndex >= 0) pages[existingIndex] = page;
    else pages.push(page);
    wikiPages = { ...wikiPages, [key]: pages };
    wikiDocument.itemPages = wikiPages;
    activeSubpageId = page.id;
    try {
      localStorage.setItem(wikiPagesKey, JSON.stringify(wikiPages));
      saveWikiDraft();
      $("#wikiSaveStatus").textContent = "page saved in this browser";
    } catch {
      $("#wikiSaveStatus").textContent = "could not save this page in browser storage";
    }
    renderItemPage(true);
  });

  Promise.all([
    fetch("items.csv", { cache: "no-store" }).then(response => response.ok ? response.text() : ""),
    fetch("inv%20v3.html", { cache: "no-store" }).then(response => response.ok ? response.text() : ""),
    fetch("wiki-content.json", { cache: "no-store" }).then(response => response.ok ? response.json() : {})
  ]).then(([csvText, pageText, publicWiki]) => {
    const catalogItems = csvText ? parseCsv(csvText) : [];
    const baseItems = pageText ? parseBaseItems(pageText) : [];
    items = mergeItems(baseItems, catalogItems);
    window.INVENTORY_WIKI_CONTENT = publicWiki;
    loadWikiDocument();
    renderCustomSections();
    $("#itemCount").textContent = items.length;
    $("#eventCount").textContent = (window.INVENTORY_EVENT_CATALOG || []).length;
    syncProgress();
    $("#badgeCount").textContent = badgeCatalog.length;
    renderAll();
  }).catch(() => { $("#itemCount").textContent = "unavailable"; });
  $("#eventCount").textContent = (window.INVENTORY_EVENT_CATALOG || []).length;
  $("#badgeCount").textContent = (window.INVENTORY_BADGE_CATALOG || []).length;
  syncProgress();
})();
