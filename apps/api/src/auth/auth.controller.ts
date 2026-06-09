import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return { success: true, data: await this.authService.register(dto) };
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return { success: true, data: await this.authService.login(dto) };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@CurrentUser() user: any) {
    return { success: true, data: await this.authService.getMe(user.sub) };
  }

  @UseGuards(JwtAuthGuard)
  @Post('refresh')
  async refresh(@CurrentUser() user: any) {
    return { success: true, data: await this.authService.refresh(user.sub) };
  }
}
