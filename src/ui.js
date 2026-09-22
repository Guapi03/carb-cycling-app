// src/ui.js

// 1. 开启实时 24 小时制时钟
export function startClock(getLangFn) {
    setInterval(() => {
        const now = new Date();
        const lang = getLangFn ? getLangFn() : 'zh';
        const clockEl = document.getElementById('current-time-display');
        if (clockEl) {
            clockEl.innerText = `${lang === 'zh' ? '时间' : 'Time'}: ${now.toLocaleTimeString('zh-CN', { hour12: false })}`;
        }
    }, 1000);
}

// 2. 通用弹窗显隐控制
export function toggleModal(modalId, show) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    if (show) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    } else {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

// 3. 三种饮食模式选择卡片的高亮样式切换
export function updateDietPlanCardsUI(selectedPlan) {
    const cardMap = {
        'carb_cycling': 'label-plan-carb',
        'balanced': 'label-plan-balanced',
        'ectomorph': 'label-plan-ecto'
    };

    Object.keys(cardMap).forEach(planKey => {
        const cardEl = document.getElementById(cardMap[planKey]);
        const radioEl = cardEl ? cardEl.querySelector('input[type="radio"]') : null;

        if (cardEl) {
            if (planKey === selectedPlan) {
                if (radioEl) radioEl.checked = true;
                cardEl.className = "diet-plan-card border-2 border-indigo-500 bg-indigo-50/60 p-2 rounded-xl cursor-pointer transition flex flex-col justify-between shadow-2xs";
            } else {
                cardEl.className = "diet-plan-card border-2 border-slate-200 bg-slate-50/80 p-2 rounded-xl cursor-pointer transition flex flex-col justify-between opacity-70 hover:opacity-100";
            }
        }
    });

    const startDateSection = document.getElementById('start-date-section');
    if (startDateSection) {
        if (selectedPlan === 'carb_cycling') {
            startDateSection.classList.remove('hidden');
        } else {
            startDateSection.classList.add('hidden');
        }
    }
}

// 4. 自定义食材 URL 输入图片预览处理
export function handleImageUrlInput(e, setCustomImageBase64) {
    const url = e.target.value.trim();
    const previewImg = document.getElementById('custom-img-preview');
    const placeholderIcon = document.getElementById('custom-img-placeholder');

    if (url) {
        setCustomImageBase64(url);
        previewImg.src = url;
        previewImg.classList.remove('hidden');
        placeholderIcon.classList.add('hidden');
    } else {
        setCustomImageBase64('');
        previewImg.src = '';
        previewImg.classList.add('hidden');
        placeholderIcon.classList.remove('hidden');
    }
}

// 5. 自定义食材本地文件选择处理
export function handleImageFileSelect(e, setCustomImageBase64) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        const base64 = event.target.result;
        setCustomImageBase64(base64);
        const previewImg = document.getElementById('custom-img-preview');
        const placeholderIcon = document.getElementById('custom-img-placeholder');

        previewImg.src = base64;
        previewImg.classList.remove('hidden');
        placeholderIcon.classList.add('hidden');
        document.getElementById('custom-img-url-input').value = '';
    };
    reader.readAsDataURL(file);
}