var WIDTH = window.innerWidth, HEIGHT = window.innerHeight;
var VIEW_ANGLE = 45, ASPECT = WIDTH / HEIGHT, NEAR = 0.1, FAR = 10000;
var renderer, camera, scence, mesh;

function init($container) {
  if (window.WebGLRenderingContext)
    renderer = new THREE.WebGLRenderer();
  else
    renderer = new THREE.CanvasRenderer();
  camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
  scene = new THREE.Scene();
  camera.position.z = 600;
  renderer.setSize(WIDTH, HEIGHT);
  $container.append(renderer.domElement);

  scene.add(camera);
  calcWindowResize(renderer,camera);

  // LIGHTS
  hemiLight = new THREE.HemisphereLight( 0xffffff, 0xffffff, 0.6 );
  hemiLight.color.setHSL( 0.6, 1, 0.6 );
  hemiLight.groundColor.setHSL( 0.095, 1, 0.75 );
  hemiLight.position.set( 0, 500, 0 );
  scene.add( hemiLight );

  dirLight = new THREE.DirectionalLight( 0xffffff, 1 );
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
  //dirLight.shadowCameraVisible = true;
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
  var material = new THREE.MeshLambertMaterial({color: 0xCC0000});
  mesh = new THREE.Mesh(new THREE.SphereGeometry(20, 16, 16), material);
  scene.add(mesh);
}

var x = 0, y = 0, z = 0, w = 200;

function animate() {
  requestAnimationFrame(animate);
  
  if (mesh.position.x > w || mesh.position.x < -w) { x *= -1; }
  if (mesh.position.y > w || mesh.position.y < -w) { y *= -1; }
  if (mesh.position.z > w || mesh.position.z < -w) { z *= -1; }
  // playing with the ball
  mesh.position.x += x;
  mesh.position.y += y;
  mesh.position.z += z;
  
  renderer.render(scene, camera);
}
