const ROT_SPEED = 3;
let walkSpeed = 5;

export default class Camera {
  constructor(cfg) {
    this.world = cfg.world;

    this.pos = cfg.pos;
    this.dir = createVector(-1, 0);
    this.right = createVector(0, 1);
    this.rot = 0;
  }

  update(dt) {
    if (keys.ArrowRight) {
      this.rot -= ROT_SPEED * dt;
    }
    if (keys.ArrowLeft) {
      this.rot += ROT_SPEED * dt;
    }

    this.dir.x = cos(this.rot);
    this.dir.y = -sin(this.rot);

    this.right.x = sin(this.rot);
    this.right.y = cos(this.rot);

    if (keys.ArrowUp) {
      this.moveCharacter(1, dt);
    }
    if (keys.ArrowDown) {
      this.moveCharacter(-1, dt);
    }
  }

  moveCharacter(doNegate, dt) {
    let oldcamPosX = this.pos.x;
    let oldcamPosY = this.pos.y;

    this.pos.x += doNegate * this.dir.x * walkSpeed * dt;
    this.pos.y += doNegate * this.dir.y * walkSpeed * dt;

    if (this.world[floor(this.pos.x)][floor(this.pos.y)] !== 0) {
      this.pos.x = oldcamPosX;
      this.pos.y = oldcamPosY;
    }
  }
}