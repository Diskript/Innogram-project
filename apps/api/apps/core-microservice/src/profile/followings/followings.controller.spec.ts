import { Test, TestingModule } from '@nestjs/testing';
import { FollowingsController } from './followings.controller';

describe('FollowingsController', () => {
  let controller: FollowingsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FollowingsController],
    }).compile();

    controller = module.get<FollowingsController>(FollowingsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
