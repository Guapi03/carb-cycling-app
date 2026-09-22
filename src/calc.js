// src/calc.js

// 获取 UTC+8 北京时间日期字符串 (YYYY-MM-DD)
export function getTodayStrUTC8() {
    return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Shanghai' });
}

// 计算 BMI
export function calculateBMI(weightKg, heightCm) {
    if (!weightKg || !heightCm) return 0;
    const heightM = heightCm / 100;
    return parseFloat((weightKg / (heightM * heightM)).toFixed(1));
}

// 计算 24H 循环/体质模式状态
export function computeCycleState(userProfile) {
    const todayStr = getTodayStrUTC8();
    const dietPlan = userProfile.diet_plan || 'carb_cycling';

    if (dietPlan === 'balanced') {
        return { dayNumber: 1, isHighCarb: false, dietPlan: 'balanced', todayStr };
    }

    if (dietPlan === 'ectomorph') {
        return { dayNumber: 1, isHighCarb: true, dietPlan: 'ectomorph', todayStr };
    }

    // 碳水循环模式 (3低1高)
    const startDateStr = userProfile.cycle_start_date || todayStr;
    const d1 = new Date(startDateStr + 'T00:00:00+08:00');
    const d2 = new Date(todayStr + 'T00:00:00+08:00');

    const diffDays = Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
    const dayIndex = ((diffDays % 4) + 4) % 4;
    const dayNumber = dayIndex + 1;
    const isHighCarb = (dayNumber === 4);

    return { dayNumber, isHighCarb, dietPlan: 'carb_cycling', todayStr };
}

// 计算三大营养素与热量目标
export function calculateMacroTargets(weightKg, cycleState) {
    const weight = weightKg || 74;
    let p = 0, c = 0, f = 0;

    if (cycleState.dietPlan === 'balanced') {
        // 通用均衡：日常平稳维持
        p = Math.round(weight * 1.6);
        c = Math.round(weight * 2.5);
        f = Math.round(weight * 0.8);
    } else if (cycleState.dietPlan === 'ectomorph') {
        // 外胚型高热量增肌
        p = Math.round(weight * 2.0);
        c = Math.round(weight * 4.5);
        f = Math.round(weight * 1.0);
    } else if (!cycleState.isHighCarb) {
        // 低碳日
        p = Math.round(weight * 2.0);
        c = Math.round(weight * 1.1);
        f = Math.round(weight * 1.0);
    } else {
        // 高碳日
        p = Math.round(weight * 1.1);
        c = Math.round(weight * 3.5);
        f = 12;
    }

    const cal = Math.round((p * 4) + (c * 4) + (f * 9));
    return { p, c, f, cal };
}