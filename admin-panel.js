(() => {
    if (!['localhost', '127.0.0.1', '::1'].includes(location.hostname)) return;
    if (document.getElementById('inventoryAdminPanel')) return;

    const itemKey = 'ownedItemsV2';
    const badgeCatalogKey = 'inventoryBadgeCatalogV1';
    const privateBadgeCatalogKey = 'inventoryPrivateBadgeCatalogV1';
    const badgeUnlockedKey = 'inventoryBadgesUnlockedV1';
    const badgeLockedKey = 'inventoryAdminLockedBadgesV1';
    const animationsKey = 'inventoryUnlockAnimationsEnabledV1';
    const arenaCooldownKey = 'riftArenaDisableArtifactCooldownV1';
    const badgePeekPenaltyDisabledKey = 'badgePeekPenaltiesDisabledV1';
    const revealSecretBadgeDetailsKey = 'badgeRevealSecretDetailsV1';
    const balanceNamesKey = 'inventoryBalanceFullNamesV1';
    const positionKey = 'inventoryAdminPanelPositionV1';
    const root = document.createElement('aside');
    root.id = 'inventoryAdminPanel';
    root.innerHTML = `
        <header class="iap-head"><strong>local admin</strong><button class="iap-collapse" type="button" aria-label="collapse admin panel">−</button></header>
        <div class="iap-body">
            <section><h3>balances</h3><div class="iap-balance"><label for="iapAp">ap</label><input id="iapAp" type="text" inputmode="decimal" placeholder="amount"><button type="button" data-set-balance="ap">set</button></div><div class="iap-balance"><label for="iapMp">mp</label><input id="iapMp" type="text" inputmode="decimal" placeholder="amount"><button type="button" data-set-balance="mp">set</button></div><div class="iap-balance"><label for="iapStardust">dust</label><input id="iapStardust" type="text" inputmode="decimal" placeholder="amount"><button type="button" data-set-balance="stardust">set</button></div></section>
            <section><h3>items</h3><select id="iapItem" aria-label="choose item"><option value="">loading items</option></select><div class="iap-actions"><button type="button" data-item-action="give">give item</button><button type="button" data-item-action="lock">lock item</button></div><button class="iap-wide" type="button" data-item-action="give-all">give all items</button><details id="iapMultiItemDropdown"><summary>choose multiple items</summary><input id="iapMultiItemSearch" type="search" placeholder="search items" aria-label="search items"><div id="iapMultiItemOptions" role="group" aria-label="items to select"></div></details><div class="iap-actions"><button type="button" data-item-action="give-selected">give items</button><button type="button" data-item-action="lock-selected">lock items</button></div><button class="iap-wide" type="button" data-item-action="lock-all">lock all items</button></section>
            <section><h3>badges</h3><select id="iapBadge" aria-label="choose badge"><option value="">choose badge</option></select><div class="iap-actions"><button type="button" data-badge-action="give">give badge</button><button type="button" data-badge-action="lock">lock badge</button></div><div class="iap-actions"><button type="button" data-badge-action="normal">give all normal</button><button type="button" data-badge-action="secret">give all secret</button></div><button class="iap-wide" type="button" data-badge-action="all">give all badges</button><button class="iap-wide" type="button" data-badge-action="lock-all">lock all badges</button></section>
            <section><label class="iap-toggle"><input id="iapAnimations" type="checkbox"><span>unlock animations</span></label></section>
            <section><label class="iap-toggle"><input id="iapDisableCooldown" type="checkbox"><span>disable artifact cooldowns</span></label></section>
            <section><label class="iap-toggle"><input id="iapDisableBadgePeekPenalties" type="checkbox"><span>disable badge peek penalties · peeks are free</span></label></section>
            <section><label class="iap-toggle"><input id="iapRevealSecretBadgeDetails" type="checkbox"><span>show secret badge descriptions and unlock methods</span></label></section>
            <section><button class="iap-wide" type="button" data-balance-names></button></section>
            <section><button class="iap-wide" type="button" data-refresh-tab>refresh current tab</button></section>
            <p class="iap-status" role="status" aria-live="polite"></p>
        </div>`;
    const style = document.createElement('style');
    style.textContent = `
        #inventoryAdminPanel{position:fixed;z-index:2147483000;top:18px;right:18px;width:min(340px,calc(100vw - 24px));max-height:78vh;overflow:hidden;color:#f4eaff;background:#100918;border:1px solid #dc00d7;border-radius:12px;box-shadow:0 0 22px #d000d766;font:13px system-ui,sans-serif}
        #inventoryAdminPanel *{box-sizing:border-box}
        #inventoryAdminPanel .iap-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 12px;background:linear-gradient(100deg,#45105b,#180c27);color:#ff6be8;cursor:move;touch-action:none;user-select:none}
        #inventoryAdminPanel .iap-head strong{font-size:14px;text-transform:lowercase}
        #inventoryAdminPanel button,#inventoryAdminPanel input,#inventoryAdminPanel select{font:inherit;color:inherit}
        #inventoryAdminPanel button{border:1px solid #a718a6;background:#30133b;border-radius:7px;padding:6px 9px;cursor:pointer}
        #inventoryAdminPanel button:hover{border-color:#00d9f2;box-shadow:0 0 9px #00d9f244}
        #inventoryAdminPanel .iap-collapse{width:28px;height:26px;padding:0;font-size:18px;line-height:1}
        #inventoryAdminPanel .iap-body{max-height:calc(78vh - 48px);overflow:auto;padding:10px;display:grid;gap:10px}
        #inventoryAdminPanel section{padding:9px;border:1px solid #47274f;border-radius:8px;background:#160f20}
        #inventoryAdminPanel h3{margin:0 0 7px;color:#79f4ff;font-size:12px;font-weight:700;text-transform:lowercase}
        #inventoryAdminPanel input,#inventoryAdminPanel select{min-width:0;width:100%;padding:7px;border:1px solid #483451;border-radius:6px;background:#0d0a13}
        #inventoryAdminPanel .iap-balance{display:grid;grid-template-columns:25px minmax(0,1fr) auto;align-items:center;gap:6px;margin-top:6px}
        #inventoryAdminPanel .iap-balance label{color:#e8b4ff}
        #inventoryAdminPanel .iap-actions{display:flex;gap:6px;margin-top:7px}
        #inventoryAdminPanel .iap-actions button{flex:1}
        #inventoryAdminPanel #iapMultiItemDropdown{position:relative;margin-top:8px}
        #inventoryAdminPanel #iapMultiItemDropdown summary{padding:8px;border:1px solid #483451;border-radius:6px;background:#0d0a13;color:#e8b4ff;cursor:pointer;list-style-position:inside}
        #inventoryAdminPanel #iapMultiItemDropdown[open] #iapMultiItemOptions{max-height:180px;overflow:auto;margin-top:5px;padding:5px;border:1px solid #483451;border-radius:6px;background:#0d0a13}
        #inventoryAdminPanel .iap-item-choice{display:flex;align-items:center;gap:7px;padding:4px;color:#e8d9f4;cursor:pointer}
        #inventoryAdminPanel .iap-item-choice input{width:15px;height:15px;accent-color:#ed19dd}
        #inventoryAdminPanel .iap-item-choice[hidden]{display:none}
        #inventoryAdminPanel .iap-wide{width:100%;margin-top:7px}
        #inventoryAdminPanel .iap-toggle{display:flex;align-items:center;gap:8px;color:#d9cce4;cursor:pointer}
        #inventoryAdminPanel .iap-toggle input{width:16px;height:16px;accent-color:#ed19dd}
        #inventoryAdminPanel .iap-status{min-height:16px;margin:0;color:#65f4d4;font-size:11px;overflow-wrap:anywhere}
        #inventoryAdminPanel.iap-collapsed{width:auto;max-height:none}
        #inventoryAdminPanel.iap-collapsed .iap-body{display:none}
        @media(max-width:520px){#inventoryAdminPanel{top:auto;right:8px;bottom:8px;width:min(320px,calc(100vw - 16px));max-height:72vh}#inventoryAdminPanel .iap-body{max-height:calc(72vh - 48px)}}`;
    document.head.append(style);
    document.body.append(root);

    const status = root.querySelector('.iap-status');
    const itemSelect = root.querySelector('#iapItem');
    const multipleItemOptions = root.querySelector('#iapMultiItemOptions');
    const badgeSelect = root.querySelector('#iapBadge');
    let allItemNames = [];
    const say = message => { status.textContent = message; };
    const multiItemSummary = root.querySelector('#iapMultiItemDropdown summary');
    function updateMultiItemSummary() {
        const count = multipleItemOptions.querySelectorAll('input:checked').length;
        multiItemSummary.textContent = count ? `${count} items selected` : 'choose multiple items';
    }
    root.querySelector('#iapMultiItemSearch').addEventListener('input', event => {
        const query = event.target.value.trim().toLowerCase();
        multipleItemOptions.querySelectorAll('.iap-item-choice').forEach(label => {
            label.hidden = query !== '' && !label.textContent.toLowerCase().includes(query);
        });
    });
    multipleItemOptions.addEventListener('change', updateMultiItemSummary);
    const parseAmount = input => {
        const value = String(input || '').trim().replaceAll(',', '').toLowerCase();
        const match = value.match(/^([+]?(?:\d+\.?\d*|\.\d+))(e[+-]?\d+|k|m|b|t|qa|qi|sx|sp|oc|no|dc)?$/);
        if (!match) return NaN;
        const base = Number(match[1]);
        const suffix = match[2] || '';
        if (suffix.startsWith('e')) return Number(`${match[1]}${suffix}`);
        const powers = { k: 1, m: 2, b: 3, t: 4, qa: 5, qi: 6, sx: 7, sp: 8, oc: 9, no: 10, dc: 11 };
        return base * 1000 ** (powers[suffix] || 0);
    };
    const readArray = key => {
        try { const value = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(value) ? value : []; }
        catch { return []; }
    };

    function setBalance(key) {
        const input = root.querySelector(key === 'ap' ? '#iapAp' : key === 'mp' ? '#iapMp' : '#iapStardust');
        const normalized = String(input.value || '').trim();
        if (/^infinity$/i.test(normalized)) {
            if (typeof window.setInventoryBalance !== 'function') { say('infinity balances need the main inventory page'); return; }
            window.setInventoryBalance(key, 'infinity');
            input.value = '';
            say(`${key} balance set to infinity`);
            return;
        }
        const treeMatch = normalized.match(/^tree\(\s*(\d+)\s*\)$/i);
        if (treeMatch) {
            const index = BigInt(treeMatch[1]);
            if (typeof window.setInventoryBalance !== 'function') { say('tree balances need the main inventory page'); return; }
            window.setInventoryBalance(key, `tree(${index})`);
            input.value = '';
            say(`${key} balance set to tree(${index})`);
            return;
        }
        const amount = parseAmount(input.value);
        if (!Number.isFinite(amount)) { say(`enter a valid ${key} amount`); return; }
        if (typeof window.setInventoryBalance === 'function') window.setInventoryBalance(key, amount);
        else localStorage.setItem(key, String(amount));
        input.value = '';
        say(`${key} balance set`);
    }

    function writeItems(items) {
        localStorage.setItem(itemKey, JSON.stringify(Array.from(new Set(items))));
        window.refreshUnlockCards?.();
        window.dispatchEvent(new CustomEvent('inventory-admin-updated', { detail: { key: itemKey } }));
    }

    function itemAction(action) {
        if (action === 'lock-all') {
            const owned = readArray(itemKey);
            if (typeof window.lockAllItems === 'function') window.lockAllItems();
            else writeItems([]);
            say(`${owned.length} items locked`);
            return;
        }
        const names = action === 'give-all' ? allItemNames : action.endsWith('-selected') ? Array.from(multipleItemOptions.querySelectorAll('input:checked'), input => input.value) : [itemSelect.value].filter(Boolean);
        if (!names.length) { say(action.endsWith('-selected') ? 'choose one or more items first' : 'item list is empty'); return; }
        let owned = readArray(itemKey);
        let changed = 0;
        for (const name of names) {
            const existing = owned.find(item => String(item).toLowerCase() === name.toLowerCase());
            if (action === 'give' || action === 'give-all' || action === 'give-selected') {
                if (existing) continue;
                if (typeof window.unlockItem === 'function') window.unlockItem(name);
                else { owned = [...owned, name]; writeItems(owned); }
                if (typeof window.markEventItemUnlocked === 'function') window.markEventItemUnlocked(name);
                changed += 1;
            } else {
                if (!existing) continue;
                if (typeof window.lockItem === 'function') window.lockItem(existing);
                else { owned = owned.filter(item => item !== existing); writeItems(owned); }
                changed += 1;
            }
        }
        const giving = action === 'give' || action === 'give-all' || action === 'give-selected';
        say(`${changed} item${changed === 1 ? '' : 's'} ${giving ? 'unlocked' : 'locked'}`);
    }

    function badgeCatalog() {
        const saved = readArray(badgeCatalogKey);
        const published = saved.length ? saved : (Array.isArray(window.INVENTORY_BADGE_CATALOG) ? window.INVENTORY_BADGE_CATALOG : []);
        return [...published, ...readArray(privateBadgeCatalogKey)];
    }

    function refreshBadgeChoices() {
        const current = badgeSelect.value;
        badgeSelect.replaceChildren(new Option('choose badge', ''));
        badgeCatalog().slice().sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''))).forEach(badge => {
            if (!badge?.id) return;
            badgeSelect.add(new Option(`${badge.name || badge.id}${badge.collection === 'amethyst' ? " · amethyst's badges" : badge.visibility === 'secret' || badge.secret ? ' · secret' : ''}`, badge.id));
        });
        if (Array.from(badgeSelect.options).some(option => option.value === current)) badgeSelect.value = current;
    }

    function giveBadges(group) {
        const catalog = badgeCatalog().filter(badge => badge?.id);
        const ids = catalog.filter(badge => group === 'all' || (group === 'secret' ? badge.visibility === 'secret' || badge.secret === true : badge.visibility !== 'secret' && badge.secret !== true)).map(badge => badge.id);
        if (typeof window.grantInventoryBadges === 'function') window.grantInventoryBadges(ids);
        else {
            const unlocked = new Set(readArray(badgeUnlockedKey));
            const locked = new Set(readArray(badgeLockedKey));
            ids.forEach(id => unlocked.add(id));
            ids.forEach(id => locked.delete(id));
            localStorage.setItem(badgeLockedKey, JSON.stringify(Array.from(locked)));
            localStorage.setItem(badgeUnlockedKey, JSON.stringify(Array.from(unlocked)));
        }
        say(`${ids.length} ${group === 'all' ? '' : `${group} `}badge${ids.length === 1 ? '' : 's'} unlocked`);
    }

    function lockBadges(group) {
        const catalog = badgeCatalog().filter(badge => badge?.id);
        const ids = group === 'all' ? catalog.map(badge => badge.id) : [badgeSelect.value].filter(Boolean);
        if (!ids.length) { say('choose a badge first'); return; }
        if (typeof window.lockInventoryBadges === 'function') window.lockInventoryBadges(ids);
        else {
            const unlocked = new Set(readArray(badgeUnlockedKey));
            const locked = new Set(readArray(badgeLockedKey));
            ids.forEach(id => unlocked.delete(id));
            ids.forEach(id => locked.add(id));
            localStorage.setItem(badgeLockedKey, JSON.stringify(Array.from(locked)));
            localStorage.setItem(badgeUnlockedKey, JSON.stringify(Array.from(unlocked)));
        }
        say(`${ids.length} badge${ids.length === 1 ? '' : 's'} locked`);
    }

    root.addEventListener('click', event => {
        const balanceButton = event.target.closest('[data-set-balance]');
        const itemButton = event.target.closest('[data-item-action]');
        const badgeButton = event.target.closest('[data-badge-action]');
        const refreshButton = event.target.closest('[data-refresh-tab]');
        if (balanceButton) setBalance(balanceButton.dataset.setBalance);
        if (itemButton) itemAction(itemButton.dataset.itemAction);
        if (badgeButton) {
            const action = badgeButton.dataset.badgeAction;
            if (action === 'give') {
                const id = badgeSelect.value;
                if (!id) { say('choose a badge first'); return; }
                if (typeof window.grantInventoryBadges === 'function') window.grantInventoryBadges([id]);
                else {
                    const unlocked = new Set(readArray(badgeUnlockedKey));
                    const locked = new Set(readArray(badgeLockedKey));
                    unlocked.add(id);
                    locked.delete(id);
                    localStorage.setItem(badgeLockedKey, JSON.stringify(Array.from(locked)));
                    localStorage.setItem(badgeUnlockedKey, JSON.stringify(Array.from(unlocked)));
                }
                say('badge unlocked');
            } else if (action === 'lock') lockBadges('selected');
            else if (action === 'lock-all') lockBadges('all');
            else giveBadges(action);
        }
        if (refreshButton) location.reload();
        if (event.target.id === 'iapAnimations') {
            localStorage.setItem(animationsKey, String(event.target.checked));
            say(`unlock animations ${event.target.checked ? 'enabled' : 'disabled'}`);
        }
        if (event.target.closest('[data-balance-names]')) {
            const showFullNames = localStorage.getItem(balanceNamesKey) !== 'true';
            localStorage.setItem(balanceNamesKey, String(showFullNames));
            setBalanceNameButton();
            document.querySelector('.balance-container')?.classList.toggle('balance-full-names', showFullNames);
            window.refreshInventoryBalances?.();
            say(`balance names ${showFullNames ? 'expanded' : 'shortened'}`);
        }
    });

    root.querySelector('.iap-collapse').addEventListener('click', () => {
        root.classList.toggle('iap-collapsed');
        root.querySelector('.iap-collapse').textContent = root.classList.contains('iap-collapsed') ? '+' : '−';
    });

    const head = root.querySelector('.iap-head');
    let drag = null;
    head.addEventListener('pointerdown', event => {
        if (event.target.closest('button')) return;
        const rect = root.getBoundingClientRect();
        drag = { pointerId: event.pointerId, offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top };
        head.setPointerCapture(event.pointerId);
        root.style.left = `${rect.left}px`;
        root.style.top = `${rect.top}px`;
        root.style.right = 'auto';
        root.style.bottom = 'auto';
    });
    head.addEventListener('pointermove', event => {
        if (!drag || drag.pointerId !== event.pointerId) return;
        const x = Math.max(0, Math.min(innerWidth - root.offsetWidth, event.clientX - drag.offsetX));
        const y = Math.max(0, Math.min(innerHeight - root.offsetHeight, event.clientY - drag.offsetY));
        root.style.left = `${x}px`;
        root.style.top = `${y}px`;
    });
    head.addEventListener('pointerup', event => {
        if (!drag || drag.pointerId !== event.pointerId) return;
        drag = null;
        localStorage.setItem(positionKey, JSON.stringify({ left: root.style.left, top: root.style.top }));
    });

    try {
        const position = JSON.parse(localStorage.getItem(positionKey) || 'null');
        if (position && Number.isFinite(parseFloat(position.left)) && Number.isFinite(parseFloat(position.top))) {
            root.style.left = `${Math.min(innerWidth - 80, Math.max(0, parseFloat(position.left)))}px`;
            root.style.top = `${Math.min(innerHeight - 48, Math.max(0, parseFloat(position.top)))}px`;
            root.style.right = 'auto';
        }
    } catch {}

    async function loadItems() {
        const names = new Set(Array.from(document.querySelectorAll('.items .item')).map(card => card.dataset.itemName).filter(Boolean));
        try {
            const [pageResponse, csvResponse] = await Promise.all([fetch('inv%20v3.html', { cache: 'no-store' }), fetch('items.csv', { cache: 'no-store' })]);
            if (pageResponse.ok) {
                const doc = new DOMParser().parseFromString(await pageResponse.text(), 'text/html');
                doc.querySelectorAll('.items .item').forEach(card => {
                    const call = card.getAttribute('onclick') || '';
                    const match = call.match(/showItem\(\s*'((?:\\.|[^'\\])*)'/);
                    if (match) names.add(match[1].replace(/\\'/g, "'").replace(/\\\\/g, '\\'));
                });
            }
            if (csvResponse.ok) {
                const lines = (await csvResponse.text()).split(/\r?\n/).slice(1);
                lines.forEach(line => {
                    const match = line.match(/^\s*(?:"((?:[^"]|"")*)"|([^,]*))/);
                    const name = (match?.[1] ?? match?.[2] ?? '').replaceAll('""', '"').trim();
                    if (name) names.add(name);
                });
            }
        } catch {}
        itemSelect.replaceChildren(new Option('choose item', ''));
        allItemNames = Array.from(names).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
        allItemNames.forEach(name => itemSelect.add(new Option(name, name)));
        multipleItemOptions.replaceChildren(...allItemNames.map(name => {
            const label = document.createElement('label');
            label.className = 'iap-item-choice';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = name;
            const text = document.createElement('span');
            text.textContent = name;
            label.append(checkbox, text);
            return label;
        }));
        root.querySelector('#iapMultiItemSearch').value = '';
        updateMultiItemSummary();
    }

    const savedAp = localStorage.getItem('ap');
    const savedMp = localStorage.getItem('mp');
    if (savedAp !== null) root.querySelector('#iapAp').placeholder = window.formatInventoryBalance?.(Number(savedAp), 'ap') || savedAp;
    if (savedMp !== null) root.querySelector('#iapMp').placeholder = window.formatInventoryBalance?.(Number(savedMp), 'mp') || savedMp;
    refreshBadgeChoices();
    const animationsToggle = root.querySelector('#iapAnimations');
    const cooldownToggle = root.querySelector('#iapDisableCooldown');
    const badgePeekPenaltyToggle = root.querySelector('#iapDisableBadgePeekPenalties');
    const revealSecretBadgeDetailsToggle = root.querySelector('#iapRevealSecretBadgeDetails');
    const balanceNameButton = root.querySelector('[data-balance-names]');
    function setBalanceNameButton() {
        const showFullNames = localStorage.getItem(balanceNamesKey) === 'true';
        balanceNameButton.textContent = `balance names: ${showFullNames ? 'full' : 'short'}`;
        document.querySelector('.balance-container')?.classList.toggle('balance-full-names', showFullNames);
    }
    animationsToggle.checked = localStorage.getItem(animationsKey) !== 'false';
    cooldownToggle.checked = localStorage.getItem(arenaCooldownKey) === 'true';
    badgePeekPenaltyToggle.checked = localStorage.getItem(badgePeekPenaltyDisabledKey) === 'true';
    revealSecretBadgeDetailsToggle.checked = localStorage.getItem(revealSecretBadgeDetailsKey) === 'true';
    cooldownToggle.addEventListener('change', () => {
        localStorage.setItem(arenaCooldownKey, String(cooldownToggle.checked));
        window.dispatchEvent(new Event('inventory-arena-cooldown-setting-changed'));
        say(`artifact cooldowns ${cooldownToggle.checked ? 'disabled' : 'enabled'}`);
    });
    badgePeekPenaltyToggle.addEventListener('change', () => {
        localStorage.setItem(badgePeekPenaltyDisabledKey, String(badgePeekPenaltyToggle.checked));
        window.dispatchEvent(new Event('inventory-badge-peek-settings-changed'));
        say(`badge peek penalties ${badgePeekPenaltyToggle.checked ? 'disabled · peeks are free' : 'enabled'}`);
    });
    revealSecretBadgeDetailsToggle.addEventListener('change', () => {
        localStorage.setItem(revealSecretBadgeDetailsKey, String(revealSecretBadgeDetailsToggle.checked));
        window.dispatchEvent(new Event('inventory-badge-peek-settings-changed'));
        say(`secret badge details ${revealSecretBadgeDetailsToggle.checked ? 'shown' : 'hidden'}`);
    });
    setBalanceNameButton();
    window.refreshInventoryBalances?.();
    window.addEventListener('storage', event => {
        if (event.key === animationsKey) animationsToggle.checked = event.newValue !== 'false';
        if (event.key === arenaCooldownKey) cooldownToggle.checked = event.newValue === 'true';
        if (event.key === badgePeekPenaltyDisabledKey) badgePeekPenaltyToggle.checked = event.newValue === 'true';
        if (event.key === revealSecretBadgeDetailsKey) revealSecretBadgeDetailsToggle.checked = event.newValue === 'true';
        if (event.key === balanceNamesKey) {
            setBalanceNameButton();
            window.refreshInventoryBalances?.();
        }
    });
    loadItems();
    window.addEventListener('storage', event => {
        if ([badgeCatalogKey, privateBadgeCatalogKey, 'INVENTORY_BADGE_CATALOG'].includes(event.key)) refreshBadgeChoices();
    });
})();
