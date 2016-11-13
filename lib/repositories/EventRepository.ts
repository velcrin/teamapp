import {EventModel, EventDocument} from '../model/Event';
import User from '../model/User';
import {without} from 'lodash';

export async function createEvent(owner: User, numberOfPlayersNeeded: number, date: string, place: string): Promise<EventDocument> {
  return await EventModel.create({
    owner,
    numberOfPlayersNeeded,
    date,
    place,
    players: [owner]
  });
}

export async function findEventById(id: string): Promise<EventDocument> {
  return await EventModel.findById(id).exec();
}

export async function findUserEvents(user: User): Promise<Array<EventDocument>> {
  return await EventModel.find({'owner.id': user.id}).exec();
}

export async function participateToEvent(eventId: string, newPlayer: User) {
  const event = await this.findEventById(eventId);
  event.players = [...event.players, newPlayer];
  return await event.save();
}

export async function withdrawFromEvent(eventId: string, player: User) {
  const event = await this.findEventById(eventId);
  event.players = without(event.players, player);
  return await event.save();
}