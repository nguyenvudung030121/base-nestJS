# Hướng Dẫn Phát Triển & Tài Liệu Kỹ Thuật (NestJS Backend API)

Tài liệu này cung cấp cái nhìn chi tiết về cấu trúc thư mục, cơ chế hoạt động, cơ sở dữ liệu và cách sử dụng ứng dụng backend quản lý hóa đơn (Invoice App) được xây dựng trên framework **NestJS**, kết hợp với **Prisma ORM**, **PostgreSQL** và **Swagger API Docs**.

---

## 1. Cấu Trúc Thư Mục Dự Án (Project Structure)

Dự án được cấu trúc theo các module đặc trưng của NestJS giúp đảm bảo tính mô-đun, dễ mở rộng và bảo trì.

```text
src/
├── main.ts                   # Điểm khởi chạy ứng dụng (Pipes, Filter, Interceptor, Swagger)
├── app.module.ts             # Module gốc (Root Module) kết nối tất cả các modules khác
├── app.controller.ts         # Controller mặc định (Hello World)
├── app.service.ts            # Service mặc định
│
├── common/                   # Các thành phần dùng chung toàn dự án
│   ├── filters/
│   │   └── global-exception.filter.ts  # Bắt & chuẩn hóa toàn bộ lỗi về 1 format
│   ├── interceptors/
│   │   └── transform.interceptor.ts    # Bọc response thành công về format chuẩn
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
├── auth/                     # Module Xác thực (Authentication)
│   ├── auth.module.ts        # Đăng ký JWT, Controllers, Services của Auth
│   ├── auth.controller.ts    # Định nghĩa endpoint POST /auth/register, POST /auth/login
│   ├── auth.service.ts       # Logic xử lý đăng ký (hash mật khẩu), đăng nhập (sinh JWT)
│   ├── dto/                  # Đối tượng truyền dữ liệu (Data Transfer Objects)
│   │   ├── register.dto.ts   # Ràng buộc dữ liệu khi Đăng ký
│   │   └── login.dto.ts      # Ràng buộc dữ liệu khi Đăng nhập
│   └── guards/               # Chốt chặn bảo vệ API (Route Guards)
│       └── jwt-auth/
│           └── jwt-auth.guard.ts # Xác thực JWT Token gửi lên từ Client
│
└── invoices/                 # Module Quản lý Hóa Đơn (Invoices)
    ├── invoices.module.ts    # Khai báo Invoices module
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

| Class | Vai trò |
|-------|--------|
| `PageOptionsDto` | Base DTO chứa `page`, `limit` (có validation) và getter `skip` |
| `PageMetaDto` | Tự động tính `totalPages`, `hasPreviousPage`, `hasNextPage` |
| `PageDto<T>` | Generic wrapper chứa `items: T[]` và `meta: PageMetaDto` |

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
    Client["Client / Mobile"] -->|"1. Gửi request kèm Bearer Token"| Pipe["ValidationPipe (ép kiểu + validate DTO)"]
    Pipe -->|"2. Khớp Route"| Guard["JwtAuthGuard"]
    Guard -->|"3. Giải mã Token, gắn user vào request"| Controller["Controller"]
    Controller -->|"4. Gọi Service với data đã validate"| Service["Service"]
    Service -->|"5. Truy vấn DB"| Prisma["PrismaService"]
    Prisma -->|"6. Trả data thô"| Interceptor["TransformInterceptor (bọc response chuẩn)"]
    Interceptor -->|"7. JSON chuẩn hóa"| Client

    Service -->|"Nếu lỗi nghiệp vụ: throw HttpException"| Filter["GlobalExceptionFilter"]
    Filter -->|"JSON lỗi chuẩn hóa"| Client
```

### 5.2. Cơ Chế Xác Thực JWT (Authentication Flow)
1. **Đăng ký (`/auth/register`)**:
   * Kiểm tra email trùng lặp thông qua `PrismaService`.
   * Sử dụng thư viện `bcrypt` để mã hóa mật khẩu (`hash`) với độ an toàn cao trước khi lưu vào DB.
   * Tạo ngay mã JWT Token thông qua `JwtService` để tự động đăng nhập cho user mới tạo.
2. **Đăng nhập (`/auth/login`)**:
   * Tìm kiếm user theo `email`.
   * Đối chiếu mật khẩu nhập vào với mật khẩu đã hash lưu trong DB bằng `bcrypt.compare`.
   * Trả về mã JWT Token chứa thông tin mã hóa (`userId` và `email`) nếu hợp lệ.
3. **Bảo vệ API (`JwtAuthGuard`)**:
   * Trích xuất token từ header `Authorization: Bearer <token>`.
   * Giải mã token bằng chìa khóa bí mật (`secret`). Nếu giải mã thành công, thông tin user được đưa vào đối tượng Request để sử dụng ở Controller.

---

## 6. Hướng Dẫn Cấu Hình & Chạy Dự Án (Getting Started)

### 4.1. Chuẩn Bị Môi Trường
* Cài đặt **Node.js** (Khuyên dùng phiên bản LTS).
* Khởi động cơ sở dữ liệu **PostgreSQL** (chạy local hoặc thông qua Docker).
  * Nếu dùng Docker, bạn có thể chạy container có sẵn bằng lệnh: `docker start nest-postgres` (hoặc khởi tạo container PostgreSQL mới trên cổng `5432`).

### 4.2. Cấu Hình Biến Môi Trường
Tạo file `.env` ở thư mục gốc [base-backend](file:///Users/Shared/dung_data/BE/base-nestjs/base-backend) (nếu chưa có) và cập nhật đường dẫn kết nối Database:
```env
DATABASE_URL="postgresql://myuser:mypassword@localhost:5432/invoice_db?schema=public"
PORT=3000
```

### 4.3. Các Lệnh Chạy Dự Án

* **Cài đặt thư viện dependencies:**
  ```bash
  npm install
  ```

* **Đồng bộ Database (Prisma Migrations):**
  Cập nhật cấu trúc DB khớp với file schema.prisma:
  ```bash
  npx prisma migrate dev --name init_db
  ```

* **Khởi chạy Server ở chế độ Phát Triển (Watch Mode):**
  ```bash
  npm run start:dev
  ```

* **Mở giao diện quản trị Database trực quan (Prisma Studio):**
  ```bash
  npx prisma studio
  ```

---

## 7. Tài Liệu Hướng Dẫn Sử Dụng API

### 5.1. Swagger UI Docs (Khuyên dùng)
Dự án đã tích hợp sẵn Swagger. Khi server đang chạy ở local, bạn có thể truy cập:
👉 **[http://localhost:3000/docs](http://localhost:3000/docs)** để xem tài liệu chi tiết và test trực tiếp các API.

> [!TIP]
> Để test các API Invoice, bạn hãy chạy API Đăng nhập/Đăng ký trên Swagger trước -> Copy chuỗi `accessToken` -> Bấm nút **Authorize** ở góc phải phía trên giao diện Swagger -> Dán token vào và lưu lại.

### 5.2. File REST Client (.http)
Bạn cũng có thể test nhanh thông qua file [test-requests.http](file:///Users/Shared/dung_data/BE/base-nestjs/base-backend/test-requests.http) nếu sử dụng công cụ mở rộng REST Client trong VS Code.
Hãy làm theo thứ tự:
1. Gửi request đăng nhập hoặc đăng ký.
2. Sao chép `accessToken` ở kết quả trả về.
3. Thay thế giá trị của biến `@token` ở đầu file và tiến hành gọi các API Invoice.
