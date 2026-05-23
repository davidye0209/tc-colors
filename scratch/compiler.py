#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Chinese Traditional Colors Database Compiler (V4)
Author: Antigravity AI
Processes raw colors.json (384 colors from the Forbidden City) and generates
highly enriched databases with precomputed HSL recommendations and the traditional
Five Elements Pentachromatic system (五行五色).
"""

import os
import json
import math
import pypinyin
import zhconv

# Solar term Chinese-to-English Pinyin slug mapping
TERM_SLUG_MAP = {
    '立春': 'lichun', '雨水': 'yushui', '驚蟄': 'jingzhe', '惊蛰': 'jingzhe',
    '春分': 'chunfen', '清明': 'qingming', '穀雨': 'guyu', '谷雨': 'guyu',
    '立夏': 'lixia', '小滿': 'xiaoman', '小满': 'xiaoman', '芒種': 'mangzhong',
    '芒种': 'mangzhong', '夏至': 'xiazhi', '小暑': 'xiaoshu', '大暑': 'dashu',
    '立秋': 'liqiu', '處暑': 'chushu', '处暑': 'chushu', '白露': 'bailu',
    '秋分': 'qiufen', '寒露': 'hanlu', '霜降': 'shuangjiang', '立冬': 'lidong',
    '小雪': 'xiaoxue', '大雪': 'daxue', '冬至': 'dongzhi', '小寒': 'xiaohan',
    '大寒': 'dahan'
}

def hex_to_hsl(hex_str):
    """Converts a hex color code to HSL (Hue, Saturation, Lightness)."""
    hex_str = hex_str.lstrip('#')
    r, g, b = [int(hex_str[i:i+2], 16) / 255.0 for i in (0, 2, 4)]
    max_c, min_c = max(r, g, b), min(r, g, b)
    h = s = l = (max_c + min_c) / 2.0
    
    if max_c == min_c:
        h = s = 0.0
    else:
        d = max_c - min_c
        s = d / (2.0 - max_c - min_c) if l > 0.5 else d / (max_c + min_c)
        if max_c == r:
            h = (g - b) / d + (6.0 if g < b else 0.0)
        elif max_c == g:
            h = (b - r) / d + 2.0
        elif max_c == b:
            h = (r - g) / d + 4.0
        h /= 6.0
        
    return round(h * 360), round(s * 100), round(l * 100)

def get_distance(hsl1, hsl2):
    """Calculates weighted Euclidean distance in HSL space, accounting for circularity."""
    dh = abs(hsl1[0] - hsl2[0])
    if dh > 180:
        dh = 360 - dh
    ds = (hsl1[1] - hsl2[1]) * 0.5
    dl = (hsl1[2] - hsl2[2]) * 0.5
    return math.sqrt(dh*dh + ds*ds + dl*dl)

def classify_hue(h, s, l):
    """Classifies a color into one of 11 modern, scientifically-balanced families."""
    if s < 13 or l < 15 or l > 88:
        return 'neutral'
        
    if h < 18 or h >= 342:
        if h < 9 or h >= 351:
            return 'red_warm'  # 朱赤系
        else:
            return 'red_cool'  # 深绛系
            
    if h >= 18 and h < 46:
        if l >= 48:
            return 'orange'    # 橙橘系
        else:
            return 'brown'     # 褐赭系
            
    if h >= 46 and h < 75:
        return 'yellow'        # 黄系
        
    if h >= 75 and h < 165:
        return 'green'         # 绿系
        
    if h >= 165 and h < 255:
        if h < 205:
            return 'cyan'      # 青翠系
        else:
            return 'blue'      # 蓝黛系
            
    if h >= 255 and h < 300:
        return 'purple'        # 紫系
        
    if h >= 300 and h < 342:
        return 'pink'          # 粉绛系
        
    return 'neutral'

def classify_five_elements(h, s, l):
    """
    Classifies a color into one of the traditional 5 elements:
    wood (青), fire (赤), earth (黄), metal (白), water (黑)
    """
    # Whites and light neutrals (Metal - 白)
    if l >= 70 and s < 30:
        return 'metal'
    # Blacks and deep darks (Water - 黑)
    if l < 25:
        return 'water'
    
    # Hues mapping
    if h < 18 or h >= 342:
        return 'fire'  # 赤
    elif h >= 18 and h < 46:
        if h < 30:
            return 'fire'  # 赤 (reddish browns)
        return 'earth'     # 黄 (yellowish browns)
    elif h >= 46 and h < 75:
        return 'earth'     # 黄
    elif h >= 75 and h < 255:
        return 'wood'      # 青 (Greens, Cyans, Blues)
    elif h >= 255 and h < 300:
        return 'water'     # 黑 (historically purple represents Water/Mysterious Hēi)
    else:
        return 'fire'      # 赤 (Pink)

def calculate_font_color(hex_str):
    """Calculates optimal typography font color based on relative luminance."""
    hex_str = hex_str.lstrip('#')
    r, g, b = [int(hex_str[i:i+2], 16) for i in (0, 2, 4)]
    
    rs = [x / 255.0 for x in (r, g, b)]
    rgbs = []
    for val in rs:
        if val <= 0.03928:
            rgbs.append(val / 12.92)
        else:
            rgbs.append(((val + 0.055) / 1.055) ** 2.4)
            
    luminance = 0.2126 * rgbs[0] + 0.7152 * rgbs[1] + 0.0722 * rgbs[2]
    
    if luminance > 0.45:
        return '#2F2F2F'
    else:
        return '#FFFFFF'

def get_pinyin_slug(chinese_str):
    """Converts a name to uppercase spaced Pinyin (e.g. HUANG BAI YOU)."""
    simplified = zhconv.convert(chinese_str, 'zh-hans')
    py_list = pypinyin.pinyin(simplified, style=pypinyin.Style.NORMAL)
    return ' '.join([item[0] for item in py_list]).upper()

def compile_database():
    source_file = '../colors.json'
    if not os.path.exists(source_file):
        source_file = 'colors.json'
        
    print(f"Reading raw database from {source_file}...")
    with open(source_file, 'r', encoding='utf-8') as f:
        raw_data = json.load(f)
        
    # Phase 1: Build basic list & HSL mappings
    initial_list = []
    for sublist in raw_data:
        for c in sublist:
            name_hant = c['name']
            name_hans = zhconv.convert(name_hant, 'zh-hans')
            
            cat_hant = c['category']
            cat_hans = zhconv.convert(cat_hant, 'zh-hans')
            
            term_slug = TERM_SLUG_MAP.get(cat_hans, cat_hans)
            hex_code = c['hex'].upper()
            
            h, s, l = hex_to_hsl(hex_code)
            hue_group = classify_hue(h, s, l)
            five_elem = classify_five_elements(h, s, l)
            font_color = calculate_font_color(hex_code)
            name_py = get_pinyin_slug(name_hans)
            
            enriched_color = {
                'nameHans': name_hans,
                'nameHant': name_hant,
                'namePy': name_py,
                'categoryHans': cat_hans,
                'categoryHant': cat_hant,
                'term': term_slug,
                'hex': hex_code,
                'rgb': {
                    'r': c['r'],
                    'g': c['g'],
                    'b': c['b']
                },
                'hsl': {
                    'h': h,
                    's': s,
                    'l': l
                },
                'hue': hue_group,
                'fiveElements': five_elem,
                'sentenceHans': zhconv.convert(c['sentence'], 'zh-hans'),
                'sentenceHant': zhconv.convert(c['sentence'], 'zh-hant'),
                'authorHans': zhconv.convert(c['author'], 'zh-hans'),
                'authorHant': zhconv.convert(c['author'], 'zh-hant'),
                'sentenceFromHans': zhconv.convert(c['sentenceFrom'], 'zh-hans'),
                'sentenceFromHant': zhconv.convert(c['sentenceFrom'], 'zh-hant'),
                'fontColor': font_color
            }
            initial_list.append(enriched_color)
            
    # Phase 2: Compute Euclidean HSL Recommendations
    flat_list = []
    for current in initial_list:
        cur_hex = current['hex']
        cur_hsl = (current['hsl']['h'], current['hsl']['s'], current['hsl']['l'])
        
        # Calculate distances against all other colors
        comparisons = []
        for other in initial_list:
            if other['hex'] == cur_hex:
                continue
            
            oth_hsl = (other['hsl']['h'], other['hsl']['s'], other['hsl']['l'])
            dh = abs(cur_hsl[0] - oth_hsl[0])
            if dh > 180:
                dh = 360 - dh
                
            dist = get_distance(cur_hsl, oth_hsl)
            comparisons.append((other['hex'], dh, dist))
            
        # 1. Shades: same hue band (dh <= 18)
        shades_list = [x for x in comparisons if x[1] <= 18]
        shades_list = sorted(shades_list, key=lambda x: x[2])[:4]
        current['recommendedShades'] = [x[0] for x in shades_list]
        
        # 2. Neighbors: adjacent hue (18 < dh <= 45)
        neighbors_list = [x for x in comparisons if 18 < x[1] <= 45]
        neighbors_list = sorted(neighbors_list, key=lambda x: x[2])[:4]
        current['recommendedNeighbors'] = [x[0] for x in neighbors_list]
        
        # 3. Complements: opposite hue
        target_comp_hue = (cur_hsl[0] + 180) % 360
        complements_list = sorted(comparisons, key=lambda x: (
            abs(hex_to_hsl(x[0])[0] - target_comp_hue) if abs(hex_to_hsl(x[0])[0] - target_comp_hue) <= 180 
            else 360 - abs(hex_to_hsl(x[0])[0] - target_comp_hue)
        ))[:4]
        current['recommendedComplements'] = [x[0] for x in complements_list]
        
        flat_list.append(current)
        
    # Phase 3: Build Grouped Structure
    chrono_terms = [
        '立春', '雨水', '惊蛰', '春分', '清明', '谷雨',
        '立夏', '小满', '芒种', '夏至', '小暑', '大暑',
        '立秋', '处暑', '白露', '秋分', '寒露', '霜降',
        '立冬', '小雪', '大雪', '冬至', '小寒', '大寒'
    ]
    sorted_grouped = []
    for ct in chrono_terms:
        term_colors = [c for c in flat_list if c['categoryHans'] == ct]
        if term_colors:
            sorted_grouped.append(term_colors)
            
    print(f"Processed {len(flat_list)} enriched colors across {len(sorted_grouped)} solar terms successfully!")
    
    # Save flat JSON database
    flat_path = '../colors_flat.json' if source_file == '../colors.json' else 'colors_flat.json'
    with open(flat_path, 'w', encoding='utf-8') as f:
        json.dump(flat_list, f, ensure_ascii=False, indent=2)
    print(f"Saved flat JSON database to: {flat_path}")
    
    # Save grouped JSON
    grouped_path = '../colors_grouped.json' if source_file == '../colors.json' else 'colors_grouped.json'
    with open(grouped_path, 'w', encoding='utf-8') as f:
        json.dump(sorted_grouped, f, ensure_ascii=False, indent=2)
    print(f"Saved grouped JSON database to: {grouped_path}")
    
    # Save colors.js (Module format)
    js_path = '../colors.js' if source_file == '../colors.json' else 'colors.js'
    
    hue_names = {
        'red_warm': '朱赤系 (Warm Red)',
        'red_cool': '深绛系 (Cool Red)',
        'orange': '橙橘系 (Vibrant Orange)',
        'brown': '褐赭系 (Brown & Earth)',
        'yellow': '黄系 (Yellow)',
        'green': '绿系 (Green)',
        'cyan': '青翠系 (Cyan & Teal)',
        'blue': '蓝黛系 (Blue & Indigo)',
        'purple': '紫系 (Purple)',
        'pink': '粉绛系 (Pink)',
        'neutral': '灰白系 (Neutral)'
    }
    
    with open(js_path, 'w', encoding='utf-8') as f:
        f.write("/**\n * Chinese Traditional Colors Database with Precomputed HSL Recommendations\n * Total: 384 colors grouped by 24 Solar Terms\n */\n\n")
        f.write("export const hueFamilies = ")
        json.dump(hue_names, f, ensure_ascii=False, indent=2)
        f.write(";\n\n")
        f.write("export const colorsDatabase = ")
        json.dump(flat_list, f, ensure_ascii=False, indent=2)
        f.write(";\n")
    print(f"Saved JS Module database to: {js_path}")
    
    # Save colors_db.js (Browser Global format)
    db_js_path = '../colors_db.js' if source_file == '../colors.json' else 'colors_db.js'
    with open(db_js_path, 'w', encoding='utf-8') as f:
        f.write("/**\n * Chinese Traditional Colors Database (Browser Global Format)\n * Total: 384 colors grouped by 24 Solar Terms\n */\n\n")
        f.write("window.hueFamilies = ")
        json.dump(hue_names, f, ensure_ascii=False, indent=2)
        f.write(";\n\n")
        f.write("window.colorsDatabase = ")
        json.dump(flat_list, f, ensure_ascii=False, indent=2)
        f.write(";\n")
    print(f"Saved Global JS database to: {db_js_path}")
    
    # Self-validation check
    print("\n--- Running Database Validation Report ---")
    errors = 0
    
    if len(flat_list) != 384:
        print(f"ERROR: Expected 384 items, got {len(flat_list)}")
        errors += 1
    else:
        print("✓ Item count is exactly 384.")
        
    elem_counts = {}
    for c in flat_list:
        elem_counts[c['fiveElements']] = elem_counts.get(c['fiveElements'], 0) + 1
        
    print("\nFive Elements distribution validation:")
    for el, count in elem_counts.items():
        print(f"  - {el:10s}: {count:3d} colors")
        
    print(f"\nValidation completed: {errors} Errors.")
    if errors == 0:
        print("★★★ DATABASE WITH FIVE ELEMENTS INTEGRATED SUCCESSFULLY ★★★")

if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    compile_database()
