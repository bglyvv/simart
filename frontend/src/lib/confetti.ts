import confetti from 'canvas-confetti';

export function celebrate() {
  confetti({
    particleCount: 90,
    spread: 70,
    startVelocity: 35,
    origin: { y: 0.7 },
    colors: ['#a259ff', '#4a90e8', '#22c55e', '#f5b83d', '#ff8787'],
  });
}

export function bigCelebrate() {
  const end = Date.now() + 700;
  (function frame() {
    confetti({ particleCount: 4, angle: 60, spread: 60, origin: { x: 0 }, colors: ['#a259ff', '#4a90e8', '#22c55e'] });
    confetti({ particleCount: 4, angle: 120, spread: 60, origin: { x: 1 }, colors: ['#f5b83d', '#ff8787', '#2dd4bf'] });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}
