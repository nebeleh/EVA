// used code from http://stemkoski.github.io/Three.js/Graphulus-Surface.html

var renderer, camera, scence, controls, stats;

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
  //camera = new THREE.OrthographicCamera(WIDTH/-2, WIDTH/2, HEIGHT/2, HEIGHT/-2, NEAR, FAR);
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
  //scene.add(floor);
  
  // start drawing
  draw();
  animate();
}

function draw()
{
  // making a coil
  var points = [], i = 0, r = 4, f = 1, minZ = -10, maxZ = 10;
  for (var z = minZ; z <= maxZ; z += 0.1/f)
  {
    points[i++] = new THREE.Vector3(r*Math.sin(z*f*Math.PI), r-r*Math.cos(z*f*Math.PI), z);
  }

  // creating the spline
  var geometry = new THREE.Geometry();
  var segments = 10;
  var spline = new THREE.Spline(points);

  var index, position, colors = [];
  for (var i=0; i<points.length * segments; i++)
  {
    index = i / (points.length * segments);
    position = spline.getPoint(index);
    geometry.vertices[i] = new THREE.Vector3(position.x, position.y, position.z);
    colors[i] = new THREE.Color(0xffffff);
    (position.z > 0) ? colors[i].setHSL(0.3, 1.0, 0.75*position.z/maxZ) : colors[i].setHSL(0.6, 1.0, -0.75*position.z/maxZ);
  }

  geometry.colors = colors;
  var material = new THREE.LineBasicMaterial({color: 0xffffff, opacity: 1,  linewidth: 3, vertexColors: THREE.VertexColors});

  var line = new THREE.Line(geometry, material);
  scene.add(line);

  // adding datapoints
  var dataMaterial = new THREE.MeshBasicMaterial({color: 0xff0000, transparent: true, opacity: 0.6});
  for (var i = 0; i < points.length; i++)
  {
    if (Math.random() < 0.7) continue;
    var dataMesh = new THREE.Mesh(new THREE.SphereGeometry(0.2,100,100), dataMaterial);
    dataMesh.position.set(points[i].x, points[i].y, points[i].z);
    scene.add(dataMesh);
  }
}

function calcWindowResize(renderer, camera)
{
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
