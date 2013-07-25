// used code from http://stemkoski.github.io/Three.js/Graphulus-Surface.html

var renderer, camera, scence, controls, mesh, stats, material;

function init($container) {
  // scene
  scene = new THREE.Scene();
  
  // stats
  stats = new Stats();
  stats.domElement.style.position = 'absolute';
  stats.domElement.style.top = '0px';
  stats.domElement.style.left = '0px';
  stats.domElement.style.zIndex = 100;
  $container.append( stats.domElement );

  // camera
  var WIDTH = window.innerWidth, HEIGHT = window.innerHeight;
  var VIEW_ANGLE = 45, ASPECT = WIDTH / HEIGHT, NEAR = 0.1, FAR = 10000;
  camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
  camera.position.set(-10,-10,10);
  camera.lookAt(scene.position);  
  camera.up = new THREE.Vector3( 0, 0, 1 );
  scene.add(camera);
  
  // renderer
  if (window.WebGLRenderingContext)
    renderer = new THREE.WebGLRenderer();
  else
    renderer = new THREE.CanvasRenderer();
  renderer.setSize(WIDTH, HEIGHT);
  renderer.domElement.style.position = 'absolute';
  renderer.domElement.style.top = '0px';
  renderer.domElement.style.left = '0px';
  renderer.domElement.style.zIndex = 0;
  $container.append(renderer.domElement);
  
  // events
  calcWindowResize(renderer,camera);
  
  // lights
  var hemiLight = new THREE.HemisphereLight( 0xffffff, 0xffffff, 0.6 );
  hemiLight.color.setHSL( 0.6, 1, 0.6 );
  //hemiLight.color.setHSL( .8, .8, .8 );
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
  
  // add helper
  scene.add( new THREE.AxisHelper() );
  
  // controls
  controls = new THREE.TrackballControls( camera, renderer.domElement );
  
  // add xy-plane
  var floorMaterial = new THREE.MeshBasicMaterial({color: 0x000000, wireframe: true, side: THREE.DoubleSide});
  var floorGeom = new THREE.PlaneGeometry(20,20,20,20);
  var floor = new THREE.Mesh(floorGeom, floorMaterial);
  scene.add(floor);
}

function calcWindowResize(renderer, camera) {
  var callback = function(){
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize',callback,false);
  return {
    stop : function(){
      window.removeEventListener('resize',callback);
    }
  };
}

function addShape() {
  var uMax = 10, uMin = 0, vMax = 10, vMin = 0, segments = 300;
  var parFunc = function(u0,v0)
  {
    var u = uMax*u0 + uMin;
    var v = vMax*v0 + vMin;
    var x = u;
    var y = v;
    var z = Math.sin(x*y);
    return new THREE.Vector3(x,y,z);
  };
  var geom = new THREE.ParametricGeometry(parFunc, segments, segments, true);
  if (mesh) {
    scene.remove(mesh);
  }
  
  // front side
  material = new THREE.MeshLambertMaterial({color: 0xFF0000, side: THREE.FrontSide});
  mesh = new THREE.Mesh(geom,material);
  scene.add(mesh);
  
  // back side -- for increasing speed, use THREE.DoubleSide and disable this part
  material = new THREE.MeshLambertMaterial({color: 0xD358F7, side: THREE.BackSide});
  mesh = new THREE.Mesh(geom,material);
  scene.add(mesh);
}

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
  update();
}

function update() {
  controls.update();
  stats.update();
}
