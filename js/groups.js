/* ES Module: Tab 1 - Color Groups Component (色彩分群) */

import { state, hueFamilies, initScrollShadows } from "./app.js";
import { selectViewerColor } from "./hero.js";

// Renders the 11 color selector tags
export function renderHueGroups() {
	const container = document.getElementById("hueGroupsSelectView");
	if (!container) return;
	container.innerHTML = "";

	const counts = {};
	state.colorsDb.forEach((c) => {
		counts[c.hue] = (counts[c.hue] || 0) + 1;
	});

	Object.keys(hueFamilies).forEach((key) => {
		const fam = hueFamilies[key];
		const card = document.createElement("div");
		card.className = "hue-group-card" + (state.activeHueFilter === key ? " active" : "");
		card.setAttribute("data-hue", key);
		card.style.setProperty("--group-accent", fam.accentHex);
		card.style.setProperty("--group-accent-rgb", fam.accentRgb);
		card.onclick = () => switchHue(key);

		card.innerHTML = `
			<div class="splatter"></div>
			<div class="hue-group-name">${fam.nameZh}</div>
		`;
		container.appendChild(card);
	});
}

// Swaps chosen hue categories and renders the swatches
export function switchHue(hueKey, selectColor = null) {
	state.activeHueFilter = hueKey;
	const groupColors = state.colorsDb.filter((c) => c.hue === hueKey);

	const colorsTitle = document.getElementById("groupColorsTitle");
	if (colorsTitle) {
		colorsTitle.innerText = `${hueFamilies[hueKey].nameZh}系谱 (共 ${groupColors.length} 色)`;
	}

	const grid = document.getElementById("hueGroupColorsGrid");
	if (!grid) return;
	grid.innerHTML = "";

	// Group colors into chunks of 9
	const chunks = [];
	for (let i = 0; i < groupColors.length; i += 9) {
		chunks.push(groupColors.slice(i, i + 9));
	}

	chunks.forEach((chunk) => {
		const groupContainer = document.createElement("div");
		groupContainer.className = "ribbon-group-9";

		chunk.forEach((c) => {
			const card = document.createElement("div");
			const isActive = state.activeViewerColor && state.activeViewerColor.hex === c.hex;
			card.className = `ribbon-swatch-strip ${isActive ? "active" : ""}`;
			card.id = `group-swatch-${c.hex.replace("#", "")}`;
			
			const txtColor = c.fontColor || "#FFFFFF";
			card.style.backgroundColor = c.hex;
			card.style.color = txtColor;
			
			card.onclick = () => selectViewerColor(c, "groups");

			card.innerHTML = `
				<span class="ribbon-swatch-name">${c.nameHans}</span>
				<span class="ribbon-swatch-hex" onclick="copyHexToClipboard('${c.hex}', event)" title="点击复制">${c.hex}</span>
			`;
			groupContainer.appendChild(card);
		});

		grid.appendChild(groupContainer);
	});

	// Sync active classes on vertical tags
	document.querySelectorAll(".hue-group-card").forEach((cCard) => {
		if (cCard.getAttribute("data-hue") === hueKey) {
			cCard.classList.add("active");
		} else {
			cCard.classList.remove("active");
		}
	});

	if (groupColors.length > 0) {
		const target = selectColor || groupColors[0];
		selectViewerColor(target, "groups");
	}

	initScrollShadows(grid);
}
