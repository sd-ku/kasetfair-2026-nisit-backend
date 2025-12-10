import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        console.log(request);

        if (!user || !user.adminRole) {
            throw new UnauthorizedException('Admin access required');
        }

        return true;
    }
}
