const WORKER_SOURCE = `
importScripts("https://cdn.jsdelivr.net/npm/astronomy-engine@2.1.19/astronomy.browser.min.js");

const RESOLUTION_FACTOR = 0.25;
const INTERP_STEP = 10;

self.onmessage = function(e) {
	const {
		bounds,
		widthDeg,
		heightDeg,
		mapSizeX,
		criteria,
		dateTimestamp,
		minAlt: criteriaMinAlt,
		minElong: criteriaMinElong
	} = e.data;

	try {
		const date = Astronomy.MakeTime(new Date(dateTimestamp));

		let minAlt = 0, minElong = 0, isGIC = false;

		const criteriaParams =
			(criteria === "mabbims") ? { minAlt: 3, minElong: 6.4, isGIC: false } :
			(criteria === "gic") ? { minAlt: 5, minElong: 8, isGIC: true } :
			(criteria === "alt0") ? { minAlt: 0, minElong: -100, isGIC: false } :
			{ minAlt: criteriaMinAlt, minElong: criteriaMinElong, isGIC: false };

		minAlt = criteriaParams.minAlt;
		minElong = criteriaParams.minElong;
		isGIC = criteriaParams.isGIC;

		const PPD = (mapSizeX / widthDeg) * RESOLUTION_FACTOR;

		const width = Math.ceil(widthDeg * PPD);
		const height = Math.ceil(heightDeg * PPD);

		const buffer = new Uint8ClampedArray(width * height * 4);

		const totalPixels = width * height;
		const observer = new Astronomy.Observer(0, 0, 0);
		let currentY = -1;
		let sunsetBase = null;

		let prevRA, prevDec, prevElong, prevAlt;
		let nextRA, nextDec, nextElong, nextAlt;
		let cachedNextRA, cachedNextDec, cachedNextElong, cachedNextAlt;

		const progressInterval = Math.floor(totalPixels / 20);
		let lastReported = 0;

		for (let pixelIndex = 0; pixelIndex < totalPixels; pixelIndex++) {

			(pixelIndex - lastReported > progressInterval) && (
				self.postMessage({ status: "progress", percent: Math.round(pixelIndex / totalPixels * 100) }),
				lastReported = pixelIndex
			);

			const x = pixelIndex % width;
			const y = Math.floor(pixelIndex / width);

			const lat = bounds.maxLat - (y / PPD);
			const lon = bounds.minLon + (x / PPD);

			(y !== currentY) && (
				currentY = y,
				observer.latitude = lat,
				observer.longitude = 0,
				sunsetBase = (Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, -1, date.ut, 1))?.ut || null,
				prevRA = undefined,
				cachedNextRA = undefined
			);

			(sunsetBase !== null) && (
				observer.latitude = lat,
				observer.longitude = lon,

				(() => {
					const sunsetUT = sunsetBase - (lon / 360.0);
					let moonRA, moonDec, moonElong;
					let moonAlt;
					const xMod = x % INTERP_STEP;

					(xMod === 0 || prevRA === undefined) ? (
						(x > 0 && prevRA !== undefined && cachedNextRA !== undefined) ? (
							prevRA = cachedNextRA,
							prevDec = cachedNextDec,
							prevElong = cachedNextElong,
							prevAlt = cachedNextAlt
						) : (
							(() => {
								const moonEq = Astronomy.Equator(Astronomy.Body.Moon, sunsetUT, observer, true, true);
								prevRA = moonEq.ra;
								prevDec = moonEq.dec;
								prevElong = Astronomy.AngleFromSun(Astronomy.Body.Moon, sunsetUT);
								prevAlt = Astronomy.Horizon(sunsetUT, observer, prevRA, prevDec, "normal").altitude;
							})()
						),

						(() => {
							let nextX = x + INTERP_STEP;
							(nextX >= width) && (nextX = width - 1);

							(nextX > x) ? (
								(() => {
									const nextLon = bounds.minLon + (nextX / PPD);
									const nextSunsetUT = sunsetBase - (nextLon / 360.0);
									observer.longitude = nextLon;

									const nextMoonEq = Astronomy.Equator(Astronomy.Body.Moon, nextSunsetUT, observer, true, true);
									cachedNextRA = nextMoonEq.ra;
									cachedNextDec = nextMoonEq.dec;
									cachedNextElong = Astronomy.AngleFromSun(Astronomy.Body.Moon, nextSunsetUT);
									cachedNextAlt = Astronomy.Horizon(nextSunsetUT, observer, nextMoonEq.ra, nextMoonEq.dec, "normal").altitude;

									nextRA = cachedNextRA;
									nextDec = cachedNextDec;
									nextElong = cachedNextElong;
									nextAlt = cachedNextAlt;

									(Math.abs(nextRA - prevRA) > 12) && (
										(nextRA > prevRA) ? (prevRA += 24) : (nextRA += 24)
									);
									observer.longitude = lon;
								})()
							) : (
								nextRA = prevRA,
								nextDec = prevDec,
								nextElong = prevElong,
								nextAlt = prevAlt,
								cachedNextRA = undefined
							);

							moonRA = prevRA;
							moonDec = prevDec;
							moonElong = prevElong;
							moonAlt = prevAlt;
						})()
					) : (
						(() => {
							const fraction = xMod / INTERP_STEP;
							moonRA = prevRA + (nextRA - prevRA) * fraction;
							moonDec = prevDec + (nextDec - prevDec) * fraction;
							moonElong = prevElong + (nextElong - prevElong) * fraction;
							moonAlt = prevAlt + (nextAlt - prevAlt) * fraction;

							(moonRA >= 24) && (moonRA -= 24);
						})()
					);

					((!isGIC || sunsetUT < date.ut + 0.5) && moonAlt >= minAlt && moonElong >= minElong) && (
						(() => {
							const idx = pixelIndex * 4;
							buffer[idx] = 0;
							buffer[idx+1] = 255;
							buffer[idx+2] = 0;
							buffer[idx+3] = 128;
						})()
					);
				})()
			);
		}

		self.postMessage({
			status: "complete",
			buffer: buffer,
			width: width,
			height: height
		}, [buffer.buffer]);

	} catch (e) {
		self.postMessage({ status: "error", message: e.message });
	}
};
`;
			const text = {
				en: {
					utcOffsetLabel: 'UTC Offset',
					autoTheme: 'Auto Theme',
					lightTheme: 'Light',
					darkTheme: 'Dark',
					mapTitle: 'Hilal Visibility Map',
					renderMap: 'Render Map',
					dateLabel: 'Date',
					regionLabel: 'Region',
					criteriaLabel: 'Criteria',
					legendVisible: 'Visible',
					minAltLabel: 'Min Altitude (°)',
					minElongLabel: 'Min Elongation (°)',
					languageLabel: 'Language',
					themeLabel: 'Theme',
					calcDateLabel: 'Date',
					calcLatLabel: 'Latitude',
					calcLonLabel: 'Longitude',
					calcCriteriaLabel: 'Criteria',
					calculateBtn: 'Calculate',
					tabMap: 'Map',
					tabCalc: 'Detailed Calculations',
					getLocation: '📍 Use My Location',
					sunsetTime: 'Sunset Time',
					moonsetTime: 'Moonset Time',
					moonAge: 'Moon Age',
					moonAlt: 'Moon Altitude',
					moonElong: 'Elongation',
					moonAzimuth: 'Moon Azimuth',
					moonWidth: 'Moon Width',
					illuminatedFraction: 'Illuminated Fraction',
					visibilityStatus: 'Visibility Status',
					visible: 'Visible',
					notVisible: 'Not Visible'
				},
				id: {
					utcOffsetLabel: 'Selisih UTC',
					autoTheme: 'Tema Otomatis',
					lightTheme: 'Terang',
					darkTheme: 'Gelap',
					mapTitle: 'Peta Visibilitas Hilal',
					renderMap: 'Render Peta',
					dateLabel: 'Tanggal',
					regionLabel: 'Wilayah',
					criteriaLabel: 'Kriteria',
					legendVisible: 'Terlihat',
					minAltLabel: 'Min Tinggi (°)',
					minElongLabel: 'Min Elongasi (°)',
					languageLabel: 'Bahasa',
					themeLabel: 'Tema',
					calcDateLabel: 'Tanggal',
					calcLatLabel: 'Lintang',
					calcLonLabel: 'Bujur',
					calcCriteriaLabel: 'Kriteria',
					calculateBtn: 'Hitung',
					tabMap: 'Peta',
					tabCalc: 'Hitung Detail',
					getLocation: '📍 Lokasi Saya',
					sunsetTime: 'Waktu Matahari Terbenam',
					moonsetTime: 'Waktu Bulan Terbenam',
					moonAge: 'Umur Bulan',
					moonAlt: 'Tinggi Bulan',
					moonElong: 'Elongasi',
					moonAzimuth: 'Azimuth Bulan',
					moonWidth: 'Lebar Bulan',
					illuminatedFraction: 'Fraksi Iluminasi',
					visibilityStatus: 'Status Visibilitas',
					visible: 'Terlihat',
					notVisible: 'Tidak Terlihat'
				}
			};
			const elements = new Proxy({}, { get: (_, id) => document.getElementById(id) });


			class VisibilityMap {
				constructor() {
					this.setup();
					this.theme("auto");
					this.lang(navigator.language?.startsWith("id") ? "id" : "en");
				}
				setup() {
					elements.language.onchange = event => this.lang(event.target.value);
					elements.theme.onchange = event => this.theme(event.target.value);
					elements.renderMap.onclick = () => this.handleRenderClick();
					elements.mapCriteria.onchange = () => this.toggleCustom();
					elements.mapRegion.onchange = () => this.handleRegionChange();

					elements.tabMap.onclick = () => this.switchTab("map");
					elements.tabCalc.onclick = () => this.switchTab("calc");
					elements.calcCriteria.onchange = () => this.toggleCustomCalc();
					elements.calculateBtn.onclick = () => this.calculateDetails();
					elements.getLocation.onclick = () => this.getCurrentLocation();

					const today = new Date();
					elements.mapDate.valueAsDate = today;
					elements.calcDate.valueAsDate = today;

					this.map = L.map("map").setView([-2.5, 118], 5);
					L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
						maxZoom: 19,
						attribution: "&copy; <a href=\"http://www.openstreetmap.org/copyright\">OpenStreetMap</a>"
					}).addTo(this.map);

					this.overlayLayer = null;
					this.isRendering = false;
					const blob = new Blob([WORKER_SOURCE], { type: "application/javascript" });
					this.workerUrl = URL.createObjectURL(blob);
					this.worker = new Worker(this.workerUrl);
					this.worker.onmessage = (e) => this.handleWorkerMessage(e);
				}
				string(key) {
					return text[this.language]?.[key] ?? key;
				}
				theme(themeName) {
					document.documentElement.className = themeName === "auto" ? "" : themeName;
					elements.theme.value = themeName;
				}
				lang(language) {
					this.language = elements.language.value = document.documentElement.lang = language;
					Object.keys(text.en).forEach(key => elements[key] && (elements[key].textContent = this.string(key)));
					[...elements.theme.options].forEach(option => option.textContent = this.string(option.value + "Theme"));
				}
				toggleCustom() {
					const isCustom = elements.mapCriteria.value === "custom";
					elements.customCriteriaInputs.classList.toggle("hidden", !isCustom);
				}

				toggleCustomCalc() {
					const isCustom = elements.calcCriteria.value === "custom";
					elements.calcCustomCriteriaInputs.classList.toggle("hidden", !isCustom);
				}

				switchTab(tab) {
					(tab === "map") ? (
						elements.tabMap.classList.add("active"),
						elements.tabCalc.classList.remove("active"),
						elements.mapView.classList.remove("hidden"),
						elements.calcView.classList.add("hidden"),
						setTimeout(() => this.map.invalidateSize(), 100)
					) : (
						elements.tabMap.classList.remove("active"),
						elements.tabCalc.classList.add("active"),
						elements.mapView.classList.add("hidden"),
						elements.calcView.classList.remove("hidden")
					);
				}

				getCurrentLocation() {
					navigator.geolocation ?
						navigator.geolocation.getCurrentPosition(
							(position) => {
								elements.calcLat.value = position.coords.latitude.toFixed(4);
								elements.calcLon.value = position.coords.longitude.toFixed(4);
							},
							(error) => {
								alert("Error getting location: " + error.message);
							}
						) :
						alert("Geolocation is not supported by this browser.");
				}

				calculateDetails() {
					const lat = parseFloat(elements.calcLat.value);
					const lon = parseFloat(elements.calcLon.value);
					const dateStr = elements.calcDate.value;
					const criteria = elements.calcCriteria.value;

					(isNaN(lat) || isNaN(lon) || !dateStr) ?
						alert("Please fill in all fields correctly.") :
						this._calculateDetailsInner(lat, lon, dateStr, criteria);
				}

				_calculateDetailsInner(lat, lon, dateStr, criteria) {
					const dateObj = new Date(dateStr + "T00:00:00Z");
					const observer = new Astronomy.Observer(lat, lon, 0);
					const date = Astronomy.MakeTime(dateObj);

					const sunset = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, -1, date.ut, 1);

					(!sunset) ?
						(elements.results.innerHTML = "<div class=\"result-card\">Error: Sun does not set on this date/location.</div>") :
						this._calculateDetailsWithSunset(sunset, observer, date, criteria);
				}

				_calculateDetailsWithSunset(sunset, observer, date, criteria) {
					const sunsetUT = sunset.ut;
					const moonEq = Astronomy.Equator(Astronomy.Body.Moon, sunsetUT, observer, true, true);
					const moonHor = Astronomy.Horizon(sunsetUT, observer, moonEq.ra, moonEq.dec, "normal");
					const sunEq = Astronomy.Equator(Astronomy.Body.Sun, sunsetUT, observer, true, true);
					const elongation = Astronomy.AngleBetween(sunEq.vec, moonEq.vec);

					const prevNewMoon = Astronomy.SearchMoonPhase(0, date.ut, -1);
					const ageInDays = prevNewMoon ? (sunsetUT - prevNewMoon.ut) : 0;

					const moonPhase = Astronomy.Illumination(Astronomy.Body.Moon, sunsetUT);
					const moonset = Astronomy.SearchRiseSet(Astronomy.Body.Moon, observer, -1, sunsetUT, 1);

					const offset = parseFloat(elements.calcUtcOffset.value) || 0;
					const fmt = (ut) => {
						return !ut ? "N/A" : (() => {
						const d = ut.date;
						d.setMinutes(d.getMinutes() + offset * 60);
						const timeStr = d.toISOString().substring(11, 19);
						const sign = offset >= 0 ? "+" : "";
						return `${timeStr} (UTC${sign}${offset})`;
					})();
					};

					const customMinAlt = parseFloat(elements.calcMinAlt.value) || 0;
					const customMinElong = parseFloat(elements.calcMinElong.value) || 0;

					const criteriaParams =
						(criteria === "mabbims") ? { minAlt: 3, minElong: 6.4, isGIC: false } :
						(criteria === "gic") ? { minAlt: 5, minElong: 8, isGIC: true } :
						(criteria === "alt0") ? { minAlt: 0, minElong: -100, isGIC: false } :
						{ minAlt: customMinAlt, minElong: customMinElong, isGIC: false };

					const { minAlt, minElong, isGIC } = criteriaParams;

					const visible = ((!isGIC || sunsetUT < date.ut + 0.5) && moonHor.altitude >= minAlt && elongation >= minElong);

					const visibleStatus = visible ? this.string("visible") : this.string("notVisible");
					const color = visible ? "var(--success)" : "var(--danger)";
					const bg = visible ? "var(--on-success)" : "var(--on-danger)";

					const displayData = [
						{ label: "visibilityStatus", value: visibleStatus, color: color, bg: bg },
						{ label: "sunsetTime", value: fmt(sunset) },
						{ label: "moonsetTime", value: fmt(moonset) },
						{ label: "moonAlt", value: moonHor.altitude.toFixed(2) + "°" },
						{ label: "moonElong", value: elongation.toFixed(2) + "°" },
						{ label: "moonAzimuth", value: moonHor.azimuth.toFixed(2) + "°" },
						{ label: "moonAge", value: ageInDays.toFixed(2) + " days" },
						{ label: "illuminatedFraction", value: (moonPhase.phase_fraction * 100).toFixed(2) + "%" }
					];

					let html = "";
					displayData.forEach(item => {
						const style = item.color ? `color: ${item.color};` : "";
						const label = this.string(item.label) || item.label;
						html += `<div class=\"result-card\">
									<div class=\"result-label\">${label}</div>
									<div class=\"result-value\" style=\"${style}\">${item.value}</div>
								</div>`;
					});

					elements.results.innerHTML = html;
				}

				handleRegionChange() {
					const region = elements.mapRegion.value;
					(region === "indonesia") ?
						this.map.setView([-2.5, 118], 5) :
						this.map.setView([0, 0], 2);
				}

				handleRenderClick() {
					this.isRendering ? (
						this.worker.terminate(),
						this.worker = new Worker(this.workerUrl),
						this.worker.onmessage = (e) => this.handleWorkerMessage(e),
						this.isRendering = false,
						elements.renderMap.disabled = false,
						elements.mapStatus.textContent = "Cancelled."
					) : (
						this.startRender()
					);
				}

				startRender() {
					this.isRendering = true;
					elements.renderMap.disabled = false;
					elements.renderMap.textContent = "Cancel";
					elements.mapStatus.textContent = "Calculating...";

					const mapBounds = this.map.getBounds();
					const bounds = {
						minLat: Math.max(-85, mapBounds.getSouth()),
						maxLat: Math.min(85, mapBounds.getNorth()),
						minLon: mapBounds.getWest(),
						maxLon: mapBounds.getEast()
					};

					const criteria = elements.mapCriteria.value;
					const dateStr = elements.mapDate.value;
					const dateObj = new Date(dateStr ? dateStr + "T12:00:00Z" : new Date());

					const mapSize = this.map.getSize();
					const widthDeg = bounds.maxLon - bounds.minLon;
					const heightDeg = bounds.maxLat - bounds.minLat;

					this.lastBounds = bounds;

					this.worker.postMessage({
						bounds: bounds,
						widthDeg: widthDeg,
						heightDeg: heightDeg,
						mapSizeX: mapSize.x,
						criteria: criteria,
						dateTimestamp: dateObj.getTime(),
						minAlt: parseFloat(elements.minAlt.value) || 0,
						minElong: parseFloat(elements.minElong.value) || 0
					});
				}

				handleWorkerMessage(e) {
					const { status, percent, imageData: unused, buffer, width, height, message } = e.data;

					(status === "progress") ? (
						elements.mapStatus.textContent = `Calculating... ${percent}%`
					) : (status === "complete") ? (
						this._handleComplete(width, height, buffer)
					) : (status === "error") ? (
						console.error("Worker Error:", message),
						elements.mapStatus.textContent = "Error: " + message,
						this.isRendering = false,
						elements.renderMap.disabled = false,
						elements.renderMap.textContent = this.string("renderMap")
					) : null;
				}

				_handleComplete(width, height, buffer) {
					const canvas = document.createElement("canvas");
					canvas.width = width;
					canvas.height = height;
					const ctx = canvas.getContext("2d");

					const imageData = new ImageData(buffer, width, height);
					ctx.putImageData(imageData, 0, 0);

					this.updateOverlay(canvas.toDataURL(), this.lastBounds);

					this.isRendering = false;
					elements.renderMap.disabled = false;
					elements.renderMap.textContent = this.string("renderMap");
					elements.mapStatus.textContent = "Done.";
				}

				updateOverlay(imageUrl, bounds) {
					this.overlayLayer && this.map.removeLayer(this.overlayLayer);
					const imageBounds = [[bounds.minLat, bounds.minLon], [bounds.maxLat, bounds.maxLon]];
					this.overlayLayer = L.imageOverlay(imageUrl, imageBounds).addTo(this.map);
				}
			}

			new VisibilityMap();