/*jslint white: true, sloppy: true */
// entire game state, timestep between last render, and object full of currently held keys
var game,
  timestep = 0,
  down = {},
  camera,
  renderer,
  scene,
  AXES = ['x', 'y'],
  BOT_ACCURACY = 1;
var ammo;

//////////////////////////////////////////
//
// Enemy prototype
//
//////////////////////////////////////////

var Enemy = function(name) {
  var geometry = new THREE.CylinderGeometry(12, 0, 22, 3, 1, false);
  geometry.applyMatrix(new THREE.Matrix4().makeRotationX(Math.PI));
  var material = new THREE.MeshLambertMaterial({color: 0xFF00FF });
  mesh = new THREE.Mesh( geometry, material );
  scene.add(mesh);

  mesh.name = name;
  mesh.type = 'enemy';

  mesh.updated = {
    x: x, y: y, lastMove: {x: lastMove.x, y: lastMove.y}, time: new Date().getTime()
  };

  this.mesh = mesh;


  this.motion = {
    x: {curr: 0, accel: 2000, deccel: 3000, max: 200, magnitude: 0},
    y: {curr: 0, accel: 1500, deccel: 2000, max: 150, magnitude: 0}};

  this.weapon = new Weapon(
    150,
    0.1,
    2
    );

};

Enemy.prototype.move = function() {

};

Enemy.prototype.update = function() {
  this.move();
};

//////////////////////////////////////////
//
// Projectile prototype
//
//////////////////////////////////////////

var Projectile = function(position, direction, speed, lifetime, start, from) {
  this.direction = new THREE.Vector3().copy(direction);
  this.from = from;
  this.speed = speed;

  this.mesh = new THREE.Mesh(ammo.geometry, ammo.material);
  this.mesh.position.copy(position);
  this.mesh.position.add(
    new THREE.Vector3().copy(this.direction).multiplyScalar(this.speed * (new Date().getTime() - start)/1000));
  this.lifetime = lifetime;
  scene.add(this.mesh);

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
  this.mesh.position.add(new THREE.Vector3().copy(this.direction).multiplyScalar(this.speed*timestep));
};


//////////////////////////////////////////
//
// Weapon prototype
//
//////////////////////////////////////////

var Weapon = function(speed, cooldown, lifetime) {
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
      game.player
      Projectiles.insert({
          posx: game.player.mesh.position.x, posy: game.player.mesh.position.y, posz: game.player.mesh.position.z,
          dirx: 0, diry: 1, dirz: 0,
          speed: this.speed,
          lifetime: this.lifetime,
          start: new Date().getTime(),
          from: game.player.name
      });
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
  mesh = new THREE.Mesh( geometry, material );
  scene.add(mesh);

  mesh.name = name;
  mesh.type = 'ally';

  mesh.updated = {
    x: x, y: y, lastMove: {x: lastMove.x, y: lastMove.y}, time: new Date().getTime()
  };

  mesh.target = {
    x: x, y: y, time: new Date().getTime()
  };

  this.mesh = mesh;


  this.motion = {
    x: {curr: 0, accel: 2000, deccel: 3000, max: 200, magnitude: 0},
    y: {curr: 0, accel: 1500, deccel: 2000, max: 150, magnitude: 0}};

  this.weapon = new Weapon(
    150,
    0.1,
    2
    );
};

Ally.prototype.move = function() {
    // the rest is copied form player
  var moveInfo = { x: null, y: null, lastMove:{x: 0, y: 0} , time: null}, motion, i;


  for(i=0; i<AXES.length; i += 1) {  
    if(this.mesh.target[AXES[i]] - this.mesh.position[AXES[i]] < BOT_ACCURACY
      && this.mesh.target[AXES[i]] - this.mesh.position[AXES[i]] > -BOT_ACCURACY ){
      continue;
    }
    motion = this.motion[AXES[i]];
    motion.magnitude = 0;

    if(this.mesh.target[AXES[i]]>this.mesh.position[AXES[i]])
      motion.magnitude = 1.0;

    if(this.mesh.target[AXES[i]]<this.mesh.position[AXES[i]])
      motion.magnitude = -1.0;

    if(motion.magnitude!==0){
      if( (motion.magnitude>0 && motion.curr<0) 
        || (motion.magnitude<0 && motion.curr>0) ) {
        motion.curr = 0;
      }

      motion.curr += motion.magnitude * motion.accel*timestep;

      if( (motion.curr>motion.max)
        || (motion.curr<-motion.max) ){
        motion.curr = motion.magnitude*motion.max;
      }
    }
    else {
      if(Math.abs(motion.curr) - motion.deccel*timestep < 0) {
        motion.curr = 0; 
      } else if(motion.curr > 0) {
        motion.curr = motion.curr - motion.deccel*timestep;
      } else {
        motion.curr = motion.curr + motion.deccel*timestep;
      }
    }
    if(this.mesh.target[AXES[i]]<this.mesh.position[AXES[i]] + motion.curr * timestep
      && this.mesh.target[AXES[i]]>this.mesh.position[AXES[i]] + motion.curr * timestep)
      motion.curr = (this.mesh.target[AXES[i]] - this.mesh.position[AXES[i]])/timestep;
    moveInfo.lastMove[AXES[i]] = motion.curr;
    moveInfo[AXES[i]] = (this.mesh.position[AXES[i]] += moveInfo.lastMove[AXES[i]]*timestep);
  }

  //return moveInfo;
}

Ally.prototype.update = function() {
  return {
    moveInfo: this.move()
  }
  //this.cooldown.current -= timestep;
  //this.cooldown.current = this.cooldown.max;
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
    x: {curr: 0, accel: 2000, deccel: 3000, max: 200, magnitude: 0},
    y: {curr: 0, accel: 1500, deccel: 2000, max: 150, magnitude: 0}};

  this.weapon = new Weapon(
    150,
    0.1,
    2
    );
};

//Player.prototype = new Entity(this.name);
Player.prototype.move = function() {
  if(!this.motion.x.magnitude
    && !this.motion.x.curr
    && !this.motion.y.magnitude
    && !this.motion.y.curr)
    return;
  var moveInfo = { x: null, y: null, lastMove:{x: 0, y: 0} , time: null}, motion, i;

  for(i=0; i<AXES.length; i += 1) {
    motion = this.motion[AXES[i]];

    if(motion.magnitude!==0){
      if( (motion.magnitude>0 && motion.curr<0) 
        || (motion.magnitude<0 && motion.curr>0) ) {
        motion.curr = 0;
      }

      motion.curr += motion.magnitude * motion.accel*timestep;

      if( (motion.curr>motion.max)
        || (motion.curr<-motion.max) ){
        motion.curr = motion.magnitude*motion.max;
      }
    }
    else {
      if(Math.abs(motion.curr) - motion.deccel*timestep < 0) {
        motion.curr = 0; 
      } else if(motion.curr > 0) {
        motion.curr = motion.curr - motion.deccel*timestep;
      } else {
        motion.curr = motion.curr + motion.deccel*timestep;
      }
    }
    moveInfo.lastMove[AXES[i]] = motion.curr;
    moveInfo[AXES[i]] = (this.mesh.position[AXES[i]] += moveInfo.lastMove[AXES[i]]*timestep);
  }
  moveInfo.time = new Date().getTime();
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
  entities : [],
  projectiles : [],
  lastUpdate : new Date().getTime(),
  throttle : {sinceLastUpdate: 0, max: 0.05 },
  update : function() {
    var i;
    for(i=0; i<this.projectiles.length; i += 1){
      if(this.projectiles[i].lifetime != NaN);
        this.projectiles[i].update();
    }

    for(i=0; i<this.entities.length; i += 1){
      this.entities[i].update();
    }

    var updateInfo = this.player.update();
    this.throttle.sinceLastUpdate += timestep;
    if(this.throttle.sinceLastUpdate >= this.throttle.max){
      this.throttle.sinceLastUpdate = 0;
      if(updateInfo.moveInfo){
        Entities.update(this.player.id, {$set: updateInfo.moveInfo});
      }
    }

    /*
    for(i=0; i<scene.children.length; i += 1) {
      if(scene.children[i].name=="ally" && scene.children[i].position.lastMove!==undefined
        && ( scene.children[i].lastMove.x !== 0 || scene.children[i].position.lastMove.y !== 0 )) {
        scene.children[i].position.x += (scene.children[i].position.lastMove.x*=timestep);
        scene.children[i].position.y += (scene.children[i].position.lastMove.y*=timestep);
      }
    }
    */
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
  timestep = (new Date().getTime() - game.lastUpdate)/1000;
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

  ammo = new THREE.Mesh(new THREE.CubeGeometry(1,5,1), new THREE.MeshBasicMaterial({color:0xFF0000}));
  camera = new THREE.PerspectiveCamera(  VIEW_ANGLE,
                                  ASPECT,
                                  NEAR,
                                  FAR  );
  scene = new THREE.Scene();
  camera.position.z = 400;
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
  query.forEach(function (entity) {
    if(entity.type === 'ally'){
      var newAlly = new Ally(entity._id, entity.x, entity.y, {x: entity.lastMove.x, y: entity.lastMove.y} );
      game.entities.push(newAlly);
      //scene.add(newAlly.mesh);
    }
  });
  handle = query.observeChanges({
    changed: function (id, fields) {
      if(id===game.player.id)
        return;
      var changed = scene.getObjectByName(id);
      //console.log(fields);
      $.extend(changed.updated, fields);
      if(fields.time){
        var delay = (new Date().getTime() - fields.time)/1000;
        changed.target = {
          x: changed.updated.x+2*delay*changed.updated.lastMove.x,
          y: changed.updated.y+2*delay*changed.updated.lastMove.y,
          time: new Date().getTime() + delay*1000
        };
        //console.log(changed.target); 
        //console.log(changed.position); 
      }
    },
    added: function (id) {
      if(id===game.player.id)
        return;
      console.log('Added entity id ' + id);
      var entity = Entities.findOne(id);
      if(entity.type === 'ally'){
        var newAlly = new Ally(id, entity.x, entity.y, {x: entity.lastMove.x, y: entity.lastMove.y} );
        game.entities.push(newAlly);
        //scene.add(newAlly.mesh);
      }
    },
    removed: function (id) {
      var changed = scene.getObjectByName(id);
      scene.remove(changed);
    }
  });

  query = Projectiles.find({});
  query.forEach(function (prj) { //direction, speed, cooldown, lifetime, start, from
      console.log(prj);
    game.projectiles.push(new Projectile(
        new THREE.Vector3(prj.posx, prj.posy, prj.posz),
        new THREE.Vector3(prj.dirx, prj.diry, prj.dirz),
        prj.speed, prj.lifetime, prj.start, prj.from));
  });
  handle = query.observeChanges({
  /*
    changed: function (id, fields) {
      if(id===game.player.id)
        return;
      var changed = scene.getObjectByName(id);
      $.extend(changed.updated, fields);
    },*/
    added: function (id) {
      var prj = Projectiles.findOne(id);
      game.projectiles.push(new Projectile(
        new THREE.Vector3(prj.posx, prj.posy, prj.posz),
        new THREE.Vector3(prj.dirx, prj.diry, prj.dirz),
        prj.speed, prj.lifetime, prj.start, prj.from
      ));

    }/*,
    removed: function (id) {
      var changed = scene.getObjectByName(id);
      scene.remove(changed);
    }*/
  });
  animate();
};

//////////////////////////////////////////
//
// Meteor client code
//
//////////////////////////////////////////
Meteor.startup(function () {
  var entityId = Entities.insert({x: 0, y: 0, lastMove: {x: 0, y: 0 }, time: new Date().getTime(), type: 'ally'});
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


