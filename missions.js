(() => {
    const storageKey = "dailyMissionsV1";
    const catalogStorageKey = "customQuestDefinitionsV1";
    const badgePeekQuestProgressKey = "badgePeekQuestProgressV1";
    const badgePeekStateKey = "badgeSecretPeekStateV1";
    const badgePeekPenaltiesDisabledKey = "badgePeekPenaltiesDisabledV1";

    function badgePeekPenaltyActive() {
        if (localStorage.getItem(badgePeekPenaltiesDisabledKey) === "true") return false;
        try {
            const state = JSON.parse(localStorage.getItem(badgePeekStateKey) || "{}");
            return Number(state.penaltyUntil) > Date.now();
        } catch {
            return false;
        }
    }

    function countQuestForBadgePeek() {
        const count = Math.max(0, Number(localStorage.getItem(badgePeekQuestProgressKey)) || 0) + 1;
        localStorage.setItem(badgePeekQuestProgressKey, String(count));
    }

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
            rewarded: {},
            counted: {}
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
    state.counted ||= {};

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
    function eventMissionsFinished(event = activeEvent) {
        if (!event) return false;
        const names = Array.from(new Set(event.items.map(name => String(name).trim()).filter(Boolean)));
        const progress = progressForEvent(event);
        return names.every(name => progress.completed.includes(name) || eventItemWasEarned(name) || eventItemIsOwned(name));
    }
    function eventMissionsActive() {
        return Boolean(activeEvent && !eventMissionsFinished(activeEvent));
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
        objective.textContent = item ? `survive the rift arena for ${badgePeekPenaltyActive() ? 135 : 45} seconds to unlock this event item` : "all available event items have been earned";
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

    const dailyQuestLifetimeCountKey = "dailyQuestLifetimeCountV1";
    function countDailyCompletion(slot) {
        state.counted ||= {};
        if (state.counted[slot]) return;
        const total = Math.max(0, Number(localStorage.getItem(dailyQuestLifetimeCountKey)) || 0) + 1;
        localStorage.setItem(dailyQuestLifetimeCountKey, String(total));
        countQuestForBadgePeek();
        state.counted[slot] = true;
        save();
    }

    function countExistingDailyCompletions() {
        questSlots.forEach(slot => {
            if (state.completed[slot]) countDailyCompletion(slot);
        });
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
    countExistingDailyCompletions();
    save();

    function updateMission(id) {
        if (eventMissionsActive()) {
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
            countDailyCompletion(id);
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
        const missionsPanel = document.getElementById("dailyMissions");
        if (eventMissionsActive()) {
            const theme = String(activeEvent.theme || "auto").trim().toLowerCase();
            const eventTheme = theme && theme !== "auto"
                ? theme
                : String(activeEvent.name || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
            missionsPanel.dataset.eventTheme = eventTheme;
            missionsPanel.dataset.eventId = activeEvent.id;
            const customColor = String(activeEvent.themeColor || "");
            if (/^#[0-9a-f]{6}$/i.test(customColor)) {
                missionsPanel.style.setProperty("--event-accent", customColor);
                missionsPanel.style.setProperty("--event-border", `color-mix(in srgb, ${customColor} 68%, #160b20)`);
                missionsPanel.style.setProperty("--event-panel", `color-mix(in srgb, ${customColor} 16%, #050a10)`);
                missionsPanel.style.setProperty("--event-muted", `color-mix(in srgb, ${customColor} 58%, #fff)`);
                missionsPanel.style.setProperty("--event-glow", `color-mix(in srgb, ${customColor} 38%, transparent)`);
            } else {
                ["--event-accent", "--event-border", "--event-panel", "--event-muted", "--event-glow"].forEach(property => missionsPanel.style.removeProperty(property));
            }
        } else {
            delete missionsPanel.dataset.eventTheme;
            delete missionsPanel.dataset.eventId;
            ["--event-accent", "--event-border", "--event-panel", "--event-muted", "--event-glow"].forEach(property => missionsPanel.style.removeProperty(property));
        }
        document.getElementById("dailyMissionsHeading").textContent = eventMissionsActive() ? "event missions" : "daily missions";
        document.getElementById("dailyRefreshTimer").hidden = eventMissionsActive();
        document.querySelectorAll("[data-refresh-quest]").forEach(button => {
            const baseCost = refreshCosts[button.dataset.refreshQuest];
            const cost = baseCost * (badgePeekPenaltyActive() ? 9 : 1);
            button.hidden = eventMissionsActive();
            button.disabled = eventMissionsActive() || balance < cost;
            button.title = eventMissionsActive() ? "event quests cannot be refreshed" : button.disabled ? `need ${cost - balance} more ap` : `spend ${cost} ap to get a new quest`;
            button.textContent = `refresh quest ${questSlots.indexOf(button.dataset.refreshQuest) + 1} · ${formatAmount(cost)} ap`;
        });
        document.querySelectorAll("[data-event-quest]").forEach(button => { button.hidden = !eventMissionsActive(); });
    }

    function updateAll() {
        questSlots.forEach(updateMission);
        syncRefreshControls();
    }

    document.querySelectorAll("[data-refresh-quest]").forEach(button => {
        button.addEventListener("click", () => {
            if (eventMissionsActive()) return;
            const slot = button.dataset.refreshQuest;
            const message = button.closest(".mission-card").querySelector(".mission-refresh-message");
            const balance = getBalance("ap");
            const cost = refreshCosts[slot] * (badgePeekPenaltyActive() ? 9 : 1);
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
            delete state.counted[slot];
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
    const arenaItemPicker = document.getElementById("arenaWeaponPicker");
    const arenaArtifactPicker = document.getElementById("arenaArtifactPicker");
    const arenaSoulsLabel = document.getElementById("arenaSouls");
    const arenaWeaponDamageLabel = document.getElementById("arenaWeaponDamage");
    const arenaArtifactDamageLabel = document.getElementById("arenaArtifactDamage");
    const arenaCooldownLabel = document.getElementById("arenaArtifactCooldown");
    const corruptionLabel = document.getElementById("arenaCorruption");
    const arenaWeaponPreview = document.getElementById("arenaWeaponPreview");
    const arenaWeaponName = document.getElementById("arenaWeaponName");
    const arenaArtifactPreview = document.getElementById("arenaArtifactPreview");
    const arenaArtifactName = document.getElementById("arenaArtifactName");
    const arenaHealthFill = document.getElementById("arenaHealthFill");
    const arenaDifficultyPicker = document.getElementById("arenaDifficulty");
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
    const player = { x: arena.width / 2, y: arena.height / 2, radius: 15, health: 100, maxHealth: 100, invulnerable: 0, fireDelay: 0 };
    const keys = new Set();
    function clearArenaMovement() {
        keys.clear();
        moveTarget = null;
        mouseSteering = false;
        mousePointerId = null;
    }
    let enemies = [];
    let bolts = [];
    let sparks = [];
    let running = false;
    let loadoutSelectionActive = false;
    let activeEventQuest = null;
    let elapsed = 0;
    let spawnClock = 0;
    let kills = 0;
    let previousFrame = 0;
    let arenaFrame = 0;
    let moveTarget = null;
    let aimTarget = null;
    let mouseSteering = false;
    let mousePointerId = null;
    let mouseHasMoved = false;
    let artifactRightHeld = false;
    let artifactRepeatClock = 0;
    const artifactRepeatInterval = .12;
    const arenaItemStorageKey = "riftArenaSelectedWeaponV1";
    const arenaArtifactStorageKey = "riftArenaSelectedArtifactV1";
    const arenaDifficultyStorageKey = "riftArenaDifficultyV1";
    const artifactCooldownDisabledKey = "riftArenaDisableArtifactCooldownV1";
    const arenaProjectileCountStorageKey = "riftArenaProjectileCountV1";
    const arenaLightningStrikeCountStorageKey = "riftArenaLightningStrikeCountV1";
    function arenaConfiguredCount(key, fallback) {
        const count = Number(localStorage.getItem(key));
        return Number.isFinite(count) && count >= 1 ? Math.min(100, Math.floor(count)) : fallback;
    }
    function fireProjectileVolley({ angle, speed, damage, life, kind, rarity, sprite, radius }) {
        const count = arenaConfiguredCount(arenaProjectileCountStorageKey, 1);
        const spread = 0.07;
        for (let index = 0; index < count; index++) {
            const shotAngle = angle + (index - (count - 1) / 2) * spread;
            bolts.push({ x: player.x, y: player.y, vx: Math.cos(shotAngle) * speed, vy: Math.sin(shotAngle) * speed, damage, rarity, life, kind, sprite, radius });
        }
    }
    const artifactNames = new Set(["corrupted beacon", "corrupted beacon (mcdii)", "void stabilizer", "ghost cloak", "updraft tome", "thundering quiver", "flaming quiver", "lightning rod", "lightning rod (mcdii)", "golden crown", "firework arrow (mcdii)"]);
    const cooldownsDisabled = () => localStorage.getItem(artifactCooldownDisabledKey) === "true";
    const setAbilityCooldown = seconds => { abilityCooldown = cooldownsDisabled() ? 0 : seconds; };
    let selectedArenaItem = "";
    let selectedArenaArtifact = "";
    let selectedWeaponImage = null;
    let selectedArtifactImage = null;
    const arenaSpriteCache = new WeakMap();
    let attackEffects = [];
    let weaponCombo = 0;
    let souls = 100;
    let facing = { x: 1, y: 0 };
    let corruption = 0;
    let ghostTime = 0;
    let abilityCooldown = 0;
    let beaconActive = false;
    let lightningEffects = [];
    let playerTrail = [];
    let arenaSeed = [];
    for (let i = 0; i < 100; i += 1) arenaSeed.push({ x: Math.random() * arena.width, y: Math.random() * arena.height, r: Math.random() * 1.8 + .4 });

    function currentWeeklyChallenge() {
        return weeklyOptions[weeklyState.challenge];
    }

    function normalizedItemName(name) { return String(name || "").trim().toLowerCase(); }
    function itemIsUnlocked(name) {
        if (typeof window.isItemUnlocked === "function") return window.isItemUnlocked(name);
        try { return (JSON.parse(localStorage.getItem("ownedItemsV2")) || []).includes(name); } catch { return false; }
    }
    function arenaItemCards() { return Array.from(document.querySelectorAll(".items .item[data-item-name]")); }
    function refreshArenaItemPicker() {
        if (!arenaItemPicker || !arenaArtifactPicker) return;
        const cards = arenaItemCards().filter(card => itemIsUnlocked(card.dataset.itemName));
        const previousWeapon = selectedArenaItem || localStorage.getItem(arenaItemStorageKey) || "";
        const previousArtifact = selectedArenaArtifact || localStorage.getItem(arenaArtifactStorageKey) || "";
        const migratedWeapon = cards.find(card => ["orb of dominance", "staff of terror"].includes(normalizedItemName(card.dataset.itemName)) && normalizedItemName(card.dataset.itemName) === normalizedItemName(previousArtifact));
        arenaItemPicker.replaceChildren();
        const fallback = document.createElement("option");
        fallback.value = "";
        fallback.textContent = "amethyst orb · default";
        arenaItemPicker.append(fallback);
        cards.filter(card => !artifactNames.has(normalizedItemName(card.dataset.itemName))).sort((a, b) => a.dataset.itemName.localeCompare(b.dataset.itemName)).forEach(card => {
            const option = document.createElement("option");
            option.value = card.dataset.itemName;
            option.textContent = card.dataset.itemName;
            arenaItemPicker.append(option);
        });
        arenaArtifactPicker.replaceChildren();
        const noArtifact = document.createElement("option");
        noArtifact.value = "";
        noArtifact.textContent = "No artifact";
        arenaArtifactPicker.append(noArtifact);
        cards.filter(card => artifactNames.has(normalizedItemName(card.dataset.itemName))).sort((a, b) => a.dataset.itemName.localeCompare(b.dataset.itemName)).forEach(card => {
            const option = document.createElement("option");
            option.value = card.dataset.itemName;
            option.textContent = card.dataset.itemName;
            arenaArtifactPicker.append(option);
        });
        arenaItemPicker.value = cards.some(card => card.dataset.itemName === previousWeapon && !artifactNames.has(normalizedItemName(previousWeapon))) ? previousWeapon : migratedWeapon?.dataset.itemName || "";
        arenaArtifactPicker.value = cards.some(card => card.dataset.itemName === previousArtifact && artifactNames.has(normalizedItemName(previousArtifact))) ? previousArtifact : "";
        selectedArenaItem = arenaItemPicker.value;
        selectedArenaArtifact = arenaArtifactPicker.value;
        localStorage.setItem(arenaItemStorageKey, selectedArenaItem);
        localStorage.setItem(arenaArtifactStorageKey, selectedArenaArtifact);
        if (arenaDifficultyPicker) arenaDifficultyPicker.value = localStorage.getItem(arenaDifficultyStorageKey) || "normal";
        updateWeaponDisplay();
        updateArenaAbilityControl();
    }
    function selectedArtifact() { return normalizedItemName(selectedArenaArtifact); }
    function selectedArtifactProtection() {
        const card = arenaItemCards().find(item => normalizedItemName(item.dataset.itemName) === selectedArtifact());
        const catalogProtection = Math.max(0, Number(card?.dataset.protection) || 0);
        return selectedArtifact() === "golden crown" ? Math.max(4, catalogProtection) : catalogProtection;
    }
    function selectedWeaponProtection() {
        const card = arenaItemCards().find(item => item.dataset.itemName === selectedArenaItem);
        return Math.max(0, Number(card?.dataset.protection) || 0);
    }
    function getArenaSprite(image, size, preserveAspect = false) {
        if (!image?.complete || !image.naturalWidth || !image.naturalHeight) return null;
        const source = image.currentSrc || image.src;
        const cached = arenaSpriteCache.get(image);
        if (cached?.source === source && cached.width === image.naturalWidth && cached.height === image.naturalHeight && cached.size === size && cached.preserveAspect === preserveAspect) return cached.canvas;
        const sprite = document.createElement("canvas");
        sprite.width = size;
        sprite.height = size;
        const spriteContext = sprite.getContext("2d");
        spriteContext.imageSmoothingEnabled = false;
        if (preserveAspect) {
            const scale = Math.min(size / image.naturalWidth, size / image.naturalHeight);
            const width = image.naturalWidth * scale;
            const height = image.naturalHeight * scale;
            spriteContext.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
        } else {
            spriteContext.drawImage(image, 0, 0, size, size);
        }
        arenaSpriteCache.set(image, { source, width: image.naturalWidth, height: image.naturalHeight, size, preserveAspect, canvas: sprite });
        return sprite;
    }
    function updateWeaponDisplay() {
        const card = arenaItemCards().find(item => item.dataset.itemName === selectedArenaItem);
        const src = card?.querySelector("img")?.src || "";
        if (arenaWeaponPreview) {
            arenaWeaponPreview.hidden = !src;
            if (src) arenaWeaponPreview.src = src;
            else arenaWeaponPreview.removeAttribute("src");
        }
        if (arenaWeaponName) arenaWeaponName.textContent = selectedArenaItem || "amethyst orb";
        selectedWeaponImage = arenaWeaponPreview;
        const artifactCard = arenaItemCards().find(item => item.dataset.itemName === selectedArenaArtifact);
        const artifactSrc = artifactCard?.querySelector("img")?.src || "";
        if (arenaArtifactPreview) {
            arenaArtifactPreview.hidden = !artifactSrc;
            if (artifactSrc) arenaArtifactPreview.src = artifactSrc;
            else arenaArtifactPreview.removeAttribute("src");
        }
        if (arenaArtifactName) arenaArtifactName.textContent = selectedArenaArtifact || "no artifact";
        selectedArtifactImage = arenaArtifactPreview;
    }
    function updateArenaAbilityControl() {
        const passive = ["golden crown", "void stabilizer", "flaming quiver", "thundering quiver"].includes(selectedArtifact());
        const weaponDamage = selectedArenaItem ? selectedWeaponDamage() : 14 + arenaUpgrades.damage * 3;
        const compact = value => value === Infinity ? "∞" : window.formatInventoryNumber ? window.formatInventoryNumber(value) : String(value);
        if (arenaWeaponDamageLabel) arenaWeaponDamageLabel.textContent = `weapon damage: ${compact(weaponDamage)}`;
        if (arenaArtifactDamageLabel) arenaArtifactDamageLabel.textContent = `artifact damage: ${selectedArenaArtifact ? compact(selectedArtifactDamage()) : "none"}`;
        if (arenaCooldownLabel) {
            arenaCooldownLabel.textContent = cooldownsDisabled() && selectedArenaArtifact && !passive ? "artifact cooldown: disabled" : !selectedArenaArtifact ? "artifact ready: none" : selectedArtifact().startsWith("corrupted beacon") && beaconActive ? "artifact active · 20 souls/sec" : passive ? "artifact: passive" : abilityCooldown > 0 ? `artifact cooldown: ${abilityCooldown.toFixed(1)}s` : "artifact ready: right click";
        }
    }
    window.addEventListener("inventory-arena-cooldown-setting-changed", updateArenaAbilityControl);
    arenaItemPicker?.addEventListener("change", () => {
        clearArenaMovement();
        selectedArenaItem = arenaItemPicker.value;
        localStorage.setItem(arenaItemStorageKey, selectedArenaItem);
        bolts = [];
        updateWeaponDisplay();
        updateArenaAbilityControl();
        gameStatus.textContent = selectedArenaItem ? `equipped ${selectedArenaItem} · orb projectiles disabled` : "amethyst orb selected";
        drawArena();
    });
    arenaArtifactPicker?.addEventListener("change", () => {
        clearArenaMovement();
        selectedArenaArtifact = arenaArtifactPicker.value;
        localStorage.setItem(arenaArtifactStorageKey, selectedArenaArtifact);
        bolts = [];
        beaconActive = false;
        updateWeaponDisplay();
        updateArenaAbilityControl();
        gameStatus.textContent = selectedArtifact() === "void stabilizer" ? "void stabilizer equipped · corruption is halted" : selectedArtifact() ? `equipped ${selectedArenaArtifact}` : "no artifact equipped";
        drawArena();
    });
    arenaDifficultyPicker?.addEventListener("change", () => localStorage.setItem(arenaDifficultyStorageKey, arenaDifficultyPicker.value));
    function activateSelectedArtifact() {
        const item = selectedArtifact();
        if (!running || (!cooldownsDisabled() && abilityCooldown > 0)) return;
        if (item.startsWith("corrupted beacon")) {
            beaconActive = !beaconActive;
            return;
        }
        if (item === "ghost cloak") {
            ghostTime = 4;
            setAbilityCooldown(8);
        } else if (item === "updraft tome") {
            enemies.forEach(enemy => {
                const distance = Math.hypot(enemy.x - player.x, enemy.y - player.y);
                if (distance <= 250) { enemy.air = 1.15; enemy.airHeight = 1; enemy.airVelocity = 360; enemy.fallDamage = selectedArtifactDamage(); }
            });
            sparks.push({ x: player.x, y: player.y, life: 1, color: "#9cf8ff" });
            setAbilityCooldown(7);
        } else if (item.startsWith("lightning rod")) {
            const strikePoint = aimTarget || player;
            const strikeCount = arenaConfiguredCount(arenaLightningStrikeCountStorageKey, 6);
            const strikeOffsets = [[0, 0], [-96, -96], [96, -96], [-96, 96], [96, 96], [0, -96], [96, 0], [0, 96], [-96, 0]];
            for (let index = 0; index < strikeCount; index++) {
                const [offsetX, offsetY] = strikeOffsets[index % strikeOffsets.length];
                const strikeX = Math.max(0, Math.min(arena.width, strikePoint.x + offsetX));
                const strikeY = Math.max(0, Math.min(arena.height, strikePoint.y + offsetY));
                lightningEffects.push({
                    x: strikeX,
                    y: strikeY,
                    life: .8,
                    wait: index * .07,
                    rodStrike: true,
                    damageApplied: false,
                    damage: selectedArtifactDamage(),
                    areaRadius: 80 + index % 3 * 16,
                    boltWidth: 14 + index % 3 * 5
                });
            }
            setAbilityCooldown(8);
        } else if (item === "firework arrow (mcdii)") {
            const dx = (aimTarget?.x ?? player.x + facing.x) - player.x;
            const dy = (aimTarget?.y ?? player.y + facing.y) - player.y;
            const distance = Math.hypot(dx, dy) || 1;
            facing = { x: dx / distance, y: dy / distance };
            fireProjectileVolley({ angle: Math.atan2(facing.y, facing.x), speed: 360, damage: selectedArtifactDamage(), life: 2.2, kind: "firework", sprite: selectedArtifactImage, radius: 178 });
            setAbilityCooldown(4);
        }
        updateArenaAbilityControl();
        drawArena();
    }
    function artifactCanRepeat() {
        return !!selectedArtifact() && !selectedArtifact().startsWith("corrupted beacon") && !["golden crown", "void stabilizer", "flaming quiver", "thundering quiver"].includes(selectedArtifact());
    }
    window.addEventListener("inventory-catalog-updated", refreshArenaItemPicker);

    function currentRunChallenge() {
        const challenge = activeEventQuest ? { seconds: 45 } : currentWeeklyChallenge();
        return badgePeekPenaltyActive() ? { ...challenge, seconds: Number(challenge.seconds) * 3 } : challenge;
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
                if (key === "damage") return `${currentLevel * 2} bonus weapon damage`;
                if (key === "health") return `${100 + currentLevel * 10} starting health`;
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
        const refreshCost = 5000 * (badgePeekPenaltyActive() ? 9 : 1);
        weeklyTitle.textContent = challenge.title;
        weeklyObjective.textContent = badgePeekPenaltyActive() && Number(challenge.seconds)
            ? challenge.objective.replace(/\d+(?= seconds?)/, String(Number(challenge.seconds) * 3))
            : challenge.objective;
        if (!activeEventQuest) gameTitle.textContent = challenge.title;
        if (!activeEventQuest && !running) timeLabel.textContent = currentRunChallenge().seconds;
        weeklyReward.textContent = `reward: +${formatAmount(challenge.ap)} ap · +${formatAmount(challenge.mp)} mp${challenge.unlockItem ? ` · ${challenge.unlockItem} seasonal unlock` : ""}`;
        const mpBalance = getBalance("mp");
        weeklyRefreshButton.disabled = mpBalance < refreshCost;
        weeklyRefreshButton.title = mpBalance < refreshCost ? `need ${formatAmount(refreshCost - mpBalance)} more mp` : `spend ${formatAmount(refreshCost)} mp to get a new weekly challenge`;
        weeklyRefreshButton.textContent = `refresh weekly · ${formatAmount(refreshCost)} mp`;
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
        if (arenaDifficultyPicker) arenaDifficultyPicker.disabled = false;
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
                window.triggerBadgeAction?.("event-quest", 1);
                countQuestForBadgePeek();
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
            window.triggerBadgeAction?.("weekly-win", 1);
            countQuestForBadgePeek();
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
        playerTrail.forEach(point => {
            ctx.globalAlpha = Math.max(0, point.life / .42) * .55;
            ctx.beginPath(); ctx.fillStyle = "#55baff"; ctx.shadowColor = "#55baff"; ctx.shadowBlur = 18;
            ctx.arc(point.x, point.y, player.radius * point.life / .42, 0, Math.PI * 2); ctx.fill();
        });
        ctx.globalAlpha = 1;
        lightningEffects.forEach(effect => {
            if (effect.rodStrike) {
                if (effect.wait > 0) {
                    ctx.save();
                    ctx.globalAlpha = .22 + Math.sin(performance.now() / 55) * .08;
                    ctx.setLineDash([12, 9]);
                    ctx.strokeStyle = "#8df7ff";
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.arc(effect.x, effect.y, effect.areaRadius, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.setLineDash([]);
                    ctx.restore();
                    return;
                }
                const progress = Math.max(0, Math.min(1, 1 - effect.life / .8));
                const fade = 1 - progress;
                const seed = Math.floor(effect.x * 13 + effect.y * 7);
                const boltStartY = -90;
                ctx.save();
                ctx.globalAlpha = fade;
                ctx.lineCap = "round";
                ctx.lineJoin = "round";
                const drawBolt = (offset, width, color, glow) => {
                    ctx.beginPath();
                    ctx.moveTo(effect.x + offset, boltStartY);
                    for (let step = 1; step < 7; step++) {
                        const y = boltStartY + (effect.y - boltStartY) * step / 7;
                        const zigzag = ((step * 17 + seed) % 23) - 11;
                        ctx.lineTo(effect.x + offset + zigzag, y);
                    }
                    ctx.lineTo(effect.x, effect.y);
                    ctx.strokeStyle = color;
                    ctx.lineWidth = width;
                    ctx.shadowColor = color;
                    ctx.shadowBlur = glow;
                    ctx.stroke();
                };
                drawBolt(0, effect.boltWidth || 18, "#8df7ff", 32);
                drawBolt(0, Math.max(4, (effect.boltWidth || 18) * .3), "#ffffff", 16);
                ctx.shadowBlur = 0;
                for (const branch of [-1, 1]) {
                    const branchY = effect.y * .58;
                    ctx.beginPath();
                    ctx.moveTo(effect.x, branchY);
                    ctx.lineTo(effect.x + branch * 28, branchY + 14);
                    ctx.lineTo(effect.x + branch * 43, branchY + 8);
                    ctx.strokeStyle = "#bafaff";
                    ctx.lineWidth = Math.max(4, (effect.boltWidth || 18) * .3);
                    ctx.shadowColor = "#8df7ff";
                    ctx.shadowBlur = 24;
                    ctx.stroke();
                }
                ctx.shadowBlur = 0;
                for (const branch of [-1, 1]) {
                    ctx.beginPath();
                    ctx.moveTo(effect.x, effect.y - 12);
                    ctx.lineTo(effect.x + branch * 12, effect.y - 6);
                    ctx.lineTo(effect.x + branch * 22, effect.y - 11);
                    ctx.strokeStyle = "#c3fbff";
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }
                const areaRadius = effect.areaRadius || 92;
                ctx.beginPath();
                ctx.fillStyle = `rgba(141,247,255,${.14 * fade})`;
                ctx.arc(effect.x, effect.y, areaRadius * (.82 + progress * .18), 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.strokeStyle = `rgba(220,255,255,${.95 * fade})`;
                ctx.lineWidth = 5 * fade;
                ctx.arc(effect.x, effect.y, areaRadius * (.9 + progress * .1), 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
                return;
            }
            ctx.globalAlpha = Math.max(0, effect.life / .35);
            if (effect.fire) {
                const effectColor = effect.color || "#ff7b32";
                const radius = effect.radius || 78;
                ctx.beginPath(); ctx.fillStyle = effect.color ? "rgba(237,85,255,.25)" : "rgba(255,104,35,.25)"; ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = effectColor; ctx.shadowColor = effectColor; ctx.shadowBlur = 24; ctx.lineWidth = 5;
                ctx.beginPath(); ctx.arc(effect.x, effect.y, radius * .62, 0, Math.PI * 2); ctx.stroke(); ctx.shadowBlur = 0;
            } else {
                ctx.strokeStyle = effect.chains?.length ? "#65eaff" : "#f1ff82"; ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 24; ctx.lineWidth = 7;
                ctx.beginPath(); ctx.moveTo(effect.x, 0); ctx.lineTo(effect.x - 12, effect.y * .35); ctx.lineTo(effect.x + 9, effect.y * .65); ctx.lineTo(effect.x, effect.y); ctx.stroke(); ctx.shadowBlur = 0;
                ctx.beginPath(); ctx.fillStyle = "rgba(241,255,130,.3)"; ctx.arc(effect.x, effect.y, 92, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.strokeStyle = "rgba(255,255,210,.8)"; ctx.lineWidth = 2; ctx.arc(effect.x, effect.y, 92, 0, Math.PI * 2); ctx.stroke();
                (effect.chains || []).forEach(point => {
                    ctx.beginPath(); ctx.moveTo(effect.x, effect.y); ctx.lineTo((effect.x + point.x) / 2 + 10, (effect.y + point.y) / 2 - 8); ctx.lineTo(point.x, point.y); ctx.stroke();
                });
            }
        });
        ctx.globalAlpha = 1;
        if (beaconActive) {
            const { x: endX, y: endY } = beamEndpoint();
            ctx.save(); ctx.lineCap = "round"; ctx.strokeStyle = "rgba(185,45,255,.28)"; ctx.lineWidth = 30; ctx.shadowColor = "#a300ff"; ctx.shadowBlur = 36;
            ctx.beginPath(); ctx.moveTo(player.x, player.y); ctx.lineTo(endX, endY); ctx.stroke();
            ctx.strokeStyle = "#d98aff"; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(player.x, player.y); ctx.lineTo(endX, endY); ctx.stroke(); ctx.restore();
        }
        sparks.forEach(spark => {
            ctx.fillStyle = spark.color;
            ctx.globalAlpha = Math.max(0, spark.life);
            ctx.fillRect(spark.x, spark.y, 4, 4);
        });
        ctx.globalAlpha = 1;
        bolts.forEach(bolt => {
            const color = bolt.kind === "fire" ? "#ff7b32" : bolt.kind === "electric" ? "#65eaff" : "#8cfaff";
            ctx.beginPath(); ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 14;
            ctx.arc(bolt.x, bolt.y, 5, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
        });
        attackEffects.forEach(effect => {
            const progress = 1 - effect.life / .34;
            ctx.globalAlpha = Math.max(0, effect.life / .34);
            ctx.strokeStyle = effect.color; ctx.shadowColor = effect.color; ctx.shadowBlur = 18; ctx.lineWidth = effect.type === "slam" ? 8 : 6;
            if (effect.type === "slam") {
                ctx.beginPath(); ctx.arc(effect.x, effect.y, 18 + progress * effect.radius, 0, Math.PI * 2); ctx.stroke();
            } else {
                ctx.beginPath(); ctx.arc(effect.x, effect.y, 34 + progress * 18, effect.angle - 1.25, effect.angle + 1.25); ctx.stroke();
                if (effect.stab) { ctx.beginPath(); ctx.moveTo(effect.x, effect.y); ctx.lineTo(effect.x + Math.cos(effect.angle) * 82, effect.y + Math.sin(effect.angle) * 82); ctx.stroke(); }
            }
            ctx.shadowBlur = 0;
        });
        ctx.globalAlpha = 1;
        enemies.forEach(enemy => {
            const renderY = enemy.y - (enemy.airHeight || 0);
            if (enemy.airHeight > 0) { ctx.beginPath(); ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.ellipse(enemy.x, enemy.y + enemy.radius * .6, enemy.radius * 1.25, enemy.radius * .45, 0, 0, Math.PI * 2); ctx.fill(); }
            const enemyColor = enemy.frozen > 0 ? "#5bbaff" : enemy.voidTime > 0 ? "#bd68ff" : enemy.burnTime > 0 ? "#ff7138" : enemy.color;
            ctx.beginPath(); ctx.fillStyle = enemyColor; ctx.shadowColor = enemyColor; ctx.shadowBlur = 15;
            ctx.arc(enemy.x, renderY, enemy.radius, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
            ctx.beginPath(); ctx.fillStyle = "#07101a";
            ctx.arc(enemy.x - enemy.radius * .3, renderY - 2, 2.4, 0, Math.PI * 2);
            ctx.arc(enemy.x + enemy.radius * .3, renderY - 2, 2.4, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "rgba(0,0,0,.75)"; ctx.fillRect(enemy.x - 18, renderY - enemy.radius - 9, 36, 4);
            ctx.fillStyle = enemy.frozen > 0 ? "#6bdcff" : "#ff647d"; ctx.fillRect(enemy.x - 18, renderY - enemy.radius - 9, 36 * Math.max(0, enemy.hp / enemy.maxHp), 4);
        });
        ctx.beginPath();
        ctx.globalAlpha = ghostTime > 0 ? .38 : 1;
        ctx.fillStyle = ghostTime > 0 ? "#75c9ff" : player.invulnerable > 0 && Math.floor(elapsed * 12) % 2 ? "#ffffff" : "#be8cff";
        ctx.shadowColor = "#d76cff"; ctx.shadowBlur = 24;
        if (!selectedArenaItem) ctx.fillRect(player.x - player.radius, player.y - player.radius, player.radius * 2, player.radius * 2);
        else { ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2); ctx.fill(); }
        ctx.shadowBlur = 0;
        ctx.beginPath(); ctx.fillStyle = "#e9d9ff"; ctx.arc(player.x, player.y, 5, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
        const weaponSprite = selectedArenaItem ? getArenaSprite(selectedWeaponImage, 64, selectedArenaItem === "Stormlander V2") : null;
        if (weaponSprite) {
            ctx.save();
            ctx.translate(player.x + facing.x * 31, player.y + facing.y * 31);
            ctx.rotate(Math.atan2(facing.y, facing.x));
            ctx.globalAlpha = ghostTime > 0 ? .5 : 1;
            ctx.shadowColor = "#c677ff"; ctx.shadowBlur = 13;
            ctx.drawImage(weaponSprite, -32, -32, 64, 64);
            ctx.restore();
        }
        const artifactSprite = selectedArenaArtifact ? getArenaSprite(selectedArtifactImage, 48) : null;
        if (artifactSprite) {
            ctx.save();
            if (selectedArtifact() === "golden crown" && !selectedArenaItem) ctx.translate(player.x, player.y - 18);
            else ctx.translate(player.x - facing.x * 31, player.y - facing.y * 31);
            ctx.globalAlpha = ghostTime > 0 ? .45 : .9;
            ctx.shadowColor = "#45d9ff"; ctx.shadowBlur = 12;
            const artifactSize = selectedArtifact() === "golden crown" ? 60 : 48;
            ctx.drawImage(artifactSprite, -artifactSize / 2, -artifactSize / 2, artifactSize, artifactSize);
            ctx.restore();
        }
        ctx.globalAlpha = 1;
        bolts.forEach(bolt => {
            if (bolt.kind === "firework") {
                const sprite = getArenaSprite(bolt.sprite, 32);
                if (sprite) { ctx.save(); ctx.translate(bolt.x, bolt.y); ctx.rotate(Math.atan2(bolt.vy, bolt.vx)); ctx.drawImage(sprite, -20, -16, 40, 32); ctx.restore(); }
            } else if (bolt.kind === "dominance" || bolt.kind === "terror") {
                ctx.beginPath(); ctx.fillStyle = bolt.kind === "terror" ? "#aaff63" : "#ff75ed"; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 22;
                ctx.arc(bolt.x, bolt.y, bolt.kind === "terror" ? 11 : 16, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
            }
        });
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
        const difficulty = difficultySettings();
        const maxHp = Math.round((45 + Math.random() * 65 + wave * 5) * difficulty.hp);
        enemies.push({ x, y, radius: 11 + Math.min(5, wave), speed: (38 + wave * 5 + Math.random() * 12) * difficulty.speed, hp: maxHp, maxHp, frozen: 0, burnTime: 0, burnDamage: 0, burnTick: .5, voidTime: 0, voidDamage: 0, voidTick: .5, color: wave > 4 ? "#48d7dd" : "#56b8d5" });
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

    function difficultySettings() {
        return {
            easy: { hp: .72, speed: .82, damage: .65, spawn: .82 },
            normal: { hp: 1, speed: 1, damage: 1, spawn: 1 },
            hard: { hp: 1.45, speed: 1.24, damage: 1.5, spawn: 1.3 }
        }[arenaDifficultyPicker?.value || "normal"] || { hp: 1, speed: 1, damage: 1, spawn: 1 };
    }

    function catalogItemDamage(name) {
        const card = arenaItemCards().find(item => item.dataset.itemName === name || (item.getAttribute("onclick") || "").includes(name));
        if (!card) return 0;
        const storedDamage = Number(card.dataset.damage);
        if (Number.isFinite(storedDamage) && card.dataset.damage !== undefined) return Math.max(0, storedDamage);
        const match = (card.getAttribute("onclick") || "").match(/showItem\(\s*'(?:\\.|[^'\\])*'\s*,\s*(∞|[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?)/i);
        if (match?.[1] === "∞") return Infinity;
        const parsedDamage = Number(match?.[1]);
        return Number.isFinite(parsedDamage) ? Math.max(0, parsedDamage) : 0;
    }

    function selectedWeaponDamage() {
        const baseDamage = catalogItemDamage(selectedArenaItem);
        const rarity = selectedWeaponRarity();
        const multiplier = {
            "magma": 1.2,
            "flamed": 1.2,
            "flame": 1.2,
            "magma+flamed": 1.2,
            "frozen": 1.2,
            "void": 1.2,
            "special": 1.5,
            "divine": 2.5,
            "mystical": 2.5,
            "mythical": 2.5,
            "electric": 1.15,
            "shadow": 1.1,
            "dominance": 8,
            "void+": 1.35,
            "void plus": 1.35
        }[rarity] || 1;
        return baseDamage * multiplier;
    }

    function selectedWeaponRarity() {
        const card = arenaItemCards().find(item => item.dataset.itemName === selectedArenaItem || (item.getAttribute("onclick") || "").includes(selectedArenaItem));
        return String(card?.dataset.rarity || "").trim().toLowerCase().replace(/\s+/g, " ").replace(/\s*\+\s*/g, "+");
    }

    function applyRarityEffect(enemy, rarity, damage) {
        if (!enemy || !enemies.includes(enemy)) return;
        if (rarity === "magma" || rarity === "flamed" || rarity === "flame" || rarity === "magma+flamed") {
            enemy.burnTime = Math.max(enemy.burnTime || 0, 3);
            enemy.burnDamage = Math.max(enemy.burnDamage || 0, damage * .12);
            sparks.push({ x: enemy.x, y: enemy.y, life: .65, color: "#ff7138" });
        } else if (rarity === "void" || rarity === "void+" || rarity === "void plus") {
            const duration = rarity === "void" ? 3 : 7;
            const dps = damage * (rarity === "void" ? .18 : .28);
            enemy.voidTime = Math.max(enemy.voidTime || 0, duration);
            enemy.voidDamage = Math.max(enemy.voidDamage || 0, dps);
            sparks.push({ x: enemy.x, y: enemy.y, life: .7, color: "#bd68ff" });
        } else if (rarity === "frozen") {
            enemy.frozen = Math.max(enemy.frozen || 0, 4);
            sparks.push({ x: enemy.x, y: enemy.y, life: .7, color: "#68dfff" });
        } else if (rarity === "electric") {
            sparks.push({ x: enemy.x, y: enemy.y, life: .6, color: "#65eaff" });
            lightningEffects.push({ x: enemy.x, y: enemy.y, life: .3, chains: [] });
        }
    }

    function rarityHitColor(rarity, fallback = "#d69cff") {
        return ({ magma: "#ff7138", flamed: "#ff7138", flame: "#ff7138", "magma+flamed": "#ff7138", gravity: "#ad8bff", shadow: "#7180c9", void: "#bd68ff", "void+": "#df55ff", frozen: "#68dfff", electric: "#65eaff", divine: "#ffe98a", mystical: "#d993ff", mythical: "#d993ff", dominance: "#ff5ce4", special: "#ffb65e" })[rarity] || fallback;
    }

    function applyRarityImpact(center, rarity, damage, includeArea = true) {
        if (!center || !rarity) return;
        if (!includeArea) {
            if (rarity === "shadow") ghostTime = Math.max(ghostTime, 3.5);
            if (rarity === "gravity") {
                enemies.forEach(enemy => {
                    const dx = center.x - enemy.x;
                    const dy = center.y - enemy.y;
                    const distance = Math.hypot(dx, dy) || 1;
                    if (distance <= 210) {
                        enemy.x += dx / distance * Math.min(52, distance * .35);
                        enemy.y += dy / distance * Math.min(52, distance * .35);
                    }
                });
            }
            applyRarityEffect(center, rarity, damage);
            return;
        }
        const color = rarityHitColor(rarity);
        const nearby = enemies.slice().filter(enemy => Math.hypot(enemy.x - center.x, enemy.y - center.y) <= (rarity === "dominance" ? 220 : 100));
        if (rarity === "gravity") {
            enemies.forEach(enemy => {
                const dx = center.x - enemy.x;
                const dy = center.y - enemy.y;
                const distance = Math.hypot(dx, dy) || 1;
                if (distance <= 210) {
                    enemy.x += dx / distance * Math.min(52, distance * .35);
                    enemy.y += dy / distance * Math.min(52, distance * .35);
                }
            });
        } else if (rarity === "shadow") {
            ghostTime = Math.max(ghostTime, 3.5);
        } else if (rarity === "electric") {
            const chains = nearby.filter(enemy => enemy !== center).slice(0, 4).map(enemy => ({ x: enemy.x, y: enemy.y }));
            lightningEffects.push({ x: center.x, y: center.y, life: .38, chains });
            nearby.filter(enemy => enemy !== center).forEach(enemy => damageEnemy(enemy, damage * .35, color));
        } else if (rarity === "dominance") {
            nearby.filter(enemy => enemy !== center).forEach(enemy => damageEnemy(enemy, damage * 2, color));
        }
        if (includeArea || ["magma", "flamed", "flame", "magma+flamed", "void", "void+", "frozen"].includes(rarity)) {
            nearby.forEach(enemy => applyRarityEffect(enemy, rarity, damage));
        } else {
            applyRarityEffect(center, rarity, damage);
        }
    }

    function selectedArtifactDamage() {
        const card = arenaItemCards().find(item => item.dataset.itemName === selectedArenaArtifact || (item.getAttribute("onclick") || "").includes(selectedArenaArtifact));
        return Math.max(0, Number(card?.dataset.artifactPower) || catalogItemDamage(selectedArenaArtifact));
    }

    function isArenaBow() {
        return ["bow", "winter's touch", "shivering bow"].includes(normalizedItemName(selectedArenaItem));
    }

    function updatePlayerHealth() {
        const ratio = Math.max(0, Math.min(1, player.health / player.maxHealth));
        if (healthLabel) healthLabel.textContent = `${Math.ceil(Math.max(0, player.health))} / ${player.maxHealth}`;
        if (arenaHealthFill) arenaHealthFill.style.width = `${ratio * 100}%`;
        if (arenaHealthFill) arenaHealthFill.style.filter = ratio < .25 ? "saturate(1.5) brightness(.8)" : "";
    }

    function attackWithWeapon(target) {
        if (!target || !enemies.includes(target)) return;
        const weapon = normalizedItemName(selectedArenaItem);
        const damage = selectedWeaponDamage();
        const rarity = selectedWeaponRarity();
        const angle = Math.atan2(target.y - player.y, target.x - player.x);
        facing = { x: Math.cos(angle), y: Math.sin(angle) };
        const frostHeart = weapon === "frost slayer" || weapon === "heartstealer";
        const starless = weapon === "the starless night";
        const comboIndex = weaponCombo++ % (frostHeart ? 3 : starless ? 2 : 1);
        const slam = frostHeart ? comboIndex === 2 : starless ? comboIndex === 1 : ["hammer of gravity", "stormlander", "stormlander v2", "electric hammer v2", "great hammer"].includes(weapon);
        const color = weapon === "flame sword" ? "#ff7438" : frostHeart ? "#68dfff" : weapon.includes("crucible") || weapon === "awesomeaxe" ? "#ff572e" : rarityHitColor(rarity);
        const impactRadius = weapon === "hammer of gravity" ? 150 : weapon === "stormlander" || weapon === "stormlander v2" ? 95 : weapon === "great hammer" ? 62 : weapon === "cursed axe" ? 104 : weapon === "awesomeaxe" || weapon === "axe" ? 82 : weapon === "frost slayer" || weapon === "heartstealer" ? 84 : starless ? 96 : weapon.includes("crucible") ? 96 : weapon === "flame sword" ? 64 : 0;
        const attackType = slam ? "slam" : frostHeart ? ["swing", "stab"][comboIndex] : starless ? "swing" : "swing";
        attackEffects.push({ x: player.x, y: player.y, angle, life: .34, type: slam ? "slam" : "swing", stab: attackType === "stab", radius: impactRadius || 62, color });

        const hitDamage = damage;
        damageEnemy(target, hitDamage, color);
        applyRarityImpact(target, rarity, hitDamage, true);
        if (impactRadius > 0) {
            if (weapon === "hammer of gravity") {
                enemies.forEach(enemy => {
                    const distance = Math.hypot(enemy.x - player.x, enemy.y - player.y);
                    if (distance <= impactRadius && distance > 8) {
                        enemy.x = player.x + (enemy.x - player.x) * .45;
                        enemy.y = player.y + (enemy.y - player.y) * .45;
                        if (enemy !== target) damageEnemy(enemy, damage, color);
                    }
                });
            } else {
                enemies.slice().forEach(enemy => {
                    if (enemy !== target && Math.hypot(enemy.x - target.x, enemy.y - target.y) <= impactRadius) {
                        damageEnemy(enemy, hitDamage, color);
                        applyRarityImpact(enemy, rarity, hitDamage, false);
                    }
                });
            }
        }
        if (frostHeart) enemies.forEach(enemy => {
            if (Math.hypot(enemy.x - target.x, enemy.y - target.y) <= impactRadius || enemy === target) enemy.frozen = 2.8;
        });
        if (["stormlander", "stormlander v2", "electric hammer v2"].includes(weapon)) {
            const chains = ["stormlander v2", "electric hammer v2"].includes(weapon) ? enemies.filter(enemy => enemy !== target && Math.hypot(enemy.x - target.x, enemy.y - target.y) < 190).slice(0, 3).map(enemy => ({ x: enemy.x, y: enemy.y })) : [];
            lightningEffects.push({ x: target.x, y: target.y, life: .38, chains });
            chains.forEach(point => {
                const chained = enemies.find(enemy => Math.hypot(enemy.x - point.x, enemy.y - point.y) < 2);
                if (chained) damageEnemy(chained, damage, "#efff82");
            });
        }
        if (weapon === "heartstealer") {
            player.health = Math.min(player.maxHealth, player.health + Math.max(2, hitDamage * .28));
            updatePlayerHealth();
        }
        gameStatus.textContent = `${selectedArenaItem} · ${attackType}${frostHeart ? " · freezing" : ""}${weapon === "heartstealer" ? " · leeching" : ""}`;
    }

    function damageEnemy(enemy, amount, color = "#65eaff") {
        if (!enemy || !enemies.includes(enemy)) return;
        enemy.hp -= amount;
        sparks.push({ x: enemy.x, y: enemy.y, life: .8, color });
        if (enemy.hp <= 0) {
            enemies = enemies.filter(candidate => candidate !== enemy);
            kills += 1;
            killsLabel.textContent = kills;
            souls += 10;
            window.triggerBadgeAction?.("arena-kill", 1);
        }
    }

    function beamEndpoint() {
        const xDistance = facing.x > 0 ? (arena.width - player.x) / facing.x : facing.x < 0 ? (0 - player.x) / facing.x : Infinity;
        const yDistance = facing.y > 0 ? (arena.height - player.y) / facing.y : facing.y < 0 ? (0 - player.y) / facing.y : Infinity;
        const distance = Math.min(xDistance > 0 ? xDistance : Infinity, yDistance > 0 ? yDistance : Infinity);
        return { x: player.x + facing.x * distance, y: player.y + facing.y * distance };
    }

    function updateArena(dt) {
        if (loadoutSelectionActive) return;
        if (artifactRightHeld && cooldownsDisabled() && artifactCanRepeat()) {
            artifactRepeatClock += dt;
            while (artifactRepeatClock >= artifactRepeatInterval) {
                artifactRepeatClock -= artifactRepeatInterval;
                activateSelectedArtifact();
                if (!running || !artifactRightHeld || !cooldownsDisabled()) break;
            }
        } else {
            artifactRepeatClock = 0;
        }
        const challenge = currentRunChallenge();
        elapsed += dt;
        const wave = Math.floor(elapsed / 15) + 1;
        if (waveLabel.textContent !== String(wave)) waveLabel.textContent = wave;
        const remaining = Math.max(0, Math.ceil(challenge.seconds - elapsed));
        if (timeLabel.textContent !== String(remaining)) timeLabel.textContent = remaining;
        player.invulnerable = Math.max(0, player.invulnerable - dt);
        player.fireDelay -= dt;
        abilityCooldown = Math.max(0, abilityCooldown - dt);
        updateArenaAbilityControl();
        ghostTime = Math.max(0, ghostTime - dt);
        if (selectedArtifact() !== "void stabilizer") corruption = Math.min(100, corruption + dt * (enemies.length ? 2 : .5));
        if (corruptionLabel) {
            const corruptionText = `${Math.floor(corruption)}%${selectedArtifact() === "void stabilizer" ? " · stabilized" : ""}`;
            if (corruptionLabel.textContent !== corruptionText) corruptionLabel.textContent = corruptionText;
        }
        if (corruption >= 100) {
            corruption = 35;
            if (player.invulnerable <= 0) {
                player.health -= 1;
                player.invulnerable = 1.15 + arenaUpgrades.resistance * .35;
                updatePlayerHealth();
                if (player.health <= 0) finishRun(false, "void corruption consumed you · try again");
            }
        }
        if (beaconActive) {
            souls = Math.max(0, souls - 20 * dt);
            if (souls <= 0) beaconActive = false;
            const beamEnd = beamEndpoint();
            enemies.slice().forEach(enemy => {
                const vx = beamEnd.x - player.x; const vy = beamEnd.y - player.y;
                const lengthSq = vx * vx + vy * vy || 1;
                const t = Math.max(0, Math.min(1, ((enemy.x - player.x) * vx + (enemy.y - player.y) * vy) / lengthSq));
                const distance = Math.hypot(enemy.x - (player.x + t * vx), enemy.y - (player.y + t * vy));
                if (distance < enemy.radius + 14) damageEnemy(enemy, selectedArtifactDamage() * dt, "#d58aff");
            });
        }
        if (arenaSoulsLabel) {
            const soulsText = `${Math.floor(souls)} souls`;
            if (arenaSoulsLabel.textContent !== soulsText) arenaSoulsLabel.textContent = soulsText;
        }
        lightningEffects.forEach(effect => {
            if (effect.rodStrike && effect.wait > 0) {
                effect.wait = Math.max(0, effect.wait - dt);
                return;
            }
            if (effect.rodStrike && !effect.damageApplied) {
                effect.damageApplied = true;
                [...enemies].filter(enemy => Math.hypot(enemy.x - effect.x, enemy.y - effect.y) <= effect.areaRadius).forEach(enemy => damageEnemy(enemy, effect.damage, "#eaff75"));
            }
            effect.life -= dt;
        });
        lightningEffects = lightningEffects.filter(effect => effect.life > 0 || (effect.rodStrike && effect.wait > 0));
        attackEffects.forEach(effect => { effect.life -= dt; });
        attackEffects = attackEffects.filter(effect => effect.life > 0);
        playerTrail.forEach(point => { point.life -= dt; });
        playerTrail = playerTrail.filter(point => point.life > 0);
        spawnClock -= dt;
        if (spawnClock <= 0) {
            spawnEnemy(wave);
            if (wave >= 3 && Math.random() < .24) spawnEnemy(wave);
            spawnClock = Math.max(.38, (1.45 - wave * .12) / difficultySettings().spawn);
        }

        let dx = (keys.has("d") || keys.has("arrowright") ? 1 : 0) - (keys.has("a") || keys.has("arrowleft") ? 1 : 0);
        let dy = (keys.has("s") || keys.has("arrowdown") ? 1 : 0) - (keys.has("w") || keys.has("arrowup") ? 1 : 0);
        if (!dx && !dy && moveTarget) {
            dx = moveTarget.x - player.x; dy = moveTarget.y - player.y;
            const distance = Math.hypot(dx, dy);
            if (distance < 8) { dx = 0; dy = 0; moveTarget = null; }
        }
        const magnitude = Math.hypot(dx, dy) || 1;
        const speed = 220 * (ghostTime > 0 ? 1.8 : 1);
        if (dx || dy) facing = { x: dx / magnitude, y: dy / magnitude };
        player.x = Math.max(player.radius, Math.min(arena.width - player.radius, player.x + dx / magnitude * speed * dt));
        player.y = Math.max(player.radius, Math.min(arena.height - player.radius, player.y + dy / magnitude * speed * dt));
        if (ghostTime > 0 && (dx || dy)) playerTrail.push({ x: player.x, y: player.y, life: .42 });

        enemies.forEach(enemy => {
            enemy.frozen = Math.max(0, (enemy.frozen || 0) - dt);
            enemy.stunned = Math.max(0, (enemy.stunned || 0) - dt);
            for (const status of ["burn", "void"]) {
                const timeKey = `${status}Time`;
                const damageKey = `${status}Damage`;
                const tickKey = `${status}Tick`;
                if (enemy[timeKey] > 0) {
                    enemy[timeKey] = Math.max(0, enemy[timeKey] - dt);
                    enemy[tickKey] = (enemy[tickKey] || .5) - dt;
                    while (enemy[timeKey] > 0 && enemy[tickKey] <= 0 && enemies.includes(enemy)) {
                        damageEnemy(enemy, (enemy[damageKey] || 0) * .5, status === "burn" ? "#ff7138" : "#bd68ff");
                        enemy[tickKey] += .5;
                    }
                    if (enemy[timeKey] <= 0) enemy[damageKey] = 0;
                }
            }
            if (!enemies.includes(enemy)) return;
            const ex = player.x - enemy.x; const ey = player.y - enemy.y; const distance = Math.hypot(ex, ey) || 1;
            if (enemy.air > 0) {
                enemy.air -= dt;
                enemy.airHeight = Math.max(0, enemy.airHeight + enemy.airVelocity * dt);
                enemy.airVelocity -= 720 * dt;
                if (enemy.airVelocity <= 0 && enemy.airHeight <= 0) {
                    enemy.airHeight = 0;
                    enemy.air = 0;
                    enemy.airVelocity = 0;
                    damageEnemy(enemy, enemy.fallDamage || 4, "#9cf8ff");
                }
            } else {
                const slow = enemy.frozen > 0 ? .42 : 1;
                const runningAway = enemy.fleeAt && elapsed >= enemy.fleeAt;
                if (enemy.stunned <= 0) {
                    const direction = runningAway ? -1 : 1;
                    enemy.x += ex / distance * enemy.speed * slow * direction * dt;
                    enemy.y += ey / distance * enemy.speed * slow * direction * dt;
                }
            }
            if (enemy.despawnAt && elapsed >= enemy.despawnAt) { damageEnemy(enemy, enemy.hp, "#aaff63"); return; }
            if (enemy.air <= 0 && distance < player.radius + enemy.radius && player.invulnerable <= 0) {
                player.health -= Math.max(1, 10 - selectedArtifactProtection()) * difficultySettings().damage; player.invulnerable = 1.15 + arenaUpgrades.resistance * .35;
                player.x = Math.max(player.radius, Math.min(arena.width - player.radius, player.x + ex / distance * 36));
                player.y = Math.max(player.radius, Math.min(arena.height - player.radius, player.y + ey / distance * 36));
                updatePlayerHealth();
                if (player.health <= 0) finishRun(false, "the rift caught you · try again");
            }
        });
        if (!running) return;

        if (player.fireDelay <= 0 && enemies.length) {
            const target = nearestEnemy();
            if (!selectedArenaItem && !selectedArtifact() && !(beaconActive && selectedArtifact().startsWith("corrupted beacon"))) {
                const distance = Math.hypot(target.x - player.x, target.y - player.y) || 1;
                bolts.push({ x: player.x, y: player.y, vx: (target.x - player.x) / distance * 390, vy: (target.y - player.y) / distance * 390, damage: 14 + arenaUpgrades.damage * 3, life: 1.6, kind: "orb" });
                facing = { x: (target.x - player.x) / distance, y: (target.y - player.y) / distance };
                player.fireDelay = .62;
            } else if (["orb of dominance", "staff of terror"].includes(normalizedItemName(selectedArenaItem))) {
                const distance = Math.hypot(target.x - player.x, target.y - player.y) || 1;
                const terror = normalizedItemName(selectedArenaItem) === "staff of terror";
                facing = { x: (target.x - player.x) / distance, y: (target.y - player.y) / distance };
                bolts.push({ x: player.x + facing.x * 20, y: player.y + facing.y * 20, vx: facing.x * 390, vy: facing.y * 390, damage: selectedWeaponDamage(), rarity: selectedWeaponRarity(), life: 2, kind: terror ? "terror" : "dominance", radius: terror ? 44 : 132 });
                player.fireDelay = terror ? 1.05 : .82;
            } else if (normalizedItemName(selectedArenaItem) === "firework arrow (mcdii)") {
                const dx = (aimTarget?.x ?? target.x) - player.x;
                const dy = (aimTarget?.y ?? target.y) - player.y;
                const distance = Math.hypot(dx, dy) || 1;
                const card = arenaItemCards().find(item => normalizedItemName(item.dataset.itemName) === "firework arrow (mcdii)");
                facing = { x: dx / distance, y: dy / distance };
                fireProjectileVolley({ angle: Math.atan2(facing.y, facing.x), speed: 360, damage: selectedWeaponDamage(), rarity: selectedWeaponRarity(), life: 2.2, kind: "firework", sprite: card?.querySelector("img") || null, radius: 178 });
                player.fireDelay = 1.05;
            } else if (isArenaBow()) {
                const distance = Math.hypot(target.x - player.x, target.y - player.y) || 1;
                const artifact = selectedArtifact();
                const compatibleBow = ["bow", "winter's touch", "shivering bow"].includes(normalizedItemName(selectedArenaItem));
                const flaming = compatibleBow && artifact === "flaming quiver";
                const electric = compatibleBow && artifact === "thundering quiver";
                facing = { x: (target.x - player.x) / distance, y: (target.y - player.y) / distance };
                fireProjectileVolley({ angle: Math.atan2(facing.y, facing.x), speed: 430, damage: selectedWeaponDamage(), rarity: selectedWeaponRarity(), life: 1.8, kind: flaming ? "fire" : electric ? "electric" : "arrow" });
                player.fireDelay = .7;
            } else if (selectedArenaItem && !artifactNames.has(normalizedItemName(selectedArenaItem))) {
                const range = normalizedItemName(selectedArenaItem) === "the starless night" ? 112 : 92;
                const distance = Math.hypot(target.x - player.x, target.y - player.y);
                if (distance <= range) {
                    attackWithWeapon(target);
                    player.fireDelay = normalizedItemName(selectedArenaItem) === "frost slayer" || normalizedItemName(selectedArenaItem) === "heartstealer" ? .58 : .72;
                } else player.fireDelay = .12;
            }
        }
        bolts.slice().forEach(bolt => {
            bolt.x += bolt.vx * dt; bolt.y += bolt.vy * dt; bolt.life -= dt;
            const hit = enemies.find(enemy => Math.hypot(enemy.x - bolt.x, enemy.y - bolt.y) < enemy.radius + 5);
            const wallHit = bolt.x <= 2 || bolt.y <= 2 || bolt.x >= arena.width - 2 || bolt.y >= arena.height - 2;
            if (bolt.kind === "firework" && (hit || wallHit || bolt.life <= 0)) {
                bolt.life = 0;
                const blastX = hit ? hit.x : Math.max(0, Math.min(arena.width, bolt.x));
                const blastY = hit ? hit.y : Math.max(0, Math.min(arena.height, bolt.y));
                const blastRadius = bolt.radius || 178;
                lightningEffects.push({ x: blastX, y: blastY, life: .8, fire: true, radius: blastRadius });
                enemies.slice().filter(enemy => Math.hypot(enemy.x - blastX, enemy.y - blastY) <= blastRadius).forEach(enemy => {
                    damageEnemy(enemy, bolt.damage, "#ff7b32");
                    applyRarityImpact(enemy, bolt.rarity, bolt.damage, false);
                });
            } else if (hit) {
                bolt.life = 0;
                if (bolt.kind === "dominance") {
                    const radius = bolt.radius || 132;
                    enemies.slice().filter(enemy => Math.hypot(enemy.x - hit.x, enemy.y - hit.y) <= radius).forEach(enemy => {
                        damageEnemy(enemy, bolt.damage, "#ff75ed");
                        applyRarityImpact(enemy, bolt.rarity, bolt.damage, false);
                    });
                    lightningEffects.push({ x: hit.x, y: hit.y, life: .65, fire: true, radius, color: "#ed55ff" });
                } else if (bolt.kind === "terror") {
                    damageEnemy(hit, bolt.damage, "#aaff63");
                    applyRarityImpact(hit, bolt.rarity, bolt.damage, true);
                    hit.stunned = 2;
                    hit.fleeAt = elapsed + 2;
                    hit.despawnAt = elapsed + 3.5;
                } else if (bolt.kind === "fire") {
                    enemies.filter(enemy => Math.hypot(enemy.x - hit.x, enemy.y - hit.y) <= 78).slice().forEach(enemy => {
                        damageEnemy(enemy, bolt.damage, "#ff7b32");
                        applyRarityImpact(enemy, bolt.rarity, bolt.damage, false);
                    });
                    sparks.push({ x: hit.x, y: hit.y, life: .8, color: "#ff7b32" });
                    lightningEffects.push({ x: hit.x, y: hit.y, life: .2, fire: true });
                } else if (bolt.kind === "electric") {
                    damageEnemy(hit, bolt.damage, "#65eaff");
                    const chains = enemies.filter(enemy => enemy !== hit && Math.hypot(enemy.x - hit.x, enemy.y - hit.y) <= 120).slice(0, 2);
                    lightningEffects.push({ x: hit.x, y: hit.y, life: .35, chains: chains.map(enemy => ({ x: enemy.x, y: enemy.y })) });
                    chains.forEach(enemy => damageEnemy(enemy, bolt.damage, "#65eaff"));
                    applyRarityImpact(hit, bolt.rarity, bolt.damage, true);
                } else {
                    damageEnemy(hit, bolt.damage);
                    applyRarityImpact(hit, bolt.rarity, bolt.damage, true);
                }
            }
        });
        bolts = bolts.filter(bolt => bolt.life > 0 && bolt.x > -20 && bolt.y > -20 && bolt.x < arena.width + 20 && bolt.y < arena.height + 20);
        sparks.forEach(spark => { spark.life -= dt * 1.5; spark.y -= 18 * dt; });
        sparks = sparks.filter(spark => spark.life > 0);
        if (selectedArtifact().startsWith("corrupted beacon") && beaconActive && arenaSoulsLabel) {
            const soulsText = `${Math.floor(souls)} souls`;
            if (arenaSoulsLabel.textContent !== soulsText) arenaSoulsLabel.textContent = soulsText;
        }
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
        player.x = arena.width / 2; player.y = arena.height / 2; player.maxHealth = 100 + arenaUpgrades.health * 10; player.health = player.maxHealth; player.invulnerable = 0; player.fireDelay = .25;
        enemies = []; bolts = []; sparks = []; lightningEffects = []; attackEffects = []; playerTrail = []; elapsed = 0; spawnClock = .5; kills = 0; previousFrame = 0; weaponCombo = 0;
        souls = 100; corruption = 0; ghostTime = 0; abilityCooldown = 0; beaconActive = false; facing = { x: 1, y: 0 };
        keys.clear(); moveTarget = null;
        updatePlayerHealth(); waveLabel.textContent = "1"; killsLabel.textContent = "0"; timeLabel.textContent = challenge.seconds;
        if (arenaSoulsLabel) arenaSoulsLabel.textContent = `${souls} souls`;
        refreshArenaItemPicker();
        updateArenaAbilityControl();
        gameStatus.textContent = selectedArtifact() === "void stabilizer" ? "dodge the rift creatures · void stabilizer is halting corruption" : "dodge the rift creatures · your equipped item is ready";
        startButton.textContent = "arena active";
        if (arenaDifficultyPicker) arenaDifficultyPicker.disabled = true;
        running = true;
        arenaFrame = requestAnimationFrame(arenaLoop);
    }

    canvas.addEventListener("pointerdown", event => {
        if (!running) return;
        canvas.focus({ preventScroll: true });
        const rect = canvas.getBoundingClientRect();
        aimTarget = {
            x: Math.max(0, Math.min(arena.width, (event.clientX - rect.left) * arena.width / rect.width)),
            y: Math.max(0, Math.min(arena.height, (event.clientY - rect.top) * arena.height / rect.height))
        };
        if (event.button === 2) {
            event.preventDefault();
            artifactRightHeld = true;
            artifactRepeatClock = 0;
            activateSelectedArtifact();
            return;
        }
        loadoutSelectionActive = false;
        clearArenaMovement();
        moveTarget = { x: (event.clientX - rect.left) * arena.width / rect.width, y: (event.clientY - rect.top) * arena.height / rect.height };
        mouseSteering = true;
        mousePointerId = event.pointerId;
        mouseHasMoved = false;
        canvas.setPointerCapture?.(event.pointerId);
    });
    canvas.addEventListener("pointermove", event => {
        if (!running) return;
        const rect = canvas.getBoundingClientRect();
        aimTarget = {
            x: Math.max(0, Math.min(arena.width, (event.clientX - rect.left) * arena.width / rect.width)),
            y: Math.max(0, Math.min(arena.height, (event.clientY - rect.top) * arena.height / rect.height))
        };
        if (!mouseSteering || event.pointerId !== mousePointerId) return;
        mouseHasMoved = true;
        moveTarget = { ...aimTarget };
    });
    const releaseMouseSteering = event => {
        if (event.type === "pointerup" && event.button === 2) artifactRightHeld = false;
        if (event.type === "pointercancel") artifactRightHeld = false;
        if (event.type === "pointerup" && (event.buttons & 1)) return;
        if (mousePointerId !== null && event.pointerId !== mousePointerId) return;
        if (mouseHasMoved) moveTarget = null;
        mouseSteering = false;
        mousePointerId = null;
        mouseHasMoved = false;
    };
    canvas.addEventListener("pointerup", releaseMouseSteering);
    canvas.addEventListener("pointercancel", releaseMouseSteering);
    window.addEventListener("pointerup", releaseMouseSteering);
    canvas.addEventListener("contextmenu", event => event.preventDefault());
    [arenaItemPicker, arenaArtifactPicker].forEach(picker => {
        picker?.addEventListener("pointerdown", () => {
            loadoutSelectionActive = true;
            clearArenaMovement();
        });
        picker?.addEventListener("focus", () => {
            loadoutSelectionActive = true;
            clearArenaMovement();
        });
        picker?.addEventListener("blur", () => {
            loadoutSelectionActive = false;
            clearArenaMovement();
        });
        picker?.addEventListener("change", clearArenaMovement);
    });
    document.addEventListener("keydown", event => {
        const key = event.key.toLowerCase();
        const focusedControl = event.target instanceof Element && event.target.closest("input, select, textarea, button, [contenteditable='true']");
        if (loadoutSelectionActive || focusedControl) {
            clearArenaMovement();
            return;
        }
        if (!dialog.hidden && !focusedControl && ["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
            event.preventDefault(); keys.add(key);
        }
    });
    document.addEventListener("keyup", event => {
        keys.delete(event.key.toLowerCase());
        if (event.target instanceof Element && event.target.closest("select")) clearArenaMovement();
    });
    window.addEventListener("blur", () => {
        artifactRightHeld = false;
        artifactRepeatClock = 0;
        clearArenaMovement();
    });
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            artifactRightHeld = false;
            artifactRepeatClock = 0;
            clearArenaMovement();
        }
    });

    weeklyButton.addEventListener("click", () => {
        activeEventQuest = null;
        refreshArenaItemPicker();
        dialog.hidden = false;
        startButton.textContent = "start game";
        gameStatus.textContent = weeklyObjective.textContent;
        drawArena();
    });
    document.querySelectorAll("[data-event-quest]").forEach(button => {
        button.addEventListener("click", () => {
            if (!eventMissionsActive()) return;
            const slot = button.dataset.eventQuest;
            const item = getEventAssignments(activeEvent)[slot];
            if (!item) return;
            activeEventQuest = { eventId: activeEvent.id, eventName: activeEvent.name, item, slot };
            refreshArenaItemPicker();
            dialog.hidden = false;
            gameTitle.textContent = `${activeEvent.name} · ${item}`;
            gameStatus.textContent = `survive the rift arena for ${currentRunChallenge().seconds} seconds to unlock ${item}`;
            startButton.textContent = "start event quest";
            drawArena();
        });
    });
    weeklyRefreshButton.addEventListener("click", () => {
        if (running) finishRun(false, "the weekly challenge refreshed · start a new run");
        const refreshCost = 5000 * (badgePeekPenaltyActive() ? 9 : 1);
        if (!window.spendCurrency(0, refreshCost)) {
            weeklyStatus.textContent = `need ${formatAmount(refreshCost - getBalance("mp"))} more mp to refresh`;
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
    window.addEventListener("inventory-badge-peek-settings-changed", () => {
        renderWeekly();
        refreshQuestPeriods();
        updateAll();
    });
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
