(() => {
    const storageKey = "inventoryItemImbuementsV1";
    const maxLevel = 10;
    const panel = document.getElementById("itemImbuePanel");
    const details = document.getElementById("itemImbueLevel");
    const button = document.getElementById("imbueSelectedItem");
    const status = document.getElementById("itemImbueStatus");
    if (!panel || !details || !button || !status) return;

    let selectedName = "";
    let selectedBaseDamage = 0;
    let imbues = readImbues();

    function readImbues() {
        try {
            const value = JSON.parse(localStorage.getItem(storageKey) || "{}");
            return value && typeof value === "object" && !Array.isArray(value) ? value : {};
        } catch {
            return {};
        }
    }

    function keyFor(name) {
        return String(name || "").trim().toLowerCase();
    }

    function levelFor(name) {
        const level = Number(imbues[keyFor(name)]);
        return Number.isFinite(level) ? Math.max(0, Math.min(maxLevel, Math.floor(level))) : 0;
    }

    window.getItemImbueLevel = name => levelFor(name);
    window.getItemImbueMultiplier = name => 1 + levelFor(name) * 0.05;
    window.getItemImbueDamageBonus = (name, damage) => {
        const base = Number(damage);
        if (!Number.isFinite(base) || base <= 0) return 0;
        return base * levelFor(name) * 0.05;
    };

    function format(value) {
        return window.formatInventoryNumber ? window.formatInventoryNumber(value) : String(Number(value.toFixed(2)));
    }

    function effectDescription(name) {
        const item = keyFor(name);
        if (item === "firework arrow (mcdii)") return "level 10 fires 5 arrows per volley";
        if (item.startsWith("lightning rod")) return "level 10 calls 3 strikes";
        if (item === "ghost cloak") return "each level adds half a second of ghost mode";
        if (item === "updraft tome") return "each level widens and strengthens the lift";
        return "imbues also improve this item’s arena effect";
    }

    function render() {
        if (!selectedName) {
            panel.hidden = true;
            return;
        }
        panel.hidden = false;
        const level = levelFor(selectedName);
        const bonus = window.getItemImbueDamageBonus(selectedName, selectedBaseDamage);
        const cost = (level + 1) * 10;
        const owned = typeof window.isItemUnlocked === "function" ? window.isItemUnlocked(selectedName) : false;
        details.textContent = `level ${level}/${maxLevel} · +${format(bonus)} damage · ${effectDescription(selectedName)} · ${level < maxLevel ? `next level costs ${cost} stardust` : "maximum level"}`;
        button.disabled = !owned || level >= maxLevel;
        button.textContent = level >= maxLevel ? "maximum imbue reached" : owned ? `imbue · ${cost} stardust` : "unlock this item to imbue it";
        const damage = document.getElementById("damage");
        if (damage && Number.isFinite(selectedBaseDamage)) damage.textContent = format(selectedBaseDamage + bonus);
    }

    const originalShowItem = window.showItem;
    if (typeof originalShowItem === "function") {
        window.showItem = function (...args) {
            const result = originalShowItem.apply(this, args);
            selectedName = String(args[0] || "");
            selectedBaseDamage = Number(args[1]);
            if (!Number.isFinite(selectedBaseDamage)) selectedBaseDamage = 0;
            status.textContent = `each level adds five percent of catalog damage · ${effectDescription(selectedName)}`;
            render();
            return result;
        };
    }

    button.addEventListener("click", () => {
        if (!selectedName || !window.isItemUnlocked?.(selectedName)) {
            status.textContent = "unlock this item before spending stardust on it";
            return;
        }
        const level = levelFor(selectedName);
        if (level >= maxLevel) return;
        const cost = (level + 1) * 10;
        if (typeof window.spendCurrency !== "function" || !window.spendCurrency(0, 0, cost)) {
            status.textContent = `you need ${cost} stardust for the next level`;
            return;
        }
        imbues[keyFor(selectedName)] = level + 1;
        try {
            localStorage.setItem(storageKey, JSON.stringify(imbues));
        } catch {
            imbues[keyFor(selectedName)] = level;
            status.textContent = "could not save the imbue";
            return;
        }
        status.textContent = `${selectedName} reached imbue level ${level + 1}`;
        render();
        window.dispatchEvent(new CustomEvent("inventory-item-imbue-changed", { detail: { name: selectedName, level: level + 1 } }));
    });

    window.addEventListener("storage", event => {
        if (event.key === storageKey) {
            imbues = readImbues();
            render();
        }
    });
    window.addEventListener("inventory-item-imbue-changed", render);
    render();
})();
