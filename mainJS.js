window.startup = async function (Cesium) {
    'use strict';

Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJiNjY3ZTAxZS1kODkzLTQ4NTktOTcwZC02NDRjOThmYjQ3NmEiLCJpZCI6MTY3MTg3LCJpYXQiOjE2OTUwODAxMjd9.vy6lPPl6zxzV9LCk5e4zLrJbQo1PBVgYPs6iwkPxqC4';
//Sandcastle_Begin
const viewer = new Cesium.Viewer("cesiumContainer");
var scene = viewer.scene;
if (!scene) {
    console.error("No scene");
}
scene.globe.enableLighting = true;

// configure printscreen settings
const takePrintscreens = 1;
var targetResolutionScale = 1.0; // for screenshots with higher resolution set to 2.0 or even 3.0
var timeout = 10000; // in ms
const sampleTime = 5; //sec

// configure simulation time
const clock_sim = viewer.clock;
const start = Cesium.JulianDate.fromDate(new Date(2015, 2, 25, 16));
const stop = Cesium.JulianDate.addSeconds(
  start,
  360,
  new Cesium.JulianDate()
);
clock_sim.startTime = start.clone();
clock_sim.stopTime = stop.clone();
clock_sim.currentTime = start.clone();
clock_sim.clockRange = Cesium.ClockRange.LOOP_STOP;
clock_sim.multiplier = 1;
clock_sim.shouldAnimate = true;

function Buffer(formerTime,currentTime){
  this.formerTime = formerTime;
  this.currentTime = currentTime;
}

var timeBuffer = new Buffer(clock_sim.startTime, clock_sim.startTime);

const evt = clock_sim.onTick; //event
if (evt) {
evt.addEventListener(function () {
  timeBuffer.currentTime = clock_sim.currentTime;
  const diff = Cesium.JulianDate.secondsDifference(timeBuffer.currentTime,timeBuffer.formerTime);
  console.log(diff);
  console.log('---');
  if (diff > sampleTime){
    timeBuffer.formerTime = timeBuffer.currentTime;
    if (takePrintscreens) {
      scene.preRender.addEventListener(prepareScreenshot);
    }
  }
});
  evt.raiseEvent(clock_sim , timeBuffer, sampleTime);
}
else {
  console.log('Theres no event');
}

/*
// configure camera sampling time
const clock_cam = Cesium.Clock;
clock_cam.startTime = start.clone();
clock_cam.stopTime = stop.clone();
clock_cam.currentTime = start.clone();
clock_cam.clockRange = Cesium.ClockRange.LOOP_STOP;
clock_cam.multiplier = 1;
clock_cam.canAnimate = true;
clock_cam.shouldAnimate = true;

console.log(clock_cam.currentTime);
*/

/*
clock_cam.onTick.addEventListener( () => {
  //console.log(viewer.clock.currentTime.toString());
          if (takePrintscreens) {
    scene.preRender.addEventListener(prepareScreenshot);
    }
    });
*/

// configure position
const longitude = -112.110693;
const latitude = 0;
const altitude = 600 * 1000; // meters

function computeFlight(lon, lat, alt) {
  const property = new Cesium.SampledPositionProperty();
  const startAngle = lon;
  const deltaAngle = 2 * 360.0;
  const endAngle = startAngle + deltaAngle;
  const increment = 10.0;
  for (let i = startAngle; i < endAngle; i += increment) {
    //console.log(i);
    const timeIncrement = i - startAngle;
    const time = Cesium.JulianDate.addSeconds(
      start,
      timeIncrement,
      new Cesium.JulianDate()
    );
    const iMod = Cesium.Math.mod(i +180.0, 360.0) - 180.0;
    const position = Cesium.Cartesian3.fromDegrees(
      iMod,
      lat,
      alt
    );
    property.addSample(time, position);
    //console.log(property.getValue(time));
  }
  return property;
}


// configure satellite entity
const modelURI =
  "../SampleData/models/CesiumBalloon/CesiumBalloon.glb";
const entity = viewer.entities.add({
  availability: new Cesium.TimeIntervalCollection([
    new Cesium.TimeInterval({
      start: start,
      stop: stop,
    }),
  ]),
  position: computeFlight(longitude, latitude, altitude), //Cesium.Cartesian3.fromDegrees(longitude, latitude, altitude),
  model: {
    uri: modelURI,
    minimumPixelSize: 64,
  },
});

entity.position.setInterpolationOptions({
  interpolationDegree: 2,
  interpolationAlgorithm: Cesium.HermitePolynomialApproximation,
});

// configure camera
// initialize camera position, set orientation and intrinsic parameters.
const camera = viewer.camera;
camera.position = new Cesium.Cartesian3(0.25 , 0.0 , 0.0);
camera.direction = new Cesium.Cartesian3(1.0, 0.0, -1.0);
camera.up = new Cesium.Cartesian3(0.0, 1.0, 0.0);

const frustum = new Cesium.PerspectiveFrustum({
    fov : Cesium.Math.PI_OVER_THREE, //The angle of the field of view (FOV), in radians.
    aspectRatio : 16/9,
    near : 1.0,
    //far : 1000.0
});

camera.frustum = frustum.clone();

// configure an event interrupt to adjust camera's position
//postUpdate: Gets the event that will be raised immediately after the scene is updated and before the scene is rendered. Subscribers to the event receive the Scene instance as the first parameter and the current time as the second parameter.
viewer.scene.postUpdate.addEventListener(function (scene, time) {
  const position = entity.position.getValue(time);
  if (!Cesium.defined(position)) {
    return;
  }

  let transform;
  if (!Cesium.defined(entity.orientation)) {
    transform = Cesium.Transforms.eastNorthUpToFixedFrame(position);
  } else {
    const orientation = entity.orientation.getValue(time);
    if (!Cesium.defined(orientation)) {
      return;
    }

    transform = Cesium.Matrix4.fromRotationTranslation(
      Cesium.Matrix3.fromQuaternion(orientation),
      position
    );
  }

  // Save camera state
  const offset = Cesium.Cartesian3.clone(camera.position);
  const direction = Cesium.Cartesian3.clone(camera.direction);
  const up = Cesium.Cartesian3.clone(camera.up);

  // Set camera to be in model's reference frame.
  camera.lookAtTransform(transform);

  // Reset the camera state to the saved state so it appears fixed in the model's frame.
  Cesium.Cartesian3.clone(offset, camera.position);
  Cesium.Cartesian3.clone(direction, camera.direction);
  Cesium.Cartesian3.clone(up, camera.up);
  //Cesium.Cartesian3.cross(direction, up, camera.right);
  

});

// #######################################

// configure printscreen

// define callback functions
var prepareScreenshot = function(){
    var canvas = scene.canvas;    
    viewer.resolutionScale = targetResolutionScale;
    scene.preRender.removeEventListener(prepareScreenshot);
    // take snapshot after defined timeout to allow scene update (ie. loading data)
    setTimeout(function(){
        scene.postRender.addEventListener(takeScreenshot);
    }, timeout);
};

var takeScreenshot = function(){    
    scene.postRender.removeEventListener(takeScreenshot);
    var canvas = scene.canvas;
    canvas.toBlob(function(blob){
        var url = URL.createObjectURL(blob);
        downloadURI(url, "snapshot-" + targetResolutionScale.toString() + "x.jpeg");
        // reset resolutionScale
        viewer.resolutionScale = 1.0;
    });
};


function downloadURI(uri, name) {
    var link = document.createElement("a");
    link.download = name;
    link.href = uri;
    // mimic click on "download button"
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

//######################################
//console.log('Hello Cesium');

//######################################

/* printscreen
  viewer.render();
  var image = viewer.canvas.toDataURL();
  var aLink = document.createElement("a");
  aLink.download = "map.png";
  aLink.href = image;
  aLink.click();
*/

//######################################

/* printscreen
// configure settings
var targetResolutionScale = 1.0; // for screenshots with higher resolution set to 2.0 or even 3.0
var timeout = 10000; // in ms
  
var scene = viewer.scene;
if (!scene) {
    console.error("No scene");
}

// define callback functions
var prepareScreenshot = function(){
    var canvas = scene.canvas;    
    viewer.resolutionScale = targetResolutionScale;
    scene.preRender.removeEventListener(prepareScreenshot);
    // take snapshot after defined timeout to allow scene update (ie. loading data)
    setTimeout(function(){
        scene.postRender.addEventListener(takeScreenshot);
    }, timeout);
}

var takeScreenshot = function(){    
    scene.postRender.removeEventListener(takeScreenshot);
    var canvas = scene.canvas;
    canvas.toBlob(function(blob){
        var url = URL.createObjectURL(blob);
        downloadURI(url, "snapshot-" + targetResolutionScale.toString() + "x.jpeg");
        // reset resolutionScale
        viewer.resolutionScale = 1.0;
    });
}

scene.preRender.addEventListener(prepareScreenshot);

function downloadURI(uri, name) {
    var link = document.createElement("a");
    link.download = name;
    link.href = uri;
    // mimic click on "download button"
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    delete link;
    
*/
}
if (typeof Cesium !== 'undefined') {
    window.startupCalled = true;
    window.startup(Cesium).catch((error) => {
      "use strict";
      console.error(error);
    });
}