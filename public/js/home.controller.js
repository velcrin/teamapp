(function() {

  angular.module('teamapp').controller('HomeController', function() {
    this.event = {
      date: new Date(),
      numberOfPlayersNeeded: 10
    };
  });
})();
