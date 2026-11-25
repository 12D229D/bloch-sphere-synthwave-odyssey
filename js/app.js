/**
 * app.js
 * Controlador principal de la SPA Bloch Sphere Synthwave Odyssey:
 * - Ciclo de animación a 60 FPS con rAF
 * - Integración de BlochMath, SynthwaveAudio, RhythmEngine, BlochRenderer, QasmExporter y GameDatabase
 * - Manejo de atajos de teclado y botones de la consola táctil/arcade
 * - Interfaz de HUD y modales de OpenQASM / Cirq
 */

import { BlochMath } from './bloch-math.js';
import { SynthwaveAudio } from './synthwave-audio.js';
import { RhythmEngine } from './rhythm-engine.js';
import { BlochRenderer } from './bloch-renderer.js';
import { QasmExporter } from './qasm-exporter.js';
import { GameDatabase } from './db.js';

class BlochSynthwaveApp {
    constructor() {
        this.blochMath = new BlochMath(14.0, 9.0);
        this.audio = new SynthwaveAudio();
        this.rhythm = new RhythmEngine(this.audio, this.blochMath);
        this.qasmExporter = new QasmExporter();
        this.db = new GameDatabase();

        this.canvas = document.getElementById('bloch-canvas');
        this.renderer = new BlochRenderer(this.canvas, this.blochMath, this.rhythm);

        this.lastFrameTime = performance.now();
        this.pulseAngle = Math.PI / 2; // Por defecto pi/2 para pulsos continuos

        this.initDOMElements();
        this.initEvents();
        this.updateHUD();

        // Iniciar loop de renderizado continuo
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    initDOMElements() {
        // Marcadores de estado
        this.scoreVal = document.getElementById('score-val');
        this.comboVal = document.getElementById('combo-val');
        this.highScoreVal = document.getElementById('high-score-val');
        this.purityBar = document.getElementById('purity-bar');
        this.purityVal = document.getElementById('purity-val');
        this.t1Val = document.getElementById('t1-val');
        this.t2Val = document.getElementById('t2-val');
        this.fidelityVal = document.getElementById('fidelity-val');
        this.ratingFeedback = document.getElementById('rating-feedback');
        this.songProgressBar = document.getElementById('song-progress-bar');
        this.songTimeVal = document.getElementById('song-time-val');

        // Modales
        this.qasmModal = document.getElementById('qasm-modal');
        this.qasmOutput = document.getElementById('qasm-output');
        this.cirqOutput = document.getElementById('cirq-output');

        // Actualizar High Score inicial
        if (this.highScoreVal) {
            this.highScoreVal.innerText = this.db.getHighScore();
        }
    }

    initEvents() {
        window.addEventListener('resize', () => {
            this.renderer.resize();
        });

        // Controles de teclado para compuertas y pulsos cuánticos
        window.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            const key = e.key.toUpperCase();
            switch (key) {
                case 'X':
                    this.executeGate('X');
                    break;
                case 'Y':
                    this.executeGate('Y');
                    break;
                case 'Z':
                    this.executeGate('Z');
                    break;
                case 'H':
                    this.executeGate('H');
                    break;
                case 'S':
                    this.executeGate('S');
                    break;
                case 'T':
                    this.executeGate('T');
                    break;
                case 'E': // Spin Echo
                    this.executeGate('SPINECHO');
                    break;
                case ' ': // Barra espaciadora: Evaluar sincronía en objetivo
                    this.checkHit();
                    break;
                case 'R':
                    this.blochMath.reset();
                    break;
            }
        });

        // Botones de compuertas en la UI
        document.querySelectorAll('.btn-gate').forEach(btn => {
            btn.addEventListener('click', () => {
                const gate = btn.getAttribute('data-gate');
                this.executeGate(gate);
            });
        });

        // Botón de Spin Echo
        const echoBtn = document.getElementById('btn-spin-echo');
        if (echoBtn) {
            echoBtn.addEventListener('click', () => {
                this.executeGate('SPINECHO');
            });
        }

        // Botón de Inicio / Pausa de Pista Synthwave
        const playBtn = document.getElementById('btn-play-track');
        if (playBtn) {
            playBtn.addEventListener('click', () => {
                if (this.rhythm.isGameRunning) {
                    this.rhythm.stopTrack();
                    playBtn.innerHTML = '▶ INICIAR PISTA RÍTMICA';
                    playBtn.classList.remove('active');
                } else {
                    const diffSelect = document.getElementById('difficulty-select');
                    this.rhythm.setDifficulty(diffSelect ? diffSelect.value : 'NORMAL');
                    this.rhythm.startTrack('Neon Larmor Drive', 124);
                    playBtn.innerHTML = '⏹ DETENER PISTA';
                    playBtn.classList.add('active');
                }
            });
        }

        // Sliders de relajación T1 y T2
        const t1Slider = document.getElementById('slider-t1');
        if (t1Slider) {
            t1Slider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                this.blochMath.t1 = val;
                if (this.t1Val) this.t1Val.innerText = val.toFixed(1) + 's';
            });
        }

        const t2Slider = document.getElementById('slider-t2');
        if (t2Slider) {
            t2Slider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                this.blochMath.t2 = val;
                if (this.t2Val) this.t2Val.innerText = val.toFixed(1) + 's';
            });
        }

        // Botones de exportación OpenQASM / Cirq
        const exportBtn = document.getElementById('btn-export-qasm');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.showQasmModal();
            });
        }

        const closeModalBtn = document.getElementById('btn-close-modal');
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => {
                if (this.qasmModal) this.qasmModal.style.display = 'none';
            });
        }

        const resetBtn = document.getElementById('btn-reset-state');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.blochMath.reset();
            });
        }

        const copyQasmBtn = document.getElementById('btn-copy-qasm');
        if (copyQasmBtn) {
            copyQasmBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(this.qasmOutput.value);
                copyQasmBtn.innerText = '¡Copiado!';
                setTimeout(() => { copyQasmBtn.innerText = 'Copiar QASM'; }, 1500);
            });
        }

        const copyCirqBtn = document.getElementById('btn-copy-cirq');
        if (copyCirqBtn) {
            copyCirqBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(this.cirqOutput.value);
                copyCirqBtn.innerText = '¡Copiado!';
                setTimeout(() => { copyCirqBtn.innerText = 'Copiar Cirq'; }, 1500);
            });
        }
    }

    executeGate(gate) {
        this.blochMath.applyGate(gate, this.pulseAngle);
        this.audio.playPulseSfx(gate);
        this.rhythm.recordGateAction(gate, this.pulseAngle);

        // Al disparar un pulso, comprobar si se conecta con el objetivo activo
        this.checkHit();
    }

    checkHit() {
        const hitResult = this.rhythm.checkActiveTarget();
        if (hitResult) {
            this.showFeedback(hitResult.rating, hitResult.points, hitResult.fidelity);
        }
    }

    showFeedback(rating, points, fidelity) {
        if (!this.ratingFeedback) return;

        let color = '#00ffff';
        if (rating === 'PERFECT') color = '#00ffcc';
        else if (rating === 'GREAT') color = '#ff00aa';
        else if (rating === 'GOOD') color = '#ffb703';
        else color = '#ff0055';

        this.ratingFeedback.style.color = color;
        this.ratingFeedback.style.textShadow = `0 0 15px ${color}`;
        this.ratingFeedback.innerHTML = `${rating}! ${points ? `+${points}` : ''} <span style="font-size:0.7em;">(F: ${(fidelity * 100).toFixed(1)}%)</span>`;

        this.ratingFeedback.classList.remove('pulse-anim');
        void this.ratingFeedback.offsetWidth; // trigger reflow
        this.ratingFeedback.classList.add('pulse-anim');
    }

    showQasmModal() {
        if (!this.qasmModal) return;
        const qasm = this.qasmExporter.exportToOpenQASM(this.rhythm.executedGates);
        const cirq = this.qasmExporter.exportToCirq(this.rhythm.executedGates);

        if (this.qasmOutput) this.qasmOutput.value = qasm;
        if (this.cirqOutput) this.cirqOutput.value = cirq;

        this.qasmModal.style.display = 'flex';
    }

    updateHUD() {
        if (this.scoreVal) this.scoreVal.innerText = this.rhythm.score;
        if (this.comboVal) this.comboVal.innerText = this.rhythm.combo;

        const purity = this.blochMath.getPurity();
        if (this.purityBar) {
            this.purityBar.style.width = `${Math.round(purity * 100)}%`;
            if (purity < 0.65) this.purityBar.style.backgroundColor = '#ff0055';
            else if (purity < 0.82) this.purityBar.style.backgroundColor = '#ffb703';
            else this.purityBar.style.backgroundColor = '#00f0ff';
        }
        if (this.purityVal) this.purityVal.innerText = `${(purity * 100).toFixed(1)}%`;

        // Tiempo de canción y progreso
        if (this.rhythm.isGameRunning) {
            const currentTime = this.rhythm.getCurrentSongTime();
            const totalDuration = this.rhythm.songDuration;
            const progress = Math.min(100, (currentTime / totalDuration) * 100);

            if (this.songProgressBar) this.songProgressBar.style.width = `${progress}%`;
            if (this.songTimeVal) {
                const mins = Math.floor(currentTime / 60);
                const secs = Math.floor(currentTime % 60);
                this.songTimeVal.innerText = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
            }
        }
    }

    gameLoop(timestamp) {
        const dt = Math.min(0.1, (timestamp - this.lastFrameTime) / 1000.0);
        this.lastFrameTime = timestamp;

        // 1. Integración de Lindblad RK4 para la dinámica del vector de Bloch
        this.blochMath.stepLindbladRK4(dt, [0, 0, 0], true);

        // 2. Actualización del motor de ritmo
        if (this.rhythm.isGameRunning) {
            this.rhythm.update(this.rhythm.getCurrentSongTime());
        }

        // 3. Renderizado de la esfera de Bloch 3D
        this.renderer.render();

        // 4. Actualización del HUD
        this.updateHUD();

        requestAnimationFrame((t) => this.gameLoop(t));
    }
}

// Inicializar la aplicación al cargar el DOM
window.addEventListener('DOMContentLoaded', () => {
    window.blochApp = new BlochSynthwaveApp();
});
