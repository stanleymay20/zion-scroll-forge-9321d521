// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title ScrollCoin
 * @dev ERC20 Token for ScrollUniversity Divine Economy
 * "By the Spirit of Wisdom, we establish a kingdom economy on Earth"
 * 
 * ScrollCoin is the native cryptocurrency of ScrollUniversity, rewarding
 * educational achievements and enabling a divine economy where learning
 * and spiritual growth are valued and incentivized.
 */
contract ScrollCoin is ERC20, ERC20Burnable, Pausable, AccessControl, ReentrancyGuard {
    // Role definitions
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant FRAUD_MONITOR_ROLE = keccak256("FRAUD_MONITOR_ROLE");
    bytes32 public constant EXCHANGE_RATE_MANAGER_ROLE = keccak256("EXCHANGE_RATE_MANAGER_ROLE");

    // Token economics
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18; // 1 billion tokens
    uint256 public constant INITIAL_SUPPLY = 100_000_000 * 10**18; // 100 million tokens
    
    // Exchange rate (ScrollCoin to USD, scaled by 10^6 for precision)
    uint256 public exchangeRateToUSD = 1_000_000; // 1 ScrollCoin = $1.00 USD initially
    
    // Transaction limits for fraud prevention
    uint256 public maxTransactionAmount = 10_000 * 10**18; // 10,000 tokens per transaction
    uint256 public dailyTransferLimit = 50_000 * 10**18; // 50,000 tokens per day per address
    
    // Tracking for fraud prevention
    mapping(address => uint256) public dailyTransferAmount;
    mapping(address => uint256) public lastTransferResetTime;
    mapping(address => bool) public blacklistedAddresses;
    mapping(address => bool) public whitelistedAddresses;
    
    // Reward tracking
    mapping(address => uint256) public totalRewardsEarned;
    mapping(address => uint256) public totalRewardsSpent;
    mapping(string => bool) public processedRewardIds; // Prevent duplicate rewards
    
    // Transaction metadata for transparency
    struct TransactionMetadata {
        string reason;
        string referenceId;
        uint256 timestamp;
        address initiator;
    }
    
    mapping(bytes32 => TransactionMetadata) public transactionMetadata;
    
    // Events
    event ExchangeRateUpdated(uint256 oldRate, uint256 newRate, uint256 timestamp);
    event RewardMinted(address indexed recipient, uint256 amount, string reason, string rewardId);
    event TokensBurned(address indexed burner, uint256 amount, string reason);
    event FraudDetected(address indexed suspiciousAddress, string reason, uint256 amount);
    event AddressBlacklisted(address indexed account, string reason);
    event AddressWhitelisted(address indexed account);
    event TransactionLimitUpdated(uint256 maxTransaction, uint256 dailyLimit);
    event TransactionRecorded(bytes32 indexed txHash, address from, address to, uint256 amount, string reason);

    constructor() ERC20("ScrollCoin", "SCROLL") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(FRAUD_MONITOR_ROLE, msg.sender);
        _grantRole(EXCHANGE_RATE_MANAGER_ROLE, msg.sender);
        
        // Mint initial supply to contract deployer
        _mint(msg.sender, INITIAL_SUPPLY);
    }

    /**
     * @dev Mint tokens as rewards for educational achievements
     * @param to Recipient address
     * @param amount Amount of tokens to mint
     * @param reason Reason for minting (e.g., "Course Completion", "Peer Tutoring")
     * @param rewardId Unique identifier to prevent duplicate rewards
     */
    function mintReward(
        address to,
        uint256 amount,
        string memory reason,
        string memory rewardId
    ) external onlyRole(MINTER_ROLE) nonReentrant whenNotPaused {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than zero");
        require(!processedRewardIds[rewardId], "Reward already processed");
        require(totalSupply() + amount <= MAX_SUPPLY, "Would exceed max supply");
        require(!blacklistedAddresses[to], "Recipient is blacklisted");
        
        processedRewardIds[rewardId] = true;
        totalRewardsEarned[to] += amount;
        
        _mint(to, amount);
        
        // Record transaction metadata
        bytes32 txHash = keccak256(abi.encodePacked(to, amount, reason, rewardId, block.timestamp));
        transactionMetadata[txHash] = TransactionMetadata({
            reason: reason,
            referenceId: rewardId,
            timestamp: block.timestamp,
            initiator: msg.sender
        });
        
        emit RewardMinted(to, amount, reason, rewardId);
        emit TransactionRecorded(txHash, address(0), to, amount, reason);
    }

    /**
     * @dev Burn tokens when spending on courses or resources
     * @param amount Amount of tokens to burn
     * @param reason Reason for burning (e.g., "Course Purchase", "Resource Access")
     */
    function burnForPurchase(
        uint256 amount,
        string memory reason
    ) external nonReentrant whenNotPaused {
        require(amount > 0, "Amount must be greater than zero");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        require(!blacklistedAddresses[msg.sender], "Address is blacklisted");
        
        totalRewardsSpent[msg.sender] += amount;
        
        _burn(msg.sender, amount);
        
        // Record transaction metadata
        bytes32 txHash = keccak256(abi.encodePacked(msg.sender, amount, reason, block.timestamp));
        transactionMetadata[txHash] = TransactionMetadata({
            reason: reason,
            referenceId: "",
            timestamp: block.timestamp,
            initiator: msg.sender
        });
        
        emit TokensBurned(msg.sender, amount, reason);
        emit TransactionRecorded(txHash, msg.sender, address(0), amount, reason);
    }

    /**
     * @dev Transfer tokens with fraud prevention and metadata
     */
    function transfer(address to, uint256 amount) public override nonReentrant whenNotPaused returns (bool) {
        require(!blacklistedAddresses[msg.sender], "Sender is blacklisted");
        require(!blacklistedAddresses[to], "Recipient is blacklisted");
        
        // Check transaction limits (unless whitelisted)
        if (!whitelistedAddresses[msg.sender]) {
            require(amount <= maxTransactionAmount, "Exceeds max transaction amount");
            _checkDailyLimit(msg.sender, amount);
        }
        
        bool success = super.transfer(to, amount);
        
        if (success) {
            // Record transaction metadata
            bytes32 txHash = keccak256(abi.encodePacked(msg.sender, to, amount, block.timestamp));
            transactionMetadata[txHash] = TransactionMetadata({
                reason: "Transfer",
                referenceId: "",
                timestamp: block.timestamp,
                initiator: msg.sender
            });
            
            emit TransactionRecorded(txHash, msg.sender, to, amount, "Transfer");
        }
        
        return success;
    }

    /**
     * @dev Transfer tokens from one address to another with fraud prevention
     */
    function transferFrom(address from, address to, uint256 amount) 
        public 
        override 
        nonReentrant 
        whenNotPaused 
        returns (bool) 
    {
        require(!blacklistedAddresses[from], "Sender is blacklisted");
        require(!blacklistedAddresses[to], "Recipient is blacklisted");
        
        // Check transaction limits (unless whitelisted)
        if (!whitelistedAddresses[from]) {
            require(amount <= maxTransactionAmount, "Exceeds max transaction amount");
            _checkDailyLimit(from, amount);
        }
        
        bool success = super.transferFrom(from, to, amount);
        
        if (success) {
            // Record transaction metadata
            bytes32 txHash = keccak256(abi.encodePacked(from, to, amount, block.timestamp));
            transactionMetadata[txHash] = TransactionMetadata({
                reason: "TransferFrom",
                referenceId: "",
                timestamp: block.timestamp,
                initiator: msg.sender
            });
            
            emit TransactionRecorded(txHash, from, to, amount, "TransferFrom");
        }
        
        return success;
    }

    /**
     * @dev Update exchange rate to USD
     */
    function updateExchangeRate(uint256 newRate) external onlyRole(EXCHANGE_RATE_MANAGER_ROLE) {
        require(newRate > 0, "Exchange rate must be greater than zero");
        
        uint256 oldRate = exchangeRateToUSD;
        exchangeRateToUSD = newRate;
        
        emit ExchangeRateUpdated(oldRate, newRate, block.timestamp);
    }

    /**
     * @dev Update transaction limits
     */
    function updateTransactionLimits(
        uint256 newMaxTransaction,
        uint256 newDailyLimit
    ) external onlyRole(FRAUD_MONITOR_ROLE) {
        require(newMaxTransaction > 0, "Max transaction must be greater than zero");
        require(newDailyLimit > 0, "Daily limit must be greater than zero");
        
        maxTransactionAmount = newMaxTransaction;
        dailyTransferLimit = newDailyLimit;
        
        emit TransactionLimitUpdated(newMaxTransaction, newDailyLimit);
    }

    /**
     * @dev Blacklist an address for fraud prevention
     */
    function blacklistAddress(address account, string memory reason) 
        external 
        onlyRole(FRAUD_MONITOR_ROLE) 
    {
        require(account != address(0), "Cannot blacklist zero address");
        require(!blacklistedAddresses[account], "Address already blacklisted");
        
        blacklistedAddresses[account] = true;
        
        emit AddressBlacklisted(account, reason);
        emit FraudDetected(account, reason, balanceOf(account));
    }

    /**
     * @dev Remove address from blacklist
     */
    function removeFromBlacklist(address account) external onlyRole(FRAUD_MONITOR_ROLE) {
        require(blacklistedAddresses[account], "Address not blacklisted");
        
        blacklistedAddresses[account] = false;
    }

    /**
     * @dev Whitelist an address to bypass transaction limits
     */
    function whitelistAddress(address account) external onlyRole(FRAUD_MONITOR_ROLE) {
        require(account != address(0), "Cannot whitelist zero address");
        require(!whitelistedAddresses[account], "Address already whitelisted");
        
        whitelistedAddresses[account] = true;
        
        emit AddressWhitelisted(account);
    }

    /**
     * @dev Remove address from whitelist
     */
    function removeFromWhitelist(address account) external onlyRole(FRAUD_MONITOR_ROLE) {
        require(whitelistedAddresses[account], "Address not whitelisted");
        
        whitelistedAddresses[account] = false;
    }

    /**
     * @dev Pause all token transfers
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @dev Unpause all token transfers
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /**
     * @dev Get transaction metadata
     */
    function getTransactionMetadata(bytes32 txHash) 
        external 
        view 
        returns (TransactionMetadata memory) 
    {
        return transactionMetadata[txHash];
    }

    /**
     * @dev Convert ScrollCoin amount to USD
     */
    function convertToUSD(uint256 scrollCoinAmount) external view returns (uint256) {
        return (scrollCoinAmount * exchangeRateToUSD) / 10**18 / 10**6;
    }

    /**
     * @dev Convert USD amount to ScrollCoin
     */
    function convertFromUSD(uint256 usdAmount) external view returns (uint256) {
        return (usdAmount * 10**18 * 10**6) / exchangeRateToUSD;
    }

    /**
     * @dev Get user's reward statistics
     */
    function getRewardStats(address account) 
        external 
        view 
        returns (
            uint256 earned,
            uint256 spent,
            uint256 balance,
            uint256 netRewards
        ) 
    {
        earned = totalRewardsEarned[account];
        spent = totalRewardsSpent[account];
        balance = balanceOf(account);
        netRewards = earned > spent ? earned - spent : 0;
        
        return (earned, spent, balance, netRewards);
    }

    /**
     * @dev Check if address can transfer amount (daily limit check)
     */
    function canTransfer(address account, uint256 amount) external view returns (bool) {
        if (blacklistedAddresses[account]) return false;
        if (whitelistedAddresses[account]) return true;
        if (amount > maxTransactionAmount) return false;
        
        uint256 currentDay = block.timestamp / 1 days;
        uint256 lastResetDay = lastTransferResetTime[account] / 1 days;
        
        if (currentDay > lastResetDay) {
            return amount <= dailyTransferLimit;
        } else {
            return dailyTransferAmount[account] + amount <= dailyTransferLimit;
        }
    }

    /**
     * @dev Internal function to check and update daily transfer limit
     */
    function _checkDailyLimit(address account, uint256 amount) internal {
        uint256 currentDay = block.timestamp / 1 days;
        uint256 lastResetDay = lastTransferResetTime[account] / 1 days;
        
        // Reset daily amount if it's a new day
        if (currentDay > lastResetDay) {
            dailyTransferAmount[account] = 0;
            lastTransferResetTime[account] = block.timestamp;
        }
        
        require(
            dailyTransferAmount[account] + amount <= dailyTransferLimit,
            "Exceeds daily transfer limit"
        );
        
        dailyTransferAmount[account] += amount;
    }

    /**
     * @dev Get remaining daily transfer limit for an address
     */
    function getRemainingDailyLimit(address account) external view returns (uint256) {
        if (whitelistedAddresses[account]) return type(uint256).max;
        
        uint256 currentDay = block.timestamp / 1 days;
        uint256 lastResetDay = lastTransferResetTime[account] / 1 days;
        
        if (currentDay > lastResetDay) {
            return dailyTransferLimit;
        } else {
            uint256 used = dailyTransferAmount[account];
            return used >= dailyTransferLimit ? 0 : dailyTransferLimit - used;
        }
    }
}
