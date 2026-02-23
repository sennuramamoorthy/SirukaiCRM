import { Request, Response } from 'express';
import * as authService from './auth.service';
import { sendSuccess, sendError } from '../../utils/response';

export async function login(req: Request, res: Response): Promise<void> {
  const result = await authService.login(req.body.email, req.body.password);
  if (!result) {
    sendError(res, 'Invalid email or password', 401);
    return;
  }
  sendSuccess(res, result, 'Login successful');
}

export async function getMe(req: Request, res: Response): Promise<void> {
  const user = await authService.getMe(req.user!.sub);
  if (!user) {
    sendError(res, 'User not found', 404);
    return;
  }
  sendSuccess(res, user);
}

export async function updateMe(req: Request, res: Response): Promise<void> {
  const user = await authService.updateMe(req.user!.sub, req.body);
  sendSuccess(res, user, 'Profile updated');
}
