import User from '../model/User';
import {find} from 'lodash';
const UUID = require('uuid-js');

function createUUID() {
  return UUID.create().toString();
}

export default class UserRepository {

  users: Array<User> = [];

  createUser(profile) {

    const newUser: User = {
      id: createUUID(),
      facebookId: profile.id,
      name: profile.name.givenName,
      avatar: profile.photos[0].value
    };

    this.users = [...this.users, newUser];
    return newUser;
  }

  findUser(matcher: Object) {
    return find(this.users, matcher);
  }
}