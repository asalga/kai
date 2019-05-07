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

/*

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

  static render(cam) {
    pos = cam.pos;
    right = cam.right;
    dir = cam.dir;

    // For every vertical line on the viewport...
    for (let x = 0; x < W; x++) {

      //
      let camX = 2 * x / W - 1;

      rayPos.set(pos.x, pos.y);

      //
      rayDir.set(dir.x + (right.x * camX), dir.y + (right.y * camX));

      let mapX = floor(rayPos.x);
      let mapY = floor(rayPos.y);

      //
      //
      let scaleX = 1 / rayDir.x;
      let scaleY = 1 / rayDir.y;

      // scale the vector by the inverse of the x component,
      // which makes the x component equal to one.
      // then calculate the magnitude
      let deltaDistX = createVector(1, rayDir.y * scaleX).mag();
      let deltaDistY = createVector(1, rayDir.x * scaleY).mag();

      let stepX, stepY;

      //
      let sideDistX;
      let sideDistY;

      if (rayDir.x < 0) {
        stepX = -1;
        sideDistX = (rayPos.x - mapX) * deltaDistX;
      } else {
        stepX = 1;
        sideDistX = (mapX + 1.0 - rayPos.x) * deltaDistX;
      }

      if (rayDir.y < 0) {
        stepY = -1;
        sideDistY = (rayPos.y - mapY) * deltaDistY;
      } else {
        stepY = 1;
        sideDistY = (mapY + 1.0 - rayPos.y) * deltaDistY;
      }


      ////////////////////////////////////////////////////////////////
      // Search
      let hit = 0;
      let side = 0;
      while (hit == 0) {

        if (sideDistX < sideDistY) {
          sideDistX += deltaDistX;
          mapX += stepX;
          side = 0;
        } else {
          sideDistY += deltaDistY;
          mapY += stepY;
          side = 1;
        }

        // We hit something that isn't empty space, we can stop looping
        if (worldMap[mapX][mapY] > 0) {
          hit = 1;
        }
      }



      ////////////////////////////////////////////////////////////////
      let wallDist;
      let perpWallDist = 0;
      // Calculate distance projected on camera direction (oblique distance will give fisheye effect!)
      if (side == 0) {
        wallDist = abs((mapX - rayPos.x + (1 - stepX) / 2) / rayDir.x);
        perpWallDist = wallDist;
      } else {
        wallDist = abs((mapY - rayPos.y + (1 - stepY) / 2) / rayDir.y);
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
      var realLineHeight = lineHeight;

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
      for (let viewPortY = 0; viewPortY < W * H; viewPortY += W) {

        // ceiling
        if (viewPortY < cvsStartY) {
          buf32[x + viewPortY] = CeilingColor;
        }
        // floor
        else if (viewPortY > cvsEndY) {
          buf32[x + viewPortY] = FloorColor;
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

          let d = min(1, 1 / wallDist);
          let [r, g, b] = [(Raycaster.sampleTexture(tex) * d) << 16, (Raycaster.sampleTexture(tex + 1) * d) << 8, Raycaster.sampleTexture(tex + 2) * d];

          buf32[x + viewPortY] = 0xFF000000 | r | g | b;
        }
      }
    }
    viewport.data.set(buf8);
    viewportCtx.putImageData(viewport, 0, 0);

  }



}