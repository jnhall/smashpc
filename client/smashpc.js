/*jslint white: true, sloppy: true */
// entire game state, timestep between last render, and object full of currently held keys
var game, timestep = 0, down = {}, camera, renderer, scene;

//////////////////////////////////////////
//
// Projectile prototype
//
//////////////////////////////////////////

var Projectile = function(mesh, direction, speed, cooldown, lifetime) {
  this.mesh = new THREE.Mesh(mesh.geometry, mesh.material);
  this.mesh.position.copy(game.player.mesh.position);
  this.direction = new THREE.Vector3().copy(direction);
  this.speed = speed;
  this.lifetime = lifetime;
  scene.add(this.mesh);

  this.cooldown = {current: 0, max: cooldown, lastCheck: new Date().getTime()};

  return this;
};

Projectile.prototype.update = function() {
  this.lifetime -= timestep;
  if(this.lifetime<=0) {
    //console.log(games.projectiles);
    //console.log(this);
    game.projectiles.splice(game.projectiles.indexOf(this), 1);
    //console.log(this.speed);
    scene.remove(this.mesh);

  }
  this.mesh.position.add(new THREE.Vector3().copy(this.direction).multiplyScalar(this.speed));
};


//////////////////////////////////////////
//
// Weapon prototype
//
//////////////////////////////////////////

var Weapon = function(mesh, speed, cooldown, lifetime) {
  this.mesh = new THREE.Mesh(mesh.geometry, mesh.material);
  console.log(this.mesh);
  this.speed = speed;
  this.cooldown = {current: 0, max: cooldown, lastCheck: new Date().getTime()};
  this.lifetime = lifetime;
};

Weapon.prototype.pullTrigger = function() {
    this.cooldown.current -= timestep;
    //console.log(this.cooldown.current);
    if(this.cooldown.current <= 0){
      //FIRE!
      this.cooldown.current = this.cooldown.max;
      console.log("this.speed:"+this.speed);
      console.log(this.cooldown.current);
      game.projectiles.push(
        new Projectile(
          this.mesh,
          new THREE.Vector3(0,1,0),
          this.speed,
          this.cooldown,
          this.lifetime
        )
      );
    }
};

//////////////////////////////////////////
//
// Ally prototype
//
//////////////////////////////////////////

var Ally = function(name, x, y, lastMove) {
  var geometry = new THREE.CylinderGeometry(12, 0, 22, 3, 1, false);
  geometry.applyMatrix(new THREE.Matrix4().makeRotationX(Math.PI));
  var material = new THREE.MeshLambertMaterial({color: 0x00FF00 });
  var mesh = new THREE.Mesh( geometry, material );
  scene.add(mesh);

  mesh.name = name;
  mesh.type = 'ally';
  mesh.position.x = x;
  mesh.position.y = y;
  mesh.position.lastMove = {x: lastMove.x, y: lastMove.y};

  this.mesh = mesh;
};


//////////////////////////////////////////
//
// Player prototype
//
//////////////////////////////////////////

var Player = function(name) {
  var geometry = new THREE.CylinderGeometry(12, 0, 22, 3, 1, false);
  geometry.applyMatrix(new THREE.Matrix4().makeRotationX(Math.PI));
  var material = new THREE.MeshPhongMaterial({color: 0x00FFFF });
  var mesh = new THREE.Mesh( geometry, material );
  scene.add(mesh);

  this.mesh = mesh;
  this.name = name;
  this.id = name;

  this.motion = {
    x: {curr: 0, accel: 1, deccel: 1.8, max: 3, magnitude: 0},
    y: {curr: 0, accel: 0.9, deccel: 0.9, max: 1.8, magnitude: 0}};

  this.weapon = new Weapon(
    new THREE.Mesh(new THREE.CubeGeometry(1,5,1), new THREE.MeshBasicMaterial({color:0xFF0000})),
    3,
    100,
    1000
  );
  this.isFiring = false;

  this.axes = Object.keys(this.motion);
};

Player.prototype.move = function() {
  if(!this.motion.x.magnitude
    && !this.motion.x.curr
    && !this.motion.y.magnitude
    && !this.motion.y.curr)
    return;
  var moveInfo = { x: null, y: null, lastMove:{x: 0, y: 0} }, motion, i;

  for(i=0; i<this.axes.length; i += 1) {
    motion = this.motion[this.axes[i]];

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
    moveInfo[this.axes[i]] = (this.mesh.position[this.axes[i]] += motion.curr);
    //console.log(this.mesh.position[this.axes[i]]);
  }

  return moveInfo;
};

Player.prototype.fire = function() {
  if(this.isFiring){
    this.weapon.pullTrigger();
  }
};

Player.prototype.update = function() {
  return {
    moveInfo: this.move(),
    fireInfo: this.fire()
  }
  //this.cooldown.current -= timestep;
  //this.cooldown.current = this.cooldown.max;
};

//////////////////////////////////////////
//
// Game state
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
      if(this.projectiles[i].lifetime != NaN);
        this.projectiles[i].update();
    }


    var updateInfo = this.player.update();
    Entities.update(this.player.id, {$set: updateInfo.moveInfo});

    for(i=0; i<scene.children.length; i += 1) {
      if(scene.children[i].name=="ally" && scene.children[i].position.lastMove!==undefined
        && ( scene.children[i].lastMove.x !== 0 || scene.children[i].position.lastMove.y !== 0 )) {
        scene.children[i].position.x += (scene.children[i].position.lastMove.x*=0.99);
        scene.children[i].position.y += (scene.children[i].position.lastMove.y*=0.99);
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
  timestep = new Date().getTime() - game.lastUpdate;
  game.lastUpdate = new Date().getTime();
  game.update();
  requestAnimationFrame( animate );
  render();
};

var render = function() {
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
  camera.position.z = 250;
  scene.add(camera);
  game.player = new Player(name);

  pointLight.position.x = 10;
  pointLight.position.y = 50;
  pointLight.position.z = 130;
  scene.add(pointLight);

  renderer = new THREE.WebGLRenderer();
  renderer.setClearColorHex(0x000000);
  renderer.setSize(WIDTH, HEIGHT);

  var $container = $('.container');
  $container.append(renderer.domElement);
  //scene.add(new THREE.Mesh(new THREE.CubeGeometry(5,5,5), new THREE.MeshBasicMaterial({color: 0xff0000})));

  query = Entities.find({});
  handle = query.observeChanges({
    changed: function (id, fields) {
      if(id===game.player.id)
        return;
      var changed = scene.getObjectByName(id);
      $.extend(changed.position, fields);
    },
    added: function (id) {
      if(id===game.player.id)
        return;
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
    event.preventDefault();
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
          game.player.motion.y.magnitude += change;
          break;
        case 65: //a
          game.player.motion.x.magnitude -= change;
          break;
        case 83: //s
          game.player.motion.y.magnitude -= change;
          break;
        case 68: //d
          game.player.motion.x.magnitude += change;
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


