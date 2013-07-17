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

var x = 2.3, y = 2.2, z = 2.1;

function animate() {
  requestAnimationFrame(animate);
  
  if (mesh.position.x > 50 || mesh.position.x < -50) { x *= -1; }
  if (mesh.position.y > 50 || mesh.position.y < -50) { y *= -1; }
  if (mesh.position.z > 50 || mesh.position.z < -50) { z *= -1; }
  // playing with the ball
  mesh.position.x += x;
  mesh.position.y += y;
  mesh.position.z += z;
  
  renderer.render(scene, camera);
}