interface Data {
  steps: Step[];
  static_bodies: Body[];
}

interface ShapeCircle {
  p: [number, number];
  r: number;
}

interface ShapeCapsule {
  a: [number, number];
  b: [number, number];
  ra: number;
  rb: number;
}

interface ShapeSubPoly {
  verts: [number, number][];
}

interface ShapePolygon {
  sub_polys: ShapeSubPoly[];
}

interface Body {
  shape_type: { id: number; label: string };
  shape: ShapeCircle | ShapeCapsule | ShapePolygon;
  pos: [number, number];
  pos_d: [number, number];
  ang_vel: number;
  ang_vel_d: number;
  vel: [number, number];
  vel_d: [number, number];
}

interface Collision {
  manifold: {
    depth: number;
    contact: [number, number];
    normal: [number, number];
  };
  body: Body;
}

interface CamData {
  drag_vel: number;
  limits: [[number, number], [number, number]];
  soft: [[number, number], [number, number]];
  hard: [[number, number], [number, number]];
}

interface Step {
  name: string;
  ball: Body;
  cam_offset: [number, number];
  cam_data: CamData;
  collisions: Collision[];
  frameIndex: undefined | number;
  physicsStepIndex: undefined | number;
}
