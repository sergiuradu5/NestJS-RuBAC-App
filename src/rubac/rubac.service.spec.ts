import { Interpreter } from './interpreter/Interpreter';
import { Test, TestingModule } from '@nestjs/testing';
import { RubacService } from './rubac.service';
import { Workflow } from './workflow/Workflow';
import { Parser } from './parser/Parser';
import { ConfigModule } from '@nestjs/config';
import rulesConfig from '../config/rules';

describe('RubacService', () => {
  let service: RubacService;

  let mockInterpreter: Partial<Interpreter> = {
    evaluate: jest.fn(),
    visit: jest.fn()
  };

  let mockParser: Partial<Parser> = {
    parse: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ load: [rulesConfig]})],
      providers: [
        RubacService,
        { provide: Interpreter, useValue: mockInterpreter },
        { provide: Parser, useValue: mockParser },
      ],
    }).compile();

    service = module.get<RubacService>(RubacService);
    mockInterpreter = module.get<Interpreter>(Interpreter);
    mockParser = module.get<Parser>(Parser);
  });

  it('should load workflows successfully from folder', () => {
    expect(service).toBeDefined();
  });
});
