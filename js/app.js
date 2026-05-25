/* ES Module: Core Application Orchestrator & State Manager */

import { renderHueGroups, switchHue } from "./groups.js";
import { renderSeasonalTerms, switchSeasonTerm, switchSeason } from "./seasons.js";
import { renderPalettes, reconstructInline } from "./palettes.js";
import { selectViewerColor } from "./hero.js";

// Utility to manage dynamic scroll shadows (top/bottom fades)
export function initScrollShadows(container) {
	if (!container) return;

	// Remove existing shadows if any (to prevent duplicates on re-render)
	container.querySelectorAll(".scroll-shadow-top, .scroll-shadow-bottom").forEach((s) => s.remove());

	const topShadow = document.createElement("div");
	topShadow.className = "scroll-shadow-top";
	const bottomShadow = document.createElement("div");
	bottomShadow.className = "scroll-shadow-bottom";

	// Append them to the container (order doesn't matter for absolute)
	container.append(topShadow);
	container.append(bottomShadow);

	const update = () => {
		const scrollTop = container.scrollTop;
		const scrollHeight = container.scrollHeight;
		const clientHeight = container.clientHeight;

		// Show top shadow if scrolled down more than 5px
		if (scrollTop > 5) {
			topShadow.classList.add("show");
			topShadow.style.transform = `translateY(${scrollTop}px)`;
		} else {
			topShadow.classList.remove("show");
		}

		// Show bottom shadow if there's more content below (more than 5px)
		if (scrollTop + clientHeight < scrollHeight - 5) {
			bottomShadow.classList.add("show");
			bottomShadow.style.transform = `translateY(${scrollTop + clientHeight - 50}px)`;
		} else {
			bottomShadow.classList.remove("show");
		}
	};

	container.addEventListener("scroll", update);
	// Initial check after a small delay to allow DOM to settle
	setTimeout(update, 10);
}

// Global Shared State (replaces loose variables)
export const state = {
	colorsDb: window.colorsDatabase || [],
	activeMainTab: "groups", // "groups", "seasons", "palettes"
	activeHueFilter: "red_warm", // active hue group under Tab 1
	activeSeason: "春季", // active season under Tab 2
	activeTermFilter: "立春", // active solar term under Tab 2
	activePaletteFilter: "classy", // active palette harmony type under Tab 3
	activeViewerColor: null, // color shown in right-side calligraphic scroll
	activePaletteBaseColor: null, // seed color for mathematical palettes
};

// Classical Hues & Meta Properties
export const hueFamilies = {
	red_warm: {
		nameZh: "朱赤",
		desc: "Warm Red",
		accentHex: "#D94F5E",
		accentRgb: "217, 79, 94",
		lightBg: "rgba(217, 79, 94, 0.05)",
		border: "rgba(217, 79, 94, 0.2)",
		summary: "【朱赤系】主要包含古代的朱砂、朱红、绯红等色泽，视觉张力充沛，是中国传统礼制审美的核心。",
	},
	red_cool: {
		nameZh: "深绛",
		desc: "Cool Red",
		accentHex: "#A43A48",
		accentRgb: "164, 58, 72",
		lightBg: "rgba(164, 58, 72, 0.05)",
		border: "rgba(164, 58, 72, 0.2)",
		summary: "【深绛系】包含胭脂、绛红、深茜等冷调红色，呈现出高贵、内敛、冷艳的染色美学。",
	},
	orange: {
		nameZh: "橙橘",
		desc: "Vibrant Orange",
		accentHex: "#E27E37",
		accentRgb: "226, 126, 55",
		lightBg: "rgba(226, 126, 55, 0.05)",
		border: "rgba(226, 126, 55, 0.2)",
		summary: "【橙橘系】光谱位于亮暖色调。包含经典的杏子、琥珀、橘黄等，色彩明朗亮丽，充满阳光温度。",
	},
	brown: {
		nameZh: "褐赭",
		desc: "Brown & Earth",
		accentHex: "#8B5A3E",
		accentRgb: "139, 90, 62",
		lightBg: "rgba(139, 90, 62, 0.05)",
		border: "rgba(139, 90, 62, 0.2)",
		summary: "【褐赭系】低明度赭石。包含流黄、栗壳等，沉稳沉静，是古代矿物色与大自然的皮壳结晶。",
	},
	yellow: {
		nameZh: "黄",
		desc: "Yellow",
		accentHex: "#D0A010",
		accentRgb: "208, 160, 16",
		lightBg: "rgba(208, 160, 16, 0.05)",
		border: "rgba(208, 160, 16, 0.2)",
		summary: "【黄系】表征泥土与正中之位，也是古代尊贵的御用龙袍正色，尊贵稳定，光芒万丈。",
	},
	green: {
		nameZh: "绿",
		desc: "Green",
		accentHex: "#358C59",
		accentRgb: "53, 140, 89",
		lightBg: "rgba(53, 140, 89, 0.05)",
		border: "rgba(53, 140, 89, 0.2)",
		summary: "【绿系】代表繁茂的森林、春季草木的新生与翡翠绿玉。色彩清新、自然，饱和度饱满。",
	},
	cyan: {
		nameZh: "青翠",
		desc: "Cyan & Teal",
		accentHex: "#1C7A8C",
		accentRgb: "28, 122, 140",
		lightBg: "rgba(28, 122, 140, 0.05)",
		border: "rgba(28, 122, 140, 0.2)",
		summary: "【青翠系】代表中国古典审美中最具写意感的「青」色，烟雨朦胧，苍筤缥缈。",
	},
	blue: {
		nameZh: "蓝黛",
		desc: "Blue & Indigo",
		accentHex: "#23448E",
		accentRgb: "35, 68, 142",
		lightBg: "rgba(35, 68, 142, 0.05)",
		border: "rgba(35, 68, 142, 0.2)",
		summary: "【蓝黛系】包含天然石青、青黛、靛蓝等，表征夜空的广袤无垠与深海的幽邃。",
	},
	purple: {
		nameZh: "紫",
		desc: "Purple",
		accentHex: "#834895",
		accentRgb: "131, 72, 149",
		lightBg: "rgba(131, 72, 149, 0.05)",
		border: "rgba(131, 72, 149, 0.2)",
		summary: "【紫系】表征「紫气东来」的祥瑞，由于植物染料珍稀，极显高贵、稀有之质。",
	},
	pink: {
		nameZh: "粉绛",
		desc: "Pink",
		accentHex: "#DC6B82",
		accentRgb: "220, 107, 130",
		lightBg: "rgba(220, 107, 130, 0.05)",
		border: "rgba(220, 107, 130, 0.2)",
		summary: "【粉绛系】包含桃花、杨妃、长春等娇美色彩，散发出春天百花争艳的柔美与勃发生机。",
	},
	neutral: {
		nameZh: "灰白",
		desc: "Neutral",
		accentHex: "#6D6E70",
		accentRgb: "109, 110, 112",
		lightBg: "rgba(109, 110, 112, 0.05)",
		border: "rgba(109, 110, 112, 0.2)",
		summary: "【灰白系】低饱和度、极亮或极暗的白、素色与煤黑，是传统水墨留白的基准底色。",
	},
};

// 24 Solar Terms Meta Arrays
export const CHRONO_TERMS = [
	{ name: "立春", py: "Lichun", season: "春季", desc: "时令之首，阳气萌生，<br>林木始动，春风拂绿。" },
	{ name: "雨水", py: "Yushui", season: "春季", desc: "冰雪消融，细雨随风，<br>草木萌动，万物复苏。" },
	{ name: "惊蛰", py: "Jingzhe", season: "春季", desc: "春雷始鸣，蛰虫惊醒，<br>红花渐开，桃李竞芳。" },
	{ name: "春分", py: "Chunfen", season: "春季", desc: "昼夜均等，微风徐徐，<br>草长莺飞，白鹭翻飞。" },
	{ name: "清明", py: "Qingming", season: "春季", desc: "万物洁齐，天清地明，<br>采茶踏青，烟雨柳绿。" },
	{ name: "谷雨", py: "Guyu", season: "春季", desc: "雨生百谷，暮春将尽，<br>牡丹吐蕊，绿荫渐浓。" },

	{ name: "立夏", py: "Lixia", season: "夏季", desc: "夏之伊始，白昼渐长，<br>万物繁茂，新蝉初鸣。" },
	{ name: "小满", py: "Xiaoman", season: "夏季", desc: "江河渐满，麦粒始满，<br>绿树成荫，荷池初动。" },
	{ name: "芒种", py: "Mangzhong", season: "夏季", desc: "麦浪翻滚，稻秧始播，<br>蝉鸣声声，夏花灿烂。" },
	{ name: "夏至", py: "Xiazhi", season: "夏季", desc: "日影极短，夏夜极凉，<br>稻香蛙鸣，满池朱莲。" },
	{ name: "小暑", py: "Xiaoshu", season: "夏季", desc: "温风始至，伏蝉喧嚣，<br>雷雨阵阵，幽荷溢香。" },
	{ name: "大暑", py: "Dashu", season: "夏季", desc: "热浪极盛，萤火夜飞，<br>大雨时行，万物繁茂。" },

	{ name: "立秋", py: "Liqiu", season: "秋季", desc: "凉风习习，金黄遍野，<br>梧桐落叶，晨露初凝。" },
	{ name: "处暑", py: "Chushu", season: "秋季", desc: "秋意初来，暑气渐消，<br>天高云淡，稻谷飘香。" },
	{ name: "白露", py: "Bailu", season: "秋季", desc: "阴气始重，凝而成露，<br>雁南飞去，金秋凝霜。" },
	{ name: "秋分", py: "Qiufen", season: "秋季", desc: "昼夜均分，秋风萧瑟，<br>桂花飘香，韶粉铺地。" },
	{ name: "寒露", py: "Hanlu", season: "秋季", desc: "露水渐寒，凝结将冰，<br>枫红遍野，菊蕊飘香。" },
	{ name: "霜降", py: "Shuangjiang", season: "秋季", desc: "气肃而凝，露结为霜，<br>万物凋零，傲骨红柿。" },

	{ name: "立冬", py: "Lidong", season: "冬季", desc: "冬之伊始，朔风怒号，<br>水始成冰，万物归藏。" },
	{ name: "小雪", py: "Xiaoxue", season: "冬季", desc: "天降初雪，寒气渐重，<br>松柏长青，腊梅含苞。" },
	{ name: "大雪", py: "Daxue", season: "冬季", desc: "积雪铺地，寒风呼啸，<br>江河封冻，炉火焙茶。" },
	{ name: "冬至", py: "Dongzhi", season: "冬季", desc: "日影极长，冬夜极深，<br>阴极阳生，腊鼓声声。" },
	{ name: "小寒", py: "Xiaohan", season: "冬季", desc: "寒积至深, 冰冻三尺, 梅花绽蕊, 水仙初吐。" },
	{ name: "大寒", py: "Dahan", season: "冬季", desc: "岁暮大寒, 积雪不融, 冰雕玉琢, 静候春归。" },
];

// Intention Harmony types
export const paletteTypes = {
	classy: { title: "相依", sub: "Analogous" },
	spot: { title: "留白", sub: "Accent" },
	five: { title: "相生", sub: "Balance" },
	complementary: { title: "交错", sub: "Contrast" },
	dilution: { title: "淡墨", sub: "Gradient" },
	misty: { title: "烟雨", sub: "Misty" },
};

// Swaps Main top-level Tab Displays
export function switchMainTab(tabId) {
	state.activeMainTab = tabId;

	// Reset nav buttons style
	document.querySelectorAll(".nav-tab-btn").forEach((btn) => {
		btn.classList.remove("active");
	});
	const activeBtn = document.getElementById(`main-tab-${tabId}`);
	if (activeBtn) activeBtn.classList.add("active");

	// Show correct tab pane container
	document.querySelectorAll(".tab-content").forEach((panel) => {
		panel.style.display = "none";
	});
	const targetPanel = document.getElementById(
		`tabContent${tabId.charAt(0).toUpperCase() + tabId.slice(1)}`,
	);
	if (targetPanel) {
		targetPanel.style.display = "flex";
	}

	// Reset search input on navigation switch
	const searchInput = document.getElementById("searchInput");
	if (searchInput && searchInput.value) {
		searchInput.value = "";
		const searchIcon = document.getElementById("searchIcon");
		if (searchIcon) {
			searchIcon.innerText = "搜";
			searchIcon.style.pointerEvents = "none";
			searchIcon.onclick = null;
		}
	}

	// Silent Synchronization: Ensure the tab we are switching to is focused on the active color
	if (state.activeViewerColor) {
		if (tabId === "groups" && state.activeHueFilter !== state.activeViewerColor.hue) {
			state.activeHueFilter = state.activeViewerColor.hue;
			renderHueGroups(); // Update the horizontal tags
		} else if (tabId === "seasons" && state.activeTermFilter !== state.activeViewerColor.categoryHans) {
			// Find which season this term belongs to
			const termMeta = CHRONO_TERMS.find(t => t.name === state.activeViewerColor.categoryHans);
			if (termMeta) {
				state.activeSeason = termMeta.season;
				state.activeTermFilter = termMeta.name;
			}
		}
	}

	// Specific tab active rendering hooks
	if (tabId === "groups") {
		// Re-trigger the active hue to render the grid and scroll shadow
		if (window.switchHue && state.activeHueFilter) {
			window.switchHue(state.activeHueFilter, state.activeViewerColor);
		}
	} else if (tabId === "seasons") {
		renderSeasonalTerms();
	}
	
	renderPalettes();
}

// Global premium fuzzy search handles pinyin, names, and hex codes
export function handleSearch() {
	const searchInput = document.getElementById("searchInput");
	if (!searchInput) return;
	const query = searchInput.value.trim().toLowerCase();
	const searchIcon = document.getElementById("searchIcon");
	const searchContent = document.getElementById("tabContentSearch");

	if (!query) {
		if (searchIcon) {
			searchIcon.innerText = "搜";
			searchIcon.style.pointerEvents = "none";
			searchIcon.onclick = null;
		}
		if (searchContent) searchContent.style.display = "none";

		// Direct user back to previous active tab
		switchMainTab(state.activeMainTab);
		return;
	}

	if (searchIcon) {
		searchIcon.innerText = "✕";
		searchIcon.style.pointerEvents = "auto";
		searchIcon.onclick = () => {
			searchInput.value = "";
			handleSearch();
		};
	}

	// Hide standard containers
	document.querySelectorAll(".tab-content").forEach((panel) => {
		panel.style.display = "none";
	});
	if (searchContent) searchContent.style.display = "flex";

	const matches = state.colorsDb.filter((c) => {
		const nameHans = (c.nameHans || "").toLowerCase();
		const nameHant = (c.nameHant || "").toLowerCase();
		const namePy = (c.namePy || "").toLowerCase();
		const hex = (c.hex || "").toLowerCase();

		return (
			nameHans.includes(query) ||
			nameHant.includes(query) ||
			namePy.includes(query) ||
			hex.includes(query)
		);
	});

	const colLeft = document.getElementById("searchColLeft");
	const colRight = document.getElementById("searchColRight");
	if (!colLeft || !colRight) return;
	colLeft.innerHTML = "";
	colRight.innerHTML = "";

	// Group into chunks of 6
	const chunks = [];
	for (let i = 0; i < matches.length; i += 6) {
		chunks.push(matches.slice(i, i + 6));
	}

	chunks.forEach((chunk, chunkIndex) => {
		const groupContainer = document.createElement("div");
		groupContainer.className = "ribbon-group-6";
		
		chunk.forEach((c) => {
			const card = document.createElement("div");
			const isActive = state.activeViewerColor && state.activeViewerColor.hex === c.hex;
			card.className = `ribbon-swatch-strip ${isActive ? "active" : ""}`;
			card.id = `search-swatch-${c.hex.replace("#", "")}`;
			
			const txtColor = c.fontColor || "#FFFFFF";
			card.style.backgroundColor = c.hex;
			card.style.color = txtColor;
			
			card.onclick = () => selectViewerColor(c, "search");

			card.innerHTML = `
				<div class="ribbon-swatch-left-group">
					<span class="ribbon-swatch-name">${c.nameHans}</span>
				</div>
				<span class="ribbon-swatch-hex" onclick="copyHexToClipboard('${c.hex}', event)" title="点击复制">${c.hex}</span>
			`;
			groupContainer.appendChild(card);
		});

		// Distribute evenly between left and right columns
		if (chunkIndex % 2 === 0) {
			colLeft.appendChild(groupContainer);
		} else {
			colRight.appendChild(groupContainer);
		}
	});

	// Deliberately DO NOT auto-select a color here. We wait for user click.
	// Deliberately DO NOT init scroll shadows for the search layout to keep it clean.
}

// Global copy utility for hex codes on cards
export function copyHexToClipboard(hex, event) {
	if (event) event.stopPropagation(); // Prevent the parent card click
	navigator.clipboard.writeText(hex).then(() => {
		showToast(`已复制色号: ${hex}`);
	});
}

// Toast notification module
export function showToast(msg) {
	const toast = document.getElementById("toast");
	if (toast) {
		toast.innerText = msg;
		toast.classList.add("show");
		setTimeout(() => toast.classList.remove("show"), 2500);
	}
}

// Bind load hooks and startup configurations
window.addEventListener("DOMContentLoaded", () => {
	// Sync data variables reference
	state.colorsDb = window.colorsDatabase || [];

	// Render startup states
	renderHueGroups();
	renderSeasonalTerms();
	renderPalettes();

	// Load first color in right vertical scroll panel by default
	if (state.colorsDb.length > 0) {
		state.activeViewerColor = state.colorsDb[0];
		state.activePaletteBaseColor = state.colorsDb[0];
		selectViewerColor(state.colorsDb[0]);
	}

	switchMainTab("groups");
	switchHue("red_warm");
});

// Explicitly bind handlers to window object for inline HTML event hook support
window.switchMainTab = switchMainTab;
window.handleSearch = handleSearch;
window.copyHexToClipboard = copyHexToClipboard;
window.reconstructInline = reconstructInline;
window.switchHue = switchHue;
window.switchSeasonTerm = switchSeasonTerm;
window.switchSeason = switchSeason;
window.switchActivePalette = renderPalettes; // Directly loads the palettes panel renderer

// Global ESC key listener to clear search and return to previous state
window.addEventListener("keydown", (e) => {
	if (e.key === "Escape") {
		const searchInput = document.getElementById("searchInput");
		if (searchInput && searchInput.value) {
			searchInput.value = "";
			handleSearch();
			searchInput.blur();
		}
	}
});
