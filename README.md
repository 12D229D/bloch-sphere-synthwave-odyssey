# 🌌 Bloch Sphere Synthwave Odyssey: SU(2) Pulse Control Arcade

> **Capa 4: Computación Cuántica Híbrida & Control Coherente de Qubits**  
> Videojuego rítmico retro-futurista donde el jugador controla el vector de estado cuántico sobre la **Esfera de Bloch** mediante pulsos de microondas y compuertas $SU(2)$, contrarrestando la decoherencia ($T_1, T_2$) al compás de música Synthwave generada proceduralmente con la Web Audio API.

---

## 🕹️ Mecánicas de Juego

1. **El Vector de Bloch $\vec{r}$:**
   Representa el estado cuántico de un cúbit de dos niveles:
   $$\vec{r} = (\sin\theta\cos\phi, \sin\theta\sin\phi, \cos\theta)$$
   - Polo Norte: $|0\rangle$ (Estado fundamental / Ground state).
   - Polo Sur: $|1\rangle$ (Estado excitado).
   - Ecuador: Superposiciones balanceadas $|+\rangle, |-\rangle, |+i\rangle, |-i\rangle$.

2. **Decoherencia y Ecuación de Bloch-Lindblad:**
   - **Relajación Longitudinal ($T_1$):** El vector decae espontáneamente hacia el estado fundamental $|0\rangle$.
   - **Desfase Transversal ($T_2$):** La coherencia en el plano $XY$ se disipa por fluctuaciones electromagnéticas de fondo, encogiendo el vector hacia el interior de la esfera (estado mixto, $\text{Tr}(\rho^2) < 1$).
   - **Precesión de Larmor:** Rotación continua alrededor del eje $Z$.

3. **Pulsos Rítmicos y Compuertas de Clifford:**
   - **Pauli X (`[X]`):** Rota $\pi$ radianes en torno al eje $X$ (bit-flip $|0\rangle \leftrightarrow |1\rangle$).
   - **Pauli Y (`[Y]`):** Rota $\pi$ radianes en torno al eje $Y$.
   - **Pauli Z (`[Z]`):** Rota $\pi$ radianes en torno al eje $Z$ (phase-flip $|+\rangle \leftrightarrow |-\rangle$).
   - **Hadamard (`[H]`):** Crea superposiciones coherentes ($|0\rangle \to |+\rangle$).
   - **Compuertas de Fase S (`[S]`) y T (`[T]`):** Rotaciones de $\pi/2$ y $\pi/4$ en fase.
   - **Eco de Espín de Hahn (`[E]`):** Dispara un pulso $\pi$ de microondas que reenfoca el desfase transversal y restaura la pureza del cúbit.

4. **Sincronía Rítmica Synthwave:**
   - Al pulsar **INICIAR PISTA RÍTMICA**, comienza una pista retro-wave procedural a 124 BPM (bombo, caja, hi-hats, bajo analógico arpegiado y pads espaciales).
   - Sobre la esfera aparecen anillos concéntricos hacia estados objetivo. Al coincidir con el compás musical y alcanzar la fidelidad requerida ($F > 94\%$), se otorga una calificación de **PERFECT**, aumentando el combo y el multiplicador de resonancia.

5. **Compilación Cuántica a OpenQASM 3.0 & Google Cirq:**
   - Todos los pulsos ejecutados se compilan en tiempo real a circuitos cuánticos listos para ejecutarse en computadores cuánticos reales (IBM Quantum, Google Quantum AI).

---

## 🔬 Ecuaciones Fundamentales

### Matriz de Densidad:
$$\rho = \frac{1}{2}(I + \vec{r} \cdot \vec{\sigma}) = \frac{1}{2}\begin{pmatrix} 1 + r_z & r_x - i r_y \\ r_x + i r_y & 1 - r_z \end{pmatrix}$$

### Fidelidad Cuántica:
$$F(\rho, |\psi_{\text{target}}\rangle) = \frac{1 + \vec{r} \cdot \vec{r}_{\text{target}}}{2}$$

### Dinámica de Lindblad (RK4):
$$\frac{dr_x}{dt} = -\frac{r_x}{T_2} + \omega_L r_y + (\vec{\Omega} \times \vec{r})_x$$
$$\frac{dr_y}{dt} = -\frac{r_y}{T_2} - \omega_L r_x + (\vec{\Omega} \times \vec{r})_y$$
$$\frac{dr_z}{dt} = -\frac{r_z - 1}{T_1} + (\vec{\Omega} \times \vec{r})_z$$

---

## 🚀 Ejecución

Abre directamente `index.html` en cualquier navegador web moderno con soporte para Canvas 2D y Web Audio API. No requiere instalación de paquetes en la raíz de Codex.
