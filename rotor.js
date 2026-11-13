// Lógica pura del giro por fotogramas (turntable). Sin DOM: se prueba con node --test.

export function frameForAngle(angle, n) {
  const i = Math.round((angle / 360) * n) % n;
  return (i + n) % n;
}

export function createRotor({
  frames,
  degPerPx = 0.5,
  friction = 3.5,       // decaimiento de la inercia (1/s)
  idleMs = 6000,        // tiempo sin tocar antes del giro automático
  autoDegPerSec = 14,   // velocidad del giro automático
} = {}) {
  let dragging = false;
  let lastX = 0;
  let lastT = 0;
  let lastInteraction = 0;

  const r = {
    angle: 0,
    velocity: 0, // grados por milisegundo
    get dragging() { return dragging; },

    pointerDown(x, t) {
      dragging = true;
      lastX = x;
      lastT = t;
      lastInteraction = t;
      r.velocity = 0;
    },

    pointerMove(x, t) {
      if (!dragging) return;
      const d = (x - lastX) * degPerPx;
      const dt = Math.max(1, t - lastT);
      r.angle += d;
      r.velocity = 0.8 * (d / dt) + 0.2 * r.velocity;
      lastX = x;
      lastT = t;
      lastInteraction = t;
    },

    pointerUp(t) {
      if (!dragging) return;
      dragging = false;
      if (t - lastT > 100) r.velocity = 0; // el dedo se paró antes de soltar
      lastInteraction = t;
    },

    step(dt, now) {
      if (dragging) return;
      if (Math.abs(r.velocity) > 0.0005) {
        r.angle += r.velocity * dt;
        r.velocity *= Math.exp((-friction * dt) / 1000);
        lastInteraction = now;
      } else {
        r.velocity = 0;
        if (now - lastInteraction >= idleMs) r.angle += (autoDegPerSec * dt) / 1000;
      }
    },

    frame() { return frameForAngle(r.angle, frames); },
  };
  return r;
}
