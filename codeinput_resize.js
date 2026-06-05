// textarea_resize.js
const textarea = document.getElementById('code-input');

if (!textarea) {
    console.error('Textarea #code-input не найден!');
} else {
    function autoResize() {
        // Сбрасываем высоту для корректного расчёта scrollHeight
        textarea.style.height = 'auto';

        const computed = getComputedStyle(textarea);
        let lineHeight = parseFloat(computed.lineHeight);

        // Fallback, если line-height = "normal"
        if (isNaN(lineHeight)) {
            console.log('line-height = "normal"');
            lineHeight = parseFloat(computed.fontSize) * 1.5;
        }

        const paddingTop = parseFloat(computed.paddingTop) || 0;
        const paddingBottom = parseFloat(computed.paddingBottom) || 0;

        const maxLines = 10;
        const maxHeight = Math.ceil(lineHeight * maxLines + paddingTop + paddingBottom);

        const scrollH = textarea.scrollHeight;

        textarea.style.height = Math.min(scrollH, maxHeight) + 'px';
        textarea.style.overflowY = scrollH > maxHeight ? 'auto' : 'hidden';
    }

    // События
    textarea.addEventListener('input', autoResize);
    textarea.addEventListener('paste', () => setTimeout(autoResize, 10));
    textarea.addEventListener('keydown', autoResize); // на случай Backspace/Delete
    window.addEventListener('resize', autoResize);

    // Запускаем после полной загрузки стилей
    window.addEventListener('load', autoResize);
    
    // Дополнительный вызов через небольшой таймаут (на случай module loading)
    setTimeout(autoResize, 50);
}