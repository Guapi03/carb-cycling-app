// src/db.js
import { supabase } from './lib/supabase.js'

// 1. 获取全量食材列表 & 用户收藏
export async function dbFetchFoodsAndFavorites(userId) {
    let foods = [];
    let favIds = new Set();

    try {
        const { data: foodsData, error: foodsError } = await supabase.from('foods').select('*');
        if (foodsError) console.error("加载食材列表失败:", foodsError);
        if (foodsData) foods = foodsData;

        if (userId) {
            const { data: favs, error: favsError } = await supabase.from('user_favorites').select('food_id').eq('user_id', userId);
            if (favsError) console.error("加载收藏列表失败:", favsError);
            if (favs) favIds = new Set(favs.map(f => f.food_id));
        }
    } catch (err) {
        console.error("加载食材/收藏异常:", err);
    }

    return { foods, favIds };
}

// 2. 添加自定义食材
export async function dbInsertCustomFood(newFood) {
    try {
        const payload = {
            user_id: newFood.user_id || null,
            name_zh: newFood.name_zh || newFood.name_en || '自定义食材',
            name_en: newFood.name_en || newFood.name_zh || 'Custom Food',
            kcal: newFood.kcal || 0,
            c: newFood.c || 0,
            p: newFood.p || 0,
            f: newFood.f || 0,
            unit: newFood.unit || 'g',
            icon: newFood.icon || '🥗',
            image_url: newFood.image_url || null
        };

        const { data, error } = await supabase.from('foods').insert(payload).select();
        if (!error && data && data.length > 0) return data[0];
        if (error) console.error("新增食材写入 foods 表失败:", error);
    } catch (err) {
        console.error("新增食材写入异常:", err);
    }
    return { ...newFood, id: 'temp_' + Date.now() };
}

// 3. 切换收藏状态
export async function dbToggleFavorite(userId, foodId, isFav) {
    if (!userId) return;
    try {
        if (isFav) {
            await supabase.from('user_favorites').delete().eq('user_id', userId).eq('food_id', foodId);
        } else {
            await supabase.from('user_favorites').insert({ user_id: userId, food_id: foodId });
        }
    } catch (err) {
        console.error("更新收藏失败:", err);
    }
}

// 4. 加载个人配置与指定日期的饮食日志
export async function dbLoadProfileAndLogs(userId, targetDateStr) {
    let profile = null;
    let entries = [];

    if (!userId) return { profile, entries };

    try {
        // 读取 Profile
        let { data: prof, error: profErr } = await supabase.from('user_profiles').select('*').eq('user_id', userId).maybeSingle();
        if (profErr) console.error("加载个人配置失败:", profErr);

        if (prof) {
            profile = prof;
        } else {
            profile = { user_id: userId, weight: 74, height: 175, age: 23, diet_plan: 'carb_cycling', cycle_start_date: targetDateStr };
            await supabase.from('user_profiles').upsert(profile);
        }

        // 读取指定日期的 food_entries
        let { data: logEntries, error: logErr } = await supabase.from('food_entries').select('*').eq('user_id', userId).eq('date', targetDateStr);
        if (logErr) console.error("加载指定日期饮食记录失败:", logErr);
        entries = logEntries || [];
    } catch (err) {
        console.error("加载 Profile 与 Logs 异常:", err);
    }

    return { profile, entries };
}

// 5. 保存个人设置
export async function dbSaveProfile(userId, profileData) {
    if (!userId) return;
    try {
        const { error } = await supabase.from('user_profiles').upsert({
            user_id: userId,
            ...profileData,
            updated_at: new Date()
        });
        if (error) console.error("保存个人配置失败:", error);
    } catch (err) {
        console.error("保存个人配置异常:", err);
    }
}

// 6. 添加食物记录
export async function dbInsertFoodEntry(entryData) {
    if (!entryData.user_id) {
        alert("保存失败：未检测到登录状态，请先登录账号！");
        return null;
    }

    const nameZh = entryData.food_name_zh || entryData.food_name || entryData.food_name_en || '未知食物';
    const nameEn = entryData.food_name_en || entryData.food_name_zh || entryData.food_name || 'Food Item';
    const mealVal = entryData.meal_category || entryData.meal_type || 'breakfast';

    const basePayload = {
        user_id: entryData.user_id,
        date: entryData.date,
        grams: entryData.grams || 0,
        protein: entryData.protein || 0,
        carbs: entryData.carbs || 0,
        fat: entryData.fat || 0,
        calories: entryData.calories || 0,
        food_name: nameZh,
        food_name_zh: nameZh,
        food_name_en: nameEn,
        meal_category: mealVal,
        meal_type: mealVal
    };

    if (entryData.icon) basePayload.icon = entryData.icon;
    if (entryData.image_url) basePayload.image_url = entryData.image_url;

    try {
        const { data, error } = await supabase.from('food_entries').insert(basePayload).select();
        if (!error && data && data.length > 0) return data[0];

        // 兼容降级
        const safePayload = {
            user_id: entryData.user_id,
            date: entryData.date,
            grams: entryData.grams || 0,
            protein: entryData.protein || 0,
            carbs: entryData.carbs || 0,
            fat: entryData.fat || 0,
            calories: entryData.calories || 0,
            food_name: nameZh,
            food_name_zh: nameZh
        };

        const { data: retryData, error: retryError } = await supabase.from('food_entries').insert(safePayload).select();

        if (!retryError && retryData && retryData.length > 0) {
            return {
                ...retryData[0],
                meal_category: mealVal,
                icon: entryData.icon,
                image_url: entryData.image_url,
                food_name_zh: nameZh
            };
        }

        alert(`保存失败: ${retryError?.message || error.message}`);
    } catch (err) {
        console.error("保存食物异常:", err);
        alert(`保存异常: ${err.message}`);
    }

    return null;
}

// 7. 核心新增：实时同步更新 daily_logs 汇总数据表
export async function dbSyncDailyLog(userId, dateStr, totals, cycleState, profile) {
    if (!userId) return;

    try {
        const payload = {
            user_id: userId,
            date: dateStr,
            cycle_day: cycleState.dayNumber || 1,
            is_high_carb: !!cycleState.isHighCarb,
            diet_plan: profile?.diet_plan || 'carb_cycling',
            weight: profile?.weight || 74,
            total_protein: parseFloat(totals.p.toFixed(1)),
            total_carbs: parseFloat(totals.c.toFixed(1)),
            total_fat: parseFloat(totals.f.toFixed(1)),
            total_calories: Math.round(totals.cal),
            updated_at: new Date()
        };

        const { error } = await supabase.from('daily_logs').upsert(payload, { onConflict: 'user_id,date' });
        if (error) console.error("同步 daily_logs 失败:", error);
    } catch (err) {
        console.error("同步 daily_logs 异常:", err);
    }
}

// 8. 删除单条食物记录
export async function dbDeleteFoodEntry(id, userId) {
    if (userId && typeof id === 'string' && !id.startsWith('local_')) {
        try {
            const { error } = await supabase.from('food_entries').delete().eq('id', id);
            if (error) console.error("删除数据库条目失败:", error);
        } catch (err) {
            console.error("删除数据库条目异常:", err);
        }
    }
}

// 9. 清空指定日期的记录
export async function dbClearTodayLogs(userId, dateStr) {
    if (userId) {
        try {
            const { error } = await supabase.from('food_entries').delete().eq('user_id', userId).eq('date', dateStr);
            if (error) console.error("清空数据库记录失败:", error);
        } catch (err) {
            console.error("清空记录异常:", err);
        }
    }
}