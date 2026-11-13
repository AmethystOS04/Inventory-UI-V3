(() => {
    const panel = document.querySelector(".portal-panel");
    if (!panel || !window.InventorySaveFormat) return;

    const style = document.createElement("style");
    style.textContent = `
        #openSaveDataPanel, #closeSaveDataPanel, #exportPlayerSave, #importPlayerSaveLabel, #resetPlayerSave {
            display:inline-flex; align-items:center; justify-content:center; gap:6px;
            border:1px solid color-mix(in srgb, var(--reality-border, #00f7ff) 65%, transparent);
            border-radius:9px; padding:8px 12px; background:color-mix(in srgb, var(--reality-panel, #1a1a24) 82%, #000 18%);
            color:var(--reality-text, #fff); font:inherit; text-decoration:none; cursor:pointer;
        }
        #openSaveDataPanel { position:absolute; top:12px; right:202px; z-index:3; color:var(--reality-accent-2, #70eaff); }
        #saveDataDialog { width:min(500px,calc(100vw - 40px)); border:1px solid var(--reality-border,#00f7ff); border-radius:16px; padding:18px; background:var(--reality-panel,#12121c); color:var(--reality-text,#fff); box-shadow:0 0 24px color-mix(in srgb,var(--reality-border,#00f7ff) 35%,transparent); }
        #saveDataDialog[open] { animation:collectionMapUnfold 420ms cubic-bezier(.2,.85,.25,1) both; }
        #saveDataDialog::backdrop { background:rgba(3,4,12,.78); backdrop-filter:blur(3px); }
        #saveDataDialog h2 { margin:0; color:var(--reality-accent,#ff00ff); }
        #saveDataDialog p { color:var(--reality-muted,#aaa); font-size:13px; }
        .save-data-actions { display:flex; flex-wrap:wrap; gap:8px; }
        .save-export-note { margin:14px 0 8px; padding:12px; border:1px solid color-mix(in srgb,var(--reality-accent,#ff00ff) 45%,transparent); border-radius:10px; background:color-mix(in srgb,var(--reality-accent,#ff00ff) 9%,transparent); color:var(--reality-text,#fff) !important; text-align:center; }
        .save-export-actions { display:flex; justify-content:center; }
        #importPlayerSaveInput { display:none; }
        #resetPlayerSave {
            border:1px solid #ff557d;
            border-radius:9px;
            padding:8px 12px;
            background:rgba(120,18,48,.28);
            color:#ff9ab2;
            font:inherit;
            cursor:pointer;
        }
        #resetPlayerSave:hover { background:rgba(160,24,62,.42); }
        #resetPlayerSave:focus-visible { outline:2px solid #ff9ab2; outline-offset:3px; }
        #saveDataStatus { min-height:20px; color:var(--reality-accent-2,#70eaff); }
        @media(max-width:600px) { #openSaveDataPanel { right:194px; } }
    `;
    document.head.appendChild(style);

    const openButton = document.createElement("button");
    openButton.id = "openSaveDataPanel";
    openButton.type = "button";
    openButton.textContent = "save data";
    panel.appendChild(openButton);

    const dialog = document.createElement("dialog");
    dialog.id = "saveDataDialog";
    dialog.innerHTML = `
        <div class="collection-dialog-heading"><h2>player save</h2><button id="closeSaveDataPanel" type="button">close</button></div>
        <p>export your save to share it, or import an edited save file</p>
        <div class="save-data-actions">
            <label id="importPlayerSaveLabel" for="importPlayerSaveInput">import save</label>
            <input id="importPlayerSaveInput" type="file" accept="application/json,.json">
            <button id="resetPlayerSave" type="button">reset save</button>
        </div>
        <p class="save-export-note">if you want your save edited dm amethystos04 on discord OR if uou cant use discord gmail me at amethystos04mc@gmail.com</p>
        <div class="save-export-actions"><button id="exportPlayerSave" type="button">export save</button></div>
        <p id="saveDataStatus" role="status" aria-live="polite"></p>
    `;
    panel.appendChild(dialog);

    openButton.addEventListener("click", () => dialog.showModal());
    document.getElementById("closeSaveDataPanel").addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); });
    document.getElementById("resetPlayerSave").addEventListener("click", () => {
        const confirmation = window.prompt(
            "This will permanently reset all player progress stored in this save. Export a backup first if you may want to restore it later.\n\nType RESET to confirm"
        );

        if (confirmation !== "RESET") {
            document.getElementById("saveDataStatus").textContent = "save reset cancelled";
            return;
        }

        try {
            for (const key of window.InventorySaveFormat.storageKeys) {
                localStorage.removeItem(key);
            }

            document.getElementById("saveDataStatus").textContent = "save reset · reloading the inventory";
            window.setTimeout(() => location.reload(), 500);
        } catch (error) {
            document.getElementById("saveDataStatus").textContent = error.message || "could not reset the save";
        }
    });

    document.getElementById("exportPlayerSave").addEventListener("click", () => {
        const save = window.InventorySaveFormat.capture();
        const link = document.createElement("a");
        link.href = URL.createObjectURL(new Blob([JSON.stringify(save, null, 2)], { type: "application/json" }));
        link.download = "inventory-ui-save.json";
        link.click();
        URL.revokeObjectURL(link.href);
        document.getElementById("saveDataStatus").textContent = "save file downloaded";
    });
    document.getElementById("importPlayerSaveInput").addEventListener("change", async event => {
        const file = event.target.files?.[0];
        if (!file) return;
        const status = document.getElementById("saveDataStatus");
        try {
            const save = window.InventorySaveFormat.normalizeEnvelope(JSON.parse(await file.text()));
            if (!confirm("replace this browser's player save with the imported save?")) return;
            window.InventorySaveFormat.write(save.data);
            status.textContent = "save imported · reloading the inventory";
            window.setTimeout(() => location.reload(), 500);
        } catch (error) {
            status.textContent = error.message || "could not import that save file";
        } finally {
            event.target.value = "";
        }
    });
})();
