/**
 * bloch-renderer.js / sphere-3d-renderer.js
 * Renderizador 3D interactivo en Canvas con proyección en perspectiva:
 * - Esfera holográfica wireframe con paralelos, meridianos y ecuador
 * - Ejes cuánticos X (rojo/magenta), Y (verde/amarillo cian), Z (azul/púrpura)
 * - Polos etiquetados: |0⟩, |1⟩, |+⟩, |−⟩, |+i⟩, |−i⟩
 * - Vector de estado de Bloch con flecha 3D, punta cónica y aura neón resplandeciente
 * - Estela luminosa geodésica de la trayectoria histórica SU(2)
 * - Anillos concéntricos de estados objetivo rítmicos proyectados sobre la superficie
 * - Rotación interactiva con ratón (Pitch / Yaw) y auto-órbita fluida
 */

export class BlochRenderer {
    constructor(canvas, blochMath, rhythmEngine) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.bloch = blochMath;
        this.rhythm = rhythmEngine;

        // Parámetros de cámara 3D
        this.radius = 160; // Radio de la esfera en píxeles
        this.yaw = 0.6;    // Rotación alrededor de Y
        this.pitch = 0.35; // Rotación alrededor de X
        this.isDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;

        // Auto rotación sutil
        this.autoRotate = true;
        this.rotationSpeed = 0.003;

        this.initMouseEvents();
        this.resize();
    }

    resize() {
        const rect = this.canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.ctx.scale(dpr, dpr);
        this.width = rect.width;
        this.height = rect.height;
        this.radius = Math.min(this.width, this.height) * 0.32;
    }

    initMouseEvents() {
        this.canvas.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
            this.autoRotate = false;
        });

        window.addEventListener('mouseup', () => {
            this.isDragging = false;
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            const dx = e.clientX - this.lastMouseX;
            const dy = e.clientY - this.lastMouseY;
            this.yaw += dx * 0.008;
            this.pitch += dy * 0.008;
            this.pitch = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, this.pitch));
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
        });

        // Soporte táctil móvil
        this.canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                this.isDragging = true;
                this.lastMouseX = e.touches[0].clientX;
                this.lastMouseY = e.touches[0].clientY;
                this.autoRotate = false;
            }
        }, { passive: true });

        window.addEventListener('touchend', () => {
            this.isDragging = false;
        });

        window.addEventListener('touchmove', (e) => {
            if (!this.isDragging || e.touches.length !== 1) return;
            const dx = e.touches[0].clientX - this.lastMouseX;
            const dy = e.touches[0].clientY - this.lastMouseY;
            this.yaw += dx * 0.008;
            this.pitch += dy * 0.008;
            this.pitch = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, this.pitch));
            this.lastMouseX = e.touches[0].clientX;
            this.lastMouseY = e.touches[0].clientY;
        }, { passive: true });
    }

    /**
     * Proyección 3D a 2D en pantalla con cámara esférica
     * Coordenadas físicas: X (derecha), Y (profundidad), Z (arriba)
     */
    project(x, y, z) {
        // 1. Rotación alrededor de Z/Y (Yaw)
        const cosY = Math.cos(this.yaw);
        const sinY = Math.sin(this.yaw);
        const x1 = x * cosY - y * sinY;
        const y1 = x * sinY + y * cosY;
        const z1 = z;

        // 2. Rotación alrededor de X (Pitch)
        const cosP = Math.cos(this.pitch);
        const sinP = Math.sin(this.pitch);
        const x2 = x1;
        const y2 = y1 * cosP - z1 * sinP;
        const z2 = y1 * sinP + z1 * cosP;

        // 3. Proyección en perspectiva
        const cameraDistance = 3.5;
        const scale = cameraDistance / (cameraDistance - y2);

        const screenX = (this.width / 2) + x2 * this.radius * scale;
        // Invertimos Z para que Z=+1 esté arriba en pantalla
        const screenY = (this.height / 2) - z2 * this.radius * scale;

        return {
            x: screenX,
            y: screenY,
            zDepth: y2, // para z-sorting
            scale: scale
        };
    }

    render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.width, this.height);

        if (this.autoRotate) {
            this.yaw += this.rotationSpeed;
        }

        const cx = this.width / 2;
        const cy = this.height / 2;

        // Fondo y resplandor radial central de la cabina
        const grad = ctx.createRadialGradient(cx, cy, this.radius * 0.1, cx, cy, this.radius * 1.5);
        grad.addColorStop(0, 'rgba(40, 15, 65, 0.45)');
        grad.addColorStop(0.7, 'rgba(12, 6, 28, 0.85)');
        grad.addColorStop(1, 'rgba(5, 3, 12, 0.95)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.width, this.height);

        // 1. Dibujar esfera base y rejilla wireframe holográfica
        this.renderWireframe();

        // 2. Dibujar ejes cuánticos X, Y, Z
        this.renderAxes();

        // 3. Dibujar estela luminosa histórica del vector de Bloch
        this.renderTrail();

        // 4. Dibujar anillos y objetivos rítmicos en la superficie
        this.renderRhythmTargets();

        // 5. Dibujar vector de Bloch activo con cabeza de flecha y resplandor
        this.renderBlochVector();

        // 6. Dibujar etiquetas de los polos (|0>, |1>, |+>, |->, etc.)
        this.renderPoleLabels();
    }

    renderWireframe() {
        const ctx = this.ctx;

        // Paralelos (Latitudes)
        const latitudes = [-0.66, -0.33, 0, 0.33, 0.66];
        latitudes.forEach(lat => {
            const z = lat;
            const rLat = Math.sqrt(Math.max(0, 1 - z * z));
            ctx.beginPath();
            const segments = 48;
            for (let i = 0; i <= segments; i++) {
                const angle = (i / segments) * 2 * Math.PI;
                const x = rLat * Math.cos(angle);
                const y = rLat * Math.sin(angle);
                const p = this.project(x, y, z);
                if (i === 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
            }
            ctx.strokeStyle = lat === 0 ? 'rgba(0, 240, 255, 0.4)' : 'rgba(180, 50, 255, 0.18)';
            ctx.lineWidth = lat === 0 ? 1.8 : 0.9;
            ctx.stroke();
        });

        // Meridianos (Longitudes)
        const longitudes = [0, Math.PI / 4, Math.PI / 2, 3 * Math.PI / 4];
        longitudes.forEach(lon => {
            ctx.beginPath();
            const segments = 48;
            for (let i = 0; i <= segments; i++) {
                const angle = (i / segments) * 2 * Math.PI;
                const z = Math.cos(angle);
                const rMer = Math.sin(angle);
                const x = rMer * Math.cos(lon);
                const y = rMer * Math.sin(lon);
                const p = this.project(x, y, z);
                if (i === 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
            }
            ctx.strokeStyle = 'rgba(140, 40, 230, 0.16)';
            ctx.lineWidth = 0.9;
            ctx.stroke();
        });

        // Círculo límite ecuatorial exterior
        ctx.beginPath();
        ctx.arc(this.width / 2, this.height / 2, this.radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 0, 128, 0.25)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
    }

    renderAxes() {
        const ctx = this.ctx;
        const origin = this.project(0, 0, 0);

        const axes = [
            { dir: [1.25, 0, 0], color: '#ff007f', label: '+X (|+)⟩' },
            { dir: [-1.25, 0, 0], color: 'rgba(255, 0, 128, 0.3)', label: '−X (|−⟩)' },
            { dir: [0, 1.25, 0], color: '#00f0ff', label: '+Y (|+i⟩)' },
            { dir: [0, -1.25, 0], color: 'rgba(0, 240, 255, 0.3)', label: '−Y (|−i⟩)' },
            { dir: [0, 0, 1.25], color: '#ffb703', label: '+Z (|0⟩)' },
            { dir: [0, 0, -1.25], color: 'rgba(255, 183, 3, 0.3)', label: '−Z (|1⟩)' }
        ];

        axes.forEach(axis => {
            const p = this.project(axis.dir[0], axis.dir[1], axis.dir[2]);
            ctx.beginPath();
            ctx.moveTo(origin.x, origin.y);
            ctx.lineTo(p.x, p.y);
            ctx.strokeStyle = axis.color;
            ctx.lineWidth = 1.6;
            ctx.stroke();
        });
    }

    renderTrail() {
        const trail = this.bloch.trail;
        if (trail.length < 2) return;
        const ctx = this.ctx;

        ctx.beginPath();
        for (let i = 0; i < trail.length; i++) {
            const pt = trail[i];
            const p = this.project(pt[0], pt[1], pt[2]);
            if (i === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
        }

        ctx.strokeStyle = 'rgba(0, 255, 200, 0.65)';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#00ffcc';
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.shadowBlur = 0; // reset
    }

    renderRhythmTargets() {
        if (!this.rhythm.isGameRunning) return;
        const ctx = this.ctx;
        const songTime = this.rhythm.getCurrentSongTime();

        this.rhythm.targets.forEach(target => {
            if (target.solved) return;
            const timeDiff = target.hitTime - songTime;

            // Mostrar solo si está dentro de la ventana de aproximación (4 segundos antes)
            if (timeDiff > 0 && timeDiff < 4.0) {
                const vec = target.targetVector;
                const p = this.project(vec[0], vec[1], vec[2]);

                // Animación de pulso concéntrico que se encoge hacia el estado
                const progress = timeDiff / 4.0; // 1.0 (lejos) -> 0.0 (impacto)
                const ringRadius = 14 + progress * 40;

                ctx.beginPath();
                ctx.arc(p.x, p.y, ringRadius, 0, Math.PI * 2);
                ctx.strokeStyle = target.isEcho ? '#ffe600' : (progress < 0.2 ? '#00f0ff' : '#ff00aa');
                ctx.lineWidth = 2.5;
                ctx.shadowColor = target.isEcho ? '#ffe600' : '#00f0ff';
                ctx.shadowBlur = 12;
                ctx.stroke();
                ctx.shadowBlur = 0;

                // Texto con el nombre del objetivo
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 12px "Orbitron", monospace';
                ctx.textAlign = 'center';
                ctx.fillText(target.name, p.x, p.y - ringRadius - 6);
            }
        });
    }

    renderBlochVector() {
        const ctx = this.ctx;
        const [rx, ry, rz] = this.bloch.r;
        const origin = this.project(0, 0, 0);
        const tip = this.project(rx, ry, rz);

        const purity = this.bloch.getPurity();

        // 1. Trazado del cuerpo del vector (flecha neón)
        ctx.beginPath();
        ctx.moveTo(origin.x, origin.y);
        ctx.lineTo(tip.x, tip.y);

        // El color cambia si la pureza cuántica decae por T1 / T2
        let vectorColor = '#00ffff';
        if (purity < 0.75) vectorColor = '#ffb703';
        if (purity < 0.6) vectorColor = '#ff0055';

        ctx.strokeStyle = vectorColor;
        ctx.lineWidth = 4.0;
        ctx.shadowColor = vectorColor;
        ctx.shadowBlur = 16;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // 2. Esfera en la punta del vector de Bloch
        ctx.beginPath();
        ctx.arc(tip.x, tip.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = vectorColor;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Aura pulsante de coherencia
        ctx.beginPath();
        ctx.arc(tip.x, tip.y, 14, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }

    renderPoleLabels() {
        const ctx = this.ctx;
        ctx.font = 'bold 13px "Orbitron", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const poles = [
            { pos: [0, 0, 1.35], text: '|0⟩', color: '#ffb703' },
            { pos: [0, 0, -1.35], text: '|1⟩', color: '#ffb703' },
            { pos: [1.38, 0, 0], text: '|+⟩', color: '#ff007f' },
            { pos: [-1.38, 0, 0], text: '|−⟩', color: '#ff007f' },
            { pos: [0, 1.38, 0], text: '|+i⟩', color: '#00f0ff' },
            { pos: [0, -1.38, 0], text: '|−i⟩', color: '#00f0ff' }
        ];

        poles.forEach(p => {
            const pt = this.project(p.pos[0], p.pos[1], p.pos[2]);
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 8;
            ctx.fillText(p.text, pt.x, pt.y);
        });
        ctx.shadowBlur = 0;
    }
}
