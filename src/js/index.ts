import JSON5 from "json5";

import p5, { File } from "p5";
import type { Element } from "p5";

interface Controls {
  view: { x: number; y: number; width: number; height: number; zoom: number };
  viewPos: { prevX: null | number; prevY: null | number; isDragging: boolean };
}

new p5((p5Instance) => {
  const p5 = p5Instance as unknown as p5;

  let steps: Step[] | undefined;

  let staticBodies: Body[] | undefined;
  let stepsWithCollisions: number[] | undefined;

  let slider: Element | undefined;
  let wrapper: Element | undefined;
  let next: Element | undefined;
  let prev: Element | undefined;
  let nextCol: Element | undefined;
  let prevCol: Element | undefined;

  const controls: Controls = {
    view: { x: 0, y: 0, width: 0, height: 0, zoom: 1 },
    viewPos: { prevX: null, prevY: null, isDragging: false },
  };

  function v2(arr: [number, number]) {
    const [x, y] = arr;
    return p5.createVector(x, y);
  }

  function findNextCollision() {
    if (!slider) return;
    const current = Number(slider.value());
    const index = stepsWithCollisions?.find((item) => item > current);
    return index;
  }

  function findPrevCollision() {
    if (!slider) return;
    const current = Number(slider.value());
    const index = stepsWithCollisions?.findLast((item) => item < current);
    return index;
  }

  function createControls() {
    if (slider != null) slider.remove();
    if (next != null) next.remove();
    if (nextCol != null) nextCol.remove();
    if (prev != null) prev.remove();
    if (prevCol != null) prevCol.remove();

    if (steps == null) return;

    wrapper = p5.createDiv();
    wrapper.addClass("wrapper");
    wrapper.position(0, 0);

    prevCol = p5.createButton("<<");
    prevCol.parent(wrapper);

    prev = p5.createButton("<");
    prev.parent(wrapper);

    slider = p5.createSlider(0, steps.length - 1, 0);
    slider.parent(wrapper);
    const index = findNextCollision()!;
    slider.value(index);

    next = p5.createButton(">");
    next.parent(wrapper);

    nextCol = p5.createButton(">>");
    nextCol.parent(wrapper);

    next.mousePressed(() => {
      if (slider == null || steps == null) return;
      const current = Number(slider.value());
      slider.value(Math.min(current + 1, steps.length - 1));
    });

    prev.mousePressed(() => {
      if (slider == null) return;
      const current = Number(slider.value());
      slider.value(Math.max(current - 1, 0));
    });

    nextCol.mousePressed(() => {
      const index = findNextCollision()!;
      slider?.value(index);
    });

    prevCol.mousePressed(() => {
      const index = findPrevCollision()!;
      slider?.value(index);
    });
  }

  function handleFile(file: File) {
    const header = "data:application/x-javascript;base64,";
    let encoded = file.data;
    encoded = encoded.slice(header.length);
    const data = JSON5.parse(atob(encoded));
    steps = data.steps;
    staticBodies = data.static_bodies;

    if (steps == null) return;

    stepsWithCollisions = steps
      .map((item, i) => (item.collisions.length > 0 ? i : null))
      .filter(Boolean) as number[];

    createControls();
  }

  function setup() {
    const width = p5.windowWidth;
    const height = p5.windowHeight - 10;
    const c = p5.createCanvas(width, height);

    c.drop(handleFile);

    controls.view.width = width;
    controls.view.height = height;
    controls.view.x = width / 2 - 200;
    controls.view.y = height / 2 - 120;
    controls.view.zoom = 1.5;

    p5.strokeWeight(0.5);

    p5.describe("A physics debugger");
  }

  function draw() {
    p5.background(100);

    p5.translate(controls.view.x, controls.view.y);
    p5.scale(controls.view.zoom);
    p5.rect(0, 0, 400, 240);
    p5.fill(220);

    if (steps) {
      const index = Number(slider?.value());
      const step = steps[index];

      p5.fill("white");
      drawStep(step);
      drawStepName(step);
    } else {
      p5.push();
      p5.fill("black");
      p5.textSize(20);
      p5.textAlign(p5.CENTER, p5.CENTER);
      p5.text("Drop a physics-steps.js to start", 200, 120);
      p5.pop();
    }
  }

  function arrow(x1: number, y1: number, x2: number, y2: number) {
    let start = p5.createVector(x1, y1);
    let end = p5.createVector(x2, y2);

    p5.line(start.x, start.y, end.x, end.y);
    p5.push();
    p5.noStroke();
    p5.circle(end.x, end.y, 1);
    p5.pop();
  }

  function drawStepName(step: Step) {
    const { name } = step;
    p5.push();

    p5.resetMatrix();

    p5.fill("black");

    const height = 50;
    const padding = 20;
    const y = p5.windowHeight - 30;

    p5.rect(0, p5.windowHeight - height, p5.windowWidth, height);

    p5.fill("whitw");
    p5.textSize(20);
    p5.textAlign(p5.LEFT, p5.CENTER);
    p5.text(name, padding, y);

    p5.textAlign(p5.RIGHT, p5.CENTER);
    if (slider) {
      p5.text(slider?.value(), p5.windowWidth - padding, y);
    }

    const minItems = 400;
    const minItemsH = minItems / 2;

    const current = Number(slider?.value());
    const min = Math.max(0, current - minItemsH);
    const max = Math.min(steps.length - 1, current + minItemsH);
    const count = max - min;
    const barWidth = p5.windowWidth / count;

    for (let index = 0; index < count; index++) {
      const step = steps[index + min];
      const barHeight = 8;
      p5.noStroke();
      const hasCollision = step.collisions.length > 0;
      const penetration = step.collisions.reduce((prev, curr) => {
        return prev + curr.manifold.depth;
      }, 0);

      if (index + min === current) {
        p5.fill("green");
      } else if (penetration > 6 && penetration < 3) {
        p5.fill("red");
      } else if (penetration > 3) {
        p5.fill("orange");
      } else if (hasCollision) {
        p5.fill("yellow");
      } else {
        p5.fill(200);
      }

      p5.rect(
        index * (barWidth + 1),
        p5.windowHeight - height - barHeight,
        barWidth,
        barHeight
      );
    }

    p5.pop();
  }

  function drawStep(step: Step) {
    p5.push();
    const { ball, cam_offset, collisions } = step;
    p5.translate(cam_offset[0], cam_offset[1]);

    if (staticBodies) {
      staticBodies.forEach((item) => {
        p5.push();
        p5.fill("rgba(160,160,160,0.6)");
        drawCollisionShape(item);
        p5.pop();
      });
    }

    drawBall(ball);

    collisions.forEach((item) => {
      p5.push();
      p5.fill("rgba(255,252,127,0.3)");
      drawCollisionShape(item.body);
      p5.pop();
      drawCollision(item);
    });
    p5.pop();
  }

  function drawBall(ball: Body) {
    const pos = v2(ball.pos);
    const { ang_vel: angVel, ang_vel_d: angVelDel } = ball;
    const vel = v2(ball.vel).mult(10).add(pos);
    const velDelta = v2(ball.vel_d).mult(10).add(pos);
    const posN = v2(ball.vel).add(pos);
    const shape = ball.shape as ShapeCircle;
    const r = shape.r;

    p5.push();
    p5.fill("black");
    p5.textFont("mono", 4);
    p5.textLeading(2);
    p5.textAlign(p5.LEFT, p5.CENTER);
    p5.text(
      `pos: ${pos.x}, ${pos.y}\n
vel: ${vel.x}, ${vel.y}\n
velDelta: ${velDelta.x}, ${velDelta.y}\n
velAng: ${angVel}\n
velAngDelta: ${angVelDel}
`,
      pos.x + r + 10,
      pos.y - r
    );
    p5.pop();

    // Draw Ball
    p5.push();
    p5.stroke("rgba(160, 160, 255, 0.1)");
    p5.fill("rgba(160, 160, 255, 0.1)");
    p5.circle(pos.x, pos.y, shape.r * 2);
    p5.pop();

    // Draw ball moved
    p5.push();
    p5.stroke("rgba(255, 160, 160, 0.4)");
    p5.fill("rgba(255, 160, 160, 0.4)");
    p5.circle(posN.x, posN.y, r * 2);
    p5.pop();

    // Draw center
    p5.push();
    p5.noStroke();
    p5.fill("black");
    p5.circle(posN.x, posN.y, 1);
    p5.pop();

    p5.push();
    p5.stroke("rgba(255, 160, 160, 0.8)");
    p5.fill("rgba(255, 160, 160, 0.8)");
    arrow(pos.x, pos.y, vel.x, vel.y);
    p5.pop();

    if (velDelta.x + velDelta.y != 0) {
      p5.push();
      p5.stroke("rgba(160, 160, 255, 0.5)");
      p5.fill("rgba(160, 160, 255, 0.5)");
      arrow(pos.x, pos.y, velDelta.x, velDelta.y);
      p5.pop();
    }
  }

  function drawCollision(collision: Collision) {
    const { manifold } = collision;
    const { depth } = manifold;
    const contact = v2(manifold.contact);
    const normal = v2(manifold.normal)
      .normalize()
      .mult(depth * 10)
      .add(contact);

    p5.push();

    p5.noStroke();
    p5.fill("rgba(255,0,0,0.8)");
    p5.circle(contact.x, contact.y, 1);
    p5.pop();

    p5.push();
    p5.stroke("rgba(255,0,0,0.8)");
    p5.line(contact.x, contact.y, normal.x, normal.y);
    p5.pop();

    p5.push();
    p5.fill("black");
    p5.textFont("mono", 4);
    p5.textLeading(2);
    p5.textAlign(p5.RIGHT, p5.CENTER);
    p5.text(
      `depth: ${depth}
`,
      contact.x - 20,
      contact.y
    );
    p5.pop();
  }

  function drawCollisionShape(body: Body) {
    const { shape_type: shapeType } = body;
    switch (shapeType.id) {
      case 0:
        {
          const shape = body.shape as ShapeCircle;
          p5.push();
          p5.noStroke();
          const p = v2(shape.p).add(v2(body.pos));
          p5.circle(p.x, p.y, shape.r * 2);
          p5.pop();
        }
        break;
      case 2:
        {
          const shape = body.shape as ShapePolygon;
          p5.push();
          p5.noStroke();
          p5.beginShape();
          for (let i = 0; i < shape.verts.length; i++) {
            const a = v2(shape.verts[i]);
            p5.vertex(a.x, a.y);
          }
          p5.endShape(p5.CLOSE);
          p5.pop();
        }
        break;
      case 3:
        {
          const shape = body.shape as ShapeCapsule;
          const a = v2(shape.a);
          const b = v2(shape.b);
          const { ra, rb } = shape;

          p5.push();
          p5.noStroke();

          p5.circle(a.x, a.y, ra * 2);
          p5.circle(b.x, b.y, rb * 2);

          p5.stroke("rgba(160,160,160,0.6)");
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

          p5.line(tan_1_a.x, tan_1_a.y, tan_1_b.x, tan_1_b.y);
          p5.line(tan_2_a.x, tan_2_a.y, tan_2_b.x, tan_2_b.y);

          p5.pop();
        }
        break;
      default:
        console.warn("Shape type not handled", shapeType);
        break;
    }
  }

  function mouseWheel(event: MouseEvent) {
    const { width, height } = controls.view;
    const { x, y } = event;
    const deltaY = event["deltaY"];
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

  function mousePressed(e: MouseEvent) {
    const { target } = e;
    const nodeName = target["nodeName"];
    if (nodeName !== "CANVAS") return;
    controls.viewPos.isDragging = true;
    controls.viewPos.prevX = e.clientX;
    controls.viewPos.prevY = e.clientY;
  }

  function mouseReleased(e: MouseEvent) {
    const { target } = e;
    const nodeName = target["nodeName"];
    if (nodeName !== "CANVAS") return;
    controls.viewPos.isDragging = false;
    controls.viewPos.prevX = null;
    controls.viewPos.prevY = null;
  }

  function mouseDragged(e: MouseEvent) {
    const { isDragging } = controls.viewPos;

    const prevX = controls.viewPos.prevX;
    const prevY = controls.viewPos.prevY;

    if (!isDragging) return;

    const pos = { x: e.clientX, y: e.clientY };

    let dx = 0;
    let dy = 0;

    if (prevX != null) {
      dx = pos.x - prevX;
    }

    if (prevY != null) {
      dy = pos.y - prevY;
    }

    if (prevX || prevY) {
      controls.view.x += dx;
      controls.view.y += dy;

      controls.viewPos.prevX = pos.x;
      controls.viewPos.prevY = pos.y;
    }
  }

  p5.setup = setup;
  p5.draw = draw;
  p5.mouseWheel = mouseWheel;
  p5.mouseDragged = mouseDragged;
  p5.mousePressed = mousePressed;
  p5.mouseReleased = mouseReleased;
}, document.getElementById("app")!);
