# WT Schréder Project - Hybrid Streetlight Sizing Tool

A professional web-based simulator designed to size and analyze hybrid (Wind + Solar) off-grid streetlight systems. This tool uses high-resolution meteorological data to provide accurate energy calculations and battery autonomy simulations.

## 🚀 Key Features

### 1. Wind Turbine Calculator
* **Performance Estimation:** Calculate the Annual Energy Production (AEP) for several pre-configured wind turbines (HAWT & VAWT) or define a custom turbine using aerodynamic parameters (Cp, diameter, etc.).
* **Meteorological Integration:** Automatically fetches historical wind speed data from the [Historical Weather API](https://open-meteo.com/en/docs/historical-weather-api) based on the chosen latitude, longitude, and pole height.
* **Wind Analysis:** Visualize the wind resource through Wind Roses, Weibull Distribution plots, and monthly average charts.

### 2. Solar Panel Integration
* **Sizing Tool:** Configure solar panel peak power (Wp) to compensate for wind energy deficits.
* **Solar Analysis:** View monthly irradiance data (kWh/m²) calculated for an optimal 35° tilt oriented South, just like in the [PVGIS](https://re.jrc.ec.europa.eu/pvg_tools/en/tools.html) tool.
* **Hybrid Dashboard:** Visualize the combined contribution of wind and solar energy in a stacked monthly/daily balance chart.

### 3. Advanced Energy Consumption & Smart Dimming
* **Electrical Precision:** Calculates real-time LED power consumption by simulating the forward voltage (Vf) and driver efficiency.
* **Smart Dimming:** Define custom power schedules. The simulator uses a continuous-time overlap algorithm to calculate exact energy savings based on astronomical sunset and sunrise times.

### 4. Battery & Autonomy Simulation
* **State of Charge (SoC):** Hour-by-hour simulation of battery levels (LiFePO4) over a full year.
* **Sizing Modes:** Size the battery based on a target number of "Backup Days" or define a manual capacity in Wh.
* **Reliability KPIs:** Track blackout hours, wasted energy (full battery), and annual autonomy percentage.

### 5. Urban 3D Micro-Siting
* **3D Rendering:** Visualize the installation site in a 3D urban environment using [MapTiler](https://docs.maptiler.com/sdk-js/examples/3d-buildings/).
* **Interactive Wind Rose:** The local wind rose synchronizes with the 3D map's rotation for precise orientation analysis.

### 6. VEVOR Weather Station Dashboard
* **Local Data Sync:** Integration with **Wunderground PWS API** to fetch data from a personal VEVOR station [cite: script.js].
* **Comparison Engine:** Compare local measurements against Open-Meteo satellite/model data to validate the site resource [cite: script.js].

## 🛠️ Technologies Used
* **Frontend:** HTML5, Tailwind CSS (Styling), JavaScript (Logic) [cite: index.html].
* **Visualization:** Plotly.js (Scientific Charts), Leaflet.js (2D Mapping), MapLibre GL (3D Mapping) [cite: index.html].
* **APIs:** Open-Meteo (Weather Data), Wunderground (PWS Data), MapTiler (Map Tiles) [cite: script.js].

## 📊 Mathematical Model
The application relies on several engineering models:
* **Wind:** Logarithmic law for vertical wind profile extrapolation and Weibull probability density functions [cite: script.js].
* **Solar:** Global Tilted Irradiance (GTI) processing and Peak Sun Hours (PSH) conversion [cite: script.js].
* **Astronomy:** Precise sunset/sunrise algorithms to determine operational hours without "staircase effects" [cite: script.js].

---
*Developed as part of the WT Schréder Research Project.
