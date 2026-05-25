/* ES Module: Intent-Based Palettes Component (意境配盘) */

import { state, paletteTypes, CHRONO_TERMS, showToast } from "./app.js";
import { selectViewerColor } from "./hero.js";

// Calculates dynamic color harmonies and returns an array of exactly 6 color objects
export function calculatePaletteColors(paletteKey, c) {
	if (!c) return [];

	let list = [];

	const getHueDistance = (h1, h2) => {
		let dh = Math.abs(h1 - h2);
		return dh > 180 ? 360 - dh : dh;
	};

	const getTermDistance = (t1, t2) => {
		const idx1 = CHRONO_TERMS.findIndex((t) => t.name === t1);
		const idx2 = CHRONO_TERMS.findIndex((t) => t.name === t2);
		if (idx1 === -1 || idx2 === -1) return 12;
		let dist = Math.abs(idx1 - idx2);
		return dist > 12 ? 24 - dist : dist;
	};

	if (paletteKey === "classy") {
		const shades = c.recommendedShades
			? c.recommendedShades
					.map((h) => state.colorsDb.find((o) => o.hex === h))
					.filter(Boolean)
			: [];
		const neighbors = c.recommendedNeighbors
			? c.recommendedNeighbors
					.map((h) => state.colorsDb.find((o) => o.hex === h))
					.filter(Boolean)
			: [];
		list = [c, ...shades, ...neighbors];
		list = [...new Set(list)].filter(Boolean);

		if (list.length < 9) {
			state.colorsDb.forEach((oth) => {
				if (list.length >= 9) return;
				if (
					oth.categoryHans === c.categoryHans &&
					!list.some((x) => x.hex === oth.hex)
				) {
					list.push(oth);
				}
			});
		}
		if (list.length < 9) {
			state.colorsDb.forEach((oth) => {
				if (list.length >= 9) return;
				const dh = Math.abs(oth.hsl.h - c.hsl.h);
				if (dh < 15 && !list.some((x) => x.hex === oth.hex)) {
					list.push(oth);
				}
			});
		}
		list = list.slice(0, 9);
		const activeIndex = list.findIndex((x) => x.hex === c.hex);
		if (activeIndex !== -1 && activeIndex !== 4) {
			const temp = list[4];
			list[4] = list[activeIndex];
			list[activeIndex] = temp;
		}
	} else if (paletteKey === "spot") {
		const neutrals = state.colorsDb.filter((oth) => oth.hue === "neutral" && oth.hex !== c.hex);

		// Score neutrals based on seasonal proximity (getTermDistance)
		const scored = neutrals.map((n) => ({
			node: n,
			score: getTermDistance(n.categoryHans, c.categoryHans),
		}));

		// Pick 4 light accents (L > 65) closest to the current season
		const lightPool = scored
			.filter((x) => x.node.hsl.l > 65)
			.sort((a, b) => a.score - b.score || b.node.hsl.l - a.node.hsl.l)
			.slice(0, 4)
			.map((x) => x.node)
			.sort((a, b) => b.hsl.l - a.hsl.l); // Sort for smooth L-gradient

		// Pick 4 dark accents (L <= 65) closest to the current season
		const darkPool = scored
			.filter((x) => x.node.hsl.l <= 65)
			.sort((a, b) => a.score - b.score || a.node.hsl.l - b.node.hsl.l)
			.slice(0, 4)
			.map((x) => x.node)
			.sort((a, b) => b.hsl.l - a.hsl.l); // Sort for smooth L-gradient

		// Fallback padding if not enough neutrals in pools
		while (lightPool.length < 4) lightPool.push(neutrals[0]);
		while (darkPool.length < 4) darkPool.push(neutrals[neutrals.length - 1]);

		list = [...lightPool, c, ...darkPool];
	} else if (paletteKey === "five") {
		const orderedElements = ["wood", "fire", "earth", "metal", "water"];
		const getFiveElementCandidates = (elem, count) => {
			const candidates = state.colorsDb.filter(
				(oth) => oth.fiveElements === elem && oth.hex !== c.hex,
			);
			return candidates
				.map((cand) => {
					const termDist = getTermDistance(cand.categoryHans, c.categoryHans);
					const lDist = Math.abs(cand.hsl.l - c.hsl.l);
					return { cand, score: termDist * 50 + lDist };
				})
				.sort((a, b) => a.score - b.score)
				.map((x) => x.cand)
				.slice(0, count);
		};

		const fiveList = [];
		orderedElements.forEach((elem) => {
			if (elem === c.fiveElements) {
				fiveList.push(c);
				const additional = getFiveElementCandidates(elem, 1);
				if (additional[0]) fiveList.push(additional[0]);
			} else {
				const candidates = getFiveElementCandidates(elem, 2);
				candidates.forEach((cand) => fiveList.push(cand));
			}
		});

		while (fiveList.length < 9) {
			const fallback = state.colorsDb.find((oth) => !fiveList.some((x) => x.hex === oth.hex));
			if (fallback) fiveList.push(fallback);
			else break;
		}

		list = fiveList.slice(0, 9);
		const actIdx = list.findIndex((x) => x.hex === c.hex);
		if (actIdx !== -1 && actIdx !== 4) {
			const temp = list[4];
			list[4] = list[actIdx];
			list[actIdx] = temp;
		}
	} else if (paletteKey === "complementary") {
		const compHexes = c.recommendedComplements || [];
		const compNodes = compHexes
			.map((hex) => state.colorsDb.find((oth) => oth.hex === hex))
			.filter(Boolean);
		const compColor = compNodes[0] || c;

		const compList = [];
		for (let i = 0; i < 9; i++) {
			const ratio = i / 8;
			const interpL = Math.round(c.hsl.l + (compColor.hsl.l - c.hsl.l) * ratio);
			const interpS = Math.round(c.hsl.s + (compColor.hsl.s - c.hsl.s) * ratio);
			let interpH = c.hsl.h + ratio * (compColor.hsl.h - c.hsl.h);
			if (Math.abs(compColor.hsl.h - c.hsl.h) > 180) {
				if (compColor.hsl.h > c.hsl.h) {
					interpH = (c.hsl.h + 360 + ratio * (compColor.hsl.h - (c.hsl.h + 360))) % 360;
				} else {
					interpH = (c.hsl.h + ratio * (compColor.hsl.h + 360 - c.hsl.h)) % 360;
				}
			}
			const targetHsl = { h: interpH, s: interpS, l: interpL };

			let closest = null;
			let minDist = 999999;
			state.colorsDb.forEach((oth) => {
				const isDupe = compList.some((x) => x.hex === oth.hex);
				let dh = Math.abs(oth.hsl.h - targetHsl.h);
				if (dh > 180) dh = 360 - dh;
				const ds = oth.hsl.s - targetHsl.s;
				const dl = oth.hsl.l - targetHsl.l;
				const dupePenalty = isDupe ? 40 : 0;
				const dist = Math.sqrt(dh * dh + ds * ds * 0.5 + dl * dl * 0.5) + dupePenalty;
				if (dist < minDist) {
					minDist = dist;
					closest = oth;
				}
			});
			compList.push(closest || c);
		}

		const cIdx = compList.findIndex((x) => x.hex === c.hex);
		if (cIdx !== -1 && cIdx !== 4) {
			const temp = compList[4];
			compList[4] = compList[cIdx];
			compList[cIdx] = temp;
		}
		list = compList;
	} else if (paletteKey === "dilution") {
		let gradientSearchWindow = 30;
		let gradientCands = state.colorsDb.filter(
			(oth) => getHueDistance(oth.hsl.h, c.hsl.h) <= gradientSearchWindow && oth.hex !== c.hex,
		);
		if (gradientCands.length < 25) {
			gradientSearchWindow = 50;
			gradientCands = state.colorsDb.filter(
				(oth) => getHueDistance(oth.hsl.h, c.hsl.h) <= gradientSearchWindow && oth.hex !== c.hex,
			);
		}

		let leftPool = gradientCands.filter((oth) => oth.hsl.l > c.hsl.l).sort((a, b) => a.hsl.l - b.hsl.l);
		let rightPool = gradientCands.filter((oth) => oth.hsl.l < c.hsl.l).sort((a, b) => b.hsl.l - a.hsl.l);

		leftPool = [...new Map(leftPool.map((item) => [item.hex, item])).values()];
		rightPool = [...new Map(rightPool.map((item) => [item.hex, item])).values()];

		const TRAD_WHITES = [
			state.colorsDb.find((o) => o.nameHans === "缟羽") || { nameHans: "缟羽", hex: "#EFEFEF", fontColor: "#2F2F2F", hsl: { l: 94 } },
			state.colorsDb.find((o) => o.nameHans === "皦玉") || { nameHans: "皦玉", hex: "#EBEEE8", fontColor: "#2F2F2F", hsl: { l: 92 } },
			state.colorsDb.find((o) => o.nameHans === "吉量") || { nameHans: "吉量", hex: "#EBEDDF", fontColor: "#2F2F2F", hsl: { l: 91 } },
		];

		const TRAD_BLACKS = [
			state.colorsDb.find((o) => o.nameHans === "绀蝶") || { nameHans: "绀蝶", hex: "#2C2F3B", fontColor: "#FFFFFF", hsl: { l: 20 } },
			state.colorsDb.find((o) => o.nameHans === "京元") || { nameHans: "京元", hex: "#31322C", fontColor: "#FFFFFF", hsl: { l: 20 } },
			state.colorsDb.find((o) => o.nameHans === "深大青") || { nameHans: "深大青", hex: "#1A2228", fontColor: "#FFFFFF", hsl: { l: 13 } },
		];

		let leftSelected = [];
		if (leftPool.length >= 4) {
			for (let i = 0; i < 4; i++) {
				leftSelected.push(leftPool[Math.floor((i * (leftPool.length - 1)) / 3)]);
			}
		} else {
			leftSelected = [...leftPool];
			while (leftSelected.length < 4) {
				leftSelected.unshift(TRAD_WHITES[leftSelected.length % TRAD_WHITES.length]);
			}
		}
		leftSelected.sort((a, b) => a.hsl.l - b.hsl.l);

		let rightSelected = [];
		if (rightPool.length >= 4) {
			for (let i = 0; i < 4; i++) {
				rightSelected.push(rightPool[Math.floor((i * (rightPool.length - 1)) / 3)]);
			}
		} else {
			rightSelected = [...rightPool];
			while (rightSelected.length < 4) {
				rightSelected.push(TRAD_BLACKS[rightSelected.length % TRAD_BLACKS.length]);
			}
		}
		rightSelected.sort((a, b) => b.hsl.l - a.hsl.l);

		list = [...leftSelected, c, ...rightSelected];
	} else {
		// misty
		const HUE_FAMILIES = [
			{ key: "red_warm" },
			{ key: "red_cool" },
			{ key: "orange" },
			{ key: "yellow" },
			{ key: "green" },
			{ key: "cyan" },
			{ key: "blue" },
			{ key: "purple" },
			{ key: "pink" },
		];

		const chosenMisty = [];
		const usedMistyHexes = new Set();

		let activeFamilyKey = c.hue || "yellow";
		if (activeFamilyKey === "neutral") activeFamilyKey = "yellow";

		HUE_FAMILIES.forEach((fam) => {
			if (fam.key === activeFamilyKey || activeFamilyKey.includes(fam.key.split("_")[0])) {
				if (!usedMistyHexes.has(c.hex)) {
					chosenMisty.push(c);
					usedMistyHexes.add(c.hex);
					return;
				}
			}

			let candidates = state.colorsDb.filter((oth) => {
				if (usedMistyHexes.has(oth.hex)) return false;
				if (fam.key === "red_warm" || fam.key === "red_cool") return oth.hue === fam.key;
				return oth.hue === fam.key || oth.hue === fam.key.split("_")[0];
			});

			if (candidates.length === 0) {
				candidates = state.colorsDb.filter((oth) => oth.hue === fam.key || oth.hue === fam.key.split("_")[0]);
			}

			let filtered = candidates.filter(
				(oth) => oth.hsl.l >= 40 && oth.hsl.l <= 78 && oth.hsl.s >= 20 && oth.hsl.s <= 65,
			);
			if (filtered.length === 0) filtered = candidates;

			let best = filtered[0];
			let minScore = 999999;
			filtered.forEach((oth) => {
				const termDist = getTermDistance(oth.categoryHans, c.categoryHans);
				const lDist = Math.abs(oth.hsl.l - c.hsl.l);
				const score = termDist * 20 + lDist;
				if (score < minScore) {
					minScore = score;
					best = oth;
				}
			});

			if (best) {
				chosenMisty.push(best);
				usedMistyHexes.add(best.hex);
			}
		});

		while (chosenMisty.length < 9) {
			const fallback = state.colorsDb.find((o) => !usedMistyHexes.has(o.hex) && o.hue === "neutral");
			if (fallback) {
				chosenMisty.push(fallback);
				usedMistyHexes.add(fallback.hex);
			} else break;
		}

		chosenMisty.sort((a, b) => a.hsl.h - b.hsl.h);
		list = chosenMisty.slice(0, 9);
		const cMistyIdx = list.findIndex((x) => x.hex === c.hex);
		if (cMistyIdx !== -1 && cMistyIdx !== 4) {
			const temp = list[4];
			list[4] = list[cMistyIdx];
			list[cMistyIdx] = temp;
		}
	}

	return list;
}

// Renders all 6 intention palettes stacked vertically in the active tab's palettes grid
export function renderPalettes() {
	const c = state.activeViewerColor;
	if (!c) return;

	// Fallback if base color isn't set
	if (!state.activePaletteBaseColor) state.activePaletteBaseColor = c;
	
	const baseColor = state.activePaletteBaseColor;

	// Identify active target container
	let gridId = "groupPalettesGrid";
	if (state.activeMainTab === "seasons") {
		gridId = "seasonPalettesGrid";
	}

	const grid = document.getElementById(gridId);
	if (!grid) return;
	grid.innerHTML = "";

	// Stack all 6 palettes vertically based on the BASE color
	Object.keys(paletteTypes).forEach((key) => {
		const typeInfo = paletteTypes[key];
		const paletteColors = calculatePaletteColors(key, baseColor);

		// Ensure we have 9 colors and sort them strictly by Lightness (Descending)
		// This makes the mapping predictable: [0]=A (Top Left), [1]=B (Top Right)... [8]=I (Bottom Right)
		const sortedColors = [...paletteColors]
			.filter(Boolean)
			.sort((a, b) => b.hsl.l - a.hsl.l);

		// Create palette block container
		const blockContainer = document.createElement("div");
		blockContainer.className = "palette-group-block";

		// Title on top
		const titleEl = document.createElement("div");
		titleEl.className = "palette-group-title";
		titleEl.innerHTML = `${typeInfo.title} <span>${typeInfo.sub}</span>`;
		blockContainer.appendChild(titleEl);

		// Mondrian Bookmark Container
		const bookmark = document.createElement("div");
		bookmark.className = "mondrian-bookmark";

		const blockIds = ["a", "b", "c", "d", "e", "f", "g", "h", "i"];

		sortedColors.forEach((node, idx) => {
			if (!node || idx >= 9) return;
			const blockId = blockIds[idx];
			const card = document.createElement("div");
			
			const isActive = state.activeViewerColor && state.activeViewerColor.hex === node.hex;
			const isDifferentFromBase = node.hex !== baseColor.hex;
			
			card.className = `mondrian-block ${blockId} ${isActive ? "active" : ""}`;
			card.id = `palette-block-${key}-${node.hex.replace("#", "")}`;
			
			const txtColor = node.fontColor || "#FFFFFF";
			card.style.backgroundColor = node.hex;
			card.style.color = txtColor;
			
			card.onclick = () => selectViewerColor(node, "palettes");

			// 1. Color Name
			const nameEl = document.createElement("span");
			nameEl.className = "mondrian-name";
			nameEl.innerText = node.nameHans;
			card.appendChild(nameEl);

			// 2. Clickable Hex Code
			const hexEl = document.createElement("span");
			hexEl.className = "mondrian-hex";
			hexEl.innerText = node.hex;
			hexEl.onclick = (e) => {
				e.stopPropagation();
				copyHexToClipboard(node.hex, e);
			};
			card.appendChild(hexEl);

			// 3. Refresh Indicator (for colors different from base)
			if (isDifferentFromBase) {
				const refreshEl = document.createElement("span");
				refreshEl.className = "mondrian-refresh";
				refreshEl.innerText = "↻";
				refreshEl.title = "以此色重构配盘";
				refreshEl.onclick = (e) => {
					e.stopPropagation();
					reconstructInline(node.hex, e);
				};
				card.appendChild(refreshEl);
			}

			bookmark.appendChild(card);
		});

		blockContainer.appendChild(bookmark);
		grid.appendChild(blockContainer);
	});
}

// Global handler for inline reconstruct button
export function reconstructInline(hex, event) {
	if (event) event.stopPropagation();
	const targetNode = state.colorsDb.find((c) => c.hex === hex);
	if (targetNode) {
		state.activePaletteBaseColor = targetNode;
		renderPalettes();
		showToast(`已将「${targetNode.nameHans}」设为配盘主色！`);
	}
}

