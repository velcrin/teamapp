import {Schema, model, Document} from 'mongoose';
import User from '../model/User';

const UserModel = model<User & Document>('User', new Schema({
  name: String,
  facebookId: String,
  avatar: String
}));

export async function createUser(name: string, facebookId: string, avatar: string): Promise<User> {
  return await UserModel.create({name, facebookId, avatar});
}

export async function findUserById(id: string): Promise<User> {
  return await UserModel.findById(id).exec();
}

export async function findUserByFacebookId(facebookId: string): Promise<User> {
  return await UserModel.findOne({facebookId}).exec();
}