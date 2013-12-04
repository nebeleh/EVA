var renderer, camera, scence, controls, stats, axisHelper, sceneCSS, rendererCSS, cssObject, frames, planeMesh;
var VIEW_ANGLE = 50, NEAR = 0.1, FAR = 1000, ORTHONEAR = -100, ORTHOFAR = 1000, ORTHOSCALE = 100;
var particleSystem, totalParticles, particleMaterial, currFrame;
var datapoints, mapping, normalizingScale = 10, dimensions, byteSchema, byteOffsets, metaData;
var X, Y, Z, R;

function readData(row, col) {
  if (byteSchema[col] == 8)
    return datapoints.getFloat64(row*byteOffsets[byteOffsets.length-1]+byteOffsets[col], true);
  else
    return datapoints.getInt16(row*byteOffsets[byteOffsets.length-1]+byteOffsets[col], true);
}

function writeData(row, col, value) {
  if (byteSchema[col] == 8)
    datapoints.setFloat64(row*byteOffsets[byteOffsets.length-1]+byteOffsets[col], value, true);
  else
    datapoints.setInt16(row*byteOffsets[byteOffsets.length-1]+byteOffsets[col], value, true);
}

function aggregator(row, col, rangeMin, rangeMax) {
  if (col == 1 || col == 2)
    return readData(row, col);

  if (col >= 4 && col <= 43) // divide by total number of jobs
    return (readData(row, 3) == 0) ? rangeMin : (readData(row, col) / readData(row, 3) * (rangeMax - rangeMin) + rangeMin);

  if (metaData.minOfColumn[col] == metaData.maxOfColumn[col])
    return rangeMin;

  return (readData(row, col) - metaData.minOfColumn[col]) / (metaData.maxOfColumn[col] - metaData.minOfColumn[col]) * (rangeMax - rangeMin) + rangeMin;
}

function init($container, $stat, rawdata, MetaData) {
  // perfome preprocessing on rawdata
  metaData = MetaData;
  dimensions = metaData.BINcolumns;
  byteSchema = metaData.byteSchema;
  
  byteOffsets = [];
  var offset = 0;
  for (var i = 0; i < byteSchema.length; i++) {
    byteOffsets.push(offset);
    offset += byteSchema[i];
  }
  byteOffsets.push(offset);

  totalParticles = metaData.totalRows;
  datapoints = new DataView(rawdata);

  // TODO: use mercator translation instead of this hand tailored code
  var mercatorScaleLat = 1.325;
  var mercatorOffsetLat = .075;
  var mercatorScaleLong = 0.997;
  var mercatorOffsetLong = 0.007;

  // convert lat, long to x, y
  for (var i = 0; i < totalParticles; i++) {
    for (var j = dimensions-1; j >= 0; j--) {
      dummy = readData(i, j);
      if (j == 1) {
        writeData(i, j, mercatorOffsetLat + normalizingScale * (dummy - metaData.minOfColumn[j]) / (metaData.maxOfColumn[2] - metaData.minOfColumn[2]) * mercatorScaleLat);
      } else if (j == 2) {
        writeData(i, j, mercatorOffsetLong + normalizingScale * (dummy - metaData.minOfColumn[j]) / (metaData.maxOfColumn[j] - metaData.minOfColumn[j]) * mercatorScaleLong);
      } 
    }
  }
  
  // create scene
  scene = new THREE.Scene();

  var mapWidth = 100;
  var mapHeight = 60;
  var mapResolution = 85;

  // adding Google Maps iframe layer to visualization
  var planeMaterial = new THREE.MeshBasicMaterial();
  planeMaterial.color.set('black');
  planeMaterial.opacity = 0;
  planeMaterial.side = THREE.DoubleSide;
  planeMaterial.blending = THREE.NoBlending;
  planeMesh = new THREE.Mesh(new THREE.PlaneGeometry(mapWidth, mapHeight), planeMaterial);
  planeMesh.translateX(mapWidth/2);
  planeMesh.translateY(mapHeight/2);

  var element = document.createElement('iframe');
  var mapsURL = 'https://maps.google.com/maps?ll=41.0088559,-77.6069819&z=11&output=embed';
  element.src = mapsURL;
  element.style.width = mapResolution * mapWidth + 'px';
  element.style.height = mapResolution * mapHeight + 'px';
  
  cssObject = new THREE.CSS3DObject(element);
  cssObject.position = planeMesh.position;
  cssObject.position.z -= 0.01;
  cssObject.rotation = planeMesh.rotation;
  cssObject.scale.multiplyScalar(1/mapResolution);
  
  sceneCSS = new THREE.Scene();
  
  rendererCSS = new THREE.CSS3DRenderer();
  rendererCSS.setSize(window.innerWidth, window.innerHeight);
  rendererCSS.domElement.style.position = 'absolute';
  rendererCSS.domElement.style.top = 0;
  rendererCSS.domElement.style.margin = 0;
  rendererCSS.domElement.style.padding = 0;
  $container.append(rendererCSS.domElement);

  // stats
  stats = new Stats();
  $stat.append(stats.domElement);

  // renderer
  if (window.WebGLRenderingContext)
    renderer = new THREE.WebGLRenderer({antialias: true});
  else
    renderer = new THREE.CanvasRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0xffffff, 1);
  renderer.domElement.style.position = 'absolute';
  renderer.domElement.style.top = '0px';
  renderer.domElement.style.left = '0px';
  renderer.domElement.style.zIndex = 0;
  $container.append(renderer.domElement);

  // camera
  setCameraType("perspective");
  scene.add(camera);

  // lights
  var hemiLight = new THREE.HemisphereLight( 0xffffff, 0xffffff, 0.6 );
  hemiLight.color.setHSL( 0.6, 1, 0.6 );
  hemiLight.groundColor.setHSL( 0.095, 1, 0.75 );
  hemiLight.position.set( 0, 500, 0 );
  scene.add( hemiLight );

  var dirLight = new THREE.DirectionalLight( 0xffffff, 1 );
  dirLight.color.setHSL( 0.1, 1, 0.95 );
  dirLight.position.set( -1, 1.75, 1 );
  dirLight.position.multiplyScalar( 50 );
  scene.add( dirLight );
  dirLight.castShadow = true;
  dirLight.shadowMapWidth = 2048;
  dirLight.shadowMapHeight = 2048;

  var d = 50;
  dirLight.shadowCameraLeft = -d;
  dirLight.shadowCameraRight = d;
  dirLight.shadowCameraTop = d;
  dirLight.shadowCameraBottom = -d;
  dirLight.shadowCameraFar = 3500;
  dirLight.shadowBias = -0.0001;
  dirLight.shadowDarkness = 0.35;

  var dirLight2 = dirLight.clone();
  dirLight2.position.set( 1, -1.75, -1 );
  scene.add( dirLight2 );

  // add axisHelper
  setAxisHelper(true);

  // start animating
  updateInfo();
  animate();

  //setGeoLayer(true);
  //setGeoLayer(false);
}

function initialDraw(Mapping, uX, uY, uZ, uR)
{
  mapping = Mapping;
  X = uX;
  Y = uY;
  Z = uZ;
  R = uR;
  currFrame = 0;

  // creating the basic structure of frames
  frames = {};
  if (mapping.t == -1 || metaData.maxOfColumn[mapping.t] == metaData.minOfColumn[mapping.t])
    frames.frameno = 1;
  else
    frames.frameno = 10; // TODO: receive number of buckets from user

  frames.frame = [];
  for (var f = 0; f < frames.frameno; f++) {
    frames.frame.push({});
    frames.frame[f].particles = 0;
    frames.frame[f].minValue = (frames.frameno > 1) ? Number.MAX_VALUE : NaN;
    frames.frame[f].maxValue = (frames.frameno > 1) ? -Number.MAX_VALUE : NaN;
  }

  // finding number of particles in each frame
  var timeframeSize = (metaData.maxOfColumn[mapping.t] - metaData.minOfColumn[mapping.t]) / frames.frameno, frameIndex;
  if (frames.frameno == 1)
    frames.frame[0].particles = totalParticles;
  else {
    for (var p = 0; p < totalParticles; p++) {
      frameIndex = Math.floor((readData(p, mapping.t) - metaData.minOfColumn[mapping.t]) / timeframeSize);
      if (frameIndex == frames.frameno) frameIndex--;
      frames.frame[frameIndex].particles++;
    }
  }

  // finding x, y, z and color values for particles in each frame
  for (var f = 0; f < frames.frameno; f++) {
    frames.frame[f].geometry = new THREE.BufferGeometry();
    frames.frame[f].geometry.addAttribute('position', Float32Array, frames.frame[f].particles, 3);
    frames.frame[f].geometry.addAttribute('color', Float32Array, frames.frame[f].particles, 3);

    var positions = frames.frame[f].geometry.attributes.position.array;
    var colors = frames.frame[f].geometry.attributes.color.array;

    var tempColor, dummy;
    for (var i = 0, j = -1; i < totalParticles; i++) {
 
      if (mapping.x == -1 && mapping.y == -1 && mapping.z == -1) {
        positions[j*3] = NaN;
        continue;
      }

      // proceed only if this particle belongs to this frame
      if (frames.frameno > 1) {
        dummy = readData(i, mapping.t);
        frameIndex = Math.floor((dummy - metaData.minOfColumn[mapping.t]) / timeframeSize);
        if (frameIndex == frames.frameno) frameIndex--;
        if (frameIndex != f) continue;
        frames.frame[f].minValue = Math.min(frames.frame[f].minValue, dummy);
        frames.frame[f].maxValue = Math.max(frames.frame[f].maxValue, dummy);
      } 
      
      j++;

      // set positions
      positions[j*3]   = (mapping.x != -1) ? aggregator(i, mapping.x, 0, normalizingScale) : 0;
      positions[j*3+1] = (mapping.y != -1) ? aggregator(i, mapping.y, 0, normalizingScale) : 0;
      positions[j*3+2] = (mapping.z != -1) ? aggregator(i, mapping.z, 0, normalizingScale) : 0;

      // set colors
      if (mapping.c == -1) continue;
      tempColor = new THREE.Color(0x000000);
      dummy = aggregator(i, mapping.c, 0, 1);
      if (isNaN(dummy)) {
        positions[j*3] = NaN;
        continue;
      }
      tempColor.setHSL(dummy * .8 + .2, 1., .5);
      colors[j*3]   = tempColor.r;
      colors[j*3+1] = tempColor.g;
      colors[j*3+2] = tempColor.b;
    }
    frames.frame[f].geometry.computeBoundingSphere();
  }
  particleMaterial = new THREE.ParticleSystemMaterial({/*blending: THREE.AdditiveBlending,*/ transparent: true, size: R, vertexColors: true, opacity: 0.5});
  // TODO: material.alphaTest = 0.5 --> apparently this solves the problem of z-index for sprites
  updateParticleSystem(currFrame);
  updateInfo();
}

function updateParticleSystem(frameIndex) {
  scene.remove(particleSystem);
  particleSystem = new THREE.ParticleSystem(frames.frame[frameIndex].geometry, particleMaterial);
  particleSystem.scale.x = X / normalizingScale;
  particleSystem.scale.y = Y / normalizingScale;
  particleSystem.scale.z = Z / normalizingScale;
  particleSystem.material.size = R;
  scene.add(particleSystem);
}

function updateDraw(uX, uY, uZ, uR)
{
  X = uX;
  Y = uY;
  Z = uZ;
  R = uR;
  if (particleSystem) {
    particleSystem.scale.x = X / normalizingScale;
    particleSystem.scale.y = Y / normalizingScale;
    particleSystem.scale.z = Z / normalizingScale;
    particleSystem.material.size = R;
  }
}

function updateInfo() {
  $('#eventsindicator').text(particleSystem ? particleSystem.geometry.attributes.position.array.length/3 : 0);
  $('#Tindicator').text((frames && frames.frameno > 1 && !(mapping.x == -1 && mapping.y == -1 && mapping.z == -1)) ? (frames.frame[currFrame].minValue.toFixed(0) + ' - ' + frames.frame[currFrame].maxValue.toFixed(0)) : 'none');
}

function calcWindowResize(rend, camera)
{
  var callback = function(){
    var WIDTH = window.innerWidth, HEIGHT = window.innerHeight;
    rend.setSize(WIDTH, HEIGHT);
    if (camera instanceof THREE.PerspectiveCamera)
    {
      camera.aspect = WIDTH/HEIGHT;
    } else {
      camera.left = - WIDTH/ORTHOSCALE;
      camera.right = WIDTH/ORTHOSCALE;
      camera.top = HEIGHT/ORTHOSCALE;
      camera.bottom = - HEIGHT/ORTHOSCALE;
    }
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize',callback,false);
  return {
    stop : function(){
      window.removeEventListener('resize',callback);
    }
  };
}

var lastTime = -1, currTime;
function updateFrame() {
  if (lastTime == -1) {
    lastTime = Date.now();
    currFrame = 0;
  }
  currTime = Date.now();

  if (currTime >= lastTime + (currFrame == frames.frameno-1 ? 1500 : 500)) {
    lastTime = currTime;
    currFrame = (currFrame + 1 ) % frames.frameno;
    updateParticleSystem(currFrame);
  }
}

function animate()
{
  requestAnimationFrame(animate);
  if (frames && frames.frameno > 1) {
    updateFrame();
    updateInfo();
  }
  renderer.render(scene, camera);
  rendererCSS.render(sceneCSS, camera);
  update();
}

function update()
{
  controls.update();
  stats.update();
}

function setCameraType(type)
{
  var WIDTH = window.innerWidth, HEIGHT = window.innerHeight;
  var x = -10, y = -10, z = 10;

  if (camera)
  {
    x = camera.position.x;
    y = camera.position.y;
    z = camera.position.z;
  }

  if (type === "perspective")
  {
    camera = new THREE.PerspectiveCamera(VIEW_ANGLE, WIDTH/HEIGHT, NEAR, FAR);
  }
  else
  {
    camera = new THREE.OrthographicCamera(-WIDTH/ORTHOSCALE, WIDTH/ORTHOSCALE, HEIGHT/ORTHOSCALE, -HEIGHT/ORTHOSCALE, ORTHONEAR, ORTHOFAR);
  }

  camera.position.set(x, y, z);
  camera.lookAt(scene.position);
  if (x == 0 && y == 0)
    camera.up = new THREE.Vector3(0, 1, 0);
  else
    camera.up = new THREE.Vector3(0, 0, 1);

  // events
  calcWindowResize(renderer, camera);
  calcWindowResize(rendererCSS, camera);

  // controls
  controls = new THREE.TrackballControls(camera, renderer.domElement);
  controls.noZoom = false;
  controls.noPan = false;
  controls.staticMoving = false;
  controls.dynamicDampingFactor = 0.3;
  controls.keys = [65, 83, 68];
}

function setCameraZ()
{
  camera.position.set(0, 0, 10);
  camera.lookAt(scene.position);
  camera.up = new THREE.Vector3(0, 1, 0);
}

function setCameraY()
{
  camera.position.set(0, 10, 0);
  camera.lookAt(scene.position);
  camera.up = new THREE.Vector3(0, 0, 1);
}

function setCameraX()
{
  camera.position.set(10, 0, 0);
  camera.lookAt(scene.position);
  camera.up = new THREE.Vector3(0, 0, 1);
}

function setAxisHelper(s)
{
  if(s) {
    axisHelper = new THREE.AxisHelper();
    scene.add(axisHelper);
  } else {
    scene.remove(axisHelper);
  }
}

var gridXY, gridXZ, gridYZ;

function setGridXY(s)
{
  if(s) {
    gridXY = new THREE.GridHelper(10, 1);
    gridXY.position.set(0, 0, 0);
    gridXY.rotation.x = Math.PI/2;
    gridXY.setColors( new THREE.Color(0xaaaa00), new THREE.Color(0xaaaa00) );
    scene.add(gridXY);
  } else {
    scene.remove(gridXY);
  }
}

function setGridXZ(s)
{
  if(s) {
    gridXZ = new THREE.GridHelper(10, 1);
    gridXZ.setColors( new THREE.Color(0xaa00aa), new THREE.Color(0xaa00aa) );
    gridXZ.position.set(0, 0, 0);
    scene.add(gridXZ);
  } else {
    scene.remove(gridXZ);
  }
}

function setGridYZ(s)
{
  if(s) {
    gridYZ = new THREE.GridHelper(10, 1);
    gridYZ.position.set(0, 0, 0);
    gridYZ.rotation.z = Math.PI/2;
    gridYZ.setColors( new THREE.Color(0x00aaaa), new THREE.Color(0x00aaaa) );
    scene.add(gridYZ);
  } else {
    scene.remove(gridYZ);
  }
}

function setGeoLayer(s) {
  if (s) {
    sceneCSS.add(cssObject);
    scene.add(planeMesh);
  } else {
    sceneCSS.remove(cssObject);
    scene.remove(planeMesh);
  }
}
