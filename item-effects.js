(() => {
    const normalizeName = value => String(value || "").normalize("NFKC").toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9]+/g, " ").trim();
    const itemTypeGroups = {
        melee: [
            "Flame Sword", "Iron Sword", "Axe", "Daggers", "Cursed Axe", "Dark Katana",
            "Electric Hammer V2", "Great Hammer", "Hammer of Gravity", "Stormlander",
            "Pixel Diamond Pickaxe", "Forgotten Beacon", "Vine Whip", "Frost Slayer",
            "The Starless Night", "Heartstealer", "Outline Axe", "Crucible", "Blue Crucible",
            "Brown Crucible", "Yellow Crucible", "White Crucible", "Gray Crucible",
            "Smol Amethyst Shard", "Medium Amethyst Bud", "Huge Amethyst Cluster", "Sculker Claws",
            "Twilight Dagger", "Sculker's Bane", "Lunar Sickle", "Sparkler", "Soul Reaper",
            "Emerald Hammer", "Sifting Hammer", "Awesomeaxe", "Pride of the Plains", "Slaymore",
            "Ultimate Pickaxe", "Ultimate Sword", "Stormlander V2", "Electric Hammer V1", "Sift Sickles",
            "The End Crystal's Beam (ASS)", "Amethyst Spear (ASS)", "Whirlwind (MCD I)",
            "Log Stick (ASS)", "Corrupted Blade (ASS)", "Energizer of Souls (ASS)"
        ],
        bow: ["Bow", "Winter's Touch", "Shivering Bow"],
        projectile: ["Staff of Terror", "Orb of Dominance"],
        artifact: [
            "Void Stabilizer", "Flaming Quiver", "Ghost Cloak", "Thundering Quiver", "Updraft Tome",
            "Corrupted Beacon (MCDII)", "Lightning Rod (MCDII)", "Firework Arrow (MCDII)",
            "Fireworks Arrow (MCD I)"
        ]
    };
    const itemTypes = new Map(Object.entries(itemTypeGroups).flatMap(([type, names]) => names.map(name => [normalizeName(name), type])));
    const typeDefinitions = {
        melee: { icon: "GameplayEffects/T_Buff_DynamoMelee_Icon.png", title: "melee weapon", description: "close-range weapon perks" },
        bow: { icon: "GameplayEffects/T_Buff_DynamoRanged_Icon.png", title: "bow", description: "ranged weapon perks" },
        projectile: { icon: "GameplayEffects/T_Buff_CogCrossbow_Icon.png", title: "projectile weapon", description: "ranged weapon perks" },
        artifact: { icon: "Dungeons2Sprite_artifact.png", title: "artifact", description: "artifact perks" },
        unknown: { icon: "icons/default.png", title: "type unclassified", description: "no item type is defined for this item yet" }
    };
    const rarityDefinitions = {
        common: { multiplier: 1 }, rare: { multiplier: 1 }, epic: { multiplier: 1 }, unique: { multiplier: 1 },
        seasonal: { multiplier: 1 }, pixel: { multiplier: 1 }, forgotten: { multiplier: 1 }, terror: { multiplier: 1 },
        dark: { multiplier: 1 }, none: { multiplier: 1 }, artifact: { multiplier: 1 },
        magma: { multiplier: 1.2, effect: "burns targets for 3 seconds after a hit" },
        flamed: { multiplier: 1.2, effect: "burns targets for 3 seconds after a hit" },
        flame: { multiplier: 1.2, effect: "burns targets for 3 seconds after a hit" },
        "magma+flamed": { multiplier: 1.2, effect: "burns targets for 3 seconds after a hit" },
        gravity: { multiplier: 1, effect: "pulls nearby enemies toward the hit target" },
        shadow: { multiplier: 1.1, effect: "grants 3.5 seconds of ghost mode on hit" },
        void: { multiplier: 1.2, effect: "applies void damage over time for 3 seconds" },
        "void+": { multiplier: 1.35, effect: "applies stronger void damage over time for 7 seconds" },
        "void plus": { multiplier: 1.35, effect: "applies stronger void damage over time for 7 seconds" },
        frozen: { multiplier: 1.2, effect: "slows targets for 4 seconds" },
        electric: { multiplier: 1.15, effect: "chains lightning to nearby enemies" },
        special: { multiplier: 1.5 }, divine: { multiplier: 2.5 }, mystical: { multiplier: 2.5 },
        mythical: { multiplier: 2.5 }, dominance: { multiplier: 8, effect: "hits deal double damage to nearby enemies" }
    };
    const perkPools = {
        melee: [
            { id: "bounty", icon: "GameplayEffects/T_Buff_Cowardice_Icon.png", title: "bounty hunter", text: "deals extra damage to wounded enemies", values: [20, 25, 30] },
            { id: "knockback", icon: "GameplayEffects/T_Buff_Stunned_Icon.png", title: "knockback", text: "attacks push enemies farther away", values: [15, 20, 30] },
            { id: "critical", icon: "GameplayEffects/T_Buff_StrengthUp_Icon.png", title: "critical hit", text: "chance to deal double damage", values: [5, 10, 15] }
        ],
        bow: [
            { id: "aim", icon: "GameplayEffects/T_Buff_RollCharge_Icon.png", title: "aim", text: "chance for ranged attacks to deal double damage", values: [10, 15, 20] },
            { id: "impact", icon: "damagev2.png", title: "impact", text: "ranged attacks deal extra damage", values: [10, 20, 30] },
            { id: "reload", icon: "GameplayEffects/T_Buff_Accelerating_Icon.png", title: "reload", text: "fires ranged attacks faster", values: [15, 20, 25] },
            { id: "bounty", icon: "GameplayEffects/T_Buff_Cowardice_Icon.png", title: "bounty hunter", text: "deals extra damage to wounded enemies", values: [20, 25, 30] }
        ],
        projectile: [
            { id: "impact", icon: "damagev2.png", title: "impact", text: "projectile attacks deal extra damage", values: [10, 20, 30] },
            { id: "reload", icon: "GameplayEffects/T_Buff_Accelerating_Icon.png", title: "reload", text: "fires projectile attacks faster", values: [15, 20, 25] },
            { id: "knockback", icon: "GameplayEffects/T_Buff_Stunned_Icon.png", title: "knockback", text: "projectile hits push enemies farther away", values: [15, 20, 30] },
            { id: "bounty", icon: "GameplayEffects/T_Buff_Cowardice_Icon.png", title: "bounty hunter", text: "deals extra damage to wounded enemies", values: [20, 25, 30] }
        ],
        artifact: [
            { id: "artifact-damage", icon: "GameplayEffects/T_ArtifactCharge_Icon.png", title: "artifact power", text: "artifact damage is increased", values: [10, 15, 20] },
            { id: "cooldown", icon: "InventoryIcons/bullitpoint_cooldown.png", title: "cooldown", text: "artifact abilities recharge faster", values: [10, 15, 20] }
        ]
    };
    function classify(name) {
        const type = itemTypes.get(normalizeName(name)) || "unknown";
        return { type, ...typeDefinitions[type] };
    }
    function rarityTier(rarity) {
        const value = rarityDefinitions[String(rarity || "").normalize("NFKC").toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, " ").trim()]?.multiplier ?? 1;
        return value >= 2.5 ? 3 : value >= 1.35 ? 2 : 1;
    }
    function getPerk(name, rarity) {
        const { type } = classify(name);
        const pool = perkPools[type];
        if (!pool) return null;
        const tier = rarityTier(rarity);
        const seedText = `${normalizeName(name)}|${String(rarity || "").toLowerCase()}|${type}`;
        let seed = 2166136261;
        for (let index = 0; index < seedText.length; index += 1) seed = Math.imul(seed ^ seedText.charCodeAt(index), 16777619);
        const base = pool[(seed >>> 0) % pool.length];
        return { ...base, type, tier, value: base.values[tier - 1] };
    }
    function resolve(name, rarity) {
        const classification = classify(name);
        const entries = [{ icon: classification.icon, title: classification.title, description: classification.description }];
        const perk = getPerk(name, rarity);
        if (perk) entries.push({ icon: perk.icon, title: `${perk.title} ${perk.value}%`, description: perk.text, perk: true });
        const normalizedRarity = String(rarity || "").normalize("NFKC").toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, " ").trim();
        const rarityEffect = rarityDefinitions[normalizedRarity];
        if (classification.type !== "artifact" && rarityEffect) {
            const multiplier = Number(rarityEffect.multiplier ?? 1);
            const damageText = multiplier === 1 ? "uses the item's listed damage" : `arena weapon damage is multiplied by ${multiplier}`;
            entries.push({ icon: "damagev2.png", title: `${String(rarity || "item")} arena effect`, description: rarityEffect.effect ? `${damageText}; ${rarityEffect.effect}` : damageText });
        }
        if (classification.type === "unknown") entries.push({ icon: "icons/default.png", title: "rarity perk", description: "not assigned until this item's type is classified" });
        return entries;
    }
    function render(name, rarity) {
        const panel = document.getElementById("itemEffectsPanel");
        const list = document.getElementById("itemEffectsList");
        if (!panel || !list) return;
        const entries = resolve(name, rarity);
        list.replaceChildren(...entries.map(entry => {
            const row = document.createElement("div");
            row.className = "item-effect-row";
            const icon = document.createElement("img");
            icon.className = "item-effect-icon";
            icon.src = entry.icon;
            icon.alt = "";
            icon.loading = "lazy";
            const text = document.createElement("span");
            text.className = "item-effect-text";
            const title = document.createElement("strong");
            title.textContent = entry.title;
            const description = document.createElement("span");
            description.textContent = entry.description;
            text.append(title, description);
            row.append(icon, text);
            return row;
        }));
        panel.hidden = false;
    }
    window.InventoryItemEffects = Object.freeze({ classify, resolve, render, getPerk, rarityTier, knownItemCount: itemTypes.size });
})();
