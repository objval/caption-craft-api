import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CreditsService } from '../credits.service';
import { AuthenticatedUser } from '../../../core/auth/decorators/get-user.decorator';

interface RequestWithUser extends Request {
  user: AuthenticatedUser;
}
import { CREDITS_KEY } from '../decorators/use-credits.decorator';

@Injectable()
export class CreditGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private creditsService: CreditsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredCredits = this.reflector.get<number>(
      CREDITS_KEY,
      context.getHandler(),
    );

    if (!requiredCredits) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    await this.creditsService.deduct(user.id, requiredCredits);

    return true;
  }
}
