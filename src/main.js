import { supabase } from './lib/supabase.js'
import { i18n } from './i18n.js'
import { getTodayStrUTC8, calculateBMI, computeCycleState, calculateMacroTargets } from './calc.js'
import {
    dbFetchFoodsAndFavorites, dbToggleFavorite, dbLoadProfileAndLogs,
    dbSaveProfile, dbInsertFoodEntry, dbDeleteFoodEntry, dbClearTodayLogs, dbInsertCustomFood
} from './db.js'

// 全局响应式数据与状态
let allFoodsList = [];
let userFavoriteIds = new Set();
let currentFoodTab = 'all';

let currentLang = 'zh';
let currentUser = null;
let isRegisterMode = false;

let userProfile = { weight: 74, height: 175, age: 23, diet_plan: 'carb_cycling', cycle_start_date: getTodayStrUTC8() };
let foodEntries = [];
let targets = { p: 0, c: 0, f: 0, cal: 0 };
let currentCycleState = { dayNumber: 1, isHighCarb: false };

let activeMealType = 'breakfast';
let activeSelectedFood = null;

document.addEventListener('DOMContentLoaded', () => {
    initApp();
    bindEvents();

    // 挂载全局方法供 HTML 内联触发
    window.openFoodSelectModal = openFoodSelectModal;
    window.selectFoodItemToPortionModal = selectFoodItemToPortionModal;
    window.setQuickGrams = setQuickGrams;
    window.switchFoodTab = switchFoodTab;
    window.toggleFavoriteFood = toggleFavoriteFood;
});

function initApp() {
    startClockUTC8();

    supabase.auth.onAuthStateChange(async (event, session) => {
        if (session && session.user) {
            currentUser = session.user;
            document.getElementById('auth-modal').classList.add('hidden');
            document.getElementById('btn-open-profile').classList.remove('hidden');
            document.getElementById('btn-open-profile').classList.add('flex');
            document.getElementById('btn-logout').classList.remove('hidden');
            document.getElementById('user-email-text').innerText = currentUser.email;

            await loadAppData();
        } else {
            currentUser = null;
            document.getElementById('btn-open-profile').classList.add('hidden');
            document.getElementById('btn-logout').classList.add('hidden');
            document.getElementById('auth-modal').classList.remove('hidden');
        }
    });
}

async function loadAppData() {
    if (!currentUser) return;
    const todayStr = getTodayStrUTC8();

    const { profile, entries } = await dbLoadProfileAndLogs(currentUser.id, todayStr);
    if (profile) userProfile = profile;
    foodEntries = entries;

    const { foods, favIds } = await dbFetchFoodsAndFavorites(currentUser.id);
    allFoodsList = foods;
    userFavoriteIds = favIds;

    recalculateAndRender();
}

function bindEvents() {
    document.getElementById('lang-btn').addEventListener('click', toggleLanguage);
    document.getElementById('auth-form').addEventListener('submit', handleAuthSubmit);
    document.getElementById('btn-toggle-auth').addEventListener('click', toggleAuthMode);
    document.getElementById('btn-logout').addEventListener('click', () => supabase.auth.signOut());

    document.getElementById('btn-open-profile').addEventListener('click', openProfileModal);
    document.getElementById('btn-edit-profile-shortcut').addEventListener('click', openProfileModal);
    document.getElementById('btn-close-profile').addEventListener('click', closeProfileModal);
    document.getElementById('btn-cancel-profile').addEventListener('click', closeProfileModal);
    document.getElementById('profile-form').addEventListener('submit', handleProfileSave);
    document.getElementById('btn-set-today').addEventListener('click', () => {
        document.getElementById('cycle-start-date').value = getTodayStrUTC8();
    });

    document.getElementById('input-weight').addEventListener('input', updateBmiCalculation);
    document.getElementById('input-height').addEventListener('input', updateBmiCalculation);

    document.querySelectorAll('input[name="diet_plan"]').forEach(radio => {
        radio.addEventListener('change', updateDietPlanCardUI);
    });

    document.getElementById('btn-close-food-modal').addEventListener('click', closeFoodSelectModal);
    document.getElementById('btn-close-portion-modal').addEventListener('click', closePortionModal);
    document.getElementById('food-search-input').addEventListener('input', renderPresetFoodList);

    document.getElementById('btn-step-minus').addEventListener('click', () => adjustGrams(-10));
    document.getElementById('btn-step-plus').addEventListener('click', () => adjustGrams(10));
    document.getElementById('portion-grams-input').addEventListener('input', updatePortionCalculations);

    document.getElementById('btn-open-custom-food').addEventListener('click', openCustomFoodModal);
    document.getElementById('btn-close-custom-modal').addEventListener('click', closeCustomFoodModal);
    document.getElementById('custom-food-form').addEventListener('submit', handleCustomFoodSubmit);

    document.getElementById('btn-confirm-save-portion').addEventListener('click', saveFoodPortionEntry);
    document.getElementById('btn-clear-today').addEventListener('click', clearTodayLog);
}

function toggleLanguage() {
    currentLang = currentLang === 'zh' ? 'en' : 'zh';
    document.getElementById('lang-text').innerText = currentLang === 'zh' ? 'English' : '中文';

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (i18n[currentLang][key]) {
            el.innerText = i18n[currentLang][key];
        }
    });

    recalculateAndRender();
}

function toggleAuthMode() {
    isRegisterMode = !isRegisterMode;
    document.getElementById('auth-modal-title').innerText = isRegisterMode ? i18n[currentLang].btn_go_register : i18n[currentLang].auth_login_title;
    document.getElementById('auth-submit-btn').innerText = isRegisterMode ? i18n[currentLang].btn_go_register : i18n[currentLang].auth_login_title;
    document.getElementById('auth-switch-prompt').innerText = isRegisterMode ? '已有账号？' : i18n[currentLang].auth_no_account;
    document.getElementById('btn-toggle-auth').innerText = isRegisterMode ? '去登录' : i18n[currentLang].btn_go_register;
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
            msgEl.innerText = "Verification email sent!";
        }
    } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            msgEl.className = "text-xs text-center font-medium block text-rose-500";
            msgEl.innerText = error.message;
        }
    }
}

function updateBmiCalculation() {
    const w = parseFloat(document.getElementById('input-weight').value) || 74;
    const h = parseFloat(document.getElementById('input-height').value) || 175;

    const bmi = calculateBMI(w, h);
    document.getElementById('bmi-value-text').innerText = bmi;

    const badgeEl = document.getElementById('bmi-status-badge');
    const recommendTextEl = document.getElementById('bmi-recommend-text');

    if (bmi < 18.5) {
        badgeEl.innerText = currentLang === 'zh' ? '偏瘦体型 / 吸受较差' : 'Underweight / Ectomorph';
        badgeEl.className = "bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full text-[10px] font-bold";
        recommendTextEl.innerText = i18n[currentLang].bmi_recommend_ectomorph;
    } else if (bmi >= 24.0) {
        badgeEl.innerText = currentLang === 'zh' ? '偏重体型 / 建议减脂' : 'Overweight';
        badgeEl.className = "bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-[10px] font-bold";
        recommendTextEl.innerText = i18n[currentLang].bmi_recommend_carb_cycling;
    } else {
        badgeEl.innerText = currentLang === 'zh' ? '标准体型' : 'Normal Weight';
        badgeEl.className = "bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-bold";
        recommendTextEl.innerText = i18n[currentLang].bmi_recommend_carb_cycling;
    }
}

function updateDietPlanCardUI() {
    const selectedPlan = document.querySelector('input[name="diet_plan"]:checked')?.value || 'carb_cycling';
    const labelCarb = document.getElementById('label-plan-carb');
    const labelEcto = document.getElementById('label-plan-ecto');
    const startDateSection = document.getElementById('start-date-section');

    if (selectedPlan === 'carb_cycling') {
        labelCarb.className = "border-2 border-indigo-500 bg-indigo-50/50 p-2.5 rounded-xl cursor-pointer transition flex flex-col justify-between";
        labelEcto.className = "border-2 border-slate-200 bg-slate-50 p-2.5 rounded-xl cursor-pointer transition flex flex-col justify-between opacity-60";
        if (startDateSection) startDateSection.classList.remove('hidden');
    } else {
        labelEcto.className = "border-2 border-indigo-500 bg-indigo-50/50 p-2.5 rounded-xl cursor-pointer transition flex flex-col justify-between";
        labelCarb.className = "border-2 border-slate-200 bg-slate-50 p-2.5 rounded-xl cursor-pointer transition flex flex-col justify-between opacity-60";
        if (startDateSection) startDateSection.classList.add('hidden');
    }
}

function openProfileModal() {
    document.getElementById('input-weight').value = userProfile.weight || 74;
    document.getElementById('input-height').value = userProfile.height || 175;
    document.getElementById('input-age').value = userProfile.age || 23;
    document.getElementById('cycle-start-date').value = userProfile.cycle_start_date || getTodayStrUTC8();

    const plan = userProfile.diet_plan || 'carb_cycling';
    const radio = document.querySelector(`input[name="diet_plan"][value="${plan}"]`);
    if (radio) radio.checked = true;

    updateBmiCalculation();
    updateDietPlanCardUI();

    const modal = document.getElementById('profile-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeProfileModal() {
    const modal = document.getElementById('profile-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

async function handleProfileSave(e) {
    e.preventDefault();
    if (!currentUser) return;

    const weight = parseFloat(document.getElementById('input-weight').value) || 74;
    const height = parseFloat(document.getElementById('input-height').value) || 175;
    const age = parseInt(document.getElementById('input-age').value) || 23;
    const startDate = document.getElementById('cycle-start-date').value || getTodayStrUTC8();
    const dietPlan = document.querySelector('input[name="diet_plan"]:checked')?.value || 'carb_cycling';

    userProfile = { weight, height, age, diet_plan: dietPlan, cycle_start_date: startDate };

    await dbSaveProfile(currentUser.id, userProfile);
    closeProfileModal();
    recalculateAndRender();
}

async function toggleFavoriteFood(e, foodId) {
    e.stopPropagation();
    if (!currentUser) return;

    const isFav = userFavoriteIds.has(foodId);
    if (isFav) userFavoriteIds.delete(foodId);
    else userFavoriteIds.add(foodId);

    await dbToggleFavorite(currentUser.id, foodId, isFav);
    renderPresetFoodList();
}

function switchFoodTab(tab) {
    currentFoodTab = tab;
    ['all', 'fav', 'recent'].forEach(t => {
        const btn = document.getElementById(`tab-btn-${t}`);
        if (btn) {
            if (t === tab) btn.classList.add('active');
            else btn.classList.remove('active');
        }
    });
    renderPresetFoodList();
}

function openFoodSelectModal(mealType) {
    activeMealType = mealType;
    const mealNameMap = {
        breakfast: currentLang === 'zh' ? '早餐' : 'Breakfast',
        lunch: currentLang === 'zh' ? '午餐' : 'Lunch',
        dinner: currentLang === 'zh' ? '晚餐' : 'Dinner',
        snack: currentLang === 'zh' ? '加餐' : 'Snack'
    };

    document.getElementById('modal-meal-title').innerText = `${currentLang === 'zh' ? '添加' : 'Add to'} ${mealNameMap[mealType]}`;
    document.getElementById('food-search-input').value = '';
    switchFoodTab('all');

    const modal = document.getElementById('food-select-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeFoodSelectModal() {
    const modal = document.getElementById('food-select-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

function renderPresetFoodList() {
    const container = document.getElementById('food-preset-list');
    container.innerHTML = '';

    const query = (document.getElementById('food-search-input').value || '').trim().toLowerCase();
    let listToDisplay = [...allFoodsList];

    if (currentFoodTab === 'fav') {
        listToDisplay = listToDisplay.filter(item => userFavoriteIds.has(item.id));
    } else if (currentFoodTab === 'recent') {
        const loggedFoodNames = foodEntries.map(e => e.food_name_zh || e.food_name || '');
        listToDisplay = listToDisplay.filter(item => loggedFoodNames.some(name => name.includes(item.name_zh)));
    }

    const filtered = listToDisplay.filter(item => {
        const nameZh = (item.name_zh || '').toLowerCase();
        const nameEn = (item.name_en || '').toLowerCase();
        return nameZh.includes(query) || nameEn.includes(query);
    });

    if (filtered.length === 0) {
        let emptyHint = currentLang === 'zh' ? '未找到相关食材' : 'No food found';
        if (currentFoodTab === 'fav') emptyHint = currentLang === 'zh' ? '暂无收藏食材，点击 ⭐ 即可快速收藏' : 'No favorite foods yet';
        if (currentFoodTab === 'recent') emptyHint = currentLang === 'zh' ? '今日暂无食用记录' : 'No recent foods logged today';

        container.innerHTML = `
      <div class="flex flex-col items-center justify-center h-full text-slate-400 text-xs space-y-2.5 py-10">
        <i class="fa-regular fa-folder-open text-3xl text-slate-300"></i>
        <p class="font-medium">${emptyHint}</p>
      </div>
    `;
        return;
    }

    filtered.forEach(item => {
        const name = currentLang === 'zh' ? item.name_zh : item.name_en;
        const isFav = userFavoriteIds.has(item.id);

        const div = document.createElement('div');
        div.className = "flex items-center justify-between py-2 hover:bg-slate-50 px-2 rounded-xl transition cursor-pointer";
        div.onclick = () => selectFoodItemToPortionModal(item.id);

        div.innerHTML = `
      <div class="flex items-center gap-3">
        <button onclick="toggleFavoriteFood(event, '${item.id}')" class="text-base p-1 hover:scale-110 transition">
          <i class="${isFav ? 'fa-solid fa-star text-amber-400' : 'fa-regular fa-star text-slate-300 hover:text-amber-300'}"></i>
        </button>
        <span class="text-2xl">${item.icon}</span>
        <div>
          <p class="font-bold text-slate-800 text-sm">${name}</p>
          <p class="text-[11px] text-slate-400">${item.kcal} kcal / 100g</p>
        </div>
      </div>
      <button class="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white flex items-center justify-center font-bold text-sm transition">
        <i class="fa-solid fa-plus"></i>
      </button>
    `;
        container.appendChild(div);
    });
}

function openCustomFoodModal() {
    closeFoodSelectModal();
    document.getElementById('custom-name-input').value = '';
    document.getElementById('custom-kcal-input').value = '';
    document.getElementById('custom-c-input').value = '';
    document.getElementById('custom-p-input').value = '';
    document.getElementById('custom-f-input').value = '';

    const modal = document.getElementById('custom-food-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeCustomFoodModal() {
    const modal = document.getElementById('custom-food-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

async function handleCustomFoodSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('custom-name-input').value.trim();
    const icon = document.getElementById('custom-icon-input').value.trim() || '🥗';
    const kcal = parseFloat(document.getElementById('custom-kcal-input').value) || 0;
    const c = parseFloat(document.getElementById('custom-c-input').value) || 0;
    const p = parseFloat(document.getElementById('custom-p-input').value) || 0;
    const f = parseFloat(document.getElementById('custom-f-input').value) || 0;

    if (!name) return;

    const newFoodItem = await dbInsertCustomFood({ name_zh: name, name_en: name, icon, kcal, c, p, f, is_preset: false });
    allFoodsList.push(newFoodItem);

    closeCustomFoodModal();
    openFoodSelectModal(activeMealType);
}

function selectFoodItemToPortionModal(foodId) {
    activeSelectedFood = allFoodsList.find(f => f.id === foodId);
    if (!activeSelectedFood) return;

    closeFoodSelectModal();

    document.getElementById('portion-food-icon').innerText = activeSelectedFood.icon;
    document.getElementById('portion-food-name').innerText = currentLang === 'zh' ? activeSelectedFood.name_zh : activeSelectedFood.name_en;
    document.getElementById('portion-grams-input').value = 100;

    updatePortionCalculations();

    const modal = document.getElementById('portion-input-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closePortionModal() {
    const modal = document.getElementById('portion-input-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

function adjustGrams(delta) {
    const input = document.getElementById('portion-grams-input');
    let val = (parseFloat(input.value) || 0) + delta;
    if (val < 5) val = 5;
    input.value = val;
    updatePortionCalculations();
}

function setQuickGrams(grams) {
    document.getElementById('portion-grams-input').value = grams;
    updatePortionCalculations();
}

function updatePortionCalculations() {
    if (!activeSelectedFood) return;

    const grams = parseFloat(document.getElementById('portion-grams-input').value) || 0;
    const factor = grams / 100;

    const cal = Math.round(activeSelectedFood.kcal * factor);
    const p = (activeSelectedFood.p * factor).toFixed(1);
    const c = (activeSelectedFood.c * factor).toFixed(1);
    const f = (activeSelectedFood.f * factor).toFixed(1);

    document.getElementById('portion-calc-kcal').innerText = `${cal} kcal`;
    document.getElementById('portion-calc-p').innerText = `${p}g`;
    document.getElementById('portion-calc-c').innerText = `${c}g`;
    document.getElementById('portion-calc-f').innerText = `${f}g`;
}

// 保存食物记录并严格同步 Supabase 数据库
async function saveFoodPortionEntry() {
    if (!activeSelectedFood) return;

    const grams = parseFloat(document.getElementById('portion-grams-input').value) || 0;
    if (grams <= 0) return;

    if (!currentUser) {
        alert(currentLang === 'zh' ? '当前未登录账号，请先登录！' : 'Please login first!');
        return;
    }

    const factor = grams / 100;
    const todayStr = getTodayStrUTC8();

    const entryData = {
        user_id: currentUser.id,
        date: todayStr,
        meal_type: activeMealType,
        food_name_zh: activeSelectedFood.name_zh,
        food_name_en: activeSelectedFood.name_en,
        food_icon: activeSelectedFood.icon || '🥗',
        grams: grams,
        protein: parseFloat((activeSelectedFood.p * factor).toFixed(1)),
        carbs: parseFloat((activeSelectedFood.c * factor).toFixed(1)),
        fat: parseFloat((activeSelectedFood.f * factor).toFixed(1)),
        calories: Math.round(activeSelectedFood.kcal * factor)
    };

    const savedItem = await dbInsertFoodEntry(entryData);

    if (savedItem) {
        foodEntries.push(savedItem);
        closePortionModal();
        recalculateAndRender();
    }
}

async function removeEntry(id) {
    await dbDeleteFoodEntry(id, currentUser?.id);
    foodEntries = foodEntries.filter(e => e.id !== id);
    recalculateAndRender();
}

async function clearTodayLog() {
    if (confirm(i18n[currentLang].confirm_clear)) {
        const todayStr = getTodayStrUTC8();
        await dbClearTodayLogs(currentUser?.id, todayStr);
        foodEntries = [];
        recalculateAndRender();
    }
}

function recalculateAndRender() {
    currentCycleState = computeCycleState(userProfile);
    targets = calculateMacroTargets(userProfile.weight, currentCycleState);

    renderBanner();
    renderDashboard();
    renderMealLogSections();
}

function renderBanner() {
    document.getElementById('today-date-text').innerText = `${currentLang === 'zh' ? '今天' : 'Today'}: ${currentCycleState.todayStr}`;
    const titleEl = document.getElementById('cycle-day-title');
    const descEl = document.getElementById('cycle-strategy-desc');
    const bannerTag = document.getElementById('banner-mode-tag');

    if (currentCycleState.isEctomorph) {
        titleEl.innerText = i18n[currentLang].ectomorph_title;
        descEl.innerText = i18n[currentLang].strat_ectomorph;
        bannerTag.innerText = i18n[currentLang].tag_ectomorph;
    } else {
        bannerTag.innerText = i18n[currentLang].tag_auto;
        if (currentCycleState.isHighCarb) {
            titleEl.innerText = i18n[currentLang].high_title;
            descEl.innerText = i18n[currentLang].strat_high;
        } else {
            titleEl.innerText = i18n[currentLang].low_title.replace('{day}', currentCycleState.dayNumber);
            descEl.innerText = i18n[currentLang].strat_low;
        }
    }
}

function renderDashboard() {
    const totals = foodEntries.reduce((acc, curr) => ({
        p: acc.p + (curr.protein || 0),
        c: acc.c + (curr.carbs || 0),
        f: acc.f + (curr.fat || 0),
        cal: acc.cal + (curr.calories || 0)
    }), { p: 0, c: 0, f: 0, cal: 0 });

    const remainingKcal = Math.max(0, targets.cal - totals.cal);

    document.getElementById('stat-intake-kcal').innerText = totals.cal;
    document.getElementById('stat-remaining-kcal').innerText = remainingKcal;
    document.getElementById('stat-target-kcal').innerText = `${currentLang === 'zh' ? '目标' : 'Target'} ${targets.cal} kcal`;

    if (currentCycleState.isEctomorph) {
        document.getElementById('stat-cycle-mode-text').innerText = currentLang === 'zh' ? '外胚型增肌' : 'Ectomorph';
        document.getElementById('stat-cycle-day-sub').innerText = currentLang === 'zh' ? '热量盈余' : 'Caloric Surplus';
    } else {
        document.getElementById('stat-cycle-mode-text').innerText = currentCycleState.isHighCarb ? (currentLang === 'zh' ? '高碳日' : 'High Carb') : (currentLang === 'zh' ? '低碳日' : 'Low Carb');
        document.getElementById('stat-cycle-day-sub').innerText = `${currentLang === 'zh' ? '第' : 'Day'} ${currentCycleState.dayNumber} ${currentLang === 'zh' ? '天' : ''}`;
    }

    document.getElementById('ratio-c').innerText = `${totals.c.toFixed(1)} / ${targets.c}g`;
    updateBar('bar-c', totals.c, targets.c);

    document.getElementById('ratio-p').innerText = `${totals.p.toFixed(1)} / ${targets.p}g`;
    updateBar('bar-p', totals.p, targets.p);

    document.getElementById('ratio-f').innerText = `${totals.f.toFixed(1)} / ${targets.f}g`;
    updateBar('bar-f', totals.f, targets.f);
}

function updateBar(id, val, target) {
    const pct = Math.min(100, Math.round((val / (target || 1)) * 100));
    const el = document.getElementById(id);
    if (el) el.style.width = `${pct}%`;
}

function renderMealLogSections() {
    const container = document.getElementById('meal-sections-container');
    container.innerHTML = '';

    if (!foodEntries || foodEntries.length === 0) {
        container.innerHTML = `
      <div class="bg-white rounded-3xl p-8 text-center border-2 border-dashed border-slate-200/80 shadow-sm flex flex-col items-center justify-center space-y-3">
        <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-3xl shadow-inner border border-slate-100">
          🥗
        </div>
        <div>
          <p class="text-xs font-bold text-slate-600">
            ${currentLang === 'zh' ? '记录饮食获取今日营养分析' : 'Log meals to get daily nutrition analysis'}
          </p>
          <span class="inline-block mt-2 text-[10px] bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full font-bold border border-emerald-200">
            ${currentLang === 'zh' ? '今日饮食建议' : 'Diet Advice'}
          </span>
        </div>
      </div>
    `;
        return;
    }

    const mealConfig = [
        { key: 'breakfast', title: i18n[currentLang].bf_title, ratioMin: 0.25, ratioMax: 0.30 },
        { key: 'lunch', title: i18n[currentLang].lunch_title, ratioMin: 0.35, ratioMax: 0.40 },
        { key: 'dinner', title: i18n[currentLang].dinner_title, ratioMin: 0.25, ratioMax: 0.30 },
        { key: 'snack', title: i18n[currentLang].snack_title, ratioMin: 0.05, ratioMax: 0.10 }
    ];

    mealConfig.forEach(cat => {
        const entries = foodEntries.filter(item => (item.meal_type || 'breakfast') === cat.key);
        if (entries.length === 0) return;

        const totalMealKcal = entries.reduce((sum, item) => sum + (item.calories || 0), 0);
        const recMin = Math.round(targets.cal * cat.ratioMin);
        const recMax = Math.round(targets.cal * cat.ratioMax);
        const recText = `${i18n[currentLang].rec_kcal_prefix} ${recMin} - ${recMax} 千卡`;

        const cardDiv = document.createElement('div');
        cardDiv.className = "bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3";

        let headerHtml = `
      <div class="flex items-center justify-between border-b border-slate-100 pb-3">
        <div class="flex items-center gap-2">
          <span class="font-extrabold text-slate-800 text-base">${cat.title}</span>
          <span class="text-[11px] text-slate-400 font-medium">${recText}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="font-bold text-slate-700 text-sm">${totalMealKcal} 千卡</span>
          <button onclick="openFoodSelectModal('${cat.key}')" class="w-6 h-6 rounded-full bg-slate-100 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 flex items-center justify-center text-xs transition">
            <i class="fa-solid fa-plus"></i>
          </button>
        </div>
      </div>
    `;

        let listHtml = entries.map(item => {
            const name = currentLang === 'zh' ? (item.food_name_zh || item.food_name || '食物') : (item.food_name_en || item.food_name || 'Food');
            const cleanName = name ? name.replace(/\s*\(\d+g\)/g, '') : '食物';
            const icon = item.food_icon || '🥗';
            const grams = item.grams || 100;

            return `
        <div class="flex items-center justify-between py-2 border-b border-slate-50 last:border-none">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-xl shrink-0 border border-slate-100">
              ${icon}
            </div>
            <div>
              <h4 class="font-bold text-slate-800 text-sm leading-tight">${cleanName}</h4>
              <p class="text-xs text-slate-400 mt-0.5">${grams} 克</p>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <span class="font-semibold text-slate-600 text-xs">${item.calories} 千卡</span>
            <button data-id="${item.id}" class="btn-del-entry text-slate-300 hover:text-rose-500 transition p-1 text-sm">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </div>
      `;
        }).join('');

        cardDiv.innerHTML = headerHtml + `<div class="space-y-1">${listHtml}</div>`;
        container.appendChild(cardDiv);
    });

    document.querySelectorAll('.btn-del-entry').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            removeEntry(id);
        });
    });
}

function startClockUTC8() {
    setInterval(() => {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false });
        const timeEl = document.getElementById('current-time-display');
        if (timeEl) {
            timeEl.innerText = `${currentLang === 'zh' ? 'UTC+8 时间' : 'UTC+8 Time'}: ${timeStr}`;
        }
    }, 1000);
}