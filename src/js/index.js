'use strict';

const imageWidth = 64;
const ROT_SPEED = 0.1;
let walkSpeed = 5;

let keys = {};

const CeilingColor = 0xFF000000;
const FloorColor = 0xFF000000;


// 
let pos, dir, right;
let rot = 0;

let rayPos;
let rayDir;


let FOV = 0.6;

let lastTime = Date.now(),
  now = Date.now();

//
let canvas,
  ctx,
  arrBuff,
  buf8,
  buf32,
  imageData;
let texture;

let textureData;
let texData = new ArrayBuffer(64 * 64 * 4);
let texBuff8 = new Uint8ClampedArray(texData);
let texBuff32 = new Uint32Array(texData);

let myMap;
let worldMap = [];
let mapLoaded = true;

window.preload = function() {

  myMap = loadImage('../data/map1.png', function() {
    myMap.loadPixels();
    let px = myMap.pixels;

    let w = myMap.width;
    let h = myMap.height;

    for (let i = 0; i < myMap.height; i++) {
      w = myMap.width;
      worldMap.push(new Array(w));
    }

    for (let row = 0; row < h; row++) {
      for (let col = 0; col < w; col++) {

        let idx = (row * myMap.height + col) * 4;

        let r = myMap.pixels[idx + 0];
        let g = myMap.pixels[idx + 1];
        let b = myMap.pixels[idx + 2];
        let a = myMap.pixels[idx + 3];

        if (b === 255) {
          worldMap[row][col] = 1;
        } else {
          worldMap[row][col] = 0;
        }
      }
    }

    mapLoaded = true;
  });

  texture = loadImage('../data/tes11.png', function() {
    texture.loadPixels();
    texBuff8 = texture.pixels.slice(0);

    // for(let i = 0; i < 64*64; i+=4){
    //  let c = texture.pixels[i];
    //  //bugger;
    //  texBuff8[i*0] = texture.pixels[i];
    //  texBuff8[i*0 + 1] = texture.pixels[i+1];
    //  texBuff8[i*0 + 2] = texture.pixels[i+2];
    //  texBuff8[i*0 + 3]= 255;
    // }
  });
}

window.setup = function() {
  createCanvas(800, 600);

  ctx = document.getElementById('defaultCanvas0').getContext('2d');

  pos = createVector(17, 7);
  dir = createVector(-1, 0);
  right = createVector(0, -1);

  rayPos = createVector();
  rayDir = createVector();

  imageData = ctx.getImageData(0, 0, width, height);
  arrBuff = new ArrayBuffer(imageData.data.length);

  buf8 = new Uint8ClampedArray(arrBuff);
  buf32 = new Uint32Array(arrBuff);

  strokeCap(PROJECT);
}

/*
 */
function update(dt) {
  if (keys.ArrowRight) {
    rot -= ROT_SPEED;
  }
  if (keys.ArrowLeft) {
    rot += ROT_SPEED;
  }

  if (keys.ArrowUp) {
    moveCharacter(1, dt);
  }
  if (keys.ArrowDown) {
    moveCharacter(-1, dt);
  }
}

function moveCharacter(doNegate, dt) {
  let oldPosX = pos.x;
  let oldPosY = pos.y;

  pos.x += doNegate * dir.x * walkSpeed * dt;
  pos.y += doNegate * dir.y * walkSpeed * dt;

  if (worldMap[floor(pos.x)][floor(pos.y)] !== 0) {
    pos.x = oldPosX;
    pos.y = oldPosY;
  }
}



/*
 */
window.draw = function() {

  // We can't render until the map is loaded
  if (mapLoaded === false) { return; }

  now = Date.now();

  //
  dir.x = cos(rot);
  dir.y = -sin(rot);

  right.x = sin(rot);
  right.y = cos(rot);


  // TODO: pass in an image?
  // For every vertical line on the viewport...
  // Raycasting works on 1-pixel width columns along the viewport
  for (let x = 0; x < width; x++) {

    //
    let camX = 2 * x / width - 1;

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
    let lineHeight = abs(height / wallDist);

    // 
    var realLineHeight = lineHeight;

    lineHeight = min(lineHeight, height);
    let texX = floor(wallX * 64);

    // If we are so close to a wall that the wall sliver is greater than the viewport,
    // it means we must sample the texture 'lower down'.
    // For this sliver, assume we will display the entire 'y' texture
    let start = 0;
    let end = 64;

    //
    if (realLineHeight > height) {
      // 8000 / 480 = 16.6
      let texShownPercent = height / realLineHeight;

      // (480/8000) * 64
      let texelsToShow = texShownPercent * 64;

      start = 32 - (texelsToShow / 2);
      end = 32 + (texelsToShow / 2);
    }

    // where to start and end drawing on the canvas in the Y direction
    let cvsStartY = floor(height / 2 - lineHeight / 2) * width;
    let cvsEndY = cvsStartY + (lineHeight * width);

    /*
      The first implementation of this algorithm relied on a clear() method that filled the color 
      buffer with a bk color.

      Then we tried to be efficient here by only starting the iteration where the actual sliver 
      of wall begins. Turns out that doing a clear() is too expensive in terms of rendering.

      It isn't very efficient either since the walls will end up covering up most of the background anyway.

      So instead, we iterate over the entire sliver from top to bottom and check if we're rendering 
      the ceiling, wall, or floor. 
    */
    for (let viewPortY = 0; viewPortY < width * height; viewPortY += width) {

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
        let sliverHeightPx = (cvsEndY - cvsStartY) / width;

        //
        let texYNormalized = ((viewPortY / width) - (cvsStartY / width)) / sliverHeightPx;

        // map 0..1 to 0..imageHeight
        let yTexel = floor(start + (end - start) * texYNormalized);
        // let ySampleEnd = 64 - ySampleStart;
        // yTexel = ySampleStart + imageWidth * floor( ySampleEnd * texYpercent);

        let tex = yTexel * (imageWidth * 4) + texX * 4;

        let d = min(1, 1 / wallDist);
        let [r, g, b] = [(sampleTexture(tex) * d) << 16, (sampleTexture(tex + 1) * d) << 8, sampleTexture(tex + 2) * d];

        buf32[x + viewPortY] = 0xFF000000 | r | g | b;
      }
    }
  }

  let delta = (now - lastTime) / 1000.0;

  update(delta);
  imageData.data.set(buf8);

  ctx.putImageData(imageData, 0, 0);

  noFill();
  stroke(255);
  let fps = floor(frameRate());
  text(fps, 10, 10);

  strokeWeight(2);
  stroke(50);
  noFill();
  rect(0, 0, 800, 600);

  lastTime = now;
}

function sampleTexture(index) {
  return texBuff8[index];
}

window.keyReleased = function(evt) {
  keys[evt.key] = false;
}

window.keyPressed = function(evt) {
  keys[evt.key] = true;
}

// let myShader;

// function drawSky() {
//   fill(33, 66, 99);
//   rect(0, 0, GameWidth, GameHeight / 2);
// }

// function drawFloor() {
//   fill(63, 156, 69);
//   rect(0, GameHeight / 2, GameWidth, GameHeight);
// }

// window.preload = function() {};

// window.setup = function() {
//   createCanvas(500, 500);

//   myShader = new p5.Shader(this._renderer, vert, frag);
//   shader(myShader);
// };

// window.draw = function() {
//   background(100);

//   push();
//   noStroke();

//   drawSky();
//   drawFloor();
//   drawWalls();

//   pop();
// };

// function update(dt) {}