
import { Module } from '@nestjs/common';
import { NisitTrainingParticipantController } from './nisit-training-participant/nisit-training-participant.controller';
import { NisitTrainingParticipantService } from './nisit-training-participant/nisit-training-participant.service';
import { AdminStoreModule } from './store/store.module';
import { AdminMediaModule } from './media/media.module';
import { RegistrationModule } from './registration/registration.module';

@Module({
    imports: [AdminStoreModule, AdminMediaModule, RegistrationModule],
    controllers: [NisitTrainingParticipantController],
    providers: [NisitTrainingParticipantService],
})
export class AdminModule { }

