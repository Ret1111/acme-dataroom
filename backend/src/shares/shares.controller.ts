import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IsEmail, IsIn, IsOptional, IsString } from 'class-validator';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SharesService, type ResourceType } from './shares.service';

class CreateShareDto {
  @IsIn(['DATAROOM', 'FOLDER', 'FILE'])
  resourceType!: ResourceType;

  @IsString()
  resourceId!: string;

  @IsIn(['LINK', 'USER'])
  type!: 'LINK' | 'USER';

  @IsOptional()
  @IsEmail({}, { message: 'Enter a valid email address' })
  email?: string;
}

@UseGuards(JwtAuthGuard)
@Controller('shares')
export class SharesController {
  constructor(private shares: SharesService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateShareDto) {
    if (dto.type === 'LINK') {
      return this.shares.createLink(user.id, dto.resourceType, dto.resourceId);
    }
    if (!dto.email) {
      throw new Error('email is required for a permissioned share');
    }
    return this.shares.createUserShare(
      user,
      dto.resourceType,
      dto.resourceId,
      dto.email,
    );
  }

  @Get('for-resource')
  forResource(
    @CurrentUser() user: AuthUser,
    @Query('type') type: ResourceType,
    @Query('id') id: string,
  ) {
    return this.shares.listForResource(user.id, type, id);
  }

  @Get('shared-with-me')
  sharedWithMe(@CurrentUser() user: AuthUser) {
    return this.shares.sharedWithMe(user.email);
  }

  @Delete(':id')
  revoke(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.shares.revoke(user.id, id);
  }
}
