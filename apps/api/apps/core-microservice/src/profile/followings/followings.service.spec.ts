import { Test, TestingModule } from '@nestjs/testing';
import { FollowingsService } from './followings.service';

describe('FollowingsService', () => {
  let service: FollowingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FollowingsService],
    }).compile();

    service = module.get<FollowingsService>(FollowingsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
