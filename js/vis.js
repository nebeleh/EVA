var WIDTH = 800, HEIGHT = 600;
var VIEW_ANGLE = 45, ASPECT = WIDTH / HEIGHT, NEAR = 0.1, FAR = 10000;
var renderer, camera, scence, mesh;

function init($container) {
  renderer = new THREE.WebGLRenderer();
  camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
  scene = new THREE.Scene();
  camera.position.z = 300;
  renderer.setSize(WIDTH, HEIGHT);
  $container.append(renderer.domElement);

  scene.add(camera);

  var pl1 = new THREE.PointLight( 0xFFFFFF );
  pl1.position.x = 10;
  pl1.position.y = 50;
  pl1.position.z = 130;
  scene.add(pl1);

  var pl2 = new THREE.PointLight( 0xFFFFFF );
  pl2.position.x = 10;
  pl2.position.y = -50;
  pl2.position.z = 130;
  scene.add(pl2);
}

function addShape() {
  var material = new THREE.MeshLambertMaterial({color: 0xCC0000});
  mesh = new THREE.Mesh(new THREE.SphereGeometry(50, 16, 16), material);
  scene.add(mesh);
}

function animate() {
  requestAnimationFrame(animate);
  mesh.position.x += 2;
  mesh.position.y += 2;
  renderer.render(scene, camera);
}