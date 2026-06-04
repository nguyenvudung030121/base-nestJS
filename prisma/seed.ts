import { PrismaClient, UserRole, Department, PostCategory, InvoiceStatus, ReactionType } from '../generated/prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding with secure passwords...');

  // 1. XÓA SẠCH DATA CŨ TRÊN LOCAL DOCKER ĐỂ TRÁNH TRÙNG LẶP
  await prisma.commentMention.deleteMany();
  await prisma.postReaction.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.post.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Cleaned up old local data.');

  // 2. MÃ HÓA MẬT KHẨU MỒI ĐỂ KHỚP VỚI LOGIC AUTHEN CŨ
  // Tôi để mật khẩu chung cho cả 3 tài khoản là "Company@2026" cho dễ nhớ nhé
  const rawPassword = 'Company@2026';
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(rawPassword, saltRounds);

  console.log('🔐 Generated secure hashed password for test accounts.');

  // 3. KHỞI TẠO USER MẪU (Có password đã mã hóa)
  const adminUser = await prisma.user.create({
    data: {
      id: 'usr_admin_01',
      email: 'admin.ceo@company.com',
      password: hashedPassword, // 👈 Đút password đã hash vào đây
      fullName: 'Nguyễn Văn Ban Giám Đốc',
      avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=admin',
      department: Department.HR,
      role: UserRole.ADMIN,
      isActive: true,
    },
  });

  const managerUser = await prisma.user.create({
    data: {
      id: 'usr_manager_01',
      email: 'manager.tech@company.com',
      password: hashedPassword,
      fullName: 'Trần Khoa Trưởng Phòng IT',
      avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=manager',
      department: Department.IT,
      role: UserRole.MANAGER,
      isActive: true,
    },
  });

  const employeeUser = await prisma.user.create({
    data: {
      id: 'usr_emp_01',
      email: 'dev.le@company.com',
      password: hashedPassword,
      fullName: 'Lê Lập Trình Viên',
      avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=developer',
      department: Department.IT,
      role: UserRole.EMPLOYEE,
      isActive: true,
    },
  });

  console.log('👤 Created 3 sample users with password.');

  // 4. KHỞI TẠO HÓA ĐƠN MẪU (Gắn đúng userId của users viết thường)
  await prisma.invoice.createMany({
    data: [
      {
        amount: 2500000,
        status: InvoiceStatus.PENDING,
        userId: employeeUser.id,
      },
      {
        amount: 500000,
        status: InvoiceStatus.PAID,
        userId: managerUser.id,
      },
    ],
  });

  console.log('🧾 Created 2 sample invoices.');

  // 5. KHỞI TẠO BÀI VIẾT NEWSFEED MẪU
  const announcementPost = await prisma.post.create({
    data: {
      title: '📢 Lịch nghỉ lễ và chế độ Remote làm việc từ xa',
      content: 'Chào toàn thể anh em công ty, sắp tới chúng ta sẽ có đợt nghỉ lễ 3 ngày. Sau đợt nghỉ lễ, công ty sẽ áp dụng thử nghiệm cơ chế Hybrid-remote (Làm việc tại nhà 2 ngày/tuần).',
      category: PostCategory.ANNOUNCEMENT,
      authorId: adminUser.id,
    },
  });

  const socialPost = await prisma.post.create({
    data: {
      title: '⚽ Giao lưu bóng đá tối thứ 5 tuần này nha anh em ơi!',
      content: 'Đội IT thách đấu đội Marketing vào 19h00 tối thứ 5 tại sân bóng Kỳ Đồng. Ai tham gia đăng ký gấp dưới comment nhé.',
      category: PostCategory.SOCIAL,
      authorId: employeeUser.id,
      imageUrls: ['https://images.unsplash.com/photo-1508098682722-e99c43a406b2'],
    },
  });

  console.log('📰 Created 2 sample newsfeed posts.');

  // 6. TẠO THỬ INTERACTION MỒI
  await prisma.postReaction.create({
    data: {
      postId: socialPost.id,
      userId: managerUser.id,
      type: ReactionType.LIKE,
    },
  });

  const sampleComment = await prisma.comment.create({
    data: {
      content: 'Kèo này căng nha, team Marketing chuẩn bị nhận rổ hành từ dev nhé! cc @Trần Khoa Trưởng Phòng IT',
      postId: socialPost.id,
      authorId: employeeUser.id,
    },
  });

  await prisma.commentMention.create({
    data: {
      commentId: sampleComment.id,
      mentionedUserId: managerUser.id,
    },
  });

  console.log('💬 Added sample interactions (Reactions, Comments, Mentions).');
  console.log('🎉 Seeding successfully completed!');
}

main()
  .catch((e) => {
    console.error('🚨 Error while seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
