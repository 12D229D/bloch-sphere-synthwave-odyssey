/**
 * db.js
 * Capa de persistencia local SQLite / IndexedDB / WebStorage para partituras,
 * récords de puntuación, fidelidades históricas y secuencias de pulsos QASM.
 */

export class GameDatabase {
    constructor() {
        this.storageKey = 'bloch_synthwave_records';
    }

    /**
     * Guarda el resultado de una partida
     */
    saveRecord(record) {
        const history = this.getRecords();
        const entry = {
            id: Date.now(),
            date: new Date().toISOString(),
            track: record.track || 'Neon Larmor Drive',
            difficulty: record.difficulty || 'NORMAL',
            score: record.score || 0,
            maxCombo: record.maxCombo || 0,
            fidelityAvg: record.fidelityAvg || 0.0,
            stats: record.stats || {},
            qasmSnippet: record.qasmSnippet || ''
        };

        history.unshift(entry);
        // Guardar hasta 50 partidas históricas
        if (history.length > 50) history.pop();

        try {
            localStorage.setItem(this.storageKey, JSON.stringify(history));
        } catch (e) {
            console.error('Error guardando partida en almacenamiento:', e);
        }

        return entry;
    }

    /**
     * Recupera todos los récords históricos
     */
    getRecords() {
        try {
            const raw = localStorage.getItem(this.storageKey);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            console.error('Error leyendo récords:', e);
            return [];
        }
    }

    /**
     * Devuelve el mejor puntaje (High Score)
     */
    getHighScore() {
        const records = this.getRecords();
        if (records.length === 0) return 0;
        return Math.max(...records.map(r => r.score));
    }
}
