/// <reference types="vite/client" />
import JSON5 from "json5";

import P5, { File } from "p5";
import type { Element, Renderer } from "p5";
import { colors, opacity, text } from "./theme";
import { closestPointToLine, outerTangents } from "./utils";
import defaultData from "./data.json";

interface Controls {
  view: { x: number; y: number; width: number; height: number; zoom: number };
  viewPos: { prevX: null | number; prevY: null | number; isDragging: boolean };
}

const SHAPE_TYPE_CAPSULE = 4;
const SHAPE_TYPE_POLY = 3;
const SHAPE_TYPE_CIRCLE = 1;

// if (import.meta.env.MODE == "development") {
console.log(`🌚🛠️ Luna tools: ${__APP_VERSION__}`);

new P5((p5Instance) => {
  const p5 = p5Instance as unknown as P5;

  let steps: Step[] | undefined;

  let staticBodies: Body[] | undefined;
  let stepsWithCollisions: number[] | undefined;

  let canvas: Renderer | undefined;
  let slider: Element | undefined;
  let wrapper: Element | undefined;
  let wrapperFilters: Element | undefined;
  let buttonNext: Element | undefined;
  let buttonPrev: Element | undefined;
  let buttonNextCol: Element | undefined;
  let buttonPrevCol: Element | undefined;
  let checkboxExtraInfo: (Element & { checked?: Function }) | undefined;
  let checkboxCam: (Element & { checked?: Function }) | undefined;

  const controls: Controls = {
    view: { x: 0, y: 0, width: 0, height: 0, zoom: 1 },
    viewPos: { prevX: null, prevY: null, isDragging: false },
  };

  function v2(arr: [number, number]) {
    const [x, y] = arr;
    return p5.createVector(x, y);
  }

  function toColor(arr: number[], a: number = opacity.m) {
    const [r, g, b] = arr;
    return p5.color(r, g, b, a * 255);
  }

  function nextStep() {
    if (slider == null || steps == null) return;
    const current = Number(slider.value());
    const next = Math.min(current + 1, steps.length - 1);
    slider.value(next);
  }

  function prevStep() {
    if (slider == null) return;
    const current = Number(slider.value());
    slider.value(Math.max(current - 1, 0));
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
    if (buttonNext != null) buttonNext.remove();
    if (buttonNextCol != null) buttonNextCol.remove();
    if (buttonPrev != null) buttonPrev.remove();
    if (buttonPrevCol != null) buttonPrevCol.remove();
    if (checkboxExtraInfo != null) checkboxExtraInfo.remove();
    if (checkboxCam != null) checkboxCam.remove();

    if (steps == null) return;

    wrapper = p5.createDiv();
    wrapper.addClass("wrapper");

    wrapperFilters = p5.createDiv();
    wrapperFilters.addClass("wrapper-filters");
    wrapperFilters.position(0, 0);

    checkboxExtraInfo = p5.createCheckbox(" extra info");
    checkboxExtraInfo.parent(wrapperFilters);

    checkboxCam = p5.createCheckbox(" cam");
    checkboxCam.parent(wrapperFilters);
    checkboxCam.checked(true);

    buttonPrevCol = p5.createButton("<<");
    buttonPrevCol.parent(wrapper);

    buttonPrev = p5.createButton("<");
    buttonPrev.parent(wrapper);

    slider = p5.createSlider(0, steps.length - 1, 0);
    slider.parent(wrapper);
    const index = findNextCollision()!;
    slider.value(index);

    buttonNext = p5.createButton(">");
    buttonNext.parent(wrapper);

    buttonNextCol = p5.createButton(">>");
    buttonNextCol.parent(wrapper);

    buttonNext.mousePressed(() => {
      nextStep();
    });

    buttonPrev.mousePressed(() => {
      prevStep();
    });

    buttonNextCol.mousePressed(() => {
      const index = findNextCollision()!;
      slider?.value(index);
    });

    buttonPrevCol.mousePressed(() => {
      const index = findPrevCollision()!;
      slider?.value(index);
    });
  }

  function setData(data: Data) {
    steps = data.steps;
    staticBodies = data.static_bodies;
    console.log(staticBodies);

    if (steps == null) return;

    let frameIndex = 0;
    let physicsStepIndex = 0;
    steps.map((current: Step) => {
      if (current.name == "tick start") {
        frameIndex += 1;
      }

      if (current.name == "physics step start") {
        physicsStepIndex += 1;
      }

      current.frameIndex = frameIndex;

      if (current.name == "physics end") {
        physicsStepIndex = 0;
      }

      current.physicsStepIndex = physicsStepIndex;

      return current;
    });

    stepsWithCollisions = steps
      .map((item, i) => (item.collisions.length > 0 ? i : null))
      .filter(Boolean) as number[];

    createControls();
  }

  function handleFile(file: File) {
    const header = "data:application/x-javascript;base64,";
    const { type } = file;

    if (type == "application") {
      let encoded = file.data;
      encoded = encoded.slice(header.length);
      const data = JSON5.parse(atob(encoded));
      setData(data);
    } else if (type == "text") {
      const data = JSON5.parse(file.data);
      setData(data);
    } else {
      console.warn("Unknown file  type", type);
      return;
    }
  }

  function setup() {
    p5.textFont("Inter");
    p5.colorMode(p5.RGB, 255);
    const width = p5.windowWidth;
    const height = p5.windowHeight;
    canvas = p5.createCanvas(width, height);

    canvas.drop(handleFile);
    if (import.meta.env.MODE == "development") {
      setData(defaultData as unknown as Data);
    }

    controls.view.width = width;
    controls.view.height = height;
    controls.view.x = width / 2 - 200;
    controls.view.y = height / 2 - 120;
    controls.view.zoom = 1.5;

    p5.strokeWeight(0.5);

    p5.describe("A physics debugger");
  }

  function draw() {
    p5.background(toColor(colors.bg, 1.0));

    p5.translate(controls.view.x, controls.view.y);
    p5.scale(controls.view.zoom);

    drawScreen();

    if (steps) {
      if (p5.keyIsDown(p5.SHIFT)) {
        if (p5.keyIsDown(p5.RIGHT_ARROW)) {
          nextStep();
        }
        if (p5.keyIsDown(p5.LEFT_ARROW)) {
          prevStep();
        }
      }

      const index = Number(slider?.value());
      const step = steps[index];

      drawStep(step);

      const infoHeight = 40;
      const timelineHeight = 20;
      const stepsInfoY = p5.windowHeight - infoHeight;

      drawStepInfo(step, 0, stepsInfoY, p5.windowWidth, infoHeight);
      drawTimeline(
        0,
        stepsInfoY - timelineHeight,
        p5.windowWidth,
        timelineHeight
      );
    } else {
      p5.push();
      p5.fill(toColor(colors.text, opacity.l));
      p5.textSize(text.sizeL);
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

  function drawScreen() {
    p5.push();
    p5.noStroke();
    p5.fill(toColor(colors.screen));
    p5.rect(0, 0, 400, 240);
    p5.pop();
  }

  function drawStepInfo(
    step: Step,
    x: number,
    y: number,
    width: number,
    height: number
  ) {
    const { name } = step;

    p5.push();
    p5.resetMatrix();

    const padding = 15;

    p5.fill(toColor(colors.infoBg, opacity.s));
    p5.rect(x, y, p5.windowWidth, height);

    p5.fill(toColor(colors.infoFg, opacity.l));
    p5.textSize(text.sizeM);
    p5.textAlign(p5.LEFT, p5.CENTER);
    p5.text(name, x + padding, y + padding);

    if (slider) {
      p5.textAlign(p5.RIGHT, p5.CENTER);
      p5.text(
        `frame: ${step.frameIndex} physics: ${
          step.physicsStepIndex
        } step: ${slider?.value()}`,
        x + width - padding,
        y + padding
      );
    }

    p5.pop();
  }

  function drawTimeline(x: number, y: number, width: number, height: number) {
    const minItems = 300;
    const minItemsH = minItems / 2;

    const current = Number(slider?.value());

    let min = Math.max(0, current - minItemsH);
    let max = Math.min(steps.length, min + minItems);

    let count = max - min;

    if (count < minItems) {
      min = max - minItems;
      count = max - min;
    }

    const paddingX = 2;
    const paddingY = 6;
    const spacing = 1;
    const barHeight = height - paddingY * 2;
    const barWidth = (width - paddingX * 2 - count * spacing) / count;
    const barY = y + paddingY;

    p5.push();
    p5.resetMatrix();

    p5.fill(toColor(colors.timelineBg, opacity.s));
    p5.rect(x, y, width, height);

    for (let index = 0; index < count; index++) {
      const step = steps[index + min];
      p5.noStroke();
      const hasCollision = step.collisions.length > 0;
      const penetration = step.collisions.reduce((prev, curr) => {
        return prev + curr.manifold.depth;
      }, 0);

      if (index + min === current) {
        p5.fill(toColor(colors.cool, 1.0));
      } else if (penetration > 6 && penetration < 3) {
        p5.fill(toColor(colors.warm04, 1.0));
      } else if (penetration > 3) {
        p5.fill(toColor(colors.warm03, 1.0));
      } else if (hasCollision) {
        p5.fill(toColor(colors.warm02, 1.0));
      } else {
        p5.fill(toColor(colors.timelineBg, 1.0));
      }

      const barX = paddingX + index * (barWidth + spacing);

      p5.rect(barX, barY, barWidth, barHeight);
    }

    p5.pop();
  }

  function drawCamData(cam_offset: [number, number], camData: CamData) {
    const { limits, hard, soft, drag_vel } = camData;
    const camOffset = v2(cam_offset);
    const halfX = 200;
    const halfY = 120;
    const crossHairSize = 5;

    {
      const limitsMin = v2(limits[0]);
      const limitsMax = v2(limits[1]);
      const limitsSize = limitsMax.copy().sub(limitsMin);

      p5.push();

      p5.noFill();
      p5.stroke(toColor(colors.magenta));
      p5.rect(limitsMin.x, limitsMin.y, limitsSize.x, limitsSize.y);

      p5.pop();
    }

    {
      p5.push();

      const softMin = v2(soft[0]);
      const softMax = v2(soft[1]);

      const top = halfY - softMin.y * halfY;
      const bottom = halfY + softMax.y * halfY;
      p5.strokeWeight(1);
      p5.stroke(toColor(colors.magenta, opacity.xs));
      p5.drawingContext.setLineDash([5, 5]);

      p5.line(0, top - camOffset.y, 400, top - camOffset.y);
      p5.line(0, bottom - camOffset.y, 400, bottom - camOffset.y);

      p5.pop();
    }

    {
      p5.push();

      const hardMin = v2(hard[0]);
      const hardMax = v2(hard[1]);

      const top = halfY - hardMin.y * halfY;
      const bottom = halfY + hardMax.y * halfY;
      p5.strokeWeight(1);
      p5.stroke(toColor(colors.magenta, opacity.xs));

      p5.line(0, top - camOffset.y, 400, top - camOffset.y);
      p5.line(0, bottom - camOffset.y, 400, bottom - camOffset.y);

      p5.pop();
    }

    {
      p5.push();

      p5.strokeWeight(1);
      p5.stroke(toColor(colors.magenta, opacity.xs));

      p5.line(
        halfX - crossHairSize - camOffset.x,
        halfY - camOffset.y,
        halfX + crossHairSize - camOffset.x,
        halfY - camOffset.y
      );
      p5.line(
        halfX - camOffset.x,
        halfY - crossHairSize - camOffset.y,
        halfX - camOffset.x,
        halfY + crossHairSize - camOffset.y
      );

      p5.pop();
    }
    {
      p5.push();
      p5.textSize(text.sizeS);
      p5.text(
        `cam_vel: ${drag_vel}`,
        halfX - camOffset.x,
        halfY - crossHairSize - camOffset.y
      );
      p5.pop();
    }
  }

  function drawStep(step: Step) {
    p5.push();
    const { ball, cam_offset, cam_data, collisions } = step;
    p5.translate(cam_offset[0], cam_offset[1]);

    drawStaticBodies(staticBodies);
    drawBall(ball, step);
    drawCollisions(ball, collisions);
    if (checkboxCam?.checked()) {
      drawCamData(cam_offset, cam_data);
    }

    p5.pop();
  }

  function drawCollisions(ball: Body, collisions: Collision[]) {
    collisions.forEach((item, i) => {
      p5.push();
      p5.fill(toColor(colors.collider));
      p5.stroke(toColor(colors.collider));
      drawCollisionShape(item.body);
      p5.pop();

      if (item.body.shape_type.id == SHAPE_TYPE_CAPSULE) {
        drawFlipperCollider(item, ball);
        // drawClosestPointToTangets(item, ball);
      }

      drawCollision(ball, item, i);
    });
  }

  function drawClosestPointToTangets(collision: Collision, ball: Body) {
    const { body } = collision;
    const shape = body.shape as ShapeCapsule;
    const a = v2(shape.a);
    const b = v2(shape.b);
    const { ra, rb } = shape;

    const tangents = outerTangents(a.x, a.y, ra, b.x, b.y, rb).map((line) => {
      return {
        a: v2([line[0][0], line[0][1]]),
        b: v2([line[1][0], line[1][1]]),
      };
    });

    p5.push();
    p5.fill(colors.orange);
    // p5.noStroke();
    tangents.forEach((line, i) => {
      const closestA = closestPointToLine(line.a, line.b, v2(ball.pos));
      const closestB = closestPointToLine(
        a,
        b,
        p5.createVector(closestA.x, closestA.y)
      );
      const ba = v2(ball.pos).sub(p5.createVector(closestA.x, closestA.y));
      p5.textSize(text.sizeS);
      p5.text(`${ba.mag()}`, closestA.x, closestA.y);
      p5.line(closestA.x, closestA.y, closestB.x, closestB.y);
    });
    p5.pop();
  }

  function drawFlipperCollider(collision: Collision, ball: Body) {
    const { body } = collision;
    const vel = v2(body.vel);
    const shape = body.shape as ShapeCapsule;

    p5.push();

    const closest = closestPointToLine(v2(shape.a), v2(shape.b), v2(ball.pos));

    {
      const closestTangent = closestPointToLine(
        v2(shape.a),
        v2(shape.b),
        v2(body.pos)
      );
      let dist = 0;
      const a = p5.createVector(closestTangent.x, closestTangent.y);
      const b = p5.createVector(closest.x, closest.y);
      dist = a.sub(b).mag();
      p5.push();
      p5.textSize(text.sizeS);
      p5.textAlign(p5.LEFT, p5.CENTER);
      p5.text(`dist: ${dist}`, closest.x + 10, closest.y);
      p5.pop();
    }

    const r = p5.lerp(shape.ra, shape.rb, closest.t);

    p5.fill(toColor(colors.collider, opacity.xs));
    p5.stroke(toColor(colors.collider, opacity.xs));

    p5.push();
    p5.noStroke();
    p5.circle(closest.x, closest.y, r * 2);
    p5.pop();

    if (vel.mag() > 0) {
      const a = p5.createVector(closest.x, closest.y);
      const b = a.add(vel.mult(10));

      p5.push();
      p5.fill(toColor(colors.flipperVel));
      p5.stroke(toColor(colors.flipperVel));
      arrow(closest.x, closest.y, b.x, b.y);
      p5.pop();
    }

    p5.pop();
  }

  function drawStaticBodies(bodies: Body[]) {
    if (bodies) {
      bodies.forEach((item) => {
        p5.push();
        p5.fill(toColor(colors.staticBodies, opacity.staticBodies));
        p5.noStroke();
        drawCollisionShape(item);
        p5.pop();
      });
    }
  }

  function drawBallInfo(ball: Body) {
    const pos = v2(ball.pos);
    const posD = v2(ball.pos_d);
    const { ang_vel: angVel, ang_vel_d: angVelDel } = ball;
    const vel = v2(ball.vel).mult(10);
    const velDelta = v2(ball.vel_d).mult(10);
    const shape = ball.shape as ShapeCircle;
    const r = shape.r;

    p5.push();

    p5.textSize(text.sizeS);
    p5.textAlign(p5.LEFT, p5.CENTER);
    p5.text(
      `pos: ${pos.x}, ${pos.y}
posDelta: ${posD.x}, ${posD.y}
vel: ${vel.x}, ${vel.y}
velDelta: ${velDelta.x}, ${velDelta.y}
velAng: ${angVel}
velAngDelta: ${angVelDel}
`,
      pos.x + r + 2,
      pos.y - r
    );

    p5.pop();
  }

  function drawBallGhost(ball: Body) {
    const pos = v2(ball.pos);
    const posD = v2(ball.pos_d);
    const velD = v2(ball.vel_d);
    const posN = v2(ball.vel).add(pos).add(velD).add(posD);
    const shape = ball.shape as ShapeCircle;
    const r = shape.r;

    p5.circle(posN.x, posN.y, r * 2);
    p5.circle(posN.x, posN.y, 1);
  }

  function drawBallVel(ball: Body) {
    const pos = v2(ball.pos);
    const vel = v2(ball.vel).mult(10).add(pos);
    arrow(pos.x, pos.y, vel.x, vel.y);
  }

  function drawBallVelDelta(ball: Body) {
    const velDelta = v2(ball.vel_d);
    const a = v2(ball.pos);
    const b = v2(ball.vel_d).mult(10).add(a);

    if (velDelta.x + velDelta.y != 0) {
      arrow(a.x, a.y, b.x, b.y);
    }
  }

  function drawBallShape(ball: Body) {
    const pos = v2(ball.pos);
    const shape = ball.shape as ShapeCircle;
    const r = shape.r;

    // Draw Ball
    p5.circle(pos.x, pos.y, r * 2);
    p5.circle(pos.x, pos.y, 1);
  }

  function drawBall(ball: Body, step: Step) {
    p5.push();
    p5.fill(toColor(colors.info, opacity.l));
    p5.textSize(text.sizeS);
    drawBallInfo(ball);
    p5.pop();

    p5.push();
    p5.stroke(toColor(colors.ghost, opacity.s));
    p5.fill(toColor(colors.ghost, opacity.s));
    drawBallGhost(ball);
    p5.pop();

    let color = colors.ball;
    if (step.collisions.length > 0) {
      color = colors.ballCollided;
    }

    p5.push();
    p5.stroke(toColor(color));
    p5.fill(toColor(color));
    drawBallShape(ball);

    p5.push();
    p5.stroke(toColor(colors.velocity, opacity.l));
    p5.fill(toColor(colors.velocity, opacity.l));
    drawBallVel(ball);
    p5.pop();

    p5.push();
    p5.stroke(toColor(colors.angular, opacity.l));
    p5.fill(toColor(colors.angular, opacity.l));
    drawBallVelDelta(ball);
    p5.pop();

    p5.pop();
  }

  function drawCollisionStart(collision: Collision) {
    const { manifold, body } = collision;
    const a = v2(manifold.contact);

    p5.circle(a.x, a.y, 1);
  }

  function drawCollisionEnd(collision: Collision) {
    const { manifold } = collision;
    const { depth } = manifold;
    const a = v2(manifold.contact);
    const b = v2(manifold.normal).normalize().mult(depth).add(a);

    p5.circle(b.x, b.y, 1);
  }

  function drawCollisionDepth(collision: Collision) {
    const { manifold } = collision;
    const { depth } = manifold;

    const a = v2(manifold.contact);
    const b = v2(manifold.normal).normalize().mult(depth).add(a);

    p5.line(a.x, a.y, b.x, b.y);
  }

  function drawCollisionInfo(a: Body, collision: Collision, i: number) {
    const { manifold, body: b } = collision;
    const pos = v2(b.pos);
    const { depth } = manifold;

    const aVel = v2(a.vel);
    const bVel = v2(b.vel);

    const start = v2(manifold.contact);
    const end = v2(manifold.normal).normalize().mult(depth).add(start);

    const ra = end.copy().sub(a.pos);
    const rb = start.copy().sub(b.pos);

    const va = aVel
      .copy()
      .add(p5.createVector(-a.ang_vel * ra.y, a.ang_vel * ra.x));
    const vb = bVel
      .copy()
      .add(p5.createVector(-b.ang_vel * rb.y, b.ang_vel * rb.x));
    const rv = va.copy().sub(vb);

    const rvLen = rv.magSq();
    // v2 va = v2_add(a->vel, (v2){-a->ang_vel * ra.y, a->ang_vel * ra.x});
    // v2 vb = v2_add(b->vel, (v2){-b->ang_vel * rb.y, b->ang_vel * rb.x});

    const showExtraInfo = checkboxExtraInfo?.checked();

    p5.text(
      `col: ${i}
depth: ${depth}
vel: ${bVel.x}, ${bVel.y}
velM: ${bVel.mag()}
p: ${pos.x}, ${pos.y}`,
      start.x - 20,
      start.y + i * 50
    );

    if (showExtraInfo) {
      p5.text(
        `ra: ${ra.x}, ${ra.y}
rb: ${rb.x}, ${rb.y}
va: ${va.x}, ${va.y}
vb: ${vb.x}, ${vb.y}
rv: ${rv.x}, ${rv.y}
rvL: ${rvLen}
`,
        start.x - 20,
        start.y + 23 + i * 50
      );
    }
  }

  function drawCollisionTan(collision: Collision) {
    // const { depth } = collision.manifold.depth ;
    const width = 10;
    const normal = v2(collision.manifold.normal);
    const tan = v2([normal.y, -normal.x]).normalize();
    const a = v2(collision.manifold.contact).sub(tan.copy().mult(width / 2));
    const b = a.copy().add(tan.mult(width));
    p5.line(a.x, a.y, b.x, b.y);
  }

  function drawCollision(ball: Body, collision: Collision, i: number) {
    p5.push();
    p5.fill(toColor(colors.contact01));
    p5.noStroke();
    drawCollisionStart(collision);
    p5.pop();

    p5.push();
    p5.fill(toColor(colors.contact02));
    p5.noStroke();
    drawCollisionEnd(collision);
    p5.pop();

    p5.push();
    p5.fill(toColor(colors.black));
    p5.stroke(toColor(colors.black));
    drawCollisionDepth(collision);
    p5.pop();

    p5.push();
    p5.fill(toColor(colors.tangent, opacity.s));
    p5.stroke(toColor(colors.tangent, opacity.s));
    drawCollisionTan(collision);
    p5.pop();

    p5.push();
    p5.textAlign(p5.RIGHT, p5.CENTER);
    p5.textSize(text.sizeS);
    p5.fill(toColor(colors.info, opacity.l));
    drawCollisionInfo(ball, collision, i);
    p5.pop();
  }

  function drawCollisionShape(body: Body) {
    const { shape_type: shapeType } = body;
    const p = v2(body.pos);

    switch (shapeType.id) {
      case SHAPE_TYPE_CIRCLE:
        {
          const shape = body.shape as ShapeCircle;
          const p = v2(shape.p).add(v2(body.pos));
          p5.circle(p.x, p.y, shape.r * 2);
        }
        break;
      case SHAPE_TYPE_POLY:
        {
          const shape = body.shape as ShapePolygon;
          for (let i = 0; i < shape.sub_polys.length; i++) {
            const subPoly = shape.sub_polys[i];
            p5.beginShape();
            for (let j = 0; j < subPoly.verts.length; j++) {
              const a = v2(subPoly.verts[j]);
              p5.vertex(a.x, a.y);
            }
            p5.endShape(p5.CLOSE);
          }
        }
        break;
      case SHAPE_TYPE_CAPSULE:
        {
          console.log(body.shape);
          const shape = body.shape as ShapeCapsule;
          const a = v2(shape.a);
          const b = v2(shape.b);
          const { ra, rb } = shape;

          p5.push();
          p5.noFill();
          p5.circle(a.x, a.y, ra * 2);
          p5.circle(b.x, b.y, rb * 2);
          p5.pop();

          p5.line(a.x, a.y, b.x, b.y);

          // Draw the collider at body position
          const closest = closestPointToLine(
            v2(shape.a),
            v2(shape.b),
            p.copy()
          );
          const r = p5.lerp(shape.ra, shape.rb, closest.t);
          p5.push();
          p5.noStroke();
          p5.circle(closest.x, closest.y, r * 2);
          p5.pop();

          const tangents = outerTangents(a.x, a.y, ra, b.x, b.y, rb);
          tangents.forEach((line) => {
            const [la, lb] = line;
            const [lax, lay] = la;
            const [lbx, lby] = lb;
            p5.line(lax, lay, lbx, lby);
          });
        }
        break;
      default:
        console.warn("Shape type not handled", shapeType);
        break;
    }

    p5.push();
    p5.noStroke();
    p5.circle(p.x, p.y, 1.0);
    p5.pop();
  }

  function keyPressed() {
    const { keyCode } = p5;
    if (keyCode === p5.LEFT_ARROW) {
      prevStep();
    } else if (keyCode === p5.RIGHT_ARROW) {
      nextStep();
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

  function windowResized() {
    p5.resizeCanvas(p5.windowWidth, p5.windowHeight);
  }

  p5.setup = setup;
  p5.draw = draw;
  p5.keyPressed = keyPressed;
  p5.mouseWheel = mouseWheel;
  p5.mouseDragged = mouseDragged;
  p5.mousePressed = mousePressed;
  p5.mouseReleased = mouseReleased;
  p5.windowResized = windowResized;
}, document.getElementById("app")!);
