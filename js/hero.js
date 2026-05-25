/* ES Module: Stage-Right Calligraphy Hero Component */

import { state, switchMainTab, showToast } from "./app.js";
import { renderPalettes } from "./palettes.js";

// Decodes hex values to rgb for CSS variable color-mix opacity calculations
export function hexToRgb(hex) {
	const bigint = parseInt(hex.slice(1), 16);
	const r = (bigint >> 16) & 255;
	const g = (bigint >> 8) & 255;
	const b = bigint & 255;
	return `${r}, ${g}, ${b}`;
}

// Sets the active viewer color and updates the vertical calligraphic pane
export function selectViewerColor(c, source = null) {
	state.activeViewerColor = c;

	// Update text names, pinyin, and hex values
	const nameZh = document.getElementById("viewerNameZh");
	const metaBadge = document.getElementById("viewerMetaBadge");
	const poetry = document.getElementById("viewerPoetry");
	const citation = document.getElementById("viewerCitation");
	const detailHero = document.getElementById("detailHero");

	if (nameZh) nameZh.innerText = c.nameHans;

	const elementsMap = {
		wood: "木",
		fire: "火",
		earth: "土",
		metal: "金",
		water: "水",
	};
	const elementZh = elementsMap[c.fiveElements] || "";
	if (metaBadge) {
		metaBadge.innerText = `${c.categoryHans} · ${elementZh}`;
	}
	
	if (poetry) {
		if (c.sentenceHans) {
			// Split by major Chinese punctuation to force semantic wrapping
			const formattedPoem = c.sentenceHans
				.replace(/([，。；！？])/g, "$1<br>")
				.replace(/<br>$/, ""); // Remove trailing break if present
			poetry.innerHTML = formattedPoem;
		} else {
			poetry.innerText = "";
		}
	}
	
	if (citation) {
		citation.innerText = ` — ${c.authorHans || ""}  [${c.sentenceFromHans || ""}]`;
	}

	// Adaptive text & seal button contrast based on selected color light/dark properties
	const isLightBg = c.fontColor === "#2F2F2F";
	const textColor = isLightBg ? "#2F2F2F" : "#FFFFFF";
	const accentTextColor = isLightBg
		? "rgba(47, 47, 47, 0.65)"
		: "rgba(255, 255, 255, 0.7)";
	const borderStyleColor = isLightBg
		? "rgba(47, 47, 47, 0.15)"
		: "rgba(255, 255, 255, 0.22)";

	if (nameZh) nameZh.style.color = textColor;
	if (poetry) poetry.style.color = textColor;
	if (citation) citation.style.color = accentTextColor;
	if (detailHero) {
		detailHero.style.color = textColor;
		detailHero.style.setProperty(
			"--seal-color",
			isLightBg ? "#9e2a22" : "rgba(250, 247, 240, 0.85)", // Cinnabar Red on light, Ivory on dark
		);
	}

	// Trigger Ink Bleed Expansion Animation (Option 1)
	const bleedOverlay = document.getElementById("inkBleedOverlay");
	if (bleedOverlay && source !== "search_typing") {
		// Clear any inline body transitions from search typing
		document.body.style.transition = "";

		// 1. Prepare overlay (Instant reset)
		bleedOverlay.style.transition = "none";
		bleedOverlay.classList.remove("animate");
		bleedOverlay.style.backgroundColor = c.hex;
		
		// Force reflow
		bleedOverlay.offsetHeight;

		// 2. Start cinematic zoom reveal (Gentler easing)
		bleedOverlay.style.transition = "opacity 2.0s cubic-bezier(0.45, 0, 0.55, 1), transform 2.0s cubic-bezier(0.45, 0, 0.55, 1)";
		bleedOverlay.classList.add("animate");

		// 3. Absorption Pulse
		document.body.classList.add("absorbing");

		// 4. Commit color to body and cleanup after animation finishes
		// We wait for the overlay to be 100% opaque before committing to the body background
		setTimeout(() => {
			document.body.style.backgroundColor = c.hex;
			document.body.classList.remove("absorbing");
		}, 2000);
	} else {
		// For search typing or missing overlay, commit immediately but with a fallback smooth transition
		document.body.style.transition = "background-color 0.5s ease";
		document.body.style.backgroundColor = c.hex;
	}

	// Sync global dynamic CSS theme variables
	document.documentElement.style.setProperty("--theme-primary", c.hex);
	document.documentElement.style.setProperty(
		"--theme-primary-rgb",
		hexToRgb(c.hex),
	);
	document.documentElement.style.setProperty(
		"--theme-light-bg",
		isLightBg ? "rgba(0, 0, 0, 0.04)" : "rgba(255, 255, 255, 0.08)",
	);
	document.documentElement.style.setProperty(
		"--theme-border",
		borderStyleColor,
	);

	// Highlighting visual active states in whichever list grids are rendered
	document.querySelectorAll(".book-swatch-card, .ribbon-swatch-strip").forEach((card) => {
		const hexSuffix = card.id.split("-").pop();
		if (hexSuffix === c.hex.replace("#", "")) {
			card.classList.add("active");
			
			// Dynamic Contrast Accent: Soft ivory for dark colors, Ink Black for light colors
			const dynamicAccent = c.fontColor === "#FFFFFF" 
				? "rgba(250, 247, 240, 0.7)" 
				: "rgba(26, 20, 16, 0.4)";
			card.style.setProperty("--active-accent", dynamicAccent);
		} else {
			card.classList.remove("active");
			card.style.removeProperty("--active-accent");
		}
	});

	// Handle automated redirects and synchronization hooks
	if (source === "groups" || source === "seasons") {
		state.activePaletteBaseColor = c;
		renderPalettes();
	} else if (source === "palettes") {
		// Only re-render to inject the reconstruct icon, do NOT update base color
		renderPalettes();
	} else if (source === "search") {
		// Clear search inputs
		const searchInput = document.getElementById("searchInput");
		const searchIcon = document.getElementById("searchIcon");
		const searchContent = document.getElementById("tabContentSearch");

		if (searchInput) searchInput.value = "";
		if (searchIcon) {
			searchIcon.innerText = "🔍";
			searchIcon.onclick = null;
		}
		if (searchContent) searchContent.style.display = "none";

		// Sync palettes and auto transition
		state.activePaletteBaseColor = c;
		renderPalettes();
		switchMainTab(state.activeMainTab);
	}
}
