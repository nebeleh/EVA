// used code from http://stemkoski.github.io/Three.js/Graphulus-Surface.html

var renderer, camera, scence, controls, stats, axisHelper;
var VIEW_ANGLE = 50, NEAR = 0.1, FAR = 1000, ORTHONEAR = -100, ORTHOFAR = 1000, ORTHOSCALE = 100;
var particleSystem, particles, geometry;
var datapoints, mapping, normalizingScale = 10, dimensions;

function init($container, $stat, rawdata, metaData) {
  // perfome preprocessing on rawdata
  dimensions = metaData.BINcolumns;

  particles = rawdata.byteLength / (8*dimensions);
  datapoints = new DataView(rawdata);
  
  // normalizations
  for (var i = 0; i < particles; i++) {
    for (var j = 0; j < dimensions; j++) {
      dummy = datapoints.getFloat64((i*dimensions+j)*8, true);
      // normalize
      if (metaData.maxOfColumn[j] > metaData.minOfColumn[j]) {
        datapoints.setFloat64((i*dimensions+j)*8, normalizingScale * (dummy - metaData.minOfColumn[j]) / (metaData.maxOfColumn[j] - metaData.minOfColumn[j]), true);
      } else { //center
        datapoints.setFloat64((i*dimensions+j)*8, 0, true);
      }
    }
  }
  
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
  scene.remove(particleSystem);
  
  geometry = new THREE.BufferGeometry();
  geometry.addAttribute('position', Float32Array, particles, 3);
  geometry.addAttribute('color', Float32Array, particles, 3);

  var positions = geometry.attributes.position.array;
  var colors = geometry.attributes.color.array;

  var tempColor, dummy;
  for (var i = 0; i < particles; i++) {
    // set positions
    positions[i*3]   = (mapping.x != -1) ? datapoints.getFloat64((i*dimensions+mapping.x)*8, true) * X / normalizingScale : 0;
    positions[i*3+1] = (mapping.y != -1) ? datapoints.getFloat64((i*dimensions+mapping.y)*8, true) * Y / normalizingScale : 0;
    positions[i*3+2] = (mapping.z != -1) ? datapoints.getFloat64((i*dimensions+mapping.z)*8, true) * Z / normalizingScale : 0;

    // set colors
    if (mapping.c == -1) continue;
    tempColor = new THREE.Color(0x000000);
    dummy = datapoints.getFloat64((i*dimensions+mapping.c)*8, true);
    if (isNaN(dummy)) {
      positions[i*3] = NaN;
      continue;
    }
    tempColor.setHSL(dummy / normalizingScale * .8 + .2, 1., .5);
    colors[i*3]   = tempColor.r;
    colors[i*3+1] = tempColor.g;
    colors[i*3+2] = tempColor.b;
  }
  
  geometry.computeBoundingSphere();
  var material = new THREE.ParticleSystemMaterial({/*blending: THREE.AdditiveBlending, transparent: true,*/ size: R / 0.5, vertexColors: true});
  particleSystem = new THREE.ParticleSystem(geometry, material);
  scene.add(particleSystem);
  
  updateInfo();
}


function updateDraw(X, Y, Z, R)
{
  var x, y, z;
  var positions = geometry.attributes.position.array;

  for(var i = 0; i < particles; i++) {
    if (mapping.x != -1 && !isNaN(positions[i*3])) positions[i*3] = datapoints.getFloat64((i*dimensions+mapping.x)*8, true) * X / normalizingScale;
    if (mapping.y != -1 && !isNaN(positions[i*3+1])) positions[i*3+1] = datapoints.getFloat64((i*dimensions+mapping.y)*8, true) * Y / normalizingScale;
    if (mapping.z != -1 && !isNaN(positions[i*3+2])) positions[i*3+2] = datapoints.getFloat64((i*dimensions+mapping.z)*8, true) * Z / normalizingScale;
  }
  geometry.attributes.position.needsUpdate = true;
  particleSystem.material.size = R / 0.5;
}

function updateInfo() {
  $('#eventsindicator').text(particleSystem ? particleSystem.geometry.attributes.position.array.length/3 : 0);
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
