// Mock auth: clients send X-User-Id header. The user is looked up and
// attached to req.user. Permission checks happen at the route layer.
//
// This is *intentionally* not secure — the requirement is mock auth backed
// by a local user table. Real deployments would replace this with a session.

import type { NextFunction, Request, Response } from 'express';
import type { Role, User } from '@kilnflow/shared';
import type { Repo } from './repo.js';

declare module 'express-serve-static-core' {
  interface Request {
    user?: User;
  }
}

export function authMiddleware(repo: Repo) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const userId = req.header('X-User-Id');
    if (userId) {
      const u = repo.getUser(userId);
      if (u) req.user = u;
    }
    next();
  };
}

export function requireUser(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: 'Cần đăng nhập để thực hiện thao tác này.' });
    return;
  }
  next();
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: 'Cần đăng nhập để thực hiện thao tác này.' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        error: `Vai trò "${req.user.role}" không có quyền thực hiện thao tác này; cần một trong: ${roles.join(', ')}.`,
      });
      return;
    }
    next();
  };
}
