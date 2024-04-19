class Frame {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = 50;
  }

  display() {
    ellipse(this.x, this.y, this.size * 2);
  }

  move() {
    this.x = this.x + random(-2, 2);
    this.y = this.y + random(-2, 2);
  }

  clicked() {
    if (dist(mouseX, mouseY, this.x, this.y) < this.size) {
      background(255, 0, 0);
    }
  }
}
