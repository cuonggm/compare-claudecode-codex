import type { NextFunction, Request, Response } from "express";
import type { Role, User } from "../shared/domain.js";
import { forbidden } from "./errors.js";
import { getGuestUser, getUser } from "./repository.js";
import type { Db } from "./db/sqlite.js";

export type AuthedRequest = Request & {
  user: User;
};

export function currentUser(req: Request): User {
  return (req as Request & { user: User }).user;
}

export function attachUser(db: Db) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const headerValue = req.header("x-user-id");
    const userId = headerValue ? Number(headerValue) : NaN;
    const user = Number.isInteger(userId) ? getUser(db, userId) : getGuestUser(db);
    (req as AuthedRequest).user = user ?? getGuestUser(db);
    next();
  };
}

export function requireAnyRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = currentUser(req);
    if (!roles.includes(user.role)) {
      next(forbidden());
      return;
    }
    next();
  };
}

export function requireManager(req: Request, _res: Response, next: NextFunction): void {
  const user = currentUser(req);
  if (user.role !== "manager") {
    next(forbidden("Chỉ quản lý mới được thực hiện thao tác này với mẻ nung."));
    return;
  }
  next();
}
