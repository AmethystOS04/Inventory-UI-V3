(() => {
    const actionProgressKey = "badgeActionProgressV1";
    const localEditor = ["localhost", "127.0.0.1", "::1"].includes(location.hostname);
    window.trackInventoryEditorBadgeAction = (actionKey, amount = 1) => {
        if (!localEditor) return;
        const key = String(actionKey || "").trim().toLowerCase();
        if (!key) return;
        let progress = {};
        try {
            const saved = JSON.parse(localStorage.getItem(actionProgressKey) || "{}");
            if (saved && typeof saved === "object" && !Array.isArray(saved)) progress = saved;
        } catch {}
        progress[key] = (Number(progress[key]) || 0) + Math.max(0, Number(amount) || 0);
        localStorage.setItem(actionProgressKey, JSON.stringify(progress));
        window.dispatchEvent(new CustomEvent("inventory-editor-badge-action", { detail: { key, amount } }));
    };
})();
