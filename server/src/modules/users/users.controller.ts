import { Request, Response } from 'express';
import * as usersService from './users.service';
import { sendSuccess, sendError } from '../../utils/response';

export async function list(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await usersService.listUsers());
}

export async function getById(req: Request, res: Response): Promise<void> {
  const user = await usersService.getUserById(Number(req.params.id));
  if (\!user) { sendError(res, 'User not found', 404); return; }
  sendSuccess(res, user);
}

export async function create(req: Request, res: Response): Promise<void> {
  try {
    const user = await usersService.createUser(req.body);
    sendSuccess(res, user, 'User created', 201);
  } catch (err: unknown) {
    if (err instanceof Error && (err.message.includes('UNIQUE') || err.message.includes('unique'))) {
      sendError(res, 'Email already in use', 409);
      return;
    }
    throw err;
  }
}

export async function update(req: Request, res: Response): Promise<void> {
  const user = await usersService.updateUser(Number(req.params.id), req.body);
  sendSuccess(res, user, 'User updated');
}

export async function remove(req: Request, res: Response): Promise<void> {
  await usersService.deleteUser(Number(req.params.id));
  sendSuccess(res, null, 'User deactivated');
}
