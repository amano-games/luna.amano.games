import p5, { Vector } from "p5";

export function clamp(number: number, min: number, max: number) {
  return Math.max(min, Math.min(number, max));
}

export function closestPointToLine(a: Vector, b: Vector, c: Vector) {
  const res = {
    x: 0,
    y: 0,
    t: 0,
  };

  const ab = b.copy().sub(a);
  const ac = c.copy().sub(a);

  // project c onto ab, computing parametrized position
  let t = ac.dot(ab) / ab.dot(ab);

  // clamp t if outside of segment
  if (t < 0.0) t = 0.0;
  if (t > 1.0) t = 1.0;

  // Compute projected position from the clamped t
  let d = a.copy().add(ab.mult(t));

  res.x = d.x;
  res.y = d.y;
  res.t = t;

  return res;
}

export function tan(a: Vector, b: Vector, ra: number, rb: number) {
  const delta2 =
    (a.x - b.x) * (a.x - b.x) +
    (a.y - b.y) * (a.y - b.y) -
    (ra - rb) * (ra - rb);

  let p1 = ra * (a.x * b.x + a.y * b.y - b.x * b.x - b.y * b.y);
  let p2 = rb * (a.x * a.x + a.y * a.y - a.x * b.x - a.y * b.y);
  let q = a.x * b.y - b.x * a.y;

  // There is tangent
  if (delta2 >= 0) {
    let l = {
      a: (b.x - a.x) * (ra - rb) + (a.y - b.y) * Math.sqrt(delta2),
      b: (b.y - a.y) * (ra - rb) + (b.x - a.x) * Math.sqrt(delta2),
      c: p1 - p2 + q * Math.sqrt(delta2),
    };
    let l22 = {
      a: (b.x - a.x) * (ra - rb) - (a.y - b.y) * Math.sqrt(delta2),
      b: (b.y - a.y) * (ra - rb) - (b.x - a.x) * Math.sqrt(delta2),
      c: p1 - p2 - q * Math.sqrt(delta2),
    };

    if (Math.abs(l.a) < Math.abs(l.b)) {
      let x1 = a.x;
      let x2 = b.x - (a.x - b.x);
      let y1 = (-l.c - l.a * x1) / l.b;
      let y2 = (-l.c - l.a * x2) / l.b;
    } else {
      let y1 = a.y;
      let y2 = b.y;
      let x1 = (-l.c - l.b * y1) / l.a;
      let x2 = (-l.c - l.b * y2) / l.a;
    }
  }
}

export function outerTangents(
  x1: number,
  y1: number,
  r1: number,
  x2: number,
  y2: number,
  r2: number
) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  // This is the flipper width
  const dist = Math.sqrt(dx * dx + dy * dy);

  // if (dist <= Math.abs(r2 - r1)) return; // no valid tangents

  // Rotation from x-axis
  // Maybe angle1 is the angle between ends
  const angle1 = Math.atan2(dy, dx);
  const angle2 = Math.acos((r1 - r2) / dist);

  const angleA = angle1 + angle2;
  const angleB = angle1 - angle2;

  const rotA = {
    c: Math.cos(angleA),
    s: Math.sin(angleA),
  };

  const rotB = {
    c: Math.cos(angleB),
    s: Math.sin(angleB),
  };

  return [
    [
      [x1 + r1 * rotA.c, y1 + r1 * rotA.s],
      [x2 + r2 * rotA.c, y2 + r2 * rotA.s],
    ],
    [
      [x1 + r1 * rotB.c, y1 + r1 * rotB.s],
      [x2 + r2 * rotB.c, y2 + r2 * rotB.s],
    ],
  ];
}
