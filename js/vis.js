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
  
  // start drawing
  drawArray();
  animate();
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

function drawArray() {
  var datasize = 50;
  var buffer = new ArrayBuffer(8*datasize);
  var data = new Float64Array(buffer);
  
  // creating a random walk dataset 
  data[0] = 0;
  for (var i=1; i<data.length; i++) {
    data[i] = data[i-1]+(Math.random()-0.5)*0.5;
  }
  
  var geom = new arrayGeometry(data);

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

// creates a 3D geometry based on the input array
function arrayGeometry(data) {

	THREE.Geometry.call( this );

	var verts = this.vertices;
	var faces = this.faces;
	var uvs = this.faceVertexUvs[ 0 ];
  
  var xMax = 10, xMin = 0, yMax = 10, yMin = 0, segments = 500, iMin = 0;
  var iMax, x, y, z;
  var P = 0, Q = 0, R = 0;
  var a,b,c,d,i;
  for (y=yMin;y<=yMax;y+=(yMax-yMin)/segments)
  {
    iMax = (y-yMin)/(yMax-yMin)*(data.length-iMin)+iMin;
    Q = verts.length;
    for (i=0;i<iMax;i++)
    {
      x = i*(xMax-xMin)/iMax+xMin;
      verts.push(new THREE.Vector3(x,y,data[i]));
    }
    //verts.push(new THREE.Vector3(xMax,y,data[i-1]));
    R = verts.length-1;
    // adding faces
    if (y>yMin)
    {
      var p;
      for (p=P; p<=Q-2; p++)
      {
        a = p;
        b = p+1;
        c = p+(Q-P)+1;
        d = p+(Q-P);
        faces.push(new THREE.Face4(a,b,c,d));
      }
      a = p;
      for (var q=Q-P+p;q<=R-1;q++)
      {
        b = q+1;
        c = q;
        faces.push(new THREE.Face3(a,b,c));
      }
      P = Q;
    }
  }

	this.computeCentroids();
	this.computeFaceNormals();
	this.computeVertexNormals();
}

arrayGeometry.prototype = Object.create(THREE.Geometry.prototype);

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
  update();
}

function update() {
  controls.update();
  stats.update();
}
