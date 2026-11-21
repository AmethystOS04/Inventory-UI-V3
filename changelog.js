(() => {
    const dataUrl = new URL("changelog.json", document.currentScript.src);
    const overlay = document.getElementById("starterOverlay");
    if (!overlay) return;

    function makeElement(tag, className, text) {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (text !== undefined) element.textContent = text;
        return element;
    }

    async function loadChangelog() {
        try {
            const response = await fetch(dataUrl);
            if (!response.ok) throw new Error(`Changelog request failed: ${response.status}`);
            const data = await response.json();
            if (!Array.isArray(data.versions) || !data.versions.length) return;

            const panel = makeElement("aside", "changelog-panel");
            panel.setAttribute("aria-label", "Version changelog");

            const heading = makeElement("h2", "changelog-heading", "What's new");
            panel.appendChild(heading);

            const scrollArea = makeElement("div", "changelog-scroll");
            scrollArea.tabIndex = 0;
            scrollArea.setAttribute("aria-label", "Previous version updates");

            data.versions.forEach((entry, index) => {
                const versionCard = makeElement("section", "changelog-version");
                const versionHeading = makeElement("h3", "changelog-version-title", `v${entry.version || "Unknown"}`);
                if (index === 0) versionHeading.appendChild(makeElement("span", "changelog-latest", "latest"));
                versionCard.appendChild(versionHeading);

                if (entry.title) versionCard.appendChild(makeElement("p", "changelog-version-subtitle", entry.title));

                if (Array.isArray(entry.changes) && entry.changes.length) {
                    const list = makeElement("ul", "changelog-list");
                    entry.changes.forEach(change => list.appendChild(makeElement("li", "", String(change))));
                    versionCard.appendChild(list);
                }

                scrollArea.appendChild(versionCard);
            });

            panel.appendChild(scrollArea);
            overlay.appendChild(panel);
        } catch (error) {
            console.warn("Could not load the changelog", error);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", loadChangelog, { once: true });
    } else {
        loadChangelog();
    }
})();
