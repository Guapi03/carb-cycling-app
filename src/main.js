// src/main.js
import { supabase } from './lib/supabase.js'
import { i18n } from './i18n.js'
import {
    dbFetchFoodsAndFavorites,
    dbToggleFavorite,
    dbLoadProfileAndLogs,
    dbSaveProfile,
    dbInsertFoodEntry,
    dbDeleteFoodEntry,
    dbClearTodayLogs,
    dbInsertCustomFood,
    dbSyncDailyLog
} from './db.js'

import { calculateBMI, computeCycleState, calculateMacroTargets, getTodayStrUTC8 } from './calc.js'
import { startClock, toggleModal, updateDietPlanCardsUI, handleImageUrlInput, handleImageFileSelect } from './ui.js'

let currentLang = 'zh';
let currentUser = null;
let isRegisterMode = false;
let activeMealCategory = 'breakfast';
let activeFoodTab = 'all';

let currentViewDate = getTodayStrUTC8();
let userProfile = { weight: 74, height: 175, age: 23, cycle_start_date: getTodayStrUTC8(), diet_plan: 'carb_cycling' };
let foodEntries = [];
let dbFoods = [];
let favIds = new Set();

let activeSelectedFood = null;
let customImageBase64 = '';

let fpViewDateInstance = null;
let fpStartDateInstance = null;

function setCustomImageBase64(val) {
    customImageBase64 = val;
}

// --- App Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    bindEvents();
    initFlatpickers();
});

function initApp() {
    startClock(() => currentLang);

    supabase.auth.onAuthStateChange((event, session) => {
        if (session && session.user) {
            currentUser = session.user;
            toggleModal('auth-modal', false);

            const profileBtn = document.getElementById('btn-open-profile');
            if (profileBtn) {
                profileBtn.classList.remove('hidden');
                profileBtn.classList.add('flex');
            }

            const logoutBtn = document.getElementById('btn-logout');
            if (logoutBtn) logoutBtn.classList.remove('hidden');

            document.getElementById('user-email-text').innerText = currentUser.email;
            loadProfileAndLogs();
        } else {
            currentUser = null;
            document.getElementById('btn-open-profile').classList.add('hidden');
            document.getElementById('btn-logout').classList.add('hidden');
            toggleModal('auth-modal', true);
        }
    });
}

function initFlatpickers() {
    if (typeof flatpickr === 'undefined') return;

    fpViewDateInstance = flatpickr("#btn-date-trigger", {
        locale: currentLang === 'zh' ? 'zh' : 'default',
        dateFormat: "Y-m-d",
        defaultDate: currentViewDate,
        disableMobile: true,
        onChange: function(selectedDates, dateStr) {
            setViewDate(dateStr);
        }
    });

    fpStartDateInstance = flatpickr("#cycle-start-date", {
        locale: currentLang === 'zh' ? 'zh' : 'default',
        dateFormat: "Y-m-d",
        defaultDate: userProfile.cycle_start_date || getTodayStrUTC8(),
        disableMobile: true
    });
}

function bindEvents() {
    document.getElementById('auth-form').addEventListener('submit', handleAuthSubmit);
    document.getElementById('btn-toggle-auth').addEventListener('click', toggleAuthMode);
    document.getElementById('btn-logout').addEventListener('click', () => supabase.auth.signOut());

    document.getElementById('btn-prev-day')?.addEventListener('click', () => changeViewDate(-1));
    document.getElementById('btn-next-day')?.addEventListener('click', () => changeViewDate(1));
    document.getElementById('btn-today-shortcut')?.addEventListener('click', () => setViewDate(getTodayStrUTC8()));

    document.getElementById('lang-btn').addEventListener('click', toggleLanguage);
    document.getElementById('btn-open-profile').addEventListener('click', openProfileModal);
    document.getElementById('btn-edit-profile-shortcut').addEventListener('click', openProfileModal);
    document.getElementById('btn-close-profile').addEventListener('click', closeProfileModal);
    document.getElementById('btn-cancel-profile').addEventListener('click', closeProfileModal);
    document.getElementById('profile-form').addEventListener('submit', handleProfileSubmit);

    document.getElementById('btn-set-today').addEventListener('click', () => {
        const today = getTodayStrUTC8();
        if (fpStartDateInstance) {
            fpStartDateInstance.setDate(today);
        } else {
            document.getElementById('cycle-start-date').value = today;
        }
    });

    document.querySelectorAll('input[name="diet_plan"]').forEach(radio => {
        radio.addEventListener('change', (e) => updateDietPlanCardsUI(e.target.value));
    });

    document.getElementById('tab-btn-all').addEventListener('click', () => switchFoodTab('all'));
    document.getElementById('tab-btn-fav').addEventListener('click', () => switchFoodTab('fav'));
    document.getElementById('tab-btn-recent').addEventListener('click', () => switchFoodTab('recent'));

    document.getElementById('btn-close-food-modal').addEventListener('click', closeFoodSelectModal);
    document.getElementById('food-search-input').addEventListener('input', renderPresetFoodList);

    document.getElementById('btn-open-custom-food').addEventListener('click', openCustomFoodModal);
    document.getElementById('btn-close-custom-modal').addEventListener('click', closeCustomFoodModal);
    document.getElementById('custom-food-form').addEventListener('submit', handleCustomFoodSubmit);

    document.getElementById('custom-img-url-input').addEventListener('input', (e) => handleImageUrlInput(e, setCustomImageBase64));
    document.getElementById('custom-img-file-input').addEventListener('change', (e) => handleImageFileSelect(e, setCustomImageBase64));

    document.getElementById('btn-close-portion-modal').addEventListener('click', closePortionModal);
    document.getElementById('portion-grams-input').addEventListener('input', updatePortionCalculations);
    document.getElementById('btn-step-minus').addEventListener('click', () => adjustGrams(-10));
    document.getElementById('btn-step-plus').addEventListener('click', () => adjustGrams(10));
    document.getElementById('btn-confirm-save-portion').addEventListener('click', savePortionToLog);

    document.getElementById('btn-clear-today').addEventListener('click', clearTodayLog);
}

// 转换星期几字符串（适配中英文）
function getWeekdayName(dateStr, lang) {
    const zhDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const enDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const d = new Date(dateStr);
    const dayIdx = d.getDay();
    return lang === 'zh' ? (zhDays[dayIdx] || '') : (enDays[dayIdx] || '');
}

function changeViewDate(offsetDays) {
    const d = new Date(currentViewDate);
    d.setDate(d.getDate() + offsetDays);
    setViewDate(d.toISOString().split('T')[0]);
}

async function setViewDate(dateStr) {
    if (!dateStr) return;
    currentViewDate = dateStr;

    if (fpViewDateInstance) {
        fpViewDateInstance.setDate(currentViewDate, false);
    }

    const displayEl = document.getElementById('view-date-display');
    if (displayEl) {
        displayEl.innerText = `${currentViewDate} (${getWeekdayName(currentViewDate, currentLang)})`;
    }

    const todayStr = getTodayStrUTC8();
    const shortcutBtn = document.getElementById('btn-today-shortcut');
    const badge = document.getElementById('date-status-badge');
    const t = i18n[currentLang];

    if (shortcutBtn) {
        if (currentViewDate === todayStr) {
            shortcutBtn.classList.add('hidden');
            if (badge) badge.innerText = t.today_record;
        } else {
            shortcutBtn.classList.remove('hidden');
            if (badge) badge.innerText = `${currentLang === 'zh' ? '补记' : 'Log'}: ${currentViewDate}`;
        }
    }

    if (currentUser) {
        const { profile, entries } = await dbLoadProfileAndLogs(currentUser.id, currentViewDate);
        if (profile) userProfile = profile;
        foodEntries = entries;
    }

    recalculateAndRender();
}

function switchFoodTab(tab) {
    activeFoodTab = tab;
    const tabs = { 'all': 'tab-btn-all', 'fav': 'tab-btn-fav', 'recent': 'tab-btn-recent' };

    Object.keys(tabs).forEach(t => {
        const btn = document.getElementById(tabs[t]);
        if (btn) {
            btn.className = (t === tab) ? "food-tab-btn active" : "food-tab-btn";
        }
    });

    renderPresetFoodList();
}

function toggleAuthMode() {
    isRegisterMode = !isRegisterMode;
    const t = i18n[currentLang];
    document.getElementById('auth-modal-title').innerText = isRegisterMode ? t.auth_register_title : t.auth_login_title;
    document.getElementById('auth-submit-btn').innerText = isRegisterMode ? t.btn_go_register : t.btn_login;
    document.getElementById('btn-toggle-auth').innerText = isRegisterMode ? t.btn_login : t.btn_go_register;
    document.getElementById('auth-switch-prompt').innerText = isRegisterMode ? t.auth_prompt_has_account : t.auth_prompt_no_account;
}

async function handleAuthSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const msgEl = document.getElementById('auth-msg');

    msgEl.className = "text-xs text-center font-medium block text-indigo-600";
    msgEl.innerText = "Processing...";

    if (isRegisterMode) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) {
            msgEl.className = "text-xs text-center font-medium block text-rose-500";
            msgEl.innerText = error.message;
        } else {
            msgEl.className = "text-xs text-center font-medium block text-emerald-600";
            msgEl.innerText = "Verification email sent.";
        }
    } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            msgEl.className = "text-xs text-center font-medium block text-rose-500";
            msgEl.innerText = error.message;
        }
    }
}

async function loadProfileAndLogs() {
    if (!currentUser) return;

    const { foods, favIds: fetchedFavs } = await dbFetchFoodsAndFavorites(currentUser.id);
    dbFoods = foods;
    favIds = fetchedFavs;

    const { profile, entries } = await dbLoadProfileAndLogs(currentUser.id, currentViewDate);
    if (profile) userProfile = profile;
    foodEntries = entries;

    if (fpStartDateInstance && userProfile.cycle_start_date) {
        fpStartDateInstance.setDate(userProfile.cycle_start_date);
    }

    recalculateAndRender();
}

async function handleProfileSubmit(e) {
    e.preventDefault();
    if (!currentUser) return;

    const weight = parseFloat(document.getElementById('input-weight').value) || 74;
    const height = parseFloat(document.getElementById('input-height').value) || 175;
    const age = parseInt(document.getElementById('input-age').value) || 23;
    const startDate = document.getElementById('cycle-start-date').value || getTodayStrUTC8();

    const selectedRadio = document.querySelector('input[name="diet_plan"]:checked');
    const plan = selectedRadio ? selectedRadio.value : 'carb_cycling';

    userProfile = { weight, height, age, cycle_start_date: startDate, diet_plan: plan };
    await dbSaveProfile(currentUser.id, userProfile);

    closeProfileModal();
    recalculateAndRender();
}

function recalculateAndRender() {
    const startDateStr = userProfile.cycle_start_date || currentViewDate;
    const start = new Date(startDateStr);
    const currentView = new Date(currentViewDate);
    const diffDays = Math.floor((currentView - start) / (1000 * 60 * 60 * 24));
    const dayIndex = ((diffDays % 4) + 4) % 4;
    const dayNumber = dayIndex + 1;
    const isHighCarb = dayNumber === 4;

    const cycleState = {
        todayStr: currentViewDate,
        dietPlan: userProfile.diet_plan || 'carb_cycling',
        dayNumber: dayNumber,
        isHighCarb: isHighCarb
    };

    const macroTargets = calculateMacroTargets(userProfile.weight, cycleState);

    renderBannerUI(cycleState);
    renderDashboardUI(cycleState, macroTargets);
    renderMealLog();
}

function renderBannerUI(cycleState) {
    const t = i18n[currentLang];
    document.getElementById('today-date-text').innerText = `${currentLang === 'zh' ? '今天' : 'Today'}: ${cycleState.todayStr}`;

    const displayEl = document.getElementById('view-date-display');
    if (displayEl) {
        displayEl.innerText = `${cycleState.todayStr} (${getWeekdayName(cycleState.todayStr, currentLang)})`;
    }

    const titleEl = document.getElementById('cycle-day-title');
    const descEl = document.getElementById('cycle-strategy-desc');
    const banner = document.getElementById('cycle-banner');
    const modeTag = document.getElementById('banner-mode-tag');

    if (cycleState.dietPlan === 'balanced') {
        titleEl.innerText = t.balanced_title;
        descEl.innerText = t.strat_balanced;
        banner.className = "bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl shadow-md p-3.5 text-white relative overflow-hidden transition-all";
        modeTag.innerText = t.tag_balanced;
    } else if (cycleState.dietPlan === 'ectomorph') {
        titleEl.innerText = t.ectomorph_title;
        descEl.innerText = t.strat_ectomorph;
        banner.className = "bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl shadow-md p-3.5 text-white relative overflow-hidden transition-all";
        modeTag.innerText = t.tag_ectomorph;
    } else if (cycleState.isHighCarb) {
        titleEl.innerText = t.high_title;
        descEl.innerText = t.strat_high;
        banner.className = "bg-gradient-to-r from-teal-500 to-emerald-600 rounded-2xl shadow-md p-3.5 text-white relative overflow-hidden transition-all";
        modeTag.innerText = t.tag_auto;
    } else {
        titleEl.innerText = t.low_title.replace('{day}', cycleState.dayNumber);
        descEl.innerText = t.strat_low;
        banner.className = "bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-md p-3.5 text-white relative overflow-hidden transition-all";
        modeTag.innerText = t.tag_auto;
    }
}

function renderDashboardUI(cycleState, targets) {
    const t = i18n[currentLang];
    const totals = foodEntries.reduce((acc, curr) => ({
        p: acc.p + (curr.protein || 0),
        c: acc.c + (curr.carbs || 0),
        f: acc.f + (curr.fat || 0),
        cal: acc.cal + (curr.calories || 0)
    }), { p: 0, c: 0, f: 0, cal: 0 });

    document.getElementById('stat-intake-kcal').innerText = Math.round(totals.cal);
    const rem = targets.cal - Math.round(totals.cal);
    document.getElementById('stat-remaining-kcal').innerText = rem > 0 ? rem : 0;
    document.getElementById('stat-target-kcal').innerText = `${t.target_prefix} ${targets.cal} kcal`;

    if (cycleState.dietPlan === 'balanced') {
        document.getElementById('stat-cycle-mode-text').innerText = t.plan_balanced_title;
        document.getElementById('stat-cycle-day-sub').innerText = currentLang === 'zh' ? '日常维持' : 'Maintenance';
    } else if (cycleState.dietPlan === 'ectomorph') {
        document.getElementById('stat-cycle-mode-text').innerText = t.plan_ecto_title;
        document.getElementById('stat-cycle-day-sub').innerText = currentLang === 'zh' ? '稳定高碳' : 'High Carb';
    } else {
        document.getElementById('stat-cycle-mode-text').innerText = cycleState.isHighCarb ? (currentLang === 'zh' ? '高碳日' : 'High Carb') : (currentLang === 'zh' ? '低碳日' : 'Low Carb');
        document.getElementById('stat-cycle-day-sub').innerText = `${currentLang === 'zh' ? '第' : 'Day'} ${cycleState.dayNumber} ${currentLang === 'zh' ? '天' : ''}`;
    }

    const unitG = t.unit_g;
    document.getElementById('ratio-c').innerText = `${totals.c.toFixed(1)} / ${targets.c} ${unitG}`;
    updateBar('bar-c', totals.c, targets.c);

    document.getElementById('ratio-p').innerText = `${totals.p.toFixed(1)} / ${targets.p} ${unitG}`;
    updateBar('bar-p', totals.p, targets.p);

    document.getElementById('ratio-f').innerText = `${totals.f.toFixed(1)} / ${targets.f} ${unitG}`;
    updateBar('bar-f', totals.f, targets.f);

    if (currentUser) {
        dbSyncDailyLog(currentUser.id, currentViewDate, totals, cycleState, userProfile);
    }
}

function updateBar(id, val, target) {
    const pct = Math.min(100, Math.round((val / (target || 1)) * 100));
    document.getElementById(id).style.width = `${pct}%`;
}

function renderMealLog() {
    const container = document.getElementById('meal-sections-container');
    container.innerHTML = '';
    const t = i18n[currentLang];

    if (!foodEntries || foodEntries.length === 0) {
        container.innerHTML = `
      <div class="bg-white rounded-3xl p-8 text-center border-2 border-dashed border-slate-200/80 shadow-2xs flex flex-col items-center justify-center space-y-3">
        <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-3xl shadow-inner border border-slate-100">
          🥗
        </div>
        <div>
          <p class="text-xs font-bold text-slate-600">${t.empty_log}</p>
        </div>
      </div>
    `;
        return;
    }

    const meals = [
        { key: 'breakfast', title: `🍳 ${t.bf_title}` },
        { key: 'lunch', title: `🍔 ${t.lunch_title}` },
        { key: 'dinner', title: `🍲 ${t.dinner_title}` },
        { key: 'snack', title: `🍎 ${t.snack_title}` }
    ];

    meals.forEach(m => {
        const list = foodEntries.filter(e => (e.meal_category || e.meal_type) === m.key);
        if (list.length === 0) return;

        const sec = document.createElement('div');
        sec.className = 'bg-slate-50/70 p-2.5 rounded-xl border border-slate-100 space-y-2';

        let html = `<div class="flex justify-between items-center font-bold text-slate-700">
                  <span>${m.title}</span>
                  <button onclick="openFoodSelectModal('${m.key}')" class="text-indigo-600 hover:text-indigo-800 text-[11px] font-semibold flex items-center gap-1">
                    <i class="fa-solid fa-plus"></i> ${t.add_more}
                  </button>
                </div>`;

        html += `<div class="space-y-1.5">`;
        list.forEach(item => {
            const imageHtml = item.image_url
                ? `<img src="${item.image_url}" class="w-6 h-6 rounded-md object-cover">`
                : `<span class="text-base">${item.icon || '🥗'}</span>`;

            const foodName = currentLang === 'zh' ? (item.food_name_zh || item.food_name) : (item.food_name_en || item.food_name_zh || item.food_name);

            html += `
        <div class="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100 shadow-2xs">
          <div class="flex items-center gap-2">
            ${imageHtml}
            <div>
              <p class="font-bold text-slate-700 text-xs">${foodName}</p>
              <p class="text-[10px] text-slate-400">C:${item.carbs}g | P:${item.protein}g | F:${item.fat}g</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="font-black text-indigo-600 text-xs">${item.calories} kcal</span>
            <button onclick="removeFoodEntry('${item.id}')" class="text-slate-300 hover:text-rose-500 p-1 transition">
              <i class="fa-solid fa-xmark text-sm"></i>
            </button>
          </div>
        </div>
      `;
        });
        html += `</div>`;

        sec.innerHTML = html;
        container.appendChild(sec);
    });
}

window.openFoodSelectModal = function(mealKey) {
    activeMealCategory = mealKey;
    const t = i18n[currentLang];
    const titles = {
        breakfast: `🍳 ${t.bf_title}`,
        lunch: `🍔 ${t.lunch_title}`,
        dinner: `🍲 ${t.dinner_title}`,
        snack: `🍎 ${t.snack_title}`
    };
    document.getElementById('modal-meal-title').innerText = `${t.modal_add_title} ${titles[mealKey] || ''}`;

    switchFoodTab('all');
    toggleModal('food-select-modal', true);
}

function closeFoodSelectModal() {
    toggleModal('food-select-modal', false);
}

function renderPresetFoodList() {
    const listEl = document.getElementById('food-preset-list');
    const search = document.getElementById('food-search-input').value.toLowerCase().trim();
    const t = i18n[currentLang];
    listEl.innerHTML = '';

    const recentNames = new Set(foodEntries.map(e => (e.food_name_zh || e.food_name || '').split(' (')[0]));

    const filtered = dbFoods.filter(f => {
        const nameZh = (f.name_zh || f.name || '').toLowerCase();
        const nameEn = (f.name_en || '').toLowerCase();
        const matchesSearch = nameZh.includes(search) || nameEn.includes(search);

        if (!matchesSearch) return false;

        if (activeFoodTab === 'fav') {
            return favIds.has(f.id);
        } else if (activeFoodTab === 'recent') {
            return recentNames.has(f.name_zh || f.name);
        }
        return true;
    });

    if (filtered.length === 0) {
        const emptyMsgs = {
            'all': t.no_food_found,
            'fav': t.fav_tip_empty,
            'recent': t.recent_tip_empty
        };
        listEl.innerHTML = `<p class="text-center text-slate-400 py-8 text-xs">${emptyMsgs[activeFoodTab]}</p>`;
        return;
    }

    filtered.forEach(f => {
        const div = document.createElement('div');
        div.className = "p-2.5 hover:bg-slate-50 transition flex justify-between items-center cursor-pointer";

        const isFav = favIds.has(f.id);
        const starClass = isFav ? "text-amber-400 fa-solid" : "text-slate-300 fa-regular hover:text-amber-300";

        const imageHtml = f.image_url
            ? `<img src="${f.image_url}" class="w-9 h-9 rounded-xl object-cover border border-slate-100">`
            : `<span class="text-2xl">${f.icon || '🥗'}</span>`;

        const unit = f.unit || 'g';
        const kcal = f.kcal || f.calories || 0;
        const name = currentLang === 'zh'
            ? (f.name_zh || f.name || f.name_en)
            : (f.name_en || f.name_zh || f.name);

        div.innerHTML = `
      <div class="flex items-center gap-2.5 flex-1 min-w-0 pr-2" onclick="selectFoodItemToPortionModal('${f.id}')">
        ${imageHtml}
        <div class="min-w-0 flex-1">
          <p class="font-bold text-slate-700 text-xs truncate">${name}</p>
          <p class="text-[10px] text-slate-400">100${unit}：${kcal}kcal | C:${f.c || f.carbs || 0}g P:${f.p || f.protein || 0}g F:${f.f || f.fat || 0}g</p>
        </div>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <button onclick="toggleFav('${f.id}', event)" class="p-1 text-base transition">
          <i class="fa-star ${starClass}"></i>
        </button>
        <button onclick="selectFoodItemToPortionModal('${f.id}')" class="bg-indigo-50 text-indigo-600 font-bold px-2.5 py-1 rounded-lg text-xs hover:bg-indigo-600 hover:text-white transition">
          ${t.select_btn}
        </button>
      </div>
    `;
        listEl.appendChild(div);
    });
}

window.toggleFav = async function(foodId, event) {
    if (event) event.stopPropagation();
    if (!currentUser) return;

    const isFav = favIds.has(foodId);
    if (isFav) {
        favIds.delete(foodId);
    } else {
        favIds.add(foodId);
    }

    renderPresetFoodList();
    await dbToggleFavorite(currentUser.id, foodId, isFav);
}

window.selectFoodItemToPortionModal = function(foodId) {
    activeSelectedFood = dbFoods.find(f => f.id === foodId);
    if (!activeSelectedFood) return;

    closeFoodSelectModal();

    const unit = activeSelectedFood.unit || 'g';
    const imgEl = document.getElementById('portion-food-img');
    const iconEl = document.getElementById('portion-food-icon');

    if (activeSelectedFood.image_url) {
        imgEl.src = activeSelectedFood.image_url;
        imgEl.classList.remove('hidden');
        iconEl.classList.add('hidden');
    } else {
        iconEl.innerText = activeSelectedFood.icon || '🥗';
        iconEl.classList.remove('hidden');
        imgEl.classList.add('hidden');
    }

    const name = currentLang === 'zh'
        ? (activeSelectedFood.name_zh || activeSelectedFood.name || activeSelectedFood.name_en)
        : (activeSelectedFood.name_en || activeSelectedFood.name_zh || activeSelectedFood.name);

    document.getElementById('portion-food-name').innerText = name;
    document.getElementById('portion-grams-input').value = 100;

    document.getElementById('portion-unit-tag').innerText = unit;
    document.getElementById('portion-unit-inline').innerText = unit;

    updatePortionCalculations();
    toggleModal('portion-input-modal', true);
}

function updatePortionCalculations() {
    if (!activeSelectedFood) return;
    const grams = parseFloat(document.getElementById('portion-grams-input').value) || 0;
    const factor = grams / 100;
    const kcal = activeSelectedFood.kcal || activeSelectedFood.calories || 0;

    const c = activeSelectedFood.c !== undefined ? activeSelectedFood.c : (activeSelectedFood.carbs || 0);
    const p = activeSelectedFood.p !== undefined ? activeSelectedFood.p : (activeSelectedFood.protein || 0);
    const f = activeSelectedFood.f !== undefined ? activeSelectedFood.f : (activeSelectedFood.fat || 0);

    document.getElementById('portion-calc-kcal').innerText = `${Math.round(kcal * factor)} kcal`;
    document.getElementById('portion-calc-c').innerText = `${(c * factor).toFixed(1)}g`;
    document.getElementById('portion-calc-p').innerText = `${(p * factor).toFixed(1)}g`;
    document.getElementById('portion-calc-f').innerText = `${(f * factor).toFixed(1)}g`;
}

function adjustGrams(delta) {
    const input = document.getElementById('portion-grams-input');
    let current = parseFloat(input.value) || 0;
    current = Math.max(1, current + delta);
    input.value = current;
    updatePortionCalculations();
}

window.setQuickGrams = function(val) {
    document.getElementById('portion-grams-input').value = val;
    updatePortionCalculations();
}

async function savePortionToLog() {
    if (!currentUser || !activeSelectedFood) return;
    const grams = parseFloat(document.getElementById('portion-grams-input').value) || 0;
    if (grams <= 0) return;

    const factor = grams / 100;
    const unit = activeSelectedFood.unit || 'g';
    const kcal = activeSelectedFood.kcal || activeSelectedFood.calories || 0;

    const c = activeSelectedFood.c !== undefined ? activeSelectedFood.c : (activeSelectedFood.carbs || 0);
    const p = activeSelectedFood.p !== undefined ? activeSelectedFood.p : (activeSelectedFood.protein || 0);
    const f = activeSelectedFood.f !== undefined ? activeSelectedFood.f : (activeSelectedFood.fat || 0);

    const nameZh = activeSelectedFood.name_zh || activeSelectedFood.name || activeSelectedFood.name_en;
    const nameEn = activeSelectedFood.name_en || activeSelectedFood.name_zh || activeSelectedFood.name;

    const entryData = {
        user_id: currentUser.id,
        date: currentViewDate,
        meal_category: activeMealCategory,
        food_name_zh: `${nameZh} (${grams}${unit})`,
        food_name_en: `${nameEn} (${grams}${unit})`,
        grams: grams,
        protein: parseFloat((p * factor).toFixed(1)),
        carbs: parseFloat((c * factor).toFixed(1)),
        fat: parseFloat((f * factor).toFixed(1)),
        calories: Math.round(kcal * factor),
        icon: activeSelectedFood.icon || '🥗',
        image_url: activeSelectedFood.image_url || null
    };

    const newEntry = await dbInsertFoodEntry(entryData);
    if (newEntry) {
        foodEntries.push(newEntry);
        closePortionModal();
        recalculateAndRender();
    }
}

window.removeFoodEntry = async function(id) {
    await dbDeleteFoodEntry(id, currentUser?.id);
    foodEntries = foodEntries.filter(e => e.id !== id);
    recalculateAndRender();
}

async function clearTodayLog() {
    if (!currentUser) return;
    const confirmMsg = currentLang === 'zh'
        ? `确定清空 ${currentViewDate} 的所有日志记录吗？`
        : `Are you sure you want to clear all logs for ${currentViewDate}?`;

    if (confirm(confirmMsg)) {
        await dbClearTodayLogs(currentUser.id, currentViewDate);
        foodEntries = [];
        recalculateAndRender();
    }
}

function openCustomFoodModal() {
    closeFoodSelectModal();
    setCustomImageBase64('');
    document.getElementById('custom-img-url-input').value = '';
    document.getElementById('custom-img-preview').src = '';
    document.getElementById('custom-img-preview').classList.add('hidden');
    document.getElementById('custom-img-placeholder').classList.remove('hidden');

    toggleModal('custom-food-modal', true);
}

function closeCustomFoodModal() {
    toggleModal('custom-food-modal', false);
}

async function handleCustomFoodSubmit(e) {
    e.preventDefault();

    const name = document.getElementById('custom-name-input').value.trim();
    const unit = document.getElementById('custom-unit-select').value || 'g';
    const kcal = parseFloat(document.getElementById('custom-kcal-input').value) || 0;
    const c = parseFloat(document.getElementById('custom-c-input').value) || 0;
    const p = parseFloat(document.getElementById('custom-p-input').value) || 0;
    const f = parseFloat(document.getElementById('custom-f-input').value) || 0;

    if (!name) return;

    const newCustomFood = {
        user_id: currentUser ? currentUser.id : null,
        name_zh: name,
        name_en: name,
        image_url: customImageBase64 || null,
        icon: customImageBase64 ? null : '🥗',
        unit: unit,
        kcal: kcal,
        c: c,
        p: p,
        f: f
    };

    const saved = await dbInsertCustomFood(newCustomFood);
    if (saved) {
        dbFoods.push(saved);
        closeCustomFoodModal();
        selectFoodItemToPortionModal(saved.id);
    }
}

function closePortionModal() {
    toggleModal('portion-input-modal', false);
}

function openProfileModal() {
    document.getElementById('input-weight').value = userProfile.weight || 74;
    document.getElementById('input-height').value = userProfile.height || 175;
    document.getElementById('input-age').value = userProfile.age || 23;

    if (fpStartDateInstance) {
        fpStartDateInstance.setDate(userProfile.cycle_start_date || getTodayStrUTC8());
    } else {
        document.getElementById('cycle-start-date').value = userProfile.cycle_start_date || getTodayStrUTC8();
    }

    const bmi = calculateBMI(userProfile.weight, userProfile.height);
    const bmiValEl = document.getElementById('bmi-value-text');
    if (bmiValEl) bmiValEl.innerText = bmi;

    const currentPlan = userProfile.diet_plan || 'carb_cycling';
    updateDietPlanCardsUI(currentPlan);

    toggleModal('profile-modal', true);
}

function closeProfileModal() {
    toggleModal('profile-modal', false);
}

// 统一更新 DOM 中所有带有 data-i18n 的元素的语言文本
function applyLanguage() {
    const t = i18n[currentLang];

    // 更新所有 data-i18n 文本
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[key]) {
            el.innerText = t[key];
        }
    });

    // 更新 input 的 placeholder 文本
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (t[key]) {
            el.placeholder = t[key];
        }
    });

    // 更新 Flatpickr 日历组件语言
    if (fpViewDateInstance) {
        fpViewDateInstance.set('locale', currentLang === 'zh' ? 'zh' : 'default');
    }
    if (fpStartDateInstance) {
        fpStartDateInstance.set('locale', currentLang === 'zh' ? 'zh' : 'default');
    }

    // 重新刷新视图
    recalculateAndRender();
}

function toggleLanguage() {
    currentLang = currentLang === 'zh' ? 'en' : 'zh';
    document.getElementById('lang-text').innerText = currentLang === 'zh' ? 'EN' : 'CN';
    applyLanguage();
}