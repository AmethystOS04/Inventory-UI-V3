(() => {
    const banner = document.getElementById("nextEventCountdown");
    const nameLabel = document.getElementById("nextEventName");
    const timeLabel = document.getElementById("nextEventTime");
    if (!banner || !nameLabel || !timeLabel) return;

    const localEventsKey = "inventoryEventsV1";
    const useLocalEvents = ["localhost", "127.0.0.1"].includes(location.hostname);

    function readEvents() {
        if (useLocalEvents) {
            try {
                const saved = JSON.parse(localStorage.getItem(localEventsKey));
                if (Array.isArray(saved)) return saved;
            } catch {
                return [];
            }
        }
        return Array.isArray(window.INVENTORY_EVENT_CATALOG) ? window.INVENTORY_EVENT_CATALOG : [];
    }

    function formatCountdown(milliseconds) {
        let seconds = Math.max(0, Math.ceil(milliseconds / 1000));
        const days = Math.floor(seconds / 86400);
        seconds %= 86400;
        const hours = Math.floor(seconds / 3600);
        seconds %= 3600;
        const minutes = Math.floor(seconds / 60);
        seconds %= 60;
        const parts = [];
        if (days) parts.push(`${days}d`);
        if (hours || days) parts.push(`${hours}h`);
        if (minutes || hours || days) parts.push(`${minutes}m`);
        parts.push(`${seconds}s`);
        return parts.join(" ");
    }

    function formatDuration(milliseconds) {
        const totalMinutes = Math.max(0, Math.ceil(milliseconds / 60000));
        const days = Math.floor(totalMinutes / 1440);
        const hours = Math.floor((totalMinutes % 1440) / 60);
        const minutes = totalMinutes % 60;
        return [days && `${days}d`, hours && `${hours}h`, minutes && `${minutes}m`].filter(Boolean).join(" ") || "under a minute";
    }

    function update() {
        const now = Date.now();
        const events = readEvents().map(event => {
            const start = Date.parse(event.start || "");
            const end = Date.parse(event.end || "");
            return {
                name: String(event.name || event.title || "event"),
                start,
                end: Number.isFinite(end) ? end : null
            };
        }).filter(event => Number.isFinite(event.start) && (!event.end || event.end > event.start));

        const active = events
            .filter(event => event.start <= now && (!event.end || event.end > now))
            .sort((left, right) => (left.end || Infinity) - (right.end || Infinity));
        const upcoming = events
            .filter(event => event.start > now)
            .sort((left, right) => left.start - right.start);

        const event = active[0] || upcoming[0];
        if (!event) {
            banner.hidden = true;
            return;
        }

        const duration = event.end ? ` · duration ${formatDuration(event.end - event.start)}` : "";
        nameLabel.textContent = event.start <= now ? `${event.name} is live` : `next event · ${event.name}`;
        timeLabel.textContent = event.start <= now
            ? `${event.end ? `ends in ${formatCountdown(event.end - now)}` : "live now · no end scheduled"}${duration}`
            : `starts in ${formatCountdown(event.start - now)}${duration}`;
        banner.hidden = false;
    }

    update();
    window.setInterval(update, 1000);
    window.addEventListener("storage", event => {
        if (event.key === localEventsKey) update();
    });
})();
