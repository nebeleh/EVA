// used code from http://stemkoski.github.io/Three.js/Graphulus-Surface.html

var renderer, camera, scence, controls, stats, axisHelper;
var VIEW_ANGLE = 50, NEAR = 0.1, FAR = 1000, ORTHONEAR = -100, ORTHOFAR = 1000, ORTHOSCALE = 100;
var lineGeom = null, datapointsMesh = [], datapointsIndex = [], line;
var datapoints = [], minOfColumn, maxOfColumn;

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
  isTime[0] = 1;

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
      datapoints[i][d] = 10 * (datapoints[i][d] - minOfColumn[d]) / (maxOfColumn[d] - minOfColumn[d]);
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
  animate();
}


function initialDraw(mapping)
{
  for (var i = 0; i < datapointsMesh.length; i++) {
    scene.remove(datapointsMesh[i]);
  }
  datapointsMesh.length = 0;
  datapointsIndex.length = 0;
console.log(datapoints[0]);
  // for each datapoint, find its appropriate geometry and size in 3D space
  for (var i = 0; i < datapoints.length; i++) {
    var x = 0, y = 0, z = 0, t = 0;
    var datapointColor = new THREE.Color(0x0000ff);
    // if one of assigned mappings is null in data, remove it
    if (mapping.x != -1) {
      if (isNaN(datapoints[i][mapping.x])) continue;
      x = datapoints[i][mapping.x];
    }

    if (mapping.y != -1) {
      if (isNaN(datapoints[i][mapping.y])) continue;
      y = datapoints[i][mapping.y];
    }

    if (mapping.z != -1) {
      if (isNaN(datapoints[i][mapping.z])) continue;
      z = datapoints[i][mapping.z];
    }

    if (mapping.t != -1) {
      if (isNaN(datapoints[i][mapping.t])) continue;
      t = datapoints[i][mapping.t];
    }

    if (mapping.c != -1) {
      if (isNaN(datapoints[i][mapping.c])) continue;
      datapointColor.setHSL((datapoints[i][mapping.c]-minOfColumn[mapping.c])/(maxOfColumn[mapping.c]-minOfColumn[mapping.c])*0.8+0.2, 1.0, 0.5);
    }

    var dataGeometry = new THREE.SphereGeometry(0.05);
    var dataMaterial = new THREE.MeshBasicMaterial({color: datapointColor.getHex(), transparent: true, opacity: 0.3});
    var dataMesh = new THREE.Mesh(dataGeometry, dataMaterial);
    datapointsMesh.push(dataMesh);
    datapointsIndex.push(i);
//    console.log(i);
    dataMesh.position.set(x, y, z);
    scene.add(dataMesh);
  }

  // updating information
  //$('#tsindicator').text(lineGeo.vertices.length);
  $('#eventsindicator').text(datapointsIndex.length);
}

function draw(Z, F, D)
{
  var T = lineGeo.vertices.length;
  var a;
  lineGeo.vertices[0] = new THREE.Vector3(0, 0, 0);
  for (var i = 1; i < T; i++)
  {
    a = 2 * Math.PI * F / (T-1);
    lineGeo.vertices[i] = new THREE.Vector3( Math.cos(i*a) + lineGeo.vertices[i-1].x, Math.sin(i*a) + lineGeo.vertices[i-1].y, i / (T-1) * Z);
  }
  for (var i = 1; i < T; i++)
  {
    lineGeo.vertices[i].x *= D;
    lineGeo.vertices[i].y *= D;
  }
  lineGeo.verticesNeedUpdate = true;
  for (var i = 0; i < datapointsMesh.length; i++)
  {
    datapointsMesh[i].position = lineGeo.vertices[datapointsIndex[i]].clone();
    datapointsMesh[i].verticesNeedUpdate = true;
  }
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

function setLine(s)
{
  if(s) {
    scene.add(line);
  } else {
    scene.remove(line);
  }
}
