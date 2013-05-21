 Meteor.startup(function () {
    Entities.remove({});
  });

Meteor.publish('entities', function () {
  return Entities.find({});
});