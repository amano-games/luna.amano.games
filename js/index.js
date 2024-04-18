// import hello from "./test.js";
import JSON5 from "https://unpkg.com/json5@2/dist/index.min.mjs";

let steps = null;
let staticBodies = null;
let stepsWithCollisions = null;

let slider;
let wrapper;
let next;
let prev;
let nextCol;
let prevCol;

const controls = {
  view: { x: 0, y: 0, zoom: 1 },
  viewPos: { prevX: null, prevY: null, isDragging: false },
};

function clamp(number, min, max) {
  return Math.max(min, Math.min(number, max));
}

function v2(arr) {
  const [x, y] = arr;
  return createVector(x, y);
}

function findNextCollision() {
  const current = slider.value();
  const index = stepsWithCollisions.find((item) => item > current);
  return index;
}

function findPrevCollision() {
  const current = slider.value();
  const index = stepsWithCollisions.findLast((item) => item < current);
  return index;
}

function createControls() {
  if (slider != null) slider.remove();
  if (next != null) next.remove();
  if (nextCol != null) nextCol.remove();
  if (prev != null) prev.remove();
  if (prevCol != null) prevCol.remove();

  wrapper = createDiv();
  wrapper.addClass("wrapper");
  wrapper.position(0, 0);

  prevCol = createButton("<<");
  prevCol.parent(wrapper);

  prev = createButton("<");
  prev.parent(wrapper);

  slider = createSlider(0, steps.length - 1, 0);
  slider.parent(wrapper);
  const index = findNextCollision();
  slider.value(index);

  next = createButton(">");
  next.parent(wrapper);

  nextCol = createButton(">>");
  nextCol.parent(wrapper);

  next.mousePressed(() => {
    const current = slider.value();
    slider.value(Math.min(current + 1, steps.length - 1));
  });

  prev.mousePressed(() => {
    const current = slider.value();
    slider.value(Math.max(current - 1, 0));
  });

  nextCol.mousePressed(() => {
    const index = findNextCollision();
    slider.value(index);
  });

  prevCol.mousePressed(() => {
    const index = findPrevCollision();
    slider.value(index);
  });
}

function handleFile(file) {
  const header = "data:application/x-javascript;base64,";
  let encoded = file.data;
  encoded = encoded.slice(header.length);
  const data = JSON5.parse(atob(encoded));
  steps = data.steps;
  staticBodies = data.static_bodies;

  stepsWithCollisions = steps
    .map((item, i) => (item.collisions.length > 0 ? i : null))
    .filter(Boolean);

  createControls();

  console.log(steps);
}

function setup() {
  const width = windowWidth;
  const height = windowHeight - 10;
  const c = createCanvas(width, height);

  c.drop(handleFile);

  controls.view.x = width / 2 - 200;
  controls.view.y = height / 2 - 120;
  controls.view.zoom = 1.5;

  strokeWeight(0.5);

  describe(
    "A gray square with a file input beneath it. If the user selects an image file to load, it is displayed on the square."
  );
}

function draw() {
  background(100);

  translate(controls.view.x, controls.view.y);
  scale(controls.view.zoom);
  rect(0, 0, 400, 240);
  fill(220);

  if (steps) {
    const index = slider.value();
    const step = steps[index];

    fill("white");
    drawStep(step);
    drawStepName(step);
  } else {
    push();
    fill("black");
    textSize(20);
    textAlign(CENTER, CENTER);
    text("Drop a physics-steps.js to start", 200, 120);
    pop();
  }
}

function arrow(x1, y1, x2, y2) {
  let start = createVector(x1, y1);
  let end = createVector(x2, y2);

  line(start.x, start.y, end.x, end.y);
  push();
  noStroke();
  circle(end.x, end.y, 1);
  pop();
}

function drawStepName(step) {
  const { name } = step;
  textSize(20);
  textAlign(LEFT, CENTER);
  text(name, 0, -20);

  textAlign(RIGHT, CENTER);
  text(slider.value(), 400, -20);
}

function drawStep(step) {
  push();
  const { ball, cam_offset, collisions } = step;
  translate(cam_offset[0], cam_offset[1]);

  if (staticBodies) {
    staticBodies.forEach((item) => {
      push();
      fill("rgba(160,160,160,0.6)");
      drawCollisionShape(item);
      pop();
    });
  }

  drawBall(ball);

  collisions.forEach((item) => {
    push();
    fill("rgba(255,252,127,0.3)");
    drawCollisionShape(item.body);
    pop();
    drawCollision(item);
  });
  pop();
}

function drawBall(ball) {
  const pos = v2(ball.pos);
  const { ang_vel, ang_vel_d } = ball;
  const vel = v2(ball.vel).mult(10).add(pos);
  const velDelta = v2(ball.vel_d).mult(10).add(pos);
  const posN = v2(ball.vel).add(pos);
  const r = ball.shape.r;

  push();
  fill("black");
  textSize(4);
  textAlign(LEFT, CENTER);
  text(
    `pos: ${pos.x}, ${pos.y}\n
vel: ${vel.x}, ${vel.y}\n
velDelta: ${velDelta.x}, ${velDelta.y}\n
`,
    pos.x + r + 10,
    pos.y - r
  );
  pop();

  // Draw Ball
  push();
  stroke("rgba(160, 160, 255, 0.1)");
  fill("rgba(160, 160, 255, 0.1)");
  circle(pos.x, pos.y, ball.shape.r * 2);
  pop();

  // Draw ball moved
  push();
  stroke("rgba(255, 160, 160, 0.4)");
  fill("rgba(255, 160, 160, 0.4)");
  circle(posN.x, posN.y, r * 2);
  pop();

  // Draw center
  push();
  noStroke();
  fill("black");
  circle(posN.x, posN.y, 1);
  pop();

  push();
  stroke("rgba(255, 160, 160, 0.8)");
  fill("rgba(255, 160, 160, 0.8)");
  arrow(pos.x, pos.y, vel.x, vel.y);
  pop();

  if (velDelta.x + velDelta.y != 0) {
    push();
    stroke("rgba(160, 160, 255, 0.5)");
    fill("rgba(160, 160, 255, 0.5)");
    arrow(pos.x, pos.y, velDelta.x, velDelta.y);
    pop();
  }
}

function drawCollision(collision) {
  const { manifold } = collision;
  const { depth } = manifold;
  const contact = v2(manifold.contact);
  const normal = v2(manifold.normal)
    .normalize()
    .mult(depth * 10)
    .add(contact);

  push();

  noStroke();
  fill("rgba(255,0,0,0.8)");
  circle(contact.x, contact.y, 1);
  pop();

  push();
  stroke("rgba(255,0,0,0.8)");
  line(contact.x, contact.y, normal.x, normal.y);
  pop();
}

function drawCollisionShape(body) {
  const { shape_type: shapeType, shape } = body;
  switch (shapeType.id) {
    case 0:
      push();
      noStroke();
      const p = v2(shape.p).add(v2(body.pos));
      circle(p.x, p.y, shape.r * 2);
      pop();
      break;
    case 2:
      push();
      noStroke();
      beginShape();
      for (let i = 0; i < shape.verts.length; i++) {
        const a = v2(shape.verts[i]);
        vertex(a.x, a.y);
      }
      endShape(CLOSE);
      pop();
      break;
    case 3:
      const a = v2(shape.a);
      const b = v2(shape.b);
      const { ra, rb } = shape;

      push();
      noStroke();

      circle(a.x, a.y, ra * 2);
      circle(b.x, b.y, rb * 2);

      stroke("rgba(160,160,160,0.6)");
      // line(a.x, a.y, b.x, b.y);

      const theta = Math.atan2(b.y - a.y, b.x - a.x);
      const rot = {
        c: Math.cos(theta),
        s: Math.sin(theta),
      };

      const tan_1_a = { x: a.x + ra * rot.c, y: a.y - ra * rot.s };
      const tan_1_b = { x: b.x + rb * rot.c, y: b.y - rb * rot.s };

      const tan_2_a = { x: a.x - ra * rot.c, y: a.y + ra * rot.s };
      const tan_2_b = { x: b.x - rb * rot.c, y: b.y + rb * rot.s };

      line(tan_1_a.x, tan_1_a.y, tan_1_b.x, tan_1_b.y);
      line(tan_2_a.x, tan_2_a.y, tan_2_b.x, tan_2_b.y);

      pop();

      break;
    default:
      console.log(shapeType);
      break;
  }
}

function mouseWheel(event) {
  const { x, y, deltaY } = event;
  const direction = deltaY > 0 ? -1 : 1;

  const factor = 0.8;
  const zoom = 1 * direction * factor;
  const newZoom = controls.view.zoom + zoom;

  if (newZoom < 0.01) return;

  const wx = (x - controls.view.x) / (width * controls.view.zoom);
  const wy = (y - controls.view.y) / (height * controls.view.zoom);

  controls.view.x -= wx * width * zoom;
  controls.view.y -= wy * height * zoom;
  controls.view.zoom = newZoom;
}

function mousePressed(e) {
  const { target } = e;
  const { nodeName } = target;
  if (nodeName !== "CANVAS") return;
  controls.viewPos.isDragging = true;
  controls.viewPos.prevX = e.clientX;
  controls.viewPos.prevY = e.clientY;
}

function mouseReleased(e) {
  const { target } = e;
  const { nodeName } = target;
  if (nodeName !== "CANVAS") return;
  controls.viewPos.isDragging = false;
  controls.viewPos.prevX = null;
  controls.viewPos.prevY = null;
}

function mouseDragged(e) {
  const { prevX, prevY, isDragging } = controls.viewPos;
  if (!isDragging) return;

  const pos = { x: e.clientX, y: e.clientY };
  const dx = pos.x - prevX;
  const dy = pos.y - prevY;

  if (prevX || prevY) {
    controls.view.x += dx;
    controls.view.y += dy;
    (controls.viewPos.prevX = pos.x), (controls.viewPos.prevY = pos.y);
  }
}

window.setup = setup;
window.draw = draw;
window.mouseWheel = mouseWheel;
window.mouseDragged = mouseDragged;
window.mousePressed = mousePressed;
window.mouseReleased = mouseReleased;
