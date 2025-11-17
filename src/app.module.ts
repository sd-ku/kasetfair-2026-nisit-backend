import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { NisitModule } from './nisit/nisit.module';
import { PrismaModule } from './prisma/prisma.module';
import { StoreModule } from './store/store.module';
import { MediaModule } from './media/media.module';
import { ConsentModule } from './consent/consent.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    AuthModule,
    NisitModule,
    PrismaModule,
    StoreModule,
    MediaModule,
    ConsentModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
