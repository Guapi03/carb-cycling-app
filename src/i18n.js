// src/i18n.js
export const i18n = {
    zh: {
        // Header & Navigation
        app_title: "瓜皮智营养云端日志",
        account_settings: "账号设置",

        // Banner & Date Navigation
        prev_day: "前一天",
        next_day: "后一天",
        today_shortcut: "回到今天",
        today_record: "今日记录",
        edit_mode_btn: "修改参数/模式",
        tag_auto: "24H 自动判碳",
        tag_balanced: "通用均衡模式",
        tag_ectomorph: "外胚型增肌",

        // Banner Strategy Titles & Descs
        low_title: "今天是：低碳日 (第 {day} 天)",
        high_title: "今天是：高碳日 (第 4 天)",
        balanced_title: "通用健康均衡 Diet (平稳维持模式)",
        ectomorph_title: "外胚型 Diet (增重模式)",
        strat_low: "策略：高蛋白(2g/kg)、中脂肪(1g/kg)、低碳水(1.1g/kg)，搭配力量与有氧。",
        strat_high: "策略：高碳水(4.5g/kg)、中蛋白(1.8g/kg)、低脂肪(0.5g/kg)，充糖唤醒代谢。",
        strat_balanced: "策略：稳定摄入适量碳水(2.5g/kg)、蛋白质(1.6g/kg)与优质脂肪，维持健康代谢。",
        strat_ectomorph: "策略：高碳水(5g/kg)、高蛋白(2.2g/kg)、中脂肪，专为高代谢吃不胖人群打造。",

        // Overview Card
        overview_title: "自定义饮食摄入概览",
        intake_label: "饮食摄入",
        kcal_unit: "千卡 kcal",
        remaining_label: "还可以吃 (千卡)",
        target_prefix: "目标",
        mode_label: "饮食模式",
        carb_label: "碳水化合物",
        protein_label: "蛋白质",
        fat_label: "脂肪",
        unit_g: "克",

        // Meal Log Section
        today_log_title: "今日已吃记录",
        clear_today_btn: "清空该日",
        empty_log: "今日暂无食材记录，点击下方餐次开始记录吧！",
        add_more: "继续添加",

        // Bottom Navigation
        add_bf: "+早餐",
        add_lunch: "+午餐",
        add_dinner: "+晚餐",
        add_snack: "+加餐",

        // Food Select Modal
        modal_add_title: "添加",
        modal_sub_tip: "选择常见食材或搜索公共共享库",
        search_placeholder: "搜索食材名称...",
        custom_btn: "自定义",
        tab_all: "全部食材",
        tab_fav: "⭐ 常用收藏",
        tab_recent: "🕒 最近吃过",
        select_btn: "选择",
        fav_tip_empty: "暂无收藏食材，点击食材旁的 ⭐ 收藏吧",
        recent_tip_empty: "暂无最近吃过的记录，快去记录一笔吧",
        no_food_found: "未找到匹配食材，点击右上角【自定义】新增",

        // Custom Food Modal
        custom_food_title: "添加通用自定义食材",
        food_name_label: "食材名称",
        food_name_ph: "例如：黑米饭 / 全麦面包",
        food_img_label: "食材图片",
        upload_local_btn: "上传本地图片",
        img_format_tip: "支持 JPG, PNG 格式",
        url_ph: "或粘贴图片 URL 链接...",
        unit_base_label: "基准单位",
        kcal_per_100_label: "热量 (/100单位)",
        kcal_ph: "例如：120 kcal",
        carb_g_label: "碳水 (g)",
        protein_g_label: "蛋白 (g)",
        fat_g_label: "脂肪 (g)",
        save_to_library_btn: "上传至共享库并选择",

        // Portion Input Modal
        portion_size_label: "食用份量",
        save_and_return_btn: "保存记录并返回主页",

        // Profile Modal
        profile_title: "个人设置与智能体质分析",
        weight_label: "体重 (kg)",
        height_label: "身高 (cm)",
        age_label: "年龄",
        bmi_status_normal: "标准体型",
        bmi_rec_text: "💡 智能推荐：碳水循环饮食（BMI ≥ 18.5 减脂塑形）",
        select_plan_label: "选择饮食模式",
        plan_carb_title: "碳水循环",
        plan_carb_desc: "3低1高判碳\n适合减脂塑形",
        plan_balanced_title: "通用均衡",
        plan_balanced_desc: "平稳营养比例\n适合日常维持",
        plan_ecto_title: "外胚型 Diet",
        plan_ecto_desc: "稳定高碳偏瘦\n适合吃不胖增重",
        start_date_label: "第一天(低碳日)起始日期：",
        set_today_btn: "设为今天",
        start_date_tip: "系统以此日期计算 3低1高 循环（仅在碳水循环模式下生效）。",
        cancel_btn: "取消",
        save_changes_btn: "保存更改",

        // Meal Titles
        bf_title: "早餐",
        lunch_title: "午餐",
        dinner_title: "晚餐",
        snack_title: "加餐",

        // Auth Modal
        auth_login_title: "登录你的健身云端账号",
        auth_register_title: "注册新的健身云端账号",
        btn_login: "登录 / Login",
        btn_go_register: "去注册新账号",
        auth_prompt_has_account: "已有账号？",
        auth_prompt_no_account: "还没有账号？"
    },

    en: {
        // Header & Navigation
        app_title: "Guapi NutriCloud Log",
        account_settings: "Account",

        // Banner & Date Navigation
        prev_day: "Prev Day",
        next_day: "Next Day",
        today_shortcut: "Today",
        today_record: "Today Log",
        edit_mode_btn: "Edit Settings/Mode",
        tag_auto: "24H Auto Carb",
        tag_balanced: "Balanced Mode",
        tag_ectomorph: "Ectomorph Mode",

        // Banner Strategy Titles & Descs
        low_title: "Today: LOW CARB (Day {day})",
        high_title: "Today: HIGH CARB (Day 4)",
        balanced_title: "Healthy Balanced Diet (Maintenance)",
        ectomorph_title: "Ectomorph Diet (Bulking)",
        strat_low: "Strategy: High Protein (2g/kg), Mod Fat (1g/kg), Low Carb (1.1g/kg). Ideal for training.",
        strat_high: "Strategy: High Carb (4.5g/kg), Mod Protein (1.8g/kg), Low Fat (0.5g/kg). Refuel & boost metabolism.",
        strat_balanced: "Strategy: Balanced Carb (2.5g/kg), Protein (1.6g/kg) & Healthy Fats for daily maintenance.",
        strat_ectomorph: "Strategy: High Carb (5g/kg), High Protein (2.2g/kg) tailored for high metabolism muscle gain.",

        // Overview Card
        overview_title: "Custom Nutrition Intake Overview",
        intake_label: "Food Intake",
        kcal_unit: "kcal",
        remaining_label: "Remaining (kcal)",
        target_prefix: "Target",
        mode_label: "Diet Plan",
        carb_label: "Carbohydrates",
        protein_label: "Protein",
        fat_label: "Fat",
        unit_g: "g",

        // Meal Log Section
        today_log_title: "Meals Logged Today",
        clear_today_btn: "Clear Day",
        empty_log: "No items logged today. Tap below to log your meals!",
        add_more: "+ Add",

        // Bottom Navigation
        add_bf: "+ Breakfast",
        add_lunch: "+ Lunch",
        add_dinner: "+ Dinner",
        add_snack: "+ Snack",

        // Food Select Modal
        modal_add_title: "Add to",
        modal_sub_tip: "Select common foods or search shared database",
        search_placeholder: "Search food name...",
        custom_btn: "Custom",
        tab_all: "All Foods",
        tab_fav: "⭐ Favorites",
        tab_recent: "🕒 Recent",
        select_btn: "Select",
        fav_tip_empty: "No favorite foods yet. Click ⭐ beside any food to save!",
        recent_tip_empty: "No recent entries found. Start logging now!",
        no_food_found: "No matching food found. Click [+ Custom] to create one.",

        // Custom Food Modal
        custom_food_title: "Add Custom Food",
        food_name_label: "Food Name",
        food_name_ph: "e.g. Brown Rice / Whole Wheat Bread",
        food_img_label: "Food Image",
        upload_local_btn: "Upload Image",
        img_format_tip: "Supports JPG, PNG",
        url_ph: "or paste image URL link...",
        unit_base_label: "Base Unit",
        kcal_per_100_label: "Calories (/100 unit)",
        kcal_ph: "e.g. 120 kcal",
        carb_g_label: "Carb (g)",
        protein_g_label: "Protein (g)",
        fat_g_label: "Fat (g)",
        save_to_library_btn: "Save to Library & Select",

        // Portion Input Modal
        portion_size_label: "Portion Size",
        save_and_return_btn: "Save Record & Return",

        // Profile Modal
        profile_title: "Profile & Body Analysis",
        weight_label: "Weight (kg)",
        height_label: "Height (cm)",
        age_label: "Age",
        bmi_status_normal: "Normal Weight",
        bmi_rec_text: "💡 Smart Rec: Carb Cycling Diet (BMI ≥ 18.5 Fat Loss)",
        select_plan_label: "Select Diet Plan",
        plan_carb_title: "Carb Cycling",
        plan_carb_desc: "3 Low 1 High\nFat Loss & Shaping",
        plan_balanced_title: "Balanced",
        plan_balanced_desc: "Steady Macro Ratio\nMaintenance",
        plan_ecto_title: "Ectomorph",
        plan_ecto_desc: "High Carb Lean\nMuscle Gain",
        start_date_label: "Cycle Day 1 (Low Carb) Start Date:",
        set_today_btn: "Set Today",
        start_date_tip: "Calculates 3-low-1-high cycle starting from this date.",
        cancel_btn: "Cancel",
        save_changes_btn: "Save Changes",

        // Meal Titles
        bf_title: "Breakfast",
        lunch_title: "Lunch",
        dinner_title: "Dinner",
        snack_title: "Snack",

        // Auth Modal
        auth_login_title: "Login to Cloud Account",
        auth_register_title: "Register New Account",
        btn_login: "Login",
        btn_go_register: "Register New Account",
        auth_prompt_has_account: "Already have an account?",
        auth_prompt_no_account: "Don't have an account?"
    }
};