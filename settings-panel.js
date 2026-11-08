(() => {
    const panel = document.querySelector('.portal-panel');
    if (!panel || document.getElementById('openSettingsPanel')) return;

    const keys = {
        animations: 'inventoryUnlockAnimationsEnabledV1',
        compact: 'inventoryCompactItemsV1',
        reducedMotion: 'inventoryReducedMotionV1',
        fullNames: 'inventoryBalanceFullNamesV1',
        itemSort: 'inventoryItemSortModeV1',
        badgeView: 'inventoryBadgeViewModeV1'
    };

    const button = document.createElement('button');
    button.id = 'openSettingsPanel';
    button.type = 'button';
    button.textContent = 'settings';
    panel.append(button);

    const wikiButton = document.createElement('a');
    wikiButton.id = 'openInventoryWiki';
    wikiButton.href = 'wiki.html';
    wikiButton.target = '_blank';
    wikiButton.rel = 'noopener';
    wikiButton.textContent = 'wiki';
    wikiButton.title = 'open the inventory wiki';
    button.after(wikiButton);

    const dialog = document.createElement('dialog');
    dialog.id = 'inventorySettingsDialog';
    dialog.setAttribute('aria-labelledby', 'inventorySettingsTitle');
    dialog.innerHTML = `
        <div class="settings-heading"><h2 id="inventorySettingsTitle">settings</h2><button type="button" data-close-settings>close</button></div>
        <p>adjust how the inventory looks, moves, and remembers your choices</p>
        <label><input type="checkbox" data-setting="animations"><span><strong>unlock animations</strong><small>show or skip item and badge unlock effects</small></span></label>
        <label><input type="checkbox" data-setting="compact"><span><strong>compact item tiles</strong><small>fit more items in the item list</small></span></label>
        <label><input type="checkbox" data-setting="reducedMotion"><span><strong>reduce motion effects</strong><small>shorten animations and transitions across the page</small></span></label>
        <label><input type="checkbox" data-setting="fullNames"><span><strong>show full balance names</strong><small>use names like thousand instead of k</small></span></label>
        <label class="settings-choice"><span><strong>remember item filter</strong><small>keep this filter after you reload</small></span><select id="settingsItemSort" aria-label="remembered item filter"><option value="all">normal order</option><option value="rarity">rarity, a to z</option><option value="unlocked">unlocked</option><option value="locked">locked</option><option value="seasonal">seasonal</option><option value="regular">normal items</option></select></label>
        <label class="settings-choice"><span><strong>badge layout</strong><small>choose the default badge list style</small></span><select id="settingsBadgeView" aria-label="badge panel layout"><option value="grid">grid</option><option value="list">list</option></select></label>
        <label class="settings-choice"><span><strong>music volume</strong><small>adjust the inventory music</small></span><input id="settingsMusicVolume" type="range" min="0" max="100" value="50"><output id="settingsMusicVolumeValue">50%</output></label>`;
    document.body.append(dialog);

    const style = document.createElement('style');
    style.textContent = `
        #openSettingsPanel,#openInventoryWiki,#inventorySettingsDialog button{display:inline-block;border:1px solid var(--reality-border,#00f7ff);border-radius:8px;padding:8px 11px;color:var(--reality-accent-2,#70eaff);background:var(--reality-panel,#15121d);font:inherit;cursor:pointer;text-decoration:none}
        #inventorySettingsDialog{width:min(480px,92vw);max-height:86vh;overflow:auto;padding:18px;border:1px solid var(--reality-border,#00f7ff);border-radius:14px;color:var(--reality-text,#fff);background:var(--reality-panel,#080c13);box-shadow:0 0 28px color-mix(in srgb,var(--reality-border,#00f7ff) 32%,transparent)}
        #inventorySettingsDialog::backdrop{background:rgba(2,4,12,.78);backdrop-filter:blur(4px)}
        #inventorySettingsDialog .settings-heading{display:flex;align-items:center;justify-content:space-between;gap:12px}
        #inventorySettingsDialog h2{margin:0;color:var(--reality-accent,#ff00ff);text-transform:lowercase}
        #inventorySettingsDialog p{color:var(--reality-muted,#aaa);font-size:13px}
        #inventorySettingsDialog label{display:flex;align-items:center;gap:10px;margin:9px 0;padding:10px;border:1px solid color-mix(in srgb,var(--reality-border,#00f7ff) 24%,transparent);border-radius:9px;cursor:pointer}
        #inventorySettingsDialog label span{display:grid;gap:3px;flex:1}
        #inventorySettingsDialog label small{color:var(--reality-muted,#aaa);font-size:11px}
        #inventorySettingsDialog input[type=checkbox]{width:17px;height:17px;accent-color:var(--reality-accent,#ff00ff)}
        #inventorySettingsDialog .settings-choice select{max-width:185px;padding:7px;border:1px solid #49385b;border-radius:7px;color:inherit;background:#0d0a13}
        #inventorySettingsDialog input[type=range]{max-width:150px;accent-color:var(--reality-accent,#ff00ff)}
        #inventorySettingsDialog output{min-width:38px;color:var(--reality-accent-2,#70eaff);text-align:right}
        .inventory-compact-items .items{grid-template-columns:repeat(5,56px)!important;gap:7px!important}
        .inventory-compact-items .item{width:56px;height:56px}
        .inventory-reduced-motion *, .inventory-reduced-motion *::before, .inventory-reduced-motion *::after{scroll-behavior:auto!important;animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}
        @media(max-width:620px){.inventory-compact-items .items{grid-template-columns:repeat(5,minmax(0,1fr))!important}.inventory-compact-items .item{width:100%;height:auto;aspect-ratio:1}#inventorySettingsDialog .settings-choice{flex-wrap:wrap}#inventorySettingsDialog .settings-choice select{max-width:none;width:100%}}`;
    document.head.append(style);

    const checkboxes = Object.fromEntries(Array.from(dialog.querySelectorAll('[data-setting]'), input => [input.dataset.setting, input]));
    const itemSort = dialog.querySelector('#settingsItemSort');
    const badgeView = dialog.querySelector('#settingsBadgeView');
    const musicVolume = dialog.querySelector('#settingsMusicVolume');
    const musicVolumeValue = dialog.querySelector('#settingsMusicVolumeValue');
    function apply() {
        document.body.classList.toggle('inventory-compact-items', checkboxes.compact.checked);
        document.body.classList.toggle('inventory-reduced-motion', checkboxes.reducedMotion.checked);
        document.querySelector('.balance-container')?.classList.toggle('balance-full-names', checkboxes.fullNames.checked);
        window.refreshInventoryBalances?.();
    }

    checkboxes.animations.checked = localStorage.getItem(keys.animations) !== 'false';
    checkboxes.compact.checked = localStorage.getItem(keys.compact) === 'true';
    checkboxes.reducedMotion.checked = localStorage.getItem(keys.reducedMotion) === 'true';
    checkboxes.fullNames.checked = localStorage.getItem(keys.fullNames) === 'true';
    itemSort.value = localStorage.getItem(keys.itemSort) || document.getElementById('itemSort')?.value || 'all';
    badgeView.value = localStorage.getItem(keys.badgeView) === 'list' ? 'list' : 'grid';
    const existingVolume = document.getElementById('volumeSlider');
    musicVolume.value = existingVolume?.value || localStorage.getItem('inventoryMusicVolumeV1') || '50';
    musicVolumeValue.value = `${musicVolume.value}%`;
    apply();

    for (const [name, input] of Object.entries(checkboxes)) {
        input.addEventListener('change', () => {
            localStorage.setItem(keys[name], String(input.checked));
            apply();
        });
    }
    itemSort.addEventListener('change', () => {
        localStorage.setItem(keys.itemSort, itemSort.value);
        const pageSort = document.getElementById('itemSort');
        if (pageSort) {
            pageSort.value = itemSort.value;
            pageSort.dispatchEvent(new Event('change', { bubbles: true }));
        }
    });
    badgeView.addEventListener('change', () => {
        localStorage.setItem(keys.badgeView, badgeView.value);
        window.dispatchEvent(new Event('inventory-badge-view-setting-changed'));
    });
    musicVolume.addEventListener('input', () => {
        musicVolumeValue.value = `${musicVolume.value}%`;
        if (!existingVolume) return;
        existingVolume.value = musicVolume.value;
        existingVolume.dispatchEvent(new Event('input', { bubbles: true }));
    });
    button.addEventListener('click', () => dialog.showModal());
    dialog.querySelector('[data-close-settings]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
        if (event.target === dialog) dialog.close();
    });
})();
