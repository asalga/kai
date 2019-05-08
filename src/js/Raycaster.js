//
let hasInit = false;
const imageWidth = 64;

const CeilingColor = 0xFF000000;
const FloorColor = 0xFF000000;

let arrBuff
let buf8; // = new Uint8ClampedArray(arrBuff);
let buf32; // = new Uint32Array(arrBuff);

let worldMap;
let viewportCvs;
let viewportCtx;
let viewport;

let rayPos;
let rayDir;

let W, H;

let pos, dir, right;

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

/*
  Terms:
    sliver - a 1-pixel wide vertical column of the canvas

*/
export default class Raycaster {

  static sampleTexture(index) {
    return window.texBuff8[index];
  }

  static init(v, m) {
    if (hasInit === false) {
      hasInit = true;

      viewportCvs = v;
      worldMap = m;

      W = viewportCvs.width;
      H = viewportCvs.height;

      viewportCtx = viewportCvs.getContext('2d');
      viewport = viewportCtx.getImageData(0, 0, W, H);
      arrBuff = new ArrayBuffer(viewport.data.length);
      buf8 = new Uint8ClampedArray(arrBuff);
      buf32 = new Uint32Array(arrBuff);

      rayPos = createVector();
      rayDir = createVector();
    }
  }

  static clearBackground() {
    buf32.fill(0);
  }

  static render(cam) {
    pos = cam.pos;
    right = cam.right;
    dir = cam.dir;

    Raycaster.clearBackground();

    rayPos.set(pos.x, pos.y);

    // Floor the values outside the loop to save on processing.
    let [flooredRayPosX, flooredRayPosY] = [floor(rayPos.x), floor(rayPos.y)];
  
    let rads = (cam.fov /180) * Math.PI;
    let _fov = tan(rads/2);

    // For every vertical line on the viewport...
    for (let x = 0; x < W; x++) {

      // Each sliver needs to be assigned a slightly different 'perspective'
      // map values from left to right side of canvas to
      // -1(left) to 0(center) to +1(right)
      camX = 2 * (x / (W - 1)) - 1;
      camX *= _fov;

      // Each sliver will be assigned our forward direction vector
      // and added to it.
      rayDir.set(dir.x + (right.x * camX), dir.y + (right.y * camX));

      // Since our algorithm updates these values we'll need to reset
      // them for each iteration of the loop
      [mapCellCol, mapCellRow] = [flooredRayPosX, flooredRayPosY];

      //
      [scaleX, scaleY] = [1 / rayDir.x, 1 / rayDir.y];

      // scale the vector by the inverse of the x component,
      // which makes the x component equal to one.
      // then calculate the magnitude
      deltaDistX = createVector(1, rayDir.y * scaleX).mag();
      deltaDistY = createVector(1, rayDir.x * scaleY).mag();

      //
      if (rayDir.x < 0) {
        stepX = -1;
        sideDistX = (rayPos.x - mapCellCol) * deltaDistX;
      } else {
        stepX = 1;
        sideDistX = (mapCellCol + 1 - rayPos.x) * deltaDistX;
      }

      if (rayDir.y < 0) {
        stepY = -1;
        sideDistY = (rayPos.y - mapCellRow) * deltaDistY;
      } else {
        stepY = 1;
        sideDistY = (mapCellRow + 1 - rayPos.y) * deltaDistY;
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
        wallDist = abs((mapCellCol - rayPos.x + (1 - stepX) / 2) / rayDir.x);
        perpWallDist = wallDist;
      } else {
        wallDist = abs((mapCellRow - rayPos.y + (1 - stepY) / 2) / rayDir.y);
        perpWallDist = wallDist;
      }

      let wallX;
      if (side === 0) {
        wallX = rayPos.y + perpWallDist * rayDir.y;
      } else {
        wallX = rayPos.x + perpWallDist * rayDir.x;
      }

      //
      wallX -= Math.floor(wallX);

      //
      let lineHeight = abs(H / wallDist);

      // 
      let realLineHeight = lineHeight;

      lineHeight = min(lineHeight, H);
      let texX = floor(wallX * 64);

      // If we are so close to a wall that the wall sliver is greater than the viewport,
      // it means we must sample the texture 'lower down'.
      // For this sliver, assume we will display the entire 'y' texture
      let start = 0;
      let end = 64;

      //
      if (realLineHeight > H) {
        // 8000 / 480 = 16.6
        let texShownPercent = H / realLineHeight;

        // (480/8000) * 64
        let texelsToShow = texShownPercent * 64;

        start = 32 - (texelsToShow / 2);
        end = 32 + (texelsToShow / 2);
      }

      // where to start and end drawing on the canvas in the Y direction
      let cvsStartY = floor(H / 2 - lineHeight / 2) * W;
      let cvsEndY = cvsStartY + (lineHeight * W);

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
          // let col = 255 - viewPortY/W;
          // buf32[x + viewPortY] = 0xFF000000 | (col << 16) ;
        }
        // floor
        else if (viewPortY > cvsEndY) {
          // let col =  255 - (H - (viewPortY/W));
          // buf32[x + viewPortY] = 0xFF000000 | ((col/5) << 8);
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


          let [r, g, b] = [(Raycaster.sampleTexture(tex) * d) << 16, (Raycaster.sampleTexture(tex + 1) * d) << 8, Raycaster.sampleTexture(tex + 2) * d];

          buf32[x + viewPortY] = 0xFF000000 | r | g | b;
        }
      }
    }
    viewport.data.set(buf8);
    viewportCtx.putImageData(viewport, 0, 0);

  }
}