 Meteor.startup(function () {
    Balls.remove({});
  });

Meteor.publish('balls', function () {
  return Balls.find({});
});