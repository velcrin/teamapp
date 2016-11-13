import {Event} from '../model/Event';
import {Schema, model, Document} from 'mongoose';
import User from '../model/User';
import {without} from 'lodash';

const EventModel = model<Event & Document>('Event', new Schema({
  numberOfPlayersNeeded: String,
  owner: {type: Schema.Types.ObjectId, ref: 'User'},
  date: String,
  place: String,
  players: [{type: Schema.Types.ObjectId, ref: 'User'}]
}));

export async function createEvent(owner: User, numberOfPlayersNeeded: number, date: string, place: string): Promise<Event> {
  return await EventModel.create({
    owner,
    numberOfPlayersNeeded,
    date,
    place,
    players: [owner]
  });
}

export async function findEventById(id: string): Promise<Event> {
  return await EventModel.findById(id)
    .populate('owner')
    .populate('players')
    .exec();
}

export async function findUserEvents(user: User): Promise<Array<Event>> {
  return await EventModel.find({'owner': user}).exec();
}

export async function participateToEvent(eventId: string, newPlayer: User) {
  const event = await this.findEventById(eventId);
  event.players = [...event.players, newPlayer];
  return await event.save();
}

export async function withdrawFromEvent(eventId: string, player: User) {
  return await EventModel.update({_id: eventId}, {$pull: {'players': player.id}});
}

export async function isPlayingEvent(eventId, userId) {
  const event = await EventModel.findOne({_id: eventId, 'players': userId}).exec();
  return Promise.resolve(!!event);
}