import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkScrollBooks() {
  try {
    // Count total books
    const totalBooks = await prisma.scrollBook.count();
    
    // Get books with details
    const books = await prisma.scrollBook.findMany({
      select: {
        id: true,
        title: true,
        subject: true,
        level: true,
        courseReference: true,
        createdAt: true,
        publishedAt: true,
        _count: {
          select: {
            chapters: true,
            diagrams: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log('\n=== ScrollLibrary Book Statistics ===\n');
    console.log(`Total Books: ${totalBooks}`);
    console.log('\n=== Book Details ===\n');
    
    if (books.length === 0) {
      console.log('No books have been generated yet.');
    } else {
      books.forEach((book, index) => {
        console.log(`${index + 1}. ${book.title}`);
        console.log(`   Subject: ${book.subject}`);
        console.log(`   Level: ${book.level}`);
        console.log(`   Course Reference: ${book.courseReference || 'None'}`);
        console.log(`   Chapters: ${book._count.chapters}`);
        console.log(`   Diagrams: ${book._count.diagrams}`);
        console.log(`   Created: ${book.createdAt.toISOString()}`);
        console.log(`   Published: ${book.publishedAt ? book.publishedAt.toISOString() : 'Not published'}`);
        console.log('');
      });
    }

    // Count by level
    const byLevel = await prisma.scrollBook.groupBy({
      by: ['level'],
      _count: true
    });

    if (byLevel.length > 0) {
      console.log('=== Books by Level ===\n');
      byLevel.forEach(group => {
        console.log(`${group.level}: ${group._count} books`);
      });
    }

    // Count chapters
    const totalChapters = await prisma.scrollChapter.count();
    console.log(`\nTotal Chapters: ${totalChapters}`);

    // Count course materials
    const totalCourseMaterials = await prisma.scrollCourseMaterial.count();
    console.log(`Total Course Materials: ${totalCourseMaterials}`);

  } catch (error) {
    console.error('Error querying ScrollLibrary:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkScrollBooks();
