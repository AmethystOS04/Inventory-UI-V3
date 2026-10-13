(() => {
    const fieldTypes = {
        ap: "balance",
        mp: "balance",
        ownedItemsV2: "names",
        eventItemHistoryV1: "names",
        starterWeapon: "text",
        starterClaimed: "boolean",
        eventItemsRelockedV3: "boolean",
        dailyMissionsV1: "object",
        eventMissionProgressV1: "object",
        weeklyChallengeV1: "object",
        riftArenaUpgradesV1: "object",
        reality: "text",
        inventoryMusicVolumeV1: "volume"
    };
    const storageKeys = Object.keys(fieldTypes);

    function normalizeData(source) {
        if (!source || typeof source !== "object" || Array.isArray(source)) throw new Error("save data must be an object");
        const data = {};
        for (const key of storageKeys) {
            const value = source[key];
            switch (fieldTypes[key]) {
                case "balance": {
                    const number = Number(value ?? 0);
                    if (!Number.isFinite(number) || number < 0 || Math.floor(number) !== number) throw new Error(`${key} must be a whole number at least zero`);
                    data[key] = number;
                    break;
                }
                case "names": {
                    if (value == null) { data[key] = []; break; }
                    if (!Array.isArray(value) || value.some(name => typeof name !== "string" || name.length > 120)) throw new Error(`${key} must be a list of item names`);
                    data[key] = Array.from(new Set(value.map(name => name.trim()).filter(Boolean)));
                    break;
                }
                case "boolean":
                    if (value != null && typeof value !== "boolean") throw new Error(`${key} must be true or false`);
                    data[key] = value === true;
                    break;
                case "text":
                    if (value != null && (typeof value !== "string" || value.length > 160)) throw new Error(`${key} must be text`);
                    data[key] = value || "";
                    break;
                case "object":
                    if (value != null && (typeof value !== "object" || Array.isArray(value))) throw new Error(`${key} must be an object`);
                    data[key] = value ?? null;
                    break;
                case "volume": {
                    if (value == null) { data[key] = null; break; }
                    const number = Number(value);
                    if (!Number.isFinite(number) || number < 0 || number > 100) throw new Error("music volume must be between zero and one hundred");
                    data[key] = number;
                    break;
                }
            }
        }
        return data;
    }

    function normalizeEnvelope(value) {
        if (!value || value.format !== "inventory-ui-save" || value.version !== 1) throw new Error("this is not a supported inventory save file");
        return {
            format: "inventory-ui-save",
            version: 1,
            exportedAt: typeof value.exportedAt === "string" ? value.exportedAt : "",
            data: normalizeData(value.data)
        };
    }

    function readStored(key) {
        const raw = localStorage.getItem(key);
        if (raw == null) return null;
        if (["ownedItemsV2", "eventItemHistoryV1", "dailyMissionsV1", "eventMissionProgressV1", "weeklyChallengeV1", "riftArenaUpgradesV1"].includes(key)) {
            try { return JSON.parse(raw); } catch { return null; }
        }
        if (["ap", "mp", "inventoryMusicVolumeV1"].includes(key)) {
            const number = Number(raw);
            return Number.isFinite(number) ? number : null;
        }
        if (["starterClaimed", "eventItemsRelockedV3"].includes(key)) return raw === "true";
        return raw;
    }

    function capture() {
        const data = Object.fromEntries(storageKeys.map(key => [key, readStored(key)]));
        return { format: "inventory-ui-save", version: 1, exportedAt: new Date().toISOString(), data: normalizeData(data) };
    }

    function write(data, storage = localStorage) {
        const clean = normalizeData(data);
        for (const key of storageKeys) {
            const value = clean[key];
            if (value == null || (key === "starterWeapon" && !value) || (["starterClaimed", "eventItemsRelockedV3"].includes(key) && !value)) {
                storage.removeItem(key);
            } else if (["ownedItemsV2", "eventItemHistoryV1", "dailyMissionsV1", "eventMissionProgressV1", "weeklyChallengeV1", "riftArenaUpgradesV1"].includes(key)) {
                storage.setItem(key, JSON.stringify(value));
            } else {
                storage.setItem(key, String(value));
            }
        }
        return clean;
    }

    window.InventorySaveFormat = { storageKeys, normalizeData, normalizeEnvelope, capture, write };
})();
