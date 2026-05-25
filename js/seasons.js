/* ES Module: Tab 2 - Seasonal Terms Component (时令节气) */

import { state, CHRONO_TERMS, initScrollShadows } from "./app.js";
import { selectViewerColor } from "./hero.js";

// Renders the 4 season horizontal tabs and the 6 term buttons of the active season
export function renderSeasonalTerms() {
	// 1. Render the Season Horizontal Tab-Card Stack
	const stack = document.getElementById("seasonTabsStack");
	if (stack) {
		stack.innerHTML = "";
		const SEASONS = [
			{ name: "春季", label: "春 · Spring", en: "Spring", accent: "#73975c", rgb: "115, 151, 92" },
			{ name: "夏季", label: "夏 · Summer", en: "Summer", accent: "#b83a32", rgb: "184, 58, 50" },
			{ name: "秋季", label: "秋 · Autumn", en: "Autumn", accent: "#c99032", rgb: "201, 144, 50" },
			{ name: "冬季", label: "冬 · Winter", en: "Winter", accent: "#3b5b66", rgb: "59, 91, 102" }
		];

		// Render vertical tab header (book column guide sidebar)
		const header = document.createElement("div");
		header.className = "season-card-tabs-header";

		SEASONS.forEach((s) => {
			const btn = document.createElement("button");
			const isActive = state.activeSeason === s.name;
			btn.className = `season-card-tab-btn ${isActive ? "active" : "inactive"}`;
			btn.onclick = () => switchSeason(s.name);
			btn.style.setProperty("--season-accent", s.accent);
			btn.style.setProperty("--season-accent-rgb", s.rgb);

			// Clean minimalist single-character calligraphy vertical labels matching mockup
			btn.innerText = s.name.substring(0, 1);
			header.appendChild(btn);
		});
		stack.appendChild(header);

		// Render active tab content card body (flatly absorbed in paper canvas)
		const body = document.createElement("div");
		body.className = "season-card-tab-body";

		const term = CHRONO_TERMS.find((t) => t.name === state.activeTermFilter) ||
		             CHRONO_TERMS.find((t) => t.season === state.activeSeason);

		const activeSeasonObj = SEASONS.find((s) => s.name === state.activeSeason);
		if (activeSeasonObj) {
			body.style.setProperty("--season-accent", activeSeasonObj.accent);
			body.style.setProperty("--season-accent-rgb", activeSeasonObj.rgb);
		}

		body.innerHTML = `
			<div class="season-tab-active-title" id="seasonTermName">${term ? term.name : ""}</div>
			<p class="season-tab-active-desc" id="seasonTermDesc">${term ? term.desc : ""}</p>
		`;
		stack.appendChild(body);
	}

	// 2. Render only the 6 terms of the active season inside the 2x3 grid
	const grid = document.getElementById("solarTermsGrid");
	if (!grid) return;
	grid.innerHTML = "";

	const filteredTerms = CHRONO_TERMS.filter((t) => t.season === state.activeSeason);
	filteredTerms.forEach((term) => {
		const btn = document.createElement("button");
		const isActive = state.activeTermFilter === term.name;
		btn.className = `solar-term-btn ${isActive ? "active" : ""}`;
		btn.onclick = () => switchSeasonTerm(term.name);

		let accent, accentRgb;
		if (term.season === "春季") {
			accent = "#73975c";
			accentRgb = "115, 151, 92";
		} else if (term.season === "夏季") {
			accent = "#b83a32";
			accentRgb = "184, 58, 50";
		} else if (term.season === "秋季") {
			accent = "#c99032";
			accentRgb = "201, 144, 50";
		} else {
			accent = "#3b5b66";
			accentRgb = "59, 91, 102";
		}

		btn.style.setProperty("--term-accent", accent);
		btn.style.setProperty("--term-accent-rgb", accentRgb);

		btn.innerHTML = `
			<div class="splatter"></div>
			<div class="solar-term-name">${term.name}</div>
		`;

		grid.appendChild(btn);
	});

	updateSeasonalColorsGrid();
}

// Swaps seasonal term active status and details card
export function switchSeasonTerm(termName) {
	state.activeTermFilter = termName;

	// Toggle active class on term buttons
	document.querySelectorAll(".solar-term-btn").forEach((btn) => {
		const nameEl = btn.querySelector(".solar-term-name");
		if (nameEl && nameEl.innerText.trim() === termName) {
			btn.classList.add("active");
		} else {
			btn.classList.remove("active");
		}
	});

	const term = CHRONO_TERMS.find((t) => t.name === termName);
	if (term) {
		const termNameEl = document.getElementById("seasonTermName");
		const termDescEl = document.getElementById("seasonTermDesc");

		if (termNameEl) termNameEl.innerText = term.name;
		if (termDescEl) termDescEl.innerHTML = term.desc;
	}

	updateSeasonalColorsGrid();
}

// Swaps active seasons (春 -> 夏 -> 秋 -> 冬) and auto-selects the first term
export function switchSeason(seasonName) {
	state.activeSeason = seasonName;

	const seasonFirstTerm = CHRONO_TERMS.find((t) => t.season === seasonName);
	if (seasonFirstTerm) {
		state.activeTermFilter = seasonFirstTerm.name;
	}

	renderSeasonalTerms();
}

// Populates the 16 colors swatches under the 4x4 layout
export function updateSeasonalColorsGrid() {
	const termColors = state.colorsDb.filter((c) => c.categoryHans === state.activeTermFilter);
	const grid = document.getElementById("seasonGrid4x4");
	if (!grid) return;
	grid.innerHTML = "";

	// Group colors into chunks of 4
	const chunks = [];
	for (let i = 0; i < termColors.length; i += 4) {
		chunks.push(termColors.slice(i, i + 4));
	}

	chunks.forEach((chunk) => {
		const groupContainer = document.createElement("div");
		groupContainer.className = "ribbon-group-4";

		chunk.forEach((c) => {
			const card = document.createElement("div");
			const isActive = state.activeViewerColor && state.activeViewerColor.hex === c.hex;
			card.className = `ribbon-swatch-strip ${isActive ? "active" : ""}`;
			card.id = `season-swatch-${c.hex.replace("#", "")}`;
			
			const txtColor = c.fontColor || "#FFFFFF";
			card.style.backgroundColor = c.hex;
			card.style.color = txtColor;
			
			card.onclick = () => selectViewerColor(c, "seasons");

			card.innerHTML = `
				<span class="ribbon-swatch-name">${c.nameHans}</span>
				<span class="ribbon-swatch-hex" onclick="copyHexToClipboard('${c.hex}', event)" title="点击复制">${c.hex}</span>
			`;
			groupContainer.appendChild(card);
		});

		grid.appendChild(groupContainer);
	});

	// Auto-select the first swatch of this season if none active
	if (
		termColors.length > 0 &&
		(!state.activeViewerColor || state.activeViewerColor.categoryHans !== state.activeTermFilter)
	) {
		selectViewerColor(termColors[0], "seasons");
	}

	initScrollShadows(grid);
}
