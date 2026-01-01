
import { Module } from '@nestjs/common';
import { NisitTrainingParticipantController } from './nisit-training-participant/nisit-training-participant.controller';
import { NisitTrainingParticipantService } from './nisit-training-participant/nisit-training-participant.service';
import { AdminStoreModule } from './store/store.module';
import { AdminMediaModule } from './media/media.module';
import { RegistrationModule } from './registration/registration.module';
import { AdminNisitModule } from './nisit/nisit.module';

import { LuckyDrawModule } from './lucky-draw/lucky-draw.module';
import { BoothModule } from './booth/booth.module';

@Module({
    imports: [AdminStoreModule, AdminMediaModule, RegistrationModule, AdminNisitModule, LuckyDrawModule, BoothModule],
    controllers: [NisitTrainingParticipantController],
    providers: [NisitTrainingParticipantService],
})
export class AdminModule { }

