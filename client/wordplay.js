////////// Main client application logic //////////

//////
////// Utility functions
//////

var player = function () {
  return Players.findOne(Session.get('player_id'));
};

var scene = function () {
  var me = player();
  return me && me.scene_id && Games.findOne(me.scene_id);
};

var clear_selected_positions = function () {
  for (var pos = 0; pos < 16; pos++)
    Session.set('selected_' + pos, false);
};

//////
////// lobby template: shows everyone not currently playing, and
////// offers a button to start a fresh scene.
//////

Template.lobby.show = function () {
  // only show lobby if we're not in a scene
  return !scene();
};

Template.lobby.waiting = function () {
  var players = Players.find({_id: {$ne: Session.get('player_id')},
                              name: {$ne: ''},
                              scene_id: {$exists: false}});

  return players;
};

Template.lobby.count = function () {
  var players = Players.find({_id: {$ne: Session.get('player_id')},
                              name: {$ne: ''},
                              scene_id: {$exists: false}});

  return players.count();
};

Template.lobby.disabled = function () {
  var me = player();
  if (me && me.name)
    return '';
  return 'disabled="disabled"';
};


Template.lobby.events({
  'keyup input#myname': function (evt) {
    var name = $('#lobby input#myname').val().trim();
    Players.update(Session.get('player_id'), {$set: {name: name}});
  },
  'click button.startscene': function () {
    Meteor.call('start_new_scene');
  }
});

//////
////// board template: renders the board and the clock given the
////// current scene.  if there is no scene, show a splash screen.
//////
/*
Template.board.square = function (i) {
  var g = scene();
  return g && g.board && g.board[i] || SPLASH[i];
};

Template.board.selected = function (i) {
  return Session.get('selected_' + i);
};

Template.board.clock = function () {
  var clock = scene() && scene().clock;

  if (!clock || clock === 0)
    return;

  // format into M:SS
  var min = Math.floor(clock / 60);
  var sec = clock % 60;
  return min + ':' + (sec < 10 ? ('0' + sec) : sec);
};Template.board.events({
  'click .square': function (evt) {
    var textbox = $('#scratchpad input');
    textbox.val(textbox.val() + evt.target.innerHTML);
    textbox.focus();
  }
});

*/


//////
////// scores shows everyone's score and word list.
//////
/*
Template.scores.show = function () {
  return !!scene();
};

*/
Template.scores.players = function () {
  return scene() && scene().players;
};
Template.player.winner = function () {
  var g = scene();
  if (g.winners && _.include(g.winners, this._id))
    return 'winner';
  return '';
};

Template.container.events({
  'keyup': function (evt) {
    console.log(evt);
  },
  'click': function (evt) {
      Spheres.add()
  }
});
//////
////// Initialization
//////

Meteor.startup(function () {
  
    new_viewport();
  // Allocate a new player id.
  //
  // XXX this does not handle hot reload. In the reload case,
  // Session.get('player_id') will return a real id. We should check for
  // a pre-existing player, and if it exists, make sure the server still
  // knows about us.
  var player_id = Players.insert({name: '', idle: false});
  Session.set('player_id', player_id);

  // subscribe to all the players, the scene i'm in, and all
  // the words in that scene.
  Deps.autorun(function () {
    Meteor.subscribe('players');

    if (Session.get('player_id')) {
      var me = player();
      if (me && me.scene_id) {
        Meteor.subscribe('scenes', me.scene_id);
      }
    }
  });

  // send keepalives so the server can tell when we go away.
  //
  // XXX this is not a great idiom. meteor server does not yet have a
  // way to expose connection status to user code. Once it does, this
  // code can go away.
  Meteor.setInterval(function() {
    if (Meteor.status().connected)
      Meteor.call('keepalive', Session.get('player_id'));
  }, 20*1000);
});
