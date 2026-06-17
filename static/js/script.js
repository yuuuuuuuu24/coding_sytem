// State Management
let activeCities = [];
const DEFAULT_CITIES = [
    { name: "東京", zone: "Asia/Tokyo", icon: "🇯🇵" },
    { name: "ニューヨーク", zone: "America/New_York", icon: "🇺🇸" },
    { name: "ロンドン", zone: "Europe/London", icon: "🇬🇧" },
    { name: "パリ", zone: "Europe/Paris", icon: "🇫🇷" },
    { name: "シドニー", zone: "Australia/Sydney", icon: "🇦🇺" }
];
let timezoneDatabase = [];
let timeOffsets = {}; // Store timezone offsets relative to client time

// DOM Elements
const clockGrid = document.getElementById('clock-grid');
const addClockBtn = document.getElementById('add-clock-btn');
const addModal = document.getElementById('add-modal');
const closeModalBtn = document.getElementById('close-modal');
const citySearchInput = document.getElementById('city-search');
const timezoneOptions = document.getElementById('timezone-options');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    loadSavedCities();
    syncTimes();
    loadTimezoneDatabase();
    
    // Setup Event Listeners
    addClockBtn.addEventListener('click', openModal);
    closeModalBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (e) => {
        if (e.target === addModal) closeModal();
    });
    citySearchInput.addEventListener('input', filterTimezones);
    
    // Start Clock Tick (smooth rendering every 200ms to allow fine animation or instant response)
    setInterval(tickClocks, 200);
    
    // Periodically re-sync with server (every 5 minutes) to avoid drift
    setInterval(syncTimes, 300000);
});

// Load Cities from LocalStorage or Defaults
function loadSavedCities() {
    const saved = localStorage.getItem('chronos_cities');
    if (saved) {
        try {
            activeCities = JSON.parse(saved);
        } catch (e) {
            activeCities = [...DEFAULT_CITIES];
        }
    } else {
        activeCities = [...DEFAULT_CITIES];
        saveCities();
    }
}

function saveCities() {
    localStorage.setItem('chronos_cities', JSON.stringify(activeCities));
}

// Fetch Timezones Database for Modal Addition
async function loadTimezoneDatabase() {
    try {
        const response = await fetch('/api/timezones');
        timezoneDatabase = await response.json();
    } catch (error) {
        console.error('Failed to load timezone database:', error);
    }
}

// Fetch Current Times and Calculate Client Offsets
async function syncTimes() {
    if (activeCities.length === 0) {
        clockGrid.innerHTML = `
            <div class="loading">
                <i class="fa-solid fa-hourglass-empty" style="font-size: 2.5rem; margin-bottom: 1rem;"></i>
                <p>表示する時計がありません。「時計を追加」ボタンから都市を追加してください。</p>
            </div>`;
        return;
    }
    
    try {
        // Construct query parameters
        const params = new URLSearchParams();
        activeCities.forEach(city => {
            params.append('zones', city.zone);
            params.append('names', city.name);
            params.append('icons', city.icon);
        });
        
        const response = await fetch(`/api/time?${params.toString()}`);
        const data = await response.json();
        
        // Calculate exact offsets
        const clientNow = Date.now();
        data.forEach(cityData => {
            // Reconstruct the target time from returned values
            const targetDate = new Date();
            // Since we get specific hour, minute, second from the server at this snapshot:
            // We'll parse the date part and calculate exact difference
            const offsetHoursStr = cityData.offset.replace('UTC', '');
            const offsetHours = offsetHoursStr ? parseFloat(offsetHoursStr) : 0;
            
            // Server time in milliseconds
            // Using UTC time and applying offset
            const utcTime = clientNow + (new Date().getTimezoneOffset() * 60000);
            const targetTimeMs = utcTime + (offsetHours * 3600000);
            
            timeOffsets[cityData.zone] = {
                offsetHours: offsetHours,
                serverDiff: targetTimeMs - clientNow, // Difference between target zone simulated time and local client system time
                icon: cityData.icon,
                name: cityData.name
            };
        });
        
        renderClockCards(data);
    } catch (error) {
        console.error('Failed to sync times with server:', error);
    }
}

// Render Clock Cards Structure
function renderClockCards(citiesData) {
    clockGrid.innerHTML = '';
    
    citiesData.forEach(city => {
        const card = document.createElement('div');
        card.className = `clock-card ${city.is_day ? 'day-theme' : 'night-theme'}`;
        card.id = `card-${city.zone.replace(/\//g, '-')}`;
        
        card.innerHTML = `
            <div class="card-header">
                <div class="city-info">
                    <span class="city-name">${city.icon} ${city.name}</span>
                    <span class="timezone-name">${city.zone}</span>
                </div>
                <button class="remove-btn" onclick="removeCity('${city.zone}')" title="削除">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>
            
            <div class="analog-clock">
                <div class="clock-face">
                    <div class="clock-center"></div>
                    <div class="hand hour-hand" id="hour-${card.id}"></div>
                    <div class="hand minute-hand" id="min-${card.id}"></div>
                    <div class="hand second-hand" id="sec-${card.id}"></div>
                </div>
            </div>
            
            <div class="time-display">
                <div class="digital-time" id="digital-${card.id}">${city.time}</div>
                <div class="date-display" id="date-${card.id}">${city.date}</div>
                <div class="card-footer">
                    <span class="info-pill offset">
                        <i class="fa-solid fa-clock"></i> ${city.offset}
                    </span>
                    <span class="info-pill theme-info" id="theme-pill-${card.id}">
                        ${city.is_day ? '<i class="fa-solid fa-sun" style="color: #f59e0b;"></i> 昼' : '<i class="fa-solid fa-moon" style="color: #6366f1;"></i> 夜'}
                    </span>
                </div>
            </div>
        `;
        
        clockGrid.appendChild(card);
    });
    
    // Initial Tick to set hand positions immediately
    tickClocks();
}

// Update clock hands and digital displays locally
function tickClocks() {
    const clientNow = Date.now();
    
    activeCities.forEach(city => {
        const offsetInfo = timeOffsets[city.zone];
        if (!offsetInfo) return;
        
        // Target localized timestamp
        const targetTimeMs = clientNow + offsetInfo.serverDiff;
        const targetDate = new Date(targetTimeMs);
        
        // Get timezone-aware values
        // Note: targetDate as generated using offset is shifted, so we extract UTC values
        // to represent the localized values directly.
        const hours = targetDate.getUTCHours();
        const minutes = targetDate.getUTCMinutes();
        const seconds = targetDate.getUTCSeconds();
        const milliseconds = targetDate.getUTCMilliseconds();
        
        const cardSafeId = `card-${city.zone.replace(/\//g, '-')}`;
        
        // 1. Update Analog Hands
        const hourHand = document.getElementById(`hour-${cardSafeId}`);
        const minHand = document.getElementById(`min-${cardSafeId}`);
        const secHand = document.getElementById(`sec-${cardSafeId}`);
        
        if (hourHand && minHand && secHand) {
            // Angles calculation
            const secDeg = (seconds * 6) + (milliseconds * 0.006); // Smooth second hand sweep
            const minDeg = (minutes * 6) + (seconds * 0.1);
            const hourDeg = ((hours % 12) * 30) + (minutes * 0.5);
            
            secHand.style.transform = `rotate(${secDeg}deg)`;
            minHand.style.transform = `rotate(${minDeg}deg)`;
            hourHand.style.transform = `rotate(${hourDeg}deg)`;
        }
        
        // 2. Update Digital Displays
        const digitalDisplay = document.getElementById(`digital-${cardSafeId}`);
        if (digitalDisplay) {
            const pad = (num) => String(num).padStart(2, '0');
            digitalDisplay.textContent = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
        }
        
        // 3. Update Day/Night styling dynamically if hour changes
        const cardElement = document.getElementById(cardSafeId);
        const themePill = document.getElementById(`theme-pill-${cardSafeId}`);
        if (cardElement && themePill) {
            const isDay = hours >= 6 && hours < 18;
            if (isDay && !cardElement.classList.contains('day-theme')) {
                cardElement.classList.remove('night-theme');
                cardElement.classList.add('day-theme');
                themePill.innerHTML = '<i class="fa-solid fa-sun" style="color: #f59e0b;"></i> 昼';
            } else if (!isDay && !cardElement.classList.contains('day-theme')) {
                cardElement.classList.remove('day-theme');
                cardElement.classList.add('night-theme');
                themePill.innerHTML = '<i class="fa-solid fa-moon" style="color: #6366f1;"></i> 夜';
            }
        }
    });
}

// Remove Clock Card
function removeCity(zone) {
    activeCities = activeCities.filter(c => c.zone !== zone);
    saveCities();
    syncTimes();
}

// Modal Interaction
function openModal() {
    addModal.classList.add('active');
    citySearchInput.value = '';
    renderTimezoneOptions();
    citySearchInput.focus();
}

function closeModal() {
    addModal.classList.remove('active');
}

// Render list in the Modal
function renderTimezoneOptions(filterText = '') {
    timezoneOptions.innerHTML = '';
    
    const query = filterText.toLowerCase().trim();
    const filtered = timezoneDatabase.filter(item => 
        item.name.toLowerCase().includes(query) || 
        item.zone.toLowerCase().includes(query)
    );
    
    if (filtered.length === 0) {
        timezoneOptions.innerHTML = `<div style="text-align: center; color: var(--text-secondary); padding: 1.5rem;">都市が見つかりませんでした。</div>`;
        return;
    }
    
    filtered.forEach(tz => {
        const isAlreadyAdded = activeCities.some(c => c.zone === tz.zone);
        
        const option = document.createElement('div');
        option.className = `tz-option ${isAlreadyAdded ? 'added' : ''}`;
        option.innerHTML = `
            <div class="tz-details">
                <span class="tz-flag">${tz.icon}</span>
                <div>
                    <div class="tz-name">${tz.name}</div>
                    <div class="tz-path">${tz.zone}</div>
                </div>
            </div>
            <span class="tz-badge">${isAlreadyAdded ? '追加済' : '追加'}</span>
        `;
        
        if (!isAlreadyAdded) {
            option.addEventListener('click', () => {
                addCity(tz);
            });
        }
        
        timezoneOptions.appendChild(option);
    });
}

// Add New City
function addCity(tz) {
    activeCities.push({
        name: tz.name,
        zone: tz.zone,
        icon: tz.icon
    });
    saveCities();
    closeModal();
    syncTimes();
}

// Filter Input
function filterTimezones() {
    renderTimezoneOptions(citySearchInput.value);
}
