(function() {

  angular.module('teamapp').controller('HomeController', function() {
    this.event = {
      date: new Date(),
      numberOfPlayers: 10
    };
  });
})();
