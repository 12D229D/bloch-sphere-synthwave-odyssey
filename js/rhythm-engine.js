/**
 * rhythm-engine.js / pulse-rhythm-sequencer.js
 * Generador de secuencias de objetivos de estado cuántico al ritmo del BPM,
 * cálculo de ventanas temporales de acierto (Hit Windows),
 * evaluación de Fidelidad Cuántica y sistema de Puntuación & Combo.
 */

export class RhythmEngine {
    constructor(audioEngine, blochMath) {
        this.audio = audioEngine;
        this.bloch = blochMath;

        this.bpm = 120;
        this.difficulty = 'NORMAL'; // 'EASY', 'NORMAL', 'EXPERT'
        this.targets = [];
        this.activeTargetIndex = 0;

        // Puntuación y estadísticas
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.stats = {
            perfect: 0,
            great: 0,
            good: 0,
            miss: 0,
            echoSuccess: 0
        };

        // Estado del juego
        this.isGameRunning = false;
        this.startTime = 0;
        this.songDuration = 60; // segundos de canción

        // Lista de estados cuánticos estándar de prueba
        this.knownStates = [
            { name: '|0⟩', vector: [0, 0, 1], desc: 'Polo Norte (Ground)' },
            { name: '|1⟩', vector: [0, 0, -1], desc: 'Polo Sur (Excited)' },
            { name: '|+⟩', vector: [1, 0, 0], desc: 'Superposición Eje X' },
            { name: '|−⟩', vector: [-1, 0, 0], desc: 'Superposición Fase Pi' },
            { name: '|+i⟩', vector: [0, 1, 0], desc: 'Superposición Eje Y' },
            { name: '|−i⟩', vector: [0, -1, 0], desc: 'Superposición Fase -Pi/2' },
            { name: '|T⟩', vector: [1 / Math.SQRT2, 1 / Math.SQRT2, 0], desc: 'Estado T (Superposición ecuatorial Pi/4)' }
        ];

        // Secuencia ejecutada de pulsos para compilación a QASM
        this.executedGates = [];
    }

    setDifficulty(diff) {
        this.difficulty = diff;
    }

    startTrack(trackName = 'Neon Larmor Drive', bpm = 124) {
        this.bpm = bpm;
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.stats = { perfect: 0, great: 0, good: 0, miss: 0, echoSuccess: 0 };
        this.executedGates = [];
        this.activeTargetIndex = 0;

        this.audio.startTrack(this.bpm);
        this.startTime = performance.now() / 1000.0;
        this.isGameRunning = true;

        this.generateBeatmap();
    }

    stopTrack() {
        this.isGameRunning = false;
        this.audio.stopTrack();
    }

    /**
     * Genera la secuencia rítmica de anillos objetivos en la pista
     */
    generateBeatmap() {
        this.targets = [];
        const secondsPerBeat = 60.0 / this.bpm;
        let beatInterval = 4; // Cada 4 pulsos (1 compás en 4/4)

        if (this.difficulty === 'EASY') beatInterval = 6;
        if (this.difficulty === 'EXPERT') beatInterval = 2;

        const totalBeats = Math.floor(this.songDuration / secondsPerBeat);

        // Primer beat de aviso tras 3 segundos
        let currentBeat = 4;

        while (currentBeat < totalBeats - 2) {
            const hitTime = currentBeat * secondsPerBeat;
            const stateIdx = Math.floor(Math.random() * this.knownStates.length);
            const stateObj = this.knownStates[stateIdx];

            // Ocasionalmente insertar un evento de amenaza de desfase que requiere Spin-Echo
            const isEchoEvent = (this.targets.length > 0 && this.targets.length % 5 === 0);

            this.targets.push({
                id: this.targets.length + 1,
                hitTime: hitTime, // segundo exacto de sincronía
                targetVector: stateObj.vector,
                name: isEchoEvent ? '🌀 SPIN ECHO RECOVERY' : stateObj.name,
                isEcho: isEchoEvent,
                solved: false,
                result: null,
                fidelity: 0
            });

            currentBeat += beatInterval;
        }
    }

    /**
     * Devuelve el tiempo actual de la pista en segundos
     */
    getCurrentSongTime() {
        if (!this.isGameRunning) return 0;
        return (performance.now() / 1000.0) - this.startTime;
    }

    /**
     * Registro de compuerta cuántica aplicada por el jugador
     */
    recordGateAction(gateType, pulseStrength = 1.0) {
        const time = this.getCurrentSongTime();
        this.executedGates.push({
            gate: gateType,
            strength: pulseStrength,
            time: time,
            qubitStateAfter: [...this.bloch.r]
        });

        if (gateType === 'SPINECHO') {
            this.stats.echoSuccess++;
        }
    }

    /**
     * Evalúa el objetivo más próximo al disparar un pulso o al cruzar el instante musical
     */
    update(currentTime) {
        if (!this.isGameRunning) return;

        // Comprueba si la canción llegó a su fin
        if (currentTime >= this.songDuration) {
            this.stopTrack();
            return;
        }

        // Ventana de tolerancia temporal (segundos)
        const hitWindow = 0.55;

        for (let i = 0; i < this.targets.length; i++) {
            const target = this.targets[i];
            if (target.solved) continue;

            const timeDiff = target.hitTime - currentTime;

            // Si el tiempo del objetivo ya pasó de largo la ventana de acierto: MISS
            if (timeDiff < -hitWindow) {
                target.solved = true;
                target.result = 'MISS';
                target.fidelity = this.bloch.calculateFidelity(target.targetVector);
                this.handleMiss();
                break;
            }
        }
    }

    /**
     * El jugador confirma o evalúa el estado actual contra el target más cercano
     */
    checkActiveTarget() {
        if (!this.isGameRunning) return null;
        const currentTime = this.getCurrentSongTime();
        const hitWindow = 0.65; // Tolerancia de compás en segundos

        // Busca el primer objetivo no resuelto dentro de la ventana de tiempo
        const target = this.targets.find(t => !t.solved && Math.abs(t.hitTime - currentTime) <= hitWindow);

        if (!target) {
            return null; // Disparo fuera de ventana rítmica
        }

        const fidelity = target.isEcho 
            ? this.bloch.getLength() // En eco de espín buscamos restaurar la pureza |r|
            : this.bloch.calculateFidelity(target.targetVector);

        target.solved = true;
        target.fidelity = fidelity;

        const timeDiff = Math.abs(target.hitTime - currentTime);

        let rating = 'MISS';
        let basePoints = 0;

        if (fidelity >= 0.94 && timeDiff < 0.22) {
            rating = 'PERFECT';
            basePoints = 1000;
            this.stats.perfect++;
        } else if (fidelity >= 0.85 && timeDiff < 0.40) {
            rating = 'GREAT';
            basePoints = 650;
            this.stats.great++;
        } else if (fidelity >= 0.70 && timeDiff < hitWindow) {
            rating = 'GOOD';
            basePoints = 350;
            this.stats.good++;
        } else {
            rating = 'MISS';
            this.handleMiss();
            this.audio.playHitSfx('MISS');
            target.result = 'MISS';
            return { rating: 'MISS', fidelity, target };
        }

        // Acierto: Aumentar combo y puntos con multiplicador
        this.combo++;
        if (this.combo > this.maxCombo) this.maxCombo = this.combo;

        const multiplier = 1 + Math.min(4, Math.floor(this.combo / 5)) * 0.5; // Hasta x3.0
        const gainedPoints = Math.round(basePoints * multiplier);
        this.score += gainedPoints;

        target.result = rating;
        this.audio.playHitSfx(rating);

        return {
            rating,
            fidelity,
            points: gainedPoints,
            multiplier,
            combo: this.combo,
            target
        };
    }

    handleMiss() {
        this.combo = 0;
        this.stats.miss++;
        this.audio.playHitSfx('MISS');
    }
}
