console.log("script loaded");
let particleInterval = null;

const icons = {
  "Axe": "axe.png",
  "Bow": "bow.png",
  "Flame Sword": "flame.png",
  "Obsidian Claymore": "obsitian claymore.png",
  "Fangs of Frost": "fof.png",
  "Staff": "staff.png",
  "Cursed Axe": "cursedaxe.png",
  "Daggers": "dagger.png",
  "Electric Hammer": "electrichammer.png",
  "Weapon Maker Hammer": "wmhammercut.png",
  "Void Shuriken": "vsurican.png",
  "Winter\'s Touch": "winterstouch.png",
  "Electric Hammer V2": "elechammerv2.png",
  "Void Stabilizer": "void-stabilizer-v2.png",
  "Pixel Diamond Pickaxe": "diamond-pick.png",
  "Forgotten Beacon": "forgotten-beacon.png",
  "Dark Katana": "dark-katana.png",
  "Great Hammer": "great-hammer.png",
    "Hammer of Gravity": "hammer-of-gravity.png",
    "Stormlander": "stormlander.png",
"Iron Sword": "Iron-Sword.png",
"Orb of Dominance": "orb-of-dominace.png",
"Gold Crown": "crown.png",
"Thundering Quiver": "thundering-quiver.png",
"Ghost Cloak": "ghost-cloak.png",
"Flaming Quiver": "flaming-quiver.png",
"Vine Whip": "vine-whip.png",
"Updraft Tome": "updraft-tome.png",
"Sponge Striker": "sponge-striker.png",
};





let baseDamage = 0;
let iconEl = document.getElementById("itemIcon");

function showItem(
    name,
    damage,
    rarity,
    maxLvl,
    protection = 0,
    artifactEffectPower = 0,
    quote = ""
){

    baseDamage = damage;

  

iconEl.src = icons[name] || "icons/default.png";

// [[ show weapon data ]] \\

    let nameEl = document.getElementById("name");
    let dmgEl = document.getElementById("damage");
    let rarityEl = document.getElementById("rarity");
   let protEl = document.getElementById("prot");
    let artifactEffectPowerEl = document.getElementById("artifactEffectPower");
    nameEl.textContent = name;
    dmgEl.textContent = damage;
    rarityEl.textContent = rarity;
     protEl.textContent = protection;
    artifactEffectPowerEl.textContent = artifactEffectPower;
    document.getElementById("max power lvl").textContent = maxLvl;
     const quoteEl = document.getElementById("itemQuote");

if(quoteEl){
    quoteEl.textContent = quote;

}


    // damage glow (based on value)
if (parseInt(dmgEl.textContent) < 15) {
    dmgEl.style.color = "#aaaaaa";
    dmgEl.style.textShadow = "0 0 4px #888";
}
else if (parseInt(dmgEl.textContent) < 30) {
    dmgEl.style.color = "#3aa0ff";
    dmgEl.style.textShadow = "0 0 6px #3aa0ff";
}
else if (parseInt(dmgEl.textContent) < 50) {
    dmgEl.style.color = "#a335ee";
    dmgEl.style.textShadow = "0 0 8px #a335ee";
}
else {
    dmgEl.style.color = "#ff9a00";
    dmgEl.style.textShadow = "0 0 10px #ff9a00";
}

let powerEl = document.getElementById("max power lvl");

powerEl.style.color = "#00ff88";
powerEl.style.textShadow = "0 0 8px #00A303";
    let r = rarity.toLowerCase();

    // reset
    nameEl.style.color = "white";
    nameEl.style.textShadow = "none";
    rarityEl.style.color = "white";
    rarityEl.style.textShadow = "none";

    // rarity glow

   const rarityColors = {
    common: "#aaaaaa",
    rare: "#3aa0ff",
    epic: "#a335ee",
     electric: "#00ffff",
    unique: "#ff9a00",
    magma: "#ff6600",
    terror: "#9900D1",
    dark: "#4B2D63",
    mythical: "#3A339E",
    divine: "#C9C624",
    void: "#FF00E2",
    "void+": "#FF2E8F"
};



let color = rarityColors[r] || "white";
let selected = document.querySelector(".item.selected");
if(quoteEl){

    quoteEl.style.color = color;

    quoteEl.style.textShadow =
        `0 0 8px ${color}`;

}
if (selected) {
    selected.style.borderColor = color;
    selected.style.boxShadow = `0 0 12px ${color}`;
}
document.querySelector(".selected")?.style.setProperty("--select-color", color);

iconEl.style.filter = `drop-shadow(0 0 10px ${color})`;


// stop old loop
if (particleInterval !== null) {
    clearInterval(particleInterval);
}

// start infinite particle loop
particleInterval = setInterval(() => {
    spawnParticle(color);
}, 200);

let container = document.getElementById("particleContainer");

function spawnParticle(color) {
    let icon = document.getElementById("itemIcon");
    let container = document.getElementById("particleContainer");

    let rect = icon.getBoundingClientRect();

    let p = document.createElement("div");
    p.className = "particle";

    p.style.background = color;
    p.style.boxShadow = `0 0 8px ${color}`;

    // position relative to icon
    p.style.left = rect.left + Math.random() * rect.width + "px";
    p.style.top = rect.top + rect.height + "px";

    container.appendChild(p);

    setTimeout(() => p.remove(), 1000);
}

rarityEl.style.color = color;
rarityEl.style.textShadow = "0 0 10px " + color;

    // apply glow to name
    nameEl.style.color = rarityEl.style.color;
    nameEl.style.textShadow = rarityEl.style.textShadow;
}



//! Enchant !//

function applyEnchant() {

    let select = document.getElementById("enchantSelect");
    let enchantName = document.getElementById("enchantName");
    let title = document.getElementById("enchantTitle");
    let desc = document.getElementById("enchantDesc");
    let icon = document.getElementById("enchantIcon");

    let value = parseInt(select.value);
    let text = select.options[select.selectedIndex].text;

    // ✅ DO NOT BLOCK value 0 (Loot+)
    if (value === null || value === undefined) return;

    // ✅ ONLY apply damage if value > 0
    if (value > 0) {
        document.getElementById("damage").textContent = baseDamage + value;
    }

    

    // ✅ KEEP YOUR +1 SYSTEM
    enchantName.textContent = "+" + value;

    // reset
    title.textContent = "NA";
    desc.textContent = "No enchant selected. Select a enchant to see what it does.";
    icon.src = "na.png";
    enchantName.style.color = "#B900D1";

  

    // enchant logic

    if (text.includes("Select Enchant")) {
        title.textContent = "NA";
        desc.textContent = "No enchant.";
        icon.src = "na.png";
        enchantName.style.color = "#7B2828";
    }
    if (text.includes("Frost")) {
        title.textContent = "Frost";
        desc.textContent = "Slows enemies";
        icon.src = "frost.png";
        enchantName.style.color = "#3aa0ff";
    }
    else if (text.includes("Fire")) {
        title.textContent = "Fire";
        desc.textContent = "Burns enemies";
        icon.src = "fire.png";
        enchantName.style.color = "#ff6600";
    }
    else if (text.includes("Shock")) {
        title.textContent = "Shock";
        desc.textContent = "Chains lightning";
        icon.src = "shock.png";
        enchantName.style.color = "#ffff00";
    }
    else if (text.includes("Loot+")) {
        title.textContent = "Loot+";
        desc.textContent = "+25% emeralds, +15% food";
        icon.src = "lootupg.png";
        enchantName.style.color = "#8AFF9D";
    }
    else if (text.includes("+1")) {
        title.textContent = "+1 Boost";
        desc.textContent = "Minor power increase";
        icon.src = "plusone.png";
        enchantName.style.color = "#00D1C0";
    }

    else if (text.includes("Exploding")) {
        title.textContent = "Exploding";
        desc.textContent = "Explodes ememys on death.";
        icon.src = "exploding.png";
        enchantName.style.color = "#d10069";
    }

    // glow
    enchantName.style.textShadow = "0 0 6px " + enchantName.style.color;
    desc.style.color = enchantName.style.color;
    desc.style.textShadow = "0 0 6px " + enchantName.style.color;
}

    
window.showItem = showItem;
window.applyEnchant = applyEnchant;

document.querySelectorAll(".item").forEach(item => {
    item.addEventListener("click", function () {
        document.querySelectorAll(".item").forEach(i => {
            i.classList.remove("selected");
            i.style.borderColor = "";
            i.style.boxShadow = "";
        });

        this.classList.add("selected");

        // force correct rarity color after click
        requestAnimationFrame(() => {
            let rarity = document.getElementById("rarity").textContent.toLowerCase();

            const rarityColors = {
                common: "#aaaaaa",
                rare: "#3aa0ff",
                epic: "#a335ee",
                electric: "#00ffff",
                unique: "#ff9a00",
                magma: "#ff6600",
                terror: "#9900D1",
                dark: "#4B2D63",
                mythical: "#3A339E",
                divine: "#C9C624",
                void: "#FF00E2",
                "void+": "#FF2E8F"
            };

            let color = rarityColors[rarity] || "white";

            this.style.borderColor = color;
            this.style.boxShadow = `0 0 12px ${color}`;
        });
    });
});


