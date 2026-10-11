(() => {
    const rarityMultiplier = {
        common: 1,
        rare: 1.5,
        epic: 2.5,
        unique: 3,
        electric: 2.5,
        magma: 3,
        terror: 3.5,
        dark: 2,
        mythical: 4,
        divine: 4.5,
        void: 5,
        "void+": 6,
        pixel: 1.5,
        frozen: 2.5,
        flamed: 2.5,
        artifact: 3.5,
        forgotten: 0.5,
        gravity: 5,
        dominance: 5.5,
        shadow: 3,
        none: 0.5
    };

    window.estimateWeaponCost = function (damage, rarity, power, protection, artifactPower) {
        const damageNum = parseInt(damage) || 0;
        const powerNum = parseInt(power) || 0;
        const protNum = parseInt(protection) || 0;
        const artNum = parseInt(artifactPower) || 0;
        const multiplier = rarityMultiplier[String(rarity).toLowerCase()] || 1;
        const baseCost = (damageNum * 2 + powerNum * 0.5 + protNum * 3 + artNum * 2) * multiplier;

        return {
            ap: Math.ceil(baseCost * 1.2),
            mp: Math.ceil(baseCost * 0.8)
        };
    };
})();
