
Balls = new Meteor.Collection("balls");

if (Meteor.isClient) {


  Meteor.startup(function () {
    var fragment = Meteor.render(
  function () {
    var name = Session.get("name") || "Anonymous";
    return "<div>Hello, " + name + "</div>";
  });
document.body.appendChild(fragment);


  // create the sphere's material
  var sphereMaterial = new THREE.MeshLambertMaterial(
  {
      color: 0xCC0000
  });

  // set up the sphere vars
  var radius = 50, segments = 16, rings = 16;

  // create a new mesh with sphere geometry -
  // we will cover the sphereMaterial next!
  var sphere = new THREE.Mesh(
     new THREE.SphereGeometry(radius, segments, rings),
     sphereMaterial);
  // add the sphere to the scene
  var ballsId = Balls.insert({ball: sphere});
       // set the scene size
  var WIDTH = 400,
      HEIGHT = 300;

  // set some camera attributes
  var VIEW_ANGLE = 45,
      ASPECT = WIDTH / HEIGHT,
      NEAR = 0.1,
      FAR = 10000;

  var camera = new THREE.PerspectiveCamera(  VIEW_ANGLE,
                                  ASPECT,
                                  NEAR,
                                  FAR  );
  var scene = new THREE.Scene();

  // the camera starts at 0,0,0 so pull it back
  camera.position.z = 300;


  scene.add(sphere);
  // and the camera
  scene.add(camera);

  // create a point light
  var pointLight = new THREE.PointLight( 0xFFFFFF );

  // set its position
  pointLight.position.x = 10;
  pointLight.position.y = 50;
  pointLight.position.z = 130;

  // add to the scene
  scene.add(pointLight);

    var $container = $('#container');
  var renderer = new THREE.WebGLRenderer();
  // start the renderer
  renderer.setSize(WIDTH, HEIGHT);

  // attach the render-supplied DOM element
  $container.append(renderer.domElement);
  Session.set('renderer', renderer);
  Session.set('scene', scene);
  Session.set('camera', camera);
  renderer.render(scene, camera);
        var balls = Balls.find({});
        var count = 0;
        balls.forEach(function (ball) {
          //scene.add(ball.ball);
          console.log(ball.ball);

        });
          console.log(scene);
          console.log("!!");
  });

  Template.hello.greeting = function () {
    return "Welcome to smashpc.";
  };

  Template.hello.events({
    'click input#one' : function () {
      // template data, if any, is available in 'this'
      if (typeof console !== 'undefined')
        console.log("You pressed the button");
      Session.set("name", "Bob");

        var balls = Balls.find({});
        balls.forEach(function (ball) {
          console.log(ball);
         ball.ball.position.x+=0.1;
          console.log(ball.ball);
         //console.log(Session.get('scene'));
        });
    }
  });
  
  Template.container.events({
    'click input#two' : function () {
      Balls.remove({});
    }
  });
  
  Template.container.events({
    'click input#up' : function () {
    }
  });
  
  Template.container.events({
    'click input#down' : function () {
    }
  });
  
  Template.container.events({
    'click input#left' : function () {
    }
  });
  
  Template.container.events({
    'click input#right' : function () {
    }
  });
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
  });
Meteor.publish("balls", function () {
  return Balls.find({});
});
}
