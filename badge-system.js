(() => {
    const catalogKey = "inventoryBadgeCatalogV1";
    const privateCatalogKey = "inventoryPrivateBadgeCatalogV1";
    const unlockedKey = "inventoryBadgesUnlockedV1";
    const adminLockedBadgesKey = "inventoryAdminLockedBadgesV1";
    const unlockAnimationsKey = "inventoryUnlockAnimationsEnabledV1";
    const actionProgressKey = "badgeActionProgressV1";
    const whatBadgeRepairKey = "badgeWhatApRequirementRepairV1";
    const peekStateKey = "badgeSecretPeekStateV1";
    const peekQuestProgressKey = "badgePeekQuestProgressV1";
    const peekPenaltiesDisabledKey = "badgePeekPenaltiesDisabledV1";
    const revealSecretDetailsKey = "badgeRevealSecretDetailsV1";
    const freePeekSecretThreshold = 3;
    const apiCatalogKey = "inventoryBadgeApisV1";
    const customApiErrors = new Set();
    const compiledApiFunctions = new Map();
    const localDraft = ["localhost", "127.0.0.1"].includes(location.hostname);
    const customCodeErrors = new Set();

    function readPublicCatalog() {
        if (localDraft) {
            try {
                const saved = JSON.parse(localStorage.getItem(catalogKey));
                if (Array.isArray(saved)) return saved;
            } catch {}
        }
        return Array.isArray(window.INVENTORY_BADGE_CATALOG) ? window.INVENTORY_BADGE_CATALOG : [];
    }
    function readPrivateCatalog() {
        if (!localDraft) return [];
        try {
            const saved = JSON.parse(localStorage.getItem(privateCatalogKey));
            return Array.isArray(saved) ? saved.filter(badge => badge && badge.id && badge.name) : [];
        } catch {
            return [];
        }
    }
    function readCatalog() { return [...readPublicCatalog(), ...readPrivateCatalog()]; }


    function readCustomApis() {
        if (localDraft) {
            try {
                const saved = JSON.parse(localStorage.getItem(apiCatalogKey));
                if (Array.isArray(saved)) return saved;
            } catch {}
        }
        return Array.isArray(window.INVENTORY_BADGE_APIS) ? window.INVENTORY_BADGE_APIS : [];
    }

    function compileCustomApi(helper) {
        const key = String(helper.key || "").trim().toLowerCase();
        const parameters = Array.isArray(helper.parameters) ? helper.parameters : [];
        if (!/^[a-z][a-z0-9_]*$/.test(key) || parameters.some(name => !/^[a-z_$][a-z0-9_$]*$/i.test(name)) || parameters.includes("api")) return null;
        const code = String(helper.code || "");
        const cacheKey = `${key}\u0000${parameters.join(",")}\u0000${code}`;
        if (!compiledApiFunctions.has(cacheKey)) compiledApiFunctions.set(cacheKey, new Function("api", ...parameters, `"use strict";\n${code}`));
        return { key, parameters, run: compiledApiFunctions.get(cacheKey) };
    }

    function readUnlocked() {
        try {
            const value = JSON.parse(localStorage.getItem(unlockedKey) || "[]");
            return new Set(Array.isArray(value) ? value : []);
        } catch {
            return new Set();
        }
    }
    function readAdminLockedBadges() {
        try {
            const value = JSON.parse(localStorage.getItem(adminLockedBadgesKey) || "[]");
            return new Set(Array.isArray(value) ? value : []);
        } catch {
            return new Set();
        }
    }
    let lastObservedUnlocked = readUnlocked();

    function readActionProgress() {
        try {
            const value = JSON.parse(localStorage.getItem(actionProgressKey) || "{}");
            return value && typeof value === "object" ? value : {};
        } catch {
            return {};
        }
    }

    function readPeekState() {
        try {
            const value = JSON.parse(localStorage.getItem(peekStateKey) || "{}");
            return { freePeekUsed: Boolean(value.freePeekUsed), peeked: Array.isArray(value.peeked) ? value.peeked : [], spentQuests: Math.max(0, Number(value.spentQuests) || 0), penaltyUntil: Math.max(0, Number(value.penaltyUntil) || 0) };
        } catch {
            return { freePeekUsed: false, peeked: [], spentQuests: 0, penaltyUntil: 0 };
        }
    }

    function savePeekState(state) {
        localStorage.setItem(peekStateKey, JSON.stringify(state));
    }

    function questPeekCount() {
        return Math.max(0, Number(localStorage.getItem(peekQuestProgressKey)) || 0);
    }

    function formatPeekTime(milliseconds) {
        const total = Math.max(0, Math.ceil(milliseconds / 1000));
        const days = Math.floor(total / 86400);
        const hours = Math.floor((total % 86400) / 3600);
        const minutes = Math.floor((total % 3600) / 60);
        const seconds = total % 60;
        return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    }

    function conditionObtainText(badge) {
        const condition = badge.condition || {};
        const amount = Math.max(1, Number(condition.amount) || 1);
        const editorActions = {
            "editor:item-save": "save the item catalog",
            "editor:item-publish": "publish the item catalog",
            "editor:daily-quest-save": "save a daily quest",
            "editor:weekly-quest-save": "save a weekly challenge",
            "editor:event-save": "save an event",
            "editor:event-preset": "add an event preset",
            "editor:save-edit": "download an edited player save",
            "editor:badge-create": "create a badge",
            "editor:badge-edit": "edit a badge",
            "editor:badge-remove": "remove a badge",
            "editor:badge-helper-save": "save a badge helper"
        };
        if (condition.type === "editor-action") return `${editorActions[condition.actionKey] || condition.actionKey || "editor action"} ${amount} times`;
        const labels = {
            items: `unlock ${amount} items`,
            seasonal: `unlock ${amount} seasonal items`,
            ap: `reach ${amount} ap`,
            mp: `reach ${amount} mp`,
            item: `unlock ${condition.itemName || "the selected item"}`,
            "item-unlock": `newly unlock ${amount} items`,
            action: `complete ${condition.actionKey || "the custom action"} ${amount} times`,
            "custom-code": "complete its custom code requirement",
            "event-item-unlock": `newly unlock ${amount} event items`,
            "badges-unlocked": `unlock ${amount} badges`,
            "normal-badges": `complete ${amount} normal badges`,
            "one-more-badge": "be the last badge unlocked in its group",
            "all-normal-badges": "complete all other normal badges",
            "secret-badges": `unlock ${amount} secret badges`,
            "all-secret-badges": "complete all other secret badges",
            "all-badges": "complete all other badges",
            "daily-quests": `complete ${amount} daily quests`,
            "event-quest": `complete ${amount} event quests`,
            "weekly-win": `win ${amount} weekly challenges`,
            "arena-kill": `defeat ${amount} arena enemies`,
            enchant: `apply ${amount} enchants`,
            "reality-visit": `change realities ${amount} times`
        };
        if (condition.type === "editor-action") return `do ${condition.actionKey || "an editor action"} ${amount} times`;
        return labels[condition.type] || `meet requirement: ${condition.type || "unknown"}`;
    }

    function dailyQuestsCompleted() {
        return Math.max(0, Number(localStorage.getItem("dailyQuestLifetimeCountV1")) || 0);
    }

    function ownership() {
        try {
            return new Set((JSON.parse(localStorage.getItem("ownedItemsV2") || "[]") || []).map(name => String(name).trim().toLowerCase()));
        } catch {
            return new Set();
        }
    }

    let previousOwnership = ownership();

    function metricFor(badge, unlockedBadges = readUnlocked()) {
        const condition = badge.condition || {};
        const target = Math.max(1, Number(condition.amount) || 1);
        if (condition.type === "item") {
            const found = ownership().has(String(condition.itemName || "").trim().toLowerCase());
            return { value: found ? 1 : 0, target: 1, label: found ? "item unlocked" : `unlock ${condition.itemName || "the selected item"}` };
        }
        if (condition.type === "badges-unlocked") {
            const value = unlockedBadges.size;
            return { value, target, label: `${value} / ${target} badges unlocked` };
        }
        if (["normal-badges", "secret-badges", "one-more-badge", "all-normal-badges", "all-secret-badges", "all-badges"].includes(condition.type)) {
            const catalog = readPublicCatalog().filter(item => item && item.id && item.name);
            if (condition.type === "normal-badges") {
                const normal = catalog.filter(item => !isSecret(item));
                const value = normal.filter(item => unlockedBadges.has(item.id)).length;
                return { value, target, label: `${value} / ${target} normal badges completed` };
            }
            if (condition.type === "secret-badges") {
                const value = catalog.filter(isSecret).filter(item => unlockedBadges.has(item.id)).length;
                return { value, target, label: `${value} / ${target} secret badges unlocked` };
            }
            const group = condition.type === "all-normal-badges"
                ? catalog.filter(item => !isSecret(item))
                : condition.type === "all-secret-badges"
                    ? catalog.filter(isSecret)
                    : condition.type === "one-more-badge"
                        ? catalog.filter(item => isSecret(item) === isSecret(badge))
                        : catalog;
            const remaining = group.filter(item => item.id !== badge.id && !unlockedBadges.has(item.id));
            if (condition.type === "one-more-badge") {
                const left = remaining.length + (unlockedBadges.has(badge.id) ? 0 : 1);
                return { value: remaining.length === 0 ? 1 : 0, target: 1, label: `${left} ${isSecret(badge) ? "secret" : "normal"} badge${left === 1 ? "" : "s"} left in this group` };
            }
            const allOthersUnlocked = remaining.length === 0;
            const groupLabel = condition.type === "all-normal-badges" ? "normal" : condition.type === "all-secret-badges" ? "secret" : "";
            const completed = group.filter(item => item.id !== badge.id && unlockedBadges.has(item.id)).length;
            const total = Math.max(0, group.length - 1);
            const label = allOthersUnlocked
                ? `all other ${groupLabel ? `${groupLabel} ` : ""}badges completed`
                : `${completed} / ${total} other ${groupLabel ? `${groupLabel} ` : ""}badges completed`;
            return { value: allOthersUnlocked ? 1 : 0, target: 1, label };
        }
        if (condition.type === "daily-quests") {
            const value = dailyQuestsCompleted();
            return { value, target, label: `${value} / ${target} daily quests completed` };
        }
        if (condition.type === "custom-code") {
            try {
                const api = {
                    ownsitem: name => ownership().has(String(name || "").trim().toLowerCase()),
                    owneditemcount: () => ownership().size,
                    eventitemsunlocked: () => Number(readActionProgress()["event-item-unlock"]) || 0,
                    badgesunlocked: () => unlockedBadges.size,
                    dailyquestscompleted: dailyQuestsCompleted,
                    hasbadge: id => unlockedBadges.has(String(id || "")),
                    actioncount: key => Number(readActionProgress()[String(key || "").trim().toLowerCase()]) || 0,
                    ap: () => Number(window.getInventoryBalance ? window.getInventoryBalance("ap") : localStorage.getItem("ap")) || 0,
                    mp: () => Number(window.getInventoryBalance ? window.getInventoryBalance("mp") : localStorage.getItem("mp")) || 0
                };
                for (const helper of readCustomApis()) {
                    try {
                        const compiled = compileCustomApi(helper || {});
                        if (!compiled || Object.prototype.hasOwnProperty.call(api, compiled.key)) continue;
                        api[compiled.key] = (...args) => compiled.run(api, ...args);
                    } catch (error) {
                        const key = String(helper?.key || "unnamed");
                        if (!customApiErrors.has(key)) {
                            customApiErrors.add(key);
                            console.warn(`custom badge api failed to load: ${key}`, error);
                        }
                    }
                }
                Object.freeze(api);
                const result = new Function("api", `"use strict";\n${String(condition.code || "")}`)(api);
                return { value: result ? 1 : 0, target: 1, label: result ? "custom condition met" : "custom condition" };
            } catch (error) {
                if (!customCodeErrors.has(badge.id)) {
                    customCodeErrors.add(badge.id);
                    console.warn(`badge code failed for ${badge.name || badge.id}`, error);
                }
                return { value: 0, target: 1, label: "custom code error" };
            }
        }
        if (condition.type === "ap" || condition.type === "mp") {
            const balance = window.getInventoryBalance ? Number(window.getInventoryBalance(condition.type)) : Number(localStorage.getItem(condition.type)) || 0;
            return { value: balance, target, label: `${window.formatInventoryNumber ? window.formatInventoryNumber(balance) : balance} / ${window.formatInventoryNumber ? window.formatInventoryNumber(target) : target} ${condition.type}` };
        }
        if (["action", "editor-action", "item-unlock", "event-item-unlock", "event-quest", "weekly-win", "arena-kill", "enchant", "reality-visit"].includes(condition.type)) {
            const key = condition.type === "action" || condition.type === "editor-action" ? String(condition.actionKey || "") : condition.type;
            const value = Number(readActionProgress()[key]) || 0;
            const label = condition.type === "action"
                ? `${key}: ${value} / ${target}`
                : condition.type === "editor-action"
                    ? `${conditionObtainText({ condition: { ...condition, amount: target } })}: ${value} / ${target}`
                    : `${value} / ${target} ${condition.type.replaceAll("-", " ")}`;
            return { value, target, label };
        }
        const owned = ownership();
        const cards = Array.from(document.querySelectorAll(".items .item"));
        const names = cards.map(card => card.dataset.itemName).filter(Boolean);
        const seasonal = new Set(cards.filter(card => ["true", "1", "yes"].includes(String(card.dataset.seasonal || "").toLowerCase())).map(card => card.dataset.itemName).filter(Boolean));
        const value = condition.type === "seasonal"
            ? Array.from(seasonal).filter(name => owned.has(name.trim().toLowerCase())).length
            : Array.from(new Set(names)).filter(name => owned.has(name.trim().toLowerCase())).length;
        const typeLabel = condition.type === "seasonal" ? "seasonal items" : "items unlocked";
        return { value, target, label: `${value} / ${target} ${typeLabel}` };
    }

    const panel = document.querySelector(".panel");
    const toast = document.createElement("div");
    toast.id = "badgeUnlockToast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    panel?.append(toast);
    const shownBadgeIds = new Set();

    function showUnlockToast(current, delay = 0) {
        if (localStorage.getItem(unlockAnimationsKey) === "false" || !current?.id || shownBadgeIds.has(current.id)) return;
        shownBadgeIds.add(current.id);
        const card = document.createElement("article");
        card.className = "badge-unlock-card";
        card.style.setProperty("--badge-delay", `${Math.max(0, Number(delay) || 0)}ms`);
        const heading = document.createElement("strong");
        heading.className = "badge-unlock-label";
        heading.textContent = "unlocked badge";
        const body = document.createElement("div");
        body.className = "badge-unlock-body";
        const frame = document.createElement("div");
        frame.className = "badge-frame";
        frame.style.setProperty("--badge-border-color", current.borderColor || "#a84cff");
        frame.style.setProperty("--badge-border-style", current.borderStyle || "solid");
        frame.style.setProperty("--badge-border-width", `${Math.min(12, Math.max(1, Number(current.borderWidth) || 2))}px`);
        frame.style.setProperty("--badge-frame-size", `${Math.min(180, Math.max(24, Number(current.frameSize) || 64))}px`);
        frame.style.setProperty("--badge-icon-size", `${Math.min(160, Math.max(12, Number(current.iconSize) || 40))}px`);
        if (current.borderImage) {
            frame.classList.add("has-border-image");
            frame.style.setProperty("--badge-border-image", `url("${String(current.borderImage).replaceAll('"', "\\\"")}")`);
        }
        const icon = document.createElement("img");
        icon.className = "badge-icon";
        icon.alt = "";
        icon.src = current.icon || "";
        icon.hidden = !current.icon;
        frame.append(icon);
        const copy = document.createElement("div");
        copy.className = "badge-unlock-copy";
        const name = document.createElement("strong");
        name.textContent = current.name || "unnamed badge";
        const description = document.createElement("span");
        description.textContent = current.description || "you earned this badge";
        copy.append(name, description);
        body.append(frame, copy);
        card.append(heading, body);
        toast.prepend(card);
        window.setTimeout(() => {
            card.classList.add("is-leaving");
            card.addEventListener("animationend", () => card.remove(), { once: true });
            window.setTimeout(() => card.remove(), 650);
        }, Math.max(0, Number(delay) || 0) + 5200);
    }

    function replayUnlockedBadges() {
        if (localStorage.getItem(unlockAnimationsKey) === "false") return;
        const unlocked = readUnlocked();
        const earned = readCatalog().filter(badge => badge?.id && unlocked.has(badge.id));
        earned.forEach((badge, index) => showUnlockToast(badge, index * 90));
    }

    const button = document.createElement("button");
    button.id = "openBadgesPanel";
    button.type = "button";
    button.textContent = "badges";
    document.querySelector(".portal-panel")?.append(button);

    const dialog = document.createElement("dialog");
    dialog.id = "badgesDialog";
    dialog.setAttribute("aria-labelledby", "badgesTitle");
    dialog.innerHTML = `<div class="badges-heading"><h2 id="badgesTitle">badges</h2><button id="closeBadgesPanel" type="button">close</button></div><div class="badge-progress-row"><div id="badgeCollectionProgress" class="badge-progress" role="progressbar" aria-label="badge collection progress" aria-valuemin="0" aria-valuemax="0" aria-valuenow="0"><div id="badgeCollectionFill" class="badge-progress-fill"></div><span class="badge-progress-label">progress</span><span id="badgeCollectionCount" class="badge-progress-count">0 / 0 (0%)</span></div><img id="badgeProgressionStar" class="badge-progression-star" alt="" hidden></div><div class="badge-list-toolbar"><label>view <select id="badgeViewMode" aria-label="badge list view"><option value="grid">grid</option><option value="list">list</option></select></label><span id="badgePeekStatus" aria-live="polite"></span></div><nav id="badgeCategoryTabs" class="badge-category-tabs" role="tablist" aria-label="badge categories"><button type="button" role="tab" data-badge-category="normal-unlocked" aria-selected="true">normal unlocked <span class="badge-category-count">0</span></button><button type="button" role="tab" data-badge-category="normal-locked" aria-selected="false">normal locked <span class="badge-category-count">0</span></button><button type="button" role="tab" data-badge-category="secret-unlocked" aria-selected="false">secret unlocked <span class="badge-category-count">0</span></button><button type="button" role="tab" data-badge-category="secret-locked" aria-selected="false">secret locked <span class="badge-category-count">?</span></button><button type="button" role="tab" data-badge-category="all-unlocked" aria-selected="false">all badges unlocked <span class="badge-category-count">0</span></button><button type="button" role="tab" data-badge-category="all-locked" aria-selected="false">all badges locked <span class="badge-category-count">0</span></button><button type="button" role="tab" data-badge-category="amethyst" aria-selected="false" hidden>amethyst's badges <span class="badge-category-count">0</span></button></nav><section class="badge-list-panel badge-category-panel"><h3 id="badgeCategoryHeading">normal unlocked</h3><div id="badgeCategoryList" class="badge-list grid-view" role="tabpanel" aria-live="polite"></div></section>`;
    document.body.append(dialog);

    const style = document.createElement("style");
    style.textContent = `
        #openBadgesPanel,#closeBadgesPanel{border:1px solid var(--reality-border,#00f7ff);border-radius:8px;padding:8px 11px;color:var(--reality-accent-2,#70eaff);background:var(--reality-panel,#15121d);font:inherit;cursor:pointer}
        #badgesDialog{width:min(860px,94vw);max-height:min(720px,88vh);padding:18px;border:1px solid var(--reality-border,#00f7ff);border-radius:16px;color:var(--reality-text,#fff);background:var(--reality-panel,#080c13);box-shadow:0 0 28px color-mix(in srgb,var(--reality-border,#00f7ff) 32%,transparent)}
        #badgesDialog::backdrop{background:rgba(2,4,12,.78);backdrop-filter:blur(4px)}
        .badges-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}.badges-heading h2{margin:0;color:var(--reality-accent,#ff00ff);text-transform:lowercase}
        .badge-progress-row{display:flex;align-items:center;gap:12px;margin:0 0 14px}.badge-progress{position:relative;isolation:isolate;display:flex;align-items:center;justify-content:space-between;gap:12px;flex:1;min-width:0;min-height:60px;overflow:hidden;padding:8px 16px;border:3px solid #f6dfca;border-radius:15px;background:#281c20;color:#442630;box-shadow:0 0 0 1px #6d4548 inset}.badge-progress::after{position:absolute;inset:0;z-index:-1;content:"";background:repeating-linear-gradient(90deg,transparent 0 calc(10% - 2px),#8a6b68 calc(10% - 2px) 10%);opacity:.28;pointer-events:none}.badge-progress-fill{position:absolute;inset:0 auto 0 0;z-index:-1;width:0;background:linear-gradient(90deg,#ffe0bd,#ffc998);transition:width .45s ease}.badge-progress-label,.badge-progress-count{font-size:clamp(14px,2vw,25px);font-weight:900;text-transform:uppercase;text-shadow:0 1px 0 #fff4}.badge-progress-label{white-space:nowrap}.badge-progress-count{margin-left:auto;text-align:right;white-space:nowrap}.badge-progression-star{width:48px;height:48px;flex:none;object-fit:contain;filter:drop-shadow(0 0 8px #ffd680)}
        .badge-list-panel{min-width:0;padding:12px;border:1px solid color-mix(in srgb,var(--reality-border,#00f7ff) 45%,transparent);border-radius:12px;background:color-mix(in srgb,var(--reality-panel,#171a24) 90%,#000)}
        .badge-category-tabs{display:flex;flex-wrap:wrap;gap:7px;margin:0 0 10px}.badge-category-tabs button{display:inline-flex;align-items:center;gap:7px;padding:7px 9px;border:1px solid color-mix(in srgb,var(--reality-border,#00f7ff) 45%,transparent);border-radius:9px;color:var(--reality-text,#fff);background:#0a0d15;font:inherit;font-size:12px;text-transform:lowercase;cursor:pointer}.badge-category-tabs button[hidden]{display:none}.badge-category-tabs button[aria-selected="true"]{border-color:var(--reality-accent-2,#70eaff);color:var(--reality-accent-2,#70eaff);box-shadow:0 0 10px color-mix(in srgb,var(--reality-border,#00f7ff) 24%,transparent)}.badge-category-count{color:var(--reality-accent-2,#70eaff);font-size:11px}.badge-category-panel h3{display:flex;justify-content:space-between;margin:0 0 10px;color:var(--reality-accent,#ff00ff);font-size:14px;text-transform:lowercase}.badge-list-empty{padding:14px;color:var(--reality-muted,#aaa);text-align:center;font-size:13px}.badge-entry.is-hidden-secret{justify-content:center;color:var(--reality-muted,#aaa);font-size:13px}
        .badge-list-panel h3{display:flex;justify-content:space-between;margin:0 0 10px;color:var(--reality-accent,#ff00ff);font-size:14px}.badge-list-panel h3 span{color:var(--reality-accent-2,#70eaff)}.badge-list{display:grid;gap:8px;max-height:56vh;overflow:auto;padding:2px}
        .badge-list-toolbar{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 0 10px;color:var(--reality-muted,#aaa);font-size:12px}.badge-list-toolbar label{display:flex;align-items:center;gap:7px}.badge-list-toolbar select{border:1px solid color-mix(in srgb,var(--reality-border,#00f7ff) 45%,transparent);border-radius:7px;padding:5px 8px;color:var(--reality-text,#fff);background:#0a0d15;font:inherit}.badge-list-toolbar #badgePeekStatus{color:var(--reality-accent-2,#70eaff);text-align:right}.badge-list.grid-view{grid-template-columns:repeat(auto-fill,minmax(min(100%,290px),1fr))}.badge-list.list-view{grid-template-columns:1fr}.badge-obtain{color:var(--reality-accent-2,#70eaff)!important}
        .badge-entry{display:flex;align-items:center;gap:10px;min-height:66px;padding:8px;border:1px solid color-mix(in srgb,var(--reality-border,#00f7ff) 24%,transparent);border-radius:12px;background:#070a11}.badge-entry.is-locked{opacity:.58;filter:saturate(.55)}.badge-entry.is-unlocked{box-shadow:0 0 12px color-mix(in srgb,var(--badge-border-color) 35%,transparent)}
        .badge-frame{display:grid;place-items:center;position:relative;flex:none;width:var(--badge-frame-size,64px);height:var(--badge-frame-size,64px);padding:0;border:var(--badge-border-width) var(--badge-border-style) var(--badge-border-color);border-radius:12px;background:#15101d center/100% 100% no-repeat}.badge-frame.has-border-image{border-color:transparent;background-image:var(--badge-border-image);border-radius:0}.badge-icon{width:var(--badge-icon-size,40px);height:var(--badge-icon-size,40px);object-fit:contain}.badge-copy{display:grid;gap:4px;min-width:0}.badge-copy strong{color:var(--reality-text,#fff);overflow-wrap:anywhere}.badge-copy span{color:var(--reality-muted,#aaa);font-size:11px}
        #badgeUnlockToast{position:absolute;top:16px;right:16px;z-index:12;display:grid;gap:8px;width:min(420px,calc(100% - 32px));max-height:calc(100% - 32px);overflow:auto;padding:2px;color:#fff;pointer-events:auto}
        .badge-unlock-card{display:grid;gap:5px;padding:9px 12px;border:1px solid #e4a5ff;border-radius:13px;background:linear-gradient(135deg,#2c1041f2,#101020f2);box-shadow:0 0 18px #c153ff66;animation:badgeUnlockEnter .42s cubic-bezier(.2,.85,.25,1) both;animation-delay:var(--badge-delay,0ms)}.badge-unlock-card.is-leaving{animation:badgeUnlockExit .3s ease-in forwards;animation-delay:0s;pointer-events:none}
        .badge-unlock-label{color:#f3caff;font-size:11px;letter-spacing:.06em}.badge-unlock-body{display:flex;align-items:center;gap:10px;min-width:0}.badge-unlock-copy{display:grid;gap:3px;min-width:0}.badge-unlock-copy strong{font-size:16px;overflow-wrap:anywhere;text-shadow:0 0 9px #dc77ff}.badge-unlock-copy span{color:#d6c5df;font-size:12px;overflow-wrap:anywhere}
        @keyframes badgeUnlockEnter{from{opacity:0;transform:translateX(24px) scale(.97)}to{opacity:1;transform:translateX(0) scale(1)}}
        @keyframes badgeUnlockExit{to{opacity:0;transform:translateX(24px) scale(.97)}}
        @media(max-width:620px){.badge-list{max-height:30vh}.badge-category-tabs button{flex:1 1 calc(50% - 7px);justify-content:space-between}#badgeUnlockToast{top:8px;right:8px;width:calc(100% - 16px);max-height:55%}}
        @media(prefers-reduced-motion:reduce){.badge-unlock-card{animation:none}}
    `;
    document.head.append(style);


    function createBadgeRow(badge, unlocked) {
        const row = document.createElement("article");
        row.className = `badge-entry${unlocked ? " is-unlocked" : " is-locked"}`;
        row.style.setProperty("--badge-border-color", badge.borderColor || "#a84cff");
        row.style.setProperty("--badge-border-style", badge.borderStyle || "solid");
        row.style.setProperty("--badge-border-width", `${Math.min(12, Math.max(1, Number(badge.borderWidth) || 2))}px`);
        const frame = document.createElement("div");
        frame.className = "badge-frame";
        frame.style.setProperty("--badge-border-color", badge.borderColor || "#a84cff");
        frame.style.setProperty("--badge-border-style", badge.borderStyle || "solid");
        frame.style.setProperty("--badge-border-width", `${Math.min(12, Math.max(1, Number(badge.borderWidth) || 2))}px`);
        frame.style.setProperty("--badge-frame-size", `${Math.min(180, Math.max(24, Number(badge.frameSize) || 64))}px`);
        frame.style.setProperty("--badge-icon-size", `${Math.min(160, Math.max(12, Number(badge.iconSize) || 40))}px`);
        if (badge.borderImage) {
            frame.classList.add("has-border-image");
            frame.style.setProperty("--badge-border-image", `url("${String(badge.borderImage).replaceAll('"', "\\\"")}")`);
        }
        const icon = document.createElement("img");
        icon.className = "badge-icon";
        icon.alt = "";
        if (badge.icon) icon.src = badge.icon;
        else icon.hidden = true;
        frame.append(icon);
        const text = document.createElement("div");
        text.className = "badge-copy";
        const title = document.createElement("strong");
        title.textContent = badge.name || "unnamed badge";
        const description = document.createElement("span");
        const revealSecretDetails = localStorage.getItem(revealSecretDetailsKey) === "true";
        const peekedSecret = isSecret(badge) && !unlocked && !revealSecretDetails && readPeekState().peeked.includes(badge.id);
        description.textContent = peekedSecret ? "secret badge preview" : badge.description || (unlocked ? "unlocked" : "");
        text.append(title);
        if (description.textContent) text.append(description);
        if (!peekedSecret) {
            const obtain = document.createElement("span");
            obtain.className = "badge-obtain";
            obtain.textContent = `obtain: ${conditionObtainText(badge)}`;
            text.append(obtain);
        }
        row.append(frame, text);
        return row;
    }

    function isSecret(badge) {
        return badge?.visibility === "secret" || badge?.secret === true;
    }

    let activeBadgeCategory = "normal-unlocked";

    function createPeekSecretRow(remainingSecretCount, state = readPeekState()) {
        const row = document.createElement("article");
        row.className = "badge-entry is-locked is-hidden-secret";
        const copy = document.createElement("div");
        copy.className = "badge-copy";
        const label = document.createElement("strong");
        label.textContent = "hidden secret badge";
        const detail = document.createElement("span");
        const unlockedSecretCount = readPublicCatalog().filter(badge => badge?.id && isSecret(badge) && readUnlocked().has(badge.id)).length;
        const freeAvailable = unlockedSecretCount >= freePeekSecretThreshold && !state.freePeekUsed;
        const penaltiesDisabled = localStorage.getItem(peekPenaltiesDisabledKey) === "true";
        const penaltyRemaining = state.penaltyUntil - Date.now();
        const completeCount = questPeekCount() - state.spentQuests;
        const questsLeft = Math.max(0, 6 - completeCount);
        if (penaltiesDisabled) {
            detail.textContent = `${remainingSecretCount} secret badge${remainingSecretCount === 1 ? "" : "s"} hidden · peeks are free`;
        } else if (penaltyRemaining > 0) {
            detail.textContent = `penalty ${formatPeekTime(penaltyRemaining)} · refreshes ×9 · arena quests ×3`;
        } else if (freeAvailable) {
            detail.textContent = `earn ${freePeekSecretThreshold} secret badges for one free peek · ${unlockedSecretCount} unlocked`;
        } else {
            detail.textContent = `${Math.min(6, completeCount)} / 6 quests · next peek starts a 3 day penalty: refreshes ×9, arena quests ×3`;
        }
        const action = document.createElement("button");
        action.type = "button";
        action.dataset.peekSecret = "true";
        action.textContent = penaltiesDisabled ? "free peek" : freeAvailable ? "use free peek" : completeCount >= 6 ? "peek · starts 3 day penalty" : `peek · ${questsLeft} quests left`;
        action.disabled = !penaltiesDisabled && !freeAvailable && (penaltyRemaining > 0 || completeCount < 6);
        copy.append(label, detail, action);
        row.append(copy);
        return row;
    }

    function createEmptyBadgeState() {
        const message = document.createElement("div");
        message.className = "badge-list-empty";
        message.textContent = "nothing here yet";
        return message;
    }

    function peekAtSecretBadge() {
        const catalog = readPublicCatalog().filter(badge => badge?.id && badge.name && isSecret(badge));
        const unlocked = readUnlocked();
        const state = readPeekState();
        const target = catalog.find(badge => !unlocked.has(badge.id) && !state.peeked.includes(badge.id));
        if (!target) return;
        const secretUnlockedCount = catalog.filter(badge => unlocked.has(badge.id)).length;
        const freeAvailable = secretUnlockedCount >= freePeekSecretThreshold && !state.freePeekUsed;
        const penaltiesDisabled = localStorage.getItem(peekPenaltiesDisabledKey) === "true";
        const questProgress = questPeekCount();
        if (penaltiesDisabled) {
            // admin setting bypasses the quest requirement and peek penalty
        } else if (!freeAvailable) {
            if (state.penaltyUntil > Date.now()) return;
            if (questProgress - state.spentQuests < 6) return;
            state.spentQuests += 6;
            state.penaltyUntil = Date.now() + 3 * 24 * 60 * 60 * 1000;
        } else {
            state.freePeekUsed = true;
        }
        state.peeked.push(target.id);
        savePeekState(state);
        render();
    }

    function refreshPeekStatus() {
        const status = document.getElementById("badgePeekStatus");
        if (!status) return;
        const state = readPeekState();
        if (localStorage.getItem(peekPenaltiesDisabledKey) === "true") {
            status.textContent = "badge peek penalties disabled · peeks are free";
            return;
        }
        const remaining = state.penaltyUntil - Date.now();
        const questsNeeded = Math.max(0, 6 - (questPeekCount() - state.spentQuests));
        status.textContent = remaining > 0
            ? `penalty ${formatPeekTime(remaining)} · refreshes ×9 · arena quests ×3`
            : state.freePeekUsed
                ? `${questsNeeded} quests until next peek · then 3 day penalty`
                : `free peek at ${freePeekSecretThreshold} secret badges`;
    }

    function updateProgress(catalog, unlocked, options = {}) {
        const total = catalog.length;
        const unlockedTotal = catalog.filter(badge => unlocked.has(badge.id)).length;
        const percent = total ? Math.round((unlockedTotal / total) * 100) : 0;
        const progress = document.getElementById("badgeCollectionProgress");
        document.getElementById("badgeCollectionFill").style.width = `${percent}%`;
        document.getElementById("badgeCollectionCount").textContent = `${unlockedTotal} / ${total} (${percent}%)`;
        progress.setAttribute("aria-valuemax", String(total));
        progress.setAttribute("aria-valuenow", String(unlockedTotal));
        const star = document.getElementById("badgeProgressionStar");
        const secret = catalog.filter(isSecret);
        const normal = catalog.filter(badge => !isSecret(badge));
        const unlockedNormal = normal.filter(badge => unlocked.has(badge.id)).length;
        const allNormalComplete = normal.length > 0 && unlockedNormal === normal.length;
        const allBadgesComplete = catalog.length > 0 && catalog.every(badge => unlocked.has(badge.id));
        if (allBadgesComplete && options.privateCollection) {
            star.src = "AmethystProgressionStar1.png";
            star.alt = "amethyst's badge collection complete";
            star.title = "all amethyst badges unlocked";
            star.hidden = false;
        } else if (!options.privateCollection && allBadgesComplete && secret.length > 0) {
            star.src = "SecretProgressionStar1.png";
            star.alt = "secret badge collection complete";
            star.title = "all badges, including secrets, unlocked";
            star.hidden = false;
        } else if (!options.privateCollection && allNormalComplete) {
            star.src = "ProgressionStar1.png";
            star.alt = "badge collection complete";
            star.title = "all normal badges unlocked";
            star.hidden = false;
        } else {
            star.hidden = true;
            star.removeAttribute("src");
        }
    }

    function render() {
        const catalog = readPublicCatalog().filter(badge => badge && badge.id && badge.name);
        const privateCatalog = readPrivateCatalog();
        const unlocked = readUnlocked();
        const unlockedBadges = catalog.filter(badge => unlocked.has(badge.id));
        const lockedBadges = catalog.filter(badge => !unlocked.has(badge.id));
        const normalUnlocked = unlockedBadges.filter(badge => !isSecret(badge));
        const normalLocked = lockedBadges.filter(badge => !isSecret(badge));
        const secretUnlocked = unlockedBadges.filter(isSecret);
        const secretLocked = lockedBadges.filter(isSecret);
        const peekState = readPeekState();
        const peekedSecrets = secretLocked.filter(badge => peekState.peeked.includes(badge.id));
        const unopenedSecrets = secretLocked.filter(badge => !peekState.peeked.includes(badge.id));
        const revealSecretDetails = localStorage.getItem(revealSecretDetailsKey) === "true";
        const visibleLockedSecrets = revealSecretDetails ? secretLocked : peekedSecrets;
        const hiddenSecretCount = revealSecretDetails ? 0 : unopenedSecrets.length;
        const categories = {
            "normal-unlocked": { title: "normal unlocked", badges: normalUnlocked, hiddenSecret: false },
            "normal-locked": { title: "normal locked", badges: normalLocked, hiddenSecret: false },
            "secret-unlocked": { title: "secret unlocked", badges: secretUnlocked, hiddenSecret: false },
            "secret-locked": { title: "secret locked", badges: visibleLockedSecrets, hiddenSecret: hiddenSecretCount > 0 },
            "all-unlocked": { title: "all badges unlocked", badges: unlockedBadges, hiddenSecret: false },
            "all-locked": { title: "all badges locked", badges: [...normalLocked, ...visibleLockedSecrets], hiddenSecret: hiddenSecretCount > 0 },
            "amethyst": { title: "amethyst's badges", badges: privateCatalog, hiddenSecret: false }
        };
        const privateTab = dialog.querySelector('[data-badge-category="amethyst"]');
        privateTab.hidden = !localDraft;
        privateTab.querySelector(".badge-category-count").textContent = String(privateCatalog.length);
        if (!localDraft && activeBadgeCategory === "amethyst") activeBadgeCategory = "normal-unlocked";
        if (!categories[activeBadgeCategory]) activeBadgeCategory = "normal-unlocked";
        for (const tab of dialog.querySelectorAll("[data-badge-category]")) {
            const key = tab.dataset.badgeCategory;
            const category = categories[key];
            tab.setAttribute("aria-selected", String(key === activeBadgeCategory));
            const count = tab.querySelector(".badge-category-count");
            count.textContent = key === "secret-locked" && secretLocked.length && !revealSecretDetails
                ? "?"
                : String(category.badges.length + (category.hiddenSecret ? 1 : 0));
        }
        const category = categories[activeBadgeCategory];
        const list = document.getElementById("badgeCategoryList");
        list.replaceChildren();
        list.classList.toggle("grid-view", document.getElementById("badgeViewMode").value === "grid");
        list.classList.toggle("list-view", document.getElementById("badgeViewMode").value === "list");
        document.getElementById("badgeCategoryHeading").textContent = category.title;
        for (const badge of category.badges) list.append(createBadgeRow(badge, unlocked.has(badge.id)));
        if (category.hiddenSecret) list.append(createPeekSecretRow(unopenedSecrets.length, peekState));
        if (!list.childElementCount) list.append(createEmptyBadgeState());
        if (activeBadgeCategory === "amethyst" && localDraft) {
            updateProgress(privateCatalog, unlocked, { privateCollection: true });
        } else {
            updateProgress(catalog, unlocked);
        }
        refreshPeekStatus();
    }

    function checkUnlocks() {
        const currentOwnership = ownership();
        for (const name of currentOwnership) {
            if (!previousOwnership.has(name)) trackAction("item-unlock", 1, false);
        }
        previousOwnership = currentOwnership;
        const catalog = readCatalog();
        const unlocked = readUnlocked();
        if (localStorage.getItem(whatBadgeRepairKey) !== "true") {
            const savedAp = Number(window.getInventoryBalance ? window.getInventoryBalance("ap") : localStorage.getItem("ap")) || 0;
            if (unlocked.has("what") && savedAp < 4444444444444444444444444) {
                unlocked.delete("what");
                localStorage.setItem(unlockedKey, JSON.stringify(Array.from(unlocked)));
            }
            localStorage.setItem(whatBadgeRepairKey, "true");
        }
        const adminLocked = readAdminLockedBadges();
        const newlyUnlocked = [];
        for (const badge of catalog) {
            if (!badge?.id || adminLocked.has(badge.id) || unlocked.has(badge.id)) continue;
            const progress = metricFor(badge, unlocked);
            if (progress.value >= progress.target) {
                unlocked.add(badge.id);
                newlyUnlocked.push(badge);
            }
        }
        const newlyGranted = catalog.filter(badge => badge?.id && unlocked.has(badge.id) && !lastObservedUnlocked.has(badge.id));
        const announcements = Array.from(new Map([...newlyGranted, ...newlyUnlocked].map(badge => [badge.id, badge])).values());
        if (newlyUnlocked.length) {
            localStorage.setItem(unlockedKey, JSON.stringify(Array.from(unlocked)));
        }
        announcements.forEach((badge, index) => showUnlockToast(badge, index * 90));
        lastObservedUnlocked = new Set(unlocked);
        render();
    }

    window.grantInventoryBadges = function (ids) {
        const catalogIds = new Set(readCatalog().map(badge => badge?.id).filter(Boolean));
        const unlocked = readUnlocked();
        const requested = (Array.isArray(ids) ? ids : [ids]).filter(id => catalogIds.has(id));
        const adminLocked = readAdminLockedBadges();
        requested.forEach(id => { unlocked.add(id); adminLocked.delete(id); });
        localStorage.setItem(adminLockedBadgesKey, JSON.stringify(Array.from(adminLocked)));
        localStorage.setItem(unlockedKey, JSON.stringify(Array.from(unlocked)));
        checkUnlocks();
    };

    window.lockInventoryBadges = function (ids) {
        const catalogIds = new Set(readCatalog().map(badge => badge?.id).filter(Boolean));
        const requested = (Array.isArray(ids) ? ids : [ids]).filter(id => catalogIds.has(id));
        const unlocked = readUnlocked();
        const adminLocked = readAdminLockedBadges();
        requested.forEach(id => { unlocked.delete(id); adminLocked.add(id); });
        localStorage.setItem(adminLockedBadgesKey, JSON.stringify(Array.from(adminLocked)));
        localStorage.setItem(unlockedKey, JSON.stringify(Array.from(unlocked)));
        lastObservedUnlocked = new Set(unlocked);
        render();
    };

    function trackAction(key, amount = 1, shouldCheck = true) {
        const normalized = String(key || "").trim().toLowerCase();
        if (!normalized) return;
        const progress = readActionProgress();
        progress[normalized] = (Number(progress[normalized]) || 0) + Math.max(0, Number(amount) || 0);
        localStorage.setItem(actionProgressKey, JSON.stringify(progress));
        if (shouldCheck) checkUnlocks();
    }
    window.refreshInventoryBadges = checkUnlocks;
    window.triggerBadgeAction = trackAction;
    window.triggerbadgeaction = trackAction;

    const originalApplyEnchant = window.applyEnchant;
    if (typeof originalApplyEnchant === "function") {
        window.applyEnchant = function (...args) {
            const select = document.getElementById("enchantSelect");
            const result = originalApplyEnchant.apply(this, args);
            if (select?.selectedIndex > 0) trackAction("enchant", 1);
            return result;
        };
    }
    document.getElementById("realitySelect")?.addEventListener("change", () => trackAction("reality-visit", 1));

    let closingTimer;
    function openPanel() {
        checkUnlocks();
        window.clearTimeout(closingTimer);
        dialog.showModal();
    }
    function closePanel() {
        if (dialog.open) dialog.close();
    }
    button.addEventListener("click", openPanel);
    dialog.querySelector("#closeBadgesPanel").addEventListener("click", closePanel);
    const badgeViewMode = dialog.querySelector("#badgeViewMode");
    badgeViewMode.value = localStorage.getItem("inventoryBadgeViewModeV1") === "list" ? "list" : "grid";
    badgeViewMode.addEventListener("change", () => {
        localStorage.setItem("inventoryBadgeViewModeV1", badgeViewMode.value);
        render();
    });
    dialog.querySelector("#badgeCategoryTabs").addEventListener("click", event => {
        const tab = event.target.closest("[data-badge-category]");
        if (!tab) return;
        activeBadgeCategory = tab.dataset.badgeCategory;
        render();
    });
    dialog.querySelector("#badgeCategoryList").addEventListener("click", event => {
        if (event.target.closest("[data-peek-secret]")) peekAtSecretBadge();
    });
    dialog.addEventListener("click", event => { if (event.target === dialog) closePanel(); });
    dialog.addEventListener("cancel", event => { event.preventDefault(); closePanel(); });
    window.addEventListener("inventory-badge-peek-settings-changed", render);
    window.addEventListener("storage", event => {
        if ([catalogKey, privateCatalogKey, unlockedKey, adminLockedBadgesKey, actionProgressKey, peekStateKey, peekQuestProgressKey, peekPenaltiesDisabledKey, revealSecretDetailsKey, "ownedItemsV2", "ap", "mp"].includes(event.key)) checkUnlocks();
    });
    document.querySelector(".items")?.addEventListener("click", () => window.setTimeout(checkUnlocks, 0));
    window.setInterval(checkUnlocks, 3000);
    window.setInterval(refreshPeekStatus, 1000);
    checkUnlocks();
    window.setTimeout(replayUnlockedBadges, 250);
})();
