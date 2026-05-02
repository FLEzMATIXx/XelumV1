(function () {
    const canvas = document.getElementById('tesseractCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let W, H, cx, cy;
    function resize() {
        const rect = canvas.parentElement.getBoundingClientRect();
        W = rect.width;
        H = rect.height;
        canvas.width = W * window.devicePixelRatio;
        canvas.height = H * window.devicePixelRatio;
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        cx = W / 2;
        cy = H / 2;
    }
    resize();
    window.addEventListener('resize', resize);

    // 16 vertices of a tesseract (all combinations of ±1)
    function makeVerts() {
        const v = [];
        for (let i = 0; i < 16; i++) {
            v.push([
                (i & 1) ? 1 : -1,
                (i & 2) ? 1 : -1,
                (i & 4) ? 1 : -1,
                (i & 8) ? 1 : -1
            ]);
        }
        return v;
    }

    // Edges: inner cube (0-7), outer cube (8-15), connecting edges
    const edges = [];
    // Inner cube edges
    for (let a = 0; a < 8; a++) {
        for (let b = a + 1; b < 8; b++) {
            let diff = 0;
            for (let k = 0; k < 3; k++) {
                if (((a >> k) & 1) !== ((b >> k) & 1)) diff++;
            }
            if (diff === 1) edges.push([a, b]);
        }
    }
    // Outer cube edges
    for (let a = 8; a < 16; a++) {
        for (let b = a + 1; b < 16; b++) {
            let diff = 0;
            for (let k = 0; k < 3; k++) {
                if ((((a - 8) >> k) & 1) !== (((b - 8) >> k) & 1)) diff++;
            }
            if (diff === 1) edges.push([a, b]);
        }
    }
    // Connecting edges
    for (let i = 0; i < 8; i++) edges.push([i, i + 8]);

    let angleXW = 0, angleYW = 0.3, angleZW = 0.6;
    let angleXY = 0, angleYZ = 0;

    function rotate4D(v, aXW, aYW, aZW, aXY, aYZ) {
        let [x, y, z, w] = v;

        // XW rotation
        let c = Math.cos(aXW), s = Math.sin(aXW);
        [x, w] = [x * c - w * s, x * s + w * c];

        // YW rotation
        c = Math.cos(aYW); s = Math.sin(aYW);
        [y, w] = [y * c - w * s, y * s + w * c];

        // ZW rotation
        c = Math.cos(aZW); s = Math.sin(aZW);
        [z, w] = [z * c - w * s, z * s + w * c];

        // XY rotation
        c = Math.cos(aXY); s = Math.sin(aXY);
        [x, y] = [x * c - y * s, x * s + y * c];

        // YZ rotation
        c = Math.cos(aYZ); s = Math.sin(aYZ);
        [y, z] = [y * c - z * s, y * s + z * c];

        return [x, y, z, w];
    }

    function project(v) {
        // 4D -> 3D perspective (by w)
        const dist4D = 2.5;
        const s4 = 1 / (dist4D - v[3]);
        const x3 = v[0] * s4;
        const y3 = v[1] * s4;
        const z3 = v[2] * s4;

        // 3D -> 2D perspective (by z)
        const dist3D = 3.5;
        const s3 = 1 / (dist3D - z3);
        return [
            cx + x3 * s3 * Math.min(W, H) * 0.35,
            cy + y3 * s3 * Math.min(W, H) * 0.35,
            z3
        ];
    }

    function getEdgeColor(z1, z2) {
        const avgZ = (z1 + z2) / 2;
        const depth = (avgZ + 1) / 2; // 0..1
        const light = Math.round(30 + depth * 55); // 30%..85%
        return `hsl(0, 0%, ${light}%)`;
    }

    function isDark() {
        return document.documentElement.getAttribute('data-theme') === 'dark';
    }

    const baseVerts = makeVerts();

    function draw() {
        ctx.clearRect(0, 0, W, H);
        const dark = isDark();

        angleXW += 0.008;
        angleYW += 0.005;
        angleZW += 0.003;
        angleXY += 0.004;
        angleYZ += 0.006;

        // Rotate all vertices
        const projected = baseVerts.map(v => {
            const r = rotate4D(v, angleXW, angleYW, angleZW, angleXY, angleYZ);
            return project(r);
        });

        // Sort edges by average Z for proper depth
        const edgesWithZ = edges.map(([a, b]) => ({
            a, b,
            z: (projected[a][2] + projected[b][2]) / 2
        }));
        edgesWithZ.sort((e1, e2) => e1.z - e2.z);

        // Draw edges
        for (const e of edgesWithZ) {
            const [x1, y1, z1] = projected[e.a];
            const [x2, y2, z2] = projected[e.b];

            const color = getEdgeColor(z1, z2);
            const alpha = 0.3 + ((z1 + z2) / 2 + 1) / 2 * 0.7;
            const width = 1 + ((z1 + z2) / 2 + 1) / 2 * 2;

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.strokeStyle = dark ? '#ffffff' : '#000000';
            ctx.globalAlpha = alpha;
            ctx.lineWidth = width;
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

        // Draw vertices as glowing dots
        for (let i = 0; i < projected.length; i++) {
            const [x, y, z] = projected[i];
            const size = 2 + (z + 1) / 2 * 3;
            const alpha = 0.5 + (z + 1) / 2 * 0.5;
            const dotColor = dark ? '255, 255, 255' : '0, 0, 0';

            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${dotColor}, ${alpha})`;
            ctx.fill();

            // Glow
            const glow = ctx.createRadialGradient(x, y, 0, x, y, size * 4);
            glow.addColorStop(0, `rgba(${dotColor}, ${alpha * 0.3})`);
            glow.addColorStop(1, `rgba(${dotColor}, 0)`);
            ctx.beginPath();
            ctx.arc(x, y, size * 4, 0, Math.PI * 2);
            ctx.fillStyle = glow;
            ctx.fill();
        }

        requestAnimationFrame(draw);
    }

    draw();
})();
