var renderer, camera, cameraType, scene, controls, stats, axisHelper, sceneCSS, rendererCSS, cssObject, frames, planeMesh;
var VIEW_ANGLE = 50, NEAR = 1, FAR = 100000, ORTHONEAR = -100, ORTHOFAR = 1000, ORTHOSCALE = 100;
var particleSystem, totalParticles, particleMaterial, currFrame = 0, colorPalette;
var datapoints, mapping, normalizingScale = 10, dimensions, byteSchema, byteOffsets, metaData;
var X, Y, Z, R;
var lastTime = -1, currTime, playMode = true;
var mapScaleLat, mapScalelng;
var snapshotList;

var pi_180 = Math.PI / 180.0;
var pi_4 = Math.PI * 4;

// convert lat and long to pixels
function latToPixel(lat) {
  var sinLat = Math.sin(lat * pi_180);
  return (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (pi_4)) * 256;
}

function lngToPixel(lng) {
  return ((lng + 180) / 360) * 256;
}

// read and write to raw data array buffer
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

// interpolate the color of each data point using the selected color palette
var minC = -1;
var midC = 0;
var maxC = 1;

function palette2color(x, i) {
  if (x >= maxC)
    return colorPalette[mapping.p][colorPalette[mapping.p].length-1][i];

  if (x <= minC)
    return colorPalette[mapping.p][0][i];

  if (x >= midC) {
    x -= midC;
    var hp = (maxC - midC) / (Math.ceil(colorPalette[mapping.p].length / 2) - 1);
    var a = Math.floor(x / hp);
    var d = x - a * hp;
    a += Math.floor(colorPalette[mapping.p].length / 2);
    return (d * colorPalette[mapping.p][a + 1][i] + (hp - d) * colorPalette[mapping.p][a][i]) / hp;
  }

  x -= minC;
  var hn = (midC - minC) / (Math.floor(colorPalette[mapping.p].length / 2));
  var a = Math.floor(x / hn);
  var d = x - a * hn;
  return (d * colorPalette[mapping.p][a + 1][i] + (hn - d) * colorPalette[mapping.p][a][i]) / hn;
}

// mapping function from data objects to visual objects
function aggregator(row, col, rangeMin, rangeMax) {
  // mapping function for forex set
  if (metaData.dataClass == "forex") {
    if (col > 0)
      return (readData(row, col) - (metaData.maxOfColumn[col] + metaData.minOfColumn[col]) / 2) * 500;
    return (readData(row, col) - metaData.minOfColumn[col]) / (metaData.maxOfColumn[col] - metaData.minOfColumn[col]) * 20 - 10;
  }

  // mapping function for ratings set
  if (metaData.dataClass == "ratings") {

  }


  // mapping function for tweeter set
  if (metaData.dataClass == "tweets") {
    return readData(row, col);
  }

  // mapping function for LEHD set
  if (metaData.dataClass == "rac" || metaData.dataClass == "wac") {
    // don't change lat/long
    if (col == 1 || col == 2)
      return readData(row, col);

    // for jobs categories, divide number of jobs by total number of jobs
    if (col >= 4 && col <= 43)
      return (readData(row, 3) == 0) ? rangeMin : (readData(row, col) / readData(row, 3) * (rangeMax - rangeMin) + rangeMin);
  }

  // general mapping functions
  // if max and min are equal, return minimum desired range
  if (metaData.minOfColumn[col] == metaData.maxOfColumn[col])
    return rangeMin;

  // if none above, normalize within the desired range
  return (readData(row, col) - metaData.minOfColumn[col]) / (metaData.maxOfColumn[col] - metaData.minOfColumn[col]) * (rangeMax - rangeMin) + rangeMin;
}

function init($container, $stat, rawdata, MetaData, cPalette) {
  // perfome preprocessing on rawdata
  colorPalette = cPalette;
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

  // convert lat, long to x, y
  var mapWidth, mapHeight;
  var zoomLevel, mapResolution;
  if (metaData.dataClass == 'tweets') {
    zoomLevel = 12;
    mapResolution = 0.01358 * (1 << zoomLevel);
  } else if (metaData.dataClass == "wac" || metaData.dataClass == "rac")  {
    zoomLevel = 9;
    mapResolution = 0.0414 * (1 << zoomLevel);
  }
  var latCenter, lngCenter;
  var dataLatMax = latToPixel(metaData.minOfColumn[1]),
  dataLatMin = latToPixel(metaData.maxOfColumn[1]),
  dataLngMax = lngToPixel(metaData.maxOfColumn[2]),
  dataLngMin = lngToPixel(metaData.minOfColumn[2]);
  var c = (dataLatMax - dataLatMin) / (dataLngMax - dataLngMin);
  if ((dataLatMax - dataLatMin) < (dataLngMax - dataLngMin)) {
    mapWidth = 100;
    mapHeight = 100 * c;
  } else {
    mapHeight = 100;
    mapWidth = 100 / c;
  }
  lngCenter = (metaData.minOfColumn[2] + metaData.maxOfColumn[2]) / 2;
  latCenter = (metaData.maxOfColumn[1] + metaData.minOfColumn[1]) / 2;

  if (metaData.dataClass == 'tweets') {
    latCenter += 0.004;
  } else {
    latCenter += 0.012;
  }

  mapScaleLng = mapWidth / normalizingScale;
  mapScaleLat = mapHeight / normalizingScale;

  if (metaData.dataClass == "tweets" || metaData.dataClass == "wac" || metaData.dataClass == "rac") {
    for (var j = 1; j <= 2; j++) {
      metaData.minOfColumn[j] = Number.MAX_VALUE;
      metaData.maxOfColumn[j] = -Number.MAX_VALUE;
      for (var i = 0; i < totalParticles; i++) {
        dummy = readData(i, j);
        if (j == 1) {
          writeData(i, j, mapScaleLat * (1 - (latToPixel(dummy) - dataLatMin) / (dataLatMax - dataLatMin)));
        } else if (j == 2) {
          writeData(i, j, mapScaleLng * (lngToPixel(dummy) - dataLngMin) / (dataLngMax - dataLngMin));
        }
        metaData.minOfColumn[j] = Math.min(metaData.minOfColumn[j], readData(i, j));
        metaData.maxOfColumn[j] = Math.max(metaData.maxOfColumn[j], readData(i, j));
      }
    }
  }

  if (metaData.dataClass == "tweets") {
    var m = metaData.minOfColumn[0];
    metaData.maxOfColumn[0] = -Number.MAX_VALUE;
    metaData.minOfColumn[0] = 0;
    for (var i = 0; i < totalParticles; i++) {
      // scaling time dimension for tweeter data
      dummy = readData(i, 0);
      writeData(i, 0, (dummy - m)/1000000);
      metaData.maxOfColumn[0] = Math.max(metaData.maxOfColumn[0], readData(i, 0));
    }
  }

  // giving the same scale to rating and shoping dates
  if (metaData.dataClass == "ratings") {
    metaData.maxOfColumn[4] = metaData.maxOfColumn[5] = Math.max(metaData.maxOfColumn[4], metaData.maxOfColumn[5]);
    metaData.minOfColumn[4] = metaData.minOfColumn[5] = Math.min(metaData.minOfColumn[4], metaData.minOfColumn[5]);
  }


  // adding Google Maps iframe layer to visualization
  var element = document.createElement('iframe');
  element.src = 'https://maps.google.com/maps?ll=' + latCenter + ',' + lngCenter + '&z=' + zoomLevel + '&output=embed';  
  element.style.width = mapResolution * mapWidth + 'px';
  element.style.height = mapResolution * mapHeight + 'px';

  cssObject = new THREE.CSS3DObject(element);
  cssObject.translateX(mapWidth/2);
  cssObject.translateY(mapHeight/2);
  cssObject.translateZ(-0.01);
  cssObject.scale.multiplyScalar(1/mapResolution);

  var planeMaterial = new THREE.MeshBasicMaterial({color: 0x000000, side: THREE.DoubleSide, blending: THREE.NoBlending, opacity: 0});
  planeMesh = new THREE.Mesh(new THREE.PlaneGeometry(mapWidth, mapHeight), planeMaterial);
  planeMesh.position.copy(cssObject.position);
  planeMesh.rotation.copy(cssObject.rotation);
  

  // TODO: make it automatic
  //cssObject.translateY(-1.05);
  //cssObject.translateX(-0.11);


  // stats
  if (!stats) {
    stats = new Stats();
    $stat.append(stats.domElement);
  }

  // renderer
  if (!rendererCSS) {
    rendererCSS = new THREE.CSS3DRenderer();
    rendererCSS.setSize(window.innerWidth, window.innerHeight);
    rendererCSS.domElement.style.position = 'absolute';
    rendererCSS.domElement.style.top = '0px';
    rendererCSS.domElement.style.left = '0px';
    rendererCSS.domElement.style.zIndex = 1;
    $container.append(rendererCSS.domElement);
  }

  if (!renderer) {
    renderer = new THREE.WebGLRenderer({alpha: true, antialias: true, preserveDrawingBuffer: true});
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0xffffff, 1);
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0px';
    renderer.domElement.style.left = '0px';
    renderer.domElement.style.zIndex = 1;
    $container.append(renderer.domElement);
  }

  // create scenes
  scene = new THREE.Scene();
  sceneCSS = new THREE.Scene();


  // camera
  cameraType = "perspective";
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
  setGridXY(false);
  setGridXZ(false);
  setGridYZ(false);
  setGeoLayer(false);

  // start animating
  updateInfo();
  animate();
}


function initialDraw(Mapping, uX, uY, uZ, uR)
{
  if (!scene) return;
  scene.remove(particleSystem);

  mapping = Mapping;
  X = uX;
  Y = uY;
  Z = uZ;
  R = uR;
  currFrame = 0;

  // creating the basic structure of frames
  frames = {};
  if (mapping.t == -1 || metaData.maxOfColumn[mapping.t] == metaData.minOfColumn[mapping.t]) {
    frames.frameno = 1;
  } else {
    if (metaData.dataClass == 'tweets' || metaData.dataClass == 'forex') {
      frames.frameno = 100;
    } else {
      frames.frameno = 10; // TODO: receive number of buckets from user
    }
  }

  setTimeController(true);

  frames.frame = [];
  for (var f = 0; f < frames.frameno; f++) {
    frames.frame.push({});
    frames.frame[f].particles = 0;
    frames.frame[f].minValue = (frames.frameno > 1) ? Number.MAX_VALUE : NaN;
    frames.frame[f].maxValue = (frames.frameno > 1) ? -Number.MAX_VALUE : NaN;
  }

  if (!(mapping.x == -1 && mapping.y == -1 && mapping.z == -1)) {

    // finding number of particles in each frame
    var timeframeSize, frameIndex;
    if (frames.frameno == 1)
      frames.frame[0].particles = totalParticles;
    else {
      timeframeSize = (metaData.maxOfColumn[mapping.t] - metaData.minOfColumn[mapping.t]) / frames.frameno;
      for (var p = 0; p < totalParticles; p++) {
        frameIndex = Math.floor((readData(p, mapping.t) - metaData.minOfColumn[mapping.t]) / timeframeSize);
        if (isNaN(frameIndex)) continue;
        if (frameIndex == frames.frameno) frameIndex--;
        frames.frame[frameIndex].particles++;
      }
    }
    
    // finding x, y, z and color values for particles in each frame
    for (var f = 0; f < frames.frameno; f++) {
      frames.frame[f].geometry = new THREE.BufferGeometry();
      frames.frame[f].positions = new Float32Array(frames.frame[f].particles * 3);
      frames.frame[f].colors = new Float32Array(frames.frame[f].particles * 3);

      frames.frame[f].j = -1;
    }

    var tempColor, dummy, j;
    for (var i = 0, j = -1; i < totalParticles; i++) {

      frameIndex = 0;
      if (frames.frameno > 1) {
        dummy = readData(i, mapping.t);
        frameIndex = Math.floor((dummy - metaData.minOfColumn[mapping.t]) / timeframeSize);
        if (isNaN(frameIndex)) continue;
        if (frameIndex == frames.frameno) frameIndex--;
        frames.frame[frameIndex].minValue = Math.min(frames.frame[frameIndex].minValue, dummy);
        frames.frame[frameIndex].maxValue = Math.max(frames.frame[frameIndex].maxValue, dummy);
      } 

      frames.frame[frameIndex].j++;
      j = frames.frame[frameIndex].j;

      // set positions
      var positions = frames.frame[frameIndex].positions;
      positions[j*3]   = (mapping.x != -1) ? aggregator(i, mapping.x, 0, normalizingScale) : 0;
      positions[j*3+1] = (mapping.y != -1) ? aggregator(i, mapping.y, 0, normalizingScale) : 0;
      positions[j*3+2] = (mapping.z != -1) ? aggregator(i, mapping.z, 0, normalizingScale) : 0;

      // set colors
      if (mapping.c == -1) continue;
      dummy = aggregator(i, mapping.c, 0, 1);
      if (isNaN(dummy)) {
        positions[j*3] = NaN;
        continue;
      }
      
      var colors = frames.frame[frameIndex].colors;
      colors[j*3]   = palette2color(dummy, 0);
      colors[j*3+1] = palette2color(dummy, 1);
      colors[j*3+2] = palette2color(dummy, 2);
    }

    for (var f = 0; f < frames.frameno; f++) {
      frames.frame[f].geometry.addAttribute( 'position', new THREE.BufferAttribute(frames.frame[f].positions, 3));
      frames.frame[f].geometry.addAttribute( 'color', new THREE.BufferAttribute(frames.frame[f].colors, 3));
      frames.frame[f].geometry.computeBoundingBox();
    }

    particleMaterial = new THREE.PointCloudMaterial({transparent: true, size: R, vertexColors: true, opacity: 0.9});
    updateParticleSystem(currFrame);
  }
  lastTime = Date.now();
  updateInfo();
}

function updateParticleSystem(frameIndex) {
  scene.remove(particleSystem);
  particleSystem = new THREE.PointCloud(frames.frame[frameIndex].geometry, particleMaterial);
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
  //$('#eventsindicator').text((frames && frames.frame) ? frames.frame[currFrame].particles : '0');
  $('#Tindicator').text((frames && frames.frameno > 1 && !(mapping.x == -1 && mapping.y == -1 && mapping.z == -1) && frames.frame[currFrame].particles > 0) ? '(' + (frames.frame[currFrame].minValue.toFixed(0) + ' - ' + frames.frame[currFrame].maxValue.toFixed(0) + ')') : '');
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

function updateFrame() {
  if (lastTime == -1) {
    lastTime = Date.now();
    currFrame = 0;
  }
  currTime = Date.now();

  if (playMode == false)
    lastTime = currTime;

  if (frames && frames.frameno > 1) {
    $('#tSlider').slider('setValue', currFrame * ($('#tSlider').attr('data-slider-max') - 1) / (frames.frameno - 1) + 1);
    if (currTime >= lastTime + (currFrame == frames.frameno-1 ? 1500 : 500)) {
      lastTime = currTime;
      currFrame = (currFrame + 1 ) % frames.frameno;
      updateParticleSystem(currFrame);
    }
  }
  if (!frames || frames.frameno <= 1) {
    $('#tSlider').slider('setValue', $('#tSlider').attr('data-slider-min'));
  }
  //$('#frameNumber').text(frames ? (currFrame+1) + '/' + frames.frameno : 'none');
}


function updateCurrentFrame(t, T) {
  if (frames && frames.frameno > 1) {
    var oldCurrFrame = currFrame;
    currFrame = Math.round(t * (frames.frameno - 1) / (T - 1) + (1 - frames.frameno) / (T - 1));
    playMode = false;
    if ($('#timeController').attr('class') === 'glyphicon glyphicon-pause')
      $('#timeController').toggleClass('glyphicon-pause').toggleClass('glyphicon-play');
    if (oldCurrFrame != currFrame) {
      lastTime = currTime = Date.now();
      updateParticleSystem(currFrame);
    }
  }
}

function animate()
{
  requestAnimationFrame(animate);

  updateFrame();
  updateInfo();

  controls.update();
  stats.update();

  renderer.render(scene, camera);
  rendererCSS.render(sceneCSS, camera);
}

function setCameraType(type, Pos, Rot, Up, Side, Cnt)
{
  var WIDTH = window.innerWidth, HEIGHT = window.innerHeight;
  var x = -100, y = -100, z = 100;

  if (type === "perspective")
  {
    camera = new THREE.PerspectiveCamera(VIEW_ANGLE, WIDTH/HEIGHT, NEAR, FAR);
    cameraType = "perspective";
    controls = new THREE.TrackballControls(camera, renderer.domElement);
  }
  else
  {
    camera = new THREE.OrthographicCamera(-WIDTH/ORTHOSCALE, WIDTH/ORTHOSCALE, HEIGHT/ORTHOSCALE, -HEIGHT/ORTHOSCALE, ORTHONEAR, ORTHOFAR);
    cameraType = "orthographic";
    controls = new THREE.OrthographicTrackballControls (camera, renderer.domElement);
  }

  if (Pos !== undefined) {
    camera.position.set(Pos.x, Pos.y, Pos.z);
  } else {
    camera.position.set(x, y, z);  
  }
  

  // set camera rotation
  if (Rot !== undefined && Up !== undefined && Side !== undefined && Cnt !== undefined) {
    camera.rotation.set(Rot.x, Rot.y, Rot.z);
    camera.up.set(Up.x, Up.y, Up.z);
    if (type === "orthographic") {
      camera.left = Side.l;
      camera.top = Side.t;
      camera.bottom = Side.b;
      camera.right = Side.r;
    }
    controls.target.set(Cnt.x, Cnt.y, Cnt.z);
  } else {
    camera.lookAt(scene.position);
    if (x == 0 && y == 0)
      camera.up = new THREE.Vector3(0, 1, 0);
    else
      camera.up = new THREE.Vector3(0, 0, 1);    
  }

  // events
  calcWindowResize(renderer, camera);
  calcWindowResize(rendererCSS, camera);

  // controls
  controls.noZoom = false;
  controls.noPan = false;
  controls.staticMoving = false;
  controls.dynamicDampingFactor = 0.3;
}

function setTimeController(initialCall) {
  // has been called by initial draw?
  if (initialCall) {
    // there is no time dimension
    if (!frames || frames.frameno <= 1) {
      playMode = false;
      if ($('#timeController').attr('class') === 'glyphicon glyphicon-pause')
        $('#timeController').toggleClass('glyphicon-pause').toggleClass('glyphicon-play');
      return;
    }
    // there is time dimension
    playMode = true;
    if ($('#timeController').attr('class') === 'glyphicon glyphicon-play')
      $('#timeController').toggleClass('glyphicon-pause').toggleClass('glyphicon-play');
    return;
  }

  if (frames && frames.frameno > 1) {
    if ($('#timeController').attr('class') === 'glyphicon glyphicon-play') {
      playMode = true;
    } else {
      playMode = false;
    }
    $('#timeController').toggleClass('glyphicon-pause').toggleClass('glyphicon-play');
  }
}

function setCameraZ()
{
  var z = 100;
  if (camera)
    z = Math.sqrt(Math.pow(camera.position.x, 2) + Math.pow(camera.position.y, 2) + Math.pow(camera.position.z, 2)) ;
  setCameraType(cameraType);
  camera.position.set(0, 0, z);
  camera.up = new THREE.Vector3(0, 1, 0);
  camera.lookAt(scene.position);
}

function setCameraY()
{
  var y = 100;
  if (camera)
    y = Math.sqrt(Math.pow(camera.position.x, 2) + Math.pow(camera.position.y, 2) + Math.pow(camera.position.z, 2)) ;
  setCameraType(cameraType);
  camera.position.set(0, y, 0);
  camera.up = new THREE.Vector3(0, 0, 1);
  camera.lookAt(scene.position);
}

function setCameraX()
{
  var x = 100;
  if (camera)
    x = Math.sqrt(Math.pow(camera.position.x, 2) + Math.pow(camera.position.y, 2) + Math.pow(camera.position.z, 2)) ;
  setCameraType(cameraType);
  camera.position.set(x, 0, 0);
  camera.up = new THREE.Vector3(0, 0, 1);
  camera.lookAt(scene.position);
}

function setAxisHelper(s)
{
  if(s) {
    $("#checkboxAxisHelper").prop("checked", true);
    axisHelper = new THREE.AxisHelper();
    scene.add(axisHelper);
  } else {
    $("#checkboxAxisHelper").prop("checked", false);
    scene.remove(axisHelper);
  }
}

var gridXY, gridXZ, gridYZ;

function setGridXY(s)
{
  if(s) {
    $("#checkboxGridXY").prop("checked", true);
    gridXY = new THREE.GridHelper(100, 10);
    gridXY.position.set(0, 0, 0);
    gridXY.rotation.x = Math.PI/2;
    gridXY.setColors( new THREE.Color(0xaaaa00), new THREE.Color(0xaaaa00) );
    scene.add(gridXY);
  } else {
    $("#checkboxGridXY").prop("checked", false);
    scene.remove(gridXY);
  }
}

function setGridXZ(s)
{
  if(s) {
    $("#checkboxGridXZ").prop("checked", true);
    gridXZ = new THREE.GridHelper(100, 10);
    gridXZ.setColors( new THREE.Color(0xaa00aa), new THREE.Color(0xaa00aa) );
    gridXZ.position.set(0, 0, 0);
    scene.add(gridXZ);
  } else {
    $("#checkboxGridXZ").prop("checked", false);
    scene.remove(gridXZ);
  }
}

function setGridYZ(s)
{
  if(s) {
    $("#checkboxGridYZ").prop("checked", true);
    gridYZ = new THREE.GridHelper(100, 10);
    gridYZ.position.set(0, 0, 0);
    gridYZ.rotation.z = Math.PI/2;
    gridYZ.setColors( new THREE.Color(0x00aaaa), new THREE.Color(0x00aaaa) );
    scene.add(gridYZ);
  } else {
    $("#checkboxGridYZ").prop("checked", false);
    scene.remove(gridYZ);
  }
}

function setGeoLayer(s) {
  if (s) {
    $("#checkboxGeoLayer").prop("checked", true);
    sceneCSS.add(cssObject);
    scene.add(planeMesh);
  } else {
    $("#checkboxGeoLayer").prop("checked", false);
    sceneCSS.remove(cssObject);
    scene.remove(planeMesh);
  }
}

function setPaletteRangesVIS(l, m, h) {
  maxC = parseFloat(h);
  midC = parseFloat(m);
  minC = parseFloat(l);
}

function takeSnapshot() {
  var d = new Date();

  var status = {};
  status.timeStamp = d.getTime();

  status.datasetIndex = mapping.d;
  status.dimensionXIndex = mapping.x;
  status.dimensionYIndex = mapping.y;
  status.dimensionZIndex = mapping.z;
  status.dimensionCIndex = mapping.c;
  status.dimensionTIndex = mapping.t;

  status.sliderX = $('#xSlider').data('slider').getValue();
  status.sliderY = $('#ySlider').data('slider').getValue();
  status.sliderZ = $('#zSlider').data('slider').getValue();
  status.sliderR = $('#rSlider').data('slider').getValue();

  status.scaleX = X;
  status.scaleY = Y;
  status.scaleZ = Z;
  status.scaleR = R;

  status.paletteIndex = mapping.p;
  status.maxColor = maxC;
  status.midColor = midC;
  status.minColor = minC;

  status.axisHelper = $("#checkboxAxisHelper").is(':checked');
  status.xyHelper = $("#checkboxGridXY").is(':checked');
  status.xzHelper = $("#checkboxGridXZ").is(':checked');
  status.yzHelper = $("#checkboxGridYZ").is(':checked');
  status.geoHelper = $("#checkboxGeoLayer").is(':checked');

  status.cameraType = cameraType;
  status.cameraPosition = {x: camera.position.x, y: camera.position.y, z: camera.position.z};
  status.cameraRotation = {x: camera.rotation.x, y: camera.rotation.y, z: camera.rotation.z};
  status.cameraUp = {x: camera.up.x, y: camera.up.y, z: camera.up.z};
  status.cameraSide = {l: camera.left, r: camera.right, t: camera.top, b: camera.bottom}; // for saving zoom in ortho camera
  status.control = {x: controls.target.x, y: controls.target.y, z: controls.target.z}; // for saving pan movements

  status.currentFrame = currFrame;

  return status;
}

function logStatus() {

  $.ajax({
    url: '/logger', 
    type: 'POST', 
    contentType: 'application/json', 
    data: JSON.stringify(takeSnapshot())}
    ); 
}

function saveHistory() {
  if (mapping.d === undefined || mapping.d == -1) return;

  snapshotList = snapshotList || [];
  snapshotList.push(takeSnapshot());

  var currentHistory = $('#historyList').html();
  currentHistory = '<img style="border:1px solid black;" width="170" height="80" id="snapshotID' + (snapshotList.length-1) + '" onclick="loadHistory(' + (snapshotList.length-1) + ');"><hr />' + currentHistory;
  $('#historyList').html(currentHistory);

  $('#snapshotID' + (snapshotList.length-1)).attr('src', renderer.domElement.toDataURL());
}

function loadHistory(i) {
  var status = snapshotList[i];

  // check for data dimension consistency
  if (status.datasetIndex != mapping.d) {
    console.log("error - saved dataset is different than loaded one");
    return;
  }

  // redraw the picture based on saved parameters
  var Mapping = mapping;
  Mapping.x = status.dimensionXIndex;
  Mapping.y = status.dimensionYIndex;
  Mapping.z = status.dimensionZIndex;
  Mapping.c = status.dimensionCIndex;
  Mapping.t = status.dimensionTIndex;

  Mapping.p = status.paletteIndex;
  maxC = status.maxColor;
  midC = status.midColor;
  minC = status.minColor;
  
  initialDraw(Mapping, status.scaleX, status.scaleY, status.scaleZ, status.scaleR);
  
  currFrame = status.currentFrame;
  playMode = false;
  if ($('#timeController').attr('class') === 'glyphicon glyphicon-pause') {
    $('#timeController').toggleClass('glyphicon-pause').toggleClass('glyphicon-play');
  }
  updateFrame();
  updateParticleSystem(currFrame);

  setAxisHelper(status.axisHelper);
  setGridXY(status.xyHelper);
  setGridXZ(status.xzHelper);
  setGridYZ(status.yzHelper);
  setGeoLayer(status.geoHelper);

  setCameraType(status.cameraType, status.cameraPosition, status.cameraRotation, status.cameraUp, status.cameraSide, status.control);

  // update UI based on saved parameters
  changeDimensionName('xDimensionDropdown', metaData.columnNames[status.dimensionXIndex]);
  changeDimensionName('yDimensionDropdown', metaData.columnNames[status.dimensionYIndex]);
  changeDimensionName('zDimensionDropdown', metaData.columnNames[status.dimensionZIndex]);
  changeDimensionName('cDimensionDropdown', metaData.columnNames[status.dimensionCIndex]);
  changeDimensionName('tDimensionDropdown', metaData.columnNames[status.dimensionTIndex]);

  changeCameraName(status.cameraType);

  $('#xSlider').data('slider').setValue(status.sliderX);
  $('#ySlider').data('slider').setValue(status.sliderY);
  $('#zSlider').data('slider').setValue(status.sliderZ);
  $('#rSlider').data('slider').setValue(status.sliderR);
  getSliderVals();

  $('#inputPaletteMax').val(status.maxColor);
  $('#inputPaletteMid').val(status.midColor);
  $('#inputPaletteMin').val(status.minColor);
  setPaletteLegend();
}