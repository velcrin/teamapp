import User from './User';

export interface Event {
  id: string;
  owner: User;
  numberOfPlayersNeeded: number;
  date: string;
  place: string;
  players: Array<User>;
}
