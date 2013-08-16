'use strict';
 Meteor.startup(function () {
    Entities.remove({});
    Projectiles.remove({});
  });

Meteor.publish('entities', function () {
  return Entities.find({});
});

Meteor.methods({
    getServerTime: function () {
        var _time = new Date().getTime();
        console.log(_time);
        return _time;
    }
});