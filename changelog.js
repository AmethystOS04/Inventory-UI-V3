/* Inventory UI changelog renderer
   Load after changelog data is available, or call InventoryChangelog.load(url)
   Requires a container element with id="changelog-panel".
*/
(function (global) {
  "use strict";

  const CATEGORY_LABELS = {
    added: "added",
    changed: "changed",
    fixed: "fixed",
    removed: "removed",
    notes: "notes"
  };

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
  }

  // Small safe Markdown subset; raw HTML is escaped rather than executed
  function renderMarkdown(source) {
    let value = escapeHTML(source);
    value = value.replace(/```([\s\S]*?)```/g, (_, code) => `<pre><code>${code.trim()}</code></pre>`);
    value = value.replace(/^### (.*)$/gm, "<h3>$1</h3>")
      .replace(/^## (.*)$/gm, "<h2>$1</h2>")
      .replace(/^# (.*)$/gm, "<h1>$1</h1>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/^&gt; (.*)$/gm, "<blockquote>$1</blockquote>")
      .replace(/^\s*[-*] (.*)$/gm, "<li>$1</li>");
    value = value.replace(/(?:<li>.*<\/li>\n?)+/gs, block => `<ul>${block}</ul>`);
    return value.split(/\n{2,}/).map(block =>
      /^<(h[1-3]|ul|pre|blockquote)/.test(block) ? block : `<p>${block.replace(/\n/g, "<br>")}</p>`
    ).join("");
  }

  function render(data, root) {
    if (!root) return;
    const versions = Array.isArray(data?.versions) ? data.versions : [];
    root.innerHTML = `
      <div class="changelog-shell">
        <div class="changelog-current"></div>
        <div class="changelog-history"></div>
      </div>`;
    const current = root.querySelector(".changelog-current");
    const history = root.querySelector(".changelog-history");
    versions.forEach((version, index) => {
      const card = document.createElement("article");
      card.className = "changelog-version";
      const sections = (version.sections || []).filter(entry => entry.status !== "draft");
      card.innerHTML = `
        <header class="changelog-version-heading">
          <div><span class="changelog-kicker">${index === 0 ? "latest release" : "previous release"}</span>
          <h2>${escapeHTML(version.title || `Version ${version.version}`)}</h2></div>
          <span class="changelog-version-number">v${escapeHTML(version.version)}</span>
        </header>
        ${version.date ? `<time>${escapeHTML(version.date)}</time>` : ""}
        ${version.summary ? `<p class="changelog-summary">${escapeHTML(version.summary)}</p>` : ""}
        ${sections.map(entry => `
          <section class="changelog-entry changelog-${escapeHTML(entry.type)}">
            <div class="changelog-entry-type">${escapeHTML(CATEGORY_LABELS[entry.type] || "update")}</div>
            <h3>${escapeHTML(entry.title)}</h3>
            <div class="changelog-entry-description">${renderMarkdown(entry.description || "")}</div>
          </section>`).join("")}`;
      (index === 0 ? current : history).appendChild(card);
    });
    if (!versions.length) root.textContent = "No changelog entries yet";
  }

  const STORAGE_KEY = "inventoryUIChangelogDraftV1";

  function readBrowserData() {
    try {
      const saved = JSON.parse(global.localStorage.getItem(STORAGE_KEY) || "null");
      if (saved && Array.isArray(saved.versions)) return saved;
    } catch (error) {
      console.warn("Could not read the browser changelog data", error);
    }
    return null;
  }

  global.InventoryChangelog = {
    render,
    readBrowserData,
    load(url, root = document.getElementById("changelog-panel")) {
      // The editor and V3 share this key on the same origin, so no JSON export is needed
      const localData = readBrowserData();
      if (localData) {
        render(localData, root);
        return Promise.resolve(localData);
      }

      // Keep the JSON file as a fallback for a fresh browser with no local editor data
      return global.fetch(url, { cache: "no-store" }).then(response => {
        if (!response.ok) throw new Error(`Changelog request failed: ${response.status}`);
        return response.json();
      }).then(data => {
        render(data, root);
        return data;
      });
    }
  };

  // If the editor is open in another tab, refresh the panel as soon as it saves
  global.addEventListener("storage", event => {
    if (event.key !== STORAGE_KEY) return;
    const root = document.getElementById("changelog-panel");
    if (!root) return;
    const data = readBrowserData();
    if (data) render(data, root);
  });
})(window);
