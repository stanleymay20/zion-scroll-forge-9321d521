# ScrollBadge NFT System Integration Guide

## Quick Start Integration

### 1. Register Routes in Main Server

Add to `backend/src/index.ts`:

```typescript
import scrollBadgeRoutes from './routes/scrollbadge';

// Register routes
app.use('/api/scrollbadge', scrollBadgeRoutes);
```

### 2. Trigger Badge Minting on Course Completion

Add to your course completion logic:

```typescript
import BadgeMintingService from './services/BadgeMintingService';
import { BadgeCredentialType } from './types/scrollbadge.types';

// When student completes a course
async function handleCourseCompletion(
  userId: string,
  courseId: string,
  finalGrade: number
) {
  try {
    // Award ScrollCoin (existing logic)
    await ScrollCoinService.mintReward({
      userId,
      amount: 100,
      reason: 'Course Completion',
      referenceId: courseId,
      rewardId: `course-${courseId}-${userId}-${Date.now()}`
    });

    // Mint ScrollBadge NFT (new)
    const badge = await BadgeMintingService.mintBadgeForCourseCompletion({
      userId,
      courseId,
      grade: finalGrade,
      credentialType: BadgeCredentialType.COURSE_COMPLETION,
      isPublic: true
    });

    logger.info('Badge minted for course completion', {
      userId,
      courseId,
      badgeId: badge.id,
      tokenId: badge.tokenId
    });

    return badge;
  } catch (error) {
    logger.error('Error in course completion:', error);
    throw error;
  }
}
```

### 3. Display Badges in User Profile

Frontend component example:

```typescript
// Fetch user badges
const response = await fetch(`/api/scrollbadge/user/${userId}`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const { data: badges } = await response.json();

// Display badges
badges.forEach(badge => {
  console.log(`${badge.courseName}: ${badge.grade}%`);
  console.log(`Token ID: ${badge.tokenId}`);
  console.log(`IPFS: ${badge.ipfsHash}`);
});
```

### 4. Employer Verification

```typescript
// Employer verifies a badge
const response = await fetch('/api/scrollbadge/verify/employer', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tokenId: 123,
    employerName: 'Tech Corp',
    employerEmail: 'hr@techcorp.com',
    verificationPurpose: 'Employment verification'
  })
});

const { data } = await response.json();
console.log('Verification Code:', data.verificationCode);
console.log('Expires:', data.expiresAt);
```

### 5. Social Sharing

```typescript
// Share badge on LinkedIn
const response = await fetch('/api/scrollbadge/share', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    tokenId: 123,
    platform: 'LINKEDIN',
    message: 'Proud to have completed this course!'
  })
});

const { data } = await response.json();
// Redirect user to shareUrl
window.open(data.shareUrl, '_blank');
```

## Environment Setup

### Development (No Blockchain)

```bash
# .env
SCROLLBADGE_BLOCKCHAIN_ENABLED=false
IPFS_ENABLED=false
BADGE_MARKETPLACE_ENABLED=false
```

Badges will be stored in database only, with mock IPFS hashes.

### Production (Full Blockchain)

```bash
# .env
SCROLLBADGE_BLOCKCHAIN_ENABLED=true
SCROLLBADGE_NETWORK_NAME=mainnet
SCROLLBADGE_RPC_URL=https://mainnet.infura.io/v3/YOUR_KEY
SCROLLBADGE_CONTRACT_ADDRESS=0x... # After deployment
SCROLLBADGE_PRIVATE_KEY=0x... # Service account key

IPFS_ENABLED=true
IPFS_API_URL=https://api.pinata.cloud
IPFS_API_KEY=your-pinata-key

BADGE_MARKETPLACE_ENABLED=true
```

## Smart Contract Deployment

### Using Hardhat

1. Install dependencies:
```bash
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
```

2. Create `hardhat.config.js`:
```javascript
require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: "0.8.19",
  networks: {
    sepolia: {
      url: process.env.SCROLLBADGE_RPC_URL,
      accounts: [process.env.SCROLLBADGE_PRIVATE_KEY]
    }
  }
};
```

3. Deploy:
```bash
npx hardhat run scripts/deploy-scrollbadge.js --network sepolia
```

4. Update `.env` with contract address

## Database Migration

```bash
# Run migration
cd backend
npx prisma migrate deploy

# Verify tables
npx prisma studio
```

## Testing

### Unit Tests

```bash
npm test -- ScrollBadgeService
npm test -- BadgeMintingService
npm test -- BadgeVerificationService
```

### Integration Test

```typescript
describe('Badge Minting Flow', () => {
  it('should mint badge on course completion', async () => {
    // Complete course
    const enrollment = await completeEnrollment(userId, courseId);
    
    // Check badge was minted
    const badges = await ScrollBadgeService.getUserBadges(userId);
    expect(badges).toHaveLength(1);
    expect(badges[0].courseId).toBe(courseId);
    expect(badges[0].grade).toBe(enrollment.finalGrade);
  });
});
```

## Monitoring

### Key Metrics to Track

```typescript
// Badge minting success rate
const mintingSuccessRate = successfulMints / totalMintAttempts;

// IPFS upload failures
const ipfsFailureRate = failedUploads / totalUploads;

// Verification requests
const verificationRate = verifications / totalBadges;

// Marketplace activity
const salesVolume = totalSales * averagePrice;
```

### Alerts

- Alert when minting fails > 5% of attempts
- Alert when IPFS uploads fail
- Alert when blockchain transactions fail
- Alert when verification codes expire unused

## Common Issues

### Issue: Badge minting fails
**Solution**: Check blockchain connection and gas fees

### Issue: IPFS upload fails
**Solution**: Verify Pinata API key and quota

### Issue: Verification code not working
**Solution**: Check expiration time and code format

### Issue: Marketplace not showing listings
**Solution**: Verify BADGE_MARKETPLACE_ENABLED=true

## API Examples

### Get User Profile with Badges

```bash
curl -X GET "http://localhost:3000/api/scrollbadge/profile/user123" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Verify Badge

```bash
curl -X POST "http://localhost:3000/api/scrollbadge/verify" \
  -H "Content-Type: application/json" \
  -d '{
    "tokenId": 123
  }'
```

### Query Badges

```bash
curl -X POST "http://localhost:3000/api/scrollbadge/query" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "credentialType": "COURSE_COMPLETION",
    "minGrade": 90,
    "limit": 10
  }'
```

## Frontend Components

### Badge Display Component

```typescript
interface BadgeCardProps {
  badge: ScrollBadgeData;
}

function BadgeCard({ badge }: BadgeCardProps) {
  return (
    <div className="badge-card">
      <img 
        src={`https://ipfs.io/ipfs/${badge.ipfsHash}`} 
        alt={badge.courseName}
      />
      <h3>{badge.courseName}</h3>
      <p>Grade: {badge.grade}%</p>
      <p>Completed: {badge.completionDate.toLocaleDateString()}</p>
      {badge.blockchainTxHash && (
        <a href={`https://etherscan.io/tx/${badge.blockchainTxHash}`}>
          View on Blockchain
        </a>
      )}
    </div>
  );
}
```

### Share Button Component

```typescript
function ShareBadgeButton({ tokenId }: { tokenId: number }) {
  const handleShare = async (platform: SharePlatform) => {
    const response = await fetch('/api/scrollbadge/share', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ tokenId, platform })
    });
    
    const { data } = await response.json();
    window.open(data.shareUrl, '_blank');
  };

  return (
    <div>
      <button onClick={() => handleShare('LINKEDIN')}>
        Share on LinkedIn
      </button>
      <button onClick={() => handleShare('TWITTER')}>
        Share on Twitter
      </button>
    </div>
  );
}
```

## Security Considerations

1. **Private Keys**: Never commit private keys to version control
2. **API Keys**: Use environment variables for all API keys
3. **Rate Limiting**: Implement rate limiting on badge minting
4. **Verification**: Always verify badge ownership before operations
5. **Revocation**: Only admins should be able to revoke badges

## Support

For issues or questions:
1. Check logs in `backend/logs/`
2. Review error messages in API responses
3. Verify environment configuration
4. Check blockchain transaction status on Etherscan
5. Verify IPFS content on gateway

---

**Last Updated**: December 22, 2024
**Version**: 1.0.0
