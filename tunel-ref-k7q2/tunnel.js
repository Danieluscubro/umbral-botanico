// Lógica del túnel: la cercanía de la mano (tamaño aparente, 0..1) mueve la posición.
// Acercar avanza, alejar retrocede, mano quieta se detiene; sin mano avanza solo.
// Girar la mano (ángulo en radianes, ya en el sentido del visitante) rota la vista.

export function wrapFrame(pos, n) {
  const i = Math.floor(pos) % n;
  return (i + n) % n;
}

export function labelFor(frame, bounds, names) {
  // bounds[k] = fotograma donde empieza la materia prima siguiente a names[k]
  for (let k = bounds.length - 1; k >= 0; k--) {
    if (frame >= bounds[k]) return names[(k + 1) % names.length];
  }
  return names[0];
}

export function createTunnel({
  frames,
  gain = 900,        // fotogramas por unidad de cambio de tamaño de mano
  idleMs = 2500,     // espera sin mano antes de avanzar solo
  autoFps = 9,       // velocidad del avance automático
  ease = 8,          // suavizado (1/s)
  rotGain = 1,       // vueltas de la vista por vuelta de la mano
  rotFriction = 1.2, // frenado del giro con inercia (1/s)
  maxSpin = 6,       // velocidad de giro máxima al soltar (rad/s)
} = {}) {
  let target = 0, position = 0;
  let rotTarget = 0, rotation = 0, lastAngle = null;
  let spinVel = 0, spin = 0, lastUpdate = null; // velocidad medida con mano y giro libre al soltar
  let lastSize = null, lastSeen = -Infinity, present = false;

  return {
    handUpdate(size, now, angle) {
      if (lastSize !== null && present) target += (size - lastSize) * gain;
      if (angle !== undefined) {
        if (lastAngle !== null && present) {
          let d = angle - lastAngle;
          d = Math.atan2(Math.sin(d), Math.cos(d)); // camino corto por ±π
          rotTarget += d * rotGain;
          const dt = (now - lastUpdate) / 1000;
          if (dt > 0) spinVel += (d * rotGain / dt - spinVel) * 0.3;
        }
        lastAngle = angle;
      }
      lastSize = size; lastSeen = now; lastUpdate = now; present = true; spin = 0;
    },
    handLost(now) {
      if (present) { lastSeen = now; spin = Math.max(-maxSpin, Math.min(maxSpin, spinVel)); }
      present = false; lastSize = null; lastAngle = null; spinVel = 0;
    },
    step(dt, now) {
      if (!present && now - lastSeen > idleMs) target += autoFps * dt / 1000;
      if (!present && spin) {
        rotTarget += spin * dt / 1000;
        spin *= Math.exp(-rotFriction * dt / 1000);
        if (Math.abs(spin) < 0.01) spin = 0;
      }
      const k = 1 - Math.exp(-ease * dt / 1000);
      position += (target - position) * k;
      rotation += (rotTarget - rotation) * k;
    },
    frame() { return wrapFrame(position, frames); },
    get position() { return position; },
    get rotation() { return rotation; },
    get handPresent() { return present; },
  };
}
