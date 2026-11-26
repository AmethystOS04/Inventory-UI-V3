console.log("script loaded :3");



const starterPool = [
    "Flame Sword",
    "Daggers",
    "Bow",
    "Electric Hammer V2",
    "Cursed Axe",
    "Winter's Touch",
    "Staff of Terror",
    "Axe",
    "Void Stabilizer",
    "Pixel Diamond Pickaxe"
];

const welcomeMessages = [

    "ready to continue building the inventory :3",
    "my code is messy, and i cant even read any of it",
    "const rarityColors! i found a dupe glitch and there are 2 of them now",
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    "ccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
    "affinity my beloved",

    "your weapons missed you",

    "the void awaits your return",

    "ready when you are :p",

    "time to collect more loot",


    "another day another inventory redesign",

    "your storage is probably full already",

    "the dungeon calls once more",

    "the inventory exploded but we fixed it, promise",

    "adding more explosions. please wait... :p",

"the code got eaten but we rewrote it, *explosion.mp3* are you kidding me i worked hard on that code",
"the blacksmith misplaced your axe again",

"we told the void to stop eating inventories",

"some assembly required",

"WARNING: loot addiction detected",

"totally not held together by localStorage",


"your daggers are arguing again",

"the inventory goblins reorganized everything",
"iq: -44444 help me",
"i am the void *gasp*",
"hi",
"the UI survived another rewrite",
"i ate ur weapons hahahahahaahha get rekt",
"inventory v1 my beloved",
"i threw your inventory in the void and laughed",
"i may or may not have stolen some of your weapons for myself, who knows :p",
    "the loot goblins have returned"
];

function shuffleArray(array){

    for(let i = array.length - 1; i > 0; i--){

        let j = Math.floor(Math.random() * (i + 1));

        [array[i], array[j]] = [array[j], array[i]];
    }

    return array;
}

function generateStarterChoices(){

    const container = document.getElementById("starterWeapons");

    if(!container) return;

    container.innerHTML = "";

    let shuffled = shuffleArray([...starterPool]);

    let selected = shuffled.slice(0, 4);

    selected.forEach(weapon => {

        let btn = document.createElement("button");

        btn.textContent = weapon;

        btn.onclick = () => chooseStarter(weapon);

        container.appendChild(btn);
    });
}

generateStarterChoices();

function readInventoryBalanceNumber(key) {
    const raw = String(localStorage.getItem(key) || "0").trim();
    if (/^tree\(\s*\d+\s*\)$/i.test(raw) || /^infinity$/i.test(raw)) return Infinity;
    const value = Number(raw);
    return Number.isFinite(value) && value >= 0 ? value : 0;
}
let ap = readInventoryBalanceNumber("ap");
let mp = readInventoryBalanceNumber("mp");
let stardust = readInventoryBalanceNumber("stardust");

window.formatInventoryNumber = function (value) {
    const amount = Number(value) || 0;
    if (!Number.isFinite(amount)) {
        return "infinity";
    }
    const absolute = Math.abs(amount);
    if (absolute < 1000) return String(amount);
    const suffixes = ["", "k", "m", "b", "t", "qa", "qi", "sx", "sp", "oc", "no", "dc"];
    if (absolute >= 1000 ** suffixes.length) {
        const [mantissa, exponent] = amount.toExponential(2).split("e");
        return `${Number(mantissa)}e${Number(exponent)}`;
    }
    let tier = Math.min(Math.floor(Math.log10(absolute) / 3), suffixes.length - 1);
    let scaled = amount / (1000 ** tier);
    let rounded = Number(scaled.toFixed(Math.abs(scaled) < 10 ? 1 : 0));
    if (Math.abs(rounded) >= 1000 && tier < suffixes.length - 1) {
        tier += 1;
        scaled = amount / (1000 ** tier);
        rounded = Number(scaled.toFixed(Math.abs(scaled) < 10 ? 1 : 0));
    }
    return `${rounded}${suffixes[tier]}`;
};
window.formatInventoryNumberLong = function (value) {
    const amount = Number(value) || 0;
    const absolute = Math.abs(amount);
    if (absolute < 1000) return String(amount);
    const suffixes = ["", "thousand", "million", "billion", "trillion", "quadrillion", "quintillion", "sextillion", "septillion", "octillion", "nonillion", "decillion"];
    if (absolute >= 1000 ** suffixes.length) {
        const [mantissa, exponent] = amount.toExponential(2).split("e");
        return `${Number(mantissa)}e${Number(exponent)}`;
    }
    let tier = Math.min(Math.floor(Math.log10(absolute) / 3), suffixes.length - 1);
    let scaled = amount / (1000 ** tier);
    let rounded = Number(scaled.toFixed(Math.abs(scaled) < 10 ? 1 : 0));
    if (Math.abs(rounded) >= 1000 && tier < suffixes.length - 1) {
        tier += 1;
        scaled = amount / (1000 ** tier);
        rounded = Number(scaled.toFixed(Math.abs(scaled) < 10 ? 1 : 0));
    }
    return `${rounded} ${suffixes[tier]}`;
};
window.formatInventoryBalance = (value, key) => {
    const raw = String(localStorage.getItem(key) || "").trim();
    if (/^tree\(\s*\d+\s*\)$/i.test(raw) || /^infinity$/i.test(raw)) return raw.toLowerCase();
    return localStorage.getItem("inventoryBalanceFullNamesV1") === "true"
        ? window.formatInventoryNumberLong(value)
        : window.formatInventoryNumber(value);
};
window.getInventoryBalance = key => {
    return readInventoryBalanceNumber(key);
};

document.getElementById("apBalance").textContent = window.formatInventoryBalance(ap, "ap");
document.getElementById("mpBalance").textContent = window.formatInventoryBalance(mp, "mp");
document.getElementById("stardustBalance").textContent = window.formatInventoryBalance(stardust, "stardust");
document.getElementById("apBalance").classList.toggle("is-infinity", String(localStorage.getItem("ap") || "").trim().toLowerCase() === "infinity");
document.getElementById("mpBalance").classList.toggle("is-infinity", String(localStorage.getItem("mp") || "").trim().toLowerCase() === "infinity");
document.getElementById("stardustBalance").classList.toggle("is-infinity", String(localStorage.getItem("stardust") || "").trim().toLowerCase() === "infinity");

window.addEventListener("DOMContentLoaded", () => {

    const overlay = document.getElementById("starterOverlay");
const randomMessage =
    welcomeMessages[
        Math.floor(
            Math.random() * welcomeMessages.length
        )
    ];
    if(localStorage.getItem("starterClaimed")){

        overlay.innerHTML = `
            <div class="welcome-changelog-layout">
              <div class="starter-popup welcome-layout">
                <div class="welcome-main">
                  <h1>Welcome Back</h1>
                  <p class="welcome-message">${randomMessage}</p>
                  <button id="continueBtn">Continue</button>
                </div>
                <div class="welcome-selector">
                  <h2>Welcome Text</h2>
                  <select id="welcomeSelect"></select>
                </div>
              </div>
              <aside id="changelog-panel" aria-label="Changelog">
                <h2 class="changelog-panel-title">Changelog</h2>
                <div class="changelog-loading">Loading changelog...</div>
              </aside>
            </div>
        `;

        // Keep the changelog beside the existing welcome popup without changing the inventory layout
        if (!document.getElementById("welcomeChangelogStyles")) {
            const style = document.createElement("style");
            style.id = "welcomeChangelogStyles";
            style.textContent = `
              #starterOverlay { overflow-y:auto; }
              .welcome-changelog-layout { display:flex; align-items:flex-start; justify-content:center; gap:22px; width:min( min(96vw, 1320px), 100%); max-height:88vh; margin:auto; }
              .welcome-changelog-layout > .starter-popup { flex:0 1 700px; align-self:flex-start; min-width:0; margin:0; }
              #changelog-panel { flex:0 0 340px; align-self:flex-start; height:auto; max-height:60vh; min-height:0; min-width:260px; max-width:360px; overflow-y:auto; box-sizing:border-box; padding:20px; border:2px solid #d000ff; border-radius:20px; background:rgba(12,5,20,.97); color:#f4efff; box-shadow:0 0 24px #d000ff; text-align:left; }
              .changelog-panel-title { margin:0 0 14px; color:#ed00ff; text-align:center; }
              .changelog-shell { display:flex; flex-direction:column; gap:14px; }
              .changelog-version { padding:12px; border:1px solid #493052; border-radius:12px; background:#1b1728; }
              .changelog-version-heading { display:flex; justify-content:space-between; gap:8px; }
              .changelog-version-heading h2 { margin:4px 0 8px; font-size:1.05rem; }
              .changelog-kicker,.changelog-entry-type { font-size:.7rem; color:#c5afd5; }
              .changelog-version-number { white-space:nowrap; }
              .changelog-entry { padding:10px 0; border-top:1px solid #493052; }
              .changelog-entry h3 { margin:4px 0; font-size:.95rem; }
              .changelog-entry-description p { margin:6px 0; }
              .changelog-loading { color:#c5afd5; text-align:center; }
              @media(max-width:850px) { .welcome-changelog-layout { flex-direction:column; align-items:center; width:min(96vw,700px); max-height:none; } .welcome-changelog-layout > .starter-popup { flex:0 0 auto; align-self:stretch; width:100%; } #changelog-panel { flex:0 0 auto; align-self:stretch; width:100%; height:auto; max-height:35vh; min-height:0; max-width:none; min-width:0; } }
            `;
            document.head.appendChild(style);
        }

        const changelogPanel = document.getElementById("changelog-panel");
        const loadChangelog = () => {
            if (!window.InventoryChangelog) {
                changelogPanel.textContent = "Unable to load changelog renderer";
                return;
            }
            window.InventoryChangelog.load("changelog.json", changelogPanel).catch(error => {
                console.error("Failed to load changelog:", error);
                changelogPanel.textContent = "Unable to load changelog";
            });
        };
        if (window.InventoryChangelog) {
            loadChangelog();
        } else {
            const renderer = document.createElement("script");
            renderer.src = "changelog.js";
            renderer.onload = loadChangelog;
            renderer.onerror = () => { changelogPanel.textContent = "Unable to load changelog renderer"; };
            document.head.appendChild(renderer);
        }
        window.addEventListener("focus", () => {
            if (window.InventoryChangelog) loadChangelog();
        });
        document.addEventListener("visibilitychange", () => {
            if (!document.hidden && window.InventoryChangelog) loadChangelog();
        });


const select = document.getElementById("welcomeSelect");

welcomeMessages.forEach((msg, i) => {

    const option = document.createElement("option");

    option.value = i;
    option.textContent = msg;

    select.appendChild(option);

});

select.selectedIndex = welcomeMessages.indexOf(randomMessage);

select.addEventListener("change", () => {

    document.querySelector(".welcome-message").textContent =
        welcomeMessages[select.value];

});

select.addEventListener("change", () => {

    document.querySelector(".welcome-message").textContent =
        welcomeMessages[select.value];
});

        overlay.style.display = "flex";

        document
            .getElementById("continueBtn")
            .onclick = () => {

                overlay.style.display = "none";
            };
    }
    
});

function chooseStarter(weapon){

    ap += 100;
    mp += 20;

    if (Number.isFinite(ap)) localStorage.setItem("ap", ap);
    if (Number.isFinite(mp)) localStorage.setItem("mp", mp);

    localStorage.setItem("starterWeapon", weapon);
    localStorage.setItem("starterClaimed", "true");

    document.getElementById("starterOverlay").style.display = "none";

    console.log("starter selected:", weapon);
}

// choose starter weapon



let baseDamage = 0;
let iconEl = document.getElementById("itemIcon");

function showItem(
    name,
    damage,
    rarity,
    maxLvl,
    resilience = 0,
    artifactEffectPower = 0,
    seasonalEvent = false,
    seasonalLevel = 0,
    quote = "",
    soulUsage = ""
){

    baseDamage = damage;

    const raritySelectionColors = {
        common: "#aaaaaa", rare: "#3aa0ff", epic: "#a335ee", electric: "#00ffff",
        unique: "#ff9a00", magma: "#ff6600", terror: "#9900d1", dark: "#4b2d63",
        mythical: "#3a339e", divine: "#c9c624", void: "#ff00e2", "void+": "#ff2e8f",
        pixel: "#00ff33", frozen: "#8dfffb", flamed: "#ff0000", artifact: "#8b8186",
        forgotten: "#362424", gravity: "#ee35ff", dominance: "#ffa2ee", shadow: "#5c1082",
        seasonal: "#ff0381", special: "#007bff", none: "#7b2828"
    };
    const selectedCard = Array.from(document.querySelectorAll(".items .item")).find(card =>
        card.dataset.itemName === name || (card.getAttribute("onclick") || "").includes(`'${String(name).replace(/'/g, "\\'")}'`)
    );
    if (selectedCard) {
        document.querySelectorAll(".items .item.selected").forEach(card => card.classList.remove("selected"));
        selectedCard.dataset.itemName = name;
        selectedCard.dataset.rarity = rarity;
        selectedCard.dataset.damage = String(damage);
        selectedCard.dataset.resilience = String(resilience);
        selectedCard.dataset.artifactPower = String(Number(artifactEffectPower) || 0);
        selectedCard.style.setProperty("--item-selection-color", raritySelectionColors[String(rarity).trim().toLowerCase()] || "#ffffff");
        selectedCard.classList.add("selected");
    }



iconEl.src = icons[name] || "icons/default.png";
iconEl.dataset.itemName = name;

// [[ show weapon data ]] \\

    let nameEl = document.getElementById("name");
    let dmgEl = document.getElementById("damage");
    let rarityEl = document.getElementById("rarity");
    let resilienceEl = document.getElementById("resilience");
    let artifactEffectPowerEl = document.getElementById("artifactEffectPower");
    let seasonalEventEl = document.getElementById("seasonalEvent");
    let seasonalLevelEl = document.getElementById("seasonalLevel");
    let soulUsageEl = document.getElementById("soulUsage");

    nameEl.textContent = name;
    dmgEl.textContent = damage;
    rarityEl.textContent = rarity;
    resilienceEl.textContent = resilience;
    artifactEffectPowerEl.textContent = artifactEffectPower;
    seasonalEventEl.textContent = seasonalEvent;
    seasonalLevelEl.textContent = seasonalLevel;
    soulUsageEl.textContent = soulUsage;
    document.getElementById("soulUsageRow").hidden = !String(soulUsage).trim();
    window.InventoryItemEffects?.render(name, rarity);

    document.getElementById("max power lvl").textContent = maxLvl;
   const quoteEl = document.getElementById("itemQuote");
document.getElementById("seasonalContainer").style.display =
    seasonalEvent ? "block" : "none";
    
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

if (parseInt(resilienceEl.textContent) < 15) {
    resilienceEl.style.color = "#aaaaaa";
    resilienceEl.style.textShadow = "0 0 4px #888";
}
else if (parseInt(resilienceEl.textContent) < 30) {
    resilienceEl.style.color = "#ff3ab7";
    resilienceEl.style.textShadow = "0 0 6px #ff3ab7";
}
else if (parseInt(resilienceEl.textContent) < 50) {
    resilienceEl.style.color = "#a335ee";
    resilienceEl.style.textShadow = "0 0 8px #a335ee";
}
else {
    resilienceEl.style.color = "#00bfff";
    resilienceEl.style.textShadow = "0 0 10px #00bfff";
}


if (parseInt(artifactEffectPowerEl.textContent) < 15) {
    artifactEffectPowerEl.style.color = "#aaaaaa";
    artifactEffectPowerEl.style.textShadow = "0 0 4px #888";
}
else if (parseInt(artifactEffectPowerEl.textContent) < 30) {
    artifactEffectPowerEl.style.color = "#ff3ab7";
    artifactEffectPowerEl.style.textShadow = "0 0 6px #ff3ab7";
}
else if (parseInt(artifactEffectPowerEl.textContent) < 50) {
    artifactEffectPowerEl.style.color = "#a335ee";
    artifactEffectPowerEl.style.textShadow = "0 0 8px #a335ee";
}
else {
    artifactEffectPowerEl.style.color = "#00bfff";
    artifactEffectPowerEl.style.textShadow = "0 0 10px #00bfff";
}


if (parseInt(seasonalEventEl.textContent) === true) {
    seasonalEventEl.style.color = "#ff00cc";
    seasonalEventEl.style.textShadow = "0 0 10px #ff00d4";
}
else {
    seasonalEventEl.style.color = "#12acff";
    seasonalEventEl.style.textShadow = "0 0 10px #12acff";
}

if (parseInt(seasonalLevelEl.textContent) > 0) {
    seasonalLevelEl.style.color = "#ff00cc";
    seasonalLevelEl.style.textShadow = "0 0 10px #ff00d4";
}
else if (parseInt(seasonalLevelEl.textContent) > 8) {
    seasonalLevelEl.style.color = "#12ff16";
    seasonalLevelEl.style.textShadow = "0 0 10px #12ff16";
}
else if (parseInt(seasonalLevelEl.textContent) < 30) {
    seasonalLevelEl.style.color = "#ff3ab7";
    seasonalLevelEl.style.textShadow = "0 0 6px #ff3ab7";
}
else if (parseInt(seasonalLevelEl.textContent) < 50) {
    seasonalLevelEl.style.color = "#a335ee";
    seasonalLevelEl.style.textShadow = "0 0 8px #a335ee";
}
else {
    seasonalLevelEl.style.color = "#872777";
    seasonalLevelEl.style.textShadow = "0 0 10px #872777";
}
  let powerEl = document.getElementById("max power lvl");

if(maxLvl === "∞"){

    powerEl.classList.add("infinity-power");

}else{

    powerEl.classList.remove("infinity-power");

    powerEl.style.color = "#00ff88";
    powerEl.style.textShadow = "0 0 8px #00A303";
}
    let r = String(rarity || "").trim().toLowerCase();

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
    dark: "#5b238a",
    mythical: "#3A339E",
    divine: "#C9C624",
    void: "#FF00E2",
    "void+": "#FF2E8F",
    pixel: "#00ff33",
     frozen: "#8dfffb",
      flamed: "#ff0000",
       artifact: "#8b8186",
         forgotten: "#362424",
         gravity: "#ee35ff",
         dominance: "#ffa2ee",
         shadow: "#5c1082",
         seasonal: "#ff0381",
        special: "#007BFF",
    none: "#7B2828"
};



let color = rarityColors[r] || "white";
iconEl.style.filter = `drop-shadow(0 0 10px ${color})`;




if(quoteEl){

    quoteEl.style.color = color;

    quoteEl.style.textShadow =
        `0 0 8px ${color}`;

}

rarityEl.style.color = color;
rarityEl.style.textShadow = "0 0 10px " + color;

    // apply glow to name
    nameEl.style.color = rarityEl.style.color;
    nameEl.style.textShadow = rarityEl.style.textShadow;
}
window.showItem = showItem;

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
            let rarity = document.getElementById("rarity").textContent.trim().toLowerCase();

            const rarityColors = {
                common: "#aaaaaa",
                rare: "#3aa0ff",
                epic: "#a335ee",
                electric: "#00ffff",
                unique: "#ff9a00",
                magma: "#ff6600",
                terror: "#9900D1",
                dark: "#68279c",
                mythical: "#3A339E",
                divine: "#C9C624",
                void: "#FF00E2",
                "void+": "#FF2E8F",
                 pixel: "#00ff33",
                  frozen: "#8dfffb",
                  gravity: "#ee35ff",
      flamed: "#ff0000",
       artifact: "#8b8186",
       forgotten: "#2f1515",
       dominance: "#ffa2ee",
        shadow: "#5c1082",
        seasonal: "#ff0381",
special: "#007BFF",
                none: "#7B2828"
            };

            let color = rarityColors[rarity] || "white";

            this.style.borderColor = color;
            this.style.boxShadow = `0 0 12px ${color}`;
        });
    });
});
