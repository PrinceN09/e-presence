import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: payload.sub },
      select: { id: true, matricule: true, role: true, isActive: true, tokenVersion: true },
    });

    // Reject if deleted, deactivated, or token was invalidated (e.g. after removal)
    if (!employee || !employee.isActive) {
      throw new UnauthorizedException('Session expirée. Veuillez vous reconnecter.');
    }

    // Reject if token was issued before the last forced invalidation
    if (payload.tokenVersion !== undefined && payload.tokenVersion !== employee.tokenVersion) {
      throw new UnauthorizedException('Session expirée. Veuillez vous reconnecter.');
    }

    return { sub: employee.id, matricule: employee.matricule, role: employee.role };
  }
}
