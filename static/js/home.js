const cursorBlur = document.getElementById('cursorBlur');

document.addEventListener('mousemove', (e) => {
    const x = e.clientX;
    const y = e.clientY;

    cursorBlur.style.left = (x - 0) + 'px';
    cursorBlur.style.top = (y - 0) + 'px';
});

// Скрыть элемент при выходе курсора за пределы окна
document.addEventListener('mouseleave', () => {
    cursorBlur.style.opacity = '0';
});

document.addEventListener('mouseenter', () => {
    cursorBlur.style.opacity = '1';
});
