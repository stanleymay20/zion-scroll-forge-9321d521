/**
 * ScrollLibrary Complete Book Generation Script
 * Generates comprehensive library of books across all subjects and levels
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../src/utils/logger';
import { AgentOrchestrationService, CourseOutline, ChapterSpec } from '../src/services/scroll-library/AgentOrchestrationService';
import { ScrollAuthorGPTService } from '../src/services/scroll-library/ScrollAuthorGPTService';
import { ScrollProfessorGPTService } from '../src/services/scroll-library/ScrollProfessorGPTService';
import { ScrollScribeGPTService } from '../src/services/scroll-library/ScrollScribeGPTService';
import { ScrollResearcherGPTService } from '../src/services/scroll-library/ScrollResearcherGPTService';
import { ScrollIntegritySealService } from '../src/services/scroll-library/ScrollIntegritySealService';
import { ScrollIndexerService } from '../src/services/scroll-library/ScrollIndexerService';
import { LibraryManagementService } from '../src/services/scroll-library/LibraryManagementService';

const prisma = new PrismaClient();

/**
 * Complete ScrollLibrary Book Catalog
 * Organized by subject area and academic level
 */
const SCROLL_LIBRARY_CATALOG = {
  theology: [
    {
      title: 'Foundations of Biblical Theology',
      level: 'beginner' as const,
      chapters: [
        'Introduction to Biblical Theology',
        'The Nature and Attributes of God',
        'The Trinity: Father, Son, and Holy Spirit',
        'Creation and the Fall',
        'Covenant Theology',
        'The Person and Work of Christ',
        'Salvation and Justification',
        'The Church and Its Mission',
        'Eschatology and the Kingdom',
        'Living the Christian Life'
      ]
    },
    {
      title: 'Systematic Theology: A Comprehensive Study',
      level: 'intermediate' as const,
      chapters: [
        'Prolegomena: The Study of Theology',
        'Bibliology: The Doctrine of Scripture',
        'Theology Proper: The Doctrine of God',
        'Christology: The Doctrine of Christ',
        'Pneumatology: The Doctrine of the Holy Spirit',
        'Anthropology: The Doctrine of Humanity',
        'Hamartiology: The Doctrine of Sin',
        'Soteriology: The Doctrine of Salvation',
        'Ecclesiology: The Doctrine of the Church',
        'Eschatology: The Doctrine of Last Things'
      ]
    },
    {
      title: 'Advanced Theological Studies',
      level: 'advanced' as const,
      chapters: [
        'Historical Theology and Church Fathers',
        'Reformed Theology and Covenant Theology',
        'Dispensational Theology',
        'Liberation and Contextual Theologies',
        'Theological Hermeneutics',
        'Contemporary Theological Debates',
        'Theology of Worship and Liturgy',
        'Theology of Mission and Evangelism',
        'Theological Ethics and Moral Philosophy',
        'Integrative Theological Synthesis'
      ]
    }
  ],
  
  biblicalStudies: [
    {
      title: 'Introduction to Old Testament',
      level: 'beginner' as const,
      chapters: [
        'The Pentateuch: Law and Covenant',
        'Historical Books: Israel\'s Story',
        'Wisdom Literature: Proverbs and Ecclesiastes',
        'The Psalms: Israel\'s Worship',
        'Major Prophets: Isaiah, Jeremiah, Ezekiel',
        'Minor Prophets: The Twelve',
        'Old Testament Theology',
        'Messianic Prophecies',
        'Old Testament Ethics',
        'Applying the Old Testament Today'
      ]
    },
    {
      title: 'Introduction to New Testament',
      level: 'beginner' as const,
      chapters: [
        'The Gospels: Life of Christ',
        'Acts: The Early Church',
        'Paul\'s Letters: Theology and Practice',
        'General Epistles: James to Jude',
        'Revelation: Apocalyptic Literature',
        'New Testament Theology',
        'The Kingdom of God',
        'New Testament Ethics',
        'The Church in the New Testament',
        'Applying the New Testament Today'
      ]
    },
    {
      title: 'Biblical Hermeneutics and Exegesis',
      level: 'intermediate' as const,
      chapters: [
        'Principles of Biblical Interpretation',
        'Historical-Grammatical Method',
        'Literary Analysis of Scripture',
        'Narrative Criticism',
        'Genre-Specific Interpretation',
        'Theological Interpretation',
        'Application and Contextualization',
        'Preaching and Teaching the Bible',
        'Word Studies and Lexical Analysis',
        'Advanced Exegetical Methods'
      ]
    }
  ],
  
  ministry: [
    {
      title: 'Foundations of Christian Ministry',
      level: 'beginner' as const,
      chapters: [
        'The Call to Ministry',
        'Biblical Foundations of Ministry',
        'Spiritual Formation for Leaders',
        'Preaching and Teaching',
        'Pastoral Care and Counseling',
        'Church Administration',
        'Worship and Liturgy',
        'Evangelism and Outreach',
        'Discipleship and Mentoring',
        'Ministry Ethics and Integrity'
      ]
    },
    {
      title: 'Pastoral Leadership and Church Management',
      level: 'intermediate' as const,
      chapters: [
        'Leadership Theory and Practice',
        'Vision Casting and Strategic Planning',
        'Team Building and Staff Management',
        'Conflict Resolution',
        'Financial Stewardship',
        'Facility Management',
        'Legal and Governance Issues',
        'Church Planting',
        'Multisite Ministry',
        'Succession Planning'
      ]
    },
    {
      title: 'Prophetic Ministry and Spiritual Warfare',
      level: 'advanced' as const,
      chapters: [
        'The Prophetic Office',
        'Hearing God\'s Voice',
        'Prophetic Intercession',
        'Spiritual Warfare Principles',
        'Deliverance Ministry',
        'Territorial Spirits and Strongholds',
        'Prophetic Worship',
        'Dreams and Visions',
        'Prophetic Evangelism',
        'Training Prophetic Teams'
      ]
    }
  ],
  
  missions: [
    {
      title: 'Introduction to Missions',
      level: 'beginner' as const,
      chapters: [
        'Biblical Basis for Missions',
        'History of Christian Missions',
        'Cultural Anthropology',
        'Cross-Cultural Communication',
        'Language Learning',
        'Contextualization',
        'Church Planting Movements',
        'Unreached People Groups',
        'Short-Term Missions',
        'Member Care and Support'
      ]
    },
    {
      title: 'Strategic Missions and Church Planting',
      level: 'intermediate' as const,
      chapters: [
        'Missiology and Mission Strategy',
        'People Group Research',
        'Church Planting Models',
        'Indigenous Leadership Development',
        'Orality and Bible Storying',
        'Business as Mission',
        'Urban Missions',
        'Refugee and Diaspora Ministry',
        'Persecution and Suffering',
        'Measuring Mission Effectiveness'
      ]
    }
  ],
  
  worship: [
    {
      title: 'Foundations of Worship',
      level: 'beginner' as const,
      chapters: [
        'Biblical Theology of Worship',
        'History of Christian Worship',
        'Elements of Corporate Worship',
        'Music in Worship',
        'Prayer and Intercession',
        'The Sacraments',
        'Preaching as Worship',
        'Creative Arts in Worship',
        'Worship Leadership',
        'Personal Worship and Devotion'
      ]
    },
    {
      title: 'Prophetic Worship and Intercession',
      level: 'intermediate' as const,
      chapters: [
        'The Prophetic Song',
        'Spontaneous Worship',
        'Worship Warfare',
        'Intercession and Breakthrough',
        'Worship in the Tabernacle of David',
        'Levitical Worship Patterns',
        'Worship and Revival',
        'Training Worship Teams',
        'Sound and Production',
        'Worship Ministry Administration'
      ]
    }
  ],
  
  spiritualFormation: [
    {
      title: 'Spiritual Disciplines and Growth',
      level: 'beginner' as const,
      chapters: [
        'Introduction to Spiritual Formation',
        'Prayer and Meditation',
        'Bible Study and Scripture Memory',
        'Fasting and Self-Denial',
        'Solitude and Silence',
        'Worship and Celebration',
        'Service and Compassion',
        'Confession and Accountability',
        'Submission and Obedience',
        'Spiritual Direction'
      ]
    },
    {
      title: 'Contemplative Prayer and Mysticism',
      level: 'advanced' as const,
      chapters: [
        'History of Christian Mysticism',
        'Contemplative Prayer Practices',
        'Lectio Divina',
        'The Jesus Prayer',
        'Centering Prayer',
        'The Dark Night of the Soul',
        'Union with God',
        'Spiritual Discernment',
        'Mystical Theology',
        'Integrating Contemplation and Action'
      ]
    }
  ],
  
  apologetics: [
    {
      title: 'Christian Apologetics',
      level: 'intermediate' as const,
      chapters: [
        'Introduction to Apologetics',
        'The Existence of God',
        'The Problem of Evil',
        'The Reliability of Scripture',
        'The Resurrection of Christ',
        'Science and Faith',
        'Comparative Religions',
        'Postmodernism and Truth',
        'Moral Arguments',
        'Practical Apologetics'
      ]
    }
  ],
  
  ethics: [
    {
      title: 'Christian Ethics and Moral Theology',
      level: 'intermediate' as const,
      chapters: [
        'Foundations of Christian Ethics',
        'Virtue Ethics',
        'Deontological Ethics',
        'Consequentialism',
        'Natural Law Theory',
        'Bioethics',
        'Sexual Ethics',
        'Social Justice',
        'Business Ethics',
        'Environmental Ethics'
      ]
    }
  ],
  
  churchHistory: [
    {
      title: 'Church History: From Pentecost to Present',
      level: 'intermediate' as const,
      chapters: [
        'The Apostolic Age',
        'The Early Church Fathers',
        'Constantine and Christendom',
        'The Medieval Church',
        'The Protestant Reformation',
        'The Catholic Counter-Reformation',
        'The Puritans and Pietism',
        'The Great Awakenings',
        'Modern Missions Movement',
        'Contemporary Christianity'
      ]
    }
  ],
  
  counseling: [
    {
      title: 'Biblical Counseling',
      level: 'intermediate' as const,
      chapters: [
        'Foundations of Biblical Counseling',
        'The Sufficiency of Scripture',
        'Understanding the Heart',
        'Sin and Suffering',
        'Repentance and Change',
        'Marriage Counseling',
        'Family Counseling',
        'Addiction and Recovery',
        'Trauma and Healing',
        'Counseling Ethics'
      ]
    }
  ],
  
  leadership: [
    {
      title: 'Kingdom Leadership',
      level: 'intermediate' as const,
      chapters: [
        'Biblical Models of Leadership',
        'Servant Leadership',
        'Character and Integrity',
        'Vision and Strategy',
        'Decision Making',
        'Team Development',
        'Communication Skills',
        'Conflict Management',
        'Change Leadership',
        'Legacy and Succession'
      ]
    }
  ]
};

/**
 * Generates chapter specifications from chapter titles
 */
function generateChapterSpecs(chapterTitles: string[]): ChapterSpec[] {
  return chapterTitles.map((title, index) => ({
    title,
    orderIndex: index + 1,
    topics: [
      `Core concepts of ${title}`,
      `Biblical foundations`,
      `Practical applications`,
      `Contemporary relevance`
    ],
    learningObjectives: [
      `Understand the key principles of ${title}`,
      `Apply biblical truth to real-world situations`,
      `Develop spiritual maturity in this area`,
      `Integrate knowledge with kingdom purpose`
    ]
  }));
}

/**
 * Generates a single book
 */
async function generateBook(
  subject: string,
  bookConfig: { title: string; level: 'beginner' | 'intermediate' | 'advanced'; chapters: string[] },
  orchestrator: AgentOrchestrationService
): Promise<void> {
  try {
    logger.info(`Starting generation of: ${bookConfig.title}`, { subject, level: bookConfig.level });

    const outline: CourseOutline = {
      title: bookConfig.title,
      subject,
      level: bookConfig.level,
      chapters: generateChapterSpecs(bookConfig.chapters)
    };

    const book = await orchestrator.orchestrateBookGeneration(bookConfig.title, outline);

    logger.info(`Successfully generated: ${bookConfig.title}`, {
      bookId: book.id,
      chapters: book.chapters.length,
      qualityScore: book.metadata.qualityScore,
      theologicalAlignment: book.metadata.theologicalAlignment
    });

  } catch (error) {
    logger.error(`Failed to generate: ${bookConfig.title}`, {
      error: error.message,
      subject,
      level: bookConfig.level
    });
    throw error;
  }
}

/**
 * Generates all books in a subject category
 */
async function generateSubjectBooks(
  subject: string,
  books: Array<{ title: string; level: 'beginner' | 'intermediate' | 'advanced'; chapters: string[] }>,
  orchestrator: AgentOrchestrationService
): Promise<void> {
  logger.info(`Starting generation for subject: ${subject}`, { bookCount: books.length });

  for (const book of books) {
    await generateBook(subject, book, orchestrator);
    
    // Add delay between books to prevent API rate limiting
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  logger.info(`Completed generation for subject: ${subject}`);
}

/**
 * Main execution function
 */
async function main() {
  logger.info('='.repeat(80));
  logger.info('ScrollLibrary Complete Book Generation');
  logger.info('='.repeat(80));

  try {
    // Initialize services
    const orchestrator = new AgentOrchestrationService();
    
    logger.info('Services initialized successfully');

    // Calculate total books
    const totalBooks = Object.values(SCROLL_LIBRARY_CATALOG).reduce(
      (sum, books) => sum + books.length,
      0
    );

    logger.info(`Total books to generate: ${totalBooks}`);
    logger.info('Starting book generation process...\n');

    // Generate books by subject
    for (const [subject, books] of Object.entries(SCROLL_LIBRARY_CATALOG)) {
      await generateSubjectBooks(subject, books, orchestrator);
      
      // Add delay between subjects
      await new Promise(resolve => setTimeout(resolve, 10000));
    }

    logger.info('\n' + '='.repeat(80));
    logger.info('ScrollLibrary Book Generation Complete!');
    logger.info('='.repeat(80));
    logger.info(`Total books generated: ${totalBooks}`);

  } catch (error) {
    logger.error('Book generation process failed', { error: error.message });
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Execute if run directly
if (require.main === module) {
  main().catch(error => {
    logger.error('Fatal error in book generation', { error });
    process.exit(1);
  });
}

export { main, SCROLL_LIBRARY_CATALOG, generateBook, generateSubjectBooks };
