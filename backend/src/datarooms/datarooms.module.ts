import { Module } from '@nestjs/common';
import { DataRoomsController } from './datarooms.controller';
import { DataRoomsService } from './datarooms.service';

@Module({
  controllers: [DataRoomsController],
  providers: [DataRoomsService],
})
export class DataRoomsModule {}
