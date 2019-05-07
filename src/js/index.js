'use strict';

import Raycaster from './Raycaster.js';
import Camera from './Camera.js';


let delta;

window.keys = {};

let lastTime = Date.now(),
  now = Date.now();

let canvas, ctx;
let viewportCvs;

const imageWidth = 64;
let texture;
let textureData;
let texData = new ArrayBuffer(64 * 64 * 4);
// let texBuff8 ;//= new Uint8ClampedArray(texData);
let texBuff32 = new Uint32Array(texData);

let myMap;
let worldMap = [];
let mapLoaded = true;

let cam;

/*

*/
window.preload = function() {

  myMap = loadImage('../data/map1.png', function() {
    myMap.loadPixels();
    let px = myMap.pixels;

    let w = myMap.width;
    let h = myMap.height;

    for (let i = 0; i < myMap.height; i++) {
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

    cam = new Camera({
      world: worldMap,
      pos: createVector(17, 7)
    });

    viewportCvs = document.createElement('canvas');
    viewportCvs.width = 640;
    viewportCvs.height = 480;
    Raycaster.init(viewportCvs, worldMap);

    mapLoaded = true;
  });

  texture = loadImage('../data/tes11.png', function() {
    texture.loadPixels();
    window.texBuff8 = texture.pixels.slice(0);
  });
}

window.setup = function() {
  createCanvas(640, 480);
  ctx = document.getElementById('defaultCanvas0').getContext('2d');
}

function update(dt) {
  cam.update(dt);
}

/*
 */
window.draw = function() {
  if (mapLoaded === false) {
    return;
  }
  now = Date.now();

  delta = (now - lastTime) / 1000.0;

  update(delta);
  render();

  lastTime = now;
}

function render() {
  background(0);
  Raycaster.render(cam);
  ctx.drawImage(viewportCvs, 0, 0);

  noFill();
  stroke(255);
  let fps = floor(frameRate());
  text(fps, 10, 10);

  text(floor(delta * 1000), 10, 40);
}

window.keyReleased = function(evt) {
  window.keys[evt.key] = false;
}

window.keyPressed = function(evt) {
  window.keys[evt.key] = true;
}

// let myShader;
// window.setup = function() {
//   createCanvas(500, 500);
//   myShader = new p5.Shader(this._renderer, vert, frag);
//   shader(myShader);
// };