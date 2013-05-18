////////// Server only logic //////////

Meteor.methods({
  start_new_scene: function (evt) {
    // create a new scene w/ fresh board
    var scene_id = Scenes.insert({scene: new_viewport()});

    // move everyone who is ready in the lobby to the scene
    Players.update({scene_id: null, idle: false, name: {$ne: ''}},
                   {$set: {scene_id: scene_id}},
                   {multi: true});
    // Save a record of who is in the scene, so when they leave we can
    // still show them.
    /*
    var p = Players.find({scene_id: scene_id},
                         {fields: {_id: true, name: true}}).fetch();*/
    Scenes.update({_id: scene_id}, {$set: {players: p}});


/*
    // wind down the game clock
    var clock = 120;
    var interval = Meteor.setInterval(function () {
      clock -= 1;
      Scenes.update(game_id, {$set: {clock: clock}});

      // end of game
      if (clock === 0) {
        // stop the clock
        Meteor.clearInterval(interval);
        // declare zero or more winners
        var scores = {};
        Words.find({game_id: game_id}).forEach(function (word) {
          if (!scores[word.player_id])
            scores[word.player_id] = 0;
          scores[word.player_id] += word.score;
        });
        var high_score = _.max(scores);
        var winners = [];
        _.each(scores, function (score, player_id) {
          if (score === high_score)
            winners.push(player_id);
        });
        Scenes.update(game_id, {$set: {winners: winners}});
      }
    }, 1000);
*/
    return scene_id;
  },


  keepalive: function (player_id) {
    Players.update({_id: player_id},
                  {$set: {last_keepalive: (new Date()).getTime(),
                          idle: false}});
  }
});

Meteor.setInterval(function () {
  var now = (new Date()).getTime();
  var idle_threshold = now - 70*1000; // 70 sec
  var remove_threshold = now - 60*60*1000; // 1hr

  Players.update({last_keepalive: {$lt: idle_threshold}},
                 {$set: {idle: true}});

  // XXX need to deal with people coming back!
  // Players.remove({$lt: {last_keepalive: remove_threshold}});

}, 30*1000);
