const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');
const Book = require('../models/Book');
const Transaction = require('../models/Transaction');
const Hold = require('../models/Hold');
const FinePayment = require('../models/FinePayment');
const MembershipPlan = require('../models/MembershipPlan');
const Notification = require('../models/Notification');
const LibrarySetting = require('../models/LibrarySetting');
const AuditLog = require('../models/AuditLog');
const DEFAULT_SETTINGS = require('../config/defaultSettings');
const {
  ROLES,
  MEMBER_TYPES,
  USER_STATUSES,
  BOOK_STATUSES,
  TRANSACTION_STATUSES,
  HOLD_STATUSES,
  FINE_STATUSES,
  PAYMENT_METHODS,
  NOTIFICATION_TYPES
} = require('../constants');

const seedData = async (isAutoSeed = false) => {
  try {
    if (!isAutoSeed) {
      console.log('[Seed] Connecting to database...');
      await connectDB();
    }

    console.log('[Seed] Clearing existing collections...');
    await Promise.all([
      User.deleteMany({}),
      Book.deleteMany({}),
      Transaction.deleteMany({}),
      Hold.deleteMany({}),
      FinePayment.deleteMany({}),
      MembershipPlan.deleteMany({}),
      Notification.deleteMany({}),
      LibrarySetting.deleteMany({}),
      AuditLog.deleteMany({})
    ]);

    // 1. Seed Library Settings
    console.log('[Seed] Seeding Library Settings...');
    await LibrarySetting.insertMany(DEFAULT_SETTINGS);

    // 2. Seed Membership Plans
    console.log('[Seed] Seeding Membership Plans...');
    const plans = await MembershipPlan.insertMany([
      {
        name: 'STUDENT',
        maximumBooks: 3,
        loanDurationDays: 14,
        finePerDay: 5,
        reservationLimit: 3,
        fineThreshold: 20,
        borrowingEnabled: true,
        description: 'Standard student borrowing plan with 14-day loan term',
        isDefault: true
      },
      {
        name: 'FACULTY',
        maximumBooks: 5,
        loanDurationDays: 30,
        finePerDay: 2,
        reservationLimit: 5,
        fineThreshold: 50,
        borrowingEnabled: true,
        description: 'Faculty membership plan with 30-day extended loan term and lower fine rate',
        isDefault: false
      },
      {
        name: 'RESEARCHER',
        maximumBooks: 8,
        loanDurationDays: 45,
        finePerDay: 3,
        reservationLimit: 8,
        fineThreshold: 100,
        borrowingEnabled: true,
        description: 'Postgraduate & research fellow plan with 45-day loan term and 8 books limit',
        isDefault: false
      }
    ]);

    const studentPlan = plans.find((p) => p.name === 'STUDENT');
    const facultyPlan = plans.find((p) => p.name === 'FACULTY');
    const researcherPlan = plans.find((p) => p.name === 'RESEARCHER');

    // 3. Seed Users with hashed password
    console.log('[Seed] Seeding Users (Admin, Librarians, Members)...');
    const defaultPassword = 'Password123!';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(defaultPassword, salt);

    const users = await User.insertMany([
      // Admin
      {
        name: 'System Administrator',
        email: 'admin@library.edu',
        passwordHash,
        role: ROLES.ADMIN,
        memberType: MEMBER_TYPES.FACULTY,
        membershipId: 'LIB-ADMIN-001',
        phone: '+1 (555) 019-2831',
        status: USER_STATUSES.ACTIVE,
        membershipPlanId: facultyPlan._id
      },
      // Librarians
      {
        name: 'Sarah Jenkins (Chief Librarian)',
        email: 'sarah.librarian@library.edu',
        passwordHash,
        role: ROLES.LIBRARIAN,
        memberType: MEMBER_TYPES.FACULTY,
        membershipId: 'LIB-STAFF-101',
        phone: '+1 (555) 014-9923',
        status: USER_STATUSES.ACTIVE,
        membershipPlanId: facultyPlan._id
      },
      {
        name: 'David Miller (Librarian)',
        email: 'david.librarian@library.edu',
        passwordHash,
        role: ROLES.LIBRARIAN,
        memberType: MEMBER_TYPES.FACULTY,
        membershipId: 'LIB-STAFF-102',
        phone: '+1 (555) 018-4411',
        status: USER_STATUSES.ACTIVE,
        membershipPlanId: facultyPlan._id
      },
      // Student Members
      {
        name: 'Alex Rivera',
        email: 'alex.student@library.edu',
        passwordHash,
        role: ROLES.MEMBER,
        memberType: MEMBER_TYPES.STUDENT,
        membershipId: 'LIB-2026-10001',
        phone: '+1 (555) 012-3344',
        status: USER_STATUSES.ACTIVE,
        membershipPlanId: studentPlan._id,
        outstandingFines: 0
      },
      {
        name: 'Emily Watson',
        email: 'emily.student@library.edu',
        passwordHash,
        role: ROLES.MEMBER,
        memberType: MEMBER_TYPES.STUDENT,
        membershipId: 'LIB-2026-10002',
        phone: '+1 (555) 015-6677',
        status: USER_STATUSES.ACTIVE,
        membershipPlanId: studentPlan._id,
        outstandingFines: 0
      },
      {
        name: 'Michael Chang',
        email: 'michael.student@library.edu',
        passwordHash,
        role: ROLES.MEMBER,
        memberType: MEMBER_TYPES.STUDENT,
        membershipId: 'LIB-2026-10003',
        phone: '+1 (555) 017-8899',
        status: USER_STATUSES.ACTIVE,
        membershipPlanId: studentPlan._id,
        outstandingFines: 25 // Has unpaid fine
      },
      // Faculty Members
      {
        name: 'Dr. Robert Vance',
        email: 'dr.robert@university.edu',
        passwordHash,
        role: ROLES.MEMBER,
        memberType: MEMBER_TYPES.FACULTY,
        membershipId: 'LIB-2026-20001',
        phone: '+1 (555) 011-2233',
        status: USER_STATUSES.ACTIVE,
        membershipPlanId: facultyPlan._id,
        outstandingFines: 0
      },
      {
        name: 'Prof. Clara Oswald',
        email: 'prof.clara@university.edu',
        passwordHash,
        role: ROLES.MEMBER,
        memberType: MEMBER_TYPES.FACULTY,
        membershipId: 'LIB-2026-20002',
        phone: '+1 (555) 016-5544',
        status: USER_STATUSES.ACTIVE,
        membershipPlanId: researcherPlan._id,
        outstandingFines: 0
      }
    ]);

    const [adminUser, chiefLibrarian, assistantLibrarian, studentAlex, studentEmily, studentMichael, facultyRobert, facultyClara] = users;

    // 4. Seed 20 Books across categories
    console.log('[Seed] Seeding 20 Academic Books...');
    const books = await Book.insertMany([
      {
        title: 'Introduction to Algorithms (4th Edition)',
        author: 'Thomas H. Cormen, Charles E. Leiserson, Ronald L. Rivest, Clifford Stein',
        isbn: '9780262046305',
        category: 'Computer Science',
        description: 'A comprehensive textbook on modern algorithms covering dynamic programming, graph algorithms, and amortized analysis.',
        publisher: 'MIT Press',
        publicationYear: 2022,
        totalCopies: 6,
        availableCopies: 5,
        lostCopies: 0,
        damagedCopies: 0,
        coverImage: 'https://images.unsplash.com/photo-1532012164546-f432f2e37264?auto=format&fit=crop&w=400&q=80',
        status: BOOK_STATUSES.AVAILABLE,
        borrowCount: 28
      },
      {
        title: 'Database System Concepts (7th Edition)',
        author: 'Abraham Silberschatz, Henry F. Korth, S. Sudarshan',
        isbn: '9780078022159',
        category: 'Computer Science',
        description: 'Fundamental database architecture, relational model, SQL, NoSQL systems, indexing, and transaction management.',
        publisher: 'McGraw-Hill Education',
        publicationYear: 2019,
        totalCopies: 5,
        availableCopies: 4,
        lostCopies: 0,
        damagedCopies: 0,
        coverImage: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80',
        status: BOOK_STATUSES.AVAILABLE,
        borrowCount: 35
      },
      {
        title: 'Designing Data-Intensive Applications',
        author: 'Martin Kleppmann',
        isbn: '9781449373320',
        category: 'Computer Science',
        description: 'The definitive guide to distributed systems, replication, partitioning, transactions, batch and stream processing.',
        publisher: "O'Reilly Media",
        publicationYear: 2017,
        totalCopies: 4,
        availableCopies: 3,
        lostCopies: 0,
        damagedCopies: 0,
        coverImage: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=400&q=80',
        status: BOOK_STATUSES.AVAILABLE,
        borrowCount: 42
      },
      {
        title: 'Artificial Intelligence: A Modern Approach (4th Edition)',
        author: 'Stuart Russell, Peter Norvig',
        isbn: '9780134610993',
        category: 'Artificial Intelligence',
        description: 'The standard text in AI covering search, knowledge representation, probabilistic reasoning, and deep reinforcement learning.',
        publisher: 'Pearson',
        publicationYear: 2020,
        totalCopies: 4,
        availableCopies: 3,
        lostCopies: 0,
        damagedCopies: 0,
        coverImage: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=400&q=80',
        status: BOOK_STATUSES.AVAILABLE,
        borrowCount: 50
      },
      {
        title: 'Pattern Recognition and Machine Learning',
        author: 'Christopher M. Bishop',
        isbn: '9780387310732',
        category: 'Artificial Intelligence',
        description: 'Foundational textbook on Bayesian inference, linear models, neural networks, kernel methods, and mixture models.',
        publisher: 'Springer',
        publicationYear: 2006,
        totalCopies: 3,
        availableCopies: 2,
        lostCopies: 0,
        damagedCopies: 0,
        coverImage: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=400&q=80',
        status: BOOK_STATUSES.AVAILABLE,
        borrowCount: 22
      },
      {
        title: 'Clean Code: A Handbook of Agile Software Craftsmanship',
        author: 'Robert C. Martin',
        isbn: '9780132350884',
        category: 'Software Engineering',
        description: 'Best practices for writing readable, maintainable code, test-driven development, and refactoring techniques.',
        publisher: 'Prentice Hall',
        publicationYear: 2008,
        totalCopies: 5,
        availableCopies: 4,
        lostCopies: 0,
        damagedCopies: 0,
        coverImage: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=400&q=80',
        status: BOOK_STATUSES.AVAILABLE,
        borrowCount: 65
      },
      {
        title: 'Computer Networks (6th Edition)',
        author: 'Andrew S. Tanenbaum, Nick Feamster, David J. Wetherall',
        isbn: '9780135407981',
        category: 'Computer Science',
        description: 'Comprehensive treatment of network architecture, physical layer, wireless networks, routing protocols, and transport layer.',
        publisher: 'Pearson',
        publicationYear: 2021,
        totalCopies: 3,
        availableCopies: 2,
        lostCopies: 0,
        damagedCopies: 0,
        coverImage: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=400&q=80',
        status: BOOK_STATUSES.AVAILABLE,
        borrowCount: 19
      },
      {
        title: 'Operating System Concepts (10th Edition)',
        author: 'Abraham Silberschatz, Peter B. Galvin, Greg Gagne',
        isbn: '9781119456339',
        category: 'Computer Science',
        description: 'Processes, threads, memory management, virtual memory, file systems, synchronization, and security.',
        publisher: 'Wiley',
        publicationYear: 2018,
        totalCopies: 4,
        availableCopies: 3,
        lostCopies: 0,
        damagedCopies: 0,
        coverImage: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=400&q=80',
        status: BOOK_STATUSES.AVAILABLE,
        borrowCount: 31
      },
      {
        title: 'Deep Learning',
        author: 'Ian Goodfellow, Yoshua Bengio, Aaron Courville',
        isbn: '9780262035613',
        category: 'Artificial Intelligence',
        description: 'Theoretical foundations of deep feedforward networks, regularization, optimization, CNNs, RNNs, and generative models.',
        publisher: 'MIT Press',
        publicationYear: 2016,
        totalCopies: 3,
        availableCopies: 2,
        lostCopies: 0,
        damagedCopies: 0,
        coverImage: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=400&q=80',
        status: BOOK_STATUSES.AVAILABLE,
        borrowCount: 45
      },
      {
        title: 'Python for Data Analysis (3rd Edition)',
        author: 'Wes McKinney',
        isbn: '9781098104030',
        category: 'Data Science',
        description: 'Practical data manipulation, cleaning, and analysis using Pandas, NumPy, IPython, and Jupyter notebooks.',
        publisher: "O'Reilly Media",
        publicationYear: 2022,
        totalCopies: 5,
        availableCopies: 4,
        lostCopies: 0,
        damagedCopies: 0,
        coverImage: 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?auto=format&fit=crop&w=400&q=80',
        status: BOOK_STATUSES.AVAILABLE,
        borrowCount: 38
      },
      {
        title: 'Quantum Computation and Quantum Information',
        author: 'Michael A. Nielsen, Isaac L. Chuang',
        isbn: '9781107002173',
        category: 'Physics',
        description: 'Comprehensive introduction to quantum circuits, quantum algorithms, quantum error correction, and quantum cryptography.',
        publisher: 'Cambridge University Press',
        publicationYear: 2010,
        totalCopies: 2,
        availableCopies: 0, // Out of stock for testing Holds
        lostCopies: 0,
        damagedCopies: 0,
        coverImage: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=400&q=80',
        status: BOOK_STATUSES.AVAILABLE,
        borrowCount: 16
      },
      {
        title: 'Linear Algebra and Its Applications (6th Edition)',
        author: 'David C. Lay, Steven R. Lay, Judi J. McDonald',
        isbn: '9780135851258',
        category: 'Mathematics',
        description: 'Matrix algebra, vector spaces, eigenvalues, eigenvectors, orthogonal sets, and singular value decomposition.',
        publisher: 'Pearson',
        publicationYear: 2020,
        totalCopies: 4,
        availableCopies: 4,
        lostCopies: 0,
        damagedCopies: 0,
        coverImage: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=400&q=80',
        status: BOOK_STATUSES.AVAILABLE,
        borrowCount: 14
      },
      {
        title: 'Probability and Statistics for Engineers and Scientists',
        author: 'Ronald E. Walpole, Raymond H. Myers, Sharon L. Myers, Keying Ye',
        isbn: '9780321629111',
        category: 'Mathematics',
        description: 'Probability theory, random variables, statistical distributions, hypothesis testing, regression, and ANOVA.',
        publisher: 'Pearson',
        publicationYear: 2016,
        totalCopies: 4,
        availableCopies: 4,
        lostCopies: 0,
        damagedCopies: 0,
        coverImage: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=400&q=80',
        status: BOOK_STATUSES.AVAILABLE,
        borrowCount: 12
      },
      {
        title: 'Principles of Neural Science (6th Edition)',
        author: 'Eric R. Kandel, John D. Koester, Sarah H. Mack, Steven A. Siegelbaum',
        isbn: '9781259642234',
        category: 'Biology',
        description: 'Definitive medical reference on cellular and molecular biology of neural cells, synaptic transmission, and cognitive neuroscience.',
        publisher: 'McGraw-Hill Education',
        publicationYear: 2021,
        totalCopies: 2,
        availableCopies: 2,
        lostCopies: 0,
        damagedCopies: 0,
        coverImage: 'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?auto=format&fit=crop&w=400&q=80',
        status: BOOK_STATUSES.AVAILABLE,
        borrowCount: 9
      },
      {
        title: 'A Brief History of Time',
        author: 'Stephen Hawking',
        isbn: '9780553380163',
        category: 'Physics',
        description: 'Landmark volume in science writing about cosmology, the Big Bang, black holes, light cones, and time travel.',
        publisher: 'Bantam Books',
        publicationYear: 1998,
        totalCopies: 5,
        availableCopies: 5,
        lostCopies: 0,
        damagedCopies: 0,
        coverImage: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=400&q=80',
        status: BOOK_STATUSES.AVAILABLE,
        borrowCount: 40
      },
      {
        title: 'Microeconomic Theory: Basic Principles and Extensions',
        author: 'Walter Nicholson, Christopher M. Snyder',
        isbn: '9781305505797',
        category: 'Economics',
        description: 'Rigorous microeconomic foundations, consumer choice, game theory, general equilibrium, and market failure analysis.',
        publisher: 'Cengage Learning',
        publicationYear: 2016,
        totalCopies: 3,
        availableCopies: 3,
        lostCopies: 0,
        damagedCopies: 0,
        coverImage: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=400&q=80',
        status: BOOK_STATUSES.AVAILABLE,
        borrowCount: 11
      },
      {
        title: 'The Pragmatic Programmer: 20th Anniversary Edition',
        author: 'David Thomas, Andrew Hunt',
        isbn: '9780135957059',
        category: 'Software Engineering',
        description: 'Essential wisdom for developers covering orthogonal design, prototyping, domain languages, refactoring, and career mastery.',
        publisher: 'Addison-Wesley Professional',
        publicationYear: 2019,
        totalCopies: 4,
        availableCopies: 4,
        lostCopies: 0,
        damagedCopies: 0,
        coverImage: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=400&q=80',
        status: BOOK_STATUSES.AVAILABLE,
        borrowCount: 52
      },
      {
        title: 'Sapiens: A Brief History of Humankind',
        author: 'Yuval Noah Harari',
        isbn: '9780062316097',
        category: 'History',
        description: 'Exploration of human history from the Cognitive Revolution through the Agricultural and Scientific Revolutions.',
        publisher: 'Harper',
        publicationYear: 2015,
        totalCopies: 4,
        availableCopies: 4,
        lostCopies: 0,
        damagedCopies: 0,
        coverImage: 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?auto=format&fit=crop&w=400&q=80',
        status: BOOK_STATUSES.AVAILABLE,
        borrowCount: 39
      },
      {
        title: 'Cloud Native Patterns: Designing high-availability applications',
        author: 'Cornelia Davis',
        isbn: '9781617294297',
        category: 'Software Engineering',
        description: 'Architecture patterns for cloud applications including microservices, containerization, circuit breakers, and event sourcing.',
        publisher: 'Manning Publications',
        publicationYear: 2019,
        totalCopies: 3,
        availableCopies: 3,
        lostCopies: 0,
        damagedCopies: 0,
        coverImage: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=400&q=80',
        status: BOOK_STATUSES.AVAILABLE,
        borrowCount: 15
      },
      {
        title: 'Modern Operating Systems (4th Edition)',
        author: 'Andrew S. Tanenbaum, Herbert Bos',
        isbn: '9780133591620',
        category: 'Computer Science',
        description: 'In-depth analysis of memory virtualization, file system caching, multi-core architecture, virtualization, and OS security.',
        publisher: 'Pearson',
        publicationYear: 2014,
        totalCopies: 3,
        availableCopies: 3,
        lostCopies: 0,
        damagedCopies: 0,
        coverImage: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=400&q=80',
        status: BOOK_STATUSES.AVAILABLE,
        borrowCount: 20
      }
    ]);

    // 5. Seed Transactions (Active, Overdue, Returned)
    console.log('[Seed] Seeding sample Transactions & Fines...');
    const now = new Date();
    const tenDaysLater = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);
    const twentyFiveDaysAgo = new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000);
    const elevenDaysAgo = new Date(now.getTime() - 11 * 24 * 60 * 60 * 1000);
    const fortyDaysAgo = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000);
    const twentySixDaysAgo = new Date(now.getTime() - 26 * 24 * 60 * 60 * 1000);

    const transactions = await Transaction.insertMany([
      // Active Loan 1: Alex Rivera has "Introduction to Algorithms"
      {
        bookId: books[0]._id,
        memberId: studentAlex._id,
        issueDate: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
        dueDate: tenDaysLater,
        status: TRANSACTION_STATUSES.ACTIVE,
        issuedBy: chiefLibrarian._id,
        notes: 'Issued at Main Circulation Desk'
      },
      // Active Loan 2: Emily Watson has "Designing Data-Intensive Applications"
      {
        bookId: books[2]._id,
        memberId: studentEmily._id,
        issueDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        dueDate: tenDaysLater,
        status: TRANSACTION_STATUSES.ACTIVE,
        issuedBy: assistantLibrarian._id
      },
      // Active Loan 3: Dr. Robert has "Artificial Intelligence: A Modern Approach"
      {
        bookId: books[3]._id,
        memberId: facultyRobert._id,
        issueDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        dueDate: new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000),
        status: TRANSACTION_STATUSES.ACTIVE,
        issuedBy: chiefLibrarian._id
      },
      // Active Loan 4 (Quantum book borrowed out-of-stock): Emily has copy 1
      {
        bookId: books[10]._id,
        memberId: studentEmily._id,
        issueDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
        dueDate: tenDaysLater,
        status: TRANSACTION_STATUSES.ACTIVE,
        issuedBy: assistantLibrarian._id
      },
      // Active Loan 5 (Quantum book copy 2 borrowed): Clara has copy 2
      {
        bookId: books[10]._id,
        memberId: facultyClara._id,
        issueDate: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000),
        dueDate: new Date(now.getTime() + 22 * 24 * 60 * 60 * 1000),
        status: TRANSACTION_STATUSES.ACTIVE,
        issuedBy: chiefLibrarian._id
      },
      // Overdue Loan: Michael Chang has "Database System Concepts" (11 days overdue -> fine = 11 * 5 = $55, but partially paid $30 -> outstanding $25)
      {
        bookId: books[1]._id,
        memberId: studentMichael._id,
        issueDate: twentyFiveDaysAgo,
        dueDate: elevenDaysAgo,
        fine: 55,
        finePaid: 30,
        fineStatus: FINE_STATUSES.PARTIALLY_PAID,
        status: TRANSACTION_STATUSES.ACTIVE,
        issuedBy: chiefLibrarian._id,
        notes: 'Loan is 11 days overdue. Notification sent.'
      },
      // Completed Return 1: Alex returned Clean Code on time
      {
        bookId: books[5]._id,
        memberId: studentAlex._id,
        issueDate: fortyDaysAgo,
        dueDate: twentySixDaysAgo,
        returnDate: new Date(fortyDaysAgo.getTime() + 10 * 24 * 60 * 60 * 1000),
        fine: 0,
        finePaid: 0,
        fineStatus: FINE_STATUSES.PAID,
        status: TRANSACTION_STATUSES.RETURNED,
        issuedBy: chiefLibrarian._id,
        returnedBy: assistantLibrarian._id,
        notes: 'Returned in pristine condition'
      }
    ]);

    // 6. Seed Fine Payments
    console.log('[Seed] Seeding Fine Payments...');
    await FinePayment.insertMany([
      {
        transactionId: transactions[5]._id,
        memberId: studentMichael._id,
        amount: 30,
        paymentMethod: PAYMENT_METHODS.ONLINE_SIMULATED,
        reference: 'PAY-ONLINE-9921',
        recordedBy: studentMichael._id,
        status: FINE_STATUSES.PAID,
        paidAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        notes: 'Partial online installment payment'
      }
    ]);

    // 7. Seed Reservation Holds
    console.log('[Seed] Seeding Reservation Holds...');
    await Hold.insertMany([
      // Alex Rivera placed a hold on Quantum book (out of stock)
      {
        bookId: books[10]._id,
        memberId: studentAlex._id,
        requestedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        status: HOLD_STATUSES.WAITING
      },
      // Michael Chang also waiting on Quantum book (queue position #2)
      {
        bookId: books[10]._id,
        memberId: studentMichael._id,
        requestedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
        status: HOLD_STATUSES.WAITING
      }
    ]);

    // 8. Seed Notifications
    console.log('[Seed] Seeding Notifications...');
    await Notification.insertMany([
      {
        memberId: studentMichael._id,
        transactionId: transactions[5]._id,
        type: NOTIFICATION_TYPES.OVERDUE,
        title: 'Overdue Notice: Database System Concepts',
        message: 'Your loan for "Database System Concepts" is currently 11 days overdue. Please return it to avoid further fine accumulation.',
        isRead: false,
        createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000)
      },
      {
        memberId: studentAlex._id,
        transactionId: transactions[0]._id,
        type: NOTIFICATION_TYPES.DUE_SOON,
        title: 'Book Due in 10 Days',
        message: 'Your loan for "Introduction to Algorithms" is due on ' + tenDaysLater.toLocaleDateString(),
        isRead: true,
        readAt: now,
        createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)
      },
      {
        memberId: studentEmily._id,
        transactionId: transactions[1]._id,
        type: NOTIFICATION_TYPES.GENERAL,
        title: 'Book Issued',
        message: 'You have borrowed "Designing Data-Intensive Applications". Enjoy reading!',
        isRead: false,
        createdAt: now
      }
    ]);

    // 9. Seed Audit Logs
    console.log('[Seed] Seeding Initial Audit Logs...');
    await AuditLog.insertMany([
      {
        actorId: adminUser._id,
        action: 'SYSTEM_SEEDED',
        resource: 'System',
        metadata: { version: '1.0.0', seedRecords: 20 },
        timestamp: now
      },
      {
        actorId: chiefLibrarian._id,
        action: 'BOOK_ISSUED',
        resource: 'Transaction',
        resourceId: transactions[0]._id.toString(),
        metadata: { bookTitle: 'Introduction to Algorithms (4th Edition)', memberName: 'Alex Rivera' },
        timestamp: transactions[0].issueDate
      }
    ]);

    console.log('===============================================================');
    console.log('  Database Seeding Completed Successfully!');
    console.log('===============================================================');
    console.log('  DEMO CREDENTIALS:');
    console.log('  -------------------------------------------------------------');
    console.log('  Role        Email                          Password');
    console.log('  -------------------------------------------------------------');
    console.log('  ADMIN:      admin@library.edu              Password123!');
    console.log('  LIBRARIAN:  sarah.librarian@library.edu    Password123!');
    console.log('  LIBRARIAN:  david.librarian@library.edu    Password123!');
    console.log('  MEMBER:     alex.student@library.edu       Password123!');
    console.log('  MEMBER:     emily.student@library.edu      Password123!');
    console.log('  MEMBER:     michael.student@library.edu    Password123! (Has Fines)');
    console.log('  MEMBER:     dr.robert@university.edu       Password123! (Faculty)');
    console.log('  -------------------------------------------------------------');

    if (!isAutoSeed) {
      await disconnectDB();
      process.exit(0);
    }
  } catch (error) {
    console.error('Fatal Error during database seed:', error);
    if (!isAutoSeed) {
      process.exit(1);
    }
    throw error;
  }
};

if (require.main === module) {
  seedData();
}

module.exports = seedData;
