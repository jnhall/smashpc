 Meteor.startup(function () {
    Entities.remove({});
    Projectiles.remove({});
  });

Meteor.publish('entities', function () {
  return Entities.find({});
});