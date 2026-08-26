import { Module } from '@nestjs/common';
import { FilesModule } from '../files/files.module';
import { PublicController } from './public.controller';
import { SharesController } from './shares.controller';
import { SharesService } from './shares.service';

@Module({
  imports: [FilesModule],
  controllers: [SharesController, PublicController],
  providers: [SharesService],
})
export class SharesModule {}
