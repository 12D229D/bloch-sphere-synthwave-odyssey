/**
 * bloch-math.js / bloch-lindblad-physics.js
 * Física Cuántica SU(2), Ecuación de Bloch con amortiguamiento T1 / T2 (Lindblad)
 * y cálculo de Fidelidad Cuántica.
 */

export class BlochMath {
    constructor(t1 = 12.0, t2 = 8.0) {
        // T1 = Tiempo de relajación longitudinal (Amplitud damping hacia el polo norte |0>)
        // T2 = Tiempo de desfase transversal (Phase damping / decoherencia pura T2* <= 2*T1)
        this.t1 = t1;
        this.t2 = t2;

        // Vector de Bloch [rx, ry, rz] inicializado en |0> (rz = 1.0)
        this.r = [0.0, 0.0, 1.0];

        // Frecuencia de desintonía / precesión de Larmor natural (rad/s) alrededor del eje Z
        this.omegaLarmor = 0.5;

        // Historial de trayectoria para estela luminosa geodésica
        this.trail = [];
        this.maxTrail = 180;
    }

    /**
     * Resetea el estado cuántico al polo norte |0> (estado fundamental)
     */
    reset(state = [0.0, 0.0, 1.0]) {
        this.r = [...state];
        this.trail = [];
    }

    /**
     * Devuelve la pureza del estado cuántico: Tr(rho^2) = (1 + |r|^2) / 2
     * Pureza = 1.0 (estado puro en superficie), Pureza < 1.0 (estado mixto interior)
     */
    getPurity() {
        const lenSq = this.r[0] * this.r[0] + this.r[1] * this.r[1] + this.r[2] * this.r[2];
        return Math.min(1.0, Math.max(0.5, 0.5 * (1.0 + lenSq)));
    }

    /**
     * Longitud del vector de Bloch |r| in [0, 1]
     */
    getLength() {
        return Math.sqrt(this.r[0] * this.r[0] + this.r[1] * this.r[1] + this.r[2] * this.r[2]);
    }

    /**
     * Ángulos polares (theta, phi) en la esfera de Bloch
     * theta in [0, pi], phi in [0, 2pi)
     */
    getAngles() {
        const len = this.getLength();
        if (len < 1e-6) return { theta: 0, phi: 0 };
        const nz = Math.max(-1, Math.min(1, this.r[2] / len));
        const theta = Math.acos(nz);
        let phi = Math.atan2(this.r[1], this.r[0]);
        if (phi < 0) phi += 2 * Math.PI;
        return { theta, phi };
    }

    /**
     * Matriz de densidad 2x2 asociada al vector de Bloch r:
     * rho = 0.5 * (I + rx*sigma_x + ry*sigma_y + rz*sigma_z)
     */
    getDensityMatrix() {
        const [rx, ry, rz] = this.r;
        return {
            rho00: { re: 0.5 * (1 + rz), im: 0 },
            rho01: { re: 0.5 * rx, im: -0.5 * ry },
            rho10: { re: 0.5 * rx, im: 0.5 * ry },
            rho11: { re: 0.5 * (1 - rz), im: 0 }
        };
    }

    /**
     * Fidelidad Cuántica F = <target | rho | target> = 0.5 * (1 + r . r_target)
     */
    calculateFidelity(targetR) {
        const dot = this.r[0] * targetR[0] + this.r[1] * targetR[1] + this.r[2] * targetR[2];
        return Math.max(0.0, Math.min(1.0, 0.5 * (1.0 + dot)));
    }

    /**
     * Aplica una rotación instantánea SU(2) de ángulo theta alrededor de un eje unitario [nx, ny, nz]
     * Fórmula de rotación de Rodrigues en SO(3):
     * v_rot = v*cos(theta) + (n x v)*sin(theta) + n*(n . v)*(1 - cos(theta))
     */
    rotateAxis(axis, angle) {
        const [nx, ny, nz] = axis;
        const norm = Math.hypot(nx, ny, nz);
        if (norm < 1e-6) return;
        const ux = nx / norm;
        const uy = ny / norm;
        const uz = nz / norm;

        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);
        const dot = ux * this.r[0] + uy * this.r[1] + uz * this.r[2];

        // Cross product: n x r
        const cx = uy * this.r[2] - uz * this.r[1];
        const cy = uz * this.r[0] - ux * this.r[2];
        const cz = ux * this.r[1] - uy * this.r[0];

        const rxNew = this.r[0] * cosA + cx * sinA + ux * dot * (1 - cosA);
        const ryNew = this.r[1] * cosA + cy * sinA + uy * dot * (1 - cosA);
        const rzNew = this.r[2] * cosA + cz * sinA + uz * dot * (1 - cosA);

        this.r = [rxNew, ryNew, rzNew];
        this.addTrailPoint();
    }

    /**
     * Compuertas cuánticas estándar de Clifford y rotaciones continuas
     */
    applyGate(gateType, pulseStrength = 1.0) {
        switch (gateType.toUpperCase()) {
            case 'X': // Pauli X: rotación pi en torno a X (|0> <-> |1>)
                this.rotateAxis([1, 0, 0], Math.PI * pulseStrength);
                break;
            case 'Y': // Pauli Y: rotación pi en torno a Y
                this.rotateAxis([0, 1, 0], Math.PI * pulseStrength);
                break;
            case 'Z': // Pauli Z: rotación pi en torno a Z (cambio de fase |+> <-> |->)
                this.rotateAxis([0, 0, 1], Math.PI * pulseStrength);
                break;
            case 'H': // Hadamard: rotación pi en torno a (X + Z)/sqrt(2)
                this.rotateAxis([1 / Math.SQRT2, 0, 1 / Math.SQRT2], Math.PI * pulseStrength);
                break;
            case 'S': // Phase gate S: rotación pi/2 en torno a Z
                this.rotateAxis([0, 0, 1], (Math.PI / 2) * pulseStrength);
                break;
            case 'SDAG': // S dagger: rotación -pi/2 en torno a Z
                this.rotateAxis([0, 0, 1], (-Math.PI / 2) * pulseStrength);
                break;
            case 'T': // T gate: rotación pi/4 en torno a Z
                this.rotateAxis([0, 0, 1], (Math.PI / 4) * pulseStrength);
                break;
            case 'RX': // Pulso de microondas continuo Rx(theta)
                this.rotateAxis([1, 0, 0], pulseStrength);
                break;
            case 'RY': // Pulso de microondas continuo Ry(theta)
                this.rotateAxis([0, 1, 0], pulseStrength);
                break;
            case 'RZ': // Pulso de microondas continuo Rz(phi)
                this.rotateAxis([0, 0, 1], pulseStrength);
                break;
            case 'SPINECHO': // Pulso de refocalización Pi (Hahn Spin Echo) en X
                this.rotateAxis([1, 0, 0], Math.PI);
                // Restaura parcialmente coherencia transversal reenfocando el desfase acumulado
                const t2Recovery = Math.min(1.0, this.getLength() * 1.25);
                this.r[0] = this.r[0] * 1.15;
                this.r[1] = this.r[1] * 1.15;
                this.normalizeToCap(1.0);
                break;
        }
    }

    normalizeToCap(cap = 1.0) {
        const len = this.getLength();
        if (len > cap) {
            this.r[0] = (this.r[0] / len) * cap;
            this.r[1] = (this.r[1] / len) * cap;
            this.r[2] = (this.r[2] / len) * cap;
        }
    }

    /**
     * Paso de evolución en el tiempo continuo dt bajo disipación de Lindblad (T1, T2) y Larmor
     * drx/dt = -rx/T2 + omega * ry
     * dry/dt = -ry/T2 - omega * rx
     * drz/dt = -(rz - 1.0) / T1  (relajación al estado fundamental |0>, rz = +1)
     */
    stepLindbladRK4(dt, omegaDrive = [0, 0, 0], applyDissipation = true) {
        if (dt <= 0) return;

        const derivatives = (state) => {
            const [rx, ry, rz] = state;
            // Precesión libre más campo de control externo Omega: dR/dt = Omega x R
            const totalOmegaX = omegaDrive[0];
            const totalOmegaY = omegaDrive[1];
            const totalOmegaZ = omegaDrive[2] + this.omegaLarmor;

            // Torque coherente: Omega x R
            const torqX = totalOmegaY * rz - totalOmegaZ * ry;
            const torqY = totalOmegaZ * rx - totalOmegaX * rz;
            const torqZ = totalOmegaX * ry - totalOmegaY * rx;

            // Amortiguamiento y disipación de Lindblad
            let dissX = 0;
            let dissY = 0;
            let dissZ = 0;

            if (applyDissipation) {
                dissX = -rx / this.t2;
                dissY = -ry / this.t2;
                dissZ = -(rz - 1.0) / this.t1;
            }

            return [
                torqX + dissX,
                torqY + dissY,
                torqZ + dissZ
            ];
        };

        // Integración Runge-Kutta de 4to orden (RK4)
        const y0 = [...this.r];
        const k1 = derivatives(y0);

        const y1 = [
            y0[0] + 0.5 * dt * k1[0],
            y0[1] + 0.5 * dt * k1[1],
            y0[2] + 0.5 * dt * k1[2]
        ];
        const k2 = derivatives(y1);

        const y2 = [
            y0[0] + 0.5 * dt * k2[0],
            y0[1] + 0.5 * dt * k2[1],
            y0[2] + 0.5 * dt * k2[2]
        ];
        const k3 = derivatives(y2);

        const y3 = [
            y0[0] + dt * k3[0],
            y0[1] + dt * k3[1],
            y0[2] + dt * k3[2]
        ];
        const k4 = derivatives(y3);

        this.r[0] += (dt / 6.0) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
        this.r[1] += (dt / 6.0) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
        this.r[2] += (dt / 6.0) * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]);

        this.normalizeToCap(1.0);
        this.addTrailPoint();
    }

    addTrailPoint() {
        this.trail.push([...this.r]);
        if (this.trail.length > this.maxTrail) {
            this.trail.shift();
        }
    }
}
