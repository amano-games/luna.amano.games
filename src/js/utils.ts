import p5, { Vector } from "p5";

export function clamp(number: number, min: number, max: number) {
  return Math.max(min, Math.min(number, max));
}

export function closestPointToLine(p5: p5, a: Vector, b: Vector, c: Vector) {
  const res = {
    x: 0,
    y: 0,
    t: 0,
  };

  const ab = b.sub(a);
  const ac = c.sub(a);

  // project c onto ab, computing parametrized position
  let t = ac.dot(ab) / ab.dot(ab);

  // clamp t if outside of segment
  if (t < 0.0) t = 0.0;
  if (t > 1.0) t = 1.0;

  // Compute projected position from the clamped t
  let d = a.add(ab.mult(t));

  res.x = d.x;
  res.y = d.y;
  res.t = t;

  return res;
}
