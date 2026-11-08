(() => {
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const sections = [...document.querySelectorAll(".wiki-section")];
  let items = [];
  let search = "";
  let activePage = "home";
  let activeItemName = "";
  let activeSubpageId = "";
  let unlockedBadges = new Set();
  let unmatchedUnlockIds = [];
  let unlockedItems = new Set();
  let badgeCatalog = [...(window.INVENTORY_BADGE_CATALOG || [])];
  let amethystBadgeIds = new Set();
  let wikiPages = {};
  const localDraft = ["localhost", "127.0.0.1", "::1"].includes(location.hostname);
  const wikiPagesKey = "inventoryWikiItemPagesV1";
  const progressKeys = new Set(["inventoryBadgeCatalogV1", "inventoryPrivateBadgeCatalogV1", "inventoryBadgesUnlockedV1", "ownedItemsV2"]);

  function readJson(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value ?? fallback;
    } catch { return fallback; }
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
    const savedPages = readJson(wikiPagesKey, {});
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
    if (activePage === "itemPage") renderItemPage();
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
    sections.forEach(section => section.classList.toggle("active", section.dataset.page === page));
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
    if (file.size <= 1_200_000 || /image\/(?:gif|svg\+xml)/i.test(file.type)) {
      if (file.size > 2_000_000) throw new Error(`${file.name} is too large to embed directly`);
      return directData();
    }
    if (typeof createImageBitmap !== "function") {
      if (file.size > 2_000_000) throw new Error(`${file.name} cannot be resized and is too large to embed`);
      return directData();
    }
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 1600 / bitmap.width, 1600 / bitmap.height);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/webp", 0.86));
      if (!blob || blob.size > 2_000_000) throw new Error(`${file.name} is still too large after resizing`);
      return await readFileAsDataUrl(blob);
    } catch (error) {
      if (error instanceof Error && /too large/.test(error.message)) throw error;
      if (file.size > 2_000_000) throw new Error(`${file.name} could not be resized and is too large to embed`);
      return directData();
    }
  }

  function insertWikiImages(files) {
    const textarea = $("#wikiSubpageText");
    const selectedFiles = [...files].filter(file => /^image\/(?:png|jpeg|gif|webp|svg\+xml)$/i.test(file.type));
    if (!selectedFiles.length) {
      $("#wikiSaveStatus").textContent = "choose png, jpg, gif, webp, or svg image files";
      return;
    }
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
      $("#wikiSaveStatus").textContent = `${images.length} image${images.length === 1 ? "" : "s"} added · save the page to keep them`;
    }).catch(error => {
      $("#wikiSaveStatus").textContent = error.message || "could not add those images";
    });
  }

  function renderItemPage(resetEditor = false) {
    const item = items.find(entry => entry.name.trim().toLowerCase() === activeItemName.trim().toLowerCase());
    if (!item) return;
    const owned = unlockedItems.has(item.name.toLowerCase());
    const family = familyFor(item);
    const images = `<img src="${esc(item.image)}" alt="" loading="lazy">`;
    const itemPages = Array.isArray(wikiPages[item.name.toLowerCase()]) ? wikiPages[item.name.toLowerCase()] : [];
    const activeSubpage = itemPages.find(page => page.id === activeSubpageId);
    $("#itemArticle").innerHTML = `<article class="item-article"><div class="item-article-head">${images}<div><p class="eyebrow">${family ? "item family" : "item page"} · ${owned ? "unlocked in v3" : "not unlocked in v3"}</p><h1>${esc(family ? family.id === "crucibles" ? "Crucible" : family.id === "electric-hammer" ? "Electric Hammer" : "Stormlander" : item.name)}</h1><p>${esc(item.description || "no description in the catalog")}</p></div></div><div class="tag-row"><span class="tag">variant ${esc(item.name)}</span><span class="tag">rarity ${esc(item.rarity || "unrated")}</span><span class="tag">damage ${esc(item.damage || "0")}</span><span class="tag">max level ${esc(item.max_level || "0")}</span><span class="tag">protection ${esc(item.protection || "0")}</span>${item.artifact_power && item.artifact_power !== "0" ? `<span class="tag">artifact power ${esc(item.artifact_power)}</span>` : ""}${item.event ? `<span class="tag">event ${esc(item.event)}</span>` : ""}</div></article>`;
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
    $("#rarityGrid").innerHTML = rarityEntries().map(([name, text]) => `<article class="article-card"><span class="card-kicker">arena rarity</span><h2>${esc(name)}</h2><p>${esc(text)}</p></article>`).join("");
  }

  function renderEvents() {
    const now = Date.now();
    const events = (window.INVENTORY_EVENT_CATALOG || []).filter(event => `${event.name} ${event.items.join(" ")}`.toLowerCase().includes(search));
    $("#eventGrid").innerHTML = events.map(event => {
      const start = new Date(event.start).getTime(), end = new Date(event.end).getTime();
      const state = now < start ? "upcoming" : now <= end ? "live" : "ended";
      const dates = `${new Date(event.start).toLocaleString()} – ${new Date(event.end).toLocaleString()}`;
      return `<article class="article-card"><span class="card-kicker">${state} event</span><h2>${esc(event.name)}</h2><p class="event-date">${esc(dates)}</p><p>featured items</p><div class="tag-row">${event.items.map(name => `<span class="tag">${esc(name)}</span>`).join("")}</div>${event.theme ? `<p>theme preset: ${esc(event.theme)}${event.themeColor ? ` · ${esc(event.themeColor)}` : ""}</p>` : ""}</article>`;
    }).join("");
    if (!events.length) $("#eventGrid").innerHTML = `<div class="empty-state">no matching events</div>`;
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
      if (secret && !unlocked) return `<article class="article-card badge-secret"><span class="card-kicker">${amethyst ? "secret amethyst badge" : "secret badge"} · locked</span><h2>${esc(badge.name)}</h2><p class="secret-placeholder">description and unlock method hidden</p></article>`;
      const label = secret ? `${amethyst ? "secret amethyst badge" : "secret badge"} · unlocked` : `${amethyst ? "amethyst badge" : "badge"} · ${unlocked ? "unlocked" : "locked"}`;
      return `<article class="article-card ${secret ? "badge-secret is-unlocked" : ""}"><span class="card-kicker">${label}</span><h2>${esc(badge.name)}</h2><p>${esc(badge.description || "no description")}</p><p><strong>obtain:</strong> ${esc(requirement(badge))}</p>${badge.rewards ? `<p><strong>reward:</strong> ${esc([badge.rewards.ap && `${badge.rewards.ap} ap`, badge.rewards.mp && `${badge.rewards.mp} mp`, badge.rewards.stardust && `${badge.rewards.stardust} stardust`, badge.rewards.item && `item ${badge.rewards.item}`].filter(Boolean).join(" · ") || "configured reward")}</p>` : ""}</article>`;
    }).join("");
  }

  function renderAll() {
    if (activePage === "items") renderItems();
    if (activePage === "rarities") renderRarities();
    if (activePage === "events") renderEvents();
    if (activePage === "badges") renderBadges();
    if (activePage === "itemPage") renderItemPage();
    const searchable = [...document.querySelectorAll(".wiki-section.active .item-card, .wiki-section.active .article-card, .wiki-section.active .feature-tile, .wiki-section.active .currency-card")];
    searchable.forEach(card => { card.hidden = Boolean(search) && !card.textContent.toLowerCase().includes(search); });
    const hasEntries = searchable.some(card => !card.hidden);
    $("#emptySearch").hidden = !search || hasEntries;
  }

  document.querySelectorAll("[data-section]").forEach(button => button.addEventListener("click", () => go(button.dataset.section)));
  document.querySelectorAll("[data-go]").forEach(button => button.addEventListener("click", () => go(button.dataset.go)));
  $("#wikiSearch").addEventListener("input", event => { search = event.target.value.trim().toLowerCase(); renderAll(); });
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
  $("#toggleMarkdownPreview").addEventListener("click", () => setMarkdownPreview($("#wikiEditorPreview").hidden));
  $("#chooseWikiImages").addEventListener("click", () => $("#wikiImageFiles").click());
  $("#wikiImageFiles").addEventListener("change", event => {
    insertWikiImages(event.target.files || []);
    event.target.value = "";
  });
  $("#wikiSubpageText").addEventListener("input", () => {
    if (!$("#wikiEditorPreview").hidden) $("#wikiEditorPreview").innerHTML = renderMarkdown($("#wikiSubpageText").value);
  });
  $("#wikiSubpageForm").addEventListener("submit", event => {
    event.preventDefault();
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
    activeSubpageId = page.id;
    try {
      localStorage.setItem(wikiPagesKey, JSON.stringify(wikiPages));
      $("#wikiSaveStatus").textContent = "page saved in this browser";
    } catch {
      $("#wikiSaveStatus").textContent = "could not save this page in browser storage";
    }
    renderItemPage(true);
  });

  Promise.all([
    fetch("items.csv", { cache: "no-store" }).then(response => response.ok ? response.text() : ""),
    fetch("inv%20v3.html", { cache: "no-store" }).then(response => response.ok ? response.text() : "")
  ]).then(([csvText, pageText]) => {
    const catalogItems = csvText ? parseCsv(csvText) : [];
    const baseItems = pageText ? parseBaseItems(pageText) : [];
    items = mergeItems(baseItems, catalogItems);
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
