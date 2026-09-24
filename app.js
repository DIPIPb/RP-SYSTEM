// ===== NEXTRP CEF Application Logic =====

// --- Server Connection ---
const SERVER_URL = 'ws://localhost:7777';
let socket = null;
let playerId = 0;
let playerName = '';

// --- State ---
const state = {
    health: 100,
    armour: 0,
    oxygen: 100,
    money: 0,
    time: '00:00',
    weather: 'Sunny',
    players: [],
    vehicles: [],
    notifications: []
};

// --- Initialize ---
document.addEventListener('DOMContentLoaded', () => {
    initClock();
    initNavigation();
    initNotifications();
    connectServer();
});

// --- Clock ---
function initClock() {
    updateClock();
    setInterval(updateClock, 1000);
}

function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const timeEl = document.getElementById('clock');
    if (timeEl) timeEl.textContent = `${hours}:${minutes}`;
}

// --- Navigation ---
function initNavigation() {
    const navBtns = document.querySelectorAll('.nav-btn');
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const sectionId = btn.title.toLowerCase();
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            
            const targetSection = document.getElementById(sectionId);
            if (targetSection) targetSection.classList.add('active');
        });
    });
}

// --- Notifications ---
function initNotifications() {
    // Load saved notifications
    const saved = localStorage.getItem('nexTRP_notifications');
    if (saved) {
        state.notifications = JSON.parse(saved);
        renderNotifications();
    }
}

function addNotification(title, body, type = 'info') {
    const notification = {
        id: Date.now(),
        title,
        body,
        type,
        time: new Date().toLocaleTimeString()
    };
    
    state.notifications.unshift(notification);
    if (state.notifications.length > 20) state.notifications.pop();
    
    localStorage.setItem('nexTRP_notifications', JSON.stringify(state.notifications));
    renderNotifications();
}

function renderNotifications() {
    const container = document.querySelector('.notification-center');
    if (!container) return;
    
    container.innerHTML = state.notifications.slice(0, 5).map(n => `
        <div class="notification ${n.type}">
            <div class="notification-header">
                <span class="notification-title">${n.title}</span>
                <span class="notification-time">${n.time}</span>
            </div>
            <div class="notification-body">${n.body}</div>
        </div>
    `).join('');
}

// --- Server Connection ---
function connectServer() {
    try {
        socket = new WebSocket(SERVER_URL);
        
        socket.onopen = () => {
            addNotification('Server Connected', 'Successfully connected to NEXTRP server', 'success');
        };
        
        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            handleServerMessage(data);
        };
        
        socket.onclose = () => {
            addNotification('Disconnected', 'Connection to server lost', 'error');
            setTimeout(connectServer, 5000);
        };
        
        socket.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    } catch (error) {
        console.error('Connection error:', error);
    }
}

function handleServerMessage(data) {
    switch(data.type) {
        case 'playerUpdate':
            updatePlayerData(data);
            break;
        case 'playerList':
            updatePlayerList(data.players);
            break;
        case 'vehicleUpdate':
            updateVehicleList(data.vehicles);
            break;
        case 'notification':
            addNotification(data.title, data.message, data.type);
            break;
        case 'timeUpdate':
            state.time = data.time;
            break;
        case 'weatherUpdate':
            state.weather = data.weather;
            break;
    }
}

function updatePlayerData(data) {
    state.health = data.health || 100;
    state.armour = data.armour || 0;
    state.oxygen = data.oxygen || 100;
    state.money = data.money || 0;
}

function updatePlayerList(players) {
    state.players = players;
    renderPlayerList();
}

function updateVehicleList(vehicles) {
    state.vehicles = vehicles;
    renderVehicleList();
}

function renderPlayerList() {
    const tbody = document.querySelector('.data-table tbody');
    if (!tbody) return;
    
    tbody.innerHTML = state.players.map(p => `
        <tr>
            <td>${p.id}</td>
            <td>${p.name}</td>
            <td>${p.score}</td>
            <td>${p.ping}ms</td>
            <td><span class="status-badge ${p.admin ? 'status-admin' : 'status-online'}">${p.admin ? 'Admin' : 'Online'}</span></td>
        </tr>
    `).join('');
}

function renderVehicleList() {
    // Vehicle table rendering logic
}

// --- Utility Functions ---
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatMoney(amount) {
    return `$${formatNumber(amount)}`;
}

function getStatusColor(status) {
    switch(status) {
        case 'online': return 'var(--success)';
        case 'offline': return 'var(--error)';
        case 'admin': return 'var(--accent)';
        default: return 'var(--text-secondary)';
    }
}

// --- Public API (for game scripts to call) ---
window.NEXTRP = {
    showNotification: (title, body, type) => addNotification(title, body, type),
    updateHealth: (health) => { state.health = health; },
    updateArmour: (armour) => { state.armour = armour; },
    updateMoney: (money) => { state.money = money; },
    updateTime: (time) => { state.time = time; },
    updateWeather: (weather) => { state.weather = weather; },
    getState: () => ({ ...state })
};
