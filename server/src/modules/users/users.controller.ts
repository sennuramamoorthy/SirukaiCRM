import { Request, Response } from 'express';
import * as usersService from './users.service';
import { sendSuccess, sendError } from '../../utils/response';

export function list(req: Request, res: Response): void {
  sendSuccess(res, usersService.listUsers());
}

export function getById(req: Request, res: Response): void {
  const user = usersService.getUserById(Number(req.params.id));
  if (!user) { sendError(res, 'User not found', 404); return; }
  sendSuccess(res, user);
}

export function create(req: Request, res: Response): void {
  try {
    const user = usersService.createUser(req.body);
    sendSuccess(res, user, 'User created', 201);
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('UNIQUE')) {
      sendError(res, 'Email already in use', 409);
      return;
    }
    throw err;
  }
}

export function update(req: Request, res: Response): void {
  const user = usersService.updateUser(Number(req.params.id), req.body);
  sendSuccess(res, user, 'User updated');
}

export function remove(req: Request, res: Response): void {
  usersService.deleteUser(Number(req.params.id));
  sendSuccess(res, null, 'User deactivated');
}
