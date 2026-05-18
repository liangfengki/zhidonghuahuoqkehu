import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../common/prisma.module';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('邮箱已被注册');

    let tenantId = dto.tenantId;
    if (!tenantId) {
      const tenant = await this.prisma.tenant.create({
        data: { name: dto.companyName || dto.email.split('@')[1] },
      });
      tenantId = tenant.id;
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
        role: dto.role || 'admin',
        tenantId,
      },
    });

    const tokens = await this.generateTokens(user.id, tenantId, user.email, user.role);
    return { user: { id: user.id, email: user.email, name: user.name, role: user.role, tenantId }, ...tokens };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('邮箱或密码错误');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('邮箱或密码错误');

    const tokens = await this.generateTokens(user.id, user.tenantId, user.email, user.role);
    return { user: { id: user.id, email: user.email, name: user.name, role: user.role, tenantId: user.tenantId }, ...tokens };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });
    if (!user) throw new UnauthorizedException('用户不存在');
    return { id: user.id, email: user.email, name: user.name, role: user.role, tenantId: user.tenantId, tenant: user.tenant };
  }

  async refresh(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('用户不存在');
    return this.generateTokens(user.id, user.tenantId, user.email, user.role);
  }

  private async generateTokens(userId: string, tenantId: string, email: string, role: string) {
    const payload = { sub: userId, tenantId, email, role };
    const accessToken = await this.jwtService.signAsync(payload);
    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
      expiresIn: '7d',
    });
    return { accessToken, refreshToken };
  }
}
