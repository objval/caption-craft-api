import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import {
  GetUser,
  AuthenticatedUser,
} from '../../core/auth/decorators/get-user.decorator';
import { CreditsService } from './credits.service';

@Controller('credits')
export class CreditsController {
  constructor(private readonly creditsService: CreditsService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getBalance(@GetUser() user: AuthenticatedUser) {
    const credits = await this.creditsService.getBalance(user.id);
    return { credits };
  }

  @Get('packs')
  @UseGuards(JwtAuthGuard)
  listPacks() {
    return this.creditsService.listPacks();
  }
}
