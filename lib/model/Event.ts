import User from './User';

export default class Event {
  id: string;
  owner: User;
  numberOfPlayersNeeded: number;
  date: string;
  place: string;
  players: Array<User>;
}