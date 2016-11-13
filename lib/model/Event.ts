import {Schema, model, Document} from 'mongoose';
import User from './User';

export interface EventDocument extends Document {
  id: string;
  owner: User;
  numberOfPlayersNeeded: number;
  date: string;
  place: string;
  players: Array<User>;
}

export const EventModel = model<EventDocument>('Event', new Schema({
  numberOfPlayersNeeded: String,
  owner: Object,
  date: String,
  place: String,
  players: Array
}));
