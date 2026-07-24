import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { RejectTaskDto } from './dto/reject-task.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../../generated/prisma/client';
import type { JwtPayload } from '../auth/types/jwt-payload.interface';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateTaskDto) {
    return this.tasksService.create(user, dto);
  }

  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.tasksService.findAll(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.tasksService.findOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasksService.update(id, user, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.tasksService.remove(id, user);
  }

  @Post(':id/submit')
  submit(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.tasksService.submit(id, user);
  }

  @Roles(Role.MANAGER, Role.ADMINISTRATOR)
  @Post(':id/validate')
  validate(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.tasksService.validate(id, user);
  }

  @Roles(Role.MANAGER, Role.ADMINISTRATOR)
  @Post(':id/reject')
  reject(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RejectTaskDto,
  ) {
    return this.tasksService.reject(id, user, dto);
  }
}
