# Hướng Dẫn Phát Triển & Tài Liệu Kỹ Thuật (NestJS Backend API)

Tài liệu này cung cấp cái nhìn chi tiết về cấu trúc thư mục, cơ chế hoạt động, cơ sở dữ liệu và cách sử dụng ứng dụng backend quản lý hóa đơn (Invoice App) được xây dựng trên framework **NestJS**, kết hợp với **Prisma ORM**, **PostgreSQL**, **Swagger API Docs**, **@nestjs/config**, **@nestjs/throttler**, **@nestjs/schedule**, **@nestjs/cache-manager** và **Firebase Admin SDK**.

---

## 1. Cấu Trúc Thư Mục Dự Án (Project Structure)

Dự án được cấu trúc theo các module đặc trưng của NestJS giúp đảm bảo tính mô-đun, dễ mở rộng và bảo trì.

```text
src/
├── main.ts                   # Điểm khởi chạy ứng dụng (ConfigService, Pipes, Filter, Interceptor, Swagger)
├── app.module.ts             # Module gốc (CacheModule, ConfigModule, ScheduleModule, ThrottlerModule, Global Guard)
├── app.controller.ts         # Controller mặc định (Hello World)
├── app.service.ts            # Service mặc định
│
├── common/                   # Các thành phần dùng chung toàn dự án
│   ├── filters/
│   │   └── global-exception.filter.ts  # Bắt & chuẩn hóa toàn bộ lỗi về 1 format
│   ├── interceptors/
│   │   ├── transform.interceptor.ts    # Bọc response thành công về format chuẩn
│   │   └── user-cache.interceptor.ts   # Cache GET API theo userId để tránh lẫn dữ liệu
│   └── pagination/                     # Kiến trúc phân trang dùng chung
│       ├── index.ts                    # Barrel export
│       ├── page-options.dto.ts         # DTO base chứa page, limit, skip
│       ├── page-meta.dto.ts            # Tính toán totalPages, hasNext, hasPrevious
│       └── page.dto.ts                 # Generic wrapper PageDto<T> (items + meta)
│
├── prisma/                   # Cầu nối Cơ sở dữ liệu (Database Connection)
│   ├── prisma.module.ts      # Đăng ký PrismaService toàn cục
│   └── prisma.service.ts     # Kế thừa PrismaClient để truy vấn dữ liệu
│
├── cron/                     # Tác vụ chạy nền theo lịch
│   ├── cron.module.ts        # Khai báo CronService và import PrismaModule
│   └── cron.service.ts       # Quét hóa đơn UNPAID và cập nhật sang OVERDUE mỗi 30 giây
│
├── auth/                     # Module Xác thực (Authentication)
│   ├── auth.module.ts        # Đăng ký JWT bằng ConfigService, export JwtModule/JwtAuthGuard
│   ├── auth.controller.ts    # Định nghĩa endpoint POST /auth/register, POST /auth/login
│   ├── auth.service.ts       # Logic xử lý đăng ký (hash mật khẩu), đăng nhập (sinh JWT)
│   ├── dto/                  # Đối tượng truyền dữ liệu (Data Transfer Objects)
│   │   ├── register.dto.ts   # Ràng buộc dữ liệu khi Đăng ký
│   │   └── login.dto.ts      # Ràng buộc dữ liệu khi Đăng nhập
│   └── guards/               # Chốt chặn bảo vệ API (Route Guards)
│       └── jwt-auth/
│           └── jwt-auth.guard.ts # Xác thực JWT Token gửi lên từ Client bằng JWT_SECRET
│
├── firebase/                 # Module Firebase Admin SDK
│   ├── firebase.module.ts    # Global module export FirebaseService
│   └── firebase.service.ts   # Khởi tạo Firebase Admin từ FIREBASE_KEY_PATH và gửi FCM push
│
├── users/                    # Module Người dùng
│   ├── users.module.ts       # Import AuthModule để dùng JwtAuthGuard
│   ├── users.controller.ts   # PATCH /users/fcm-token, POST /users/test-push
│   ├── users.service.ts      # Lưu FCM token và gửi test push notification
│   └── dto/
│       ├── update-fcm-token.dto.ts
│       └── test-push.dto.ts
│
└── invoices/                 # Module Quản lý Hóa Đơn (Invoices)
    ├── invoices.module.ts    # Khai báo Invoices module, import AuthModule để dùng JwtAuthGuard
    ├── invoices.controller.ts# Định nghĩa endpoints GET, POST /invoices, POST /invoices/upload
    ├── invoices.service.ts   # Xử lý logic nghiệp vụ (CRUD + phân trang)
    └── dto/
        ├── create-invoice.dto.ts  # Validate dữ liệu tạo hóa đơn mới
        └── get-invoices.dto.ts    # Query params phân trang + lọc (extends PageOptionsDto)
```

---

## 2. Mô Hình Dữ Liệu (Database Schema)

Hệ thống sử dụng **Prisma ORM** kết nối với **PostgreSQL**. Mối quan hệ giữa các bảng được định nghĩa trong file [schema.prisma](file:///Users/Shared/dung_data/BE/base-nestjs/base-backend/prisma/schema.prisma):

```mermaid
erDiagram
    USER {
        Int id PK "Khóa chính tự tăng"
        String email UK "Duy nhất"
        String name "Tên người dùng"
        String password "Mật khẩu đã hash bằng bcrypt"
        String fcmToken "FCM token, nullable"
        DateTime createdAt "Thời gian tạo"
    }
    INVOICE {
        Int id PK "Khóa chính tự tăng"
        String title "Tiêu đề hóa đơn"
        Float amount "Số tiền"
        String status "Mặc định UNPAID"
        DateTime createdAt "Thời gian tạo"
        Int userId FK "Khóa ngoại liên kết bảng User"
    }
    USER ||--o{ INVOICE : "Một User có nhiều hóa đơn (1-n)"
```

---

## 3. Chuẩn Hóa Response Format (Standardized API Response)

Toàn bộ API response (thành công & thất bại) đều tuân theo **một format duy nhất** để Flutter app có thể parse qua một class `BaseResponse`.

### 3.1. Response Thành Công (Không phân trang)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Thành công",
  "data": { "id": 1, "name": "...", "accessToken": "..." }
}
```

### 3.2. Response Thành Công (Có phân trang)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Thành công",
  "data": [ ... ],
  "meta": {
    "page": 1,
    "limit": 10,
    "totalItems": 25,
    "totalPages": 3,
    "hasPreviousPage": false,
    "hasNextPage": true
  }
}
```

### 3.3. Response Lỗi

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Email này đã tồn tại!",
  "data": null,
  "errorDetails": {
    "path": "/auth/register",
    "timestamp": "2026-05-29T07:15:00.000Z",
    "errors": ["lỗi 1", "lỗi 2"]
  }
}
```

> [!IMPORTANT]
> **Quy tắc cho developer:** Service/Controller chỉ cần `return data` hoặc `throw new HttpException(...)`. **KHÔNG** bọc response thủ công — `TransformInterceptor` và `GlobalExceptionFilter` sẽ tự xử lý.

---

## 4. Kiến Trúc Phân Trang (Pagination Architecture)

Dự án cung cấp sẵn 3 class dùng chung trong `src/common/pagination/`:

| Class            | Vai trò                                                        |
| ---------------- | -------------------------------------------------------------- |
| `PageOptionsDto` | Base DTO chứa `page`, `limit` (có validation) và getter `skip` |
| `PageMetaDto`    | Tự động tính `totalPages`, `hasPreviousPage`, `hasNextPage`    |
| `PageDto<T>`     | Generic wrapper chứa `items: T[]` và `meta: PageMetaDto`       |

### Cách áp dụng cho module mới:

**Bước 1:** Tạo DTO kế thừa `PageOptionsDto`, chỉ thêm trường lọc riêng:

```typescript
export class GetProductsDto extends PageOptionsDto {
  @IsOptional()
  category?: string;
}
```

**Bước 2:** Trong Service, dùng `Promise.all` gọi `findMany` + `count`, rồi trả về `PageDto`:

```typescript
async findAll(dto: GetProductsDto) {
  const [items, itemCount] = await Promise.all([
    this.prisma.product.findMany({
      where: { ... },
      skip: dto.skip,
      take: dto.limit,
      orderBy: { createdAt: 'desc' },
    }),
    this.prisma.product.count({ where: { ... } }),
  ]);
  return new PageDto(items, new PageMetaDto({ pageOptionsDto: dto, itemCount }));
}
```

---

## 5. Cách Thức Hoạt Động (How It Works)

### 5.1. Luồng Đi Của Một Request Xác Thực (Authorized Request Flow)

Khi Client gọi một API cần xác thực (ví dụ: tạo hóa đơn), request sẽ đi qua các lớp xử lý như sau:

```mermaid
graph TD
    Client["Client / Mobile"] -->|"1. Gửi request kèm Bearer Token"| Throttle["ThrottlerGuard (10 requests/phút)"]
    Throttle -->|"2. Qua giới hạn request"| Guard["JwtAuthGuard"]
    Guard -->|"3. Giải mã Token, gắn user vào request"| Cache["UserCacheInterceptor (GET /invoices, TTL 10 giây, key theo userId)"]
    Cache -->|"4a. Cache hit"| Interceptor["TransformInterceptor (bọc response chuẩn)"]
    Cache -->|"4b. Cache miss"| Pipe["ValidationPipe (ép kiểu + validate DTO)"]
    Pipe -->|"5. Data hợp lệ"| Controller["Controller"]
    Controller -->|"6. Gọi Service với data đã validate"| Service["Service"]
    Service -->|"7. Truy vấn DB"| Prisma["PrismaService"]
    Prisma -->|"8. Trả data thô"| Interceptor
    Interceptor -->|"9. JSON chuẩn hóa"| Client

    Service -->|"Nếu lỗi nghiệp vụ: throw HttpException"| Filter["GlobalExceptionFilter"]
    Filter -->|"JSON lỗi chuẩn hóa"| Client
```

### 5.2. Cơ Chế Xác Thực JWT (Authentication Flow)

1. **Đăng ký (`/auth/register`)**:
   - Kiểm tra email trùng lặp thông qua `PrismaService`.
   - Sử dụng thư viện `bcrypt` để mã hóa mật khẩu (`hash`) với độ an toàn cao trước khi lưu vào DB.
   - Tạo ngay mã JWT Token thông qua `JwtService` để tự động đăng nhập cho user mới tạo.
2. **Đăng nhập (`/auth/login`)**:
   - Tìm kiếm user theo `email`.
   - Đối chiếu mật khẩu nhập vào với mật khẩu đã hash lưu trong DB bằng `bcrypt.compare`.
   - Trả về mã JWT Token chứa thông tin mã hóa (`userId` và `email`) nếu hợp lệ.
3. **Bảo vệ API (`JwtAuthGuard`)**:
   - Trích xuất token từ header `Authorization: Bearer <token>`.
   - Giải mã token bằng `JWT_SECRET` lấy từ `.env` thông qua `ConfigService`. Nếu giải mã thành công, thông tin user được đưa vào đối tượng Request để sử dụng ở Controller.
   - `AuthModule` export `JwtModule` và `JwtAuthGuard`; các module cần dùng guard, ví dụ `InvoicesModule`, phải import `AuthModule` để NestJS resolve được dependency `JwtService`.

### 5.3. Cơ Chế Rate Limiting (Anti-Spam)

Toàn bộ API đang được bảo vệ bởi `@nestjs/throttler` ở cấp global guard trong `AppModule`:

```typescript
ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }]);
```

Ý nghĩa:

- `ttl: 60000`: cửa sổ thời gian 60.000 milliseconds, tương đương 1 phút.
- `limit: 10`: mỗi client chỉ được gọi tối đa 10 requests trong 1 phút.
- Nếu vượt quá giới hạn, server trả lỗi `429 Too Many Requests`.

Khi cần bỏ qua rate limit cho một endpoint cụ thể:

```typescript
import { SkipThrottle } from '@nestjs/throttler';

@SkipThrottle()
@Get('health')
healthCheck() {
  return { ok: true };
}
```

Khi cần siết chặt một endpoint, ví dụ API upload ảnh chỉ cho gọi 3 lần/phút:

```typescript
import { Throttle } from '@nestjs/throttler';

@Throttle({ default: { ttl: 60000, limit: 3 } })
@Post('upload')
uploadInvoiceImage() {
  // upload logic
}
```

### 5.4. Cơ Chế Cache cho GET /invoices

Dự án dùng `@nestjs/cache-manager` và `cache-manager` để cache response ngắn hạn cho API đọc danh sách hóa đơn.

Cấu hình global trong `AppModule`:

```typescript
CacheModule.register({ isGlobal: true, ttl: 10000 });
```

Ý nghĩa:

- `isGlobal: true`: các provider/interceptor trong toàn ứng dụng có thể dùng cache mà không cần import lại `CacheModule` ở từng module.
- `ttl: 10000`: dữ liệu cache tồn tại 10.000 milliseconds, tương đương 10 giây.
- `GET /invoices` dùng `@UseInterceptors(UserCacheInterceptor)` để giảm số lần truy vấn DB cho request đọc lặp lại.
- Cache key có chứa `userId`, HTTP method và URL/query để tránh lẫn dữ liệu giữa các user.

Cache key hiện tại có dạng:

```text
user-cache:GET:/invoices?page=1&limit=10:user:123
```

Ví dụ trong controller:

```typescript
@Get()
@UseInterceptors(UserCacheInterceptor)
async findAll(@Query() dto: GetInvoicesDto, @Req() request: Request) {
  const userId = request['user'].sub;
  return this.invoicesService.findAll(dto, userId);
}
```

> [!IMPORTANT]
> `GET /invoices` là API theo user đăng nhập, nên không dùng `CacheInterceptor` mặc định cho endpoint này. `UserCacheInterceptor` đảm bảo các user khác nhau không dùng chung cache dù URL/query giống nhau.

### 5.4.1. Cache Invalidation khi tạo hóa đơn

Khi API `POST /invoices` tạo hóa đơn mới, `InvoicesService.create()` sẽ xóa cache sau khi Prisma tạo record thành công:

```typescript
await this.clearCache();
```

Mục tiêu:

- Lần gọi `GET /invoices` tiếp theo không dùng dữ liệu cũ.
- Server buộc truy vấn lại database và tạo cache mới.
- Hiện tại invalidation đang xóa toàn bộ cache để đơn giản và an toàn. Khi hệ thống lớn hơn, có thể tối ưu bằng cách chỉ xóa các key theo prefix `user-cache:*:user:<userId>`.

### 5.5. Cơ Chế Cron Job cập nhật hóa đơn quá hạn

Dự án dùng `@nestjs/schedule` để chạy tác vụ nền. `ScheduleModule.forRoot()` được khai báo trong `AppModule`, còn logic nghiệp vụ nằm trong `CronService`.

Cron hiện tại:

- Chạy mỗi 30 giây bằng `@Cron(CronExpression.EVERY_30_SECONDS)`.
- Tìm tất cả invoice có `status = 'UNPAID'`.
- Cập nhật các invoice đó thành `status = 'OVERDUE'`.
- In log số lượng invoice đã cập nhật.

Ví dụ log:

```text
[CronJob] Đã quét và cập nhật 3 hóa đơn quá hạn!
```

### 5.6. Firebase Admin SDK và FCM Push Notification

`FirebaseModule` là global module, nên các service khác có thể inject `FirebaseService` mà không cần import lại module ở từng nơi.

Khi ứng dụng khởi động, `FirebaseService.onModuleInit()`:

1. Đọc biến môi trường `FIREBASE_KEY_PATH`.
2. Dùng `path.join(process.cwd(), keyFile)` để tìm file service account JSON ở thư mục gốc dự án.
3. Parse JSON key và gọi `admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })`.
4. Nếu Firebase Admin đã được initialize trước đó, service bỏ qua để tránh initialize trùng app.

Ví dụ cấu hình theo môi trường:

```env
FIREBASE_KEY_PATH="firebase-service-account.staging.json"
```

> [!IMPORTANT]
> File service account JSON chứa private key của Google. Không commit file key này lên Git. Mỗi môi trường nên có key riêng và trỏ bằng `FIREBASE_KEY_PATH` trong `.env.development`, `.env.staging`, `.env.production`.

### 5.7. Lưu FCM Token từ Flutter

Flutter app lấy FCM token từ Firebase Messaging rồi gửi lên API:

```http
PATCH /users/fcm-token
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "fcmToken": "fY3x...device-fcm-token"
}
```

Backend lấy `userId` từ JWT payload `request.user.sub`, không nhận `userId` từ client ở endpoint này. `UsersService.updateFcmToken()` update cột `User.fcmToken` và trả về thông tin user không bao gồm `password`.

Endpoint test push tạm thời:

```http
POST /users/test-push
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "userId": "1",
  "title": "Thông báo test",
  "body": "Firebase Cloud Messaging đã hoạt động."
}
```

Luồng xử lý:

1. Controller nhận `userId`, `title`, `body`.
2. Service tìm user trong database để lấy `fcmToken`.
3. Nếu user không tồn tại, trả `404`.
4. Nếu user chưa có FCM token, trả `400`.
5. Nếu hợp lệ, gọi `FirebaseService.sendPushNotification(token, title, body)`.

---

## 6. Hướng Dẫn Cấu Hình & Chạy Dự Án (Getting Started)

### 6.1. Chuẩn Bị Môi Trường

- Cài đặt **Node.js** (Khuyên dùng phiên bản LTS).
- Khởi động cơ sở dữ liệu **PostgreSQL** (chạy local hoặc thông qua Docker).
  - Nếu dùng Docker, bạn có thể chạy container có sẵn bằng lệnh: `docker start nest-postgres` (hoặc khởi tạo container PostgreSQL mới trên cổng `5432`).

### 6.2. Cấu Hình Biến Môi Trường Đa Môi Trường

Dự án dùng nhiều file môi trường thay vì một file `.env` duy nhất:

```text
.env.development
.env.staging
.env.production
```

`AppModule` chọn file tương ứng theo `NODE_ENV`:

- `NODE_ENV=development` hoặc không set: đọc `.env.development`.
- `NODE_ENV=staging`: đọc `.env.staging`.
- `NODE_ENV=production`: đọc `.env.production`.

Ví dụ `.env.development`:

```env
PORT=3000
JWT_SECRET="một_chuỗi_bí_mật_siêu_dài_và_khó_đoán"
DATABASE_URL="postgresql://myuser:mypassword@localhost:5432/invoice_db?schema=public"
DIRECT_URL="postgresql://myuser:mypassword@localhost:5432/invoice_db?schema=public"
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"
FIREBASE_KEY_PATH="firebase-service-account.development.json"
```

Lưu ý:

- `PORT` được đọc trong `main.ts` bằng `ConfigService`; nếu không có giá trị, server fallback về `3000`.
- `JWT_SECRET` được dùng để ký và xác minh JWT. Không commit `.env` lên Git.
- `DATABASE_URL` là connection string runtime cho API thông thường.
- `DIRECT_URL` là connection string trực tiếp cho Prisma migration.
- `.gitignore` phải ignore `.env` và `.env.*` để tránh push nhầm secrets lên GitHub.
- Nếu password trong connection string có ký tự đặc biệt như `@`, phải URL-encode, ví dụ `@` thành `%40`.
- `SUPABASE_URL` và `SUPABASE_SERVICE_ROLE_KEY` được dùng cho Supabase Storage.
- `FIREBASE_KEY_PATH` là tên file service account JSON của Firebase Admin SDK, đặt ở thư mục gốc dự án theo từng môi trường.

### 6.2.1. Supabase, Prisma và Connection Pooling

Khi dùng Supabase:

- `DATABASE_URL`: dùng connection pooling/Supavisor cho API runtime, thường là host pooler và port `6543`.
- `DIRECT_URL`: dùng direct/session connection cho migration, không dùng transaction pooler.

Trong `prisma/schema.prisma`, datasource cần khai báo cả hai biến:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

`prisma.config.ts` được cấu hình để Prisma CLI dùng `DIRECT_URL` khi chạy migration:

```typescript
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  engine: 'classic',
  datasource: {
    url: env('DIRECT_URL'),
  },
});
```

Điểm quan trọng: Prisma CLI hiện load `prisma.config.ts`, nên nếu config override datasource bằng `DATABASE_URL`, lệnh migration staging có thể bị đứng ở pooler `:6543`. Với migration, hãy để CLI dùng `DIRECT_URL`.

### 6.2.2. Supabase Storage cho ảnh hóa đơn

API `POST /invoices/upload` không còn ghi file vào thư mục local `uploads/`. Controller dùng `memoryStorage()` của Multer để giữ file tạm trong RAM, sau đó `SupabaseService.uploadReceipt()` upload `file.buffer` lên Supabase Storage.

Yêu cầu trên Supabase:

- Tạo bucket tên `receipts`.
- Bucket cần public hoặc có policy cho phép đọc public nếu API trả public URL.
- `.env.staging` và `.env.production` cần có `SUPABASE_URL` và `SUPABASE_SERVICE_ROLE_KEY`.
- Không đưa service role key vào Flutter/client. Key này chỉ được lưu ở backend environment.

Sau khi upload thành công, service gọi `getPublicUrl()` và trả về `imageUrl` dạng URL công khai. Client có thể gửi URL này vào `POST /invoices` để lưu vào cột `imageUrl`.

### 6.3. Các Lệnh Chạy Dự Án

- **Cài đặt thư viện dependencies:**

  ```bash
  npm install
  ```

- **Đồng bộ Database Development (Prisma Migrations):**
  Dùng cho môi trường dev vì `migrate dev` có thể tạo migration mới, dùng shadow database và có thể reset dữ liệu trong quá trình phát triển:

  ```bash
  npm run migrate:dev
  ```

- **Apply Migration lên Staging:**
  Dùng cho staging/production vì `migrate deploy` chỉ áp dụng các migration file đã tồn tại, không tự sinh migration mới và an toàn hơn cho DB thật:

  ```bash
  npm run migrate:staging
  ```

- **Khởi chạy Server ở chế độ Phát Triển (Watch Mode):**

  ```bash
  npm run start:dev
  ```

- **Khởi chạy Server Staging sau khi build:**

  ```bash
  npm run build
  npm run start:staging
  ```

  Lưu ý: output build hiện nằm ở `dist/src/main.js`, nên script staging/production chạy `node dist/src/main`.

- **Expose local server qua ngrok:**
  Backend cần listen ở port `3000`, sau đó chạy:

  ```bash
  ngrok http 3000
  ```

  Nếu gặp lỗi `EADDRINUSE: address already in use :::3000`, nghĩa là đã có process khác đang chiếm port `3000`. Hãy dừng process backend cũ hoặc đổi `PORT` trong `.env`.

- **Mở giao diện quản trị Database trực quan (Prisma Studio):**
  ```bash
  npx prisma studio
  ```

---

## 7. Tài Liệu Hướng Dẫn Sử Dụng API

### 7.1. Swagger UI Docs (Khuyên dùng)

Dự án đã tích hợp sẵn Swagger. Khi server đang chạy ở local, bạn có thể truy cập:
👉 **[http://localhost:3000/docs](http://localhost:3000/docs)** để xem tài liệu chi tiết và test trực tiếp các API.

> [!TIP]
> Để test các API cần đăng nhập như Invoice hoặc Users/FCM, bạn hãy chạy API Đăng nhập/Đăng ký trên Swagger trước -> Copy chuỗi `accessToken` -> Bấm nút **Authorize** ở góc phải phía trên giao diện Swagger -> Dán token vào và lưu lại.

### 7.2. API Users và FCM

| Method | Endpoint           | Auth Bearer | Mục đích                           |
| ------ | ------------------ | ----------- | ---------------------------------- |
| PATCH  | `/users/fcm-token` | Có          | Lưu/cập nhật FCM token của user    |
| POST   | `/users/test-push` | Có          | Gửi thử push notification tạm thời |

Body `PATCH /users/fcm-token`:

```json
{
  "fcmToken": "fY3x...device-fcm-token"
}
```

Body `POST /users/test-push`:

```json
{
  "userId": "1",
  "title": "Thông báo test",
  "body": "Firebase Cloud Messaging đã hoạt động."
}
```

### 7.3. File REST Client (.http)

Bạn cũng có thể test nhanh thông qua file [test-requests.http](file:///Users/Shared/dung_data/BE/base-nestjs/base-backend/test-requests.http) nếu sử dụng công cụ mở rộng REST Client trong VS Code.
Hãy làm theo thứ tự:

1. Gửi request đăng nhập hoặc đăng ký.
2. Sao chép `accessToken` ở kết quả trả về.
3. Thay thế giá trị của biến `@token` ở đầu file và tiến hành gọi các API Invoice.

---

## 8. Ghi Chú Thay Đổi Gần Đây

### 8.1. Commit gần nhất đã kiểm tra

Commit gần nhất đã kiểm tra trước thay đổi cache hiện tại:

```text
d2b2f24 feat: add global rate limiting
```

Ý nghĩa kỹ thuật:

- Thêm dependency `@nestjs/throttler`.
- Cấu hình `ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }])` trong `AppModule`.
- Đăng ký `ThrottlerGuard` làm global guard bằng token `APP_GUARD`.

### 8.2. Thay đổi đang bổ sung sau commit gần nhất

Các thay đổi hiện tại liên quan đến cron job và cache:

- Thêm dependency `@nestjs/schedule`, `@nestjs/cache-manager`, `cache-manager`.
- Cấu hình `ScheduleModule.forRoot()` trong `AppModule`.
- Thêm `CronModule` và `CronService` để quét invoice `UNPAID` rồi cập nhật thành `OVERDUE` mỗi 30 giây.
- Cấu hình `CacheModule.register({ isGlobal: true, ttl: 10000 })` trong `AppModule`.
- Gắn `@UseInterceptors(UserCacheInterceptor)` cho API `GET /invoices` để cache theo từng user.
- Inject `CACHE_MANAGER` vào `InvoicesService` và xóa cache sau khi tạo hóa đơn mới để tránh trả dữ liệu cũ.

### 8.3. Thiết lập đa môi trường và Prisma migration với Supabase

Các điểm đáng chú ý khi chuyển sang kiến trúc dev/staging/production:

- Thêm `cross-env` để set `NODE_ENV` nhất quán trên Windows/macOS/Linux.
- Thay `.env` bằng `.env.development`, `.env.staging`, `.env.production`; các file `.env.*` phải được ignore trong Git.
- `ConfigModule.forRoot()` đọc env file theo `NODE_ENV`.
- Script `start:staging` và `start:prod` chạy `node dist/src/main` vì build output hiện nằm trong `dist/src/main.js`.
- Thêm `dotenv-cli` để Prisma CLI đọc đúng file môi trường qua `dotenv -e .env.<env> -- ...`.
- `schema.prisma` dùng `url = env("DATABASE_URL")` cho runtime và `directUrl = env("DIRECT_URL")` cho migration.
- `prisma.config.ts` cấu hình Prisma CLI dùng `DIRECT_URL`, tránh chạy migration qua Supabase pooler `:6543`.
- Với Supabase, encode ký tự đặc biệt trong password của connection string, ví dụ `@` thành `%40`.
- Upload ảnh hóa đơn chuyển từ local `uploads/` sang Supabase Storage bucket `receipts`; Multer dùng `memoryStorage()` để tránh ghi file lên filesystem staging.

### 8.4. Firebase Admin SDK và FCM Token

Các điểm mới liên quan đến push notification:

- Thêm dependency `firebase-admin`.
- Thêm `FirebaseModule` global và `FirebaseService` để initialize Firebase Admin SDK bằng service account JSON theo `FIREBASE_KEY_PATH`.
- Thêm cột nullable `User.fcmToken` trong Prisma schema và migration `20260602000000_add_user_fcm_token`.
- Thêm `UsersModule`, import `AuthModule` để resolve được `JwtAuthGuard` và `JwtService`.
- Thêm API `PATCH /users/fcm-token` để Flutter app gửi FCM token sau khi user đăng nhập.
- Thêm API tạm `POST /users/test-push` để lấy token trong DB và gọi `FirebaseService.sendPushNotification()`.
