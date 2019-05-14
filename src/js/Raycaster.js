const imageWidth = 64;
const CeilingColor = 0xFF000000;
const FloorColor = 0xFF000000;


/*
  Terms:
    sliver - a 1-pixel wide vertical column of the canvas

*/
export default class Raycaster {

  sampleTexture(index) {
    if (this.textest) {
      return this.textest[index];

    }
    return window.texBuff8[index];
  }

  constructor(v, m, t) {
    this.cvs = v;

    this.worldMap = m;
    this.textest = t;

    this.W = this.cvs.width;
    this.H = this.cvs.height;

    this.viewportCtx = this.cvs.getContext('2d');
    this.viewport = this.viewportCtx.getImageData(0, 0, this.W, this.H);
    this.arrBuff = new ArrayBuffer(this.viewport.data.length);
    this.buf8 = new Uint8ClampedArray(this.arrBuff);
    this.buf32 = new Uint32Array(this.arrBuff);
  }

  clearBackground() {
    this.buf32.fill(0);
  }

  render(cam) {
    let rayOrigin = createVector();
    let camRay = createVector();

    // These will be used to index into the worldMap Array
    let mapCellCol, mapCellRow;

    let scaleX, scaleY;
    let stepX, stepY;
    let sideDistX, sideDistY;
    let deltaDistX, deltaDistY;
    let hit, side;
    let wallDist;
    let perpWallDist;
    let camX;
    let wallX;

    let right = cam.right;
    let dir = cam.dir;

    let H = this.H;
    let W = this.W;
    let worldMap = this.worldMap;

    this.clearBackground();

    rayOrigin.set(cam.pos.x, cam.pos.y);

    // Floor the values outside the loop to save on processing.
    let [flooredRayPosX, flooredRayPosY] = [floor(rayOrigin.x), floor(rayOrigin.y)];

    let rads = (cam.fov / 180) * Math.PI;
    let _fov = tan(rads / 2);

    /*
      For each vertical line / sliver of the viewport, we're going to cast a ray into the
      scene that will eventually hit an edge of a square in the map that is being occupied
      by a wall.
    */ 
    for (let x = 0; x < W; x++) {

      /*
        Each sliver needs to be assigned a slightly different 'perspective'
        map values from left to right side of canvas to  -1(left) to 0(center) to +1(right)
      */
      camX = 2 * (x / (W - 1)) - 1;
      camX *= _fov;

      /*
        Each sliver will be assigned our forward direction vector and added to it.
      */
      camRay.set(dir.x + (right.x * camX), dir.y + (right.y * camX));

      /*
        Since our algorithm updates these values we'll need to reset them 
        for each iteration of the loop
      */
      [mapCellCol, mapCellRow] = [flooredRayPosX, flooredRayPosY];

      /*
        We're given a 2D grid with 1-unit squares along with a line that exists within that space.
        The line can be oriented in any angle.

        Let's assume the line is not completely vertical, but instead is on an angle.
        The line will intercept a vertical line in that grid. Then after 1 x-units right or left
        it will intersect another vertical line. Note that this will form a right angled triangle.

        We know the base of the triangle is 1 unit. The line began at the left edge of a square and
        'ended' at the next square unit over.

        We would like to calculate is the rise/y distance of this line.

        We need to create a value such that when multiplied by camRay.x or camRay.y 
        it will respectively scale that scalar value so that it will 'reach' 1 unit across.
      */
      [scaleX, scaleY] = [1 / camRay.x, 1 / camRay.y];

      // scale the vector by the inverse of the x component,
      // which makes the x component equal to one.
      // then calculate the magnitude
      deltaDistX = createVector(1, camRay.y * scaleX).mag();
      deltaDistY = createVector(1, camRay.x * scaleY).mag();

      //
      if (camRay.x < 0) {
        stepX = -1;
        sideDistX = (rayOrigin.x - mapCellCol) * deltaDistX;
      } else {
        stepX = 1;
        sideDistX = (mapCellCol + 1 - rayOrigin.x) * deltaDistX;
      }

      if (camRay.y < 0) {
        stepY = -1;
        sideDistY = (rayOrigin.y - mapCellRow) * deltaDistY;
      } else {
        stepY = 1;
        sideDistY = (mapCellRow + 1 - rayOrigin.y) * deltaDistY;
      }



      ////////////////////////////////////////////////////////////////
      // Search
      hit = 0;
      while (hit == 0) {

        if (sideDistX < sideDistY) {
          sideDistX += deltaDistX;
          mapCellCol += stepX;
          side = 0;
        } else {
          sideDistY += deltaDistY;
          mapCellRow += stepY;
          side = 1;
        }

        // We hit something that isn't empty space, we can stop looping
        if (worldMap[mapCellCol][mapCellRow] > 0) {
          hit = 1;
        }
      }



      ////////////////////////////////////////////////////////////////
      // Calculate distance projected on camera direction (oblique distance will give fisheye effect!)
      if (side == 0) {
        wallDist = abs((mapCellCol - rayOrigin.x + (1 - stepX) / 2) / camRay.x);
      } else {
        wallDist = abs((mapCellRow - rayOrigin.y + (1 - stepY) / 2) / camRay.y);
      }

      if (side === 0) {
        wallX = rayOrigin.y + wallDist * camRay.y;
      } else {
        wallX = rayOrigin.x + wallDist * camRay.x;
      }

      //
      wallX -= Math.floor(wallX);

      // 
      let unclampedSliverHeight = H / wallDist;

      // clamp the height
      let sliverHeight = min(H / wallDist, H);

      let texX = floor(wallX * 64);

      // If we are so close to a wall that the wall sliver is greater than the viewport,
      // it means we must sample the texture 'lower down'.
      // For this sliver, assume we will display the entire 'y' texture
      let start = 0;
      let end = 64;

      // We'll need to figure out where to start sampling the texture if the sliver height
      // is longer than the viewport height (we'll have to sampler lower down and also not
      // sample until the 'bottom' of the texture)
      if (unclampedSliverHeight > H) {
        // 8000 / 480 = 16.6
        let texShownPercent = H / unclampedSliverHeight;

        // (480/8000) * 64
        let texelsToShow = texShownPercent * 64;

        start = 32 - (texelsToShow / 2);
        end = 32 + (texelsToShow / 2);
      }

      // where to start and end drawing on the canvas in the Y direction
      let cvsStartY = floor(H / 2 - sliverHeight / 2) * W;
      let cvsEndY = cvsStartY + (sliverHeight * W);

      /*
        The first implementation of this algorithm relied on a clear() method that filled the color 
        buffer with a bk color.

        Then we tried to be efficient here by only starting the iteration where the actual sliver 
        of wall begins. Turns out that doing a clear() is too expensive in terms of rendering.

        It isn't very efficient either since the walls will end up covering up most of the background anyway.

        So instead, we iterate over the entire sliver from top to bottom and check if we're rendering 
        the ceiling, wall, or floor. 
      */
      for (let viewPortY = cvsStartY; viewPortY < W * H; viewPortY += W) {

        let d = min(1, 1 / wallDist);

        // ceiling
        if (viewPortY < cvsStartY) {
          let col = 255 - viewPortY / W;
          this.buf32[x + viewPortY] = 0xFF000000 | (col << 16);
        }
        // floor
        else if (viewPortY > cvsEndY) {
          let col = 255 - (H - (viewPortY / W));
          this.buf32[x + viewPortY] = 0xFF000000 | ((col / 5) << 8);
        }
        // wall
        else if (viewPortY >= cvsStartY) {
          // sliverHeightPx ranges from 0..height
          let sliverHeightPx = (cvsEndY - cvsStartY) / W;

          //
          let texYNormalized = ((viewPortY / W) - (cvsStartY / W)) / sliverHeightPx;

          // map 0..1 to 0..imageHeight
          let yTexel = floor(start + (end - start) * texYNormalized);
          // let ySampleEnd = 64 - ySampleStart;
          // yTexel = ySampleStart + imageWidth * floor( ySampleEnd * texYpercent);

          let tex = yTexel * (imageWidth * 4) + texX * 4;

          let [r, g, b] = [(this.sampleTexture(tex) * d) << 16, (this.sampleTexture(tex + 1) * d) << 8, this.sampleTexture(tex + 2) * d];

          this.buf32[x + viewPortY] = 0xFF000000 | r | g | b;
        }
      }
    }

    this.viewport.data.set(this.buf8);
    this.viewportCtx.putImageData(this.viewport, 0, 0);

  }
}