// ==========================================
// 1. BASES DE DONNÉES ET VARIABLES GLOBALES
// ==========================================

let map;
let windIcon;
let marker;
let globalData = null; // Stocke les résultats de simulation pour filtrage

const TURBINES_DB = {
    "HAWT – VEVOR 12V (500 W)": { type: "HAWT", rated_power_w: 500, color: "#F97316", pts: [[0, 0], [2.4, 0], [2.5, 5], [3, 10], [4, 30], [5, 60], [6, 100], [7, 140], [8, 200], [9, 280], [10, 380], [11, 460], [12, 500], [13, 470], [14, 420], [15, 350], [15.1, 0], [30, 0]] },
    "HAWT – Rutland 1200 12V (483 W)": { type: "HAWT", rated_power_w: 483, color: "#EC4899", pts: [[0, 0], [2.4, 0], [3, 10], [4, 20], [5, 40], [6, 70], [7, 100], [8, 140], [9, 190], [10, 240], [11, 290], [12, 350], [13, 420], [14, 483], [20, 483], [20.1, 0], [30, 0]] },
    "VAWT – TESUP AtlasX (750 W)": { type: "VAWT", rated_power_w: 750, color: "#8B5CF6", pts: [[0, 0], [3.9, 0], [4, 10], [5, 35], [6, 75], [7, 130], [8, 220], [9, 330], [10, 460], [11, 580], [12, 680], [13, 750], [15, 750], [15.1, 0], [30, 0]] },
    "VAWT – Leading Edge LE-v150 (200 W)": { type: "VAWT", rated_power_w: 200, color: "#0BF51F", pts: [[0, 0], [2.9, 0], [3, 2], [6, 25], [10, 120], [14, 200], [27, 200], [27.1, 0], [40, 0]] }
};

const LED_MODELS = {
    "Seoul 5050": { currents_ma: [66.7, 100, 200, 350, 500, 600, 700, 1000], vfs_volts: [5.239, 5.255, 5.414, 5.630, 5.832, 5.955, 6.091, 6.493] },
    "Z5M4/OSG": { currents_ma: [200, 350, 500, 700, 1000, 1200, 1400, 1600, 1800, 2000], vfs_volts: [2.663, 2.714, 2.757, 2.808, 2.875, 2.915, 2.953, 2.989, 3.024, 3.057] },
    "XP-G3": { currents_ma: [200, 250, 300, 350, 450, 500, 550, 600, 700, 800, 900, 1000, 1200, 1400, 1500, 1600], vfs_volts: [2.68, 2.7, 2.71, 2.73, 2.76, 2.78, 2.79, 2.8, 2.83, 2.86, 2.88, 2.9, 2.94, 2.95, 2.99, 2.99] }
};


// ==========================================
// 2. GESTION DES ONGLETS (NAVIGATION)
// ==========================================

function openTab(evt, tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active-tab', 'text-blue-600', 'border-b-2', 'border-blue-600');
        btn.classList.add('text-slate-500');
    });
    document.getElementById(tabId).classList.remove('hidden');
    evt.currentTarget.classList.remove('text-slate-500');
    evt.currentTarget.classList.add('active-tab', 'text-blue-600', 'border-b-2', 'border-blue-600');
    if(tabId === 'tab-calculator' && typeof map !== 'undefined') { setTimeout(() => { map.invalidateSize(); }, 100); }
}

function openSubTab(evt, tabId) {
    document.querySelectorAll('.sub-tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.sub-tab-btn').forEach(btn => {
        btn.classList.remove('active-sub-tab', 'text-orange-500', 'border-b-2', 'border-orange-500');
        btn.classList.add('text-slate-500');
    });
    document.getElementById(tabId).classList.remove('hidden');
    evt.currentTarget.classList.remove('text-slate-500');
    evt.currentTarget.classList.add('active-sub-tab', 'text-orange-500', 'border-b-2', 'border-orange-500');

    // Simule un redimensionnement de la fenêtre pour forcer Plotly à ajuster parfaitement la taille des graphiques cachés !
    setTimeout(() => { window.dispatchEvent(new Event('resize')); }, 50);
}


// ==========================================
// 3. CARTE INTERACTIVE (LEAFLET / CARTODB)
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    map = L.map('map').setView([50.6418, 5.5533], 7);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO', subdomains: 'abcd', maxZoom: 20
    }).addTo(map);

    windIcon = L.icon({ iconUrl: 'turbine_icon.png', iconSize: [72, 72], iconAnchor: [36, 72], popupAnchor: [0, -72] });
    marker = L.marker([50.6418, 5.5533], {icon: windIcon}).addTo(map);

    function placeMarker(lat, lng) {
        if(marker) map.removeLayer(marker);
        marker = L.marker([lat, lng], {icon: windIcon}).addTo(map);
        document.getElementById('input-lat').value = lat.toFixed(6);
        document.getElementById('input-lon').value = lng.toFixed(6);
    }

    map.on('click', function(e) { placeMarker(e.latlng.lat, e.latlng.lng); });
    L.Control.geocoder({ defaultMarkGeocode: false, placeholder: "Search... (e.g. Rue de Mons 3)" }).on('markgeocode', function(e) {
        map.setView(e.geocode.center, 12);
        placeMarker(e.geocode.center.lat, e.geocode.center.lng);
    }).addTo(map);

    document.getElementById('input-lat').addEventListener('input', updateMapFromInputs);
    document.getElementById('input-lon').addEventListener('input', updateMapFromInputs);
});

function updateMapFromInputs() {
    const lat = parseFloat(document.getElementById('input-lat').value);
    const lng = parseFloat(document.getElementById('input-lon').value);
    if (!isNaN(lat) && !isNaN(lng)) {
        map.setView([lat, lng], map.getZoom());
        if(marker) map.removeLayer(marker);
        marker = L.marker([lat, lng], {icon: windIcon}).addTo(map);
    }
}


// ==========================================
// 4. LOGIQUE D'INTERFACE (LEDS, CUSTOM, DIMMING)
// ==========================================

function interp(x, xp, fp) {
    if (x <= xp[0]) return fp[0];
    if (x >= xp[xp.length - 1]) return fp[fp.length - 1];
    for (let i = 0; i < xp.length - 1; i++) {
        if (x >= xp[i] && x <= xp[i + 1]) { return fp[i] + (x - xp[i]) / (xp[i + 1] - xp[i]) * (fp[i + 1] - fp[i]); }
    } return 0;
}

function getTridonicEfficiency(current_ma, load_w) {
    const curves = {
        200: { loads: [3.5, 5.0, 7.0, 8.0], effs: [0.710, 0.770, 0.820, 0.845] },
        400: { loads: [7.0, 10.0, 15.0, 19.0], effs: [0.795, 0.840, 0.868, 0.880] },
        600: { loads: [8.5, 15.0, 20.0, 30.0], effs: [0.818, 0.860, 0.872, 0.884] },
        800: { loads: [11.0, 20.0, 30.0, 40.0], effs: [0.820, 0.855, 0.870, 0.880] },
        1050: { loads: [18.0, 25.0, 30.0, 40.0], effs: [0.812, 0.840, 0.850, 0.864] }
    };
    const currents = [200, 400, 600, 800, 1050];
    const safe_current = Math.max(Math.min(current_ma, 1050), 200);
    let c1, c2;
    for (let i = 0; i < currents.length - 1; i++) {
        if (safe_current >= currents[i] && safe_current <= currents[i+1]) { c1 = currents[i]; c2 = currents[i+1]; break; }
    }
    if (!c1) { c1 = c2 = safe_current; }
    const eff1 = interp(load_w, curves[c1].loads, curves[c1].effs);
    const eff2 = interp(load_w, curves[c2].loads, curves[c2].effs);
    if (c1 === c2) return eff1;
    return eff1 + (eff2 - eff1) * ((safe_current - c1) / (c2 - c1));
}

function calculateRealTimeLED() {
    const model = document.getElementById('led-model').value;
    const count = parseFloat(document.getElementById('led-count').value);
    const strings = parseFloat(document.getElementById('led-strings').value);
    const current = parseFloat(document.getElementById('led-current').value);
    if (strings <= 0 || count <= 0 || current <= 0) { return; }

    const i_led = current / strings;
    const led_data = LED_MODELS[model] || LED_MODELS["Seoul 5050"];
    const vf_exact = interp(i_led, led_data.currents_ma, led_data.vfs_volts);
    const string_vf = vf_exact * (count / strings);
    const total_led_power = count * vf_exact * (i_led / 1000.0);
    const driver_eff = getTridonicEfficiency(current, total_led_power);
    const system_power = total_led_power / driver_eff;

    document.getElementById('out-vf').innerText = string_vf.toFixed(1) + " V";
    document.getElementById('out-led-power').innerText = total_led_power.toFixed(1) + " W";
    document.getElementById('out-sys-power').innerText = system_power.toFixed(1) + " W";
    document.getElementById('out-eff').innerText = (driver_eff * 100).toFixed(1) + " %";
    
    return system_power; // On le retourne pour l'utiliser dans l'analyse
}

document.addEventListener("DOMContentLoaded", () => {
    // LED
    document.querySelectorAll('.led-trigger').forEach(input => {
        input.addEventListener('input', calculateRealTimeLED);
        input.addEventListener('change', calculateRealTimeLED);
    });
    calculateRealTimeLED();

    // Custom Turbine Toggle
    document.getElementById('c_en').addEventListener('change', (e) => {
        const cSettings = document.getElementById('custom-turbine-settings');
        if(e.target.checked) cSettings.classList.remove('opacity-50', 'pointer-events-none');
        else cSettings.classList.add('opacity-50', 'pointer-events-none');
    });

    document.getElementsByName('c_type').forEach(radio => {
        radio.addEventListener('change', (e) => {
            document.getElementById('div_c_h').style.display = (e.target.value === 'VAWT') ? 'block' : 'none';
        });
    });

    // Dimming Toggle
    document.getElementById('dimming_en').addEventListener('change', (e) => {
        const dimSet = document.getElementById('dimming-settings');
        if(e.target.checked) { dimSet.classList.remove('hidden'); setTimeout(drawDimmingPreview, 50); }
        else { dimSet.classList.add('hidden'); }
    });

    addDimmingRow('23:00', '01:00', 60);
    addDimmingRow('01:00', '05:00', 20);
});

function addDimmingRow(start, end, power) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td class="py-1 pr-1"><input type="time" value="${start}" class="dimming-input w-full border rounded px-1 text-xs" onchange="drawDimmingPreview()"></td>
        <td class="py-1 pr-1"><input type="time" value="${end}" class="dimming-input w-full border rounded px-1 text-xs" onchange="drawDimmingPreview()"></td>
        <td class="py-1 pr-1"><input type="number" value="${power}" min="0" max="100" class="dimming-input w-full border rounded px-1 text-xs" onchange="drawDimmingPreview()"></td>
        <td class="py-1"><button onclick="this.parentElement.parentElement.remove(); drawDimmingPreview();" class="text-red-500 hover:text-red-700 font-bold text-lg leading-none">&times;</button></td>
    `;
    document.getElementById('dimming-tbody').appendChild(tr);
    drawDimmingPreview();
}

function drawDimmingPreview() {
    const rows = document.getElementById('dimming-tbody').querySelectorAll('tr');
    const parseTime = (tStr) => {
        if(!tStr) return 24.0;
        const parts = tStr.split(':');
        let val = parseInt(parts[0]) + parseInt(parts[1])/60.0;
        return (val < 12.0) ? val + 24.0 : val;
    };

    let times = [];
    for(let i = 15.5; i <= 33.51; i += 0.25) times.push(i);
    let powers = new Array(times.length).fill(100.0);

    rows.forEach(row => {
        const inputs = row.querySelectorAll('input');
        const startH = parseTime(inputs[0].value);
        const endH = parseTime(inputs[1].value);
        const level = Math.max(0, Math.min(parseFloat(inputs[2].value) || 100, 100));
        for(let i = 0; i < times.length; i++) { if(times[i] >= startH && times[i] < endH) powers[i] = level; }
    });

    let x_plot = [], y_plot = [];
    for(let i = 0; i < times.length - 1; i++) {
        x_plot.push(times[i], times[i+1]);
        y_plot.push(powers[i], powers[i]);
    }

    const trace = { x: x_plot, y: y_plot, mode: 'lines', fill: 'tozeroy', line: { color: '#F59E0B', width: 2 }, hoverinfo: 'none' };
    const layout = {
        margin: { l: 25, r: 10, t: 10, b: 20 },
        xaxis: { tickmode: 'array', tickvals: [16, 18, 20, 22, 24, 26, 28, 30, 32], ticktext: ["16h", "18h", "20h", "22h", "00h", "02h", "04h", "06h", "08h"], range: [15.5, 33.5], fixedrange: true },
        yaxis: { range: [0, 120], fixedrange: true },
        shapes: [
            { type: 'rect', xref: 'x', yref: 'paper', x0: 15.5, x1: 16.66, y0: 0, y1: 1, fillcolor: '#ffffff', opacity: 0.8, line: {width: 0} },
            { type: 'rect', xref: 'x', yref: 'paper', x0: 32.75, x1: 33.5, y0: 0, y1: 1, fillcolor: '#ffffff', opacity: 0.8, line: {width: 0} }
        ]
    };
    Plotly.newPlot('dimming-preview', [trace], layout, {displayModeBar: false});
}


// ==========================================
// 5. MOTEUR PHYSIQUE (CALCULS DU VENT)
// ==========================================

function getPower(turbine, v) {
    const pts = turbine.pts;
    if (v <= pts[0][0]) return pts[0][1];
    if (v >= pts[pts.length - 1][0]) return pts[pts.length - 1][1];
    for (let i = 0; i < pts.length - 1; i++) {
        if (v >= pts[i][0] && v <= pts[i + 1][0]) {
            let ratio = (v - pts[i][0]) / (pts[i + 1][0] - pts[i][0]);
            return pts[i][1] + ratio * (pts[i + 1][1] - pts[i][1]);
        }
    }
    return 0;
}

// Fonction Gamma (Approximation mathématique en JS)
function gamma(z) {
    if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
    z -= 1;
    const x = 0.99999999999980993;
    const p = [
        676.5203681218851, -1259.1392167224028, 771.32342877765313,
        -176.61502916214059, 12.507347037867045, -0.13857109526572012,
        9.9843695780195716e-6, 1.5056327351493116e-7
    ];
    let y = x;
    for (let i = 0; i < p.length; i++) y += p[i] / (z + i + 1);
    const t = z + p.length - 0.5;
    return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * y;
}

// Calcul des paramètres de Weibull (k et lambda)
function calculateWeibullParams(speeds) {
    if (speeds.length < 2) return { k: 2, lambda: 0 };
    const n = speeds.length;
    const mean = speeds.reduce((a, b) => a + b, 0) / n;
    const variance = speeds.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (n - 1);
    const stdDev = Math.sqrt(variance);

    const k = Math.pow(stdDev / mean, -1.086);
    const lambda = mean / gamma(1 + 1 / k);
    return { k, lambda };
}

// Fonction de densité de probabilité (PDF) de Weibull
function weibullPDF(v, k, lambda) {
    if (v < 0 || lambda === 0) return 0;
    return (k / lambda) * Math.pow(v / lambda, k - 1) * Math.exp(-Math.pow(v / lambda, k));
}

// ==========================================
// 6. ANALYSE PRINCIPALE ET ASTRONOMIQUE
// ==========================================

async function runAnalysis() {
    const btn = document.getElementById('analyze-btn');
    const statusText = document.getElementById('status-text');
    
    const lat = parseFloat(document.getElementById('input-lat').value);
    const lon = parseFloat(document.getElementById('input-lon').value);
    const year = document.getElementById('input-year').value;
    const h = parseFloat(document.getElementById('input-h').value);

    // 1. Préparation des éoliennes
    let activeTurbines = {};
    document.querySelectorAll('.turbine-cb:checked').forEach(cb => { activeTurbines[cb.value] = JSON.parse(JSON.stringify(TURBINES_DB[cb.value])); });

    if (document.getElementById('c_en').checked) {
        const c_name = document.getElementById('c_name').value;
        const c_type = document.querySelector('input[name="c_type"]:checked').value;
        const c_d = parseFloat(document.getElementById('c_d').value);
        const c_h_rot = parseFloat(document.getElementById('c_h').value);
        const c_rho = parseFloat(document.getElementById('c_rho').value);
        const c_cp = parseFloat(document.getElementById('c_cp').value);
        const c_eta = parseFloat(document.getElementById('c_eta').value);
        const vci = parseFloat(document.getElementById('c_vci').value);
        const vco = parseFloat(document.getElementById('c_vco').value);
        const area = (c_type === "HAWT") ? Math.PI * Math.pow(c_d/2, 2) : (c_d * c_h_rot);
        
        let customPts = [[0,0], [vci-0.1, 0]];
        for(let v=vci; v<=vco; v+=0.5) customPts.push([v, 0.5 * c_rho * area * Math.pow(v, 3) * c_cp * c_eta]);
        customPts.push([vco + 0.1, 0]);
        
        // Calcul de la puissance nominale (à 12 m/s)
        const rated_p = 0.5 * c_rho * area * Math.pow(12.0, 3) * c_cp * c_eta;
        activeTurbines["Custom: " + c_name] = { type: c_type, rated_power_w: rated_p, color: "#000000", pts: customPts };
    }

    const selectedTurbineNames = Object.keys(activeTurbines);
    if(selectedTurbineNames.length === 0) { alert("Please select at least one wind turbine!"); return; }

    btn.innerText = "⏳ Downloading Data..."; btn.disabled = true;

    try {
        // 2. Fetch API avec les données Solaires Astronomiques et la Direction du Vent !
        const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${year}-01-01&end_date=${year}-12-31&hourly=wind_speed_10m,wind_direction_10m,global_tilted_irradiance&tilt=35&azimuth=0&daily=sunrise,sunset&timezone=Europe/Brussels&wind_speed_unit=ms`;
        const resp = await fetch(url);
        const data = await resp.json();
        
        statusText.innerText = "Processing Physics Engine & Astronomy...";

        // 3. Calcul du profil de consommation avec le Dimming
        let base_sys_power_w = calculateRealTimeLED();
        let dimming_enabled = document.getElementById('dimming_en').checked;
        let time_bins = []; for(let i=12.0; i<36.0; i+=0.25) time_bins.push(i);
        let power_profile_w = new Array(time_bins.length).fill(base_sys_power_w);

        if (dimming_enabled) {
            const rows = document.getElementById('dimming-tbody').querySelectorAll('tr');
            const parseT = (tStr) => {
                if(!tStr) return 24.0;
                const p = tStr.split(':'); let v = parseInt(p[0]) + parseInt(p[1])/60.0;
                return (v < 12.0) ? v + 24.0 : v;
            };
            rows.forEach(row => {
                const inputs = row.querySelectorAll('input');
                const startH = parseT(inputs[0].value), endH = parseT(inputs[1].value);
                const level = Math.max(0, Math.min(parseFloat(inputs[2].value) || 100, 100)) / 100.0;
                for(let j=0; j<time_bins.length; j++) {
                    if (time_bins[j] >= startH && time_bins[j] < endH) power_profile_w[j] = base_sys_power_w * level;
                }
            });
        }

        // 4. Calcul de la nuit astronomique jour par jour
        let dailyConsMap = {};
        for (let i = 0; i < data.daily.time.length; i++) {
            let dateStr = data.daily.time[i];
            let sunsetDate = new Date(data.daily.sunset[i]);
            let sunriseNextDate = new Date(i + 1 < data.daily.sunrise.length ? data.daily.sunrise[i+1] : data.daily.sunrise[i]);
            
            let sunset_h = sunsetDate.getHours() + sunsetDate.getMinutes() / 60.0;
            let sunrise_next_h = sunriseNextDate.getHours() + sunriseNextDate.getMinutes() / 60.0 + 24.0;
            
            let daily_wh = 0;
            for (let j = 0; j < time_bins.length; j++) {
                if (time_bins[j] >= sunset_h && time_bins[j] < sunrise_next_h) daily_wh += power_profile_w[j] * 0.25;
            }
            dailyConsMap[dateStr] = daily_wh / 1000.0; // Conversion en kWh
        }

        // 5. Simulation Heure par Heure de la production
        const log_factor = Math.log(h / 0.5) / Math.log(10 / 0.5);
        let dailyResults = []; 
        let annualProd = {};
        selectedTurbineNames.forEach(n => annualProd[n] = 0);
        
        let windSpeedsH = [], windDirs = []; // Pour les graphiques de vent
        let windMonths = [];
        
        for (let i = 0; i < data.hourly.time.length; i++) {
            const speed10m = data.hourly.wind_speed_10m[i];
            const dir = data.hourly.wind_direction_10m[i];
            const irradiance = data.hourly.global_tilted_irradiance[i] || 0;
            
            if (speed10m === null) continue;

            const dateStr = data.hourly.time[i].split('T')[0];
            const speedH = speed10m * log_factor;
            const month = parseInt(dateStr.split('-')[1]) - 1;

            // Formule Energie Solaire : Production (Wh) = Puissance_Panneau (Wc) × (Irradiance / 1000) × PR
            
            // Rendement panneau: (Irradiance * 0.8 d'efficacité) converti en kWh pour un panneau de 1 Wp
            // division par 1 000 000 : c'est la division par 1000 pour le STC combinée à la division par 1000 pour passer de Wh à kWh
            
            const solar_1wp_kwh = (irradiance * 0.8) / 1000000.0; 
            
            windSpeedsH.push(speedH);
            windMonths.push(month);
            windDirs.push(dir);

            if (!dailyResults.find(d => d.date === dateStr)) {
                // On initialise la propriété solar_1wp à 0
                dailyResults.push({ date: dateStr, month: month, prods: {}, cons: dailyConsMap[dateStr] || 0, solar_1wp: 0 });
            }
            
            let dayObj = dailyResults.find(d => d.date === dateStr);
            dayObj.solar_1wp += solar_1wp_kwh; // On cumule l'énergie solaire de la journée
            
            selectedTurbineNames.forEach(name => {
                const kwh = getPower(activeTurbines[name], speedH) / 1000.0;
                dayObj.prods[name] = (dayObj.prods[name] || 0) + kwh;
                annualProd[name] += kwh;
            });
        }

        // Calcul du Capacity Factor pour chaque éolienne
        Object.keys(activeTurbines).forEach(name => {
            const aep_kwh = annualProd[name];
            const rated_w = activeTurbines[name].rated_power_w;
            const hours_in_year = data.hourly.time.length;
            // Formule : (Production réelle / Production si on tournait à 100% de P. Nominale toute l'année) * 100
            activeTurbines[name].capacity_factor = (rated_w > 0) ? (aep_kwh * 1000.0) / (rated_w * hours_in_year) * 100.0 : 0;
        });

        globalData = { dailyResults, annualProd, activeTurbines, windSpeedsH, windDirs, lumi_h: h };
        
        // On affiche directement le tableau récapitulatif
        drawSummaryTab();
        
        // On lance l'analyse sur 10 ans pour TOUTES les éoliennes sélectionnées
        fetch10YearData(lat, lon, year, h, activeTurbines);
        
        // Appel des graphiques
        drawAnnualChart(); drawPowerCurves(activeTurbines); drawMonthlyChart(); updateDailyChart();

        // Appel des 3 graphiques du vent
        drawWindRose(windSpeedsH, windDirs); 
        drawWeibullDistribution(windSpeedsH, h); 
        drawMonthlyWindChart(windSpeedsH, windMonths, h);

        statusText.innerText = "Analysis Success!";

    } catch (e) { console.error(e); statusText.innerText = "Error during analysis."; } 
    finally { btn.innerText = "⚡ Run Global Analysis"; btn.disabled = false; }
}

// ==========================================
// ANALYSE SUR 10 ANS
// ==========================================
async function fetch10YearData(lat, lon, targetYear, h, activeTurbines) {
    try {
        const startYear = parseInt(targetYear) - 10;
        const log_factor = Math.log(h / 0.5) / Math.log(10 / 0.5);
        
        const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${startYear}-01-01&end_date=${targetYear}-12-31&hourly=wind_speed_10m&timezone=Europe/Brussels&wind_speed_unit=ms`;
        const resp = await fetch(url);
        const data = await resp.json();
        
        Object.keys(activeTurbines).forEach(n => activeTurbines[n].total_10y_kwh = 0);

        for (let i = 0; i < data.hourly.time.length; i++) {
            const speed10m = data.hourly.wind_speed_10m[i];
            if (speed10m === null) continue;
            const speedH = speed10m * log_factor;
            Object.keys(activeTurbines).forEach(name => {
                activeTurbines[name].total_10y_kwh += getPower(activeTurbines[name], speedH) / 1000.0;
            });
        }
        
        // Calcul de la moyenne annuelle sur 11 ans
        Object.keys(activeTurbines).forEach(name => {
            activeTurbines[name].aep_10y_avg = activeTurbines[name].total_10y_kwh / 11.0;
        });
        
        // On redessine le tableau de l'onglet Summary pour afficher les valeurs qui viennent d'arriver !
        drawSummaryTab();
        
    } catch (e) {
        console.error("10-year AEP error:", e);
    }
}


// ==========================================
// 7. FONCTIONS DE DESSIN (PLOTLY)
// ==========================================

function updateDailyChart() {
    if (!globalData) return;
    const month = parseInt(document.getElementById('month-filter').value);
    const filtered = globalData.dailyResults.filter(d => d.month === month);
    const days = filtered.map(d => d.date.split('-')[2]);

    const solarEnabled = document.getElementById('solar_en').checked;
    const solarWp = parseFloat(document.getElementById('solar_wp').value) || 0;

    let traces = [];
    
    // On boucle sur chaque éolienne active
    Object.keys(globalData.activeTurbines).forEach((name, index) => {
        const windProd = filtered.map(d => d.prods[name]);
        const groupId = "group" + index; // Identifiant unique pour forcer l'alignement horizontal
        
        // 1. Production Éolienne
        traces.push({
            x: days, 
            y: windProd,
            name: name, 
            type: 'bar', 
            marker: { color: globalData.activeTurbines[name].color },
            offsetgroup: groupId // Assigne la barre à sa colonne
        });

        // 2. Production Solaire (Empilée au-dessus de CETTE éolienne spécifique)
        if (solarEnabled && solarWp > 0) {
            const solarProd = filtered.map(d => d.solar_1wp * solarWp);
            traces.push({
                x: days, 
                y: solarProd,
                name: index === 0 ? '☀️ Solar Production' : '☀️ Solar', 
                type: 'bar', 
                marker: { color: '#FCD34D' }, 
                base: windProd, // 🔥 MAGIE : La barre solaire commence là où l'éolienne s'arrête !
                offsetgroup: groupId, // 🔥 On la force dans la MÊME colonne que son éolienne
                showlegend: index === 0, // Pour éviter d'avoir le Soleil en double dans la légende
                hoverinfo: 'name+y'
            });
        }
    });

    // 3. Consommation LED
    traces.push({
        x: days, 
        y: filtered.map(d => d.cons),
        name: 'LED Consumption', 
        mode: 'lines+markers', 
        line: { color: '#EF4444', dash: 'dash', width: 3 }
    });

    Plotly.newPlot('plot-daily', traces, { 
        barmode: 'group', // Retour au mode groupé classique
        template: 'plotly_white', 
        title: 'Daily Energy Balance', 
        margin: {t:40, b:40, l:40, r:20},
        responsive: true
    });
}

function drawMonthlyChart() {
    if (!globalData) return;
    const monthsStr = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    let traces = [];

    Object.keys(globalData.activeTurbines).forEach(name => {
        let monthlySums = new Array(12).fill(0);
        globalData.dailyResults.forEach(d => { monthlySums[d.month] += d.prods[name]; });
        traces.push({ x: monthsStr, y: monthlySums, name: name, type: 'bar', marker: { color: globalData.activeTurbines[name].color } });
    });

    let monthlyCons = new Array(12).fill(0);
    globalData.dailyResults.forEach(d => { monthlyCons[d.month] += d.cons; });
    traces.push({ x: monthsStr, y: monthlyCons, name: 'LED Consumption', mode: 'lines+markers', line: { color: '#EF4444', width: 3, dash: 'dash' }, fill: 'tozeroy', fillcolor: 'rgba(239,68,68,0.1)' });

    Plotly.newPlot('plot-monthly', traces, { 
        barmode: 'group', 
        template: 'plotly_white', 
        title: 'Overall Monthly Energy Balance',
        responsive: true
    });
}

function drawAnnualChart() {
    const names = Object.keys(globalData.annualProd);
    const energies = names.map(n => globalData.annualProd[n]);
    const cfs = names.map(n => globalData.activeTurbines[n].capacity_factor || 0);
    const colors = names.map(n => globalData.activeTurbines[n].color);

    const trace1 = {
        x: names, y: energies,
        name: 'Energy (kWh/year)',
        type: 'bar',
        marker: { color: colors },
        text: energies.map(v => v.toFixed(2) + " kWh"),
        textposition: 'outside'
    };

    const trace2 = {
        x: names, y: cfs,
        name: 'Capacity Factor (%)',
        yaxis: 'y2',
        type: 'bar',
        marker: { opacity: 0.5, color: colors },
        text: cfs.map(v => v.toFixed(1) + "%"),
        textposition: 'outside'
    };

    const layout = {
        title: 'Annual Production & Capacity Factor',
        template: 'plotly_white',
        barmode: 'group',
        yaxis: { title: 'Energy (kWh/year)' },
        yaxis2: { title: 'Capacity Factor (%)', overlaying: 'y', side: 'right', range: [0, Math.max(...cfs) * 1.5] },
        legend: { orientation: "h", y: -0.2 }
    };

    Plotly.newPlot('plot-annual', [trace1, trace2], layout, {responsive: true});
}

function drawPowerCurves(turbines) {
    let traces = [];
    let speeds = Array.from({length: 60}, (_, i) => i * 0.5); // de 0 à 30 m/s
    
    Object.keys(turbines).forEach(name => {
        traces.push({
            x: speeds, y: speeds.map(v => getPower(turbines[name], v)),
            name: name, mode: 'lines', line: { color: turbines[name].color, dash: turbines[name].type === "HAWT" ? "solid" : "dot", width: 2.5 }
        });
    });
    Plotly.newPlot('plot-curves', traces, { template: 'plotly_white', title: 'Absolute Power Curves (W)', xaxis: {title: "Wind Speed (m/s)"}, yaxis: {title: "Power (W)"}, legend: {orientation: "h", y: -0.2} });
}

function drawSummaryTab() {
    const tableBody = document.getElementById('summary-table-body');
    const cardsContainer = document.getElementById('summary-cards-container');
    
    // 1. Calcul de la consommation annuelle totale
    let annualCons = 0;
    globalData.dailyResults.forEach(d => annualCons += d.cons);
    
    const mainTurbineName = Object.keys(globalData.activeTurbines)[0];
    const mainAep = globalData.annualProd[mainTurbineName];
    const mainAep10y = globalData.activeTurbines[mainTurbineName].aep_10y_avg;
    
    const aep10yHTML = mainAep10y ? `${mainAep10y.toFixed(2)} <span class="text-sm font-normal">kWh/yr</span>` : `⏳ <span class="text-sm font-normal">Calculating...</span>`;

    // 2. Injection des 3 cartes globales directement dans l'onglet Summary
    cardsContainer.innerHTML = `
        <div class="bg-blue-50 border-l-4 border-blue-500 p-4 rounded shadow-sm">
            <p class="text-xs text-blue-600 font-bold uppercase">AEP (${document.getElementById('input-year').value}) - ${mainTurbineName.substring(0,25)}</p>
            <h4 class="text-2xl font-bold text-blue-800">${mainAep.toFixed(2)} <span class="text-sm font-normal">kWh/yr</span></h4>
        </div>
        <div class="bg-purple-50 border-l-4 border-purple-500 p-4 rounded shadow-sm">
            <p class="text-xs text-purple-600 font-bold uppercase">AEP (10-Year Avg)</p>
            <h4 class="text-2xl font-bold text-purple-800">${aep10yHTML}</h4>
        </div>
        <div class="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded shadow-sm">
            <p class="text-xs text-emerald-600 font-bold uppercase">LED Annual Consumption</p>
            <h4 class="text-2xl font-bold text-emerald-800">${annualCons.toFixed(2)} <span class="text-sm font-normal">kWh/yr</span></h4>
        </div>
    `;

    // 3. Remplissage du tableau
    tableBody.innerHTML = '';

    Object.keys(globalData.activeTurbines).forEach(name => {
        const t = globalData.activeTurbines[name];
        const aepYear = globalData.annualProd[name];
        const aep10y = t.aep_10y_avg;
        const cf = t.capacity_factor || 0;
        
        // Calcul des jours d'autonomie
        const autoDays = globalData.dailyResults.filter(d => d.prods[name] >= d.cons).length;

        const aep10yText = aep10y ? aep10y.toFixed(2) + ' kWh' : '<span class="text-slate-400 italic">⏳...</span>';

        const row = `
            <tr class="border-b border-slate-100 hover:bg-white transition">
                <td class="py-4 px-2 flex items-center gap-2">
                    <span class="w-3 h-3 rounded-full" style="background-color: ${t.color}"></span>
                    ${name}
                </td>
                <td class="text-center">${t.rated_power_w.toFixed(0)} W</td>
                <td class="text-center font-bold text-blue-600">${aepYear.toFixed(2)} kWh</td>
                <td class="text-center">${aep10yText}</td>
                <td class="text-center">
                    <span class="px-2 py-1 rounded-full ${autoDays > 200 ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}">
                        ${autoDays} days
                    </span>
                </td>
                <td class="text-center font-bold">${cf.toFixed(1)}%</td>
            </tr>
        `;
        tableBody.innerHTML += row;
    });
}


// ==========================================
// 8. GRAPHIQUES D'ANALYSE DU VENT
// ==========================================

function drawWindRose(speeds, directions) {
    const bins = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const colors = ["#9ad5fd", "#2cb1f8", "#68FF74", "#59f32a", "#34d399", "#10b981", "#fbbf24", "#f59e0b", "#ea580c", "#dc2626", "#7e22ce"];
    const labels = ["0-1", "1-2", "2-3", "3-4", "4-5", "5-6", "6-7", "7-8", "8-9", "9-10", ">10"];

    // Création d'une matrice : 11 classes de vitesse x 16 secteurs
    let counts = Array.from({length: 11}, () => new Array(16).fill(0));
    let totalValid = 0;

    for(let i=0; i<speeds.length; i++){
        let s = speeds[i], d = directions[i];
        if(s === null || d === null) continue;

        let sector = Math.floor((d % 360) / 22.5 + 0.5) % 16;
        let sBin = Math.floor(s);
        if(sBin > 10) sBin = 10;

        counts[sBin][sector]++;
        totalValid++;
    }

    let traces = [];
    const theta = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];

    for(let sBin=0; sBin<=10; sBin++){
        let r = counts[sBin].map(c => (c / totalValid) * 100);
        traces.push({ r: r, theta: theta, name: labels[sBin] + ' m/s', marker: {color: colors[sBin]}, type: 'barpolar' });
    }

    const layout = {
        title: "Wind Rose (Distribution by Direction)",
        template: 'plotly_white',
        polar: { angularaxis: { direction: 'clockwise', rotation: 90 } },
        // On réduit un peu la marge droite (r: 10) pour laisser plus de place à la légende
        margin: { t: 50, b: 20, l: 40, r: 10 }, 
        height: 380,
        showlegend: true
        // J'ai supprimé la ligne "legend: { orientation: "h", y: -0.2 }"
    };
    
    // L'option "responsive: true" permet au graphique de se compresser si l'écran est petit
    Plotly.newPlot('plot-rose', traces, layout, {displayModeBar: false, responsive: true});
}


// Graphique des VITESSES moyennes mensuelles
function drawMonthlyWindChart(speeds, months, h) {
    let sums = new Array(12).fill(0);
    let counts = new Array(12).fill(0);
    
    // Calcul de la moyenne réelle pour chaque mois avec sécurité
    for(let i=0; i<speeds.length; i++){
        if(speeds[i] !== null && !isNaN(speeds[i])){
            sums[months[i]] += speeds[i];
            counts[months[i]]++;
        }
    }
    
    // Moyenne nette
    let avgs = sums.map((s, i) => counts[i] > 0 ? s / counts[i] : 0);
    const monthsStr = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const trace = {
        x: monthsStr, 
        y: avgs, 
        type: 'bar',
        orientation: 'v', // Sécurité : Force les barres verticales
        marker: { color: '#0EA5E9' },
        // N'affiche le texte que s'il y a des données (évite les 0.0 m/s sur les mois futurs)
        text: avgs.map(v => v > 0 ? v.toFixed(1) + " m/s" : ""), 
        textposition: 'auto'
    };

    const layout = {
        title: `Average Monthly Wind Speed (at ${h}m AGL)`,
        template: 'plotly_white', 
        height: 350, 
        margin: { t: 40, b: 30, l: 40, r: 20 },
        yaxis: { title: "Wind Speed (m/s)", rangemode: 'tozero' } // Force l'axe Y à commencer à 0
    };
    
    Plotly.newPlot('plot-monthly-wind', [trace], layout, {displayModeBar: false, responsive: true});
}

// Distribution de Weibull (PDF)
function drawWeibullDistribution(speeds, h) {
    // 1. Calcul des paramètres de Weibull (Méthode des moments)
    const params = calculateWeibullParams(speeds);
    
    // CORRECTION : On cible 'plot-hist' et non 'plot-weibull' !
    if (params.lambda === 0) {
        Plotly.newPlot('plot-hist', [], {title: "No data for Weibull plot"});
        return;
    }

    // 2. Génération de la courbe mathématique PDF
    let speeds_curve = [], pdf_values = [];
    const max_s = Math.max(...speeds);
    
    // On boucle de 0 à max_speed avec des pas de 0.1 m/s
    for (let v = 0; v <= max_s + 2; v += 0.1) {
        speeds_curve.push(v);
        pdf_values.push(weibullPDF(v, params.k, params.lambda));
    }

    // Trace 1 : Histogramme de fréquence (Pour comparaison visuelle)
    const trace_hist = {
        x: speeds,
        name: 'Frequency (Data)',
        type: 'histogram',
        histnorm: 'probability density', 
        marker: { color: 'rgba(96, 165, 250, 0.4)' },
        xbins: { start: 0, size: 0.5 }
    };

    // Trace 2 : La vraie courbe PDF de Weibull générée mathématiquement
    const trace_pdf = {
        x: speeds_curve,
        y: pdf_values,
        name: `Weibull PDF (k=${params.k.toFixed(2)}, λ=${params.lambda.toFixed(2)})`,
        mode: 'lines',
        line: { color: '#F59E0B', width: 3 }
    };

    const layout = {
        title: `Wind Speed Distribution & Weibull PDF (at ${h}m)`,
        template: 'plotly_white', height: 380,
        margin: { t: 50, b: 40, l: 40, r: 20 },
        xaxis: { title: "Wind Speed (m/s)", range: [0, max_s + 1] },
        yaxis: { title: "Probability Density" },
        legend: { orientation: "h", y: -0.2 }
    };
    
    // CORRECTION ICI AUSSI : Cible 'plot-hist'
    Plotly.newPlot('plot-hist', [trace_hist, trace_pdf], layout, {displayModeBar: false, responsive: true});
}

// ==========================================
// 9. DASHBOARD VEVOR (WUNDERGROUND + OPEN-METEO)
// ==========================================

const WU_API_KEY = "b71ffe5373df47999ffe5373df1799da";
const WU_STATION_ID = "ILIGE104";

// Initialisation des dates par défaut (les 7 derniers jours) au chargement de la page
document.addEventListener("DOMContentLoaded", () => {
    let today = new Date();
    let lastWeek = new Date();
    lastWeek.setDate(today.getDate() - 7);
    
    // Format YYYY-MM-DD
    document.getElementById('wu-end').value = today.toISOString().split('T')[0];
    document.getElementById('wu-start').value = lastWeek.toISOString().split('T')[0];
});

// Solar Toggle & Slider
document.getElementById('solar_en').addEventListener('change', (e) => {
    const sSet = document.getElementById('solar-settings');
    if(e.target.checked) sSet.classList.remove('opacity-50', 'pointer-events-none');
    else sSet.classList.add('opacity-50', 'pointer-events-none');
    updateDailyChart(); // Met à jour le graphique dynamiquement !
});

document.getElementById('solar_wp').addEventListener('input', (e) => {
    document.getElementById('solar_wp_val').innerText = e.target.value + ' Wp';
    updateDailyChart(); // Met à jour le graphique dynamiquement !
});

async function fetchVevorData() {
    const btn = document.getElementById('wu-analyze-btn');
    const statusMsg = document.getElementById('wu-status');
    
    const startStr = document.getElementById('wu-start').value;
    const endStr = document.getElementById('wu-end').value;
    const height = parseFloat(document.getElementById('wu-height').value);
    const lat = 50.6418; // Fixé pour la station
    const lon = 5.5533;

    if (new Date(startStr) > new Date(endStr)) {
        alert("Start date must be before end date.");
        return;
    }

    btn.innerText = "⏳ Fetching VEVOR & OM...";
    btn.disabled = true;
    statusMsg.innerText = "Downloading from IBM Wunderground...";
    statusMsg.className = "text-sm font-semibold text-center mt-4 text-blue-600";

    try {
        // 1. TÉLÉCHARGEMENT WUNDERGROUND (Jour par jour car l'API PWS l'exige)
        let start = new Date(startStr);
        let end = new Date(endStr);
        let allObs = [];

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            // Format YYYYMMDD attendu par Wunderground
            let dateApi = d.toISOString().split('T')[0].replace(/-/g, ''); 
            let url = `https://api.weather.com/v2/pws/history/all?stationId=${WU_STATION_ID}&format=json&units=m&date=${dateApi}&apiKey=${WU_API_KEY}`;
            
            try {
                let resp = await fetch(url);
                if (resp.ok) {
                    let json = await resp.json();
                    if (json.observations) allObs = allObs.concat(json.observations);
                }
            } catch(e) { console.warn("Missing data for " + dateApi); }
        }

        if (allObs.length === 0) throw new Error("No data found for this VEVOR station on these dates.");

        // Traitement VEVOR (Conversion km/h -> m/s)
        let wuTimes = [], wuAvgs = [], wuGusts = [], wuDirs = [];
        let sumAvg = 0, maxGust = 0;

        allObs.forEach(obs => {
            wuTimes.push(obs.obsTimeLocal);
            let avgMs = (obs.metric.windspeedAvg / 3.6);
            let gustMs = (obs.metric.windgustHigh / 3.6);
            
            wuAvgs.push(avgMs);
            wuGusts.push(gustMs);
            wuDirs.push(obs.winddirAvg); // RÉCUPÉRATION DE LA DIRECTION
            
            sumAvg += avgMs;
            if (gustMs > maxGust) maxGust = gustMs;
        });

        // 2. TÉLÉCHARGEMENT OPEN-METEO (Comparaison)
        statusMsg.innerText = "Downloading from Open-Meteo...";
        let omUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${startStr}&end_date=${endStr}&hourly=wind_speed_10m&timezone=Europe/Brussels&wind_speed_unit=ms`;
        let omResp = await fetch(omUrl);
        let omJson = await omResp.json();

        let omTimes = omJson.hourly.time;
        let omRaw = omJson.hourly.wind_speed_10m;
        
        // Application Loi Logarithmique pour OM
        const log_factor = Math.log(height / 0.5) / Math.log(10 / 0.5);
        let omAdj = omRaw.map(v => v !== null ? v * log_factor : null);

        // 3. MISE À JOUR DE L'INTERFACE (KPIs)
        document.getElementById('wu-kpi-avg').innerHTML = `${(sumAvg/allObs.length).toFixed(1)} <span class="text-base font-normal text-slate-400">m/s</span>`;
        document.getElementById('wu-kpi-gust').innerHTML = `${maxGust.toFixed(1)} <span class="text-base font-normal text-slate-400">m/s</span>`;
        document.getElementById('wu-kpi-obs').innerText = allObs.length.toLocaleString();

        statusMsg.innerText = "✅ Success! Data synchronized.";
        statusMsg.className = "text-sm font-semibold text-center mt-4 text-emerald-600";

        // 4. DESSIN DU GRAPHIQUE PLOTLY
        let traces = [
            // VEVOR (Bleu)
            { x: wuTimes, y: wuAvgs, name: 'VEVOR Average Speed', mode: 'lines', line: {color: '#3b82f6', width: 2} },
            // VEVOR Gust (Rouge fin)
            { x: wuTimes, y: wuGusts, name: 'VEVOR Max Gust', mode: 'lines', line: {color: '#ef4444', width: 1}, opacity: 0.7 },
            // Open-Meteo Brut 10m (Gris Pointillé)
            { x: omTimes, y: omRaw, name: 'Open-Meteo Raw (@10m)', mode: 'lines', line: {color: '#94a3b8', width: 2, dash: 'dash'} },
            // Open-Meteo Ajusté (Vert Pointillé)
            { x: omTimes, y: omAdj, name: `Open-Meteo Adjusted (@${height}m)`, mode: 'lines', line: {color: '#10b981', width: 3, dash: 'dot'} }
        ];

        const layout = {
            title: "Wind Speed Comparison: Local VEVOR vs Open-Meteo",
            template: 'plotly_white',
            margin: { t: 60, b: 40, l: 40, r: 20 },
            xaxis: { title: "Time" },
            yaxis: { title: "Wind Speed (m/s)", rangemode: 'tozero' },
            legend: { orientation: "h", y: 1.05, xanchor: "center", x: 0.5 },
            hovermode: "x unified"
        };

        Plotly.newPlot('plot-wu-chrono', traces, layout, {displayModeBar: false, responsive: true});
        // Appels des nouveaux graphiques statistiques pour la station VEVOR
        drawWuWeibull(wuAvgs, height);
        drawWuWindRose(wuAvgs, wuDirs);
        drawMap3DWindRose(wuAvgs, wuDirs);

    } catch (e) {
        console.error(e);
        statusMsg.innerText = "❌ Error: " + e.message;
        statusMsg.className = "text-sm font-semibold text-center mt-4 text-red-500";
    } finally {
        btn.innerText = "🚀 Fetch & Analyze Data";
        btn.disabled = false;
    }
}

// ==========================================
// 10. GRAPHIQUES STATISTIQUES VEVOR
// ==========================================

function drawWuWeibull(speeds, h) {
    const params = calculateWeibullParams(speeds);
    if (params.lambda === 0) return;

    let speeds_curve = [], pdf_values = [];
    const max_s = Math.max(...speeds);
    for (let v = 0; v <= max_s + 2; v += 0.1) {
        speeds_curve.push(v);
        pdf_values.push(weibullPDF(v, params.k, params.lambda));
    }

    const trace_hist = {
        x: speeds, name: 'Measured Data (VEVOR)', type: 'histogram',
        histnorm: 'probability density', marker: { color: 'rgba(59, 130, 246, 0.4)' },
        xbins: { start: 0, size: 0.5 }
    };

    const trace_pdf = {
        x: speeds_curve, y: pdf_values,
        name: `Weibull Fit (k=${params.k.toFixed(2)}, A=${params.lambda.toFixed(2)})`,
        mode: 'lines', line: { color: '#ef4444', width: 3 }
    };

    const layout = {
        title: `Local Weibull Distribution (at ${h}m AGL) [to be removed]`,
        template: 'plotly_white', margin: { t: 50, b: 40, l: 40, r: 20 },
        xaxis: { title: "Wind Speed (m/s)" },
        yaxis: { title: "Probability Density" },
        legend: { orientation: "h", y: -0.2 }
    };

    Plotly.newPlot('plot-wu-weibull', [trace_hist, trace_pdf], layout, {displayModeBar: false, responsive: true});
}

function drawWuWindRose(speeds, directions) {
    const labels = ["0-1", "1-2", "2-3", "3-4", "4-5", "5-6", "6-7", "7-8", "8-9", "9-10", ">10"];
    const colors = ["#9ad5fd", "#2cb1f8", "#68FF74", "#59f32a", "#34d399", "#10b981", "#fbbf24", "#f59e0b", "#ea580c", "#dc2626", "#7e22ce"];
    const theta = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];

    let counts = Array.from({length: 11}, () => new Array(16).fill(0));
    let totalValid = 0;

    for(let i=0; i<speeds.length; i++){
        let s = speeds[i], d = directions[i];
        if(s === null || d === null || isNaN(d)) continue;

        let sector = Math.floor((d % 360) / 22.5 + 0.5) % 16;
        let sBin = Math.floor(s);
        if(sBin > 10) sBin = 10;

        counts[sBin][sector]++;
        totalValid++;
    }

    let traces = [];
    for(let sBin=0; sBin<=10; sBin++){
        let r = counts[sBin].map(c => (c / totalValid) * 100);
        traces.push({ r: r, theta: theta, name: labels[sBin] + ' m/s', marker: {color: colors[sBin]}, type: 'barpolar' });
    }

    const layout = {
        title: "Local Wind Rose (VEVOR)",
        template: 'plotly_white',
        polar: { angularaxis: { direction: 'clockwise', rotation: 90 } },
        margin: { t: 50, b: 20, l: 40, r: 10 },
        showlegend: true
    };

    Plotly.newPlot('plot-wu-rose', traces, layout, {displayModeBar: false, responsive: true});
}

// ==========================================
// 11. 3D MICRO-SITING (MAPLIBRE & MAPTILER)
// ==========================================

let map3D = null;
const MAPTILER_KEY = "YPMlHKwFMPi4oRKjQ0SO"; 

function render3DMap() {
    const container = document.getElementById('map3d-container');
    container.innerHTML = ''; // Efface le texte "Click to render..."

    // On retire les classes Flexbox qui décalent la matrice de la souris
    container.classList.remove('flex', 'items-center', 'justify-center');

    // Initialisation de la carte 3D
    map3D = new maplibregl.Map({
        container: 'map3d-container',
        style: `https://api.maptiler.com/maps/basic-v2/style.json?key=${MAPTILER_KEY}`,
        center: [5.553218, 50.642176], 
        zoom: 17.5,
        pitch: 60,
        bearing: -20,
        antialias: true
    });

    map3D.on('style.load', () => {
        // Ajout de la couche des bâtiments en 3D
        map3D.addLayer({
            'id': '3d-buildings',
            'source': 'maptiler_planet',
            'source-layer': 'building',
            'filter': ['has', 'render_height'],
            'type': 'fill-extrusion',
            'minzoom': 14,
            'paint': {
                'fill-extrusion-color': '#cbd5e1',
                'fill-extrusion-height': ['get', 'render_height'],
                'fill-extrusion-base': ['get', 'render_min_height'],
                'fill-extrusion-opacity': 0.8
            }
        });

        // Marqueur 1 (Rouge)
        const el1 = document.createElement('div');
        el1.style.cssText = 'width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.6); background-color: #ef4444;';
        new maplibregl.Marker({element: el1}).setLngLat([5.553122, 50.641950]).addTo(map3D);

        // Marqueur 2 (Bleu)
        const el2 = document.createElement('div');
        el2.style.cssText = 'width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.6); background-color: #3b82f6;';
        new maplibregl.Marker({element: el2}).setLngLat([5.553314, 50.642403]).addTo(map3D);
    });

    map3D.addControl(new maplibregl.NavigationControl());

    // La Rose des Vents tourne avec la boussole de la carte 3D !
    map3D.on('rotate', () => {
        const bearing = map3D.getBearing();
        const roseDiv = document.getElementById('plot-map3d-rose');
        if (roseDiv && roseDiv.data) {
            requestAnimationFrame(() => {
                Plotly.relayout(roseDiv, { 'polar.angularaxis.rotation': 90 + bearing });
            });
        }
    });

    setTimeout(() => { map3D.resize(); }, 200);
}

// Fonction pour dessiner la boussole épurée de la page 3
function drawMap3DWindRose(speeds, directions) {
    const labels = ["0-1", "1-2", "2-3", "3-4", "4-5", "5-6", "6-7", "7-8", "8-9", "9-10", ">10"];
    const colors = ["#9ad5fd", "#2cb1f8", "#68FF74", "#59f32a", "#34d399", "#10b981", "#fbbf24", "#f59e0b", "#ea580c", "#dc2626", "#7e22ce"];
    const theta = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];

    let counts = Array.from({length: 11}, () => new Array(16).fill(0));
    let totalValid = 0;

    for(let i=0; i<speeds.length; i++){
        let s = speeds[i], d = directions[i];
        if(s === null || d === null || isNaN(d)) continue;
        let sector = Math.floor((d % 360) / 22.5 + 0.5) % 16;
        let sBin = Math.floor(s);
        if(sBin > 10) sBin = 10;
        counts[sBin][sector]++;
        totalValid++;
    }

    let traces = [];
    for(let sBin=0; sBin<=10; sBin++){
        let r = counts[sBin].map(c => totalValid > 0 ? (c / totalValid) * 100 : 0);
        traces.push({ r: r, theta: theta, marker: {color: colors[sBin]}, type: 'barpolar', hoverinfo: 'none' });
    }

    const layout = {
        template: 'plotly_white',
        polar: { 
            angularaxis: { direction: 'clockwise', rotation: 90 }, 
            radialaxis: { showticklabels: false } // Masque les % pour faire plus "boussole"
        },
        margin: { t: 20, b: 20, l: 20, r: 20 },
        showlegend: false, // Pas de légende ici
        paper_bgcolor: 'rgba(0,0,0,0)', // Fond transparent
        plot_bgcolor: 'rgba(0,0,0,0)',
    };

    Plotly.newPlot('plot-map3d-rose', traces, layout, {displayModeBar: false, responsive: true});
}