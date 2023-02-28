import { NestExpressApplication } from '@nestjs/platform-express';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('RuBAC App (e2e)', () => {
  let app: NestExpressApplication;
  const w1Path = '/admin/w1';
  const w2Path = '/admin/w2';

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.set('trust proxy', 1);
    await app.init();
  });

  /**
   * Valid only if both rules are valid
   * Rule 1: "$ip_address == '100.100.100.100'"
   * Rule 2: "$user_role == 'ADMIN'"
   */
  describe('Workflow 1', () => {
    describe('200 OK ', () => {
      it('Role: ADMIN ✅ and Ip: 100.100.100.100 ✅', () => {
        return request(app.getHttpServer())
          .get(w1Path)
          .set('Role', 'ADMIN')
          .set('X-Forwarded-For', '100.100.100.100')
          .expect(200);
      });
    });

    describe('403 Forbidden', () => {
      it('Role: USER ❌ and Ip: 100.100.100.100 ✅', () => {
        return request(app.getHttpServer())
          .get(w1Path)
          .set('Role', 'USER')
          .set('X-Forwarded-For', '100.100.100.100')
          .expect(403);
      });

      it('Role: ADMIN ✅ and Ip: 192.168.2.1 ❌', () => {
        return request(app.getHttpServer())
          .get(w1Path)
          .set('Role', 'ADMIN')
          .set('X-Forwarded-For', '192.168.2.1')
          .expect(403);
      });
      it('Role: USER ❌ and Ip: 192.168.2.1 ❌', () => {
        return request(app.getHttpServer())
          .get(w1Path)
          .set('Role', 'USER')
          .set('X-Forwarded-For', '192.168.2.1')
          .expect(403);
      });
    });
  });

  /**
   * Valid only if both rules are valid
   * Rule 1: "ip_range($ip_address, '100.100.100.1/28')"
   * Rule 2: "in($user_role, 'ADMIN', 'SUPER_ADMIN')"
   * NOTE: ip_range() with arg '100.100.100.1/28' will evaluate to `true` for any of the IP Adresses
   * from the following array: 
   * [
      '100.100.100.0',  '100.100.100.1', 
      '100.100.100.2',  '100.100.100.3', 
      '100.100.100.4',  '100.100.100.5', 
      '100.100.100.6',  '100.100.100.7', 
      '100.100.100.8',  '100.100.100.9', 
      '100.100.100.10', '100.100.100.11',
      '100.100.100.12', '100.100.100.13',
      '100.100.100.14', '100.100.100.15' 
    ] 
   */
  describe('Workflow 2', () => {
    describe('200 OK ', () => {
      it('Role: ADMIN ✅ and Ip: 100.100.100.0 ✅', () => {
        return request(app.getHttpServer())
          .get(w2Path)
          .set('Role', 'ADMIN')
          .set('X-Forwarded-For', '100.100.100.0')
          .expect(200);
      });

      it('Role: SUPER_ADMIN ✅ and Ip: 100.100.100.0 ✅', () => {
        return request(app.getHttpServer())
          .get(w2Path)
          .set('Role', 'SUPER_ADMIN')
          .set('X-Forwarded-For', '100.100.100.0')
          .expect(200);
      });

      it('Role: ADMIN ✅ and Ip: 100.100.100.15 ✅', () => {
        return request(app.getHttpServer())
          .get(w2Path)
          .set('Role', 'ADMIN')
          .set('X-Forwarded-For', '100.100.100.15')
          .expect(200);
      });

      it('Role: SUPER_ADMIN ✅ and Ip: 100.100.100.15 ✅', () => {
        return request(app.getHttpServer())
          .get(w2Path)
          .set('Role', 'SUPER_ADMIN')
          .set('X-Forwarded-For', '100.100.100.15')
          .expect(200);
      });
    });

    describe('403 Forbidden', () => {
      it('Role: ADMIN ✅ and Ip: 100.100.100.16 ❌', () => {
        return request(app.getHttpServer())
          .get(w2Path)
          .set('Role', 'ADMIN')
          .set('X-Forwarded-For', '100.100.100.16')
          .expect(403);
      });

      it('Role: SUPER_ADMIN ✅ and Ip: 100.100.100.16 ❌', () => {
        return request(app.getHttpServer())
          .get(w2Path)
          .set('Role', 'SUPER_ADMIN')
          .set('X-Forwarded-For', '100.100.100.16')
          .expect(403);
      });

      it('Role: USER ❌ and Ip: 100.100.100.0 ✅', () => {
        return request(app.getHttpServer())
          .get(w2Path)
          .set('Role', 'USER')
          .set('X-Forwarded-For', '100.100.100.0')
          .expect(403);
      });

      it('Role: USER ❌ and Ip: 100.100.100.15 ✅', () => {
        return request(app.getHttpServer())
          .get(w2Path)
          .set('Role', 'USER')
          .set('X-Forwarded-For', '100.100.100.15')
          .expect(403);
      });

      it('Role: USER ❌ and Ip: 100.100.100.16 ❌', () => {
        return request(app.getHttpServer())
          .get(w2Path)
          .set('Role', 'USER')
          .set('X-Forwarded-For', '100.100.100.16')
          .expect(403);
      });
    });
  });
});
