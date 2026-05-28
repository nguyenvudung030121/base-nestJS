# Hướng Dẫn Phát Triển & Tài Liệu Kỹ Thuật (NestJS Backend API)

Tài liệu này cung cấp cái nhìn chi tiết về cấu trúc thư mục, cơ chế hoạt động, cơ sở dữ liệu và cách sử dụng ứng dụng backend quản lý hóa đơn (Invoice App) được xây dựng trên framework **NestJS**, kết hợp với **Prisma ORM**, **PostgreSQL** và **Swagger API Docs**.

---

## 1. Cấu Trúc Thư Mục Dự Án (Project Structure)

Dự án được cấu trúc theo các module đặc trưng của NestJS giúp đảm bảo tính mô-đun, dễ mở rộng và bảo trì.

```text
src/
├── main.ts                   # Điểm khởi chạy ứng dụng (cấu hình Pipes, Swagger, PORT)
├── app.module.ts             # Module gốc (Root Module) kết nối tất cả các modules khác
├── app.controller.ts         # Controller mặc định (Hello World)
├── app.service.ts            # Service mặc định
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
    ├── invoices.controller.ts# Định nghĩa endpoints GET /invoices, POST /invoices (được bảo vệ bởi Guard)
    ├── invoices.service.ts   # Xử lý logic nghiệp vụ thêm/lấy hóa đơn
    └── dto/
        └── create-invoice.dto.ts # Định nghĩa & validate dữ liệu tạo hóa đơn mới
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

## 3. Cách Thức Hoạt Động (How It Works)

### 3.1. Luồng Đi Của Một Request Xác Thực (Authorized Request Flow)
Khi Client gọi một API cần xác thực (ví dụ: tạo hóa đơn), request sẽ đi qua các lớp lang xử lý như sau:

```mermaid
graph TD
    Client[Client / Mobile / HTTP File] -->|1. Gửi request kèm Authorization Header Bearer token| Main[main.ts: ValidationPipe & Swagger]
    Main -->|2. Khớp Route URL| Guard[JwtAuthGuard]
    Guard -->|3. Xác thực & Giải mã Token| Jwt[JwtService]
    Guard -->|4. Nhét payload giải mã được vào request['user']| Controller[InvoicesController]
    Controller -->|5. Xác thực kiểu dữ liệu payload| DTO[CreateInvoiceDto]
    Controller -->|6. Lấy userId từ request['user'].sub chuyển tiếp| Service[InvoicesService]
    Service -->|7. Thực hiện truy vấn DB| Prisma[PrismaService]
    Prisma -->|8. Ghi dữ liệu| DB[(PostgreSQL Database)]
    DB -->|9. Trả kết quả thành công| Client
```

### 3.2. Cơ Chế Xác Thực JWT (Authentication Flow)
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

## 4. Hướng Dẫn Cấu Hình & Chạy Dự Án (Getting Started)

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

## 5. Tài Liệu Hướng Dẫn Sử Dụng API

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
