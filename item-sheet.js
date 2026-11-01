(() => {
    const sheetUrl = "items.csv";
    const refreshEveryMs = 2500;
    const inventory = document.querySelector(".items");
    const itemCards = new Map();
    inventory.addEventListener("click", event => {
        const card = event.target.closest(".item");
        if (!card) return;
        inventory.querySelectorAll(".item").forEach(item => {
            item.classList.remove("selected");
            item.style.borderColor = "";
            item.style.boxShadow = "";
        });
        card.classList.add("selected");
        requestAnimationFrame(() => {
            const rarity = (card.dataset.rarity || document.getElementById("rarity")?.textContent || "").trim().toLowerCase();
            const color = {
                common: "#aaaaaa", rare: "#3aa0ff", epic: "#a335ee", electric: "#00ffff",
                unique: "#ff9a00", magma: "#ff6600", terror: "#9900d1", dark: "#4b2d63",
                mythical: "#3a339e", divine: "#c9c624", void: "#ff00e2", "void+": "#ff2e8f",
                pixel: "#00ff33", frozen: "#8dfffb", gravity: "#ee35ff", flamed: "#ff0000",
                artifact: "#8b8186", forgotten: "#2f1515", dominance: "#ffa2ee", shadow: "#5c1082",
                seasonal: "#ff0381", special: "#007bff", none: "#7b2828"
            }[rarity] || "white";
            card.style.setProperty("--item-selection-color", color);
            card.style.borderColor = color;
            card.style.boxShadow = `0 0 12px ${color}`;
        });
    });
    for (const card of inventory.querySelectorAll(".item")) {
        const call = (card.getAttribute("onclick") || "").match(/showItem\(\s*'((?:\\.|[^'\\])*)'/);
        const name = card.dataset.itemName || (call ? call[1].replace(/\\'/g, "'").replace(/\\\\/g, "\\") : "");
        if (name) {
            card.dataset.itemName = name;
            itemCards.set(name, card);
        }
    }

    function parseCsv(text) {
        const rows = [];
        let row = [];
        let field = "";
        let quoted = false;

        for (let index = 0; index < text.length; index += 1) {
            const char = text[index];
            if (quoted) {
                if (char === '"' && text[index + 1] === '"') {
                    field += '"';
                    index += 1;
                } else if (char === '"') {
                    quoted = false;
                } else {
                    field += char;
                }
            } else if (char === '"') {
                quoted = true;
            } else if (char === ",") {
                row.push(field.trim());
                field = "";
            } else if (char === "\n") {
                row.push(field.trim().replace(/\r$/, ""));
                if (row.some(value => value !== "")) rows.push(row);
                row = [];
                field = "";
            } else {
                field += char;
            }
        }

        row.push(field.trim().replace(/\r$/, ""));
        if (row.some(value => value !== "")) rows.push(row);
        return rows;
    }

    function numberValue(value, fallback = 0) {
        if (value === undefined || value === "") return fallback;
        const number = Number(value);
        return Number.isFinite(number) ? number : fallback;
    }

    function parseBoolean(value) {
        return ["true", "yes", "1"].includes(String(value || "").trim().toLowerCase());
    }

    function addItem(item) {
        if (!item.name || !item.image) return;

        const seasonal = parseBoolean(item.seasonal);
        const args = [
            item.name,
            numberValue(item.damage),
            item.rarity || "common",
            numberValue(item.max_level),
            numberValue(item.protection),
            numberValue(item.artifact_power),
            seasonal,
            seasonal ? numberValue(item.seasonal_level, 1) : 0,
            item.description || "",
            item.soul_usage || ""
        ];

        let card = itemCards.get(item.name);
        let created = false;
        if (!card) {
            card = document.createElement("div");
            card.className = "item";
            inventory.appendChild(card);
            itemCards.set(item.name, card);
            created = true;
        }
        card.dataset.itemName = item.name;
        card.dataset.seasonal = String(seasonal);
        card.dataset.rarity = item.rarity || "common";
        card.dataset.damage = String(numberValue(item.damage));
        card.dataset.artifactPower = String(numberValue(item.artifact_power));
        card.dataset.protection = String(numberValue(item.protection));
        if (item.event) card.dataset.catalogEvent = item.event.trim().toLowerCase();
        card.dataset.originalOrder = String(inventory.querySelectorAll(".item").length);
        card.setAttribute("aria-label", item.name);
        card.title = item.name;

        let image = card.querySelector("img");
        if (!image) {
            image = document.createElement("img");
            card.replaceChildren(image);
        }
        image.src = item.image;
        image.alt = item.name;
        card.onclick = () => window.showItem(...args);

        icons[item.name] = item.image;
        if (window.refreshUnlockCards) window.refreshUnlockCards();
        return created;
    }

    async function loadSheet() {
        try {
            const response = await fetch(`${sheetUrl}?updated=${Date.now()}`, { cache: "no-store" });
            if (!response.ok) throw new Error(`sheet returned ${response.status}`);

            const rows = parseCsv(await response.text());
            if (!rows.length) return;
            const headers = rows.shift().map((header, index) =>
                (index === 0 ? header.replace(/^\uFEFF/, "") : header).trim().toLowerCase()
            );

            let addedItems = false;
            for (const values of rows) {
                const item = Object.fromEntries(headers.map((header, index) => [header, values[index] || ""]));
                addedItems = addItem(item) || addedItems;
            }
            if (addedItems) window.dispatchEvent(new Event("inventory-catalog-updated"));
        } catch (error) {
            console.warn("item sheet could not be loaded", error);
        }
    }

    window.refreshItemSheet = loadSheet;
    loadSheet();
    window.setInterval(loadSheet, refreshEveryMs);
})();
