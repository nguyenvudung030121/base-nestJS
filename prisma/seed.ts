import {
  PrismaClient,
  UserRole,
  Department,
  PostCategory,
  InvoiceStatus,
  ReactionType,
  LeaveType,
} from '../generated/prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Quỹ phép mặc định năm 2026 theo business rules
const LEAVE_BALANCE_DEFAULTS: { leaveType: LeaveType; allocated: number }[] = [
  { leaveType: LeaveType.ANNUAL,   allocated: 12.0 },
  { leaveType: LeaveType.UNPAID,   allocated: 30.0 },
  { leaveType: LeaveType.MEDICAL,  allocated: 5.0  },
  { leaveType: LeaveType.MARRIAGE, allocated: 3.0  },
];
const LEAVE_YEAR = 2026;

async function seedLeaveBalances(userId: string): Promise<void> {
  await prisma.leaveBalance.createMany({
    data: LEAVE_BALANCE_DEFAULTS.map(({ leaveType, allocated }) => ({
      userId,
      leaveType,
      allocated,
      used: 0.0,
      year: LEAVE_YEAR,
    })),
  });
}

async function main() {
  console.log('🌱 Starting database seeding...');

  // ============================================================
  // 1. XÓA SẠCH DATA CŨ (đúng thứ tự FK constraint)
  // ============================================================
  await prisma.commentMention.deleteMany();
  await prisma.postReaction.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.post.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.leaveBalance.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Cleaned up old data.');

  // ============================================================
  // 2. MÃ HÓA MẬT KHẨU
  // ============================================================
  const hashedPassword = await bcrypt.hash('Company@2026', 10);
  console.log('🔐 Generated hashed password for test accounts.');

  // ============================================================
  // 3. KHỞI TẠO USERS + LEAVE BALANCES
  // ============================================================
  const adminUser = await prisma.user.create({
    data: {
      id: 'usr_admin_01',
      email: 'admin.ceo@company.com',
      password: hashedPassword,
      fullName: 'Nguyễn Văn Ban Giám Đốc',
      avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=admin',
      department: Department.HR,
      role: UserRole.ADMIN,
      isActive: true,
    },
  });
  await seedLeaveBalances(adminUser.id);

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
  await seedLeaveBalances(managerUser.id);

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
  await seedLeaveBalances(employeeUser.id);

  console.log('👤 Created 3 users with leave balances (4 types × 3 users = 12 records).');

  // ============================================================
  // 4. HÓA ĐƠN MẪU
  // ============================================================
  await prisma.invoice.createMany({
    data: [
      { amount: 2500000, status: InvoiceStatus.PENDING, userId: employeeUser.id },
      { amount: 500000,  status: InvoiceStatus.PAID,    userId: managerUser.id  },
    ],
  });

  console.log('🧾 Created 2 sample invoices.');

  // ============================================================
  // 5. NEWSFEED MẪU
  // ============================================================
  const announcementPost = await prisma.post.create({
    data: {
      title: '📢 Lịch nghỉ lễ và chế độ Remote làm việc từ xa',
      content:
        'Chào toàn thể anh em công ty, sắp tới chúng ta sẽ có đợt nghỉ lễ 3 ngày. Sau đợt nghỉ lễ, công ty sẽ áp dụng thử nghiệm cơ chế Hybrid-remote (Làm việc tại nhà 2 ngày/tuần).',
      category: PostCategory.ANNOUNCEMENT,
      authorId: adminUser.id,
    },
  });

  const socialPost = await prisma.post.create({
    data: {
      title: '⚽ Giao lưu bóng đá tối thứ 5 tuần này nha anh em ơi!',
      content:
        'Đội IT thách đấu đội Marketing vào 19h00 tối thứ 5 tại sân bóng Kỳ Đồng. Ai tham gia đăng ký gấp dưới comment nhé.',
      category: PostCategory.SOCIAL,
      authorId: employeeUser.id,
      imageUrls: ['https://images.unsplash.com/photo-1508098682722-e99c43a406b2'],
    },
  });

  // Dùng để tránh unused variable warning
  void announcementPost;

  console.log('📰 Created 2 sample newsfeed posts.');

  // ============================================================
  // 6. INTERACTIONS MẪU
  // ============================================================
  await prisma.postReaction.create({
    data: {
      postId: socialPost.id,
      userId: managerUser.id,
      type:   ReactionType.LIKE,
    },
  });

  const sampleComment = await prisma.comment.create({
    data: {
      content:  'Kèo này căng nha, team Marketing chuẩn bị nhận rổ hành từ dev nhé! cc @Trần Khoa Trưởng Phòng IT',
      postId:   socialPost.id,
      authorId: employeeUser.id,
    },
  });

  await prisma.commentMention.create({
    data: {
      commentId:       sampleComment.id,
      mentionedUserId: managerUser.id,
    },
  });

  console.log('💬 Added sample interactions (reactions, comments, mentions).');
  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('🚨 Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
