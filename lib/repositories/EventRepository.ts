import Event from '../model/Event';
import User from '../model/User';
import {find, without, filter} from 'lodash';
const UUID = require('uuid-js');

function createUUID() {
  return UUID.create().toString();
}

export default class EventRepository {
  events: Array<Event> = [];

  createEvent(owner: User, numberOfPlayersNeeded: number, date: string, place: string) {
    const newEvent: Event = {
      id: createUUID(),
      owner,
      numberOfPlayersNeeded,
      date,
      place,
      players: [owner]
    };
    this.events = [...this.events, newEvent];
    return newEvent;
  }

  findEvent(matcher: Object): Event {
    return find(this.events, matcher);
  }

  findEvents(matcher: Object): Array<Event> {
    return filter(this.events, matcher);
  }

  participate(matcher: Object, newPlayer: User): void {
    const event = this.findEvent(matcher);
    event.players = [...event.players, newPlayer];
  }

  withdraw(matcher: Object, player: User): void {
    const event = this.findEvent(matcher);
    event.players = without(event.players, player);
  }
}