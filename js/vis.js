// used code from http://stemkoski.github.io/Three.js/Graphulus-Surface.html

var renderer, camera, scence, controls, stats, axisHelper;
var VIEW_ANGLE = 50, NEAR = 0.1, FAR = 1000, ORTHONEAR = -100, ORTHOFAR = 1000, ORTHOSCALE = 100;
var particleSystem, sprite;
var datapoints = [], minOfColumn, maxOfColumn, mapping, normalizingScale = 10;

function init($container, $stat, rawdata) {
  // perfome preprocessing on rawdata

  // gain some understanding on each dimension
  var isTime = Array.apply(null, new Array(rawdata[0].length)).map(Number.prototype.valueOf,0);
  minOfColumn = Array.apply(null, new Array(rawdata[0].length)).map(Number.prototype.valueOf,Number.MAX_VALUE);
  maxOfColumn = Array.apply(null, new Array(rawdata[0].length)).map(Number.prototype.valueOf,Number.MIN_VALUE);
  /*
   * unfortunately this automatic method doesn't work well. for now, i'll use a hard coded method.
   for (var dimension = 0; dimension < rawdata[0].length; dimension++) {
   if (!isNaN(Date.parse(rawdata[1][dimension]))) isTime[dimension] = 1;
   }*/
  //isTime[0] = 1;

  // parsing data points
  for (var i = 1; i < rawdata.length; i++) {
    var tempdata = [];
    for (var d = 0; d < rawdata[0].length; d++) {
      if (isTime[d]) { tempdata[d] = Date.parse(rawdata[i][d]); }
      else { tempdata[d] = parseFloat(rawdata[i][d]); }

      if (!isNaN(tempdata[d])) {
        minOfColumn[d] = Math.min(minOfColumn[d], tempdata[d]);
        maxOfColumn[d] = Math.max(maxOfColumn[d], tempdata[d]);
      }
    }
    datapoints.push(tempdata);
  }

  // normalizing values for better visualization
  for (var i = 0; i < datapoints.length; i++) {
    for (var d = 0; d < rawdata[0].length; d++) {
      datapoints[i][d] = normalizingScale * (datapoints[i][d] - minOfColumn[d]) / (maxOfColumn[d] - minOfColumn[d]);
    }
  }

  // loading sprite
  sprite = THREE.ImageUtils.loadTexture("js/circle.png");

  // scene
  scene = new THREE.Scene();

  // stats
  stats = new Stats();
  $stat.append(stats.domElement);

  // renderer
  if (window.WebGLRenderingContext)
    renderer = new THREE.WebGLRenderer();
  else
    renderer = new THREE.CanvasRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
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
}


function initialDraw(Mapping, X, Y, Z, R)
{
  mapping = Mapping;

  scene.remove(particleSystem)

  // for each datapoint, find its appropriate geometry and size in 3D space
  if (mapping.x != -1 || mapping.y != -1 || mapping.z != -1 || mapping.c != -1 || mapping.t != -1) {

    var particlesGeometry = new THREE.Geometry();
    var datapointColors = [];

    for (var i = 0; i < datapoints.length; i++) {
      var x = 0, y = 0, z = 0, t = 0;
      var tempColor = new THREE.Color(0x000000);
      
      // if one of assigned mappings has null data, remove it
      if (mapping.x != -1) {
        if (isNaN(datapoints[i][mapping.x])) continue;
        x = datapoints[i][mapping.x] * X / normalizingScale;
      }

      if (mapping.y != -1) {
        if (isNaN(datapoints[i][mapping.y])) continue;
        y = datapoints[i][mapping.y] * Y / normalizingScale;
      }

      if (mapping.z != -1) {
        if (isNaN(datapoints[i][mapping.z])) continue;
        z = datapoints[i][mapping.z] * Z / normalizingScale;
      }

      if (mapping.t != -1) {
        if (isNaN(datapoints[i][mapping.t])) continue;
        t = datapoints[i][mapping.t];
      }

      if (mapping.c != -1) {
        if (isNaN(datapoints[i][mapping.c])) continue;
        tempColor.setHSL(datapoints[i][mapping.c] / normalizingScale * 0.8 + 0.2, 1.0, 0.5);
      }

      particlesGeometry.vertices.push(new THREE.Vector3(x, y, z));
      datapointColors.push(tempColor);

      //dataMesh.scale.x = R / 0.05;
      //dataMesh.scale.y = R / 0.05;
      //dataMesh.scale.z = R / 0.05;
      //datapointsMesh.push(dataMesh);
      //datapointsIndex.push(i);
      //dataMesh.position.set(x, y, z);
      //scene.add(dataMesh);
    }
    
    particlesGeometry.colors = datapointColors;
    particleSystem = new THREE.ParticleSystem(particlesGeometry, new THREE.ParticleSystemMaterial({map: sprite, vertexColors: true, transparent: true, size: R / 0.05}));
    particleSystem.sortParticles = true;
    scene.add(particleSystem);
  }
  updateInfo();
}


function updateDraw(X, Y, Z, R)
{
  var x, y, z, r;
  for (var i = 0; i < datapointsMesh.length; i++) {
    if (mapping.x != -1) {
      x = datapoints[datapointsIndex[i]][mapping.x] * X / normalizingScale;
      if (x != datapointsMesh[i].position.x) {
        datapointsMesh[i].position.x = x;
        datapointsMesh[i].verticesNeedUpdate = true;
      }
    }
    if (mapping.y != -1) {
      y = datapoints[datapointsIndex[i]][mapping.y] * Y / normalizingScale;
      if (y != datapointsMesh[i].position.y) {
        datapointsMesh[i].position.y = y;
        datapointsMesh[i].verticesNeedUpdate = true;
      }
    }
    if (mapping.z != -1) {
      z = datapoints[datapointsIndex[i]][mapping.z] * Z / normalizingScale;
      if (z != datapointsMesh[i].position.z) {
        datapointsMesh[i].position.z = z;
        datapointsMesh[i].verticesNeedUpdate = true;
      }
    }
    if (R != datapointsMesh[i].radius) {
      datapointsMesh[i].scale.x = R / 0.05;
      datapointsMesh[i].scale.y = R / 0.05;
      datapointsMesh[i].scale.z = R / 0.05;
    }
  }
}

function updateInfo() {
  $('#eventsindicator').text(particleSystem ? particleSystem.geometry.vertices.length : 0);
}

function calcWindowResize(renderer, camera)
{
  var callback = function(){
    var WIDTH = window.innerWidth, HEIGHT = window.innerHeight;
    renderer.setSize(WIDTH, HEIGHT);
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

function animate()
{
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
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

  // controls
  controls = new THREE.TrackballControls(camera, renderer.domElement);
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
