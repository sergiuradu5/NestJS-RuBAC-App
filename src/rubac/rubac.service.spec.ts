import { Test, TestingModule } from '@nestjs/testing';
import { RubacService } from './rubac.service';

describe('RubacService', () => {
  let service: RubacService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RubacService],
    }).compile();

    service = module.get<RubacService>(RubacService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
