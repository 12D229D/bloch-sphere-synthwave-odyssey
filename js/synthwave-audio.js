/**
 * synthwave-audio.js
 * Sintetizador Web Audio API autónomo estilo Synthwave / Outrun 80s:
 * - Línea de bajo arpegiada (Rolling 16th Synth Bass)
 * - Acordes y pads espaciales con filtro analógico resonante
 * - Batería electrónica retro (Kick punchy, Snare con reverb y Hi-hats)
 * - Efectos sonoros procedurales para pulsos cuánticos (Laser, Zap, Spin Echo)
 */

export class SynthwaveAudio {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.musicGain = null;
        this.sfxGain = null;

        this.isPlaying = false;
        this.bpm = 120;
        this.nextNoteTime = 0;
        this.currentStep = 0;
        this.timerId = null;

        // Progresión de acordes Synthwave clásica (Am - F - C - G / F - G - Em - Am)
        this.bassNotes = [
            // Am (A1)
            55.0, 55.0, 110.0, 55.0, 55.0, 110.0, 55.0, 110.0,
            // F (F1)
            43.65, 43.65, 87.31, 43.65, 43.65, 87.31, 43.65, 87.31,
            // C (C2)
            65.41, 65.41, 130.81, 65.41, 65.41, 130.81, 65.41, 130.81,
            // G (G1)
            49.00, 49.00, 98.00, 49.00, 49.00, 98.00, 49.00, 98.00
        ];

        this.chordPads = [
            // Am: A3, C4, E4
            [220.0, 261.63, 329.63],
            // F: F3, A3, C4
            [174.61, 220.0, 261.63],
            // C: C4, E4, G4
            [261.63, 329.63, 392.00],
            // G: G3, B3, D4
            [196.00, 246.94, 293.66]
        ];
    }

    init() {
        if (this.ctx) return;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);

        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.setValueAtTime(0.55, this.ctx.currentTime);
        this.musicGain.connect(this.masterGain);

        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
        this.sfxGain.connect(this.masterGain);
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    startTrack(bpm = 120) {
        this.init();
        this.resume();
        this.bpm = bpm;
        this.isPlaying = true;
        this.currentStep = 0;
        this.nextNoteTime = this.ctx.currentTime + 0.05;
        this.schedule();
    }

    stopTrack() {
        this.isPlaying = false;
        if (this.timerId) {
            clearTimeout(this.timerId);
            this.timerId = null;
        }
    }

    schedule() {
        if (!this.isPlaying) return;

        const secondsPerStep = 60.0 / (this.bpm * 4); // Semicorcheas (16th notes)
        const lookahead = 0.15; // ventana de programación en segundos

        while (this.nextNoteTime < this.ctx.currentTime + lookahead) {
            this.playStep(this.currentStep, this.nextNoteTime);
            this.nextNoteTime += secondsPerStep;
            this.currentStep = (this.currentStep + 1) % 32;
        }

        this.timerId = setTimeout(() => this.schedule(), 40);
    }

    playStep(step, time) {
        // 1. Synth Bass en semicorcheas
        const freq = this.bassNotes[step % this.bassNotes.length];
        this.playBassNote(freq, time, 0.1);

        // 2. Batería Synthwave (Kick en 0, 4, 8, 12, 16, 20, 24, 28)
        if (step % 4 === 0) {
            this.playKick(time);
        }

        // Snare en 4, 12, 20, 28 (Backbeat)
        if (step % 8 === 4) {
            this.playSnare(time);
        }

        // Hi-Hat en semicorcheas o contratiempos
        if (step % 2 === 0) {
            this.playHiHat(time, step % 4 === 2 ? 0.08 : 0.04);
        }

        // 3. Synth Pads cada compás (cada 16 pasos)
        if (step % 8 === 0) {
            const chordIdx = Math.floor(step / 8) % this.chordPads.length;
            const chord = this.chordPads[chordIdx];
            this.playPad(chord, time, (60.0 / this.bpm) * 2);
        }
    }

    playBassNote(freq, time, duration) {
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, time);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450, time);
        filter.frequency.exponentialRampToValueAtTime(80, time + duration);
        filter.Q.setValueAtTime(4.0, time);

        gain.gain.setValueAtTime(0.3, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);

        osc.start(time);
        osc.stop(time + duration);
    }

    playPad(chord, time, duration) {
        chord.forEach(freq => {
            const osc = this.ctx.createOscillator();
            const filter = this.ctx.createBiquadFilter();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            // Ligero detune estéreo analógico
            osc.frequency.setValueAtTime(freq, time);
            osc.detune.setValueAtTime((Math.random() - 0.5) * 15, time);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(700, time);
            filter.Q.setValueAtTime(2.0, time);

            gain.gain.setValueAtTime(0.001, time);
            gain.gain.linearRampToValueAtTime(0.06, time + 0.4);
            gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.musicGain);

            osc.start(time);
            osc.stop(time + duration);
        });
    }

    playKick(time) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.frequency.setValueAtTime(140, time);
        osc.frequency.exponentialRampToValueAtTime(35, time + 0.12);

        gain.gain.setValueAtTime(0.65, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

        osc.connect(gain);
        gain.connect(this.musicGain);

        osc.start(time);
        osc.stop(time + 0.23);
    }

    playSnare(time) {
        // Ruido blanco
        const bufferSize = this.ctx.sampleRate * 0.15;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(900, time);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.35, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);

        noise.start(time);
        noise.stop(time + 0.19);
    }

    playHiHat(time, vol = 0.05) {
        const bufferSize = this.ctx.sampleRate * 0.04;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.6;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(6500, time);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(vol, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);

        noise.start(time);
        noise.stop(time + 0.05);
    }

    /**
     * EFECTOS DE SONIDO PROCEDURALES (SFX)
     */

    // Sonido de disparo de pulso de microondas cuántico (Rx, Ry, Rz, Compuertas)
    playPulseSfx(gate = 'X') {
        if (!this.ctx) return;
        this.resume();
        const time = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        let startFreq = 440;
        let endFreq = 880;

        switch (gate.toUpperCase()) {
            case 'X':
            case 'RX':
                startFreq = 300; endFreq = 950;
                osc.type = 'triangle';
                break;
            case 'Y':
            case 'RY':
                startFreq = 500; endFreq = 1200;
                osc.type = 'sawtooth';
                break;
            case 'Z':
            case 'RZ':
                startFreq = 700; endFreq = 350;
                osc.type = 'sine';
                break;
            case 'H':
                startFreq = 350; endFreq = 1400;
                osc.type = 'square';
                break;
            case 'S':
            case 'T':
                startFreq = 900; endFreq = 1800;
                osc.type = 'sine';
                break;
            case 'SPINECHO':
                this.playSpinEchoSfx();
                return;
        }

        osc.frequency.setValueAtTime(startFreq, time);
        osc.frequency.exponentialRampToValueAtTime(endFreq, time + 0.09);

        gain.gain.setValueAtTime(0.25, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(time);
        osc.stop(time + 0.13);
    }

    // Efecto estelar de Eco de Hahn (Spin-Echo) con barrido de resonancia
    playSpinEchoSfx() {
        if (!this.ctx) return;
        this.resume();
        const time = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, time);
        osc.frequency.exponentialRampToValueAtTime(1760, time + 0.28);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(400, time);
        filter.frequency.exponentialRampToValueAtTime(2500, time + 0.28);
        filter.Q.setValueAtTime(6.0, time);

        gain.gain.setValueAtTime(0.4, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(time);
        osc.stop(time + 0.36);
    }

    // Efecto de acierto rítmico (Perfect / Great / Good)
    playHitSfx(rating = 'PERFECT') {
        if (!this.ctx) return;
        this.resume();
        const time = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        if (rating === 'PERFECT') {
            osc.frequency.setValueAtTime(880, time);
            osc.frequency.setValueAtTime(1320, time + 0.05);
            gain.gain.setValueAtTime(0.35, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);
        } else if (rating === 'GREAT') {
            osc.frequency.setValueAtTime(660, time);
            osc.frequency.setValueAtTime(990, time + 0.05);
            gain.gain.setValueAtTime(0.28, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);
        } else if (rating === 'GOOD') {
            osc.frequency.setValueAtTime(550, time);
            gain.gain.setValueAtTime(0.2, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
        } else { // MISS
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(130, time);
            osc.frequency.exponentialRampToValueAtTime(60, time + 0.18);
            gain.gain.setValueAtTime(0.25, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
        }

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(time);
        osc.stop(time + 0.22);
    }
}
