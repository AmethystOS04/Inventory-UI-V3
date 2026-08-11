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
    
    "affinity my beloved",

    "your weapons missed you",

    "the void awaits your return",

    "ready when you are :p",

    "time to collect more loot",

    "the enchant table is humming again",

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

"the enchant table smells like burning",

"your daggers are arguing again",

"the inventory goblins reorganized everything",

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

let ap = parseInt(localStorage.getItem("ap")) || 0;
let mp = parseInt(localStorage.getItem("mp")) || 0;

document.getElementById("apBalance").textContent = ap;
document.getElementById("mpBalance").textContent = mp;

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
            <div class="starter-popup">

                <h1>Welcome Back</h1>


                <p class="welcome-message">
                  ${randomMessage}
                </p>
                


                <button id="continueBtn">
                    Continue
                </button>

            </div>
        `;

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

    localStorage.setItem("ap", ap);
    localStorage.setItem("mp", mp);

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

 let protEL = document.getElementById("prot");
if (parseInt(protEl.textContent) < 15) {
    protEl.style.color = "#aaaaaa";
    protEl.style.textShadow = "0 0 4px #888";
}
else if (parseInt(protEl.textContent) < 30) {
    protEl.style.color = "#ff3ab7";
    protEl.style.textShadow = "0 0 6px #ff3ab7";
}
else if (parseInt(protEl.textContent) < 50) {
    protEl.style.color = "#a335ee";
    protEl.style.textShadow = "0 0 8px #a335ee";
}
else {
    protEl.style.color = "#00bfff";
    protEl.style.textShadow = "0 0 10px #00bfff";
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

  let powerEl = document.getElementById("max power lvl");


if(maxLvl === "∞"){

    powerEl.classList.add("infinity-power");

}else{

    powerEl.classList.remove("infinity-power");

    powerEl.style.color = "#00ff88";
    powerEl.style.textShadow = "0 0 8px #00A303";
}
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
    "void+": "#FF2E8F",
    pixel: "#00ff33",
     frozen: "#8dfffb",
      flamed: "#ff0000",
       artifact: "#8b8186",
         forgotten: "#362424",
         gravity: "#ee35ff",
         dominance: "#ffa2ee",
         shadow: "#5c1082",
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
function flashInfoPanel(color){

    const panel = document.querySelector(".info-panel");

    if(!panel) return;

    panel.style.setProperty(
        "--flash-color",
        color
    );

    panel.classList.remove("flash-active");

    void panel.offsetWidth;

    panel.classList.add("flash-active");
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
    else if (text.includes("Smiting")) {
        title.textContent = "Smiting";
        desc.textContent = "Deals extra damage to undead";
        icon.src = "smiting.png";
        enchantName.style.color = "#b5d100";
        console.log("Matched Smiting");
    }
    else if (text.includes("Exploding")) {
        title.textContent = "Exploding";
        desc.textContent = "Explodes ememys on death.";
        icon.src = "exploding.png";
        enchantName.style.color = "#d10069";
    }
     else if (text.includes("Unbreaking")) {
        title.textContent = "Unbreaking";
        desc.textContent = "whats a durability?";
        icon.src = "icons/default.png";
        enchantName.style.color = "#e610db";
    }
    else if (text.includes("Piercing")) {
        title.textContent = "Piercing";
        desc.textContent = "Passes through multiple enemies";
        icon.src = "piercing.png";
        enchantName.style.color = "#00ff00";
        
    }
    else if (text.includes("Mending")) {
        title.textContent = "Mending";
        desc.textContent = "tf you mean your tool broke? mine hasnt even broke since 7 years";
        icon.src = "mending.png";
        enchantName.style.color = "#00ff00";
        
    }
    else if (text.includes("Sharpness")) {
        title.textContent = "Sharpness";
        desc.textContent = "man i wish this redstone golem died oh wait i have sharpness on my sword";
        icon.src = "sharpness.png";
        enchantName.style.color = "#00fffb";
        
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
    // glow
    enchantName.style.textShadow = "0 0 6px " + enchantName.style.color;
    desc.style.color = enchantName.style.color;
    desc.style.textShadow = "0 0 6px " + enchantName.style.color;
    flashInfoPanel(enchantName.style.color);

text.includes("Smiting")
    console.log("enchant applied:", title.textContent, desc.textContent, enchantName.textContent);
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
                "void+": "#FF2E8F",
                 pixel: "#00ff33",
                  frozen: "#8dfffb",
                  gravity: "#ee35ff",
      flamed: "#ff0000",
       artifact: "#8b8186",
       forgotten: "#2f1515",
       dominance: "#ffa2ee",
        shadow: "#5c1082",
                none: "#7B2828"
            };

            let color = rarityColors[rarity] || "white";

            this.style.borderColor = color;
            this.style.boxShadow = `0 0 12px ${color}`;
        });
    });
});


