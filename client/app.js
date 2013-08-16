/*jslint white: true, sloppy: true */
'use strict';
// entire game state, timestep between last render, and object full of currently held keys
var game,
  timestep = 0,
  down = {},
  camera,
  renderer,
  scene,
  AXES = ['x', 'y'],
  LEVEL = {
    dims: {
      x: 1000,
      y: 1000
    }
  },
  BOT_ACCURACY = 1,
  GAME_Z = 0,
  katamari;
var ammo;

  
Physijs.scripts.worker = 'packages/physijs/lib/physijs_worker.js';
Physijs.scripts.ammo = 'packages/physijs/lib/ammo.js';

// Rotate an object around an arbitrary axis in world space
var rotWorldMatrix;
function rotateAroundWorldAxis(object, axis, radians) {
  rotWorldMatrix = new THREE.Matrix4();
  rotWorldMatrix.makeRotationAxis(axis.normalize(), radians);
  rotWorldMatrix.multiply(object.matrix);
  object.matrix = rotWorldMatrix;
  object.rotation.setFromRotationMatrix(object.matrix);
}

//////////////////////////////////////////
//
// Enemy prototype
//
//////////////////////////////////////////

var mesh, Enemy = function(name, targets, startTime) {
  var geometry = new THREE.CubeGeometry(10,10,100);
  geometry.applyMatrix(new THREE.Matrix4().makeRotationX(Math.PI));
  var material = new THREE.MeshLambertMaterial({color: 0xFF00FF });
  mesh = new THREE.Mesh( geometry, material );
  game.add(mesh);

  mesh.name = name;
  mesh.type = 'enemy';

  this.mesh = mesh;

  this.motion = {
    x: {curr: 0, accel: 2000, deccel: 3000, max: 200, magnitude: 0},
    y: {curr: 0, accel: 1500, deccel: 2000, max: 150, magnitude: 0}};


  this.targets = targets.slice(0);

  this.nextTarget = 0;  

  mesh.target = {
    x: this.targets[0].x,
    y: this.targets[0].y,
    time: this.targets[0].time,
    next: this.targets[0].next
  };
  //console.log("is a "+startTime);

  this.lastDate = startTime;

  this.isActive = false;
};

Enemy.prototype.move = function() {
  if(!this.isActive) {
    if(new Date().getTime() < this.lastDate){
      //console.log((new Date().getTime())+"<"+this.startTime)
      return;

    }
    else
      this.isActive = true;
  }
  var timeFactor = (new Date().getTime() - this.lastDate)/(this.mesh.target.time*1000);
  while(timeFactor >= 1) {
    this.lastDate += this.mesh.target.time*1000;
    this.mesh.target.x = this.targets[this.mesh.target.next].x;
    this.mesh.target.y = this.targets[this.mesh.target.next].y;
    this.mesh.target.time = this.targets[this.mesh.target.next].time;
    this.mesh.target.next = this.targets[this.mesh.target.next].next;
    timeFactor = (new Date().getTime() - this.lastDate)/(this.mesh.target.time*1000);
  }

  var dx = (this.targets[this.mesh.target.next].x - this.mesh.target.x)*timeFactor;
  var dy = (this.targets[this.mesh.target.next].y - this.mesh.target.y)*timeFactor;

  this.mesh.position = new THREE.Vector3(this.mesh.target.x+dx, this.mesh.target.y+dy, GAME_Z);

  /*var moveInfo = { x: null, y: null, lastMove:{x: 0, y: 0} , time: null}, motion, i;

  var arrived = false;
  for(i=0; i<AXES.length; i += 1) {  
    if(this.mesh.target[AXES[i]] === this.mesh.position[AXES[i]]
      && this.mesh.target[AXES[i]] === this.mesh.position[AXES[i]] ){
      if(arrived === true){
        this.nextTarget = (this.nextTarget+1)%this.targets.length;
        this.mesh.target = {
          x: this.targets[this.nextTarget].x, y: this.targets[this.nextTarget].y
        };
      }
      arrived = true;
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
  }*/
};

Enemy.prototype.update = function() {
    return {
      moveInfo: this.move(),
      collisionInfo: this.collisions()
  };
};

Enemy.prototype.collisions = function() {
  if(this.mesh.updated) {
    if(this.mesh.updated.collision) {
      this.onCollision(this.mesh.updated.collision.projectile)
    }
  }
}

Enemy.prototype.onCollision = function(name) {
  scene.remove(scene.getObjectByName(this.mesh.name));
};

//////////////////////////////////////////
//
// Projectile prototype
//
//////////////////////////////////////////

var Projectile = function(mtrId, position, direction, speed, lifetime, start, from) {
  this.direction = new THREE.Vector3().copy(direction);
  this.from = from;
  this.speed = speed;
  this.mtrId = mtrId;

  this.mesh = new THREE.Mesh(ammo.geometry, ammo.material);
  this.mesh.position.copy(position);
  this.mesh.position.add(
    new THREE.Vector3().copy(this.direction).multiplyScalar(this.speed * (new Date().getTime() - start)/1000));
  this.lifetime = lifetime;
  game.add(this.mesh);
  this.mesh.name = 'projectile';
  this.mesh.geometry.computeBoundingBox();
  this.rayOrigin = new THREE.Vector3(this.mesh.geometry.boundingBox.min.x,this.mesh.geometry.boundingBox.min.y,GAME_Z);
  this.rayDirection = new THREE.Vector3(this.mesh.geometry.boundingBox.max.x,this.mesh.geometry.boundingBox.max.y,GAME_Z)
    .sub(this.rayOrigin);
  this.rayDistance = this.rayDirection.length();
  this.rayOrigin.add(this.mesh.position);
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
  var motion = new THREE.Vector3().copy(this.direction).multiplyScalar(this.speed*timestep);
  this.mesh.position.add(motion);
  this.rayOrigin.add(motion);

  // for now, only check collisions from the local player
  // maybe broadcast collisions detected locally?
  if(this.from !== game.player.name)
    return;

  var ray = new THREE.Raycaster(this.rayOrigin, this.rayDirection, 0, this.rayDistance);
  //console.log(ray);
  var i;
  for(i=0;i<game.entities.length;i++) {
    var intersects = ray.intersectObject(game.entities[i].mesh, true);
    //console.log(scene.children);
    if(intersects.length>0) {
      if(intersects[0].object.type === 'enemy') {
        //game.entities[i].onCollision(intersects[0]);
        //var entity = Entities.findOne(intersects[0].object.name);
        //Entities.remove(intersets[0].object.name);
        //scene.getObjectByName(entity._id);
        var objects = {
          projectile : this.mtrId,
          object: game.entities[i].mesh.name
        };
        Projectiles.update(this.mtrId, {$set: { collision : objects }});
        Entities.update(intersects[0].object.name, {$set: { collision : objects }});
        //scene.remove(this.mesh);
      }
    }
  }
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
  game.add(mesh);

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
  game.add(mesh);

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
  //console.log(this.mesh.position);
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

Player.prototype.forward = function() {
  return (new THREE.Vector3(0, 1, 0)).applyMatrix4(this.mesh.matrix);
}
Player.prototype.up = function() {
  return (new THREE.Vector3(0, 0, 1)).applyMatrix4(this.mesh.matrix);
}

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
  },

  add : function(mesh) {
    mesh.position.z = GAME_Z;
    scene.add(mesh);
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
  scene = new Physijs.Scene();
  camera.position.z = 400;
  camera.position.y = -400;
  camera.rotateX(45);
  game.player = new Player(name);
  game.player.mesh.add(camera);

  var Katamari = function(radius) {
    var mesh = new THREE.Mesh(new THREE.SphereGeometry(radius), new THREE.MeshPhongMaterial({color:0xDADDAB}));
    mesh.position = new THREE.Vector3().copy(mesh.position);
    mesh.position.add(game.player.forward().multiplyScalar(radius/2));
    mesh.position.add(game.player.up().multiplyScalar(radius/2));
    game.player.mesh.add(mesh);

    this.radius = radius;
    this.mesh = mesh;
    this.pos = this.mesh.parent.position;
    this.lastPos = new THREE.Vector3().copy(this.mesh.position);
  };

  Katamari.prototype.update = function() {
    //this.mesh.rotateX(0.01);
    //console.log(this.circumference/(this.pos.y - this.lastPos.y));
    var d = {
        x: this.pos.x - this.lastPos.x,
        y: this.lastPos.y - this.pos.y
      },
      angle;
      /*
    if(d.y!==0)
      this.mesh.rotateOnAxis(
        new THREE.Vector3(1,0,0).applyMatrix4(this.mesh.parent.matrix).normalize(),
        d.y/this.magic);
    if(d.x!==0)
      this.mesh.rotateOnAxis(
        new THREE.Vector3(0,0,-1).applyMatrix4(this.mesh.parent.matrix).normalize(),
        d.x/this.magic);*/
    if(d.y!==0) {
      angle = d.y / (2 * Math.PI * this.radius) * Math.PI;
      rotateAroundWorldAxis(this.mesh, new THREE.Vector3(1,0,0), angle);
    }
    if(d.x!==0) {
      angle = d.x / (2 * Math.PI * this.radius) * Math.PI;
      rotateAroundWorldAxis(this.mesh, new THREE.Vector3(0,1,0), angle);
    }
    this.lastPos.copy(this.mesh.parent.position);
  };
  katamari = new Katamari(50);
  game.entities.push(katamari);
  /*radius — sphere radius. Default is 50.
widthSegments — number of horizontal segments. Minimum value is 3, and the default is 8.
heightSegments — number of vertical segments. Minimum value is 2, and the default is 6.
phiStart — specify horizontal starting angle. Default is 0.
phiLength — specify horizontal sweep angle size. Default is Math.PI * 2.
thetaStart — specify vertical starting angle. Default is 0.
thetaLength — specify vertical sweep angle size. Default is Math.PI.*/

  var Background = function(tileWidth, tileHeight, fieldWidth, fieldHeight) {
    var tiles = [],
      grid = {
        width: Math.ceil(fieldWidth / tileWidth),
        height: Math.ceil(fieldHeight / tileHeight)
      },
      offset = {
        width: tileWidth * (-grid.width/2 + 1/2),
        height: tileHeight * (-grid.height/2 + 1/2)
      },
      i,
      j,
      tile,
      bgColor = function(i, j) {
        var colors = {
          even: 0xBAFF0D,
          odd: 0xAD0DAB
        };
        if( i%2===0&&j%2===0 || i%2!==0&&j%2!==0 ) {
          return colors.even;
        }
        return colors.odd;
      };

    for(i=0;i<grid.width;i++) {
      for(j=0;j<grid.height;j++) {
        tile = new THREE.Mesh(new THREE.PlaneGeometry(tileWidth, tileHeight), new THREE.MeshLambertMaterial({
          color: bgColor(i, j),
          transparent: true,
          opacity: 0.5
        }));
        console.log(tile.material);
        tile.position = new THREE.Vector3(
          offset.width + i * tileWidth,
          offset.height + j * tileHeight,
          0);
        scene.add(tile);
        tiles.push(tile);
      }
    }
  }
  var background = new Background(100, 100, LEVEL.dims.x, LEVEL.dims.y);

  var Field = function(count, width, height, center, objGen, objMod) {
    var i,
      obj;

    for(i=0;i<count;i++) {
      obj = new objGen();
      if(objMod) {
        objMod(objGen);
      }
      console.log(obj);
      obj.mesh.position.x = center.x + (Math.random() - 0.5) * width;
      obj.mesh.position.y = center.y + (Math.random() - 0.5) * height;
      scene.add(obj.mesh);
      game.entities.push(obj);
    }
  }
  var field = new Field(
    100,
    LEVEL.dims.x,
    LEVEL.dims.y,
    new THREE.Vector3(0,0,0),
    function () {
      var mesh = new Physijs.BoxMesh(new THREE.CubeGeometry(50, 50, 50), new THREE.MeshPhongMaterial({color: 0x0000DB}));
      this.mesh = mesh;
      this.parented = false;
      var katPos;
      this.update = function() {
        katPos = katamari.mesh.localToWorld(new THREE.Vector3(0,0,0));
        //console.log(game.player.mesh.position.distanceTo(this.mesh.position));
        if(this.parented)
          return;
        else if(katPos.distanceTo(this.mesh.position) < 50
          || katPos.distanceTo(this.mesh.position) < 50) {
          var offset = new THREE.Vector3().copy(this.mesh.position).sub(katPos);
          katamari.mesh.add(this.mesh);
          this.mesh.rotation.setFromQuaternion(katamari.mesh.rotation._quaternion.clone().inverse());
          this.mesh.position = offset.applyMatrix4(new THREE.Matrix4().getInverse(katamari.mesh.matrix));
          this.mesh.material.color.setHex(0x00DD00);
          this.parented = true;
        }
      }
    },
    function (obj) {
      return;
    }
  );

  pointLight.position.x = 10;
  pointLight.position.y = 50;
  pointLight.position.z = 130;
  game.player.mesh.add(pointLight);

  renderer = new THREE.WebGLRenderer();
  renderer.setClearColorHex(0x000000);
  renderer.setSize(WIDTH, HEIGHT);

  var $container = $('.container');
  $container.append(renderer.domElement);
  //scene.add(new THREE.Mesh(new THREE.CubeGeometry(5,5,5), new THREE.MeshBasicMaterial({color: 0xff0000})));
  query = Entities.find({});
  query.forEach(function (entity) {
    if(entity._id === game.player.id)
      return;
    if(entity.type === 'ally'){
      var newAlly = new Ally(entity._id, entity.x, entity.y, {x: entity.lastMove.x, y: entity.lastMove.y} );
      game.entities.push(newAlly);
      //scene.add(newAlly.mesh);
    }
    if(entity.type === 'enemy' && !scene.getObjectByName(entity._id)){
        console.log(entity);
      var newEnemy = new Enemy(entity._id, entity.targets, entity.startTime );
      game.entities.push(newEnemy);

    }
  });
  handle = query.observeChanges({
    changed: function (id, fields) {
      if(id===game.player.id)
        return;
      var changed = scene.getObjectByName(id);
      //console.log(fields);
      if(!changed.updated)
        changed.updated = {};
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
      if(changed.type === 'enemy') {
        console.log(changed);
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
      if(entity.type === 'enemy' && !scene.getObjectByName(id)){
        console.log('Startime:'+entity.startTime);
        console.log(entity);
        var newEnemy = new Enemy(id, entity.targets, entity.startTime );
        game.entities.push(newEnemy);

      }
    },
    removed: function (id) {
      //var changed = scene.getObjectByName(id);
      //scene.remove(changed);
    }
  });

  query = Projectiles.find({});
  query.forEach(function (prj) { //direction, speed, cooldown, lifetime, start, from
      console.log(prj);
      var projectile = new Projectile(
        prj._id,
        new THREE.Vector3(prj.posx, prj.posy, prj.posz),
        new THREE.Vector3(prj.dirx, prj.diry, prj.dirz),
        prj.speed, prj.lifetime, prj.start, prj.from);

    game.projectiles.push(projectile);
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
      var projectile = new Projectile(
        id,
        new THREE.Vector3(prj.posx, prj.posy, prj.posz),
        new THREE.Vector3(prj.dirx, prj.diry, prj.dirz),
        prj.speed, prj.lifetime, prj.start, prj.from);
      projectile.mesh.geometry.computeBoundingBox();
    game.projectiles.push(projectile);

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
  // clocks
   setInterval(function () {
      Meteor.call("getServerTime", function (error, result) {
          Session.set("time", result);
      });
  }, 1000);
  // adding player to entities on load
  var entityId = Entities.insert({x: 0, y: 0, lastMove: {x: 0, y: 0 }, time: new Date().getTime(), type: 'ally'});
  // initialize the client gui
  init(entityId);
  // resize the window so we can maintain ratio
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
  'click input#spawn' : function () {

  var testTargets = [
      {x: -140, y: 140, time: 5, next: 1},
      {x: 140, y: 140, time: 5, next: 0}
    ],
    startTime = Session.get('time');
  if(!startTime)
  return;
    //while(!(startTime = Session.get('time')+5000)){console.log(Session.get('time'));};
  var enemyId = Entities.insert({
      targets: testTargets,
      startTime: startTime,
      type: 'enemy'
    });
  game.entities.push(new Enemy(enemyId, 
      testTargets,
      startTime));
  /*
    var entities = Entities.find({});
    entities.forEach(function (entity) {  
      Entities.remove(entity._id);
    });
*/
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


