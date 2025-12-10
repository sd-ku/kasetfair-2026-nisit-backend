
import { Module } from '@nestjs/common';
import { NisitTrainingParticipantController } from './nisit-training-participant/nisit-training-participant.controller';
import { NisitTrainingParticipantService } from './nisit-training-participant/nisit-training-participant.service';
import { AdminStoreModule } from './store/store.module';

@Module({
    imports: [AdminStoreModule],
    controllers: [NisitTrainingParticipantController],
    providers: [NisitTrainingParticipantService],
})
export class AdminModule { }
