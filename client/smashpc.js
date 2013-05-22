/*jslint white: true, sloppy: true */
// entire game state, timestep between last render, and object full of currently held keys
var game, timestep = 0, down = {}, camera, renderer, scene;

//////////////////////////////////////////
//
// Projectile prototype
//
//////////////////////////////////////////

var Projectile = function(mesh, direction, speed, cooldown) {
  this.mesh = mesh;
  this.direction = direction;
  this.speed = speed;
  this.cooldown = {current: 0, max: cooldown};
};

Projectile.prototype.update = function() {
  console.log("Ping!");
  this.mesh.position.add(new THREE.Vector3().copy(this.direction).multiplyScalar(this.speed));
};


//////////////////////////////////////////
//
// Weapon prototype
//
//////////////////////////////////////////
/*
var Weapon = function(mesh, direction, speed, cooldown) {
  this.mesh = mesh;
  this.direction = direction;
  this.speed = speed;
  this.cooldown = {current: 0, max: cooldown};
};

Weapon.prototype.pullTrigger = function() {
    this.mesh.position.add(new THREE.Vector3().copy(this.direction).multiplyScalar(this.speed));
};*/

//////////////////////////////////////////
//
// Ally prototype
//
//////////////////////////////////////////

var Ally = function(name, x, y, lastMove) {
  mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 0, 2.2, 3, 1)
      .applyMatrix(new THREE.Matrix4().makeRotationX(Math.PI)),
    new THREE.MeshLambertMaterial({color: 0x00FF00 }));
  scene.add(mesh);
  mesh.name = name;
  mesh.position.x = x;
  mesh.position.y = y;
  mesh.lastMove = {x: lastMove.x, y: lastMove.y};

  this.mesh = mesh;

};


//////////////////////////////////////////
//
// Player prototype
//
//////////////////////////////////////////

var Player = function(name) {
  mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 0, 2.2, 3, 1)
      .applyMatrix(new THREE.Matrix4().makeRotationX(Math.PI)),
    new THREE.MeshLambertMaterial({color: 0x00FFFF }));
  scene.add(mesh);
  this.mesh = mesh;

  this.name = name;
  this.id = name;

  this.position = {x: 0, y: 0};

  this.motion = {
    x: {curr: 0, accel: 0.3, deccel: 0.9, max: 1, magnitude: 0},
    y: {curr: 0, accel: 0.2, deccel: 0.9, max: 0.8, magnitude: 0}};

  this.isFiring = false;

  this.axes = Object.keys(this.motion);
};

Player.prototype.move = function() {
  var moveInfo = { lastMove:{} }, motion, i;

  for(i=0; i<this.axes.length; i += 1) {
    motion = this.motion[this.axes[i]];
    console.log('before');
    console.log(this.motion);
    console.log('after');
    if(motion.magnitude!==0){
      if( (motion.magnitude>0 && motion.curr<0) 
        || (motion.magnitude<0 && motion.curr>0) ) {
        motion.curr = 0;
      }

      motion.curr = motion.curr + motion.magnitude * motion.accel;

      if( (motion.curr>motion.max)
        || (motion.curr<-motion.max) ){
        motion.curr = motion.magnitude*motion.max;
      }
    }
    else {
      if(Math.abs(motion.curr) - motion.accel*3 < 0) {
        motion.curr = 0; 
      } else if(motion.curr > 0) {
        motion.curr = motion.curr - motion.accel*3;
      } else {
        motion.curr = motion.curr + motion.accel*3;
      }
    }
    moveInfo.lastMove[this.axes[i]] = motion.curr;
    moveInfo[this.axes[i]] = this.position[this.axes[i]] + motion.curr;
  }

  return moveInfo;
};

Player.prototype.fire = function() {
  //if(this.cooldown.current<=0){
    //fire ze missiles!
  //}
};

Player.prototype.update = function() {
  this.moveInfo = this.move();
  this.cooldown.current -= timestep;
  this.cooldown.current = this.cooldown.max;
};

//////////////////////////////////////////
//
// Game prototype
//
//////////////////////////////////////////

game = {
  player : null,
  friends : [],
  projectiles : [],
  lastUpdate : new Date().getTime(),
  update : function() {
    var i;

    for(i=0; i<this.projectiles.length; i += 1){
      this.projectiles[i].update();
    }

    if(this.player.motion.x.magnitude
      || this.player.motion.x.curr
      || this.player.motion.y.magnitude
      || this.player.motion.y.curr) {
      var updateInfo = this.player.update();

      Entities.update(this.player.id, {$set: updateInfo.moveInfo});
    }
    
    for(i=0; i<scene.children.length; i += 1) {
      if(scene.children[i].name!==this.player.name && scene.children[i].lastMove!==undefined
        && ( scene.children[i].lastMove.x !== 0 || scene.children[i].lastMove.y !== 0 )) {
        console.log(scene.children[i].lastMove);
        scene.children[i].position.x += (scene.children[i].lastMove.x*=0.99);
        scene.children[i].position.y += (scene.children[i].lastMove.y*=0.99);
      }
    }
  },

  onWindowResize : function() {
    var windowWidth = window.innerHeight;
    var windowHeight = window.innerHeight;
    camera.aspect = windowWidth / windowHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( windowWidth, windowHeight );
  }
};

//////////////////////////////////////////
//
// Render loop
//
//////////////////////////////////////////

var animate = function() {
  requestAnimationFrame( animate );
  render();
};

var render = function() {
  timestep = new Date().getTime() - game.lastUpdate;
  game.lastUpdate = new Date().getTime();
  game.update();
  renderer.render( scene, camera );
};

//////////////////////////////////////////
//
// Initialization
//
//////////////////////////////////////////

var init = function(name) {
  var WIDTH = window.innerHeight,
      HEIGHT = window.innerHeight,
      VIEW_ANGLE = 45,
      ASPECT = WIDTH / HEIGHT,
      NEAR = 0.1,
      FAR = 10000,
      pointLight = new THREE.PointLight( 0xFFFFFF ),
      query, handle;

  camera = new THREE.PerspectiveCamera(  VIEW_ANGLE,
                                  ASPECT,
                                  NEAR,
                                  FAR  );
  scene = new THREE.Scene();
  camera.position.z = 50;
  scene.add(camera);
  game.player = new Player(name);

  pointLight.position.x = 10;
  pointLight.position.y = 50;
  pointLight.position.z = 130;
  scene.add(pointLight);

  renderer = new THREE.WebGLRenderer();
  renderer.setSize(WIDTH, HEIGHT);

  var $container = $('.container');
  $container.append(renderer.domElement);

  query = Entities.find({});
  handle = query.observeChanges({
    changed: function (id, fields) {
      var changed = scene.getObjectByName(id);
      changed.position.x = fields.x;
      changed.position.y = fields.y;
      changed.lastMove = {x: fields.lastMove.x, y: fields.lastMove.y};
    },
    added: function (id) {
      console.log('Added entity id ' + id);
      var entity = Entities.findOne(id);
      if(entity.type === 'ally'){
        var newAlly = new Ally(id, entity.x, entity.y, {x: entity.lastMove.x, y: entity.lastMove.y} );
        console.log(newAlly);
        //scene.add(newAlly.mesh);
      }
    },
    removed: function (id) {
      var changed = scene.getObjectByName(id);
      scene.remove(changed);
    }
  });
  animate();
};

//////////////////////////////////////////
//
// Meteor client code
//
//////////////////////////////////////////
Meteor.startup(function () {
  var entityId = Entities.insert({x: 0, y: 0, lastMove: {x: 0, y: 0 }, type: 'ally'});
  init(entityId);
  window.addEventListener('resize', game.onWindowResize);
});

Template.content.rendered = function(){
  var keycode, firing, moving, change,
  onKeyChange = function(event, activate) {
    keycode = event.keyCode || event.which;
    if( (activate && down[keycode]) || (!activate && !down[keycode]) ) {
      return;
    }

    if(activate) {
      change = 1;
    } else {
      change = -1;
    }

    firing = keycode === 32;
    moving = keycode === 87 || keycode === 65 || keycode === 83 || keycode === 68;

    if(moving){
      //var entity = Entities.findOne(Session.get('entityId'));
      switch(keycode){
        case 87: //w
          game.player.y.magnitude += change;
          break;
        case 65: //a
          game.player.x.magnitude -= change;
          break;
        case 83: //s
          game.player.y.magnitude -= change;
          break;
        case 68: //d
          game.player.x.magnitude += change;
          break;
      }
    } else if (firing) {
      game.player.isFiring = activate;
    }
    down[keycode] = activate || null;
  };
  $('body').on('keydown', function(event){onKeyChange(event, true)});
  $('body').on('keyup', function(event){onKeyChange(event, false)});

};

Template.content.greeting = function () {
  return 'Welcome to smashpc.';
};

Template.content.events({
  'click input#one' : function () {
      console.log('You pressed the button');
      Session.set('name', 'Bob');
      var entities = Entities.find({});
      var x=0;

      entities.forEach(function (entity) {
        console.log(entity);
      });
  }
});

Template.controls.events({
  'click input#reset' : function () {
    var entities = Entities.find({});
    entities.forEach(function (entity) {  
      Entities.remove(entity._id);
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
    console.log('Clicked it!');
  },
});
Meteor.subscribe('entities');


