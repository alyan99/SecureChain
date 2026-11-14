"use strict";
const $ = id => document.getElementById(id);
const STORAGE = "securechain.encrypted-wallets.v1";
let wallets = [];
let selected = "";
let unlocked;
let lockTimer;
let snapshot = { chain: [], pending: [] };
let events = [];
let refreshing = false;
let running = false;
function notify(message, error = false) {
    $("notice").textContent = message;
    $("notice").className = error ? "error" : "";
    $("notice").hidden = false;
}
async function api(route, body, method = "POST") {
    const response = await fetch(route, {
        method: body === undefined ? "GET" : method,
        headers: { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(15000)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "The node could not complete the request.");
    return result;
}
function element(tag, text, className) {
    const item = document.createElement(tag);
    if (text !== undefined) item.textContent = text;
    if (className) item.className = className;
    return item;
}
function short(address) { return address ? address.slice(0, 9) + "…" + address.slice(-6) : "Genesis"; }
function badge(text, type) { return element("span", text, "tag " + type); }
function lock() {
    unlocked?.lock();
    unlocked = null;
    clearTimeout(lockTimer);
    $("wallet-state").textContent = "Locked";
    $("send-button").disabled = true;
    $("unlock-password").value = "";
}
function saveWallets(next) {
    localStorage.setItem(STORAGE, JSON.stringify(next));
    wallets = next;
}
function download(name, value) {
    const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }));
    const link = element("a");
    link.href = url;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function run(button, action) {
    if (running) return;
    running = true;
    button.disabled = true;
    try { await action(); } catch (error) { notify(error.message, true); }
    finally {
        running = false;
        button.disabled = false;
        $("send-button").disabled = !unlocked;
    }
}
function actionButton(text, action) {
    const button = element("button", text, "secondary");
    button.type = "button";
    button.addEventListener("click", () => run(button, action));
    return button;
}
async function choose(address) {
    lock();
    selected = address;
    $("selected-address").textContent = address || "Create or import a wallet to get started.";
    renderWallets();
    await refresh();
}
function renderWallets() {
    $("wallet-select").replaceChildren(new Option("Select a wallet", ""));
    const list = $("wallet-list");
    list.replaceChildren();
    for (const wallet of wallets) {
        $("wallet-select").add(new Option(wallet.name, wallet.vault.address));
        const card = element("article", undefined, "wallet-card");
        card.append(element("strong", wallet.name + (selected === wallet.vault.address ? " · Selected" : "")),
            element("p", wallet.vault.address, "address muted"));
        const actions = element("div", undefined, "wallet-actions");
        actions.append(actionButton("Select", () => choose(wallet.vault.address)),
            actionButton("Encrypted backup", () => download("securechain-wallet.json", wallet)),
            actionButton("Copy address", async () => {
                await navigator.clipboard.writeText(wallet.vault.address);
                notify("Wallet address copied.");
            }), actionButton("Remove", async () => {
                if (!confirm("Remove this encrypted wallet from this browser? Keep a backup to retain access.")) return;
                saveWallets(wallets.filter(item => item.vault.address !== wallet.vault.address));
                if (selected === wallet.vault.address) await choose("");
                else renderWallets();
            }));
        card.append(actions);
        list.append(card);
    }
    if (!wallets.length) list.append(element("p", "No wallets yet. Create one or import an encrypted backup.", "empty"));
    $("wallet-select").value = selected;
    $("export-genesis").disabled = !wallets.length;
}
function renderHistory() {
    const rows = [
        ...snapshot.pending.map(tx => ({ tx, status: "Pending", block: "—" })),
        ...snapshot.chain.slice().reverse().flatMap(block =>
            block.transactions.map(tx => ({ tx, status: "Confirmed", block: block.index })))
    ].filter(({ tx }) => !$("only-wallet").checked || tx.sender === selected || tx.receiver === selected);
    const body = $("history");
    body.replaceChildren();
    for (const { tx, status, block } of rows.slice(0, 100)) {
        const row = element("tr");
        const state = element("td");
        state.append(badge(status, status.toLowerCase()));
        const route = element("td", short(tx.sender) + " → " + short(tx.receiver), "mono");
        route.title = (tx.sender || "Genesis allocation") + " → " + tx.receiver;
        row.append(state, route, element("td", tx.amount.toLocaleString() + " SC"),
            element("td", tx.nonce ?? "—"), element("td", block));
        body.append(row);
    }
    if (!rows.length) {
        const cell = element("td", "No transactions to display.", "empty");
        cell.colSpan = 5;
        const row = element("tr");
        row.append(cell);
        body.append(row);
    }
}
function renderBlocks() {
    const expanded = new Set([...$("blocks").querySelectorAll("details[open]")]
        .map(detail => detail.dataset.hash));
    $("blocks").replaceChildren();
    $("block-total").textContent = snapshot.chain.length + " blocks";
    for (const block of snapshot.chain.slice().reverse().slice(0, 100)) {
        const detail = element("details", undefined, "block");
        detail.dataset.hash = block.hash;
        detail.open = expanded.has(block.hash);
        const summary = element("summary", "Block " + block.index);
        summary.append(element("span", block.transactions.length + (block.transactions.length === 1 ? " transfer · " : " transfers · ") + new Date(block.timestamp).toLocaleString()));
        detail.append(summary, element("pre", JSON.stringify(block, null, 2)));
        $("blocks").append(detail);
    }
}
function renderSecurity() {
    const list = $("security-list");
    list.replaceChildren();
    for (const event of events.filter(item => !$("severity").value || item.severity === $("severity").value)) {
        const card = element("article", undefined, "event");
        const top = element("div", undefined, "event-top");
        const name = event.type.toLowerCase().replaceAll("_", " ");
        top.append(badge(event.severity, event.severity), element("strong", name),
            badge(event.outcome === "alert" ? "Alert" : "Rejected", event.outcome),
            element("time", new Date(event.timestamp).toLocaleString()));
        card.append(top, element("p", (event.sender ? short(event.sender) + " · " : "") +
            (event.amount !== undefined ? event.amount + " SC · " : "") + "Source " + event.source));
        list.append(card);
    }
    if (!list.children.length) list.append(element("p", "No security events at this severity.", "empty"));
}
async function refresh() {
    if (refreshing) return;
    refreshing = true;
    const address = selected;
    try {
        const [state, peers, logs, config, storage, account] = await Promise.all([
            api("/network/state"), api("/network/peer-status"), api("/security/logs?limit=100"),
            api("/security/config"), api("/storage/status"), address ? api("/balances/" + address) : Promise.resolve(null)
        ]);
        if (address !== selected) return;
        snapshot = state;
        events = logs;
        const tip = state.chain.at(-1);
        $("connection").textContent = "Node online";
        $("connection").className = "status";
        $("balance").textContent = account ? account.balance.toLocaleString() : "—";
        $("balance-note").textContent = account ? "Confirmed funds for the selected wallet" : "Select a wallet to see your balance";
        $("height").textContent = tip.index;
        $("pending-count").textContent = state.pending.length;
        $("alert-count").textContent = events.filter(event => event.outcome === "alert").length;
        $("peer-count").textContent = peers.length;
        $("difficulty").textContent = tip.difficulty;
        $("network-summary").textContent = peers.filter(peer => peer.online).length + " peers reachable";
        $("tip-summary").textContent = "Latest block " + short(tip.hash);
        $("updated").textContent = new Date().toLocaleTimeString();
        $("next-nonce").value = account?.nextNonce ?? "—";
        $("database-state").textContent = storage.error ? "Write error" : storage.backend.toUpperCase();
        $("log-error").textContent = config.storageError || storage.error || "";
        if (storage.error) notify("The node database reported a write error. Retry after checking storage.", true);
        if (!document.activeElement.closest("#threshold-form")) {
            $("large-threshold").value = config.thresholds.largeTransferAmount;
            $("frequency-threshold").value = config.thresholds.frequencyCount;
            $("window-threshold").value = config.thresholds.frequencyWindowMs;
        }
        $("peer-list").replaceChildren();
        for (const peer of peers) {
            const row = element("div", undefined, "peer");
            const info = element("div");
            info.append(element("strong", peer.url), element("p", peer.online ? "Reachable" : "Unavailable", "muted"));
            row.append(info, actionButton("Disconnect", async () => {
                await api("/peers", { url: peer.url }, "DELETE");
                await refresh();
            }));
            $("peer-list").append(row);
        }
        if (!peers.length) $("peer-list").append(element("p", "No registered peers. Connect another local node.", "empty"));
        renderHistory();
        renderBlocks();
        renderSecurity();
    } catch (error) {
        $("connection").textContent = "Node unavailable";
        $("connection").className = "status offline";
        notify(error.message, true);
    } finally {
        refreshing = false;
        if (address !== selected) await refresh();
    }
}
for (const button of document.querySelectorAll("[data-page]")) {
    button.addEventListener("click", () => {
        document.querySelectorAll(".page").forEach(page => { page.hidden = page.id !== button.dataset.page; });
        document.querySelectorAll(".nav").forEach(nav => nav.classList.toggle("active", nav === button));
        $("page-title").textContent = button.textContent;
    });
}
$("create-wallet").addEventListener("submit", event => {
    event.preventDefault();
    run(event.submitter, async () => {
        const name = $("wallet-name").value.trim();
        if (!name) throw new Error("Enter a wallet name.");
        const password = $("create-password").value;
        $("create-password").value = "";
        const vault = await SecureChainWallet.create(password);
        saveWallets([...wallets, { name, vault }]);
        $("wallet-name").value = "";
        await choose(vault.address);
        notify("Encrypted wallet created. Download an encrypted backup from Local wallets.");
    });
});
$("import-wallet").addEventListener("change", async () => {
    const file = $("import-wallet").files[0];
    if (!file) return;
    try {
        if (file.size > 10000) throw new Error("The wallet file is too large.");
        const input = JSON.parse(await file.text());
        const vault = SecureChainWallet.validateVault(input.vault || input);
        if (wallets.some(wallet => wallet.vault.address === vault.address)) throw new Error("This wallet is already saved.");
        saveWallets([...wallets, { name: String(input.name || "Imported wallet").slice(0, 40), vault }]);
        await choose(vault.address);
        notify("Encrypted wallet imported. Unlock it with its original password.");
    } catch (error) { notify(error.message, true); }
    finally { $("import-wallet").value = ""; }
});
$("unlock-wallet").addEventListener("submit", event => {
    event.preventDefault();
    run(event.submitter, async () => {
        const wallet = wallets.find(item => item.vault.address === selected);
        if (!wallet) throw new Error("Select a wallet first.");
        const address = selected;
        const password = $("unlock-password").value;
        lock();
        const session = await SecureChainWallet.unlock(wallet.vault, password);
        if (address !== selected || document.hidden) { session.lock(); return; }
        unlocked = session;
        lockTimer = setTimeout(lock, 300000);
        $("wallet-state").textContent = "Unlocked";
        notify("Wallet unlocked. You can sign a transfer from Overview.");
    });
});
$("send-form").addEventListener("submit", event => {
    event.preventDefault();
    run(event.submitter, async () => {
        if (!unlocked) throw new Error("Unlock the selected wallet first.");
        const address = unlocked.address;
        const receiver = $("receiver").value.trim();
        const amount = Number($("amount").value);
        const account = await api("/balances/" + address);
        if (!unlocked || unlocked.address !== address) throw new Error("Wallet locked. Unlock it and retry.");
        const tx = unlocked.sign(receiver, amount, account.nextNonce);
        const result = await api("/transactions", tx);
        notify(result.accepted ? "Signed transfer submitted. It is awaiting mining." : "This transfer is already known to the node.");
        $("amount").value = "";
        await refresh();
    });
});
$("peer-form").addEventListener("submit", event => {
    event.preventDefault();
    run(event.submitter, async () => {
        await api("/peers", { url: $("peer-url").value.trim() });
        notify("Peer registered and synchronization completed.");
        await refresh();
    });
});
$("threshold-form").addEventListener("submit", event => {
    event.preventDefault();
    run(event.submitter, async () => {
        await api("/security/config", {
            largeTransferAmount: Number($("large-threshold").value),
            frequencyCount: Number($("frequency-threshold").value),
            frequencyWindowMs: Number($("window-threshold").value)
        }, "PUT");
        notify("Detection thresholds saved for this node.");
        await refresh();
    });
});
$("export-genesis").addEventListener("click", () => download("genesis.json",
    Object.fromEntries(wallets.map(wallet => [wallet.vault.address, 1000]))));
$("wallet-select").addEventListener("change", () => choose($("wallet-select").value));
$("lock-wallet").addEventListener("click", () => { lock(); notify("Wallet locked."); });
$("refresh").addEventListener("click", refresh);
$("only-wallet").addEventListener("change", renderHistory);
$("severity").addEventListener("change", renderSecurity);
$("mine").addEventListener("click", () => run($("mine"), async () => {
    const block = await api("/mine", {});
    notify("Block " + block.index + " mined and broadcast.");
    await refresh();
}));
$("sync").addEventListener("click", () => run($("sync"), async () => {
    await api("/sync", {});
    notify("Chain synchronization completed.");
    await refresh();
}));
document.addEventListener("visibilitychange", () => { if (document.hidden) lock(); });
window.addEventListener("pagehide", lock);
$("node-origin").textContent = location.origin;
try {
    wallets = JSON.parse(localStorage.getItem(STORAGE) || "[]").map(item => ({
        name: String(item.name || "Wallet").slice(0, 40), vault: SecureChainWallet.validateVault(item.vault)
    }));
} catch { notify("Saved wallets could not be read. Import your encrypted backup.", true); }
renderWallets();
refresh();
setInterval(() => { if (!document.hidden && !running) refresh(); }, 10000);


