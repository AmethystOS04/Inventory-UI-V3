(() => {
    const storageKey = "dailyMissionsV1";
    const catalogStorageKey = "customQuestDefinitionsV1";

    function dateKey(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    const formatAmount = value => window.formatInventoryNumber ? window.formatInventoryNumber(value) : Number(value).toLocaleString();
    const getBalance = key => window.getInventoryBalance ? window.getInventoryBalance(key) : Number(localStorage.getItem(key)) || 0;

    function getToday() {
        return dateKey(new Date());
    }

    const defaultQuestOptions = {
        "inspect-5": { title: "loot scout", objective: "inspect 5 different items", tracker: "items", target: 5, noun: "items inspected", ap: 40, mp: 15 },
        "inspect-8": { title: "deep sweep", objective: "inspect 8 different items", tracker: "items", target: 8, noun: "items inspected", ap: 40, mp: 15 },
        "inspect-12": { title: "arsenal survey", objective: "inspect 12 different items", tracker: "items", target: 12, noun: "items inspected", ap: 40, mp: 15 },
        "realities-3": { title: "reality hopper", objective: "visit 3 different realities", tracker: "realities", target: 3, noun: "realities visited", ap: 25, mp: 15 },
        "realities-5": { title: "realm walker", objective: "visit 5 different realities", tracker: "realities", target: 5, noun: "realities visited", ap: 25, mp: 15 },
        "realities-7": { title: "reality drifter", objective: "visit 7 different realities", tracker: "realities", target: 7, noun: "realities visited", ap: 25, mp: 15 },
        "enchant-1": { title: "blacksmith's touch", objective: "apply 1 enchant", tracker: "enchants", target: 1, noun: "enchants applied", ap: 35, mp: 20 },
        "enchant-2": { title: "rune crafter", objective: "apply 2 enchants", tracker: "enchants", target: 2, noun: "enchants applied", ap: 35, mp: 20 },
        "enchant-3": { title: "master smith", objective: "apply 3 enchants", tracker: "enchants", target: 3, noun: "enchants applied", ap: 35, mp: 20 }
    };

    function readQuestCatalog() {
        try {
            const stored = JSON.parse(localStorage.getItem(catalogStorageKey)) || {};
            return {
                daily: Array.isArray(stored.daily) ? stored.daily : [],
                weekly: Array.isArray(stored.weekly) ? stored.weekly : []
            };
        } catch {
            return { daily: [], weekly: [] };
        }
    }

    const customCatalog = readQuestCatalog();
    const questOptions = { ...defaultQuestOptions };
    customCatalog.daily.forEach(quest => {
        if (quest?.id && ["items", "realities", "enchants"].includes(quest.tracker)) {
            questOptions[quest.id] = quest;
        }
    });

    const questSlots = ["inspect", "realities", "enchant"];
    const slotTrackers = { inspect: "items", realities: "realities", enchant: "enchants" };
    function randomChoice(values) {
        return values[Math.floor(Math.random() * values.length)];
    }

    function questChoices(slot, excluded = []) {
        return Object.keys(questOptions).filter(id =>
            questOptions[id].tracker === slotTrackers[slot] && !excluded.includes(id)
        );
    }

    function assignFreshQuests() {
        const assigned = {};
        questSlots.forEach(slot => {
            const used = Object.values(assigned);
            const choice = randomChoice(questChoices(slot, used));
            assigned[slot] = choice;
        });
        return assigned;
    }

    function freshState(date = getToday()) {
        return {
            date,
            quests: assignFreshQuests(),
            progress: {
                inspect: { count: 0, seen: [] },
                realities: { count: 0, seen: [] },
                enchant: { count: 0 }
            },
            completed: {},
            rewarded: {}
        };
    }

    let state;
    try {
        state = JSON.parse(localStorage.getItem(storageKey)) || freshState();
    } catch {
        state = freshState();
    }
    if (state.date !== getToday()) state = freshState();
    if (!state.quests || !state.progress) {
        const completedToday = state.completed || {};
        state = freshState(state.date);
        state.completed = completedToday;
        save();
    }
    state.completed ||= {};
    state.rewarded ||= {};

    const eventCatalogStorageKey = "inventoryEventsV1";
    const eventQuestStorageKey = "eventMissionProgressV1";
    const useLocalEventDraft = ["localhost", "127.0.0.1"].includes(location.hostname);
    function readEventCatalog() {
        if (useLocalEventDraft) {
            try {
                const stored = JSON.parse(localStorage.getItem(eventCatalogStorageKey));
                if (Array.isArray(stored)) return stored.filter(event => event && event.id && event.name && Array.isArray(event.items));
            } catch {
                return [];
            }
        }
        return Array.isArray(window.INVENTORY_EVENT_CATALOG) ? window.INVENTORY_EVENT_CATALOG.filter(event => event && event.id && event.name && Array.isArray(event.items)) : [];
    }
    function findActiveEvent() {
        const now = Date.now();
        return readEventCatalog().find(event => {
            if (!event.start) return false;
            const start = new Date(event.start).getTime();
            const end = event.end ? new Date(event.end).getTime() : Infinity;
            return Number.isFinite(start) && start <= now && now <= end;
        }) || null;
    }
    let activeEvent = findActiveEvent();
    let eventQuestProgress = {};
    try {
        eventQuestProgress = JSON.parse(localStorage.getItem(eventQuestStorageKey)) || {};
    } catch {
        eventQuestProgress = {};
    }
    function progressForEvent(event) {
        eventQuestProgress[event.id] ||= { completed: [], assignments: {} };
        const progress = eventQuestProgress[event.id];
        if (!Array.isArray(progress.completed)) progress.completed = [];
        if (!progress.assignments || typeof progress.assignments !== "object") progress.assignments = {};
        return progress;
    }
    function saveEventQuestProgress() {
        localStorage.setItem(eventQuestStorageKey, JSON.stringify(eventQuestProgress));
    }
    function eventItemWasEarned(name) {
        return typeof window.wasEventItemUnlocked === "function" && window.wasEventItemUnlocked(name);
    }
    function eventItemIsOwned(name) {
        return typeof window.isItemUnlocked === "function" && window.isItemUnlocked(name);
    }
    function getEventAssignments(event) {
        const progress = progressForEvent(event);
        const eligible = Array.from(new Set(event.items.map(name => String(name).trim()).filter(name =>
            name && !progress.completed.includes(name) && !eventItemWasEarned(name) && !eventItemIsOwned(name)
        )));
        const used = new Set();
        let changed = false;
        questSlots.forEach(slot => {
            let item = progress.assignments[slot];
            if (!eligible.includes(item) || used.has(item)) {
                const choices = eligible.filter(name => !used.has(name));
                item = choices.length ? randomChoice(choices) : "";
                progress.assignments[slot] = item;
                changed = true;
            }
            if (item) used.add(item);
        });
        if (changed) saveEventQuestProgress();
        return progress.assignments;
    }

    function updateEventMission(slot) {
        const card = document.querySelector(`[data-mission="${slot}"]`);
        const title = card.querySelector("h4");
        const objective = card.querySelector(".mission-objective");
        const progress = card.querySelector(".mission-progress");
        const meter = card.querySelector(".mission-meter span");
        const reward = card.querySelector(".mission-reward");
        const status = card.querySelector(".mission-status");
        const refreshButton = card.querySelector("[data-refresh-quest]");
        const playButton = card.querySelector("[data-event-quest]");
        const item = getEventAssignments(activeEvent)[slot];
        title.textContent = item ? `${activeEvent.name} · ${item}` : activeEvent.name;
        objective.textContent = item ? "survive the rift arena to unlock this event item" : "all available event items have been earned";
        progress.textContent = item ? "event reward quest" : "no event quest available";
        meter.style.width = item ? "0%" : "100%";
        reward.textContent = item ? `unlock ${item}` : "event rewards complete";
        status.textContent = item ? "play the arena to earn this item" : "completed or already earned";
        status.classList.toggle("complete", !item);
        card.classList.toggle("mission-complete", !item);
        refreshButton.hidden = true;
        playButton.hidden = !item;
        playButton.disabled = !item;
        playButton.textContent = item ? `play event quest · ${item}` : "event item earned";
        const message = card.querySelector(".mission-refresh-message");
        message.textContent = "";
    }

    function save() {
        localStorage.setItem(storageKey, JSON.stringify(state));
    }

    function repairQuestAssignments() {
        const used = [];
        questSlots.forEach(slot => {
            const current = state.quests[slot];
            if (questOptions[current]?.tracker !== slotTrackers[slot]) {
                state.quests[slot] = randomChoice(questChoices(slot, used));
                state.progress[slot] = slot === "enchant" ? { count: 0 } : { count: 0, seen: [] };
                delete state.completed[slot];
                delete state.rewarded[slot];
            }
            used.push(state.quests[slot]);
        });
    }

    function settleUnpaidDailyRewards() {
        let changed = false;
        questSlots.forEach(slot => {
            if (!state.completed[slot] || state.rewarded[slot]) return;
            const reward = questOptions[state.quests[slot]];
            if (!reward) return;
            if (typeof window.awardCurrency !== "function") return;
            window.awardCurrency(reward.ap, reward.mp);
            state.rewarded[slot] = true;
            changed = true;
        });
        if (changed) save();
    }

    settleUnpaidDailyRewards();
    repairQuestAssignments();
    save();

    function updateMission(id) {
        if (activeEvent) {
            updateEventMission(id);
            return;
        }
        const quest = questOptions[state.quests[id]];
        const reward = quest;
        const progressState = state.progress[id];
        const progress = Math.min(progressState.count, quest.target);
        const card = document.querySelector(`[data-mission="${id}"]`);
        if (!card) return;

        card.querySelector("h4").textContent = quest.title;
        card.querySelector(".mission-objective").textContent = quest.objective;
        card.querySelector(".mission-reward").textContent = `+${formatAmount(quest.ap)} ap · +${formatAmount(quest.mp)} mp`;
        card.querySelector(".mission-progress").textContent =
            `${progress} / ${quest.target} ${quest.noun}`;
        card.querySelector(".mission-meter span").style.width =
            `${(progress / quest.target) * 100}%`;

        const status = card.querySelector(".mission-status");
        if (state.completed[id]) {
            status.textContent = state.rewarded[id] ? "earned today" : "reward pending";
            status.classList.add("complete");
            card.classList.add("mission-complete");
            return;
        }

        status.textContent = "in progress";
        status.classList.remove("complete");
        card.classList.remove("mission-complete");
        if (progress >= quest.target) {
            if (typeof window.awardCurrency !== "function") {
                status.textContent = "reward unavailable · reload to claim";
                return;
            }
            window.awardCurrency(reward.ap, reward.mp);
            state.completed[id] = true;
            state.rewarded[id] = true;
            save();
            status.textContent = `earned +${formatAmount(reward.ap)} ap and +${formatAmount(reward.mp)} mp`;
            status.classList.add("complete");
            card.classList.add("mission-complete");
            syncRefreshControls();
        }
    }

    const refreshCosts = { inspect: 100, realities: 300, enchant: 500 };

    function syncRefreshControls() {
        const balance = getBalance("ap");
        document.getElementById("dailyMissionsHeading").textContent = activeEvent ? "event missions" : "daily missions";
        document.getElementById("dailyRefreshTimer").hidden = Boolean(activeEvent);
        document.querySelectorAll("[data-refresh-quest]").forEach(button => {
            const cost = refreshCosts[button.dataset.refreshQuest];
            button.hidden = Boolean(activeEvent);
            button.disabled = Boolean(activeEvent) || balance < cost;
            button.title = activeEvent ? "event quests cannot be refreshed" : button.disabled ? `need ${cost - balance} more ap` : "spend ap to get a new quest";
        });
        document.querySelectorAll("[data-event-quest]").forEach(button => { button.hidden = !activeEvent; });
    }

    function updateAll() {
        questSlots.forEach(updateMission);
        syncRefreshControls();
    }

    document.querySelectorAll("[data-refresh-quest]").forEach(button => {
        button.addEventListener("click", () => {
            if (activeEvent) return;
            const slot = button.dataset.refreshQuest;
            const message = button.closest(".mission-card").querySelector(".mission-refresh-message");
            const balance = getBalance("ap");
            const cost = refreshCosts[slot];
            if (!window.spendCurrency(cost, 0)) {
                message.textContent = `need ${cost - balance} more ap`;
                syncRefreshControls();
                return;
            }

            const otherQuests = questSlots
                .filter(otherSlot => otherSlot !== slot)
                .map(otherSlot => state.quests[otherSlot]);
            const choices = questChoices(slot, [state.quests[slot], ...otherQuests]);
            state.quests[slot] = randomChoice(choices);
            state.progress[slot] = state.quests[slot].startsWith("enchant-")
                ? { count: 0 }
                : { count: 0, seen: [] };
            delete state.completed[slot];
            delete state.rewarded[slot];
            save();
            message.textContent = `new quest: ${questOptions[state.quests[slot]].title}`;
            updateMission(slot);
            syncRefreshControls();
        });
    });

    function itemName(card) {
        if (card.dataset.itemName) return card.dataset.itemName;
        const match = (card.getAttribute("onclick") || "").match(/showItem\(\s*'((?:\\.|[^'\\])*)'/);
        return match ? match[1].replace(/\\'/g, "'").replace(/\\\\/g, "\\") : "";
    }

    document.querySelector(".items").addEventListener("click", event => {
        const card = event.target.closest(".item");
        if (!card) return;
        const name = itemName(card);
        if (!name) return;
        questSlots.forEach(slot => {
            const quest = questOptions[state.quests[slot]];
            const progress = state.progress[slot];
            if (quest.tracker !== "items" || progress.seen.includes(name)) return;
            progress.seen.push(name);
            progress.count += 1;
            updateMission(slot);
        });
        save();
    });

    document.getElementById("realitySelect").addEventListener("change", event => {
        const reality = event.target.value;
        questSlots.forEach(slot => {
            const quest = questOptions[state.quests[slot]];
            const progress = state.progress[slot];
            if (quest.tracker !== "realities") return;
            if (!quest.repeatVisits && progress.seen.includes(reality)) return;
            if (!quest.repeatVisits) progress.seen.push(reality);
            progress.count += 1;
            updateMission(slot);
        });
        save();
    });

    const originalApplyEnchant = window.applyEnchant;
    window.applyEnchant = function (...args) {
        const result = originalApplyEnchant.apply(this, args);
        const select = document.getElementById("enchantSelect");
        if (select.selectedIndex > 0) {
            questSlots.forEach(slot => {
                const quest = questOptions[state.quests[slot]];
                if (quest.tracker !== "enchants") return;
                state.progress[slot].count += 1;
                updateMission(slot);
            });
            save();
        }
        return result;
    };

    const weeklyOptions = {
        "amethyst-vault": {
            title: "amethyst outbreak",
            objective: "survive the arena for 90 seconds as rift creatures swarm in",
            goal: 2, seconds: 90, ap: 1000, mp: 500
        },
        "deep-vault": {
            title: "deep rift siege",
            objective: "survive the arena for 75 seconds as rift creatures swarm in",
            goal: 4, seconds: 75, ap: 1000, mp: 500
        },
        "rift-vault": {
            title: "the long descent",
            objective: "survive the arena for 60 seconds as rift creatures swarm in",
            goal: 6, seconds: 60, ap: 1000, mp: 500
        }
    };

    customCatalog.weekly.forEach(challenge => {
        if (challenge?.id && Number(challenge.goal) >= 2 && Number(challenge.goal) <= 8 && Number(challenge.seconds) >= 10) {
            weeklyOptions[challenge.id] = {
                ...challenge,
                goal: Number(challenge.goal),
                seconds: Number(challenge.seconds),
                ap: Number(challenge.ap),
                mp: Number(challenge.mp),
                objective: `survive ${Number(challenge.seconds)} seconds in the arena through escalating waves`
            };
        }
    });

    const sharedEventWeeklyIds = new Set();
    (Array.isArray(window.INVENTORY_EVENT_WEEKLIES) ? window.INVENTORY_EVENT_WEEKLIES : []).forEach(challenge => {
        if (challenge?.id && challenge?.eventId && Number(challenge.goal) >= 2 && Number(challenge.goal) <= 8 && Number(challenge.seconds) >= 10) {
            weeklyOptions[challenge.id] = {
                ...challenge,
                goal: Number(challenge.goal),
                seconds: Number(challenge.seconds),
                ap: Number(challenge.ap),
                mp: Number(challenge.mp),
                objective: `survive ${Number(challenge.seconds)} seconds in the arena through escalating waves`
            };
            sharedEventWeeklyIds.add(challenge.id);
        }
    });

    function weeklyChoices() {
        const eventChoices = activeEvent
            ? Object.keys(weeklyOptions).filter(id => (sharedEventWeeklyIds.has(id) || useLocalEventDraft) && weeklyOptions[id]?.eventId === activeEvent.id)
            : [];
        if (eventChoices.length) return eventChoices;
        return Object.keys(weeklyOptions).filter(id => !weeklyOptions[id].eventId);
    }

    function chooseWeeklyChallenge() {
        const choices = weeklyChoices();
        const eventChoices = activeEvent ? choices.filter(id => weeklyOptions[id]?.eventId === activeEvent.id) : [];
        if (!eventChoices.length) return randomChoice(choices);
        const key = `${activeEvent.id}:${getWeekStart()}`;
        const hash = Array.from(key).reduce((value, char) => (value * 31 + char.charCodeAt(0)) >>> 0, 7);
        return eventChoices[hash % eventChoices.length];
    }

    const weeklyStorageKey = "weeklyChallengeV1";
    function getWeekStart() {
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
        return dateKey(date);
    }
    let weekStart = getWeekStart();
    let weeklyState;
    try {
        weeklyState = JSON.parse(localStorage.getItem(weeklyStorageKey));
    } catch {
        weeklyState = null;
    }
    if (!weeklyState || weeklyState.week !== weekStart || !weeklyChoices().includes(weeklyState.challenge)) {
        weeklyState = { week: weekStart, challenge: chooseWeeklyChallenge(), completed: false, rewarded: false };
    }
    if (!weeklyOptions[weeklyState.challenge]) {
        weeklyState.challenge = chooseWeeklyChallenge();
        if (weeklyState.completed) {
            weeklyState.completed = false;
            weeklyState.rewarded = false;
        }
    }
    if (weeklyState.rewarded === undefined) weeklyState.rewarded = false;

    const weeklyButton = document.getElementById("playWeeklyChallenge");
    const weeklyRefreshButton = document.getElementById("refreshWeeklyChallenge");
    const weeklyStatus = document.getElementById("weeklyChallengeStatus");
    const weeklyTitle = document.getElementById("weeklyChallengeTitle");
    const weeklyObjective = document.getElementById("weeklyChallengeObjective");
    const weeklyReward = document.getElementById("weeklyChallengeReward");
    const dialog = document.getElementById("weeklyGameDialog");
    const canvas = document.getElementById("survivalCanvas");
    const ctx = canvas.getContext("2d");
    const gameTitle = document.getElementById("weeklyGameTitle");
    const gameStatus = document.getElementById("weeklyGameStatus");
    const healthLabel = document.getElementById("arenaHealth");
    const waveLabel = document.getElementById("arenaWave");
    const killsLabel = document.getElementById("arenaKills");
    const timeLabel = document.getElementById("arenaTime");
    const startButton = document.getElementById("startSurvivalGame");
    const arena = { width: canvas.width, height: canvas.height };
    const arenaUpgradeStorageKey = "riftArenaUpgradesV1";
    const arenaUpgradeInfo = {
        damage: { ap: 350, mp: 175, max: 3 },
        health: { ap: 400, mp: 200, max: 3 },
        resistance: { ap: 450, mp: 225, max: 3 }
    };
    function readArenaUpgrades() {
        try {
            const stored = JSON.parse(localStorage.getItem(arenaUpgradeStorageKey)) || {};
            return Object.fromEntries(Object.keys(arenaUpgradeInfo).map(key => [key, Math.max(0, Math.min(arenaUpgradeInfo[key].max, Math.floor(Number(stored[key]) || 0)))]));
        } catch {
            return { damage: 0, health: 0, resistance: 0 };
        }
    }
    const arenaUpgrades = readArenaUpgrades();
    const arenaShop = document.getElementById("arenaShopDialog");
    const player = { x: arena.width / 2, y: arena.height / 2, radius: 15, health: 5, maxHealth: 5, invulnerable: 0, fireDelay: 0 };
    const keys = new Set();
    let enemies = [];
    let bolts = [];
    let sparks = [];
    let running = false;
    let activeEventQuest = null;
    let elapsed = 0;
    let spawnClock = 0;
    let kills = 0;
    let previousFrame = 0;
    let arenaFrame = 0;
    let moveTarget = null;
    let arenaSeed = [];
    for (let i = 0; i < 100; i += 1) arenaSeed.push({ x: Math.random() * arena.width, y: Math.random() * arena.height, r: Math.random() * 1.8 + .4 });

    function currentWeeklyChallenge() {
        return weeklyOptions[weeklyState.challenge];
    }

    function currentRunChallenge() {
        return activeEventQuest ? { seconds: 45 } : currentWeeklyChallenge();
    }

    function saveWeekly() {
        localStorage.setItem(weeklyStorageKey, JSON.stringify(weeklyState));
    }

    function renderArenaShop() {
        const apBalance = getBalance("ap");
        const mpBalance = getBalance("mp");
        document.querySelectorAll(".arena-upgrade").forEach(card => {
            const key = card.dataset.upgrade;
            const info = arenaUpgradeInfo[key];
            const level = arenaUpgrades[key];
            const apCost = info.ap * (level + 1);
            const mpCost = info.mp * (level + 1);
            card.querySelector(".arena-upgrade-level").textContent = `level ${level} / ${info.max}`;
            const effectAtLevel = currentLevel => {
                if (key === "damage") return `${1 + currentLevel} damage per bolt`;
                if (key === "health") return `${5 + currentLevel} starting hearts`;
                return `${(1.15 + currentLevel * .35).toFixed(2)} sec invulnerability after a hit`;
            };
            card.querySelector(".arena-upgrade-preview").textContent = level >= info.max
                ? `max level · ${effectAtLevel(level)}`
                : `current · ${effectAtLevel(level)}  →  next · ${effectAtLevel(level + 1)}`;
            card.querySelector(".arena-upgrade-cost").textContent = level >= info.max ? "fully upgraded" : `next level · ${formatAmount(apCost)} ap + ${formatAmount(mpCost)} mp`;
            const button = card.querySelector(".buy-arena-upgrade");
            button.disabled = level >= info.max || apBalance < apCost || mpBalance < mpCost;
            button.textContent = level >= info.max ? "fully upgraded" : apBalance < apCost || mpBalance < mpCost ? "not enough ap or mp" : "buy upgrade";
            button.title = level >= info.max ? "maximum level reached" : `spend ${apCost} ap and ${mpCost} mp`;
        });
    }

    document.getElementById("openArenaShop").addEventListener("click", () => {
        renderArenaShop();
        arenaShop.hidden = false;
    });
    document.getElementById("closeArenaShop").addEventListener("click", () => { arenaShop.hidden = true; });
    arenaShop.addEventListener("click", event => { if (event.target === arenaShop) arenaShop.hidden = true; });
    document.querySelectorAll(".buy-arena-upgrade").forEach(button => {
        button.addEventListener("click", () => {
            const key = button.closest(".arena-upgrade").dataset.upgrade;
            const info = arenaUpgradeInfo[key];
            const level = arenaUpgrades[key];
            if (level >= info.max) return;
            if (!window.spendCurrency(info.ap * (level + 1), info.mp * (level + 1))) {
                renderArenaShop();
                return;
            }
            arenaUpgrades[key] += 1;
            localStorage.setItem(arenaUpgradeStorageKey, JSON.stringify(arenaUpgrades));
            renderArenaShop();
        });
    });

    function settleUnpaidWeeklyReward() {
        if (!weeklyState.completed || weeklyState.rewarded || typeof window.awardCurrency !== "function") return;
        const challenge = currentWeeklyChallenge();
        window.awardCurrency(challenge.ap, challenge.mp);
        if (challenge.unlockItem) window.unlockItem(challenge.unlockItem);
        weeklyState.rewarded = true;
        saveWeekly();
    }

    function renderWeekly() {
        const challenge = currentWeeklyChallenge();
        weeklyTitle.textContent = challenge.title;
        weeklyObjective.textContent = challenge.objective;
        if (!activeEventQuest) gameTitle.textContent = challenge.title;
        if (!activeEventQuest && !running) timeLabel.textContent = challenge.seconds;
        weeklyReward.textContent = `reward: +${formatAmount(challenge.ap)} ap · +${formatAmount(challenge.mp)} mp${challenge.unlockItem ? ` · ${challenge.unlockItem} seasonal unlock` : ""}`;
        const mpBalance = getBalance("mp");
        weeklyRefreshButton.disabled = mpBalance < 5000;
        weeklyRefreshButton.title = mpBalance < 5000 ? `need ${5000 - mpBalance} more mp` : "spend mp to get a new weekly challenge";
        if (weeklyState.completed) {
            weeklyStatus.textContent = `completed this week${challenge.unlockItem ? ` · ${challenge.unlockItem} unlocked` : ""}`;
            weeklyStatus.classList.add("complete");
            weeklyButton.textContent = "replay challenge";
            weeklyButton.disabled = false;
        } else {
            weeklyStatus.textContent = `refreshes in ${timeUntilNextWeek()}`;
            weeklyStatus.classList.remove("complete");
            weeklyButton.textContent = "play challenge";
            weeklyButton.disabled = false;
        }
    }

    function timeUntilNextDay() {
        const now = new Date();
        const next = new Date(now);
        next.setHours(24, 0, 0, 0);
        return formatTime(next - now);
    }

    function timeUntilNextWeek() {
        const next = new Date();
        next.setHours(0, 0, 0, 0);
        const daysToMonday = (8 - next.getDay()) % 7 || 7;
        next.setDate(next.getDate() + daysToMonday);
        return formatTime(next - new Date());
    }

    function formatTime(milliseconds) {
        const totalMinutes = Math.max(0, Math.floor(milliseconds / 60000));
        const days = Math.floor(totalMinutes / 1440);
        const hours = Math.floor((totalMinutes % 1440) / 60);
        const minutes = totalMinutes % 60;
        return days ? `${days}d ${hours}h` : `${hours}h ${minutes}m`;
    }

    function refreshQuestPeriods() {
        const nextEvent = findActiveEvent();
        const eventChanged = (activeEvent?.id || "") !== (nextEvent?.id || "") || JSON.stringify(activeEvent) !== JSON.stringify(nextEvent);
        if (eventChanged) {
            const hadActiveEventQuest = Boolean(activeEventQuest);
            const wasRunningEventQuest = Boolean(running && hadActiveEventQuest);
            if (wasRunningEventQuest) finishRun(false, "the event changed · this event quest ended");
            activeEventQuest = null;
            activeEvent = nextEvent;
            if (hadActiveEventQuest) dialog.hidden = true;
            updateAll();
        }

        if (!weeklyChoices().includes(weeklyState.challenge)) {
            if (running && !activeEventQuest) finishRun(false, "the weekly challenge changed with the event schedule");
            weeklyState = { week: getWeekStart(), challenge: chooseWeeklyChallenge(), completed: false, rewarded: false };
            weekStart = weeklyState.week;
            saveWeekly();
            renderWeekly();
        }

        const currentDay = getToday();
        if (state.date !== currentDay) {
            state = freshState(currentDay);
            save();
            updateAll();
            document.querySelectorAll(".mission-refresh-message").forEach(message => {
                message.textContent = "new daily quests are ready";
            });
        }

        const currentWeek = getWeekStart();
        if (weekStart !== currentWeek) {
            if (running) finishRun(false, "the weekly challenge refreshed · start a new run");
            weekStart = currentWeek;
            weeklyState = { week: currentWeek, challenge: chooseWeeklyChallenge(), completed: false, rewarded: false };
            saveWeekly();
            renderWeekly();
        }

        const dailyTimer = document.getElementById("dailyRefreshTimer");
        if (dailyTimer) dailyTimer.textContent = `refreshes in ${timeUntilNextDay()}`;
        renderWeekly();
    }

    function finishRun(won, message) {
        if (!running) return;
        running = false;
        cancelAnimationFrame(arenaFrame);
        arenaFrame = 0;
        keys.clear();
        moveTarget = null;
        const finishedEventQuest = activeEventQuest;
        gameStatus.textContent = won && finishedEventQuest ? `${finishedEventQuest.item} unlocked` : won && weeklyState.completed ? "arena cleared · weekly reward already claimed" : message;
        startButton.textContent = won ? finishedEventQuest ? "event item unlocked" : "challenge complete" : "try again";
        if (won && finishedEventQuest) {
            const event = readEventCatalog().find(item => item.id === finishedEventQuest.eventId);
            const progress = event ? progressForEvent(event) : null;
            if (typeof window.unlockItem === "function" && progress && window.unlockItem(finishedEventQuest.item)) {
                if (!progress.completed.includes(finishedEventQuest.item)) progress.completed.push(finishedEventQuest.item);
                progress.assignments[finishedEventQuest.slot] = "";
                saveEventQuestProgress();
                activeEventQuest = null;
                updateAll();
                gameStatus.textContent = `event quest complete · ${finishedEventQuest.item} unlocked`;
            } else {
                gameStatus.textContent = "event reward unavailable · try again after reloading";
            }
        } else if (won && !weeklyState.completed) {
            if (typeof window.awardCurrency !== "function") {
                gameStatus.textContent = "challenge complete · reward unavailable, reload to claim";
                return;
            }
            const challenge = currentWeeklyChallenge();
            window.awardCurrency(challenge.ap, challenge.mp);
            if (challenge.unlockItem) window.unlockItem(challenge.unlockItem);
            weeklyState.completed = true;
            weeklyState.rewarded = true;
            saveWeekly();
            renderWeekly();
            if (activeEvent) updateAll();
        }
        drawArena();
    }

    function drawArena() {
        const w = arena.width;
        const h = arena.height;
        const gradient = ctx.createLinearGradient(0, 0, w, h);
        gradient.addColorStop(0, "#10192a");
        gradient.addColorStop(.5, "#111022");
        gradient.addColorStop(1, "#21102e");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = "rgba(65, 169, 194, .09)";
        ctx.lineWidth = 1;
        for (let x = 0; x <= w; x += 48) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
        for (let y = 0; y <= h; y += 48) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
        arenaSeed.forEach(star => {
            ctx.fillStyle = "rgba(142, 224, 255, .48)";
            ctx.fillRect(star.x, star.y, star.r, star.r);
        });
        sparks.forEach(spark => {
            ctx.fillStyle = spark.color;
            ctx.globalAlpha = Math.max(0, spark.life);
            ctx.fillRect(spark.x, spark.y, 4, 4);
        });
        ctx.globalAlpha = 1;
        bolts.forEach(bolt => {
            ctx.beginPath(); ctx.fillStyle = "#8cfaff"; ctx.shadowColor = "#56e6ff"; ctx.shadowBlur = 14;
            ctx.arc(bolt.x, bolt.y, 5, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
        });
        enemies.forEach(enemy => {
            ctx.beginPath(); ctx.fillStyle = enemy.color; ctx.shadowColor = enemy.color; ctx.shadowBlur = 15;
            ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
            ctx.beginPath(); ctx.fillStyle = "#07101a";
            ctx.arc(enemy.x - enemy.radius * .3, enemy.y - 2, 2.4, 0, Math.PI * 2);
            ctx.arc(enemy.x + enemy.radius * .3, enemy.y - 2, 2.4, 0, Math.PI * 2); ctx.fill();
            if (enemy.hp > 1) { ctx.fillStyle = "#fff"; ctx.font = "11px sans-serif"; ctx.textAlign = "center"; ctx.fillText(String(enemy.hp), enemy.x, enemy.y - enemy.radius - 5); }
        });
        ctx.beginPath();
        ctx.fillStyle = player.invulnerable > 0 && Math.floor(elapsed * 12) % 2 ? "#ffffff" : "#be8cff";
        ctx.shadowColor = "#d76cff"; ctx.shadowBlur = 24;
        ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
        ctx.beginPath(); ctx.fillStyle = "#e9d9ff"; ctx.arc(player.x, player.y, 5, 0, Math.PI * 2); ctx.fill();
        if (!running) {
            ctx.fillStyle = "rgba(3, 5, 13, .42)"; ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = "#e8d7ff"; ctx.textAlign = "center"; ctx.font = "bold 24px sans-serif";
            ctx.fillText(activeEventQuest ? `event quest · ${activeEventQuest.item}` : weeklyState.completed ? "challenge complete" : "rift arena", w / 2, h / 2);
        }
    }

    function spawnEnemy(wave) {
        const edge = Math.floor(Math.random() * 4);
        const x = edge === 0 ? -20 : edge === 1 ? arena.width + 20 : Math.random() * arena.width;
        const y = edge === 2 ? -20 : edge === 3 ? arena.height + 20 : Math.random() * arena.height;
        enemies.push({ x, y, radius: 11 + Math.min(5, wave), speed: 38 + wave * 5 + Math.random() * 12, hp: 1 + Math.floor((wave - 1) / 3), color: wave > 4 ? "#48d7dd" : "#56b8d5" });
    }

    function nearestEnemy() {
        let target = null;
        let best = Infinity;
        enemies.forEach(enemy => {
            const distance = Math.hypot(enemy.x - player.x, enemy.y - player.y);
            if (distance < best) { best = distance; target = enemy; }
        });
        return target;
    }

    function updateArena(dt) {
        const challenge = currentRunChallenge();
        elapsed += dt;
        const wave = Math.floor(elapsed / 15) + 1;
        waveLabel.textContent = wave;
        const remaining = Math.max(0, Math.ceil(challenge.seconds - elapsed));
        timeLabel.textContent = remaining;
        player.invulnerable = Math.max(0, player.invulnerable - dt);
        player.fireDelay -= dt;
        spawnClock -= dt;
        if (spawnClock <= 0) {
            spawnEnemy(wave);
            if (wave >= 3 && Math.random() < .24) spawnEnemy(wave);
            spawnClock = Math.max(.48, 1.45 - wave * .12);
        }

        let dx = (keys.has("d") || keys.has("arrowright") ? 1 : 0) - (keys.has("a") || keys.has("arrowleft") ? 1 : 0);
        let dy = (keys.has("s") || keys.has("arrowdown") ? 1 : 0) - (keys.has("w") || keys.has("arrowup") ? 1 : 0);
        if (!dx && !dy && moveTarget) {
            dx = moveTarget.x - player.x; dy = moveTarget.y - player.y;
            const distance = Math.hypot(dx, dy);
            if (distance < 8) { dx = 0; dy = 0; moveTarget = null; }
        }
        const magnitude = Math.hypot(dx, dy) || 1;
        player.x = Math.max(player.radius, Math.min(arena.width - player.radius, player.x + dx / magnitude * 220 * dt));
        player.y = Math.max(player.radius, Math.min(arena.height - player.radius, player.y + dy / magnitude * 220 * dt));

        enemies.forEach(enemy => {
            const ex = player.x - enemy.x; const ey = player.y - enemy.y; const distance = Math.hypot(ex, ey) || 1;
            enemy.x += ex / distance * enemy.speed * dt;
            enemy.y += ey / distance * enemy.speed * dt;
            if (distance < player.radius + enemy.radius && player.invulnerable <= 0) {
                player.health -= 1; player.invulnerable = 1.15 + arenaUpgrades.resistance * .35;
                player.x = Math.max(player.radius, Math.min(arena.width - player.radius, player.x + ex / distance * 36));
                player.y = Math.max(player.radius, Math.min(arena.height - player.radius, player.y + ey / distance * 36));
                healthLabel.textContent = "♥ ".repeat(Math.max(0, player.health)) + "♡ ".repeat(Math.max(0, player.maxHealth - player.health));
                if (player.health <= 0) finishRun(false, "the rift caught you · try again");
            }
        });
        if (!running) return;

        if (player.fireDelay <= 0 && enemies.length) {
            const target = nearestEnemy();
            const distance = Math.hypot(target.x - player.x, target.y - player.y) || 1;
            bolts.push({ x: player.x, y: player.y, vx: (target.x - player.x) / distance * 390, vy: (target.y - player.y) / distance * 390, damage: 1 + arenaUpgrades.damage, life: 1.6 });
            player.fireDelay = .62;
        }
        bolts.forEach(bolt => {
            bolt.x += bolt.vx * dt; bolt.y += bolt.vy * dt; bolt.life -= dt;
            const hit = enemies.find(enemy => Math.hypot(enemy.x - bolt.x, enemy.y - bolt.y) < enemy.radius + 5);
            if (hit) {
                hit.hp -= bolt.damage; bolt.life = 0;
                sparks.push({ x: hit.x, y: hit.y, life: .8, color: "#65eaff" });
                if (hit.hp <= 0) { enemies = enemies.filter(enemy => enemy !== hit); kills += 1; killsLabel.textContent = kills; }
            }
        });
        bolts = bolts.filter(bolt => bolt.life > 0 && bolt.x > -20 && bolt.y > -20 && bolt.x < arena.width + 20 && bolt.y < arena.height + 20);
        sparks.forEach(spark => { spark.life -= dt * 1.5; spark.y -= 18 * dt; });
        sparks = sparks.filter(spark => spark.life > 0);
        if (elapsed >= challenge.seconds) finishRun(true, "you survived the rift waves · rewards claimed");
    }

    function arenaLoop(timestamp) {
        if (!running) return;
        const dt = Math.min(.04, Math.max(0, (timestamp - (previousFrame || timestamp)) / 1000));
        previousFrame = timestamp;
        updateArena(dt);
        drawArena();
        if (running) arenaFrame = requestAnimationFrame(arenaLoop);
    }

    function startRun() {
        if (running) return;
        const challenge = currentRunChallenge();
        player.x = arena.width / 2; player.y = arena.height / 2; player.maxHealth = 5 + arenaUpgrades.health; player.health = player.maxHealth; player.invulnerable = 0; player.fireDelay = .25;
        enemies = []; bolts = []; sparks = []; elapsed = 0; spawnClock = .5; kills = 0; previousFrame = 0;
        keys.clear(); moveTarget = null;
        healthLabel.textContent = "♥ ".repeat(player.maxHealth); waveLabel.textContent = "1"; killsLabel.textContent = "0"; timeLabel.textContent = challenge.seconds;
        gameStatus.textContent = "dodge the rift creatures while your amethyst orb fires automatically";
        startButton.textContent = "arena active";
        running = true;
        arenaFrame = requestAnimationFrame(arenaLoop);
    }

    canvas.addEventListener("pointerdown", event => {
        if (!running) return;
        const rect = canvas.getBoundingClientRect();
        moveTarget = { x: (event.clientX - rect.left) * arena.width / rect.width, y: (event.clientY - rect.top) * arena.height / rect.height };
    });
    document.addEventListener("keydown", event => {
        const key = event.key.toLowerCase();
        if (!dialog.hidden && ["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
            event.preventDefault(); keys.add(key);
        }
    });
    document.addEventListener("keyup", event => keys.delete(event.key.toLowerCase()));

    weeklyButton.addEventListener("click", () => {
        activeEventQuest = null;
        dialog.hidden = false;
        startButton.textContent = "start game";
        gameStatus.textContent = currentWeeklyChallenge().objective;
        drawArena();
    });
    document.querySelectorAll("[data-event-quest]").forEach(button => {
        button.addEventListener("click", () => {
            if (!activeEvent) return;
            const slot = button.dataset.eventQuest;
            const item = getEventAssignments(activeEvent)[slot];
            if (!item) return;
            activeEventQuest = { eventId: activeEvent.id, eventName: activeEvent.name, item, slot };
            dialog.hidden = false;
            gameTitle.textContent = `${activeEvent.name} · ${item}`;
            gameStatus.textContent = `survive the rift arena for 45 seconds to unlock ${item}`;
            startButton.textContent = "start event quest";
            drawArena();
        });
    });
    weeklyRefreshButton.addEventListener("click", () => {
        if (running) finishRun(false, "the weekly challenge refreshed · start a new run");
        if (!window.spendCurrency(0, 5000)) {
            weeklyStatus.textContent = `need ${formatAmount(5000 - getBalance("mp"))} more mp to refresh`;
            renderWeekly();
            return;
        }
        const choices = weeklyChoices().filter(id => id !== weeklyState.challenge);
        if (!choices.length) {
            weeklyStatus.textContent = "no other weekly challenge is available right now";
            return;
        }
        weeklyState.challenge = randomChoice(choices);
        weeklyState.week = getWeekStart();
        weeklyState.completed = false;
        weeklyState.rewarded = false;
        saveWeekly();
        gameStatus.textContent = "new weekly challenge · give it a shot";
        startButton.textContent = "start game";
        drawArena();
        renderWeekly();
    });
    startButton.addEventListener("click", startRun);
    document.getElementById("closeWeeklyGame").addEventListener("click", () => {
        if (running) finishRun(false, "run abandoned · try again");
        dialog.hidden = true;
        keys.clear();
    });
    dialog.addEventListener("click", event => {
        if (event.target === dialog) {
            if (running) finishRun(false, "run abandoned · try again");
            dialog.hidden = true;
            keys.clear();
        }
    });
    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && !dialog.hidden) {
            if (running) finishRun(false, "run abandoned · try again");
            dialog.hidden = true;
            keys.clear();
        }
    });

    settleUnpaidWeeklyReward();
    saveWeekly();
    renderWeekly();
    updateAll();
    refreshQuestPeriods();
    window.setInterval(refreshQuestPeriods, 30000);
    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) refreshQuestPeriods();
    });
    window.addEventListener("storage", event => {
        if (event.key === eventCatalogStorageKey) {
            refreshQuestPeriods();
            return;
        }
        if (activeEvent && ["ownedItemsV2", "eventItemHistoryV1"].includes(event.key)) updateAll();
    });
})();
