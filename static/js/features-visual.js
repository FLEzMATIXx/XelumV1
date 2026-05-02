(function () {
    const dark = () => document.documentElement.getAttribute('data-theme') === 'dark';
    const stroke = () => dark() ? '#ffffff' : '#000000';

    // ========== BACKGROUND: subtle pulsing circles ==========
    const bgContainer = document.getElementById('features');
    if (bgContainer) {
        const bgCanvas = document.createElement('canvas');
        bgCanvas.style.position = 'absolute';
        bgCanvas.style.top = '0';
        bgCanvas.style.left = '0';
        bgCanvas.style.width = '100%';
        bgCanvas.style.height = '100%';
        bgCanvas.style.zIndex = '0';
        bgCanvas.style.pointerEvents = 'none';
        bgContainer.style.position = 'relative';
        bgContainer.insertBefore(bgCanvas, bgContainer.firstChild);

        const ctx = bgCanvas.getContext('2d');
        let W, H;
        function resizeBg() {
            const rect = bgContainer.getBoundingClientRect();
            W = rect.width;
            H = rect.height;
            bgCanvas.width = W * window.devicePixelRatio;
            bgCanvas.height = H * window.devicePixelRatio;
            ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        }
        resizeBg();
        window.addEventListener('resize', resizeBg);

        const circles = [];
        for (let i = 0; i < 6; i++) {
            circles.push({
                x: Math.random(),
                y: Math.random(),
                baseR: 60 + Math.random() * 100,
                phase: Math.random() * Math.PI * 2,
                speed: 0.005 + Math.random() * 0.01
            });
        }

        function drawBg(t) {
            ctx.clearRect(0, 0, W, H);
            const c = dark() ? '255, 255, 255' : '0, 0, 0';

            circles.forEach(circ => {
                const pulse = Math.sin(t * circ.speed + circ.phase);
                const r = circ.baseR + pulse * 20;
                const alpha = 0.03 + (pulse + 1) * 0.02;

                ctx.beginPath();
                ctx.arc(circ.x * W, circ.y * H, r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${c}, ${alpha})`;
                ctx.fill();
            });

            requestAnimationFrame(() => drawBg(t + 1));
        }
        drawBg(0);
    }

    // ========== LEFT: 3D Rotating Bitcoin ==========
    const leftCanvas = document.getElementById('featuresLeftCanvas');
    if (leftCanvas) {
        const ctx = leftCanvas.getContext('2d');
        let W = 260, H = 380;
        function resizeL() {
            const rect = leftCanvas.getBoundingClientRect();
            W = rect.width || 260;
            H = rect.height || 380;
            leftCanvas.width = W * window.devicePixelRatio;
            leftCanvas.height = H * window.devicePixelRatio;
            ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        }
        resizeL();
        window.addEventListener('resize', resizeL);

        let angle = 0;

        function drawBitcoin() {
            ctx.clearRect(0, 0, W, H);
            const c = stroke();
            const cx = W / 2 - W * 0.08; // shifted left
            const cy = H / 2;
            const r = Math.min(W, H) * 0.44;
            const thickness = r * 0.12;

            angle += 0.03;
            const scaleX = Math.cos(angle);
            const absScale = Math.abs(scaleX);

            // 3D thickness — side edge
            if (absScale > 0.15) {
                const sideDir = scaleX > 0 ? 1 : -1;
                ctx.beginPath();
                ctx.ellipse(cx + sideDir * r * absScale, cy, thickness * absScale, r, 0, 0, Math.PI * 2);
                ctx.fillStyle = c;
                ctx.globalAlpha = 0.25;
                ctx.fill();
                ctx.globalAlpha = 1;
            }

            ctx.save();
            ctx.translate(cx, cy);
            ctx.scale(scaleX, 1);

            // Outer circle
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.strokeStyle = c;
            ctx.lineWidth = 2.8;
            ctx.stroke();

            // Inner circle
            ctx.beginPath();
            ctx.arc(0, 0, r * 0.78, 0, Math.PI * 2);
            ctx.strokeStyle = c;
            ctx.lineWidth = 1.5;
            ctx.globalAlpha = 0.4;
            ctx.stroke();
            ctx.globalAlpha = 1;

            // Bitcoin symbol — ROTATES with the coin
            ctx.font = `bold ${r * 0.65}px 'Inter', sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = c;
            ctx.fillText('₿', 0, r * 0.02);

            ctx.restore();

            // Shine when facing front
            if (absScale > 0.5) {
                ctx.beginPath();
                ctx.arc(cx - r * 0.3, cy - r * 0.32, r * 0.12, 0, Math.PI * 2);
                ctx.fillStyle = c;
                ctx.globalAlpha = 0.06 * absScale;
                ctx.fill();
                ctx.globalAlpha = 1;
            }

            requestAnimationFrame(drawBitcoin);
        }
        drawBitcoin();
    }

    // ========== RIGHT: Rocket with fire ==========
    const rightCanvas = document.getElementById('featuresRightCanvas');
    if (rightCanvas) {
        const ctx = rightCanvas.getContext('2d');
        let W = 260, H = 380;
        function resizeR() {
            const rect = rightCanvas.getBoundingClientRect();
            W = rect.width || 260;
            H = rect.height || 380;
            rightCanvas.width = W * window.devicePixelRatio;
            rightCanvas.height = H * window.devicePixelRatio;
            ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        }
        resizeR();
        window.addEventListener('resize', resizeR);

        let time = 0;
        const flames = [];
        for (let i = 0; i < 20; i++) {
            flames.push({
                phase: Math.random() * Math.PI * 2,
                speed: 0.1 + Math.random() * 0.2,
                len: 0.5 + Math.random() * 0.5,
                offset: Math.random() * 10
            });
        }

        function drawRocket() {
            ctx.clearRect(0, 0, W, H);
            const c = stroke();
            const cx = W / 2 + W * 0.08; // shifted right
            const cy = H * 0.42;
            const scale = Math.min(W, H) * 0.006; // bigger

            time += 1;

            // Rocket body (triangle)
            const bodyW = 50 * scale;
            const bodyH = 110 * scale;
            const noseH = 45 * scale;

            ctx.beginPath();
            ctx.moveTo(cx, cy - bodyH / 2 - noseH);
            ctx.quadraticCurveTo(cx + bodyW * 0.3, cy - bodyH / 2, cx + bodyW / 2, cy + bodyH / 2);
            ctx.lineTo(cx - bodyW / 2, cy + bodyH / 2);
            ctx.quadraticCurveTo(cx - bodyW * 0.3, cy - bodyH / 2, cx, cy - bodyH / 2 - noseH);
            ctx.closePath();
            ctx.strokeStyle = c;
            ctx.lineWidth = 2.5;
            ctx.stroke();

            // Window
            const winR = 14 * scale;
            ctx.beginPath();
            ctx.arc(cx, cy - bodyH * 0.15, winR, 0, Math.PI * 2);
            ctx.strokeStyle = c;
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(cx, cy - bodyH * 0.15, winR * 0.5, 0, Math.PI * 2);
            ctx.fillStyle = c;
            ctx.globalAlpha = 0.5;
            ctx.fill();
            ctx.globalAlpha = 1;

            // Fins
            const finH = 28 * scale;
            const finW = 22 * scale;
            ctx.beginPath();
            ctx.moveTo(cx - bodyW / 2, cy + bodyH / 2 - finH);
            ctx.lineTo(cx - bodyW / 2 - finW, cy + bodyH / 2 + finH * 0.3);
            ctx.lineTo(cx - bodyW / 2, cy + bodyH / 2);
            ctx.closePath();
            ctx.strokeStyle = c;
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(cx + bodyW / 2, cy + bodyH / 2 - finH);
            ctx.lineTo(cx + bodyW / 2 + finW, cy + bodyH / 2 + finH * 0.3);
            ctx.lineTo(cx + bodyW / 2, cy + bodyH / 2);
            ctx.closePath();
            ctx.strokeStyle = c;
            ctx.lineWidth = 2;
            ctx.stroke();

            // Engine nozzle
            const nozzleW = 16 * scale;
            const nozzleH = 10 * scale;
            ctx.beginPath();
            ctx.moveTo(cx - nozzleW / 2, cy + bodyH / 2);
            ctx.lineTo(cx - nozzleW * 0.7, cy + bodyH / 2 + nozzleH);
            ctx.lineTo(cx + nozzleW * 0.7, cy + bodyH / 2 + nozzleH);
            ctx.lineTo(cx + nozzleW / 2, cy + bodyH / 2);
            ctx.closePath();
            ctx.fillStyle = c;
            ctx.fill();

            // Fire flames
            const fireBaseY = cy + bodyH / 2 + nozzleH;
            const fireBaseW = nozzleW * 0.6;

            flames.forEach((f, i) => {
                const flicker = Math.sin(time * f.speed + f.phase);
                const flameLen = (20 + flicker * 12) * scale * f.len;
                const flameW = (6 + flicker * 3) * scale;
                const sway = Math.sin(time * 0.08 + i) * 4 * scale;

                const alpha = 0.15 + (flicker + 1) * 0.1;
                ctx.beginPath();
                ctx.moveTo(cx - fireBaseW / 2 + (i / flames.length - 0.5) * fireBaseW, fireBaseY);
                ctx.quadraticCurveTo(
                    cx + sway + (i / flames.length - 0.5) * flameW * 2,
                    fireBaseY + flameLen * 0.6,
                    cx + sway * 0.5,
                    fireBaseY + flameLen
                );
                ctx.quadraticCurveTo(
                    cx + sway - (i / flames.length - 0.5) * flameW * 2,
                    fireBaseY + flameLen * 0.6,
                    cx + fireBaseW / 2 + (i / flames.length - 0.5) * fireBaseW,
                    fireBaseY
                );
                ctx.closePath();
                ctx.fillStyle = c;
                ctx.globalAlpha = alpha;
                ctx.fill();
                ctx.globalAlpha = 1;
            });

            // Sparks
            for (let s = 0; s < 5; s++) {
                const sparkX = cx + (Math.random() - 0.5) * fireBaseW * 2;
                const sparkY = fireBaseY + Math.random() * 30 * scale;
                const sparkSize = 1 + Math.random() * 2;
                ctx.beginPath();
                ctx.arc(sparkX, sparkY, sparkSize, 0, Math.PI * 2);
                ctx.fillStyle = c;
                ctx.globalAlpha = 0.3 + Math.random() * 0.3;
                ctx.fill();
                ctx.globalAlpha = 1;
            }

            requestAnimationFrame(drawRocket);
        }
        drawRocket();
    }
})();
