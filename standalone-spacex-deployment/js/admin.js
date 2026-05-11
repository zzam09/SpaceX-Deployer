import { db as firestoreDb } from './firebase-config.js';
import {
    collection, getDocs, doc, setDoc, deleteDoc
} from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js';

let users = {};

function generateId() {
    const ids = Object.keys(users).map(Number).filter(n => !isNaN(n));
    const max = ids.length > 0 ? Math.max(...ids) : 0;
    return String(max + 1).padStart(3, '0');
}

function tierBadge(tier) {
    const colors = { 'Explorer': '#f59e0b', 'Pioneer': '#60a5fa', 'Vanguard': '#c5a059' };
    const c = colors[tier] || '#a1a1aa';
    return `<span style="display:inline-flex;align-items:center;gap:5px;font-size:10px;font-weight:800;color:${c};text-transform:uppercase;letter-spacing:0.05em;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);padding:3px 10px;border-radius:6px;">${tier}</span>`;
}

function statusBadge(status) {
    if (status === 'ACTIVE') {
        return `<span style="display:inline-flex;align-items:center;gap:5px;font-size:10px;font-weight:800;color:#10b981;text-transform:uppercase;letter-spacing:0.05em;"><span style="width:6px;height:6px;border-radius:50%;background:#10b981;display:inline-block;"></span>ACTIVE</span>`;
    }
    return `<span style="display:inline-flex;align-items:center;gap:5px;font-size:10px;font-weight:800;color:#f59e0b;text-transform:uppercase;letter-spacing:0.05em;"><span style="width:6px;height:6px;border-radius:50%;background:#f59e0b;display:inline-block;"></span>PENDING</span>`;
}

function updateStats() {
    const entries = Object.values(users);
    document.getElementById('stat-total').textContent = entries.length;
    document.getElementById('stat-active').textContent = entries.filter(u => u.status === 'ACTIVE').length;
    document.getElementById('stat-pending').textContent = entries.filter(u => u.status === 'PENDING').length;
    document.getElementById('stat-vanguard').textContent = entries.filter(u => u.tier === 'Vanguard').length;
}

function renderTable() {
    const tbody = document.getElementById('user-tbody');
    const entries = Object.values(users);

    if (entries.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center;padding:48px;color:#52525b;font-size:13px;">
                    No members found. Add your first member above.
                </td>
            </tr>`;
        document.getElementById('member-count').textContent = '0 members';
        updateStats();
        return;
    }

    tbody.innerHTML = entries.map(u => {
        const emailDisplay = u.email
            ? `<span title="${u.email}" style="display:inline-block;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;vertical-align:bottom;">${u.email}</span>`
            : `<span style="color:#3f3f46;">—</span>`;
        return `
        <tr style="border-bottom:1px solid rgba(255,255,255,0.04);transition:background 0.2s;"
            onmouseenter="this.style.background='rgba(255,255,255,0.02)'"
            onmouseleave="this.style.background='transparent'">
            <td style="padding:16px 20px;font-family:'JetBrains Mono',monospace;font-size:11px;color:#52525b;font-weight:500;">#${u.id}</td>
            <td style="padding:16px 20px;">
                <div style="font-size:14px;font-weight:600;color:#fff;margin-bottom:2px;">${u.name}</div>
                <div style="font-size:11px;color:#52525b;">${u.role}</div>
            </td>
            <td style="padding:16px 20px;">${tierBadge(u.tier)}</td>
            <td style="padding:16px 20px;font-family:'JetBrains Mono',monospace;font-size:11px;color:#a1a1aa;font-weight:500;">${u.clearance}</td>
            <td style="padding:16px 20px;">${statusBadge(u.status)}</td>
            <td style="padding:16px 20px;font-family:'JetBrains Mono',monospace;font-size:11px;color:#52525b;max-width:180px;">${emailDisplay}</td>
            <td style="padding:16px 20px;font-size:12px;color:#52525b;">${u.joined}</td>
            <td style="padding:16px 20px;">
                <div style="display:flex;gap:8px;">
                    <button onclick="openEditModal('${u.id}')" style="padding:6px 14px;border-radius:8px;border:1px solid rgba(255,255,255,0.08);background:transparent;color:#a1a1aa;font-size:11px;font-weight:700;cursor:pointer;transition:all 0.2s;letter-spacing:0.03em;"
                        onmouseenter="this.style.borderColor='rgba(255,255,255,0.2)';this.style.color='#fff'"
                        onmouseleave="this.style.borderColor='rgba(255,255,255,0.08)';this.style.color='#a1a1aa'">EDIT</button>
                    <button onclick="confirmDelete('${u.id}')" style="padding:6px 14px;border-radius:8px;border:1px solid rgba(239,68,68,0.2);background:transparent;color:#ef4444;font-size:11px;font-weight:700;cursor:pointer;transition:all 0.2s;letter-spacing:0.03em;"
                        onmouseenter="this.style.borderColor='rgba(239,68,68,0.5)';this.style.background='rgba(239,68,68,0.05)'"
                        onmouseleave="this.style.borderColor='rgba(239,68,68,0.2)';this.style.background='transparent'">DELETE</button>
                </div>
            </td>
        </tr>
    `;
    }).join('');

    document.getElementById('member-count').textContent = `${entries.length} member${entries.length !== 1 ? 's' : ''}`;
    updateStats();
    lucide.createIcons();
}

function showLoading() {
    document.getElementById('user-tbody').innerHTML = `
        <tr>
            <td colspan="7" style="text-align:center;padding:48px;color:#52525b;font-size:13px;letter-spacing:0.03em;">
                Loading members from Firestore…
            </td>
        </tr>`;
    document.getElementById('member-count').textContent = '…';
}

function showFetchError(msg) {
    document.getElementById('user-tbody').innerHTML = `
        <tr>
            <td colspan="7" style="text-align:center;padding:48px;">
                <div style="color:#ef4444;font-size:13px;font-weight:600;margin-bottom:8px;">Firebase Error</div>
                <div style="color:#52525b;font-size:12px;line-height:1.6;max-width:420px;margin:0 auto;">${msg}</div>
            </td>
        </tr>`;
    document.getElementById('member-count').textContent = 'error';
}

async function loadUsers() {
    showLoading();
    try {
        const snap = await getDocs(collection(firestoreDb, 'members'));
        users = {};
        snap.forEach(d => { users[d.id] = d.data(); });
        renderTable();
    } catch (err) {
        showFetchError('Could not load members. Check your Firestore security rules or internet connection.');
    }
}

window.openAddModal = function () {
    document.getElementById('modal-title').textContent = 'Add Member';
    document.getElementById('modal-id').value = '';
    document.getElementById('modal-name').value = '';
    document.getElementById('modal-role').value = '';
    document.getElementById('modal-email').value = '';
    document.getElementById('modal-tier').value = 'Explorer';
    document.getElementById('modal-clearance').value = 'INTERNAL';
    document.getElementById('modal-status').value = 'PENDING';
    document.getElementById('modal-joined').value = '';
    document.getElementById('modal-avatar-url').value = '';
    document.getElementById('modal-bg-url').value = '';
    document.getElementById('modal-error').style.display = 'none';
    document.getElementById('modal-email-required').style.display = '';
    document.getElementById('user-modal').style.display = 'flex';
    document.getElementById('modal-name').focus();
};

window.openEditModal = function (id) {
    const u = users[id];
    if (!u) return;
    document.getElementById('modal-title').textContent = 'Edit Member';
    document.getElementById('modal-id').value = u.id;
    document.getElementById('modal-name').value = u.name;
    document.getElementById('modal-role').value = u.role;
    document.getElementById('modal-email').value = u.email || '';
    document.getElementById('modal-tier').value = u.tier;
    document.getElementById('modal-clearance').value = u.clearance;
    document.getElementById('modal-status').value = u.status;
    document.getElementById('modal-joined').value = u.joined;
    document.getElementById('modal-avatar-url').value = u.avatarUrl || '';
    document.getElementById('modal-bg-url').value = u.backgroundUrl || '';
    document.getElementById('modal-error').style.display = 'none';
    document.getElementById('modal-email-required').style.display = 'none';
    document.getElementById('user-modal').style.display = 'flex';
    document.getElementById('modal-name').focus();
};

window.closeModal = function () {
    document.getElementById('user-modal').style.display = 'none';
};

window.saveUser = async function () {
    const id          = document.getElementById('modal-id').value;
    const name        = document.getElementById('modal-name').value.trim();
    const role        = document.getElementById('modal-role').value.trim();
    const email       = document.getElementById('modal-email').value.trim().toLowerCase();
    const tier        = document.getElementById('modal-tier').value;
    const clearance   = document.getElementById('modal-clearance').value.trim();
    const status      = document.getElementById('modal-status').value;
    const joined      = document.getElementById('modal-joined').value.trim();
    const avatarUrl   = document.getElementById('modal-avatar-url').value.trim();
    const backgroundUrl = document.getElementById('modal-bg-url').value.trim();

    const errEl  = document.getElementById('modal-error');
    const saveBtn = document.querySelector('#user-modal .modal-btn-primary');
    const isNew = !(id && users[id]);

    if (!name || !role || !clearance || !joined) {
        errEl.textContent = 'All fields are required.';
        errEl.style.display = 'block';
        return;
    }

    if (isNew && !email) {
        errEl.textContent = 'Email address is required for new members.';
        errEl.style.display = 'block';
        return;
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errEl.textContent = 'Please enter a valid email address.';
        errEl.style.display = 'block';
        return;
    }

    const targetId = isNew ? generateId() : id;
    const member = { id: targetId, name, role, email, tier, clearance, status, joined, avatarUrl, backgroundUrl };

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving…';
    errEl.style.display = 'none';

    try {
        await setDoc(doc(firestoreDb, 'members', targetId), member);
        users[targetId] = member;
        window.closeModal();
        renderTable();
    } catch (err) {
        errEl.textContent = 'Failed to save. Check your Firestore rules or connection.';
        errEl.style.display = 'block';
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Member';
    }
};

window.confirmDelete = function (id) {
    const u = users[id];
    if (!u) return;
    document.getElementById('confirm-name').textContent = u.name;
    document.getElementById('confirm-id').value = id;
    document.getElementById('confirm-modal').style.display = 'flex';
};

window.closeConfirm = function () {
    document.getElementById('confirm-modal').style.display = 'none';
};

window.deleteUser = async function () {
    const id      = document.getElementById('confirm-id').value;
    const delBtn  = document.querySelector('#confirm-modal .confirm-btn-danger');

    delBtn.disabled = true;
    delBtn.textContent = 'Removing…';

    try {
        await deleteDoc(doc(firestoreDb, 'members', id));
        delete users[id];
        window.closeConfirm();
        renderTable();
    } catch (err) {
        delBtn.disabled = false;
        delBtn.textContent = 'Remove';
        alert('Failed to delete member. Check your Firestore rules or connection.');
    }
};

document.addEventListener('DOMContentLoaded', function () {
    loadUsers();

    document.getElementById('user-modal').addEventListener('click', function (e) {
        if (e.target === this) window.closeModal();
    });
    document.getElementById('confirm-modal').addEventListener('click', function (e) {
        if (e.target === this) window.closeConfirm();
    });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { window.closeModal(); window.closeConfirm(); }
    });
});
