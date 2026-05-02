(function () {
    const container = document.getElementById('models');
    if (!container) return;

    const canvas = document.createElement('canvas');
    canvas.id = 'modelsWavesCanvas';
    container.style.position = 'relative';
    container.style.overflow = 'hidden';
    container.insertBefore(canvas, container.firstChild);

    const ctx = canvas.getContext('2d');
    let W, H;

    function resize() {
        const rect = container.getBoundingClientRect();
        W = rect.width;
        H = rect.height;
        canvas.width = W * window.devicePixelRatio;
        canvas.height = H * window.devicePixelRatio;
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.zIndex = '0';
        canvas.style.pointerEvents = 'none';
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }
    resize();
    window.addEventListener('resize', resize);

    const lineCount = 24;
    let offset = 0;

    function draw() {
        ctx.clearRect(0, 0, W, H);
        const dark = document.documentElement.getAttribute('data-theme') === 'dark';
        const color = dark ? '255, 255, 255' : '0, 0, 0';

        offset += 0.008;

        for (let i = 0; i < lineCount; i++) {
            const yBase = (H / (lineCount + 1)) * (i + 1);
            const amplitude = 8 + (i % 3) * 6;
            const freq = 0.008 + (i % 5) * 0.002;
            const phase = i * 0.4 + offset * (1 + i * 0.1);
            const alpha = 0.04 + (i % 4) * 0.015;

            ctx.beginPath();
            for (let x = 0; x <= W; x += 3) {
                const y = yBase + Math.sin(x * freq + phase) * amplitude;
                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.strokeStyle = `rgba(${color}, ${alpha})`;
            ctx.lineWidth = 1.2;
            ctx.stroke();
        }

        // Vertical flowing dots
        const dotCols = Math.floor(W / 80);
        for (let c = 0; c < dotCols; c++) {
            const x = (c + 0.5) * (W / dotCols);
            const y = ((Math.sin(offset * 2 + c * 1.5) + 1) / 2) * H * 0.8 + H * 0.1;
            const size = 2 + Math.sin(offset * 3 + c) * 1;
            const alpha = 0.1 + Math.sin(offset + c) * 0.05;

            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${color}, ${alpha})`;
            ctx.fill();
        }

        requestAnimationFrame(draw);
    }

    draw();
})();
