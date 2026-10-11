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
    const currentNames = Array.from(new Set(cards.map(cardName).filter(Boolean)));
    let ownedItems;

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

    function updateBalances() {
        document.getElementById("apBalance").textContent = ap;
        document.getElementById("mpBalance").textContent = mp;
        localStorage.setItem("ap", ap);
        localStorage.setItem("mp", mp);
    }

    window.awardCurrency = function (apEarned, mpEarned) {
        ap += apEarned;
        mp += mpEarned;
        updateBalances();
        if (selectedItem) showOffer(selectedItem.args);
    };

    window.spendCurrency = function (apCost = 0, mpCost = 0) {
        if (ap < apCost || mp < mpCost) return false;
        ap -= apCost;
        mp -= mpCost;
        updateBalances();
        if (selectedItem) showOffer(selectedItem.args);
        return true;
    };

    function updateCards() {
        cards = Array.from(document.querySelectorAll(cardSelector));
        const namedCards = cards
            .map(card => ({ card, name: cardName(card) }))
            .filter(item => item.name);
        const uniqueNames = new Set(namedCards.map(item => item.name));
        const seasonalNames = new Set(namedCards
            .filter(({ card }) => {
                if (card.dataset.seasonal !== undefined) return card.dataset.seasonal === "true";
                return /,\s*true\s*,\s*\d+\s*,/.test(card.getAttribute("onclick") || "");
            })
            .map(item => item.name));
        const unlockedCount = Array.from(uniqueNames).filter(name => ownedItems.has(name)).length;
        const seasonalUnlockedCount = Array.from(seasonalNames).filter(name => ownedItems.has(name)).length;
        const percentage = uniqueNames.size ? Math.round((unlockedCount / uniqueNames.size) * 100) : 0;

        cards.forEach(card => {
            const name = cardName(card);
            const locked = name && !ownedItems.has(name);
            card.classList.toggle("locked", Boolean(locked));
            card.setAttribute("aria-label", locked ? `${name}, locked` : name);
            card.title = locked ? `${name} — locked` : name;
        });

        document.getElementById("collectionUnlocked").textContent = `${unlockedCount} / ${uniqueNames.size}`;
        document.getElementById("collectionLocked").textContent = `${uniqueNames.size - unlockedCount} locked`;
        document.getElementById("collectionSeasonal").textContent = `${seasonalUnlockedCount} / ${seasonalNames.size}`;
        document.getElementById("collectionProgressFill").style.width = `${percentage}%`;
        document.getElementById("collectionProgress").setAttribute("aria-valuenow", String(unlockedCount));
        document.getElementById("collectionProgress").setAttribute("aria-valuemax", String(uniqueNames.size));
        document.getElementById("collectionPercent").textContent = `${percentage}%`;
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
    collectionDialog.appendChild(collection);

    const collectionButton = document.createElement("button");
    collectionButton.id = "openCollectionPanel";
    collectionButton.type = "button";
    collectionButton.textContent = "collection";
    document.querySelector(".portal-panel").appendChild(collectionButton);
    document.querySelector(".portal-panel").appendChild(collectionDialog);

    const offer = document.createElement("section");
    offer.id = "unlockOffer";
    offer.hidden = true;
    offer.innerHTML = `
        <strong id="unlockTitle">locked item</strong>
        <p>unlock cost</p>
        <div><span id="unlockApCost"></span> ap</div>
        <div><span id="unlockMpCost"></span> mp</div>
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
        .item.locked::after {
            content: "🔒";
            position: absolute;
            left: 50%;
            top: 50%;
            display: grid;
            width: 30px;
            height: 30px;
            place-items: center;
            border: 1px solid #ff62df;
            border-radius: 50%;
            background: rgba(16, 7, 25, .88);
            font-size: 18px;
            filter: drop-shadow(0 0 4px #ff00ff);
            pointer-events: none;
            transform: translate(-50%, -50%);
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
        #openCollectionPanel {
            position: absolute;
            top: 12px;
            right: 18px;
            z-index: 3;
            color: var(--reality-accent, #ff00ff);
        }
        #collectionDialog {
            width: min(520px, calc(100vw - 56px));
            border: 1px solid var(--reality-border, #00f7ff);
            border-radius: 16px;
            padding: 18px;
            background: var(--reality-panel, #12121c);
            color: var(--reality-text, #fff);
            box-shadow: 0 0 24px color-mix(in srgb, var(--reality-border, #00f7ff) 35%, transparent);
            transform-origin: top center;
        }
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

    let selectedItem = null;

    function showOffer(args) {
        const [name, damage, rarity, power, protection = 0, artifactPower = 0] = args;
        const cost = window.estimateWeaponCost(damage, rarity, power, protection, artifactPower);
        selectedItem = { args, name, cost };

        document.getElementById("unlockTitle").textContent = `${name} is locked`;
        document.getElementById("unlockApCost").textContent = cost.ap;
        document.getElementById("unlockMpCost").textContent = cost.mp;

        const button = document.getElementById("unlockButton");
        const message = document.getElementById("unlockMessage");
        button.disabled = false;
        button.textContent = "unlock item";
        message.textContent = "";

        if (cost.ap === 0 && cost.mp === 0) {
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
        ownedItems.add(weapon);
        saveOwnedItems();
        updateCards();
    };

    function grantItem(name) {
        if (!name) return false;
        ownedItems.add(name);
        saveOwnedItems();
        updateCards();
        if (selectedItem && selectedItem.name === name) offer.hidden = true;
        return true;
    }

    window.unlockItem = grantItem;
    window.isItemUnlocked = name => ownedItems.has(name);
    window.refreshUnlockCards = updateCards;

    document.getElementById("unlockButton").addEventListener("click", () => {
        if (!selectedItem) return;
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
