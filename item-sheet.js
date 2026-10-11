(() => {
    const sheetUrl = "items.csv";
    const refreshEveryMs = 2500;
    const inventory = document.querySelector(".items");
    const knownItems = new Set(
        Array.from(inventory.querySelectorAll(".item"), card => {
            if (card.dataset.itemName) return card.dataset.itemName;
            const call = (card.getAttribute("onclick") || "").match(/showItem\(\s*'((?:\\.|[^'\\])*)'/);
            return call ? call[1].replace(/\\'/g, "'").replace(/\\\\/g, "\\") : "";
        }).filter(Boolean)
    );

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
        if (!item.name || !item.image || knownItems.has(item.name)) return;

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
            item.description || ""
        ];

        const card = document.createElement("div");
        card.className = "item";
        card.dataset.itemName = item.name;
        card.dataset.seasonal = String(seasonal);
        card.setAttribute("aria-label", item.name);
        card.title = item.name;

        const image = document.createElement("img");
        image.src = item.image;
        image.alt = item.name;
        card.appendChild(image);

        card.addEventListener("click", () => window.showItem(...args));
        inventory.appendChild(card);
        knownItems.add(item.name);

        icons[item.name] = item.image;
        if (window.refreshUnlockCards) window.refreshUnlockCards();
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

            for (const values of rows) {
                const item = Object.fromEntries(headers.map((header, index) => [header, values[index] || ""]));
                addItem(item);
            }
        } catch (error) {
            console.warn("item sheet could not be loaded", error);
        }
    }

    loadSheet();
    window.setInterval(loadSheet, refreshEveryMs);
})();
