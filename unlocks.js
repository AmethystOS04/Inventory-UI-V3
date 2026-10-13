(() => {
    const storageKey = "ownedItemsV2";
    const cardSelector = ".items .item";
    const itemNamePattern = /showItem\(\s*'((?:\\.|[^'\\])*)'/;
    const originalShowItem = window.showItem;
    const originalChooseStarter = window.chooseStarter;
    let pendingCard = null;

    function cardName(card) {
        if (card.dataset.itemName) return card.dataset.itemName;
        const match = (card.getAttribute("onclick") || "").match(itemNamePattern);
        if (!match) return "";
        return match[1].replace(/\\'/g, "'").replace(/\\\\/g, "\\");
    }

    let cards = Array.from(document.querySelectorAll(cardSelector));
    const originalOrder = new Map(cards.map((card, index) => [card, index]));
    const itemsGrid = document.querySelector(".items");
    const itemSort = document.getElementById("itemSort");
    const currentNames = Array.from(new Set(cards.map(cardName).filter(Boolean)));
    const eventStorageKey = "inventoryEventsV1";
    const eventItemHistoryStorageKey = "eventItemHistoryV1";
    const useLocalEventDraft = ["localhost", "127.0.0.1"].includes(location.hostname);
    function readEventCatalog() {
        if (useLocalEventDraft) {
            try {
                const saved = JSON.parse(localStorage.getItem(eventStorageKey));
                if (Array.isArray(saved)) return saved.filter(event => event && event.id && event.name).map(event => ({
                    id: String(event.id), title: String(event.name), start: event.start || "", end: event.end || "", items: Array.isArray(event.items) ? event.items.filter(Boolean) : []
                }));
            } catch (error) {
                console.warn("saved event list could not be read", error);
            }
        }
        const catalog = Array.isArray(window.INVENTORY_EVENT_CATALOG) ? window.INVENTORY_EVENT_CATALOG : [];
        return catalog.map(event => ({ id: String(event.id), title: String(event.name), start: event.start || "", end: event.end || "", items: Array.isArray(event.items) ? event.items.filter(Boolean) : [] }));
    }
    let eventCatalog = readEventCatalog();
    let eventForItem = new Map();
    function rebuildEventItemMap() {
        eventForItem = new Map(eventCatalog.flatMap(event => event.items.map(name => [name, event.id])));
    }
    rebuildEventItemMap();
    function readEventItemHistory() {
        try {
            const saved = JSON.parse(localStorage.getItem(eventItemHistoryStorageKey) || "[]");
            return new Set(Array.isArray(saved) ? saved.map(name => String(name).trim().toLowerCase()) : []);
        } catch {
            return new Set();
        }
    }
    const eventItemHistory = readEventItemHistory();
    function markEventItemUnlocked(name) {
        if (!name || !eventForItem.has(name)) return false;
        eventItemHistory.add(String(name).trim().toLowerCase());
        localStorage.setItem(eventItemHistoryStorageKey, JSON.stringify(Array.from(eventItemHistory)));
        return true;
    }
    let ownedItems;

    function rememberCardOrder(card) {
        if (originalOrder.has(card)) return;
        const explicitOrder = Number(card.dataset.originalOrder);
        if (card.dataset.originalOrder !== undefined && Number.isFinite(explicitOrder)) {
            originalOrder.set(card, explicitOrder);
            return;
        }
        const nextOrder = originalOrder.size
            ? Math.max(...originalOrder.values()) + 1
            : 0;
        originalOrder.set(card, nextOrder);
    }

    try {
        const saved = localStorage.getItem(storageKey);
        if (saved !== null) {
            ownedItems = new Set(JSON.parse(saved));
        } else if (localStorage.getItem("starterClaimed")) {
            const starterWeapon = localStorage.getItem("starterWeapon");
            ownedItems = new Set(starterWeapon ? [starterWeapon] : []);
            localStorage.setItem(storageKey, JSON.stringify(Array.from(ownedItems)));
        } else {
            ownedItems = new Set();
        }
    } catch {
        ownedItems = new Set(currentNames);
        localStorage.setItem(storageKey, JSON.stringify(Array.from(ownedItems)));
    }

    function saveOwnedItems() {
        localStorage.setItem(storageKey, JSON.stringify(Array.from(ownedItems)));
    }

    const eventRelockMigrationKey = "eventItemsRelockedV3";
    if (localStorage.getItem(eventRelockMigrationKey) !== "true") {
        const assignedEventItems = new Set(eventCatalog.flatMap(event => event.items).map(name => String(name).trim().toLowerCase()));
        const remainingOwnedItems = Array.from(ownedItems).filter(name => {
            const normalized = String(name).trim().toLowerCase();
            return !assignedEventItems.has(normalized) || eventItemHistory.has(normalized);
        });
        if (remainingOwnedItems.length !== ownedItems.size) {
            ownedItems = new Set(remainingOwnedItems);
            saveOwnedItems();
        }
        localStorage.setItem(eventRelockMigrationKey, "true");
    }

    function updateBalances() {
        const format = window.formatInventoryNumber || (value => String(value));
        document.getElementById("apBalance").textContent = format(ap);
        document.getElementById("mpBalance").textContent = format(mp);
        localStorage.setItem("ap", ap);
        localStorage.setItem("mp", mp);
    }

    function readStoredBalance(key, fallback) {
        const stored = Number(localStorage.getItem(key));
        return Number.isFinite(stored) && stored >= 0 ? stored : fallback;
    }

    function cardIsSeasonal(card) {
        if (eventForItem.has(cardName(card)) || card.dataset.catalogEvent) return true;
        if (card.dataset.seasonal !== undefined) return card.dataset.seasonal === "true";
        return /,\s*true\s*,\s*\d+\s*,/.test(card.getAttribute("onclick") || "");
    }

    function cardRarity(card) {
        if (card.dataset.rarity) return card.dataset.rarity;
        const match = (card.getAttribute("onclick") || "").match(
            /showItem\(\s*'(?:\\.|[^'\\])*'\s*,\s*[^,]+,\s*'((?:\\.|[^'\\])*)'/
        );
        return match ? match[1].replace(/\\'/g, "'").replace(/\\\\/g, "\\") : "";
    }

    function sortAndFilterItems() {
        if (!itemsGrid || !itemSort) return;
        const mode = itemSort.value;
        const ordered = Array.from(itemsGrid.querySelectorAll(".item"));
        ordered.forEach(rememberCardOrder);
        ordered.forEach(card => {
            const name = cardName(card);
            const unlocked = ownedItems.has(name);
            const seasonal = cardIsSeasonal(card);
            const hidden =
                (mode === "unlocked" && !unlocked) ||
                (mode === "locked" && unlocked) ||
                (mode === "seasonal" && !seasonal) ||
                (mode === "regular" && seasonal);
            card.classList.toggle("is-filtered-out", hidden);
        });
        ordered.sort((first, second) => {
            const firstPosition = originalOrder.get(first) ?? Number.MAX_SAFE_INTEGER;
            const secondPosition = originalOrder.get(second) ?? Number.MAX_SAFE_INTEGER;
            if (mode !== "rarity") return firstPosition - secondPosition;
            const rarityOrder = cardRarity(first).localeCompare(cardRarity(second));
            return rarityOrder || firstPosition - secondPosition;
        });
        ordered.forEach(card => itemsGrid.appendChild(card));
    }

    if (itemSort) itemSort.addEventListener("change", sortAndFilterItems);
    const refreshItemGridButton = document.getElementById("refreshItemGrid");
    if (refreshItemGridButton) {
        refreshItemGridButton.addEventListener("click", async () => {
            refreshItemGridButton.disabled = true;
            refreshItemGridButton.textContent = "refreshing";
            try {
                if (typeof window.refreshItemSheet === "function") await window.refreshItemSheet();
                updateCards();
            } finally {
                refreshItemGridButton.disabled = false;
                refreshItemGridButton.textContent = "refresh";
            }
        });
    }

    window.awardCurrency = function (apEarned, mpEarned) {
        ap = readStoredBalance("ap", ap) + Math.max(0, Number(apEarned) || 0);
        mp = readStoredBalance("mp", mp) + Math.max(0, Number(mpEarned) || 0);
        updateBalances();
        if (selectedItem) {
            try { showOffer(selectedItem.args); } catch (error) { console.error(error); }
        }
        return true;
    };

    window.spendCurrency = function (apCost = 0, mpCost = 0) {
        ap = readStoredBalance("ap", ap);
        mp = readStoredBalance("mp", mp);
        if (ap < apCost || mp < mpCost) return false;
        ap -= apCost;
        mp -= mpCost;
        updateBalances();
        if (selectedItem) showOffer(selectedItem.args);
        return true;
    };

    function renderCollectionItems(namedCards) {
        const cardByName = new Map();
        namedCards.forEach(({ card, name }) => {
            if (!cardByName.has(name)) cardByName.set(name, card);
        });
        const names = Array.from(cardByName.keys()).sort((first, second) => first.localeCompare(second));
        const unlockedNames = names.filter(name => ownedItems.has(name));
        const lockedNames = names.filter(name => !ownedItems.has(name));
        const fillList = (listId, countId, itemNames) => {
            const list = document.getElementById(listId);
            list.replaceChildren();
            document.getElementById(countId).textContent = String(itemNames.length);
            itemNames.forEach(name => {
                const card = cardByName.get(name);
                const row = document.createElement("button");
                row.type = "button";
                row.className = "collection-item-row";
                row.setAttribute("role", "listitem");
                row.title = `inspect ${name}`;
                const image = card.querySelector("img");
                if (image) {
                    const icon = document.createElement("img");
                    icon.src = image.currentSrc || image.src;
                    icon.alt = "";
                    row.appendChild(icon);
                }
                const label = document.createElement("span");
                label.textContent = name;
                row.appendChild(label);
                row.addEventListener("click", () => card.click());
                list.appendChild(row);
            });
        };
        fillList("unlockedItemList", "unlockedItemCount", unlockedNames);
        fillList("lockedItemList", "lockedItemCount", lockedNames);
    }

    function updateCards() {
        cards = Array.from(document.querySelectorAll(cardSelector));
        cards.forEach(rememberCardOrder);
        const namedCards = cards
            .map(card => ({ card, name: cardName(card) }))
            .filter(item => item.name);
        const uniqueNames = new Set(namedCards.map(item => item.name));
        const seasonalNames = new Set(namedCards
            .filter(({ card }) => cardIsSeasonal(card))
            .map(item => item.name));
        const unlockedCount = Array.from(uniqueNames).filter(name => ownedItems.has(name)).length;
        const seasonalUnlockedCount = Array.from(seasonalNames).filter(name => ownedItems.has(name)).length;
        const percentage = uniqueNames.size ? Math.round((unlockedCount / uniqueNames.size) * 100) : 0;
        renderCollectionItems(namedCards);

        cards.forEach(card => {
            const name = cardName(card);
            const eventId = eventForItem.get(name) || card.dataset.catalogEvent;
            if (eventId) card.dataset.event = eventId;
            else delete card.dataset.event;
            const locked = name && !ownedItems.has(name);
            card.classList.toggle("locked", Boolean(locked));
            card.setAttribute("aria-label", locked ? `${name}, locked` : name);
            card.title = locked ? `${name} — locked` : name;
        });
        sortAndFilterItems();

        document.getElementById("collectionUnlocked").textContent = `${unlockedCount} / ${uniqueNames.size}`;
        document.getElementById("collectionLocked").textContent = `${uniqueNames.size - unlockedCount} locked`;
        document.getElementById("collectionSeasonal").textContent = `${seasonalUnlockedCount} / ${seasonalNames.size}`;
        document.getElementById("collectionProgressFill").style.width = `${percentage}%`;
        document.getElementById("collectionProgress").setAttribute("aria-valuenow", String(unlockedCount));
        document.getElementById("collectionProgress").setAttribute("aria-valuemax", String(uniqueNames.size));
        document.getElementById("collectionPercent").textContent = `${percentage}%`;
        if (eventsDialog.open) renderEvents();
    }

    const collection = document.createElement("section");
    collection.id = "collectionProgressPanel";
    collection.setAttribute("aria-label", "collection progress");
    collection.innerHTML = `
        <div class="collection-heading">
            <h3>collection</h3>
            <span id="collectionPercent">0%</span>
        </div>
        <div class="collection-progress-track" id="collectionProgress" role="progressbar" aria-label="items unlocked" aria-valuemin="0" aria-valuemax="0" aria-valuenow="0">
            <span id="collectionProgressFill"></span>
        </div>
        <div class="collection-stats">
            <span><strong id="collectionUnlocked">0 / 0</strong> unlocked</span>
            <span id="collectionLocked">0 locked</span>
            <span><strong id="collectionSeasonal">0 / 0</strong> seasonal</span>
        </div>
    `;

    const collectionDialog = document.createElement("dialog");
    collectionDialog.id = "collectionDialog";
    collectionDialog.setAttribute("aria-labelledby", "collectionDialogTitle");
    collectionDialog.innerHTML = `
        <div class="collection-dialog-heading">
            <h2 id="collectionDialogTitle">collection</h2>
            <button id="closeCollectionPanel" type="button" aria-label="close collection">close</button>
        </div>
    `;
    const collectionLayout = document.createElement("div");
    collectionLayout.className = "collection-layout";
    const unlockedPanel = document.createElement("section");
    unlockedPanel.className = "collection-item-panel";
    unlockedPanel.innerHTML = `<h3>unlocked items <span id="unlockedItemCount">0</span></h3><div id="unlockedItemList" class="collection-item-list" role="list" aria-label="unlocked items"></div>`;
    const lockedPanel = document.createElement("section");
    lockedPanel.className = "collection-item-panel locked-list-panel";
    lockedPanel.innerHTML = `<h3>locked items <span id="lockedItemCount">0</span></h3><div id="lockedItemList" class="collection-item-list" role="list" aria-label="locked items"></div>`;
    collectionLayout.append(collection, unlockedPanel, lockedPanel);
    collectionDialog.appendChild(collectionLayout);

    const collectionButton = document.createElement("button");
    collectionButton.id = "openCollectionPanel";
    collectionButton.type = "button";
    collectionButton.textContent = "collection";
    document.querySelector(".portal-panel").appendChild(collectionButton);
    document.querySelector(".portal-panel").appendChild(collectionDialog);

    const eventsButton = document.createElement("button");
    eventsButton.id = "openEventsPanel";
    eventsButton.type = "button";
    eventsButton.textContent = "events";
    document.querySelector(".portal-panel").appendChild(eventsButton);

    const eventsDialog = document.createElement("dialog");
    eventsDialog.id = "eventsDialog";
    eventsDialog.setAttribute("aria-labelledby", "eventsDialogTitle");
    eventsDialog.innerHTML = `
        <div class="collection-dialog-heading">
            <h2 id="eventsDialogTitle">events</h2>
            <button id="closeEventsPanel" type="button" aria-label="close events">close</button>
        </div>
        <p class="events-intro">event rewards are earned through their events and quests</p>
        <div id="eventCatalog"></div>
    `;
    document.querySelector(".portal-panel").appendChild(eventsDialog);

    const offer = document.createElement("section");
    offer.id = "unlockOffer";
    offer.hidden = true;
    offer.innerHTML = `
        <strong id="unlockTitle">locked item</strong>
        <p id="unlockCostLabel">unlock cost</p>
        <div id="unlockApRow"><span id="unlockApCost"></span> ap</div>
        <div id="unlockMpRow"><span id="unlockMpCost"></span> mp</div>
        <button id="unlockButton" type="button">unlock item</button>
        <p id="unlockMessage" aria-live="polite"></p>
    `;
    document.querySelector(".info-panel").appendChild(offer);

    const style = document.createElement("style");
    style.textContent = `
        .item { position: relative; }
        .item.locked {
            border: 1px solid #ff00d4;
            box-shadow: inset 0 0 14px #ff00d433;
        }
        .item.locked::before {
            content: "";
            position: absolute;
            left: 50%;
            top: calc(50% - 10px);
            display: block;
            width: 11px;
            height: 9px;
            border: 2px solid #f4d8ff;
            border-bottom: 0;
            border-radius: 8px 8px 0 0;
            filter: drop-shadow(0 0 4px #ff00ff);
            pointer-events: none;
            transform: translate(-50%, -50%);
            z-index: 2;
        }
        .item.locked::after {
            content: "";
            position: absolute;
            left: 50%;
            top: calc(50% + 3px);
            width: 17px;
            height: 13px;
            border: 1px solid #ffd5fb;
            border-radius: 3px;
            background: linear-gradient(145deg, #ff7ce8, #8d21d8 68%, #461178);
            box-shadow: 0 0 8px #ff00e6, inset 0 1px 2px #fff8;
            pointer-events: none;
            transform: translate(-50%, -50%);
            z-index: 2;
        }
        #unlockOffer {
            margin-top: 12px;
            padding: 12px;
            border: 1px solid #8a00d4;
            border-radius: 10px;
            color: #f5eaff;
            background: rgba(30, 8, 43, .92);
            box-shadow: 0 0 12px #8a00d466;
            font-size: 14px;
        }
        #unlockOffer[hidden] { display: none; }
        #unlockOffer p { margin: 7px 0; }
        #unlockTitle { color: #ff42d0; }
        #unlockButton {
            margin-top: 8px;
            padding: 8px 12px;
            border: 0;
            border-radius: 8px;
            color: white;
            background: linear-gradient(135deg, #480078, #8a00ff);
            cursor: pointer;
        }
        #unlockButton:disabled { opacity: .55; cursor: not-allowed; }
        #unlockMessage { color: #74e8ff; }
        #collectionProgressPanel {
            padding: 16px;
            border: 1px solid color-mix(in srgb, var(--reality-border, #00f7ff) 48%, transparent);
            border-radius: 12px;
            background: color-mix(in srgb, var(--reality-panel, #1a1a24) 90%, #000 10%);
            color: var(--reality-text, #fff);
        }
        #openCollectionPanel, #closeCollectionPanel {
            border: 1px solid color-mix(in srgb, var(--reality-border, #00f7ff) 65%, transparent);
            border-radius: 9px;
            padding: 8px 12px;
            background: color-mix(in srgb, var(--reality-panel, #1a1a24) 82%, #000 18%);
            color: var(--reality-text, #fff);
            cursor: pointer;
        }
        #openEventsPanel, #closeEventsPanel {
            border: 1px solid color-mix(in srgb, var(--reality-border, #00f7ff) 65%, transparent);
            border-radius: 9px;
            padding: 8px 12px;
            background: color-mix(in srgb, var(--reality-panel, #1a1a24) 82%, #000 18%);
            color: var(--reality-text, #fff);
            cursor: pointer;
        }
        #openEventsPanel {
            position: absolute;
            top: 12px;
            right: 108px;
            z-index: 3;
            color: var(--reality-accent-2, #70eaff);
        }
        #openCollectionPanel {
            position: absolute;
            top: 12px;
            right: 18px;
            z-index: 3;
            color: var(--reality-accent, #ff00ff);
        }
        #collectionDialog {
            width: min(980px, calc(100vw - 40px));
            max-height: min(82vh, 760px);
            overflow: auto;
            border: 1px solid var(--reality-border, #00f7ff);
            border-radius: 16px;
            padding: 18px;
            background: var(--reality-panel, #12121c);
            color: var(--reality-text, #fff);
            box-shadow: 0 0 24px color-mix(in srgb, var(--reality-border, #00f7ff) 35%, transparent);
            transform-origin: top center;
        }
        .collection-layout { display:grid; grid-template-columns:minmax(210px, .8fr) minmax(220px, 1fr) minmax(220px, 1fr); gap:12px; align-items:start; }
        .collection-item-panel { min-width:0; padding:12px; border:1px solid color-mix(in srgb, var(--reality-border, #00f7ff) 42%, transparent); border-radius:12px; background:color-mix(in srgb, var(--reality-panel, #1a1a24) 90%, #000 10%); }
        .collection-item-panel h3 { display:flex; justify-content:space-between; gap:8px; margin:0 0 9px; color:var(--reality-accent, #ff00ff); font-size:14px; }
        .collection-item-panel h3 span { color:var(--reality-accent-2, #70eaff); }
        .collection-item-list { display:grid; gap:5px; max-height:260px; overflow-y:auto; padding-right:4px; scrollbar-color:var(--reality-border, #00f7ff) transparent; }
        .collection-item-row { display:flex; align-items:center; gap:8px; width:100%; min-height:34px; padding:5px 7px; border:1px solid transparent; border-radius:7px; color:var(--reality-text, #fff); background:color-mix(in srgb, var(--reality-panel, #1a1a24) 74%, #000 26%); font:inherit; text-align:left; cursor:pointer; }
        .collection-item-row:hover { border-color:var(--reality-border, #00f7ff); }
        .collection-item-row img { width:23px; height:23px; object-fit:contain; flex:none; }
        .collection-item-row span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .locked-list-panel .collection-item-row { color:var(--reality-muted, #aaa); }
        @media (max-width:760px) { .collection-layout { grid-template-columns:1fr; } .collection-item-list { max-height:180px; } }
        #eventsDialog {
            width: min(680px, calc(100vw - 56px));
            max-height: min(78vh, 720px);
            overflow: auto;
            border: 1px solid var(--reality-border, #00f7ff);
            border-radius: 16px;
            padding: 18px;
            background: var(--reality-panel, #12121c);
            color: var(--reality-text, #fff);
            box-shadow: 0 0 24px color-mix(in srgb, var(--reality-border, #00f7ff) 35%, transparent);
            transform-origin: top center;
        }
        #eventsDialog[open].is-opening { animation: collectionMapUnfold 560ms cubic-bezier(.2,.85,.25,1) both; }
        #eventsDialog[open].is-closing { animation: collectionMapFold 220ms ease-in both; pointer-events:none; }
        #eventsDialog[open]::backdrop { animation: collectionBackdropIn 320ms ease-out both; background: rgba(3, 4, 12, .78); backdrop-filter: blur(3px); }
        #eventsDialog[open].is-closing::backdrop { animation: collectionBackdropOut 220ms ease-in both; }
        .events-intro { margin: 0 0 12px; color: var(--reality-muted, #aaa); font-size: 13px; }
        .event-entry { margin-top: 12px; padding: 13px; border: 1px solid color-mix(in srgb, var(--reality-border, #00f7ff) 45%, transparent); border-radius: 11px; background: color-mix(in srgb, var(--reality-panel, #1a1a24) 88%, #000 12%); }
        .event-entry-head { display:flex; justify-content:space-between; align-items:center; gap:10px; margin-bottom:8px; }
        .event-entry-head h3 { margin:0; color:var(--reality-accent, #ff00ff); font-size:15px; }
        .event-entry-schedule { margin:0 0 8px; color:var(--reality-muted, #aaa); font-size:12px; }
        .event-entry-progress { color:var(--reality-accent-2, #70eaff); font-size:12px; white-space:nowrap; }
        .event-item-list { display:flex; flex-wrap:wrap; gap:7px; }
        .event-item-chip { padding:6px 9px; border:1px solid #834e9b; border-radius:999px; color:#e9dff1; background:#1b1024; font-size:12px; }
        .event-item-chip.is-owned { border-color:#29d8c2; color:#9fffee; background:#09211f; }
        #collectionDialog[open].is-opening { animation: collectionMapUnfold 560ms cubic-bezier(.2,.85,.25,1) both; }
        #collectionDialog[open].is-closing { animation: collectionMapFold 220ms ease-in both; pointer-events:none; }
        #collectionDialog[open]::backdrop { animation: collectionBackdropIn 320ms ease-out both; background: rgba(3, 4, 12, .78); backdrop-filter: blur(3px); }
        #collectionDialog[open].is-closing::backdrop { animation: collectionBackdropOut 220ms ease-in both; }
        @keyframes collectionMapUnfold {
            0% { opacity:0; transform:perspective(900px) rotateX(-32deg) scaleY(.12); filter:brightness(1.5); }
            58% { opacity:1; transform:perspective(900px) rotateX(5deg) scaleY(1.025); filter:brightness(1.12); }
            100% { opacity:1; transform:perspective(900px) rotateX(0) scaleY(1); filter:brightness(1); }
        }
        @keyframes collectionMapFold {
            0% { opacity:1; transform:perspective(900px) rotateX(0) scaleY(1); }
            100% { opacity:0; transform:perspective(900px) rotateX(-24deg) scaleY(.12); }
        }
        @keyframes collectionBackdropIn { from { opacity:0; } to { opacity:1; } }
        @keyframes collectionBackdropOut { from { opacity:1; } to { opacity:0; } }
        @media (prefers-reduced-motion: reduce) {
            #collectionDialog[open].is-opening, #collectionDialog[open].is-closing,
            #collectionDialog[open]::backdrop, #collectionDialog[open].is-closing::backdrop {
                animation-duration:1ms;
            }
            #eventsDialog[open].is-opening, #eventsDialog[open].is-closing,
            #eventsDialog[open]::backdrop, #eventsDialog[open].is-closing::backdrop { animation-duration:1ms; }
        }
        .collection-dialog-heading { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:14px; }
        .collection-dialog-heading h2 { margin:0; color:var(--reality-accent, #ff00ff); }
        .collection-heading, .collection-stats {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
        }
        .collection-heading h3 { margin: 0; color: var(--reality-accent, #ff00ff); font-size: 14px; }
        #collectionPercent { color: var(--reality-accent-2, #70eaff); font-size: 12px; font-weight: 700; }
        .collection-progress-track {
            height: 7px;
            margin: 7px 0;
            overflow: hidden;
            border-radius: 8px;
            background: rgba(255,255,255,.12);
        }
        #collectionProgressFill {
            display: block;
            width: 0;
            height: 100%;
            border-radius: inherit;
            background: linear-gradient(90deg, var(--reality-accent, #ff00ff), var(--reality-accent-2, #00eaff));
            transition: width 250ms ease;
        }
        .collection-stats { color: var(--reality-muted, #aaa); font-size: 11px; }
        .collection-stats strong { color: var(--reality-text, #fff); }
    `;
    document.head.appendChild(style);
    let closeAnimationTimer;
    function openCollection() {
        window.clearTimeout(closeAnimationTimer);
        collectionDialog.showModal();
        collectionDialog.classList.remove("is-closing");
        collectionDialog.classList.add("is-opening");
    }
    function closeCollection() {
        if (!collectionDialog.open || collectionDialog.classList.contains("is-closing")) return;
        collectionDialog.classList.remove("is-opening");
        collectionDialog.classList.add("is-closing");
        closeAnimationTimer = window.setTimeout(() => {
            collectionDialog.close();
            collectionDialog.classList.remove("is-closing");
        }, 230);
    }
    collectionButton.addEventListener("click", openCollection);
    document.getElementById("closeCollectionPanel").addEventListener("click", closeCollection);
    collectionDialog.addEventListener("cancel", event => {
        event.preventDefault();
        closeCollection();
    });
    collectionDialog.addEventListener("click", event => {
        if (event.target === collectionDialog) closeCollection();
    });

    function renderEvents() {
        const extras = Array.from(document.querySelectorAll(cardSelector))
            .filter(card => card.dataset.event)
            .map(card => ({ name: cardName(card), event: card.dataset.event.trim().toLowerCase() }));
        const container = document.getElementById("eventCatalog");
        container.replaceChildren();
        eventCatalog.forEach(event => {
            const names = Array.from(new Set([
                ...event.items,
                ...extras.filter(item => item.event === event.id).map(item => item.name)
            ]));
            const unlockedCount = names.filter(name => ownedItems.has(name)).length;
            const entry = document.createElement("section");
            entry.className = "event-entry";
            const heading = document.createElement("div");
            heading.className = "event-entry-head";
            const title = document.createElement("h3");
            title.textContent = event.title;
            const progress = document.createElement("span");
            progress.className = "event-entry-progress";
            progress.textContent = `${unlockedCount} / ${names.length} unlocked`;
            heading.append(title, progress);
            const schedule = document.createElement("p");
            schedule.className = "event-entry-schedule";
            if (!event.start && !event.end) {
                schedule.textContent = "not scheduled";
            } else if (!event.start) {
                schedule.textContent = "incomplete schedule";
            } else {
                const start = new Date(event.start);
                const end = event.end ? new Date(event.end) : null;
                const now = Date.now();
                const state = now < start.getTime() ? "upcoming" : !end || now <= end.getTime() ? "live" : "ended";
                const format = value => value.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
                schedule.textContent = `${state} · ${format(start)}${end ? ` → ${format(end)}` : " · no end time"}`;
            }
            const list = document.createElement("div");
            list.className = "event-item-list";
            names.forEach(name => {
                const item = document.createElement("span");
                item.className = `event-item-chip${ownedItems.has(name) ? " is-owned" : ""}`;
                item.textContent = `${name.toLowerCase()} · ${ownedItems.has(name) ? "unlocked" : "locked"}`;
                list.appendChild(item);
            });
            entry.append(heading, schedule, list);
            container.appendChild(entry);
        });
    }

    let eventsCloseTimer;
    function openEvents() {
        renderEvents();
        window.clearTimeout(eventsCloseTimer);
        eventsDialog.showModal();
        eventsDialog.classList.remove("is-closing");
        eventsDialog.classList.add("is-opening");
    }
    function closeEvents() {
        if (!eventsDialog.open || eventsDialog.classList.contains("is-closing")) return;
        eventsDialog.classList.remove("is-opening");
        eventsDialog.classList.add("is-closing");
        eventsCloseTimer = window.setTimeout(() => {
            eventsDialog.close();
            eventsDialog.classList.remove("is-closing");
        }, 230);
    }
    eventsButton.addEventListener("click", openEvents);
    document.getElementById("closeEventsPanel").addEventListener("click", closeEvents);
    eventsDialog.addEventListener("cancel", event => { event.preventDefault(); closeEvents(); });
    eventsDialog.addEventListener("click", event => { if (event.target === eventsDialog) closeEvents(); });

    window.addEventListener("storage", event => {
        if (event.key === storageKey) {
            try {
                const nextOwnedItems = JSON.parse(event.newValue || "[]");
                ownedItems = new Set(Array.isArray(nextOwnedItems) ? nextOwnedItems : []);
            } catch {
                ownedItems = new Set();
            }
            updateCards();
            if (selectedItem && !ownedItems.has(selectedItem.name)) showOffer(selectedItem.args);
            return;
        }
        if (event.key !== eventStorageKey) return;
        eventCatalog = readEventCatalog();
        rebuildEventItemMap();
        updateCards();
    });

    let selectedItem = null;

    function showOffer(args) {
        const [name, damage, rarity, power, protection = 0, artifactPower = 0] = args;
        const seasonal = args[6] === true || args[6] === "true";
        const cost = window.estimateWeaponCost(damage, rarity, power, protection, artifactPower);
        selectedItem = { args, name, cost, seasonal };

        document.getElementById("unlockTitle").textContent = `${name} is locked`;
        document.getElementById("unlockApCost").textContent = cost.ap;
        document.getElementById("unlockMpCost").textContent = cost.mp;

        const button = document.getElementById("unlockButton");
        const message = document.getElementById("unlockMessage");
        document.getElementById("unlockCostLabel").hidden = seasonal;
        document.getElementById("unlockApRow").hidden = seasonal;
        document.getElementById("unlockMpRow").hidden = seasonal;
        button.hidden = seasonal;
        button.disabled = false;
        button.textContent = "unlock item";
        message.textContent = seasonal ? "seasonal items are earned through events and quests" : "";

        if (seasonal) {
            button.disabled = true;
        } else if (cost.ap === 0 && cost.mp === 0) {
            button.textContent = "claim free item";
        } else if (ap < cost.ap || mp < cost.mp) {
            button.disabled = true;
            message.textContent = `need ${Math.max(0, cost.ap - ap)} more ap and ${Math.max(0, cost.mp - mp)} more mp`;
        }

        offer.hidden = false;
    }

    document.querySelectorAll(cardSelector).forEach(card => {
        card.addEventListener("click", () => {
            pendingCard = card;
        }, true);
    });

    window.showItem = function (...args) {
        const card = pendingCard;
        const assignedEventId = eventForItem.get(args[0]) || card?.dataset.catalogEvent;
        if (assignedEventId) {
            args[6] = true;
            args[7] = Math.max(1, Number(args[7]) || 1);
            const assignedEvent = eventCatalog.find(event => event.id === assignedEventId || event.title.trim().toLowerCase() === String(assignedEventId).trim().toLowerCase());
            const quote = String(args[8] || "").trim();
            const eventQuote = assignedEvent ? `part of the ${assignedEvent.title} event` : `part of the ${String(assignedEventId).replace(/[-_]+/g, " ")} event`;
            if (!quote.toLowerCase().includes(eventQuote.toLowerCase())) {
                args[8] = quote ? `${quote.replace(/[.!?]+$/, "")} · ${eventQuote}` : eventQuote;
            }
        }
        if (card) card.dataset.itemName = args[0];
        originalShowItem(...args);

        if (args[0] && !ownedItems.has(args[0])) {
            showOffer(args);
        } else {
            selectedItem = null;
            offer.hidden = true;
        }
        pendingCard = null;
        updateCards();
    };

    window.chooseStarter = function (weapon) {
        originalChooseStarter(weapon);
        markEventItemUnlocked(weapon);
        ownedItems.add(weapon);
        saveOwnedItems();
        updateCards();
    };

    function grantItem(name) {
        if (!name) return false;
        markEventItemUnlocked(name);
        ownedItems.add(name);
        saveOwnedItems();
        updateCards();
        if (selectedItem && selectedItem.name === name) offer.hidden = true;
        return true;
    }

    window.unlockItem = grantItem;
    window.wasEventItemUnlocked = name => eventItemHistory.has(String(name || "").trim().toLowerCase());
    window.markEventItemUnlocked = markEventItemUnlocked;
    window.isItemUnlocked = name => ownedItems.has(name);
    window.refreshUnlockCards = updateCards;

    document.getElementById("unlockButton").addEventListener("click", () => {
        if (!selectedItem || selectedItem.seasonal) return;
        const { name, cost } = selectedItem;

        if (ap < cost.ap || mp < cost.mp) {
            showOffer(selectedItem.args);
            return;
        }

        ap -= cost.ap;
        mp -= cost.mp;
        updateBalances();
        grantItem(name);
        originalShowItem(...selectedItem.args);
        selectedItem = null;
        offer.hidden = true;
    });

    updateCards();
})();
