(() => {
    const storageKey = "dailyMissionsV1";

    function dateKey(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    function getToday() {
        return dateKey(new Date());
    }

    const questOptions = {
        "inspect-5": { title: "loot scout", objective: "inspect 5 different items", tracker: "items", target: 5, noun: "items inspected" },
        "inspect-8": { title: "deep sweep", objective: "inspect 8 different items", tracker: "items", target: 8, noun: "items inspected" },
        "inspect-12": { title: "arsenal survey", objective: "inspect 12 different items", tracker: "items", target: 12, noun: "items inspected" },
        "realities-3": { title: "reality hopper", objective: "visit 3 different realities", tracker: "realities", target: 3, noun: "realities visited" },
        "realities-5": { title: "realm walker", objective: "visit 5 different realities", tracker: "realities", target: 5, noun: "realities visited" },
        "realities-7": { title: "reality drifter", objective: "visit 7 different realities", tracker: "realities", target: 7, noun: "realities visited" },
        "enchant-1": { title: "blacksmith's touch", objective: "apply 1 enchant", tracker: "enchants", target: 1, noun: "enchants applied" },
        "enchant-2": { title: "rune crafter", objective: "apply 2 enchants", tracker: "enchants", target: 2, noun: "enchants applied" },
        "enchant-3": { title: "master smith", objective: "apply 3 enchants", tracker: "enchants", target: 3, noun: "enchants applied" }
    };

    const questSlots = ["inspect", "realities", "enchant"];
    const questRewards = {
        inspect: { ap: 40, mp: 15 },
        realities: { ap: 25, mp: 15 },
        enchant: { ap: 35, mp: 20 }
    };

    function randomChoice(values) {
        return values[Math.floor(Math.random() * values.length)];
    }

    function assignFreshQuests(excluded = []) {
        const available = Object.keys(questOptions).filter(id => !excluded.includes(id));
        const assigned = {};
        questSlots.forEach(slot => {
            const choice = randomChoice(available);
            assigned[slot] = choice;
            available.splice(available.indexOf(choice), 1);
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
            completed: {}
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

    function save() {
        localStorage.setItem(storageKey, JSON.stringify(state));
    }

    function updateMission(id) {
        const quest = questOptions[state.quests[id]];
        const reward = questRewards[id];
        const progressState = state.progress[id];
        const progress = Math.min(progressState.count, quest.target);
        const card = document.querySelector(`[data-mission="${id}"]`);
        if (!card) return;

        card.querySelector("h4").textContent = quest.title;
        card.querySelector(".mission-objective").textContent = quest.objective;
        card.querySelector(".mission-progress").textContent =
            `${progress} / ${quest.target} ${quest.noun}`;
        card.querySelector(".mission-meter span").style.width =
            `${(progress / quest.target) * 100}%`;

        const status = card.querySelector(".mission-status");
        if (state.completed[id]) {
            status.textContent = "earned today";
            status.classList.add("complete");
            card.classList.add("mission-complete");
            return;
        }

        status.textContent = "in progress";
        status.classList.remove("complete");
        card.classList.remove("mission-complete");
        if (progress >= quest.target) {
            state.completed[id] = true;
            save();
            window.awardCurrency(reward.ap, reward.mp);
            status.textContent = `earned +${reward.ap} ap and +${reward.mp} mp`;
            status.classList.add("complete");
            card.classList.add("mission-complete");
            syncRefreshControls();
        }
    }

    const refreshCosts = { inspect: 100, realities: 300, enchant: 500 };

    function syncRefreshControls() {
        const balance = Number(document.getElementById("apBalance").textContent) || 0;
        document.querySelectorAll("[data-refresh-quest]").forEach(button => {
            const cost = refreshCosts[button.dataset.refreshQuest];
            button.disabled = balance < cost;
            button.title = button.disabled ? `need ${cost - balance} more ap` : "spend ap to get a new quest";
        });
    }

    function updateAll() {
        questSlots.forEach(updateMission);
        syncRefreshControls();
    }

    document.querySelectorAll("[data-refresh-quest]").forEach(button => {
        button.addEventListener("click", () => {
            const slot = button.dataset.refreshQuest;
            const message = button.closest(".mission-card").querySelector(".mission-refresh-message");
            const balance = Number(document.getElementById("apBalance").textContent) || 0;
            const cost = refreshCosts[slot];
            if (!window.spendCurrency(cost, 0)) {
                message.textContent = `need ${cost - balance} more ap`;
                syncRefreshControls();
                return;
            }

            const otherQuests = questSlots
                .filter(otherSlot => otherSlot !== slot)
                .map(otherSlot => state.quests[otherSlot]);
            const choices = Object.keys(questOptions).filter(id =>
                id !== state.quests[slot] && !otherQuests.includes(id)
            );
            state.quests[slot] = randomChoice(choices);
            state.progress[slot] = state.quests[slot].startsWith("enchant-")
                ? { count: 0 }
                : { count: 0, seen: [] };
            delete state.completed[slot];
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
            if (quest.tracker !== "realities" || progress.seen.includes(reality)) return;
            progress.seen.push(reality);
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
        "sculk-pulse": {
            title: "sculk pulse",
            objective: "hit 20 sculk pulses in 30 seconds, with fewer than 3 misses",
            goal: 20, seconds: 30, maxMisses: 2, pulseDuration: 720
        },
        "echo-rush": {
            title: "echo rush",
            objective: "hit 28 sculk pulses in 25 seconds, with no more than 1 miss",
            goal: 28, seconds: 25, maxMisses: 1, pulseDuration: 560
        },
        "silent-resonance": {
            title: "silent resonance",
            objective: "hit 16 sculk pulses in 24 seconds without missing",
            goal: 16, seconds: 24, maxMisses: 0, pulseDuration: 900
        }
    };

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
    if (!weeklyState || weeklyState.week !== weekStart) {
        weeklyState = { week: weekStart, challenge: randomChoice(Object.keys(weeklyOptions)), completed: false };
    }
    if (!weeklyOptions[weeklyState.challenge]) weeklyState.challenge = "sculk-pulse";

    const weeklyButton = document.getElementById("playWeeklyChallenge");
    const weeklyRefreshButton = document.getElementById("refreshWeeklyChallenge");
    const weeklyStatus = document.getElementById("weeklyChallengeStatus");
    const weeklyTitle = document.getElementById("weeklyChallengeTitle");
    const weeklyObjective = document.getElementById("weeklyChallengeObjective");
    const dialog = document.getElementById("weeklyGameDialog");
    const board = document.getElementById("pulseBoard");
    const gameTitle = document.getElementById("weeklyGameTitle");
    const gameStatus = document.getElementById("weeklyGameStatus");
    const scoreLabel = document.getElementById("pulseScore");
    const scoreGoalLabel = document.getElementById("pulseGoal");
    const missesLabel = document.getElementById("pulseMisses");
    const missesLimitLabel = document.getElementById("pulseMissLimit");
    const timeLabel = document.getElementById("pulseTime");
    const startButton = document.getElementById("startPulseGame");
    const tiles = [];
    let running = false;
    let score = 0;
    let misses = 0;
    let seconds = 30;
    let timerId = null;
    let pulseId = null;
    let activeTile = null;

    function currentWeeklyChallenge() {
        return weeklyOptions[weeklyState.challenge];
    }

    function saveWeekly() {
        localStorage.setItem(weeklyStorageKey, JSON.stringify(weeklyState));
    }

    function renderWeekly() {
        const challenge = currentWeeklyChallenge();
        weeklyTitle.textContent = challenge.title;
        weeklyObjective.textContent = challenge.objective;
        gameTitle.textContent = challenge.title;
        scoreGoalLabel.textContent = challenge.goal;
        missesLimitLabel.textContent = challenge.maxMisses;
        weeklyRefreshButton.hidden = !weeklyState.completed;
        const mpBalance = Number(document.getElementById("mpBalance").textContent) || 0;
        weeklyRefreshButton.disabled = mpBalance < 3000;
        weeklyRefreshButton.title = mpBalance < 3000 ? `need ${3000 - mpBalance} more mp` : "spend mp to get a new weekly challenge";
        if (weeklyState.completed) {
            weeklyStatus.textContent = `completed this week · frost slayer unlocked`;
            weeklyStatus.classList.add("complete");
            weeklyButton.textContent = "completed";
            weeklyButton.disabled = true;
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
            weeklyState = { week: currentWeek, challenge: randomChoice(Object.keys(weeklyOptions)), completed: false };
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
        clearInterval(timerId);
        clearTimeout(pulseId);
        if (activeTile) activeTile.classList.remove("active");
        activeTile = null;
        gameStatus.textContent = message;
        startButton.textContent = won ? "challenge complete" : "try again";
        if (won && !weeklyState.completed) {
            weeklyState.completed = true;
            saveWeekly();
            window.awardCurrency(1000, 500);
            window.unlockItem("Frost Slayer");
            renderWeekly();
        }
    }

    function spawnPulse() {
        if (!running) return;
        const available = tiles.filter(tile => tile !== activeTile);
        activeTile = available[Math.floor(Math.random() * available.length)];
        activeTile.classList.add("active");
        pulseId = setTimeout(() => {
            if (!running || !activeTile) return;
            activeTile.classList.remove("active");
            activeTile = null;
            misses += 1;
            missesLabel.textContent = misses;
            if (misses > currentWeeklyChallenge().maxMisses) {
                finishRun(false, "the sculk caught your trail · try again");
                return;
            }
            pulseId = setTimeout(spawnPulse, 180);
        }, currentWeeklyChallenge().pulseDuration);
    }

    function startRun() {
        if (weeklyState.completed || running) return;
        const challenge = currentWeeklyChallenge();
        score = 0;
        misses = 0;
        seconds = challenge.seconds;
        scoreLabel.textContent = score;
        missesLabel.textContent = misses;
        timeLabel.textContent = seconds;
        gameStatus.textContent = challenge.objective;
        startButton.textContent = "run active";
        running = true;
        spawnPulse();
        timerId = setInterval(() => {
            seconds -= 1;
            timeLabel.textContent = seconds;
            if (seconds <= 0) finishRun(false, "time ran out · try again");
        }, 1000);
    }

    for (let index = 0; index < 12; index += 1) {
        const tile = document.createElement("button");
        tile.type = "button";
        tile.className = "pulse-tile";
        tile.setAttribute("aria-label", `sculk node ${index + 1}`);
        tile.addEventListener("click", () => {
            if (!running) return;
            if (tile === activeTile) {
                clearTimeout(pulseId);
                tile.classList.remove("active");
                activeTile = null;
                score += 1;
                scoreLabel.textContent = score;
                if (score >= currentWeeklyChallenge().goal) {
                    finishRun(true, "weekly challenge cleared · rewards claimed");
                    return;
                }
                pulseId = setTimeout(spawnPulse, 140);
                return;
            }
            misses += 1;
            missesLabel.textContent = misses;
            if (misses > currentWeeklyChallenge().maxMisses) finishRun(false, "too many misses · try again");
        });
        tiles.push(tile);
        board.appendChild(tile);
    }

    weeklyButton.addEventListener("click", () => {
        if (weeklyState.completed) return;
        dialog.hidden = false;
        startButton.textContent = "start run";
        gameStatus.textContent = currentWeeklyChallenge().objective;
    });
    weeklyRefreshButton.addEventListener("click", () => {
        if (!weeklyState.completed) return;
        if (!window.spendCurrency(0, 3000)) {
            weeklyStatus.textContent = `need ${3000 - (Number(document.getElementById("mpBalance").textContent) || 0)} more mp to refresh`;
            renderWeekly();
            return;
        }
        const choices = Object.keys(weeklyOptions).filter(id => id !== weeklyState.challenge);
        weeklyState.challenge = randomChoice(choices);
        weeklyState.completed = false;
        saveWeekly();
        gameStatus.textContent = "new weekly challenge · give it a shot";
        startButton.textContent = "start run";
        renderWeekly();
    });
    startButton.addEventListener("click", startRun);
    document.getElementById("closeWeeklyGame").addEventListener("click", () => {
        if (running) finishRun(false, "run abandoned · try again");
        dialog.hidden = true;
    });
    dialog.addEventListener("click", event => {
        if (event.target === dialog) {
            if (running) finishRun(false, "run abandoned · try again");
            dialog.hidden = true;
        }
    });
    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && !dialog.hidden) {
            if (running) finishRun(false, "run abandoned · try again");
            dialog.hidden = true;
        }
    });

    saveWeekly();
    renderWeekly();
    updateAll();
    refreshQuestPeriods();
    window.setInterval(refreshQuestPeriods, 30000);
    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) refreshQuestPeriods();
    });
})();
