var avatar;
  Meteor.startup(function () {
    var ballId = Balls.insert({x: 0, y: 0, lastMove: {x: 0, y: 0 }});
    Session.set('ballId', ballId);
    Session.set('motiony', 0);
    Session.set('motionx', 0);
    function init() {
      // set up the sphere vars
      var avatarGeom = new THREE.CylinderGeometry(1.2, 0, 2.2, 3, 1);
      avatarGeom.applyMatrix(new THREE.Matrix4().makeRotationX(Math.PI));
      avatar = new THREE.Mesh(
           avatarGeom,
           new THREE.MeshLambertMaterial({color: 0x00FFFF }));

      avatar.name = ballId;
      avatar.motion = {x: {curr: 0, d: 0.3, max: 1}, y: {curr: 0, d: 0.2, max: 0.8}};

      function movement(objm, mag) {
        if(mag!=0){
          if(mag>0&&objm.curr<0||mag<0&&objm.curr>0)
            objm.curr = 0;
          objm.curr = objm.curr + mag * objm.d;
          if(objm.curr>objm.max || objm.curr<-objm.max){
            console.log("Maxed at "+objm.curr);
            objm.curr = mag*objm.max;
            console.log("Fixed at "+objm.curr);
            console.log(mag);
            console.log(objm.max);

          }
        }
        else {
          if(Math.abs(objm.curr) - objm.d*3 < 0)
            objm.curr = 0;
          else if(objm.curr > 0)
            objm.curr = objm.curr - objm.d*3;
          else
            objm.curr = objm.curr + objm.d*3;
        }
        return objm.curr;
      }
      var start = {x:0, y:0};
      var end = {x:0, y:0};
      var dir = {x:0, y:0};

      function animate() {

        requestAnimationFrame( animate );
        render();
      }
      function render() {
        dir.x = Session.get('motionx');
        dir.y = Session.get('motiony');
        moving = (dir.x || avatar.motion.x.curr || dir.y || avatar.motion.y.curr);
        if(moving){
          newpos = {};

          var dx = movement(avatar.motion.x, dir.x);
          if(dx!=0)
            newpos.x = avatar.position.x+dx;

          var dy = movement(avatar.motion.y, dir.y);
          if(dy!=0)
            newpos.y = avatar.position.y+dy;

          newpos.lastMove = {x: dx, y: dy};
          console.log(newpos.motion);
          Balls.update(ballId, {$set: newpos});
        }
        
        for(var i=0; i<scene.children.length; i++) {
          if(scene.children[i].name!=ballId && scene.children[i].lastMove!==undefined
            && ( scene.children[i].lastMove.x != 0 || scene.children[i].lastMove.y != 0 )) {
            console.log(scene.children[i].lastMove);
            scene.children[i].position.x += (scene.children[i].lastMove.x*=0.99);
            scene.children[i].position.y += (scene.children[i].lastMove.y*=0.99);
          }
        }
        renderer.render( scene, camera );
      }


      // create a new mesh with sphere geometry -
      // we will cover the sphereMaterial next!
      // add the sphere to the scene
           // set the scene size
      var WIDTH = 1024,
          HEIGHT = 768;

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
      camera.position.z = 50;

      scene.add(avatar);
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

      animate();

      var query = Balls.find({});
      var handle = query.observeChanges({
        changed: function (id, fields) {
          var ball = Balls.findOne(id);
          var changed = scene.getObjectByName(id);

          changed.position.x = ball.x;
          changed.position.y = ball.y;
          changed.lastMove = {x: ball.lastMove.x, y: ball.lastMove.y};
          console.log(ball.lastMove);
          console.log(changed.lastMove);
        },
        added: function (id) {
          console.log('Added ball id ' + id);
          var ball = Balls.findOne(id);
          console.log(ball);
          var added = new THREE.Mesh(
           avatarGeom,
           new THREE.MeshPhongMaterial({color: 0xFF0000 }));
          added.name = id;
          scene.add(added);
          added.position.x = ball.x;
          added.position.y = ball.y;
          added.lastMove = {x: ball.lastMove.x, y: ball.lastMove.y};
        },
        removed: function (id) {
          var changed = scene.getObjectByName(id);
          scene.remove(changed);
        },
      });
    }
    init();
  });

  Template.hello.rendered = function(){
    down = {};
    $('body').on('keydown', function(event){
      var keycode = (event.keyCode ? event.keyCode : event.which);
      if(!down[keycode] && (keycode == 87 || keycode == 65 || keycode == 83 || keycode == 68)){
        //var ball = Balls.findOne(Session.get('ballId'));
        switch(keycode){
          case 87: //w
            Session.set('motiony', Session.get('motiony')+1);
            break;
          case 65: //a
            Session.set('motionx', Session.get('motionx')-1);
            break;
          case 83: //s
            Session.set('motiony', Session.get('motiony')-1);
            break;
          case 68: //d
            Session.set('motionx', Session.get('motionx')+1);
            break;
        }
        down[keycode] = true;

        //Balls.update(ball._id, {$set: {direction: direction}});
      }
    });
    $('body').on('keyup', function(event){
      var keycode = (event.keyCode ? event.keyCode : event.which);
      if(down[keycode] && (keycode == 87 || keycode == 65 || keycode == 83 || keycode == 68)){
        down[keycode] = null;
        //var ball = Balls.findOne(Session.get('ballId'));
        var direction = {};
        switch(keycode){
          case 87: //w
            Session.set('motiony', Session.get('motiony')-1);
            break;
          case 65: //a
            Session.set('motionx', Session.get('motionx')+1);
            break;
          case 83: //s
            Session.set('motiony', Session.get('motiony')+1);
            break;
          case 68: //d
            Session.set('motionx', Session.get('motionx')-1);
            break;
        }
        //Balls.update(ball._id, {$set: {direction: direction }});
      }
    });
  };

  Template.hello.greeting = function () {
    return 'Welcome to smashpc.';
  };

  Template.hello.events({
    'click input#one' : function () {
      // template data, if any, is available in 'this'
      if (typeof console !== 'undefined')
        console.log('You pressed the button');
        Session.set('name', 'Bob');
        var balls = Balls.find({});
        var x=0;

        balls.forEach(function (ball) {
          console.log(ball);
         
          console.log(x);
         //console.log(Session.get('scene'));
        });
    }
  });
  
  Template.controls.events({
    'click input#reset' : function () {
      var balls = Balls.find({});
      balls.forEach(function (ball) {  
        Balls.remove(ball._id);
      });
    },
    'keydown input#name' : function (e) {
      console.log(e);//Session.set('name', $())
    },
    'keydown input#chat' : function (e) {
      
    },
  });

  Template.container.events({
    'click canvas' : function() {
      console.log(avatar);
      console.log('Clicked it!');
    },
  });
  Meteor.subscribe('balls');
