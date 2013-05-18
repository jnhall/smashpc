////////// Shared code (client and server) //////////

Games = new Meteor.Collection('games');
// { board: ['A','I',...], clock: 60,
//   players: [{player_id, name}], winners: [player_id] }

Enemies = new Meteor.Collection('enemies');
// {player_id: 10, game_id: 123, word: 'hello', state: 'good', score: 4}

Players = new Meteor.Collection('players');
// {name: 'matt', game_id: 123}

Scenes = new Meteor.Collection('scenes');

Spheres = new Meteor.Collection('spheres');

var sphere;

bounce = function(a) {
  console.log(a);
  if(!sphere){

  }
  console.log("BOUNCE");
}

// generate a new random selection of letters.
new_viewport = function () {
 // set the scene size
  var WIDTH = 400,
      HEIGHT = 300;

  // set some camera attributes
  var VIEW_ANGLE = 45,
      ASPECT = WIDTH / HEIGHT,
      NEAR = 0.1,
      FAR = 10000;

  // get the DOM element to attach to
  // - assume we've got jQuery to hand
  var $container = $('#container');

  // create a WebGL renderer, camera
  // and a scene
  var renderer = new THREE.WebGLRenderer();
  var camera = new THREE.PerspectiveCamera(  VIEW_ANGLE,
                                  ASPECT,
                                  NEAR,
                                  FAR  );
  var scene = new THREE.Scene();

  // the camera starts at 0,0,0 so pull it back
  camera.position.z = 300;

  // start the renderer
  renderer.setSize(WIDTH, HEIGHT);

  // attach the render-supplied DOM element
  $container.append(renderer.domElement);
/*
  // create the sphere's material
  var sphereMaterial = new THREE.MeshLambertMaterial(
  {
      color: 0xCC0000
  });

  // set up the sphere vars
  var radius = 50, segments = 16, rings = 16;

  // create a new mesh with sphere geometry -
  // we will cover the sphereMaterial next!
  sphere = new THREE.Mesh(
     new THREE.SphereGeometry(radius, segments, rings),
     sphereMaterial);
  sphere.name = "sphere";

  // add the sphere to the scene
  scene.add(sphere);
*/
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

  // draw!
  renderer.render(scene, camera);
  return scene;
};
/*
// returns an array of valid paths to make the specified word on the
// board.  each path is an array of board positions 0-15.  a valid
// path can use each position only once, and each position must be
// adjacent to the previous position.
paths_for_word = function (board, word) {
  var valid_paths = [];

  var check_path = function (word, path, positions_to_try) {
    // base case: the whole word has been consumed.  path is valid.
    if (word.length === 0) {
      valid_paths.push(path);
      return;
    }

    // otherwise, try to match each available position against the
    // first letter of the word, avoiding any positions that are
    // already used by the path.  for each of those matches, descend
    // recursively, passing the remainder of the word, the accumulated
    // path, and the positions adjacent to the match.

    for (var i = 0; i < positions_to_try.length; i++) {
      var pos = positions_to_try[i];
      if (board[pos] === word[0] && path.indexOf(pos) === -1)
        check_path(word.slice(1),      // cdr of word
                   path.concat([pos]), // append matching loc to path
                   ADJACENCIES[pos]);  // only look at surrounding tiles
    }
  };

  // start recursive search w/ full word, empty path, and all tiles
  // available for the first letter.
  check_path(word, [], [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]);

  return valid_paths;
};
*/
Meteor.methods({
  /*score_word: function (word_id) {
    var word = Words.findOne(word_id);
    var game = Games.findOne(word.game_id);

    // client and server can both check: must be at least three chars
    // long, not already used, and possible to make on the board.
    if (word.length < 3
        || Words.find({game_id: word.game_id, word: word.word}).count() > 1
        || paths_for_word(game.board, word.word).length === 0) {
      Words.update(word._id, {$set: {score: 0, state: 'bad'}});
      return;
    }

    // now only on the server, check against dictionary and score it.
    if (Meteor.isServer) {
      if (DICTIONARY.indexOf(word.word.toLowerCase()) === -1) {
        Words.update(word._id, {$set: {score: 0, state: 'bad'}});
      } else {
        var score = Math.pow(2, word.word.length - 3);
        Words.update(word._id, {$set: {score: score, state: 'good'}});
      }
    }
  }*/

  move_left: function (player_id) {
    
  }
});


if (Meteor.isServer) {
  // publish all the non-idle players.
  Meteor.publish('players', function () {
    return Players.find({idle: false});
  });

  // publish single games
  Meteor.publish('scenes', function (id) {
    return Scenes.find({_id: id});
  });
/*
  // publish all my words and opponents' words that the server has
  // scored as good.
  Meteor.publish('words', function (game_id, player_id) {
    return Words.find({$or: [{game_id: game_id, state: 'good'},
                             {player_id: player_id}]});
  });*/
}

