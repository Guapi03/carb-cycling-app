// src/db.js
import { supabase } from './lib/supabase.js'

// 加载全量食物与用户收藏
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

// 切换收藏状态
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

// 加载个人设置与今日日志
export async function dbLoadProfileAndLogs(userId, todayStr) {
    let profile = null;
    let entries = [];

    if (!userId) return { profile, entries };

    try {
        let { data: prof, error: profErr } = await supabase.from('user_profiles').select('*').eq('user_id', userId).maybeSingle();
        if (profErr) console.error("加载个人配置失败:", profErr);

        if (prof) {
            profile = prof;
        } else {
            profile = { user_id: userId, weight: 74, height: 175, age: 23, diet_plan: 'carb_cycling', cycle_start_date: todayStr };
            await supabase.from('user_profiles').upsert(profile);
        }

        let { data: logEntries, error: logErr } = await supabase.from('food_entries').select('*').eq('user_id', userId).eq('date', todayStr);
        if (logErr) console.error("加载今日饮食记录失败:", logErr);
        entries = logEntries || [];
    } catch (err) {
        console.error("加载 Profile 与 Logs 异常:", err);
    }

    return { profile, entries };
}

// 保存个人设置
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

// 核心修复：添加食物记录，自动处理字段兼容（包含 food_name 与 food_name_zh）
export async function dbInsertFoodEntry(entryData) {
    if (!entryData.user_id) {
        console.error("写入失败：当前未登录，无法写入 Supabase");
        alert("保存失败：未检测到登录状态，请先登录账号！");
        return null;
    }

    try {
        // 构造全面 Payload，兼容旧版 food_name 字段
        const payload = {
            ...entryData,
            food_name: entryData.food_name_zh || entryData.food_name_en || '未知食物'
        };

        const { data, error } = await supabase.from('food_entries').insert(payload).select();

        if (!error && data && data.length > 0) {
            return data[0];
        }

        if (error) {
            console.error("Supabase 写入错误 (全字段):", error);

            // 如果字段不存在 (PGRST204 或 42703)，做降级格式重试
            console.warn("尝试兼容老版数据库表结构重试写入...");
            const fallbackPayload = {
                user_id: entryData.user_id,
                date: entryData.date,
                meal_type: entryData.meal_type,
                food_name: entryData.food_name_zh || '未知食物',
                grams: entryData.grams,
                protein: entryData.protein,
                carbs: entryData.carbs,
                fat: entryData.fat,
                calories: entryData.calories
            };

            const { data: retryData, error: retryError } = await supabase.from('food_entries').insert(fallbackPayload).select();

            if (!retryError && retryData && retryData.length > 0) {
                return retryData[0];
            }

            console.error("重试写入失败 Error:", retryError);
            alert(`保存到数据库失败: ${error.message || retryError?.message || '请检查 Supabase RLS 策略或网络'}`);
        }
    } catch (err) {
        console.error("保存食物异常:", err);
        alert(`保存异常: ${err.message}`);
    }

    return null;
}

// 删除单条食物记录
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

// 清空今日记录
export async function dbClearTodayLogs(userId, todayStr) {
    if (userId) {
        try {
            const { error } = await supabase.from('food_entries').delete().eq('user_id', userId).eq('date', todayStr);
            if (error) console.error("清空今日数据库记录失败:", error);
        } catch (err) {
            console.error("清空今日记录异常:", err);
        }
    }
}

// 添加自定义共享食材
export async function dbInsertCustomFood(newFood) {
    try {
        const { data, error } = await supabase.from('foods').insert(newFood).select();
        if (!error && data && data.length > 0) return data[0];
        if (error) console.error("添加自定义食材失败:", error);
    } catch (err) {
        console.error("添加自定义食材异常:", err);
    }
    return { ...newFood, id: 'temp_' + Date.now() };
}